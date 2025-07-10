-- sql/update_aggregated_season_honours_and_records.sql

-- Helper function (ensure created, potentially in a shared helper file)
-- CREATE OR REPLACE FUNCTION calculate_match_fantasy_points(...) ...

-- Main function combining Honours and Records
CREATE OR REPLACE FUNCTION update_aggregated_season_honours_and_records()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    -- Config variables fetched from app_config
    min_games_for_honours INT;
    min_streak_length INT;
    win_points INT;
    draw_points INT;
    loss_points INT;
    heavy_win_points INT;
    clean_sheet_win_points INT;
    heavy_clean_sheet_win_points INT;
    clean_sheet_draw_points INT;
    heavy_loss_points INT;
    hall_of_fame_limit INT;
    -- JSON object built from fetched config
    config_obj JSONB;
BEGIN
    -- Fetch config values from app_config with defaults
    RAISE NOTICE 'Fetching configuration from app_config...';
    SELECT CAST(config_value AS INT) INTO min_games_for_honours FROM app_config WHERE config_key = 'min_games_for_honours';
    min_games_for_honours := COALESCE(min_games_for_honours, 10);

    SELECT CAST(config_value AS INT) INTO min_streak_length FROM app_config WHERE config_key = 'min_streak_length';
    min_streak_length := COALESCE(min_streak_length, 3);

    SELECT CAST(config_value AS INT) INTO win_points FROM app_config WHERE config_key = 'fantasy_win_points';
    win_points := COALESCE(win_points, 20);

    SELECT CAST(config_value AS INT) INTO draw_points FROM app_config WHERE config_key = 'fantasy_draw_points';
    draw_points := COALESCE(draw_points, 10);

    SELECT CAST(config_value AS INT) INTO loss_points FROM app_config WHERE config_key = 'fantasy_loss_points';
    loss_points := COALESCE(loss_points, -10);

    SELECT CAST(config_value AS INT) INTO heavy_win_points FROM app_config WHERE config_key = 'fantasy_heavy_win_points';
    heavy_win_points := COALESCE(heavy_win_points, 30);

    SELECT CAST(config_value AS INT) INTO clean_sheet_win_points FROM app_config WHERE config_key = 'fantasy_clean_sheet_win_points';
    clean_sheet_win_points := COALESCE(clean_sheet_win_points, 30);

    SELECT CAST(config_value AS INT) INTO heavy_clean_sheet_win_points FROM app_config WHERE config_key = 'fantasy_heavy_clean_sheet_win_points';
    heavy_clean_sheet_win_points := COALESCE(heavy_clean_sheet_win_points, 40);

    SELECT CAST(config_value AS INT) INTO clean_sheet_draw_points FROM app_config WHERE config_key = 'fantasy_clean_sheet_draw_points';
    clean_sheet_draw_points := COALESCE(clean_sheet_draw_points, 20);

    SELECT CAST(config_value AS INT) INTO heavy_loss_points FROM app_config WHERE config_key = 'fantasy_heavy_loss_points';
    heavy_loss_points := COALESCE(heavy_loss_points, -20);

    SELECT CAST(config_value AS INT) INTO hall_of_fame_limit FROM app_config WHERE config_key = 'hall_of_fame_limit';
    hall_of_fame_limit := COALESCE(hall_of_fame_limit, 3); -- Default to 3 if not found

    -- Build config_obj for fantasy point calculation
    config_obj := jsonb_build_object(
        'fantasy_win_points', win_points, 'fantasy_draw_points', draw_points, 'fantasy_loss_points', loss_points,
        'fantasy_heavy_win_points', heavy_win_points, 'fantasy_heavy_loss_points', heavy_loss_points,
        'fantasy_clean_sheet_win_points', clean_sheet_win_points, 'fantasy_clean_sheet_draw_points', clean_sheet_draw_points,
        'fantasy_heavy_clean_sheet_win_points', heavy_clean_sheet_win_points
    );

    RAISE NOTICE 'Starting update_aggregated_season_honours_and_records...';
    RAISE NOTICE 'Using config: min_games_honours=%, min_streak=%, points(W/D/L)=%/%/%, hof_limit=%', min_games_for_honours, min_streak_length, win_points, draw_points, loss_points, hall_of_fame_limit;

    -- Update Honours
    RAISE NOTICE 'Updating aggregated_season_honours...';
    DELETE FROM aggregated_season_honours WHERE TRUE;
    WITH yearly_stats AS (
        SELECT p.name, EXTRACT(YEAR FROM m.match_date) as year,
               SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false))) as points,
               SUM(COALESCE(pm.goals, 0)) as goals, COUNT(*) as games_played
        FROM players p JOIN player_matches pm ON p.player_id = pm.player_id JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false AND EXTRACT(YEAR FROM m.match_date) < EXTRACT(YEAR FROM CURRENT_DATE) -- Only past years for honours
        GROUP BY p.name, EXTRACT(YEAR FROM m.match_date)
        HAVING COUNT(*) >= min_games_for_honours
    ),
    ranked_points AS ( SELECT name, year, points, RANK() OVER (PARTITION BY year ORDER BY points DESC, name) as points_rank FROM yearly_stats ),
    ranked_goals AS ( SELECT name, year, goals, RANK() OVER (PARTITION BY year ORDER BY goals DESC, name) as goals_rank FROM yearly_stats )
    INSERT INTO aggregated_season_honours (year, season_winners, top_scorers)
    SELECT year::integer,
           ( SELECT jsonb_build_object('winners', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'points', points)) FILTER (WHERE points_rank = 1), '[]'::jsonb), 'runners_up', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'points', points)) FILTER (WHERE points_rank = 2), '[]'::jsonb), 'third_place', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'points', points)) FILTER (WHERE points_rank = 3), '[]'::jsonb)) FROM ranked_points rp_inner WHERE rp_inner.year = rp_outer.year AND points_rank <= 3 ) as season_winners,
           ( SELECT jsonb_build_object('winners', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'goals', goals)) FILTER (WHERE goals_rank = 1), '[]'::jsonb), 'runners_up', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'goals', goals)) FILTER (WHERE goals_rank = 2), '[]'::jsonb), 'third_place', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'goals', goals)) FILTER (WHERE goals_rank = 3), '[]'::jsonb)) FROM ranked_goals rg_inner WHERE rg_inner.year = rp_outer.year AND goals_rank <= 3 ) as top_scorers
    FROM ranked_points rp_outer GROUP BY year;
    RAISE NOTICE 'Finished aggregated_season_honours.';

    -- Update Records
    RAISE NOTICE 'Updating aggregated_records...';
    DELETE FROM aggregated_records WHERE TRUE;
    WITH game_goals AS (
         SELECT p.name, m.match_date, pm.goals, m.team_a_score, m.team_b_score, pm.team,
         -- Use DENSE_RANK to get all tied records, ROW_NUMBER would cut off ties
         DENSE_RANK() OVER (ORDER BY pm.goals DESC, m.match_date DESC) as rnk
         FROM players p JOIN player_matches pm ON p.player_id = pm.player_id JOIN matches m ON pm.match_id = m.match_id
         WHERE pm.goals > 0 AND p.is_ringer = false
    ),
    limited_game_goals AS (
        -- Select only the top records based on hall_of_fame_limit
        SELECT name, match_date, goals, team_a_score, team_b_score, team, rnk
        FROM game_goals
        WHERE rnk = 1 -- Apply limit based on rank
    ),
    biggest_victories AS (
        SELECT m.match_id, m.match_date, m.team_a_score, m.team_b_score, ABS(m.team_a_score - m.team_b_score) as score_difference,
               DENSE_RANK() OVER (ORDER BY ABS(m.team_a_score - m.team_b_score) DESC, m.match_date DESC) as rnk,
               string_agg(CASE WHEN pm.team = 'A' THEN p.name || CASE WHEN pm.goals > 0 THEN ' (' || pm.goals || ')' ELSE '' END END, ', ' ORDER BY p.name) as team_a_players,
               string_agg(CASE WHEN pm.team = 'B' THEN p.name || CASE WHEN pm.goals > 0 THEN ' (' || pm.goals || ')' ELSE '' END END, ', ' ORDER BY p.name) as team_b_players
        FROM matches m JOIN player_matches pm ON m.match_id = pm.match_id JOIN players p ON pm.player_id = p.player_id
        WHERE m.match_date IS NOT NULL AND p.is_ringer = false
        GROUP BY m.match_id, m.match_date, m.team_a_score, m.team_b_score
    ),
    limited_biggest_victories AS (
        SELECT match_id, match_date, team_a_score, team_b_score, team_a_players, team_b_players, rnk
        FROM biggest_victories
        WHERE rnk = 1
    ),
    consecutive_goals AS (
        WITH player_matches_with_gaps AS (
            SELECT p.name, m.match_date, CASE WHEN COALESCE(pm.goals, 0) > 0 THEN 1 ELSE 0 END as scored
            FROM players p JOIN player_matches pm ON p.player_id = pm.player_id JOIN matches m ON pm.match_id = m.match_id
            WHERE p.is_ringer = false
        ), streak_groups AS (
            SELECT name, match_date, scored,
                   SUM(CASE WHEN scored = 0 THEN 1 ELSE 0 END) OVER (PARTITION BY name ORDER BY match_date) as change_group
            FROM player_matches_with_gaps
        ), streaks AS (
            SELECT name, COUNT(*) as streak, MIN(match_date) as streak_start, MAX(match_date) as streak_end,
                   DENSE_RANK() OVER (ORDER BY COUNT(*) DESC, MAX(match_date) DESC) as rnk
            FROM streak_groups WHERE scored = 1 GROUP BY name, change_group
        )
        SELECT name, streak, streak_start, streak_end
        FROM streaks
        WHERE rnk = 1 -- Apply limit
    ),
    attendance_streaks AS (
        WITH player_game_sequences AS (
            SELECT 
                p.name, 
                p.player_id,
                m.match_date,
                LAG(m.match_date) OVER (PARTITION BY p.player_id ORDER BY m.match_date) as prev_match_date,
                ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date) as game_number
            FROM players p 
            JOIN player_matches pm ON p.player_id = pm.player_id 
            JOIN matches m ON pm.match_id = m.match_id
            WHERE p.is_ringer = false
            ORDER BY p.player_id, m.match_date
        ),
        streak_groups AS (
            SELECT 
                name,
                player_id,
                match_date,
                game_number,
                SUM(CASE WHEN prev_match_date IS NULL OR game_number = 1 THEN 1 ELSE 0 END) 
                OVER (PARTITION BY player_id ORDER BY match_date ROWS UNBOUNDED PRECEDING) as streak_group
            FROM player_game_sequences
        ),
        streak_calculations AS (
            SELECT 
                name,
                streak_group,
                COUNT(*) as streak_length,
                MIN(match_date) as streak_start,
                MAX(match_date) as streak_end,
                DENSE_RANK() OVER (ORDER BY COUNT(*) DESC, MAX(match_date) DESC) as rnk
            FROM streak_groups
            GROUP BY name, player_id, streak_group
            HAVING COUNT(*) >= min_streak_length
        )
        SELECT name, streak_length as streak, streak_start, streak_end
        FROM streak_calculations 
        WHERE rnk = 1
    ),
    streaks AS (
        WITH numbered_matches AS (
            SELECT p.name, m.match_date, pm.result, ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date) as match_num
            FROM players p JOIN player_matches pm ON p.player_id = pm.player_id JOIN matches m ON pm.match_id = m.match_id
            WHERE p.is_ringer = false
        ), gaps AS (
            SELECT name, match_date, result, match_num,
                   match_num - ROW_NUMBER() OVER (PARTITION BY name, result ORDER BY match_date) as gap_group
            FROM numbered_matches
        ), result_streak_groups AS ( -- Renamed to avoid conflict
            SELECT CASE WHEN result = 'win' THEN 'Win Streak' WHEN result = 'loss' THEN 'Losing Streak' ELSE null END as type,
                   name, match_date, match_num, gap_group
            FROM gaps WHERE result IN ('win', 'loss')
            UNION ALL
            SELECT 'Winless Streak' as type, name, match_date, match_num,
                   match_num - ROW_NUMBER() OVER (PARTITION BY name ORDER BY match_date) as gap_group
            FROM numbered_matches WHERE result != 'win'
            UNION ALL
            SELECT 'Undefeated Streak' as type, name, match_date, match_num,
                   match_num - ROW_NUMBER() OVER (PARTITION BY name ORDER BY match_date) as gap_group
            FROM numbered_matches WHERE result != 'loss'
        ), final_streaks AS (
            SELECT type, name, COUNT(*) as streak, MIN(match_date) as streak_start, MAX(match_date) as streak_end
            FROM result_streak_groups WHERE type IS NOT NULL
            GROUP BY type, name, gap_group
        ), ranked_streaks AS (
            SELECT type, name, streak, streak_start, streak_end,
                   DENSE_RANK() OVER (PARTITION BY type ORDER BY streak DESC, streak_end DESC) as rnk
            FROM final_streaks
        )
        SELECT type, name, streak, streak_start, streak_end
        FROM ranked_streaks
        WHERE rnk = 1 -- Apply limit per streak type
    )
    INSERT INTO aggregated_records (records)
    SELECT jsonb_build_object(
        'most_goals_in_game', (
            -- Use limited_game_goals which already has the limit applied for rnk=1
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object('name', name, 'goals', goals, 'date', match_date::text, 'score', CASE WHEN team = 'A' THEN team_a_score || '-' || team_b_score ELSE team_b_score || '-' || team_a_score END)
                ORDER BY name ASC -- Order by name for consistency in the aggregated array
            ), '[]'::jsonb)
            FROM (
                SELECT *, ROW_NUMBER() OVER (ORDER BY name ASC) as row_num -- Tie-break rank 1s by name
                FROM limited_game_goals -- This CTE is already filtered to rnk = 1
            ) AS sub_limited_game_goals
            WHERE sub_limited_game_goals.row_num <= hall_of_fame_limit
        ),
        'biggest_victory', (
            -- Use limited_biggest_victories which already has the limit applied for rnk=1
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object('team_a_score', team_a_score, 'team_b_score', team_b_score, 'team_a_players', team_a_players, 'team_b_players', team_b_players, 'date', match_date::text)
                ORDER BY match_date DESC, match_id ASC -- Order for final JSON array
            ), '[]'::jsonb)
            FROM (
                SELECT *, ROW_NUMBER() OVER (ORDER BY match_id ASC) as row_num -- Tie-break rank 1s by match_id
                FROM limited_biggest_victories -- This CTE is already filtered to rnk = 1
            ) AS sub_limited_biggest_victories
            WHERE sub_limited_biggest_victories.row_num <= hall_of_fame_limit
        ),
        'consecutive_goals_streak', (
            -- Use consecutive_goals which already has the limit applied for rnk=1
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object('name', name, 'streak', streak, 'start_date', streak_start::text, 'end_date', streak_end::text)
                ORDER BY streak DESC, streak_end DESC, name ASC -- Order for final JSON array
            ), '[]'::jsonb)
            FROM (
                SELECT *, ROW_NUMBER() OVER (ORDER BY streak DESC, streak_end DESC, name ASC) as row_num -- Tie-break rank 1s
                FROM consecutive_goals -- This CTE is already filtered to rnk = 1 implicitly
            ) AS sub_consecutive_goals
            WHERE sub_consecutive_goals.row_num <= hall_of_fame_limit
        ),
        'streaks', (
            -- Use streaks which already has the limit applied per type for rnk=1
            WITH streak_holders AS (
                SELECT type,
                       jsonb_agg(jsonb_build_object('name', name, 'streak', streak, 'start_date', streak_start::text, 'end_date', streak_end::text) ORDER BY streak DESC, streak_end DESC, name ASC) AS holders
                FROM (
                    SELECT s_inner.*,
                           ROW_NUMBER() OVER (PARTITION BY type ORDER BY streak DESC, streak_end DESC, name ASC) as rn_for_limit
                    FROM streaks s_inner -- this 'streaks' CTE is already WHERE rnk = 1 per type
                ) s_limited
                WHERE s_limited.rn_for_limit <= hall_of_fame_limit
                GROUP BY type
            )
            SELECT COALESCE(jsonb_object_agg(type, jsonb_build_object('holders', holders)), '{}'::jsonb)
            FROM streak_holders
        ),
        'attendance_streak', (
            -- Use attendance_streaks which already has the limit applied for rnk=1
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object('name', name, 'streak', streak, 'start_date', streak_start::text, 'end_date', streak_end::text)
                ORDER BY streak DESC, streak_end DESC, name ASC -- Order for final JSON array
            ), '[]'::jsonb)
            FROM (
                SELECT *, ROW_NUMBER() OVER (ORDER BY streak DESC, streak_end DESC, name ASC) as row_num -- Tie-break rank 1s
                FROM attendance_streaks -- This CTE is already filtered to rnk = 1
            ) AS sub_attendance_streaks
            WHERE sub_attendance_streaks.row_num <= hall_of_fame_limit
        )
    );
    RAISE NOTICE 'Finished aggregated_records.';

    -- Update Cache Metadata for records
    RAISE NOTICE 'Updating cache metadata for records...';
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('records', NOW(), 'records')
    ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();

    RAISE NOTICE 'update_aggregated_season_honours_and_records completed.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_aggregated_season_honours_and_records: %', SQLERRM;
END;
$$; 