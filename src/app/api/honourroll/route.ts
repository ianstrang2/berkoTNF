import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

export async function GET() {
  try {
    console.log('Starting honour roll data fetch...');

    // Season Winners (by Fantasy Points)
    const seasonWinners = await prisma.$queryRaw`
      WITH yearly_stats AS (
        SELECT 
          p.name,
          EXTRACT(YEAR FROM m.match_date) as year,
          SUM(CASE 
            WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
            THEN 40
            WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
            WHEN pm.result = 'win' AND 
                ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
            THEN 30
            WHEN pm.result = 'win' THEN 20
            WHEN pm.result = 'draw' THEN 10
            WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
            WHEN pm.result = 'loss' THEN -10
            ELSE 0 END) as points,
          COUNT(*) as games_played
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false  -- Exclude ringers
        AND EXTRACT(YEAR FROM m.match_date) < 2025  -- Exclude current year
        GROUP BY p.name, EXTRACT(YEAR FROM m.match_date)
        HAVING COUNT(*) >= 10
      )
      SELECT 
        year::integer,
        jsonb_build_object(
          'winner', (SELECT name FROM yearly_stats ys2 WHERE ys2.year = ys1.year ORDER BY points DESC LIMIT 1),
          'winner_points', (SELECT points FROM yearly_stats ys2 WHERE ys2.year = ys1.year ORDER BY points DESC LIMIT 1),
          'runners_up', (
            SELECT json_agg(json_build_object('name', name, 'points', points))
            FROM (
              SELECT name, points 
              FROM yearly_stats ys2 
              WHERE ys2.year = ys1.year 
              ORDER BY points DESC 
              OFFSET 1 LIMIT 2
            ) runners
          )
        ) as winners
      FROM yearly_stats ys1
      GROUP BY year
      ORDER BY year DESC`;

    // Top Goalscorers by Season
    const topScorers = await prisma.$queryRaw`
      WITH season_goals AS (
        SELECT 
          p.name,
          EXTRACT(YEAR FROM m.match_date) as year,
          SUM(pm.goals) as goals
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false  -- Exclude ringers
        AND EXTRACT(YEAR FROM m.match_date) < 2025  -- Exclude current year
        GROUP BY p.name, EXTRACT(YEAR FROM m.match_date)
        HAVING SUM(pm.goals) > 0
      )
      SELECT 
        year::integer,
        jsonb_build_object(
          'winner', (SELECT name FROM season_goals sg2 WHERE sg2.year = sg1.year ORDER BY goals DESC LIMIT 1),
          'winner_goals', (SELECT goals FROM season_goals sg2 WHERE sg2.year = sg1.year ORDER BY goals DESC LIMIT 1),
          'runners_up', (
            SELECT json_agg(json_build_object('name', name, 'goals', goals))
            FROM (
              SELECT name, goals 
              FROM season_goals sg2 
              WHERE sg2.year = sg1.year 
              ORDER BY goals DESC 
              OFFSET 1 LIMIT 2
            ) runners
          )
        ) as scorers
      FROM season_goals sg1
      GROUP BY year
      ORDER BY year DESC`;

    // Record Holders
    const records = await prisma.$queryRaw`
      WITH 
        game_goals AS (
          SELECT 
            p.name,
            m.match_date,
            pm.goals,
            m.team_a_score,
            m.team_b_score,
            pm.team,
            ROW_NUMBER() OVER (ORDER BY pm.goals DESC) as rn
          FROM players p
          JOIN player_matches pm ON p.player_id = pm.player_id
          JOIN matches m ON pm.match_id = m.match_id
          WHERE pm.goals > 0 AND p.is_ringer = false  -- Exclude ringers
        ),
        biggest_victories AS (
          SELECT 
            m.match_id,
            m.match_date,
            m.team_a_score,
            m.team_b_score,
            ABS(m.team_a_score - m.team_b_score) as score_difference,
            CASE 
              WHEN m.team_a_score > m.team_b_score THEN 'A'
              ELSE 'B'
            END as winning_team,
            (
              SELECT string_agg(
                CASE 
                  WHEN p.name ~ ' ' THEN 
                    SUBSTRING(SPLIT_PART(p.name, ' ', 1), 1, 1) || '. ' || SPLIT_PART(p.name, ' ', 2)
                  ELSE p.name
                END || 
                CASE 
                  WHEN pm2.goals > 0 THEN ' (' || pm2.goals || ')'
                  ELSE ''
                END,
                ', '
                ORDER BY p.name
              )
              FROM player_matches pm2
              JOIN players p ON pm2.player_id = p.player_id
              WHERE pm2.match_id = m.match_id AND pm2.team = 'A'
            ) as team_a_players,
            (
              SELECT string_agg(
                CASE 
                  WHEN p.name ~ ' ' THEN 
                    SUBSTRING(SPLIT_PART(p.name, ' ', 1), 1, 1) || '. ' || SPLIT_PART(p.name, ' ', 2)
                  ELSE p.name
                END || 
                CASE 
                  WHEN pm2.goals > 0 THEN ' (' || pm2.goals || ')'
                  ELSE ''
                END,
                ', '
                ORDER BY p.name
              )
              FROM player_matches pm2
              JOIN players p ON pm2.player_id = p.player_id
              WHERE pm2.match_id = m.match_id AND pm2.team = 'B'
            ) as team_b_players
          FROM matches m
          WHERE m.match_date IS NOT NULL
          ORDER BY ABS(m.team_a_score - m.team_b_score) DESC, m.match_date DESC
          LIMIT 1
        ),
        consecutive_goals AS (
          WITH player_matches_with_gaps AS (
            SELECT 
              p.name,
              m.match_date,
              pm.goals,
              CASE WHEN pm.goals > 0 THEN 1 ELSE 0 END as scored,
              LAG(CASE WHEN pm.goals > 0 THEN 1 ELSE 0 END) OVER (PARTITION BY p.player_id ORDER BY m.match_date) as prev_scored
            FROM players p
            JOIN player_matches pm ON p.player_id = pm.player_id
            JOIN matches m ON pm.match_id = m.match_id
            WHERE p.is_ringer = false  -- Exclude ringers
            ORDER BY p.player_id, m.match_date
          ),
          streaks AS (
            SELECT 
              name,
              match_date,
              CASE 
                WHEN scored = 1 AND (prev_scored = 0 OR prev_scored IS NULL) 
                THEN 1 
                ELSE 0 
              END as streak_start,
              scored
            FROM player_matches_with_gaps
          ),
          numbered_streaks AS (
            SELECT 
              name,
              match_date,
              scored,
              SUM(streak_start) OVER (ORDER BY name, match_date) as streak_group
            FROM streaks
            WHERE scored = 1
          )
          SELECT 
            name,
            COUNT(*) as streak,
            MIN(match_date) as streak_start,
            MAX(match_date) as streak_end
          FROM numbered_streaks
          GROUP BY name, streak_group
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ),
        streaks AS (
          WITH numbered_matches AS (
            SELECT 
              p.name,
              m.match_date,
              pm.result,
              ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date) as match_num
            FROM players p
            JOIN player_matches pm ON p.player_id = pm.player_id
            JOIN matches m ON pm.match_id = m.match_id
            WHERE p.is_ringer = false  -- Exclude ringers
          ),
          win_gaps AS (
            SELECT 
              name,
              match_date,
              result,
              match_num,
              match_num - ROW_NUMBER() OVER (PARTITION BY name, result ORDER BY match_date) as grp
            FROM numbered_matches
            WHERE result = 'win'
          ),
          loss_gaps AS (
            SELECT 
              name,
              match_date,
              result,
              match_num,
              match_num - ROW_NUMBER() OVER (PARTITION BY name, result ORDER BY match_date) as grp
            FROM numbered_matches
            WHERE result = 'loss'
          ),
          no_win_gaps AS (
            SELECT 
              name,
              match_date,
              result,
              match_num,
              match_num - ROW_NUMBER() OVER (PARTITION BY name ORDER BY match_date) as grp
            FROM numbered_matches
            WHERE result != 'win'
          ),
          undefeated_gaps AS (
            SELECT 
              name,
              match_date,
              result,
              match_num,
              match_num - ROW_NUMBER() OVER (PARTITION BY name ORDER BY match_date) as grp
            FROM numbered_matches
            WHERE result != 'loss'
          )
          SELECT 
            type,
            name,
            COUNT(*) as streak,
            MIN(match_date) as streak_start,
            MAX(match_date) as streak_end
          FROM (
            SELECT 'Win Streak' as type, name, match_date, match_num, grp FROM win_gaps
            UNION ALL
            SELECT 'Loss Streak' as type, name, match_date, match_num, grp FROM loss_gaps
            UNION ALL
            SELECT 'No Win Streak' as type, name, match_date, match_num, grp FROM no_win_gaps
            UNION ALL
            SELECT 'Undefeated Streak' as type, name, match_date, match_num, grp FROM undefeated_gaps
          ) all_streaks
          GROUP BY type, name, grp
          HAVING COUNT(*) >= 3
        )
      SELECT 
        jsonb_build_object(
          'most_goals_in_game', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'name', name,
                'goals', goals,
                'date', match_date::text,
                'score', CASE 
                  WHEN team = 'A' THEN team_a_score || '-' || team_b_score
                  ELSE team_b_score || '-' || team_a_score
                END
              )
            )
            FROM (
              SELECT *
              FROM game_goals
              WHERE rn = 1
            ) t
          ),
          'streaks', (
            SELECT jsonb_object_agg(
              type,
              jsonb_build_object(
                'holders', (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'name', name,
                      'streak', streak,
                      'start_date', streak_start::text,
                      'end_date', streak_end::text
                    )
                  )
                  FROM (
                    SELECT 
                      name, streak, streak_start, streak_end,
                      RANK() OVER (PARTITION BY type ORDER BY streak DESC) as rank
                    FROM streaks s2
                    WHERE s2.type = s1.type
                    ORDER BY streak DESC
                  ) ranked
                  WHERE rank = 1
                )
              )
            )
            FROM (
              SELECT DISTINCT type
              FROM streaks
            ) s1
          ),
          'consecutive_goals', (
            SELECT jsonb_build_object(
              'holders', (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'name', name,
                    'streak', streak,
                    'start_date', streak_start::text,
                    'end_date', streak_end::text
                  )
                )
                FROM consecutive_goals
              )
            )
          ),
          'biggest_victory', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'team_a_score', team_a_score,
                'team_b_score', team_b_score,
                'team_a_players', team_a_players,
                'team_b_players', team_b_players,
                'date', match_date::text,
                'winning_team', winning_team
              )
            )
            FROM biggest_victories
          )
        ) as records`;

    const response = { 
      data: {
        seasonWinners: serializeData(seasonWinners),
        topScorers: serializeData(topScorers),
        records: serializeData(records)
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch honour roll data', details: error },
      { status: 500 }
    );
  }
}