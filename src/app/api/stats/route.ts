import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import apiCache from '@/lib/apiCache';

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

export async function POST(request: NextRequest) {
  console.log('API route hit');
  
  try {
    const body = await request.json();
    console.log('Received request body:', body);

    if (!body || !body.startDate || !body.endDate) {
      console.error('Invalid request body:', body);
      return NextResponse.json(
        { error: 'Invalid request body - missing dates' },
        { status: 400 }
      );
    }

    const { startDate, endDate } = body;
    
    // Create cache key with date range
    const cacheKey = `season_stats:${startDate}_${endDate}`;
    
    // Try to get data from cache first
    const cachedData = await apiCache.get('season_stats', `${startDate}_${endDate}`);
    
    if (cachedData) {
      console.log('Returning cached data for stats');
      return NextResponse.json({
        data: cachedData,
        fromCache: true
      });
    }
    
    console.log('Cache miss. About to execute queries with dates:', startDate, endDate);

    // Check if we have pre-aggregated data for this date range
    const preAggregatedData = await prisma.aggregated_season_stats.findMany({
      where: {
        season_start_date: new Date(startDate),
        season_end_date: new Date(endDate)
      },
      include: {
        player: {
          select: {
            name: true
          }
        }
      }
    });
    
    // If we have pre-aggregated data, use it
    if (preAggregatedData.length > 0) {
      console.log('Using pre-aggregated season stats');
      
      // Format the data to match expected structure
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
        win_percentage: stat.win_percentage,
        fantasy_points: stat.fantasy_points,
        points_per_game: stat.points_per_game
      }));

      // Get recent performance data from pre-aggregated table
      const recentPerformance = await prisma.aggregated_recent_performance.findMany({
        include: {
          player: {
            select: {
              name: true
            }
          }
        }
      });

      // Format goal stats using recent performance data
      const goalStats = recentPerformance.map(perf => ({
        name: perf.player.name,
        total_goals: seasonStats.find(s => s.name === perf.player.name)?.goals || 0,
        minutes_per_goal: Math.round((seasonStats.find(s => s.name === perf.player.name)?.games_played || 0) * 60 / (seasonStats.find(s => s.name === perf.player.name)?.goals || 1)),
        last_five_games: perf.last_5_games ? JSON.stringify(perf.last_5_games.map(g => g.goals)).replace(/[\[\]]/g, '') : '',
        max_goals_in_game: Math.max(...(perf.last_5_games?.map(g => g.goals) || [0]))
      })).sort((a, b) => b.total_goals - a.total_goals || a.minutes_per_goal - b.minutes_per_goal);

      // Format form data using recent performance data
      const formData = recentPerformance.map(perf => ({
        name: perf.player.name,
        last_5_games: perf.last_5_games ? perf.last_5_games.map(g => {
          if (g.heavy_win) return 'HW';
          if (g.heavy_loss) return 'HL';
          return g.result.toUpperCase().charAt(0);
        }).join(', ') : ''
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      const responseData = {
        seasonStats: serializeData(seasonStats),
        goalStats: serializeData(goalStats),
        formData: serializeData(formData)
      };
      
      // Store in cache for future requests
      apiCache.set('season_stats', responseData, `${startDate}_${endDate}`);
      
      console.log('About to send pre-aggregated response');
      return NextResponse.json({ data: responseData });
      
    } else {
      // Fall back to the original queries if pre-aggregated data is not available
      console.log('Falling back to original queries - no pre-aggregated data available');
      
      // Season Stats Query
      const seasonStats = await prisma.$queryRaw`
      SELECT 
        p.name,
        COUNT(*) as games_played,
        COUNT(CASE WHEN pm.result = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN pm.result = 'draw' THEN 1 END) as draws,
        SUM(pm.goals) as goals,
        COUNT(CASE WHEN pm.heavy_win = true THEN 1 END) as heavy_wins,
        COUNT(CASE WHEN pm.heavy_loss = true THEN 1 END) as heavy_losses,
        COUNT(CASE 
          WHEN (pm.team = 'A' AND m.team_b_score = 0) OR 
               (pm.team = 'B' AND m.team_a_score = 0) 
          THEN 1 
        END) as clean_sheets,
        CAST(
          (COUNT(CASE WHEN pm.result = 'win' THEN 1 END)::float * 100 / NULLIF(COUNT(*), 0)) 
          AS DECIMAL(5,1)
        ) as win_percentage,
        SUM(
          CASE 
            WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                 ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
            THEN 40  -- Heavy Win + Clean Sheet
            WHEN pm.result = 'win' AND pm.heavy_win = true 
            THEN 30  -- Heavy Win
            WHEN pm.result = 'win' AND 
                 ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
            THEN 30  -- Win + Clean Sheet
            WHEN pm.result = 'win' 
            THEN 20  -- Win
            WHEN pm.result = 'draw' AND 
                 ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
            THEN 20  -- Draw + Clean Sheet
            WHEN pm.result = 'draw' 
            THEN 10  -- Draw
            WHEN pm.result = 'loss' AND pm.heavy_loss = true 
            THEN -20 -- Heavy Loss
            WHEN pm.result = 'loss' 
            THEN -10 -- Loss
            ELSE 0
          END
        ) as fantasy_points
      FROM players p
      JOIN player_matches pm ON p.player_id = pm.player_id
      JOIN matches m ON pm.match_id = m.match_id
      WHERE m.match_date >= ${startDate}::date
      AND m.match_date <= ${endDate}::date
      AND p.is_ringer = false
      GROUP BY p.name
      ORDER BY fantasy_points DESC
      `;
      console.log('Season stats query completed');

      // Goal Stats Query with Last 5 Games
      const goalStats = await prisma.$queryRaw`
      WITH player_totals AS (
        SELECT 
          p.player_id,
          p.name,
          SUM(pm.goals) as total_goals,
          ROUND(COUNT(*) * 60.0 / NULLIF(SUM(pm.goals), 0)) as minutes_per_goal
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE m.match_date >= ${startDate}::date
        AND m.match_date <= ${endDate}::date
        AND p.is_ringer = false
        GROUP BY p.player_id, p.name
      ),
      recent_games AS (
        SELECT 
          p.player_id,
          pm.goals,
          m.match_date,
          ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as game_number,
          ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date ASC) as display_order
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE m.match_date >= ${startDate}::date
        AND m.match_date <= ${endDate}::date
        AND p.is_ringer = false
      )
      SELECT 
        pt.*,
        STRING_AGG(
          CASE 
            WHEN rg.goals IS NULL THEN NULL
            WHEN rg.goals = 0 THEN '0'
            ELSE rg.goals::text 
          END,
          ',' ORDER BY rg.display_order ASC
        ) as last_five_games,
        MAX(rg.goals) as max_goals_in_game
      FROM player_totals pt
      LEFT JOIN recent_games rg ON pt.player_id = rg.player_id AND rg.game_number <= 5
      GROUP BY pt.player_id, pt.name, pt.total_goals, pt.minutes_per_goal
      ORDER BY pt.total_goals DESC, pt.minutes_per_goal ASC
      `;
      console.log('Goal stats query completed');

      // Form Data Query (Last 5 Games)
      const formData = await prisma.$queryRaw`
        WITH recent_games AS (
          SELECT 
            p.player_id,
            p.name,
            m.match_date,
            CASE 
              WHEN pm.result = 'win' AND pm.heavy_win = true THEN 'HW'
              WHEN pm.result = 'win' THEN 'W'
              WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN 'HL'
              WHEN pm.result = 'loss' THEN 'L'
              ELSE 'D'
            END as result,
            ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as game_number,
            ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date ASC) as display_order
          FROM players p
          JOIN player_matches pm ON p.player_id = pm.player_id
          JOIN matches m ON pm.match_id = m.match_id
          WHERE m.match_date >= ${startDate}::date
          AND m.match_date <= ${endDate}::date
          AND p.is_ringer = false
        )
        SELECT 
          name,
          STRING_AGG(
            result, 
            ', ' ORDER BY display_order ASC
          ) as last_5_games
        FROM recent_games
        WHERE game_number <= 5
        GROUP BY player_id, name
        ORDER BY name
      `;
      console.log('Form data query completed');

      const responseData = {
        seasonStats: serializeData(seasonStats),
        goalStats: serializeData(goalStats),
        formData: serializeData(formData)
      };
      
      // Store in cache for future requests
      apiCache.set('season_stats', responseData, `${startDate}_${endDate}`);
      
      console.log('About to send response:', responseData);
      return NextResponse.json({ data: responseData });
    }

  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}