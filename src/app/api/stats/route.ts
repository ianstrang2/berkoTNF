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

const getFullSeasonStats = unstable_cache(
  async (startDate: string, endDate: string) => {
    console.log(`Cache miss, fetching fresh data for ${startDate} to ${endDate}`);
    const dbTimeout = 5000;

    const latestStatsPromise = prisma.aggregated_season_stats.findFirst({
      where: { season_start_date: new Date(startDate) },
      orderBy: { season_end_date: 'desc' },
      select: { season_end_date: true }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timed out')), dbTimeout);
    });

    const latestStats = await Promise.race([latestStatsPromise, timeoutPromise]) as any;

    if (!latestStats) {
      console.log('No stats found for period');
      return { seasonStats: [], goalStats: [], formData: [] };
    }

    const preAggregatedDataPromise = prisma.aggregated_season_stats.findMany({
      where: {
        season_start_date: new Date(startDate),
        season_end_date: latestStats.season_end_date
      },
      include: { player: { select: { name: true, selected_club: true } } }
    });

    const preAggregatedData = await Promise.race([preAggregatedDataPromise, new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Season stats query timed out')), dbTimeout);
    })]) as any;

    const recentPerformancePromise = prisma.aggregated_recent_performance.findMany({
      include: { player: { select: { name: true, selected_club: true } } }
    });

    const recentPerformance = await Promise.race([recentPerformancePromise, new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Recent performance query timed out')), dbTimeout);
    })]) as any;

    const seasonStats = preAggregatedData.map(stat => ({
      name: stat.player.name,
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
      selected_club: stat.player.selected_club
    })).sort((a, b) => b.fantasy_points - a.fantasy_points);

    const goalStats = recentPerformance.map(perf => {
      const seasonStat = seasonStats.find(s => s.name === perf.player.name);
      const last5Goals = perf.last_5_games ? (perf.last_5_games as RecentGame[]).map(g => g.goals).reverse().join(',') : '0,0,0,0,0';
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

    return {
      seasonStats: serializeData(seasonStats),
      goalStats: serializeData(goalStats),
      formData: []
    };
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