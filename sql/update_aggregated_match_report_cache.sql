-- sql/update_aggregated_match_report_cache.sql

-- Helper function calculate_match_fantasy_points is defined in sql/helpers.sql

CREATE OR REPLACE FUNCTION update_aggregated_match_report_cache()
-- No config_json parameter needed
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    latest_match RECORD;
    team_a_players_json JSONB;
    team_b_players_json JSONB;
    team_a_scorers TEXT;
    team_b_scorers TEXT;
    game_milestones_json JSONB := '[]'::jsonb;
    goal_milestones_json JSONB := '[]'::jsonb;
    v_season_goal_leaders JSONB;        -- Added for direct assignment
    v_season_fantasy_leaders JSONB;   -- Added for direct assignment
    v_half_season_goal_leaders JSONB;   -- Added for direct assignment
    v_half_season_fantasy_leaders JSONB; -- Added for direct assignment
    v_on_fire_player_id INT;            -- NEW: For On Fire player
    v_grim_reaper_player_id INT;        -- NEW: For Grim Reaper player
    player_ids_in_match INT[];
    player_names_json JSONB := '{}'::jsonb;
    milestone_game_threshold INT;
    milestone_goal_threshold INT;
    target_date DATE;
    half_season_start DATE;
    half_season_end DATE;
    v_window_days INT;                  -- NEW: For configurable window
    v_min_games INT;                    -- NEW: For configurable minimum games
    -- NEW: Feat-breaking detection config variables
    v_win_streak_threshold INT;
    v_unbeaten_streak_threshold INT;
    v_loss_streak_threshold INT;
    v_winless_streak_threshold INT;
    v_goal_streak_threshold INT;
    hall_of_fame_limit INT;
    -- NEW: Variables for storing calculated streaks
    v_streaks_json JSONB := '[]'::jsonb;
    v_goal_streaks_json JSONB := '[]'::jsonb;
