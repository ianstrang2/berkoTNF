import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { toPlayerWithStats } from '@/lib/transform/player.transform';
// Multi-tenant imports - ensuring stats are tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantFilter } from '@/lib/tenantFilter';

interface RecentGame {
  goals: number;
  result: string;
  heavy_win: boolean;
  heavy_loss: boolean;
}

// Note: Removed unstable_cache to prevent cross-tenant data leaks
async function getFullSeasonStats(startDate: string, endDate: string, tenantId: string) {
  const startTime = Date.now();

    // RLS disabled on aggregated tables - using explicit tenant filter
    const queryStart = Date.now();
    const preAggregatedData = await prisma.aggregated_season_stats.findMany({
      where: withTenantFilter(tenantId, {
        season_start_date: new Date(startDate)
        // Note: is_ringer filtering is handled by SQL function
      })
    });
    console.log(`⏱️ [FULL-SEASON] aggregated_season_stats query: ${Date.now() - queryStart}ms (${preAggregatedData.length} rows)`);
    
    if (preAggregatedData.length === 0) {
      console.warn(`⚠️ [FULL-SEASON] No data found! Checking database...`);
      // Check if data exists without tenant filter
      const allData = await prisma.aggregated_season_stats.findMany({
        where: { season_start_date: new Date(startDate) },
        select: { tenant_id: true, player_id: true }
      });
      console.log(`🔍 [FULL-SEASON] Data exists in DB for ${startDate}:`, {
        totalRows: allData.length,
        tenantIds: [...new Set(allData.map(d => d.tenant_id))],
        requestedTenantId: tenantId
      });
    }
    
    const perfStart = Date.now();
    const recentPerformance = await prisma.aggregated_recent_performance.findMany({
      where: withTenantFilter(tenantId),
      include: {
        players: {
          select: { name: true, selected_club: true, player_id: true }
        }
      }
    });
    console.log(`⏱️ [FULL-SEASON] aggregated_recent_performance query: ${Date.now() - perfStart}ms (${recentPerformance.length} rows)`);

    const transformStart = Date.now();
    
    // FIX N+1: Create a Map for O(1) lookups instead of O(n) .find() in loops
    const perfByName = new Map(
      recentPerformance.map(perf => [(perf as any).players?.name || '', perf])
    );
    
    const seasonStats = preAggregatedData.map(stat => {
      // All data now comes directly from aggregated table - no JOIN needed
      const dbPlayer = {
        id: stat.player_id,
        player_id: stat.player_id,
        name: stat.name,
        selected_club: stat.selected_club,
        games_played: stat.games_played || 0,
        wins: stat.wins || 0,
        draws: stat.draws || 0,
        losses: stat.losses || 0,
        goals: stat.goals || 0,
        heavy_wins: stat.heavy_wins || 0,
        heavy_losses: stat.heavy_losses || 0,
        clean_sheets: stat.clean_sheets || 0,
        win_percentage: Number(stat.win_percentage || 0),
        fantasy_points: Number(stat.fantasy_points || 0),
        points_per_game: Number(stat.points_per_game || 0)
      };
      return toPlayerWithStats(dbPlayer);
    }).sort((a, b) => b.fantasyPoints - a.fantasyPoints);
    console.log(`⏱️ [FULL-SEASON] Season stats transform: ${Date.now() - transformStart}ms`);
    
    const goalStatsStart = Date.now();
    const goalStats = seasonStats.map(player => {
      // FIX N+1: Use Map for O(1) lookup instead of .find()
      const playerPerf = perfByName.get(player.name);
      const lastFiveGames = playerPerf?.last_5_games as unknown as RecentGame[] | undefined;
      
      return {
        id: player.id,
        name: player.name,
        club: player.club,
        totalGoals: player.goals,
        minutesPerGoal: Math.round((player.gamesPlayed * 60) / (player.goals || 1)),
        lastFiveGames: lastFiveGames 
          ? lastFiveGames.map(g => g.goals).reverse().join(',')
          : '0,0,0,0,0',
        maxGoalsInGame: lastFiveGames 
          ? Math.max(...lastFiveGames.map(g => g.goals))
          : 0
      };
    }).filter(player => player.totalGoals > 0)
      .sort((a, b) => b.totalGoals - a.totalGoals || a.minutesPerGoal - b.minutesPerGoal);
    console.log(`⏱️ [FULL-SEASON] Goal stats transform: ${Date.now() - goalStatsStart}ms`);

    const formDataStart = Date.now();
    const formData = recentPerformance.map(perf => ({
      name: (perf as any).players?.name || '',
      last_5_games: perf.last_5_games ? (perf.last_5_games as unknown as RecentGame[]).map(g => {
        if (g.heavy_win) return 'HW';
        if (g.heavy_loss) return 'HL';
        return g.result.toUpperCase().charAt(0);
      }).reverse().join(', ') : ''
    })).sort((a, b) => a.name.localeCompare(b.name));
    console.log(`⏱️ [FULL-SEASON] Form data transform: ${Date.now() - formDataStart}ms`);

    console.log(`⏱️ [FULL-SEASON] ✅ TOTAL TIME: ${Date.now() - startTime}ms`);
    return { seasonStats, goalStats, formData };
  }

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const { startDate, endDate } = await request.json();
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }
    
    const responseData = await getFullSeasonStats(startDate, endDate, tenantId);
    return NextResponse.json({ data: responseData }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Vary': 'Cookie',
      }
    });
  }).catch(handleTenantError);
}