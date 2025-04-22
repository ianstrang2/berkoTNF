import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeData } from '@/lib/utils';
import apiCache from '@/lib/apiCache';

interface RecentGame {
  goals: number;
  result: string;
  heavy_win: boolean;
  heavy_loss: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate } = await request.json();
    console.log('Request dates:', { startDate, endDate });
    
    // Initialize cache and ensure metadata exists
    await prisma.cache_metadata.upsert({
      where: { cache_key: 'season_stats' },
      update: {},
      create: {
        cache_key: 'season_stats',
        dependency_type: 'match_result',
        last_invalidated: new Date()
      }
    });
    
    // Initialize cache
    await apiCache.initialize();
    
    // Check cache first
    const cachedData = await apiCache.get('season_stats', `${startDate}_${endDate}`);
    if (cachedData) {
      console.log('Returning cached data');
      return NextResponse.json({ data: cachedData });
    }

    console.log('Cache miss, fetching fresh data');
    console.log('Fetching pre-aggregated season stats');
    
    // Add timeout for database operations
    const dbTimeout = 5000; // 5 seconds timeout
    
    // Get the latest end date for the current period
    const latestStatsPromise = prisma.aggregated_season_stats.findFirst({
      where: {
        season_start_date: new Date(startDate)
      },
      orderBy: {
        season_end_date: 'desc'
      },
      select: {
        season_end_date: true
      }
    });
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timed out')), dbTimeout);
    });
    
    // Race the database query against the timeout
    const latestStats = await Promise.race([latestStatsPromise, timeoutPromise]) as any;

    if (!latestStats) {
      console.log('No stats found for period');
      return NextResponse.json({ 
        data: {
          seasonStats: [],
          goalStats: [],
          formData: []
        }
      });
    }

    // Get pre-aggregated season stats using the latest end date
    const preAggregatedDataPromise = prisma.aggregated_season_stats.findMany({
      where: {
        season_start_date: new Date(startDate),
        season_end_date: latestStats.season_end_date
      },
      include: {
        player: {
          select: {
            name: true
          }
        }
      }
    });
    
    // Race this query against a new timeout
    const preAggregatedData = await Promise.race([preAggregatedDataPromise, new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Season stats query timed out')), dbTimeout);
    })]) as any;
    
    console.log('Pre-aggregated data count:', preAggregatedData.length);

    // Get recent performance data from pre-aggregated table with timeout
    console.log('Fetching pre-aggregated recent performance');
    const recentPerformancePromise = prisma.aggregated_recent_performance.findMany({
      include: {
        player: {
          select: {
            name: true
          }
        }
      }
    });
    
    const recentPerformance = await Promise.race([recentPerformancePromise, new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Recent performance query timed out')), dbTimeout);
    })]) as any;
    
    console.log('Recent performance data count:', recentPerformance.length);

    // Format season stats
    const seasonStats = preAggregatedData.map(stat => ({
      name: stat.player.name,
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
      points_per_game: Number(stat.points_per_game)
    })).sort((a, b) => b.fantasy_points - a.fantasy_points);
    console.log('Formatted season stats count:', seasonStats.length);

    // Format goal stats using season stats and recent performance
    const goalStats = recentPerformance.map(perf => {
      const seasonStat = seasonStats.find(s => s.name === perf.player.name);
      const last5Goals = perf.last_5_games 
        ? (perf.last_5_games as RecentGame[]).map(g => g.goals).reverse().join(',')
        : '0,0,0,0,0';
      
      return {
        name: perf.player.name,
        total_goals: seasonStat?.goals || 0,
        minutes_per_goal: Math.round(((seasonStat?.games_played || 0) * 60) / (seasonStat?.goals || 1)),
        last_five_games: last5Goals,
        max_goals_in_game: Math.max(...(perf.last_5_games as RecentGame[] || []).map(g => g.goals))
      };
    }).sort((a, b) => b.total_goals - a.total_goals || a.minutes_per_goal - b.minutes_per_goal);
    console.log('Formatted goal stats count:', goalStats.length);

    // Don't include form data for full season view as it's not displayed
    /* 
    // Format form data using recent performance
    const formData = recentPerformance.map(perf => ({
      name: perf.player.name,
      last_5_games: perf.last_5_games ? (perf.last_5_games as RecentGame[]).map(g => {
        if (g.heavy_win) return 'HW';
        if (g.heavy_loss) return 'HL';
        return g.result.toUpperCase().charAt(0);
      }).reverse().join(', ') : ''
    })).sort((a, b) => a.name.localeCompare(b.name));
    console.log('Formatted form data count:', formData.length);
    */

    const responseData = {
      seasonStats: serializeData(seasonStats),
      goalStats: serializeData(goalStats),
      formData: [] // Empty array since we don't need it for full season
    };

    // Store in cache for future requests
    apiCache.set('season_stats', responseData, `${startDate}_${endDate}`);

    return NextResponse.json({ data: responseData });

  } catch (error) {
    console.error('Error in stats API:', error);
    
    // Try to get stale cache data in case of error
    try {
      const { startDate, endDate } = await request.json();
      const cachedData = await apiCache.get('season_stats', `${startDate}_${endDate}`, true); // true = ignore validation
      
      if (cachedData) {
        console.log('Returning stale cached data due to error');
        return NextResponse.json({ 
          data: cachedData,
          stale: true,
          error: 'Using cached data due to server error'
        });
      }
    } catch (cacheError) {
      console.error('Cache fallback also failed:', cacheError);
    }
    
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