BEGIN
    -- Removed the temporary debug notices and RETURN
    RAISE NOTICE 'Starting update_aggregated_match_report_cache...';
    
    -- Fetch config values
    milestone_game_threshold := get_config_value('game_milestone_threshold', '50')::int;
    milestone_goal_threshold := get_config_value('goal_milestone_threshold', '25')::int;
    
    -- NEW: Fetch feat-breaking detection config (using existing config keys)
    v_win_streak_threshold := get_config_value('win_streak_threshold', '4')::int;
    v_unbeaten_streak_threshold := get_config_value('unbeaten_streak_threshold', '6')::int;
    v_loss_streak_threshold := get_config_value('loss_streak_threshold', '4')::int;
    v_winless_streak_threshold := get_config_value('winless_streak_threshold', '6')::int;
    v_goal_streak_threshold := get_config_value('goal_streak_threshold', '3')::int;
    hall_of_fame_limit := get_config_value('hall_of_fame_limit', '3')::int;
    
    -- NEW: Get On Fire/Grim Reaper config values with fallbacks
    BEGIN
        v_window_days := get_config_value('on_fire_grim_reaper_window_days', '45')::int;
        IF v_window_days < 1 THEN
            v_window_days := 45; -- Fallback if invalid
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_window_days := 45; -- Fallback on any error
    END;

    BEGIN
        v_min_games := get_config_value('on_fire_grim_reaper_min_games', '4')::int;
        IF v_min_games < 1 THEN
            v_min_games := 4; -- Fallback if invalid
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_min_games := 4; -- Fallback on any error
    END;
    
    RAISE NOTICE 'Using config: game_milestone=%, goal_milestone=%, window_days=%, min_games=%', 
        milestone_game_threshold, milestone_goal_threshold, v_window_days, v_min_games;

    -- 1. Get Latest Match
    SELECT * INTO latest_match
    FROM matches ORDER BY match_date DESC, match_id DESC LIMIT 1;
    
    IF latest_match.match_id IS NULL THEN
        RAISE EXCEPTION 'No matches found in the database';
    END IF;
    
    RAISE NOTICE 'Processing latest match ID: %, Date: %', latest_match.match_id, latest_match.match_date;
    target_date := latest_match.match_date::date; -- Ensure target_date is DATE

    -- 2. Calculate On Fire and Grim Reaper Players
    RAISE NOTICE 'Calculating On Fire and Grim Reaper players...';
    WITH recent_matches AS (
        -- Get all matches from the configurable window
        SELECT 
            m.match_id,
            m.match_date,
            m.team_a_score,
            m.team_b_score,
            pm.player_id,
            p.name AS player_name,
            pm.team,
            pm.goals,
            pm.result,
            pm.heavy_win,
            pm.heavy_loss,
            pm.clean_sheet,
            calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false)) AS fantasy_points
        FROM matches m
        JOIN player_matches pm ON m.match_id = pm.match_id
        JOIN players p ON pm.player_id = p.player_id
        WHERE m.match_date::date >= (target_date::date - (v_window_days || ' days')::interval)::date
        AND m.match_date::date <= target_date::date
        AND p.is_ringer = false 
        AND p.is_ringer = false
    ),
    player_recent_stats AS (
        -- Calculate stats for each player's matches in the window
        SELECT
            player_id,
            player_name,
            COUNT(*) as matches_played,
            SUM(fantasy_points) as total_fantasy_points,
            SUM(goals) as total_goals_scored,
            SUM(CASE 
                WHEN team = 'A' THEN team_b_score
                WHEN team = 'B' THEN team_a_score
                ELSE 0
            END) as total_goals_conceded,
            SUM(CASE WHEN clean_sheet THEN 1 ELSE 0 END) as total_clean_sheets,
            SUM(CASE WHEN heavy_win THEN 1 ELSE 0 END) as total_heavy_wins,
            SUM(CASE WHEN heavy_loss THEN 1 ELSE 0 END) as total_heavy_losses
        FROM recent_matches
        GROUP BY player_id, player_name
        HAVING COUNT(*) >= v_min_games    -- Must have played minimum required matches
    )
    SELECT 
        -- First try to get the On Fire player
        COALESCE(
            (SELECT player_id
            FROM player_recent_stats
            ORDER BY
                total_fantasy_points DESC,     -- Total points as primary sort
                total_goals_scored DESC,
                total_goals_conceded ASC,
                total_clean_sheets DESC,
                total_heavy_wins DESC,
                total_heavy_losses ASC,
                player_name ASC
            LIMIT 1),
            NULL
        ),
        -- Then try to get the Grim Reaper player
        COALESCE(
            (SELECT player_id
            FROM player_recent_stats
            ORDER BY
                total_fantasy_points ASC,      -- Total points as primary sort
                total_goals_scored ASC,
                total_goals_conceded DESC,
                total_clean_sheets ASC,
                total_heavy_wins ASC,
                total_heavy_losses DESC,
                player_name ASC
            LIMIT 1),
            NULL
        )
    INTO v_on_fire_player_id, v_grim_reaper_player_id;

    RAISE NOTICE 'On Fire Player ID: %, Grim Reaper Player ID: %', v_on_fire_player_id, v_grim_reaper_player_id;

    -- 3. Get Match Participants & Details
    SELECT
        -- Team A players with conditional own goals entry
        CASE 
            WHEN COALESCE(latest_match.team_a_own_goals, 0) > 0 THEN
                COALESCE(jsonb_agg(p.name ORDER BY p.name) FILTER (WHERE pm.team = 'A'), '[]'::jsonb) || 
                jsonb_build_array('OG (' || latest_match.team_a_own_goals || ')')
            ELSE
                COALESCE(jsonb_agg(p.name ORDER BY p.name) FILTER (WHERE pm.team = 'A'), '[]'::jsonb)
        END,
        -- Team B players with conditional own goals entry  
        CASE 
            WHEN COALESCE(latest_match.team_b_own_goals, 0) > 0 THEN
                COALESCE(jsonb_agg(p.name ORDER BY p.name) FILTER (WHERE pm.team = 'B'), '[]'::jsonb) || 
                jsonb_build_array('OG (' || latest_match.team_b_own_goals || ')')
            ELSE
                COALESCE(jsonb_agg(p.name ORDER BY p.name) FILTER (WHERE pm.team = 'B'), '[]'::jsonb)
        END,
        COALESCE(string_agg(CASE WHEN pm.team = 'A' AND pm.goals > 0 THEN p.name || CASE WHEN pm.goals > 1 THEN ' (' || pm.goals || ')' ELSE '' END END, ', ' ORDER BY p.name), ''),
        COALESCE(string_agg(CASE WHEN pm.team = 'B' AND pm.goals > 0 THEN p.name || CASE WHEN pm.goals > 1 THEN ' (' || pm.goals || ')' ELSE '' END END, ', ' ORDER BY p.name), ''),
        array_agg(pm.player_id) FILTER (WHERE p.is_ringer = false AND p.is_ringer = false), -- Filter out ringers/retired here
        COALESCE(jsonb_object_agg(pm.player_id::text, p.name), '{}'::jsonb)
    INTO
        team_a_players_json, team_b_players_json,
        team_a_scorers, team_b_scorers,
        player_ids_in_match, player_names_json
    FROM player_matches pm
    JOIN players p ON pm.player_id = p.player_id
    WHERE pm.match_id = latest_match.match_id;

    -- Exit if no non-ringer/non-retired players in the match
    IF player_ids_in_match IS NULL OR array_length(player_ids_in_match, 1) = 0 THEN
        RAISE NOTICE 'No regular players found in the latest match. Skipping streak/leader calculations.';
        -- Still need to update the basic match report info
        DELETE FROM aggregated_match_report WHERE TRUE; -- Keep WHERE TRUE fix
        INSERT INTO aggregated_match_report (
            match_id, match_date, team_a_score, team_b_score,
            team_a_players, team_b_players, team_a_scorers, team_b_scorers,
            config_values, game_milestones, goal_milestones,
            half_season_goal_leaders, half_season_fantasy_leaders,
            season_goal_leaders, season_fantasy_leaders,
            on_fire_player_id, grim_reaper_player_id, -- NEW
            last_updated
        ) VALUES (
            latest_match.match_id, latest_match.match_date, latest_match.team_a_score, latest_match.team_b_score,
            team_a_players_json, team_b_players_json, team_a_scorers, team_b_scorers,
            jsonb_build_object(
                'game_milestone_threshold', milestone_game_threshold,
                'goal_milestone_threshold', milestone_goal_threshold
            ),
            '[]'::jsonb, '[]'::jsonb, -- Default empty values
            '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
            v_on_fire_player_id, v_grim_reaper_player_id, -- NEW
            NOW()
        );
        -- Update Cache Metadata
        INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
        VALUES ('match_report', NOW(), 'match_report')
        ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();
        RAISE NOTICE 'update_aggregated_match_report_cache completed (basic info only).';
        RETURN;
    END IF;

    -- 4. Calculate Milestones (for players in the match)
    RAISE NOTICE 'Calculating milestones...';
    WITH player_totals_base AS ( -- Renamed original CTE
        SELECT player_id, COUNT(*) as total_games, SUM(COALESCE(goals, 0)) as total_goals
        FROM player_matches WHERE player_id = ANY(player_ids_in_match) GROUP BY player_id
    ),
    latest_match_goals AS (
         SELECT player_id, COALESCE(goals, 0) as goals_in_latest_match
         FROM player_matches
         WHERE match_id = latest_match.match_id AND player_id = ANY(player_ids_in_match)
    ),
    player_totals AS ( -- Combine base totals with latest match goals
        SELECT
            ptb.player_id,
            ptb.total_games,
            ptb.total_goals, -- This is total_goals_after
            COALESCE(lmg.goals_in_latest_match, 0) as goals_in_latest_match,
            (ptb.total_goals - COALESCE(lmg.goals_in_latest_match, 0)) as total_goals_before
        FROM player_totals_base ptb
        LEFT JOIN latest_match_goals lmg ON ptb.player_id = lmg.player_id
    )
    SELECT
        -- Game milestones logic updated to check if threshold was crossed
        COALESCE(jsonb_agg(jsonb_build_object('name', player_names_json->>pt.player_id::text, 'value', pt.total_games))
                 FILTER (
                    WHERE pt.total_games > 0 -- Must have played games
                    AND milestone_game_threshold > 0 -- Avoid division by zero
                    AND floor(pt.total_games / milestone_game_threshold) > floor((pt.total_games - 1) / milestone_game_threshold)
                 ), '[]'::jsonb),
        -- Goal milestones logic updated to check if threshold was crossed
        COALESCE(jsonb_agg(jsonb_build_object('name', player_names_json->>pt.player_id::text, 'value', (floor(pt.total_goals / milestone_goal_threshold) * milestone_goal_threshold)))
                 FILTER (
                    WHERE pt.total_goals > 0 -- Must have scored goals overall
                    AND pt.goals_in_latest_match > 0 -- Must have scored in the latest match to cross threshold
                    AND milestone_goal_threshold > 0 -- Avoid division by zero if config is bad
                    AND floor(pt.total_goals / milestone_goal_threshold) > floor(pt.total_goals_before / milestone_goal_threshold)
                 ), '[]'::jsonb)
    INTO game_milestones_json, goal_milestones_json FROM player_totals pt;

    -- 5. Calculate Leaders
    RAISE NOTICE 'Calculating leaders...';
    half_season_start := get_current_half_season_start_date();
    half_season_end := get_current_half_season_end_date();

    -- Leader Calculation CTEs (rest of the original function logic is assumed here)
    -- ... (all the CTEs for match_stats, season_stats, half_season_stats etc.) ...
    WITH match_stats AS (
        SELECT
            p.name,
            m.match_id,
            m.match_date,
            pm.goals,
            pm.result,
            pm.clean_sheet,
            pm.heavy_win,
            pm.heavy_loss,
            pm.team,
            m.team_a_score, m.team_b_score
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false AND p.is_ringer = false
    ),
    match_stats_with_points AS (
        SELECT
            ms.*,
            calculate_match_fantasy_points(COALESCE(ms.result, 'loss'), COALESCE(ms.heavy_win, false), COALESCE(ms.heavy_loss, false), COALESCE(ms.clean_sheet, false)) as calculated_fantasy_points
        FROM match_stats ms
    ),
    current_season_stats AS (
        SELECT
            name,
            SUM(COALESCE(goals, 0)) as total_goals,
            SUM(COALESCE(calculated_fantasy_points, 0)) as fantasy_points
        FROM match_stats_with_points
        WHERE match_date::date >= DATE_TRUNC('year', target_date)::date
        AND match_date::date <= target_date::date
        GROUP BY name
    ),
    previous_season_stats AS (
        SELECT
            name,
            SUM(COALESCE(goals, 0)) as total_goals,
            SUM(COALESCE(calculated_fantasy_points, 0)) as fantasy_points
        FROM match_stats_with_points
        WHERE match_date::date >= DATE_TRUNC('year', target_date)::date
        AND match_date::date < target_date::date
        GROUP BY name
    ),
    current_half_season_stats AS (
        SELECT
            name,
            SUM(COALESCE(goals, 0)) as total_goals,
            SUM(COALESCE(calculated_fantasy_points, 0)) as fantasy_points
        FROM match_stats_with_points
        WHERE match_date::date >= half_season_start
        AND match_date::date <= half_season_end
        GROUP BY name
    ),
    previous_half_season_stats AS (
        SELECT
            name,
            SUM(COALESCE(goals, 0)) as total_goals,
            SUM(COALESCE(calculated_fantasy_points, 0)) as fantasy_points
        FROM match_stats_with_points
        WHERE match_date::date >= half_season_start
        AND match_date::date < target_date::date -- This defines the state *before* the current match for comparison
        GROUP BY name
    )
    SELECT
        -- Season Goal Leaders
        COALESCE(
            (WITH current_ranked_leaders AS (
                SELECT name, total_goals, DENSE_RANK() OVER (ORDER BY total_goals DESC) as rnk
                FROM current_season_stats WHERE total_goals > 0
            ),
            previous_top_leader AS (
                SELECT name, total_goals FROM previous_season_stats ORDER BY total_goals DESC, name LIMIT 1
            )
            SELECT jsonb_agg(jsonb_build_object(
                'new_leader', crl.name, 'new_leader_goals', crl.total_goals,
                'previous_leader', ptl.name, 'previous_leader_goals', ptl.total_goals,
                'change_type', CASE
                                WHEN ptl.name IS NULL AND crl.name IS NOT NULL THEN 'new_leader'
                                WHEN crl.name = ptl.name THEN 'remains'
                                WHEN crl.total_goals = ptl.total_goals AND crl.name != ptl.name THEN 'tied' -- New person tied with old leader
                                WHEN crl.name != ptl.name THEN 'overtake'
                                ELSE 'new_leader'
                            END
            ) ORDER BY crl.name)
            FROM current_ranked_leaders crl LEFT JOIN previous_top_leader ptl ON TRUE
            WHERE crl.rnk = 1
            ),
            '[]'::jsonb
        ) AS sg_leaders, -- Alias for direct assignment
        -- Season Fantasy Leaders
        COALESCE(
            (WITH current_ranked_leaders AS (
                SELECT name, fantasy_points, DENSE_RANK() OVER (ORDER BY fantasy_points DESC) as rnk
                FROM current_season_stats WHERE COALESCE(fantasy_points, 0) > 0
            ),
            previous_top_leader AS (
                SELECT name, fantasy_points FROM previous_season_stats ORDER BY fantasy_points DESC, name LIMIT 1
            )
            SELECT jsonb_agg(jsonb_build_object(
                'new_leader', crl.name, 'new_leader_points', crl.fantasy_points,
                'previous_leader', ptl.name, 'previous_leader_points', ptl.fantasy_points,
                'change_type', CASE
                                WHEN ptl.name IS NULL AND crl.name IS NOT NULL THEN 'new_leader'
                                WHEN crl.name = ptl.name THEN 'remains'
                                WHEN COALESCE(crl.fantasy_points, 0) = COALESCE(ptl.fantasy_points, 0) AND crl.name != ptl.name THEN 'tied'
                                WHEN crl.name != ptl.name THEN 'overtake'
                                ELSE 'new_leader'
                            END
            ) ORDER BY crl.name)
            FROM current_ranked_leaders crl LEFT JOIN previous_top_leader ptl ON TRUE
            WHERE crl.rnk = 1
            ),
            '[]'::jsonb
        ) AS sf_leaders, -- Alias for direct assignment
        -- Half-Season Goal Leaders
        COALESCE(
            (WITH current_ranked_leaders AS (
                SELECT name, total_goals, DENSE_RANK() OVER (ORDER BY total_goals DESC) as rnk
                FROM current_half_season_stats WHERE total_goals > 0
            ),
            previous_top_leader AS (
                SELECT name, total_goals FROM previous_half_season_stats ORDER BY total_goals DESC, name LIMIT 1
            )
            SELECT jsonb_agg(jsonb_build_object(
                'new_leader', crl.name, 'new_leader_goals', crl.total_goals,
                'previous_leader', ptl.name, 'previous_leader_goals', ptl.total_goals,
                'change_type', CASE
                                WHEN ptl.name IS NULL AND crl.name IS NOT NULL THEN 'new_leader'
                                WHEN crl.name = ptl.name THEN 'remains'
                                WHEN crl.total_goals = ptl.total_goals AND crl.name != ptl.name THEN 'tied'
                                WHEN crl.name != ptl.name THEN 'overtake'
                                ELSE 'new_leader'
                            END
            ) ORDER BY crl.name)
            FROM current_ranked_leaders crl LEFT JOIN previous_top_leader ptl ON TRUE
            WHERE crl.rnk = 1
            ),
            '[]'::jsonb
        ) AS hg_leaders, -- Alias for direct assignment
        -- Half-Season Fantasy Leaders
        COALESCE(
            (WITH current_ranked_leaders AS (
                SELECT name, fantasy_points, DENSE_RANK() OVER (ORDER BY fantasy_points DESC) as rnk
                FROM current_half_season_stats WHERE COALESCE(fantasy_points, 0) > 0
            ),
            previous_top_leader AS (
                SELECT name, fantasy_points FROM previous_half_season_stats ORDER BY fantasy_points DESC, name LIMIT 1
            )
            SELECT jsonb_agg(jsonb_build_object(
                'new_leader', crl.name, 'new_leader_points', crl.fantasy_points,
                'previous_leader', ptl.name, 'previous_leader_points', ptl.fantasy_points,
                'change_type', CASE
                                WHEN ptl.name IS NULL AND crl.name IS NOT NULL THEN 'new_leader'
                                WHEN crl.name = ptl.name THEN 'remains'
                                WHEN COALESCE(crl.fantasy_points, 0) = COALESCE(ptl.fantasy_points, 0) AND crl.name != ptl.name THEN 'tied'
                                WHEN crl.name != ptl.name THEN 'overtake'
                                ELSE 'new_leader'
                            END
            ) ORDER BY crl.name)
            FROM current_ranked_leaders crl LEFT JOIN previous_top_leader ptl ON TRUE
            WHERE crl.rnk = 1
            ),
            '[]'::jsonb
        ) AS hf_leaders -- Alias for direct assignment
    INTO
        v_season_goal_leaders,        -- Changed from path assignment
        v_season_fantasy_leaders,   -- Changed from path assignment
        v_half_season_goal_leaders,   -- Changed from path assignment
        v_half_season_fantasy_leaders; -- Changed from path assignment

    -- 6. Calculate Current Streaks (NEW: Store in variables instead of updating broken table)
    RAISE NOTICE 'Calculating current streaks for all active players...';
    
    -- Calculate current streaks for all non-ringer, non-retired players
    WITH all_active_players AS (
        SELECT player_id, name 
        FROM players 
        WHERE is_ringer = false
    ),
    -- Calculate current streaks using the same logic as player_profile_stats
    player_current_streaks AS (
        WITH numbered_matches AS (
            SELECT
                pm.player_id, p.name, m.match_date, m.match_id, pm.result,
                ROW_NUMBER() OVER (PARTITION BY pm.player_id ORDER BY m.match_date DESC, m.match_id DESC) as match_num
            FROM player_matches pm 
            JOIN matches m ON pm.match_id = m.match_id
            JOIN players p ON pm.player_id = p.player_id
            WHERE p.is_ringer = false AND p.is_ringer = false
        ),
        streak_groups AS (
            SELECT
                player_id, name, result, match_date,
                -- Current streaks: count consecutive results from most recent match
                SUM(CASE WHEN result != 'win' THEN 1 ELSE 0 END) OVER (
                    PARTITION BY player_id 
                    ORDER BY match_num 
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) as win_breaks,
                SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) OVER (
                    PARTITION BY player_id 
                    ORDER BY match_num 
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) as unbeaten_breaks,
                SUM(CASE WHEN result != 'loss' THEN 1 ELSE 0 END) OVER (
                    PARTITION BY player_id 
                    ORDER BY match_num 
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) as loss_breaks,
                SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) OVER (
                    PARTITION BY player_id 
                    ORDER BY match_num 
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) as winless_breaks,
                match_num
            FROM numbered_matches
            WHERE match_num <= 20 -- Only consider recent matches for current streaks
        ),
        current_win_streaks AS (
            SELECT player_id, name, COUNT(*) as current_win_streak
            FROM streak_groups 
            WHERE win_breaks = 0 AND result = 'win'
            GROUP BY player_id, name
        ),
        current_unbeaten_streaks AS (
            SELECT player_id, name, COUNT(*) as current_unbeaten_streak
            FROM streak_groups 
            WHERE unbeaten_breaks = 0 AND result != 'loss'
            GROUP BY player_id, name
        ),
        current_loss_streaks AS (
            SELECT player_id, name, COUNT(*) as current_loss_streak
            FROM streak_groups 
            WHERE loss_breaks = 0 AND result = 'loss'
            GROUP BY player_id, name
        ),
        current_winless_streaks AS (
            SELECT player_id, name, COUNT(*) as current_winless_streak
            FROM streak_groups 
            WHERE winless_breaks = 0 AND result != 'win'
            GROUP BY player_id, name
        )
        SELECT 
            p.player_id, 
            p.name,
            COALESCE(cws.current_win_streak, 0) as current_win_streak,
            COALESCE(cus.current_unbeaten_streak, 0) as current_unbeaten_streak,
            COALESCE(cls.current_loss_streak, 0) as current_loss_streak,
            COALESCE(cwls.current_winless_streak, 0) as current_winless_streak
        FROM all_active_players p
        LEFT JOIN current_win_streaks cws ON p.player_id = cws.player_id
        LEFT JOIN current_unbeaten_streaks cus ON p.player_id = cus.player_id
        LEFT JOIN current_loss_streaks cls ON p.player_id = cls.player_id
        LEFT JOIN current_winless_streaks cwls ON p.player_id = cwls.player_id
    ),
    -- Calculate goal streaks
    player_goal_streaks AS (
        WITH numbered_goal_matches AS (
            SELECT
                pm.player_id, p.name, m.match_date, pm.goals,
                ROW_NUMBER() OVER (PARTITION BY pm.player_id ORDER BY m.match_date DESC) as match_num
            FROM player_matches pm 
            JOIN matches m ON pm.match_id = m.match_id
            JOIN players p ON pm.player_id = p.player_id
            WHERE p.is_ringer = false AND p.is_ringer = false
        ),
        goal_streak_groups AS (
            SELECT
                player_id, name, goals, match_date,
                SUM(CASE WHEN COALESCE(goals, 0) = 0 THEN 1 ELSE 0 END) OVER (
                    PARTITION BY player_id 
                    ORDER BY match_num 
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) as goal_breaks,
                match_num
            FROM numbered_goal_matches
            WHERE match_num <= 20
        )
        SELECT 
            player_id, 
            name,
            COUNT(*) as current_scoring_streak,
            SUM(COALESCE(goals, 0)) as goals_in_streak
        FROM goal_streak_groups 
        WHERE goal_breaks = 0 AND COALESCE(goals, 0) > 0
        GROUP BY player_id, name
    ),
    -- Format streaks for storage
    formatted_streaks AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'name', pcs.name,
                'streak_type', 
                CASE 
                    WHEN pcs.current_win_streak >= v_win_streak_threshold THEN 'win'
                    WHEN pcs.current_unbeaten_streak >= v_unbeaten_streak_threshold THEN 'unbeaten'
                    WHEN pcs.current_loss_streak >= v_loss_streak_threshold THEN 'loss'
                    WHEN pcs.current_winless_streak >= v_winless_streak_threshold THEN 'winless'
                    ELSE NULL
                END,
                'streak_count',
                CASE 
                    WHEN pcs.current_win_streak >= v_win_streak_threshold THEN pcs.current_win_streak
                    WHEN pcs.current_unbeaten_streak >= v_unbeaten_streak_threshold THEN pcs.current_unbeaten_streak
                    WHEN pcs.current_loss_streak >= v_loss_streak_threshold THEN pcs.current_loss_streak
                    WHEN pcs.current_winless_streak >= v_winless_streak_threshold THEN pcs.current_winless_streak
                    ELSE NULL
                END
            )
        ) FILTER (WHERE 
            pcs.current_win_streak >= v_win_streak_threshold OR
            pcs.current_unbeaten_streak >= v_unbeaten_streak_threshold OR
            pcs.current_loss_streak >= v_loss_streak_threshold OR
            pcs.current_winless_streak >= v_winless_streak_threshold
        ) as streaks_data
        FROM player_current_streaks pcs
    ),
    formatted_goal_streaks AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'name', pgs.name,
                'matches_with_goals', pgs.current_scoring_streak,
                'goals_in_streak', pgs.goals_in_streak
            )
        ) as goal_streaks_data
        FROM player_goal_streaks pgs
        WHERE pgs.current_scoring_streak >= v_goal_streak_threshold
    )
    SELECT 
        COALESCE(fs.streaks_data, '[]'::jsonb),
        COALESCE(fgs.goal_streaks_data, '[]'::jsonb)
    INTO v_streaks_json, v_goal_streaks_json
    FROM formatted_streaks fs, formatted_goal_streaks fgs;

    -- 7. Update aggregated_match_report Table (UPDATED: Include streaks)
    RAISE NOTICE 'Updating aggregated_match_report table for match ID: %', latest_match.match_id;
    DELETE FROM aggregated_match_report WHERE TRUE; -- Keep WHERE TRUE fix

    INSERT INTO aggregated_match_report (
        match_id, match_date, team_a_score, team_b_score,
        team_a_players, team_b_players, team_a_scorers, team_b_scorers,
        config_values, game_milestones, goal_milestones,
        half_season_goal_leaders, half_season_fantasy_leaders,
        season_goal_leaders, season_fantasy_leaders,
        on_fire_player_id, grim_reaper_player_id, -- NEW
        feat_breaking_data, -- NEW: Add feat-breaking data column
        streaks, goal_streaks, -- NEW: Add streak columns
        last_updated
    )         VALUES (
            latest_match.match_id,
            latest_match.match_date,
            latest_match.team_a_score,
            latest_match.team_b_score,
        team_a_players_json,
        team_b_players_json,
        team_a_scorers,
        team_b_scorers,
        jsonb_build_object(
            'win_streak_threshold', v_win_streak_threshold,
            'unbeaten_streak_threshold', v_unbeaten_streak_threshold,
            'loss_streak_threshold', v_loss_streak_threshold,
            'winless_streak_threshold', v_winless_streak_threshold,
            'goal_streak_threshold', v_goal_streak_threshold
        ),
        game_milestones_json,
        goal_milestones_json,
        v_half_season_goal_leaders,
        v_half_season_fantasy_leaders,
        v_season_goal_leaders,
        v_season_fantasy_leaders,
        v_on_fire_player_id,
        v_grim_reaper_player_id,
        -- NEW: Feat Breaking Detection Logic (Always Enabled)
        (
                WITH current_records AS (
                    SELECT records FROM aggregated_records 
                    ORDER BY last_updated DESC LIMIT 1
                ),
                feat_breaking_candidates AS (
                    -- Most Goals in Game Detection (only check if meets milestone threshold)
                    SELECT 
                        'most_goals_in_game' as feat_type,
                        pm.player_id,
                        p.name as player_name,
                        pm.goals as new_value,
                        COALESCE((current_records.records->'most_goals_in_game'->0->>'goals')::int, 0) as current_record,
                        CASE 
                            WHEN pm.goals > COALESCE((current_records.records->'most_goals_in_game'->0->>'goals')::int, 0) THEN 'broken'
                            WHEN pm.goals = COALESCE((current_records.records->'most_goals_in_game'->0->>'goals')::int, 0) AND pm.goals >= milestone_goal_threshold THEN 'equaled'
                            ELSE NULL
                        END as status
                    FROM player_matches pm
                    JOIN players p ON pm.player_id = p.player_id
                    CROSS JOIN current_records
                    WHERE pm.match_id = latest_match.match_id 
                      AND pm.goals >= milestone_goal_threshold
                      AND p.is_ringer = false
                    
                    UNION ALL
                    
                    -- Win Streak Detection (using data from stored streaks)
                    SELECT 
                        'win_streak' as feat_type,
                        pm.player_id,
                        p.name as player_name,
                        (v_streaks_json->i->>'streak_count')::int as new_value,
                        CASE 
                            WHEN jsonb_typeof(current_records.records->'streaks'->'Win Streak'->'holders') = 'array' THEN
                                COALESCE((
                                    SELECT MAX((streak_holder->>'streak')::int) 
                                    FROM jsonb_array_elements(current_records.records->'streaks'->'Win Streak'->'holders') AS streak_holder
                                ), 0)
                            ELSE 0
                        END as current_record,
                        CASE 
                            WHEN (v_streaks_json->i->>'streak_count')::int > (
                                CASE 
                                    WHEN jsonb_typeof(current_records.records->'streaks'->'Win Streak'->'holders') = 'array' THEN
                                        COALESCE((
                                            SELECT MAX((streak_holder->>'streak')::int) 
                                            FROM jsonb_array_elements(current_records.records->'streaks'->'Win Streak'->'holders') AS streak_holder
                                        ), 0)
                                    ELSE 0
                                END
                            ) THEN 'broken'
                            WHEN (v_streaks_json->i->>'streak_count')::int = (
                                CASE 
                                    WHEN jsonb_typeof(current_records.records->'streaks'->'Win Streak'->'holders') = 'array' THEN
                                        COALESCE((
                                            SELECT MAX((streak_holder->>'streak')::int) 
                                            FROM jsonb_array_elements(current_records.records->'streaks'->'Win Streak'->'holders') AS streak_holder
                                        ), 0)
                                    ELSE 0
                                END
                            ) AND (v_streaks_json->i->>'streak_count')::int >= v_win_streak_threshold THEN 'equaled'
                            ELSE NULL
                        END as status
                    FROM player_matches pm
                    JOIN players p ON pm.player_id = p.player_id
                    CROSS JOIN current_records
                    CROSS JOIN generate_series(0, jsonb_array_length(v_streaks_json) - 1) AS i
                    WHERE pm.match_id = latest_match.match_id 
                      AND p.is_ringer = false
                      AND v_streaks_json->i->>'name' = p.name
                      AND v_streaks_json->i->>'streak_type' = 'win'
                      AND (v_streaks_json->i->>'streak_count')::int >= v_win_streak_threshold
                    
                    UNION ALL
                    
                    -- Loss Streak Detection (using data from stored streaks)
                    SELECT 
                        'loss_streak' as feat_type,
                        pm.player_id,
                        p.name as player_name,
                        (v_streaks_json->i->>'streak_count')::int as new_value,
                        CASE 
                            WHEN jsonb_typeof(current_records.records->'streaks'->'Losing Streak'->'holders') = 'array' THEN
                                COALESCE((
                                    SELECT MAX((streak_holder->>'streak')::int) 
                                    FROM jsonb_array_elements(current_records.records->'streaks'->'Losing Streak'->'holders') AS streak_holder
                                ), 0)
                            ELSE 0
                        END as current_record,
                        CASE 
                            WHEN (v_streaks_json->i->>'streak_count')::int > (
                                CASE 
                                    WHEN jsonb_typeof(current_records.records->'streaks'->'Losing Streak'->'holders') = 'array' THEN
                                        COALESCE((
                                            SELECT MAX((streak_holder->>'streak')::int) 
                                            FROM jsonb_array_elements(current_records.records->'streaks'->'Losing Streak'->'holders') AS streak_holder
                                        ), 0)
                                    ELSE 0
                                END
                            ) THEN 'broken'
                            WHEN (v_streaks_json->i->>'streak_count')::int = (
                                CASE 
                                    WHEN jsonb_typeof(current_records.records->'streaks'->'Losing Streak'->'holders') = 'array' THEN
                                        COALESCE((
                                            SELECT MAX((streak_holder->>'streak')::int) 
                                            FROM jsonb_array_elements(current_records.records->'streaks'->'Losing Streak'->'holders') AS streak_holder
                                        ), 0)
                                    ELSE 0
                                END
                            ) AND (v_streaks_json->i->>'streak_count')::int >= v_loss_streak_threshold THEN 'equaled'
                            ELSE NULL
                        END as status
                    FROM player_matches pm
                    JOIN players p ON pm.player_id = p.player_id
                    CROSS JOIN current_records
                    CROSS JOIN generate_series(0, jsonb_array_length(v_streaks_json) - 1) AS i
                    WHERE pm.match_id = latest_match.match_id 
                      AND p.is_ringer = false
                      AND v_streaks_json->i->>'name' = p.name
                      AND v_streaks_json->i->>'streak_type' = 'loss'
                      AND (v_streaks_json->i->>'streak_count')::int >= v_loss_streak_threshold
                    
                    UNION ALL
                    
                    -- Unbeaten Streak Detection (using data from stored streaks)
                    SELECT 
                        'unbeaten_streak' as feat_type,
                        pm.player_id,
                        p.name as player_name,
                        (v_streaks_json->i->>'streak_count')::int as new_value,
                        CASE 
                            WHEN jsonb_typeof(current_records.records->'streaks'->'Undefeated Streak'->'holders') = 'array' THEN
                                COALESCE((
                                    SELECT MAX((streak_holder->>'streak')::int) 
                                    FROM jsonb_array_elements(current_records.records->'streaks'->'Undefeated Streak'->'holders') AS streak_holder
                                ), 0)
                            ELSE 0
                        END as current_record,
                        CASE 
                            WHEN (v_streaks_json->i->>'streak_count')::int > (
                                CASE 
                                    WHEN jsonb_typeof(current_records.records->'streaks'->'Undefeated Streak'->'holders') = 'array' THEN
                                        COALESCE((
                                            SELECT MAX((streak_holder->>'streak')::int) 
                                            FROM jsonb_array_elements(current_records.records->'streaks'->'Undefeated Streak'->'holders') AS streak_holder
                                        ), 0)
                                    ELSE 0
                                END
                            ) THEN 'broken'
                            WHEN (v_streaks_json->i->>'streak_count')::int = (
                                CASE 
                                    WHEN jsonb_typeof(current_records.records->'streaks'->'Undefeated Streak'->'holders') = 'array' THEN
                                        COALESCE((
                                            SELECT MAX((streak_holder->>'streak')::int) 
                                            FROM jsonb_array_elements(current_records.records->'streaks'->'Undefeated Streak'->'holders') AS streak_holder
                                        ), 0)
                                    ELSE 0
                                END
                            ) AND (v_streaks_json->i->>'streak_count')::int >= v_unbeaten_streak_threshold THEN 'equaled'
                            ELSE NULL
                        END as status
                    FROM player_matches pm
                    JOIN players p ON pm.player_id = p.player_id
                    CROSS JOIN current_records
                    CROSS JOIN generate_series(0, jsonb_array_length(v_streaks_json) - 1) AS i
                    WHERE pm.match_id = latest_match.match_id 
                      AND p.is_ringer = false
                      AND v_streaks_json->i->>'name' = p.name
                      AND v_streaks_json->i->>'streak_type' = 'unbeaten'
                      AND (v_streaks_json->i->>'streak_count')::int >= v_unbeaten_streak_threshold
                    
                    UNION ALL
                    
                    -- Winless Streak Detection (using data from stored streaks)
                    SELECT 
                        'winless_streak' as feat_type,
                        pm.player_id,
                        p.name as player_name,
                        (v_streaks_json->i->>'streak_count')::int as new_value,
                        CASE 
                            WHEN jsonb_typeof(current_records.records->'streaks'->'Winless Streak'->'holders') = 'array' THEN
                                COALESCE((
                                    SELECT MAX((streak_holder->>'streak')::int) 
                                    FROM jsonb_array_elements(current_records.records->'streaks'->'Winless Streak'->'holders') AS streak_holder
                                ), 0)
                            ELSE 0
                        END as current_record,
                        CASE 
                            WHEN (v_streaks_json->i->>'streak_count')::int > (
                                CASE 
                                    WHEN jsonb_typeof(current_records.records->'streaks'->'Winless Streak'->'holders') = 'array' THEN
                                        COALESCE((
                                            SELECT MAX((streak_holder->>'streak')::int) 
                                            FROM jsonb_array_elements(current_records.records->'streaks'->'Winless Streak'->'holders') AS streak_holder
                                        ), 0)
                                    ELSE 0
                                END
                            ) THEN 'broken'
                            WHEN (v_streaks_json->i->>'streak_count')::int = (
                                CASE 
                                    WHEN jsonb_typeof(current_records.records->'streaks'->'Winless Streak'->'holders') = 'array' THEN
                                        COALESCE((
                                            SELECT MAX((streak_holder->>'streak')::int) 
                                            FROM jsonb_array_elements(current_records.records->'streaks'->'Winless Streak'->'holders') AS streak_holder
                                        ), 0)
                                    ELSE 0
                                END
                            ) AND (v_streaks_json->i->>'streak_count')::int >= v_winless_streak_threshold THEN 'equaled'
                            ELSE NULL
                        END as status
                    FROM player_matches pm
                    JOIN players p ON pm.player_id = p.player_id
                    CROSS JOIN current_records
                    CROSS JOIN generate_series(0, jsonb_array_length(v_streaks_json) - 1) AS i
                    WHERE pm.match_id = latest_match.match_id 
                      AND p.is_ringer = false
                      AND v_streaks_json->i->>'name' = p.name
                      AND v_streaks_json->i->>'streak_type' = 'winless'
                      AND (v_streaks_json->i->>'streak_count')::int >= v_winless_streak_threshold
                    
                    UNION ALL
                    
                    -- Goal Streak Detection (using data from stored goal streaks)
                    SELECT 
                        'goal_streak' as feat_type,
                        pm.player_id,
                        p.name as player_name,
                        (v_goal_streaks_json->i->>'matches_with_goals')::int as new_value,
                        CASE 
                            WHEN jsonb_typeof(current_records.records->'consecutive_goals_streak') = 'array' THEN
                                COALESCE((
                                    SELECT MAX((streak_holder->>'streak')::int) 
                                    FROM jsonb_array_elements(current_records.records->'consecutive_goals_streak') AS streak_holder
                                ), 0)
                            ELSE 0
                        END as current_record,
                        CASE 
                            WHEN (v_goal_streaks_json->i->>'matches_with_goals')::int > (
                                CASE 
                                    WHEN jsonb_typeof(current_records.records->'consecutive_goals_streak') = 'array' THEN
                                        COALESCE((
                                            SELECT MAX((streak_holder->>'streak')::int) 
                                            FROM jsonb_array_elements(current_records.records->'consecutive_goals_streak') AS streak_holder
                                        ), 0)
                                    ELSE 0
                                END
                            ) THEN 'broken'
                            WHEN (v_goal_streaks_json->i->>'matches_with_goals')::int = (
                                CASE 
                                    WHEN jsonb_typeof(current_records.records->'consecutive_goals_streak') = 'array' THEN
                                        COALESCE((
                                            SELECT MAX((streak_holder->>'streak')::int) 
                                            FROM jsonb_array_elements(current_records.records->'consecutive_goals_streak') AS streak_holder
                                        ), 0)
                                    ELSE 0
                                END
                            ) AND (v_goal_streaks_json->i->>'matches_with_goals')::int >= v_goal_streak_threshold THEN 'equaled'
                            ELSE NULL
                        END as status
                    FROM player_matches pm
                    JOIN players p ON pm.player_id = p.player_id
                    CROSS JOIN current_records
                    CROSS JOIN generate_series(0, jsonb_array_length(v_goal_streaks_json) - 1) AS i
                    WHERE pm.match_id = latest_match.match_id 
                      AND p.is_ringer = false
                      AND v_goal_streaks_json->i->>'name' = p.name
                      AND (v_goal_streaks_json->i->>'matches_with_goals')::int >= v_goal_streak_threshold
                    
                    UNION ALL
                    
                    -- Biggest Victory Detection (check all match scores > 0 difference)
                    SELECT 
                        'biggest_victory' as feat_type,
                        NULL as player_id, -- No specific player for biggest victory
                        'Team Result' as player_name,
                        ABS(latest_match.team_a_score - latest_match.team_b_score) as new_value,
                        COALESCE((current_records.records->'biggest_victory'->0->>'team_a_score')::int - (current_records.records->'biggest_victory'->0->>'team_b_score')::int, 0) as current_record,
                        CASE 
                            WHEN ABS(latest_match.team_a_score - latest_match.team_b_score) > ABS(COALESCE((current_records.records->'biggest_victory'->0->>'team_a_score')::int, 0) - COALESCE((current_records.records->'biggest_victory'->0->>'team_b_score')::int, 0)) THEN 'broken'
                            WHEN ABS(latest_match.team_a_score - latest_match.team_b_score) = ABS(COALESCE((current_records.records->'biggest_victory'->0->>'team_a_score')::int, 0) - COALESCE((current_records.records->'biggest_victory'->0->>'team_b_score')::int, 0)) AND ABS(latest_match.team_a_score - latest_match.team_b_score) > 0 THEN 'equaled'
                            ELSE NULL
                        END as status
                    FROM (SELECT 1) dummy
                    CROSS JOIN current_records
                    WHERE ABS(latest_match.team_a_score - latest_match.team_b_score) > 0
                    
                    UNION ALL
                    
                    -- Attendance Streak Detection (using current attendance streaks from personal bests)
                    SELECT 
                        'attendance_streak' as feat_type,
                        pm.player_id,
                        p.name as player_name,
                        COALESCE((pb_data.broken_pbs_data->p.name->>'attendance_streak')::int, 0) as new_value,
                        CASE 
                            WHEN jsonb_typeof(current_records.records->'attendance_streak') = 'array' THEN
                                COALESCE((
                                    SELECT MAX((streak_holder->>'streak')::int) 
                                    FROM jsonb_array_elements(current_records.records->'attendance_streak') AS streak_holder
                                ), 0)
                            ELSE 0
                        END as current_record,
                        CASE 
                            WHEN COALESCE((pb_data.broken_pbs_data->p.name->>'attendance_streak')::int, 0) > (
                                CASE 
                                    WHEN jsonb_typeof(current_records.records->'attendance_streak') = 'array' THEN
                                        COALESCE((
                                            SELECT MAX((streak_holder->>'streak')::int) 
                                            FROM jsonb_array_elements(current_records.records->'attendance_streak') AS streak_holder
                                        ), 0)
                                    ELSE 0
                                END
                            ) THEN 'broken'
                            WHEN COALESCE((pb_data.broken_pbs_data->p.name->>'attendance_streak')::int, 0) = (
                                CASE 
                                    WHEN jsonb_typeof(current_records.records->'attendance_streak') = 'array' THEN
                                        COALESCE((
                                            SELECT MAX((streak_holder->>'streak')::int) 
                                            FROM jsonb_array_elements(current_records.records->'attendance_streak') AS streak_holder
                                        ), 0)
                                    ELSE 0
                                END
                            ) AND COALESCE((pb_data.broken_pbs_data->p.name->>'attendance_streak')::int, 0) >= 3 THEN 'equaled'
                            ELSE NULL
                        END as status
                    FROM player_matches pm
                    JOIN players p ON pm.player_id = p.player_id
                    CROSS JOIN current_records
                    LEFT JOIN aggregated_personal_bests pb_data ON pb_data.match_id = latest_match.match_id
                    WHERE pm.match_id = latest_match.match_id 
                      AND p.is_ringer = false
                      AND COALESCE((pb_data.broken_pbs_data->p.name->>'attendance_streak')::int, 0) >= 3
                )
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'feat_type', feat_type,
                        'player_name', player_name,
                        'player_id', player_id,
                        'new_value', new_value,
                        'current_record', current_record,
                        'status', status
                    )
                    ORDER BY 
                        CASE WHEN status = 'broken' THEN 1 ELSE 2 END, -- Broken records first
                        new_value DESC, 
                        player_name ASC
                ), '[]'::jsonb)
                FROM feat_breaking_candidates
                WHERE status IS NOT NULL
        ), -- End feat_breaking_data
        v_streaks_json,      -- NEW: Store calculated streaks
        v_goal_streaks_json, -- NEW: Store calculated goal streaks
        NOW()
    );

    RAISE NOTICE 'Successfully updated aggregated_match_report with match data and streaks';

    -- Update Cache Metadata
    RAISE NOTICE 'Updating match_report cache metadata...';
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('match_report', NOW(), 'match_report')
    ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();

    RAISE NOTICE 'update_aggregated_match_report_cache completed successfully.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_aggregated_match_report_cache: %', SQLERRM;
END;
$$;