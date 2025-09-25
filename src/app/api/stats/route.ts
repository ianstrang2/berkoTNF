import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { toPlayerWithStats } from '@/lib/transform/player.transform';
// Multi-tenant imports - ensuring stats are tenant-scoped
import { createTenantPrisma } from '@/lib/tenantPrisma';
import { getCurrentTenantId } from '@/lib/tenantContext';

interface RecentGame {
  goals: number;
  result: string;
  heavy_win: boolean;
  heavy_loss: boolean;
}

const getFullSeasonStats = unstable_cache(
  async (startDate: string, endDate: string) => {
    console.log(`Cache miss, fetching fresh data for ${startDate} to ${endDate}`);

    // Multi-tenant: Use tenant-scoped query for season stats
    const tenantId = getCurrentTenantId();
    const tenantPrisma = await createTenantPrisma(tenantId);

    const preAggregatedData = await tenantPrisma.aggregated_season_stats.findMany({
      where: {
        season_start_date: new Date(startDate),
        players: {
          is_ringer: false
        }
      },
      include: {
        players: {
          select: {
            name: true,
            selected_club: true
          }
        }
      }
    });
    
    const recentPerformance = await tenantPrisma.aggregated_recent_performance.findMany({
      include: {
        players: {
          select: { name: true, selected_club: true, player_id: true }
        }
      }
    });

    const seasonStats = preAggregatedData.map(stat => {
      const dbPlayer = {
        id: stat.player_id,
        player_id: stat.player_id,
        name: (stat as any).players?.name,
        selected_club: (stat as any).players?.selected_club,
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
  },
  ['full_season_stats'], // Base key for the cache
  {
    tags: [CACHE_TAGS.SEASON_STATS], // Tag for revalidation
    revalidate: 3600,
  }
);

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate } = await request.json();
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }
    
    const responseData = await getFullSeasonStats(startDate, endDate);
    return NextResponse.json({ data: responseData });

  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}