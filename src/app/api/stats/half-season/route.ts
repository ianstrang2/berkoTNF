import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { toPlayerWithStats, toPlayerWithGoalStats } from '@/lib/transform/player.transform';

interface RecentGame {
  goals: number;
  result: string;
  heavy_win: boolean;
  heavy_loss: boolean;
}

const getHalfSeasonStats = unstable_cache(
  async () => {
    console.log('Cache miss, fetching fresh half-season data');

    const preAggregatedData = await prisma.$queryRaw<any[]>`
      SELECT hs.player_id as id, hs.player_id, hs.games_played, hs.wins, hs.draws, 
             hs.losses, hs.goals, hs.heavy_wins, hs.heavy_losses, hs.clean_sheets, 
             hs.win_percentage, hs.fantasy_points, hs.points_per_game,
             p.name, p.selected_club
      FROM aggregated_half_season_stats hs
      JOIN players p ON hs.player_id = p.player_id
    `;
    
    const recentPerformance = await prisma.aggregated_recent_performance.findMany({
      include: {
        player: {
          select: { name: true, selected_club: true, player_id: true }
        }
      }
    });

    const seasonStats = preAggregatedData.map(toPlayerWithStats).sort((a, b) => b.fantasyPoints - a.fantasyPoints);
    
    const goalStats = seasonStats.map(player => {
      const recentPerf = recentPerformance.find(perf => perf.player.name === player.name);
      const dbPlayer = {
        id: player.id,
        player_id: player.id,
        name: player.name,
        selected_club: player.club,
        total_goals: player.goals,
        minutes_per_goal: Math.round((player.gamesPlayed * 60) / (player.goals || 1)),
        last_five_games: recentPerf?.last_5_games ? (recentPerf.last_5_games as RecentGame[]).map(g => g.goals).reverse().join(',') : '0,0,0,0,0',
        max_goals_in_game: recentPerf?.last_5_games ? Math.max(...(recentPerf.last_5_games as RecentGame[] || []).map(g => g.goals)) : 0,
      };
      return toPlayerWithGoalStats(dbPlayer);
    }).filter(player => player.totalGoals > 0)
      .sort((a, b) => b.totalGoals - a.totalGoals || a.minutesPerGoal - b.minutesPerGoal);

    const formData = recentPerformance.map(perf => ({
      name: perf.player.name,
      last_5_games: perf.last_5_games ? (perf.last_5_games as RecentGame[]).map(g => {
        if (g.heavy_win) return 'HW';
        if (g.heavy_loss) return 'HL';
        return g.result.toUpperCase().charAt(0);
      }).reverse().join(', ') : ''
    })).sort((a, b) => a.name.localeCompare(b.name));

    return { seasonStats, goalStats, formData };
  },
  ['half_season_stats'],
  {
    tags: [CACHE_TAGS.HALF_SEASON_STATS],
    revalidate: 3600,
  }
);

export async function POST(request: NextRequest) {
  try {
    const responseData = await getHalfSeasonStats();
    return NextResponse.json({ data: responseData });
  } catch (error) {
    console.error('Error in half-season stats API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch half-season stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
