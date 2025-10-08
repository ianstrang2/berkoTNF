import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { toPlayerWithStats } from '@/lib/transform/player.transform';
// Multi-tenant imports - ensuring half-season stats are tenant-scoped
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

interface RecentGame {
  goals: number;
  result: string;
  heavy_win: boolean;
  heavy_loss: boolean;
}

// Note: Removed unstable_cache to prevent cross-tenant data leaks
async function getHalfSeasonStats(tenantId: string) {
  console.log(`Fetching fresh half-season data for tenant ${tenantId}`);

    // Multi-tenant: Use tenant-scoped query for half-season stats
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const preAggregatedData = await prisma.aggregated_half_season_stats.findMany({
      where: {
        tenant_id: tenantId
        // Note: is_ringer filtering will be handled by SQL function
      }
    });
    
    const recentPerformance = await prisma.aggregated_recent_performance.findMany({
      where: { tenant_id: tenantId },
      include: {
        players: {
          select: { name: true, selected_club: true, player_id: true }
        }
      }
    });

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
    
    const goalStats = seasonStats.map(player => ({
      id: player.id,
      name: player.name,
      club: player.club,
      totalGoals: player.goals,
      minutesPerGoal: Math.round((player.gamesPlayed * 60) / (player.goals || 1)),
      lastFiveGames: recentPerformance.find(perf => (perf as any).players?.name === player.name)?.last_5_games 
        ? (recentPerformance.find(perf => (perf as any).players?.name === player.name)?.last_5_games as unknown as RecentGame[])
            .map(g => g.goals)
            .reverse()
            .join(',') 
        : '0,0,0,0,0',
      maxGoalsInGame: recentPerformance.find(perf => (perf as any).players?.name === player.name)?.last_5_games 
        ? Math.max(...(recentPerformance.find(perf => (perf as any).players?.name === player.name)?.last_5_games as unknown as RecentGame[] || [])
            .map(g => g.goals)) 
        : 0
    })).filter(player => player.totalGoals > 0)
      .sort((a, b) => b.totalGoals - a.totalGoals || a.minutesPerGoal - b.minutesPerGoal);

    const formData = recentPerformance.map(perf => ({
      name: (perf as any).players?.name || '',
      last_5_games: perf.last_5_games ? (perf.last_5_games as unknown as RecentGame[]).map(g => {
        if (g.heavy_win) return 'HW';
        if (g.heavy_loss) return 'HL';
        return g.result.toUpperCase().charAt(0);
      }).reverse().join(', ') : ''
    })).sort((a, b) => a.name.localeCompare(b.name));

    return { seasonStats, goalStats, formData };
  }

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantFromRequest(request);
    const responseData = await getHalfSeasonStats(tenantId);
    return NextResponse.json({ data: responseData });
  } catch (error) {
    return handleTenantError(error);
  }
}
