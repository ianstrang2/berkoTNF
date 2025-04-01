import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Prevent static generation for this route
export const dynamic = 'force-dynamic';

// Fetch player profile by ID
export async function GET(request: Request) {
  try {
    console.log("Fetching player profile...");

    // Extract player ID from query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate the ID
    if (!id) {
      console.error("Error: No ID provided in request");
      return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
    }

    const numericId = parseInt(id, 10);
    console.log('Fetching profile for ID:', numericId);

    // Fetch player profile using a complex SQL query
    const playerProfile: any[] = await prisma.$queryRaw`
      WITH 
        player_stats AS (
          SELECT 
            p.player_id,
            p.name,
            COUNT(pm.match_id) as games_played,
            SUM(
              CASE 
                WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                WHEN pm.result = 'win' THEN 20
                WHEN pm.result = 'draw' THEN 10
                WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                WHEN pm.result = 'loss' THEN -10
                ELSE 0 END
            ) as fantasy_points,
            MAX(pm.goals) as most_goals,
            (
              SELECT m2.match_date::text
              FROM player_matches pm2
              JOIN matches m2 ON pm2.match_id = m2.match_id
              WHERE pm2.player_id = p.player_id AND pm2.goals = (
                SELECT MAX(pm3.goals)
                FROM player_matches pm3
                WHERE pm3.player_id = p.player_id
              )
              LIMIT 1
            ) as most_goals_date
          FROM players p
          LEFT JOIN player_matches pm ON p.player_id = pm.player_id
          WHERE p.player_id = ${numericId}
          GROUP BY p.player_id, p.name
        ),
        streaks AS (
          WITH numbered_matches AS (
            SELECT 
              pm.player_id,
              m.match_date,
              pm.result,
              ROW_NUMBER() OVER (PARTITION BY pm.player_id ORDER BY m.match_date) as match_num
            FROM player_matches pm
            JOIN matches m ON pm.match_id = m.match_id
            WHERE pm.player_id = ${numericId}
          ),
          win_gaps AS (
            SELECT 
              player_id,
              match_date,
              match_num,
              match_num - ROW_NUMBER() OVER (ORDER BY match_date) as grp
            FROM numbered_matches
            WHERE result = 'win'
          ),
          undefeated_gaps AS (
            SELECT 
              player_id,
              match_date,
              match_num,
              match_num - ROW_NUMBER() OVER (ORDER BY match_date) as grp
            FROM numbered_matches
            WHERE result != 'loss'
          ),
          win_streak AS (
            SELECT 
              player_id,
              COUNT(*) as streak,
              MIN(match_date) as start_date,
              MAX(match_date) as end_date
            FROM win_gaps
            GROUP BY player_id, grp
          ),
          undefeated_streak AS (
            SELECT 
              player_id,
              COUNT(*) as streak,
              MIN(match_date) as start_date,
              MAX(match_date) as end_date
            FROM undefeated_gaps
            GROUP BY player_id, grp
          )
          SELECT 
            ws.player_id,
            MAX(ws.streak) as win_streak,
            MIN(ws.start_date)::text as win_streak_start,
            MAX(ws.end_date)::text as win_streak_end,
            MAX(us.streak) as undefeated_streak,
            MIN(us.start_date)::text as undefeated_streak_start,
            MAX(us.end_date)::text as undefeated_streak_end
          FROM win_streak ws
          CROSS JOIN undefeated_streak us
          WHERE ws.player_id = us.player_id
          GROUP BY ws.player_id
        ),
        yearly_stats AS (
          SELECT 
            pm.player_id,
            EXTRACT(YEAR FROM m.match_date)::integer as year,
            COUNT(*) as games_played,
            SUM(pm.goals) as goals_scored,
            SUM(
              CASE 
                WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                WHEN pm.result = 'win' THEN 20
                WHEN pm.result = 'draw' THEN 10
                WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                WHEN pm.result = 'loss' THEN -10
                ELSE 0 END
            ) as fantasy_points,
            ROUND(COUNT(*) * 60.0 / NULLIF(SUM(pm.goals), 0), 1) as minutes_per_goal,
            ROUND(SUM(
              CASE 
                WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                WHEN pm.result = 'win' THEN 20
                WHEN pm.result = 'draw' THEN 10
                WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                WHEN pm.result = 'loss' THEN -10
                ELSE 0 END
            ) / COUNT(*), 1) as points_per_game
          FROM player_matches pm
          JOIN matches m ON pm.match_id = m.match_id
          WHERE pm.player_id = ${numericId}
          GROUP BY pm.player_id, EXTRACT(YEAR FROM m.match_date)
          ORDER BY year DESC
        )
      SELECT 
        ps.*, 
        s.win_streak, 
        s.win_streak_start, 
        s.win_streak_end, 
        s.undefeated_streak, 
        s.undefeated_streak_start, 
        s.undefeated_streak_end,
        (
          SELECT json_agg(ys.*)
          FROM yearly_stats ys
        ) as yearly_stats
      FROM player_stats ps
      LEFT JOIN streaks s ON ps.player_id = s.player_id;
    `;

    // Handle case where player is not found
    if (!playerProfile || playerProfile.length === 0) {
      console.warn('Player not found for ID:', numericId);
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Serialize the profile data (convert BigInt to numbers/strings)
    const serializedProfile = {
      ...playerProfile[0],
      games_played: Number(playerProfile[0].games_played),
      fantasy_points: Number(playerProfile[0].fantasy_points),
      most_goals: Number(playerProfile[0].most_goals),
      win_streak: Number(playerProfile[0].win_streak),
      undefeated_streak: Number(playerProfile[0].undefeated_streak),
      yearly_stats: playerProfile[0].yearly_stats?.map(stat => ({
        year: Number(stat.year),
        games_played: Number(stat.games_played),
        goals_scored: Number(stat.goals_scored),
        fantasy_points: Number(stat.fantasy_points),
        minutes_per_goal: Number(stat.minutes_per_goal) || 'N/A',
        points_per_game: Number(stat.points_per_game) || 'N/A',
      })),
      win_streak_dates: `${playerProfile[0].win_streak_start} to ${playerProfile[0].win_streak_end}`,
      undefeated_streak_dates: `${playerProfile[0].undefeated_streak_start} to ${playerProfile[0].undefeated_streak_end}`
    };

    // Return the serialized profile
    return NextResponse.json({ profile: serializedProfile });

  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch player profile',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}