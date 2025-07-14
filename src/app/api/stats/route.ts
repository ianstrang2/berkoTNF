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
      include: { player: { select: { name: true, selected_club: true, player_id: true } } }
    });

    const preAggregatedData = await Promise.race([preAggregatedDataPromise, new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Season stats query timed out')), dbTimeout);
    })]) as any[];

    const recentPerformancePromise = prisma.aggregated_recent_performance.findMany({
      include: { player: { select: { name: true, selected_club: true, player_id: true } } }
    });

    const recentPerformance = await Promise.race([recentPerformancePromise, new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Recent performance query timed out')), dbTimeout);
    })]) as any[];

    const seasonStats = preAggregatedData.map(stat => {
      const dbPlayer = { 
        ...stat, 
        ...stat.player,
        id: stat.player_id  // Use player_id as the canonical ID, not the auto-increment id
      };
      return toPlayerWithStats(dbPlayer);
    }).sort((a, b) => b.fantasyPoints - a.fantasyPoints);

    const goalStats = seasonStats.map(player => {
      const recentPerf = recentPerformance.find(perf => perf.player.name === player.name);
      const last5Goals = recentPerf?.last_5_games ? (recentPerf.last_5_games as RecentGame[]).map(g => g.goals).reverse().join(',') : '0,0,0,0,0';
      const dbPlayer = {
        id: player.id,
        player_id: player.id,
        name: player.name,
        selected_club: player.club,
        total_goals: player.goals,
        minutes_per_goal: Math.round((player.gamesPlayed * 60) / (player.goals || 1)),
        last_five_games: last5Goals,
        max_goals_in_game: recentPerf?.last_5_games ? Math.max(...(recentPerf.last_5_games as RecentGame[] || []).map(g => g.goals)) : 0,
      };
      return toPlayerWithGoalStats(dbPlayer);
    }).filter(player => player.totalGoals > 0)
      .sort((a, b) => b.totalGoals - a.totalGoals || a.minutesPerGoal - b.minutesPerGoal);

    return { seasonStats, goalStats, formData: [] };
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