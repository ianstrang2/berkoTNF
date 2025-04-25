import { Prisma, PrismaClient } from '@prisma/client';
import { AppConfig } from '../config';
import { prisma } from '../prisma';

// Default values (should be overridden by config)
const DEFAULT_MIN_GAMES_HONOURS = 10;
const DEFAULT_MIN_STREAK_LENGTH = 3;

/**
 * Updates past season honours (winners, top scorers) and all-time records.
 * Due to complex window functions and ranking, this heavily relies on $queryRaw.
 * @param {AppConfig} config - Application configuration object.
 */
export async function updateSeasonHonours(
    tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
    config?: AppConfig
): Promise<void> {
    console.log('Starting updateSeasonHonours...');
    const startTime = Date.now();

    // Use provided transaction client or fall back to global prisma client
    const client = tx || prisma;

    // Ensure we have a config
    if (!config) {
        throw new Error('Config object is required for updateSeasonHonours');
    }

    // Extract config values with defaults
    const minGamesForHonours = (config.min_games_for_honours ?? DEFAULT_MIN_GAMES_HONOURS) as number;
    const minStreakLength = (config.min_streak_length ?? DEFAULT_MIN_STREAK_LENGTH) as number;
    const win_points = (config.fantasy_win_points ?? 20) as number;
    const draw_points = (config.fantasy_draw_points ?? 10) as number;
    const loss_points = (config.fantasy_loss_points ?? -10) as number;
    const heavy_win_points = (config.fantasy_heavy_win_points ?? 30) as number;
    const clean_sheet_win_points = (config.fantasy_clean_sheet_win_points ?? 30) as number;
    const heavy_clean_sheet_win_points = (config.fantasy_heavy_clean_sheet_win_points ?? 40) as number;
    const clean_sheet_draw_points = (config.fantasy_clean_sheet_draw_points ?? 20) as number;
    const heavy_loss_points = (config.fantasy_heavy_loss_points ?? -20) as number;

    try {
        // Define the season honours and records SQL queries to reuse
        const seasonHonoursSQL = `
            WITH yearly_stats AS (
                SELECT
                    p.name,
                    EXTRACT(YEAR FROM m.match_date) as year,
                    SUM(
                        CASE
                            WHEN pm.result = 'win' AND pm.heavy_win = true AND pm.clean_sheet = true THEN ${heavy_clean_sheet_win_points}
                            WHEN pm.result = 'win' AND pm.heavy_win = true THEN ${heavy_win_points}
                            WHEN pm.result = 'win' AND pm.clean_sheet = true THEN ${clean_sheet_win_points}
                            WHEN pm.result = 'win' THEN ${win_points}
                            WHEN pm.result = 'draw' AND pm.clean_sheet = true THEN ${clean_sheet_draw_points}
                            WHEN pm.result = 'draw' THEN ${draw_points}
                            WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN ${heavy_loss_points}
                            WHEN pm.result = 'loss' THEN ${loss_points}
                            ELSE 0
                        END
                    ) as points,
                    SUM(pm.goals) as goals,
                    COUNT(*) as games_played
                FROM players p
                JOIN player_matches pm ON p.player_id = pm.player_id
                JOIN matches m ON pm.match_id = m.match_id
                WHERE p.is_ringer = false
                AND EXTRACT(YEAR FROM m.match_date) < EXTRACT(YEAR FROM CURRENT_DATE) -- Exclude current year
                GROUP BY p.name, EXTRACT(YEAR FROM m.match_date)
                HAVING COUNT(*) >= ${minGamesForHonours}
            ),
            ranked_points AS (
                SELECT name, year, points, RANK() OVER (PARTITION BY year ORDER BY points DESC) as points_rank
                FROM yearly_stats
            ),
            ranked_goals AS (
                SELECT name, year, goals, RANK() OVER (PARTITION BY year ORDER BY goals DESC) as goals_rank
                FROM yearly_stats
            )
            INSERT INTO aggregated_season_honours (year, season_winners, top_scorers)
            SELECT
                year::integer,
                -- Season Winners (Points)
                (
                    SELECT jsonb_build_object(
                        'winners', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'points', points)) FILTER (WHERE points_rank = 1), '[]'::jsonb),
                        'runners_up', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'points', points)) FILTER (WHERE points_rank = 2), '[]'::jsonb),
                        'third_place', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'points', points)) FILTER (WHERE points_rank = 3), '[]'::jsonb)
                    )
                    FROM ranked_points rp_inner
                    WHERE rp_inner.year = rp_outer.year AND points_rank <= 3
                ) as season_winners,
                -- Top Scorers (Goals)
                (
                    SELECT jsonb_build_object(
                        'winners', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'goals', goals)) FILTER (WHERE goals_rank = 1), '[]'::jsonb),
                        'runners_up', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'goals', goals)) FILTER (WHERE goals_rank = 2), '[]'::jsonb),
                        'third_place', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'goals', goals)) FILTER (WHERE goals_rank = 3), '[]'::jsonb)
                    )
                    FROM ranked_goals rg_inner
                    WHERE rg_inner.year = rp_outer.year AND goals_rank <= 3
                ) as top_scorers
            FROM ranked_points rp_outer
            GROUP BY year;
        `;

        const recordsSQL = `
            WITH game_goals AS (
                SELECT
                    p.name,
                    m.match_date,
                    pm.goals,
                    m.team_a_score,
                    m.team_b_score,
                    pm.team,
                    RANK() OVER (ORDER BY pm.goals DESC) as rank
                FROM players p
                JOIN player_matches pm ON p.player_id = pm.player_id
                JOIN matches m ON pm.match_id = m.match_id
                WHERE pm.goals > 0 AND p.is_ringer = false
            ),
            biggest_victories AS (
                SELECT
                    m.match_id,
                    m.match_date,
                    m.team_a_score,
                    m.team_b_score,
                    ABS(m.team_a_score - m.team_b_score) as score_difference,
                    RANK() OVER (ORDER BY ABS(m.team_a_score - m.team_b_score) DESC, m.match_date DESC) as rank,
                    string_agg(CASE WHEN pm.team = 'A' THEN p.name || CASE WHEN pm.goals > 0 THEN ' (' || pm.goals || ')' ELSE '' END END, ', ' ORDER BY p.name) as team_a_players,
                    string_agg(CASE WHEN pm.team = 'B' THEN p.name || CASE WHEN pm.goals > 0 THEN ' (' || pm.goals || ')' ELSE '' END END, ', ' ORDER BY p.name) as team_b_players
                FROM matches m
                JOIN player_matches pm ON m.match_id = pm.match_id
                JOIN players p ON pm.player_id = p.player_id
                WHERE m.match_date IS NOT NULL
                GROUP BY m.match_id, m.match_date, m.team_a_score, m.team_b_score
            ),
            consecutive_goals AS (
                WITH player_matches_with_gaps AS (
                    SELECT
                        p.name,
                        m.match_date,
                        CASE WHEN pm.goals > 0 THEN 1 ELSE 0 END as scored,
                        LAG(CASE WHEN pm.goals > 0 THEN 1 ELSE 0 END, 1, 0) OVER (PARTITION BY p.player_id ORDER BY m.match_date) as prev_scored_flag
                    FROM players p
                    JOIN player_matches pm ON p.player_id = pm.player_id
                    JOIN matches m ON pm.match_id = m.match_id
                    WHERE p.is_ringer = false
                ),
                streak_groups AS (
                    SELECT
                        name,
                        match_date,
                        scored,
                        SUM(CASE WHEN scored = 0 THEN 1 ELSE 0 END) OVER (PARTITION BY name ORDER BY match_date) as change_group
                    FROM player_matches_with_gaps
                ),
                streaks AS (
                    SELECT
                        name,
                        COUNT(*) as streak,
                        MIN(match_date) as streak_start,
                        MAX(match_date) as streak_end,
                        RANK() OVER (ORDER BY COUNT(*) DESC) as rank
                    FROM streak_groups
                    WHERE scored = 1
                    GROUP BY name, change_group
                )
                SELECT name, streak, streak_start, streak_end, rank FROM streaks
                WHERE rank = 1
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
                    WHERE p.is_ringer = false
                ),
                gaps AS (
                    SELECT
                        name, match_date, result, match_num,
                        match_num - ROW_NUMBER() OVER (PARTITION BY name, result ORDER BY match_date) as gap_group
                    FROM numbered_matches
                ),
                streak_groups AS (
                    SELECT
                        CASE
                            WHEN result = 'win' THEN 'Win Streak'
                            WHEN result = 'loss' THEN 'Loss Streak'
                            ELSE null -- Placeholder, handled below
                        END as type,
                        name, match_date, match_num, gap_group
                    FROM gaps
                    UNION ALL
                    -- No Win Streaks (Winless)
                    SELECT 'Winless Streak' as type, name, match_date, match_num,
                        match_num - ROW_NUMBER() OVER (PARTITION BY name ORDER BY match_date) as gap_group
                    FROM numbered_matches WHERE result != 'win'
                    UNION ALL
                    -- Undefeated Streaks
                    SELECT 'Undefeated Streak' as type, name, match_date, match_num,
                        match_num - ROW_NUMBER() OVER (PARTITION BY name ORDER BY match_date) as gap_group
                    FROM numbered_matches WHERE result != 'loss'
                ),
                final_streaks AS (
                    SELECT
                        type,
                        name,
                        COUNT(*) as streak,
                        MIN(match_date) as streak_start,
                        MAX(match_date) as streak_end
                    FROM streak_groups
                    WHERE type IS NOT NULL
                    GROUP BY type, name, gap_group
                    HAVING COUNT(*) >= ${minStreakLength}
                ),
                ranked_streaks AS (
                    SELECT *, RANK() OVER (PARTITION BY type ORDER BY streak DESC) as rank
                    FROM final_streaks
                )
                SELECT type, name, streak, streak_start, streak_end FROM ranked_streaks WHERE rank = 1
            )
            INSERT INTO aggregated_records (records)
            SELECT jsonb_build_object(
                'most_goals_in_game', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'name', name,
                            'goals', goals,
                            'date', match_date::text,
                            'score', CASE
                                WHEN team = 'A' THEN team_a_score || '-' || team_b_score
                                ELSE team_b_score || '-' || team_a_score
                            END
                        )
                    ), '[]'::jsonb)
                    FROM game_goals WHERE rank = 1
                ),
                'biggest_victory', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'team_a_score', team_a_score,
                            'team_b_score', team_b_score,
                            'team_a_players', team_a_players,
                            'team_b_players', team_b_players,
                            'date', match_date::text
                            -- 'winning_team' could be added if needed
                        )
                    ), '[]'::jsonb)
                    FROM biggest_victories WHERE rank = 1
                ),
                'consecutive_goals_streak', (
                     SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'name', name,
                            'streak', streak,
                            'start_date', streak_start::text,
                            'end_date', streak_end::text
                        )
                     ), '[]'::jsonb)
                     FROM consecutive_goals WHERE rank = 1 -- Already filtered for rank 1
                ),
                'streaks', (
                    -- Create a pre-aggregated view to avoid nested aggregates
                    WITH streak_holders AS (
                        SELECT 
                            type,
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', name,
                                    'streak', streak,
                                    'start_date', streak_start::text,
                                    'end_date', streak_end::text
                                )
                            ) AS holders
                        FROM streaks
                        GROUP BY type
                    )
                    SELECT jsonb_object_agg(
                        type, 
                        jsonb_build_object('holders', holders)
                    )
                    FROM streak_holders
                )
            );
        `;

        // If a transaction client is provided, use it directly for the operations
        // Otherwise, create a transaction from the global prisma client
        if (tx) {
            // Execute operations directly with the provided transaction client
            console.log('  Calculating season honours...');
            await tx.aggregated_season_honours.deleteMany({});
            
            // Execute raw SQL operations with the transaction client
            await tx.$executeRaw(Prisma.raw(seasonHonoursSQL));
            
            console.log('  Calculating records...');
            await tx.aggregated_records.deleteMany({});
            
            await tx.$executeRaw(Prisma.raw(recordsSQL));
        } else {
            // Using $transaction for sequential raw queries ensuring atomicity
            await prisma.$transaction(async (tx) => {
                // --- 1. Calculate and Insert Season Honours --- 
                console.log('  Calculating season honours...');
                await tx.aggregated_season_honours.deleteMany({});
                
                await tx.$executeRaw(Prisma.raw(seasonHonoursSQL));
                
                // --- 2. Update Records --- 
                console.log('  Calculating records...');
                await tx.aggregated_records.deleteMany({});
                
                await tx.$executeRaw(Prisma.raw(recordsSQL));
            }, {
                timeout: 60000 // 60 second timeout for this transaction
            });
        }

        const endTime = Date.now();
        console.log(`updateSeasonHonours completed in ${endTime - startTime}ms.`);

    } catch (error) {
        console.error('Error updating season honours and records:', error);
        // If using raw SQL, Prisma might wrap the error. Log details.
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             console.error('Prisma Error Code:', error.code);
             console.error('Prisma Meta:', error.meta);
        }
        throw error;
    }
} 