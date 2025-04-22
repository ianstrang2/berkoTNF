import { prisma } from '../db';

export async function updateRecentPerformance() {
  console.time('updateRecentPerformance');

  try {
    // Execute within a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Use a single raw SQL query that matches the original Postgres function logic
      // but with UPSERT pattern instead of delete+insert
      await tx.$executeRaw`
        INSERT INTO "aggregated_recent_performance" (
          "player_id", 
          "last_5_games", 
          "last_5_goals",
          "last_updated"
        )
        WITH recent_matches AS (
          SELECT 
            p.player_id,
            m.match_date,
            pm.goals,
            pm.result,
            pm.heavy_win,
            pm.heavy_loss,
            CASE 
              WHEN pm.team = 'A' THEN m.team_a_score || '-' || m.team_b_score
              ELSE m.team_b_score || '-' || m.team_a_score
            END as score,
            CASE 
              WHEN pm.team = 'A' AND m.team_b_score = 0 
                OR pm.team = 'B' AND m.team_a_score = 0 
              THEN true 
              ELSE false 
            END as clean_sheet,
            ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
          FROM players p
          JOIN player_matches pm ON p.player_id = pm.player_id
          JOIN matches m ON pm.match_id = m.match_id
          WHERE p.is_ringer = false
        ),
        last_5_performance AS (
          SELECT 
            player_id,
            jsonb_agg(
              jsonb_build_object(
                'date', to_char(match_date, 'YYYY-MM-DD'),
                'result', result,
                'score', score,
                'goals', goals,
                'heavy_win', heavy_win,
                'heavy_loss', heavy_loss,
                'clean_sheet', clean_sheet
              ) ORDER BY match_date DESC
            ) FILTER (WHERE match_num <= 5) as last_5_games,
            SUM(CASE WHEN match_num <= 5 THEN goals ELSE 0 END) as last_5_goals
          FROM recent_matches
          GROUP BY player_id
        )
        SELECT 
          player_id,
          last_5_games,
          last_5_goals,
          NOW() as last_updated
        FROM last_5_performance
        ON CONFLICT (player_id) DO UPDATE SET
          last_5_games = EXCLUDED.last_5_games,
          last_5_goals = EXCLUDED.last_5_goals,
          last_updated = NOW()
      `;

      // Update cache metadata
      await tx.$executeRaw`
        UPDATE "cache_metadata"
        SET "last_invalidated" = NOW()
        WHERE "cache_key" = 'recent_performance'
      `;
    });

    console.timeEnd('updateRecentPerformance');
    return true;

  } catch (err) {
    console.error('Error updating recent performance:', err);
    throw err;
  }
} 