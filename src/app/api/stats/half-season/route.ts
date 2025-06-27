import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeData } from '@/lib/utils';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';

interface RecentGame {
  goals: number;
  result: string;
  heavy_win: boolean;
  heavy_loss: boolean;
}

interface HalfSeasonStats {
  player_id: number;
  player_name: string;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  heavy_wins: number;
  heavy_losses: number;
  clean_sheets: number;
  win_percentage: string;
  fantasy_points: number;
  points_per_game: string;
  selected_club?: {
    name: string;
    filename: string;
  } | null;
}

const getHalfSeasonStats = unstable_cache(
  async () => {
    console.log('Cache miss, fetching fresh half-season data');
    
    const queryPromise = prisma.$queryRaw<HalfSeasonStats[]>`
      SELECT hs.*, p.name as player_name, p.selected_club
      FROM aggregated_half_season_stats hs
      JOIN players p ON hs.player_id = p.player_id
    `;
    
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Query timed out after 5 seconds')), 5000);
    });
    
    const preAggregatedData = await Promise.race([queryPromise, timeoutPromise]) as HalfSeasonStats[];
    console.log('Half-season pre-aggregated data count:', preAggregatedData.length);

    const recentPerformance = await prisma.aggregated_recent_performance.findMany({
      include: {
        player: {
          select: { name: true, selected_club: true }
        }
      }
    });
    console.log('Recent performance data count:', recentPerformance.length);

    const seasonStats = preAggregatedData.map(stat => ({
      name: stat.player_name,
      player_id: stat.player_id,
      games_played: stat.games_played,
      wins: stat.wins,
      draws: stat.draws,
      losses: stat.losses,
      goals: stat.goals,
      heavy_wins: stat.heavy_wins,
      heavy_losses: stat.heavy_losses,
      clean_sheets: stat.clean_sheets,
      win_percentage: Number(stat.win_percentage),
      fantasy_points: Number(stat.fantasy_points),
      points_per_game: Number(stat.points_per_game),
      selected_club: stat.selected_club
    })).sort((a, b) => b.fantasy_points - a.fantasy_points);
    console.log('Formatted half-season stats count:', seasonStats.length);

    const goalStats = recentPerformance.map(perf => {
      const seasonStat = seasonStats.find(s => s.name === perf.player.name);
      const last5Goals = perf.last_5_games 
        ? (perf.last_5_games as RecentGame[]).map(g => g.goals).reverse().join(',')
        : '0,0,0,0,0';
      
      return {
        name: perf.player.name,
        player_id: perf.player_id,
        total_goals: seasonStat?.goals || 0,
        minutes_per_goal: Math.round(((seasonStat?.games_played || 0) * 60) / (seasonStat?.goals || 1)),
        last_five_games: last5Goals,
        max_goals_in_game: Math.max(...(perf.last_5_games as RecentGame[] || []).map(g => g.goals)),
        selected_club: perf.player.selected_club
      };
    }).sort((a, b) => b.total_goals - a.total_goals || a.minutes_per_goal - b.minutes_per_goal);

    const formData = recentPerformance.map(perf => ({
      name: perf.player.name,
      last_5_games: perf.last_5_games ? (perf.last_5_games as RecentGame[]).map(g => {
        if (g.heavy_win) return 'HW';
        if (g.heavy_loss) return 'HL';
        return g.result.toUpperCase().charAt(0);
      }).reverse().join(', ') : ''
    })).sort((a, b) => a.name.localeCompare(b.name));

    return {
      seasonStats: serializeData(seasonStats),
      goalStats: serializeData(goalStats),
      formData: serializeData(formData)
    };
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
