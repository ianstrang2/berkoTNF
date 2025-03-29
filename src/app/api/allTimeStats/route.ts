import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import apiCache from '@/lib/apiCache';

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

export async function GET(request: NextRequest) {
  try {
    // Try to get data from cache first
    const cachedData = await apiCache.get('all_time_stats');
    
    if (cachedData) {
      console.log('Returning cached all-time stats data');
      return NextResponse.json({
        data: cachedData,
        fromCache: true
      });
    }

    console.log('Cache miss. Fetching all-time stats data...');

    // Check if we have pre-aggregated data
    const preAggregatedData = await prisma.aggregated_all_time_stats.findMany({
      include: {
        player: {
          select: {
            name: true,
            is_retired: true
          }
        }
      },
      orderBy: {
        fantasy_points: 'desc'
      }
    });
    
    if (preAggregatedData.length > 0) {
      console.log('Using pre-aggregated all-time stats data');
      
      // Format the data to match expected structure
      const allTimeStats = preAggregatedData.map(stat => ({
        name: stat.player.name,
        is_retired: stat.player.is_retired,
        games_played: stat.games_played,
        wins: stat.wins,
        draws: stat.draws,
        losses: stat.losses,
        goals: stat.goals,
        win_percentage: stat.win_percentage,
        minutes_per_goal: stat.minutes_per_goal,
        heavy_wins: stat.heavy_wins,
        heavy_win_percentage: stat.heavy_win_percentage,
        heavy_losses: stat.heavy_losses,
        heavy_loss_percentage: stat.heavy_loss_percentage,
        clean_sheets: stat.clean_sheets,
        clean_sheet_percentage: stat.clean_sheet_percentage,
        fantasy_points: stat.fantasy_points,
        points_per_game: stat.points_per_game
      }));
      
      const responseData = serializeData(allTimeStats);
      
      // Store in cache for future requests
      apiCache.set('all_time_stats', responseData);
      
      return NextResponse.json({ data: responseData });
    } else {
      console.log('Falling back to original query - no pre-aggregated data available');
      
      // Fall back to original query if pre-aggregated data is not available
      const allTimeStats = await prisma.$queryRaw`
        WITH player_stats AS (
          SELECT 
            p.name,
            p.is_retired,
            COUNT(*) as games_played,
            COUNT(CASE WHEN pm.result = 'win' THEN 1 END) as wins,
            COUNT(CASE WHEN pm.result = 'draw' THEN 1 END) as draws,
            COUNT(CASE WHEN pm.result = 'loss' THEN 1 END) as losses,
            SUM(pm.goals) as goals,
            CAST(COUNT(CASE WHEN pm.result = 'win' THEN 1 END)::float * 100 / COUNT(*) AS DECIMAL(5,1)) as win_percentage,
            ROUND(COUNT(*) * 60.0 / NULLIF(SUM(pm.goals), 0), 1) as minutes_per_goal,
            COUNT(CASE WHEN pm.heavy_win = true THEN 1 END) as heavy_wins,
            CAST(COUNT(CASE WHEN pm.heavy_win = true THEN 1 END)::float * 100 / COUNT(*) AS DECIMAL(5,1)) as heavy_win_percentage,
            COUNT(CASE WHEN pm.heavy_loss = true THEN 1 END) as heavy_losses,
            CAST(COUNT(CASE WHEN pm.heavy_loss = true THEN 1 END)::float * 100 / COUNT(*) AS DECIMAL(5,1)) as heavy_loss_percentage,
            COUNT(CASE WHEN (pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0) THEN 1 END) as clean_sheets,
            CAST(COUNT(CASE WHEN (pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0) THEN 1 END)::float * 100 / COUNT(*) AS DECIMAL(5,1)) as clean_sheet_percentage,
            SUM(
              CASE 
                WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                    ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                THEN 40
                WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                WHEN pm.result = 'win' AND 
                    ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                THEN 30
                WHEN pm.result = 'win' THEN 20
                WHEN pm.result = 'draw' AND 
                    ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                THEN 20
                WHEN pm.result = 'draw' THEN 10
                WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                WHEN pm.result = 'loss' THEN -10
                ELSE 0
              END
            ) as fantasy_points
          FROM players p
          JOIN player_matches pm ON p.player_id = pm.player_id
          JOIN matches m ON pm.match_id = m.match_id
          WHERE p.is_ringer = false
          GROUP BY p.name, p.is_retired
          HAVING COUNT(*) >= 50
        )
        SELECT 
          *,
          ROUND(fantasy_points::numeric / games_played, 1) as points_per_game
        FROM player_stats
        ORDER BY fantasy_points DESC
      `;
      
      const responseData = serializeData(allTimeStats);
      
      // Store in cache for future requests
      apiCache.set('all_time_stats', responseData);
      
      return NextResponse.json({ data: responseData });
    }
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}