import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

export async function GET(request: NextRequest) {
  try {

    // Log the DATABASE_URL to ensure it's picked up correctly
    console.log('DATABASE_URL:', process.env.DATABASE_URL);

    // Check Prisma Client is initialized and log it
    console.log('Prisma Client Initialized:', prisma);

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

    return NextResponse.json({ 
      data: serializeData(allTimeStats)
    });

  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}