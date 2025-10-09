-- sql/update_aggregated_season_honours_and_records.sql

-- Helper function (ensure created, potentially in a shared helper file)
-- CREATE OR REPLACE FUNCTION calculate_match_fantasy_points(...) ...

-- Main function combining Honours and Records
CREATE OR REPLACE FUNCTION update_aggregated_season_honours_and_records(target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID)
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
    -- Phase 2: Set RLS context for this function (required for prisma_app role)
    PERFORM set_config('app.tenant_id', target_tenant_id::text, false);
    
    -- Fetch config values from app_config with defaults
    RAISE NOTICE 'Fetching configuration from app_config...';
    SELECT CAST(config_value AS INT) INTO min_games_for_honours FROM app_config WHERE config_key = 'min_games_for_honours' AND tenant_id = target_tenant_id;
    min_games_for_honours := COALESCE(min_games_for_honours, 10);

    SELECT CAST(config_value AS INT) INTO min_streak_length FROM app_config WHERE config_key = 'min_streak_length' AND tenant_id = target_tenant_id;
    min_streak_length := COALESCE(min_streak_length, 3);

    SELECT CAST(config_value AS INT) INTO win_points FROM app_config WHERE config_key = 'fantasy_win_points' AND tenant_id = target_tenant_id;
    win_points := COALESCE(win_points, 20);

    SELECT CAST(config_value AS INT) INTO draw_points FROM app_config WHERE config_key = 'fantasy_draw_points' AND tenant_id = target_tenant_id;
    draw_points := COALESCE(draw_points, 10);

    SELECT CAST(config_value AS INT) INTO loss_points FROM app_config WHERE config_key = 'fantasy_loss_points' AND tenant_id = target_tenant_id;
    loss_points := COALESCE(loss_points, -10);

    SELECT CAST(config_value AS INT) INTO heavy_win_points FROM app_config WHERE config_key = 'fantasy_heavy_win_points' AND tenant_id = target_tenant_id;
    heavy_win_points := COALESCE(heavy_win_points, 30);

    SELECT CAST(config_value AS INT) INTO clean_sheet_win_points FROM app_config WHERE config_key = 'fantasy_clean_sheet_win_points' AND tenant_id = target_tenant_id;
    clean_sheet_win_points := COALESCE(clean_sheet_win_points, 30);

    SELECT CAST(config_value AS INT) INTO heavy_clean_sheet_win_points FROM app_config WHERE config_key = 'fantasy_heavy_clean_sheet_win_points' AND tenant_id = target_tenant_id;
    heavy_clean_sheet_win_points := COALESCE(heavy_clean_sheet_win_points, 40);

    SELECT CAST(config_value AS INT) INTO clean_sheet_draw_points FROM app_config WHERE config_key = 'fantasy_clean_sheet_draw_points' AND tenant_id = target_tenant_id;
    clean_sheet_draw_points := COALESCE(clean_sheet_draw_points, 20);

    SELECT CAST(config_value AS INT) INTO heavy_loss_points FROM app_config WHERE config_key = 'fantasy_heavy_loss_points' AND tenant_id = target_tenant_id;
    heavy_loss_points := COALESCE(heavy_loss_points, -20);

    SELECT CAST(config_value AS INT) INTO hall_of_fame_limit FROM app_config WHERE config_key = 'hall_of_fame_limit' AND tenant_id = target_tenant_id;
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
    DELETE FROM aggregated_season_honours WHERE tenant_id = target_tenant_id;
    WITH season_stats AS (
        SELECT p.name, s.id as season_id, get_season_display_name(s.start_date, s.end_date) as season_name,
               SUM(calculate_match_fantasy_points(
                   COALESCE(mps.result, 'loss'), 
                   mps.goal_difference,  -- Use pre-calculated value from view
                   COALESCE(mps.clean_sheet, false),
                   COALESCE(mps.goals, 0),  -- goals_scored
                   target_tenant_id
               )) as points,
               SUM(COALESCE(mps.goals, 0)) as goals, COUNT(*) as games_played
        FROM players p 
        JOIN match_player_stats mps ON p.player_id = mps.player_id  -- Use view instead of separate joins
        JOIN seasons s ON mps.match_date BETWEEN s.start_date AND s.end_date
        WHERE p.tenant_id = target_tenant_id AND mps.tenant_id = target_tenant_id AND s.tenant_id = target_tenant_id
        AND p.is_ringer = false AND s.end_date < CURRENT_DATE -- Only past seasons for honours
        GROUP BY p.name, s.id, s.start_date, s.end_date
        HAVING COUNT(*) >= min_games_for_honours
    ),
    ranked_points AS ( SELECT name, season_id, season_name, points, RANK() OVER (PARTITION BY season_id ORDER BY points DESC, name) as points_rank FROM season_stats ),
    ranked_goals AS ( SELECT name, season_id, season_name, goals, RANK() OVER (PARTITION BY season_id ORDER BY goals DESC, name) as goals_rank FROM season_stats )
    INSERT INTO aggregated_season_honours (season_id, tenant_id, season_name, season_winners, top_scorers)
    SELECT season_id,
           target_tenant_id,
           season_name,
           ( SELECT jsonb_build_object('winners', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'points', points)) FILTER (WHERE points_rank = 1), '[]'::jsonb), 'runners_up', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'points', points)) FILTER (WHERE points_rank = 2), '[]'::jsonb), 'third_place', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'points', points)) FILTER (WHERE points_rank = 3), '[]'::jsonb)) FROM ranked_points rp_inner WHERE rp_inner.season_id = rp_outer.season_id AND points_rank <= 3 ) as season_winners,
           ( SELECT jsonb_build_object('winners', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'goals', goals)) FILTER (WHERE goals_rank = 1), '[]'::jsonb), 'runners_up', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'goals', goals)) FILTER (WHERE goals_rank = 2), '[]'::jsonb), 'third_place', COALESCE(jsonb_agg(jsonb_build_object('name', name, 'goals', goals)) FILTER (WHERE goals_rank = 3), '[]'::jsonb)) FROM ranked_goals rg_inner WHERE rg_inner.season_id = rp_outer.season_id AND goals_rank <= 3 ) as top_scorers
    FROM ranked_points rp_outer GROUP BY season_id, season_name;
    RAISE NOTICE 'Finished aggregated_season_honours.';

    -- Update Records
    RAISE NOTICE 'Updating aggregated_records...';
    DELETE FROM aggregated_records WHERE tenant_id = target_tenant_id;
    WITH game_goals AS (
         SELECT p.name, m.match_date, pm.goals, m.team_a_score, m.team_b_score, pm.team,
         -- Use DENSE_RANK to get all tied records, ROW_NUMBER would cut off ties
         DENSE_RANK() OVER (ORDER BY pm.goals DESC, m.match_date DESC) as rnk
         FROM players p JOIN player_matches pm ON p.player_id = pm.player_id JOIN matches m ON pm.match_id = m.match_id
         WHERE p.tenant_id = target_tenant_id AND pm.tenant_id = target_tenant_id AND m.tenant_id = target_tenant_id
         AND pm.goals > 0 AND p.is_ringer = false
    ),
    limited_game_goals AS (
        -- Select only the top records based on rank (all tied first place records)
        SELECT name, match_date, goals, team_a_score, team_b_score, team, rnk
        FROM game_goals
        WHERE rnk = 1 -- Get all joint record holders
    ),
    biggest_victories AS (
        SELECT m.match_id, m.match_date, m.team_a_score, m.team_b_score, ABS(m.team_a_score - m.team_b_score) as score_difference,
               DENSE_RANK() OVER (ORDER BY ABS(m.team_a_score - m.team_b_score) DESC, m.match_date DESC) as rnk,
               string_agg(CASE WHEN pm.team = 'A' THEN p.name || CASE WHEN pm.goals > 0 THEN ' (' || pm.goals || ')' ELSE '' END END, ', ' ORDER BY p.name) as team_a_players,
               string_agg(CASE WHEN pm.team = 'B' THEN p.name || CASE WHEN pm.goals > 0 THEN ' (' || pm.goals || ')' ELSE '' END END, ', ' ORDER BY p.name) as team_b_players
        FROM matches m JOIN player_matches pm ON m.match_id = pm.match_id JOIN players p ON pm.player_id = p.player_id
        WHERE m.tenant_id = target_tenant_id AND pm.tenant_id = target_tenant_id AND p.tenant_id = target_tenant_id
        AND m.match_date IS NOT NULL AND p.is_ringer = false
        GROUP BY m.match_id, m.match_date, m.team_a_score, m.team_b_score
    ),
    limited_biggest_victories AS (
        SELECT match_id, match_date, team_a_score, team_b_score, team_a_players, team_b_players, rnk
        FROM biggest_victories
        WHERE rnk = 1 -- Get all joint record holders
    ),
    consecutive_goals AS (
        WITH player_matches_with_gaps AS (
            SELECT p.name, m.match_date, CASE WHEN COALESCE(pm.goals, 0) > 0 THEN 1 ELSE 0 END as scored
            FROM players p JOIN player_matches pm ON p.player_id = pm.player_id JOIN matches m ON pm.match_id = m.match_id
            WHERE p.tenant_id = target_tenant_id AND pm.tenant_id = target_tenant_id AND m.tenant_id = target_tenant_id AND p.is_ringer = false
        ), streak_groups AS (
            SELECT name, match_date, scored,
                   SUM(CASE WHEN scored = 0 THEN 1 ELSE 0 END) OVER (PARTITION BY name ORDER BY match_date) as change_group
            FROM player_matches_with_gaps
        ), streaks AS (
            SELECT name, COUNT(*) as streak, MIN(match_date) as streak_start, MAX(match_date) as streak_end,
                   DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) as rnk
            FROM streak_groups WHERE scored = 1 GROUP BY name, change_group
        )
        SELECT name, streak, streak_start, streak_end
        FROM streaks
        WHERE rnk = 1 -- Get all joint record holders
    ),
    attendance_streaks AS (
        -- FIXED: Calculate ALL-TIME maximum attendance streaks (not just current ones)
        WITH all_matches AS (
            SELECT match_id, match_date, 
                   ROW_NUMBER() OVER (ORDER BY match_date, match_id) as match_sequence
            FROM matches
            WHERE tenant_id = target_tenant_id
        ),
        player_attendance AS (
            SELECT 
                p.player_id, 
                p.name,
                am.match_id,
                am.match_date,
                am.match_sequence,
                (pm.player_id IS NOT NULL) as attended
            FROM players p
            CROSS JOIN all_matches am
            LEFT JOIN player_matches pm ON p.player_id = pm.player_id AND am.match_id = pm.match_id AND pm.tenant_id = target_tenant_id
            WHERE p.tenant_id = target_tenant_id AND p.is_ringer = false
        ),
        attendance_groups AS (
            SELECT 
                player_id, 
                name, 
                match_sequence, 
                match_date,
                attended,
                -- Create groups: when attendance changes, start a new group
                match_sequence - ROW_NUMBER() OVER (
                    PARTITION BY player_id, attended 
                    ORDER BY match_sequence
                ) as attendance_group
            FROM player_attendance
        ),
        attendance_streaks_calc AS (
            SELECT 
                player_id,
                name,
                COUNT(*) as streak_length,
                MIN(match_date) as streak_start,
                MAX(match_date) as streak_end
            FROM attendance_groups
            WHERE attended = true  -- Only count consecutive attended matches
            GROUP BY player_id, name, attendance_group
        ),
        -- Get the MAXIMUM attendance streak for each player (all-time record)
        max_attendance_streaks AS (
            SELECT 
                player_id,
                name,
                streak_length,
                streak_start,
                streak_end,
                ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY streak_length DESC, streak_end DESC) as rn
            FROM attendance_streaks_calc
            WHERE streak_length >= min_streak_length
        ),
        ranked_max_streaks AS (
            SELECT 
                name,
                streak_length as streak,
                streak_start,
                streak_end,
                DENSE_RANK() OVER (ORDER BY streak_length DESC) as rnk
            FROM max_attendance_streaks
            WHERE rn = 1 -- Only the maximum streak per player
        )
        SELECT name, streak, streak_start, streak_end
        FROM ranked_max_streaks 
        WHERE rnk = 1 -- Get all joint record holders
    ),
    streaks AS (
        WITH numbered_matches AS (
            SELECT p.name, m.match_date, pm.result, ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date) as match_num
            FROM players p JOIN player_matches pm ON p.player_id = pm.player_id JOIN matches m ON pm.match_id = m.match_id
            WHERE p.tenant_id = target_tenant_id AND pm.tenant_id = target_tenant_id AND m.tenant_id = target_tenant_id AND p.is_ringer = false
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
                   DENSE_RANK() OVER (PARTITION BY type ORDER BY streak DESC) as rnk
            FROM final_streaks
        )
        SELECT type, name, streak, streak_start, streak_end
        FROM ranked_streaks
        WHERE rnk = 1 -- Get all joint record holders per streak type
    )
    INSERT INTO aggregated_records (tenant_id, records)
    VALUES (target_tenant_id, (
    SELECT jsonb_build_object(
        'most_goals_in_game', (
            -- Include ALL joint record holders
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object('name', name, 'goals', goals, 'date', match_date::text, 'score', CASE WHEN team = 'A' THEN team_a_score || '-' || team_b_score ELSE team_b_score || '-' || team_a_score END)
                ORDER BY goals DESC, match_date DESC, name ASC
            ), '[]'::jsonb)
            FROM limited_game_goals
        ),
        'biggest_victory', (
            -- Include ALL joint record holders
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object('team_a_score', team_a_score, 'team_b_score', team_b_score, 'team_a_players', team_a_players, 'team_b_players', team_b_players, 'date', match_date::text)
                ORDER BY match_date DESC, match_id ASC
            ), '[]'::jsonb)
            FROM limited_biggest_victories
        ),
        'consecutive_goals_streak', (
            -- Include ALL joint record holders
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object('name', name, 'streak', streak, 'start_date', streak_start::text, 'end_date', streak_end::text)
                ORDER BY streak DESC, streak_end DESC, name ASC
            ), '[]'::jsonb)
            FROM consecutive_goals
        ),
        'streaks', (
            -- Include ALL joint record holders per type
            WITH streak_holders AS (
                SELECT type,
                       jsonb_agg(jsonb_build_object('name', name, 'streak', streak, 'start_date', streak_start::text, 'end_date', streak_end::text) ORDER BY streak DESC, streak_end DESC, name ASC) AS holders
                FROM streaks
                GROUP BY type
            )
            SELECT COALESCE(jsonb_object_agg(type, jsonb_build_object('holders', holders)), '{}'::jsonb)
            FROM streak_holders
        ),
        'attendance_streak', (
            -- Include ALL joint record holders
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object('name', name, 'streak', streak, 'start_date', streak_start::text, 'end_date', streak_end::text)
                ORDER BY streak DESC, streak_end DESC, name ASC
            ), '[]'::jsonb)
            FROM attendance_streaks
        )
    )));
    RAISE NOTICE 'Finished aggregated_records.';

    -- Update Cache Metadata for honour_roll
    RAISE NOTICE 'Updating cache metadata for honour_roll...';
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type, tenant_id)
    VALUES ('honour_roll', NOW(), 'honour_roll', target_tenant_id)
    ON CONFLICT (cache_key, tenant_id) DO UPDATE SET last_invalidated = NOW();

    RAISE NOTICE 'update_aggregated_season_honours_and_records completed.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_aggregated_season_honours_and_records: %', SQLERRM;
END;
$$; 