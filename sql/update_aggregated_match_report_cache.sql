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
    half_season_leaders_json JSONB := '{}'::jsonb;
    season_leaders_json JSONB := '{}'::jsonb;
    player_ids_in_match INT[];
    player_names_json JSONB := '{}'::jsonb;
    milestone_game_threshold INT;
    milestone_goal_threshold INT;
    target_date DATE;
    half_season_start DATE;
    half_season_end DATE;
BEGIN
    -- Removed the temporary debug notices and RETURN
    RAISE NOTICE 'Starting update_aggregated_match_report_cache...';
    -- Fetch config values
    milestone_game_threshold := get_config_value('game_milestone_threshold', '50')::int;
    milestone_goal_threshold := get_config_value('goal_milestone_threshold', '25')::int;
    RAISE NOTICE 'Using config: game_milestone=%, goal_milestone=%', milestone_game_threshold, milestone_goal_threshold;

    -- 1. Get Latest Match
    SELECT * INTO latest_match FROM matches ORDER BY match_date DESC, match_id DESC LIMIT 1;
    IF NOT FOUND THEN RAISE NOTICE 'No matches found. Exiting.'; RETURN; END IF;
    RAISE NOTICE 'Processing latest match ID: %', latest_match.match_id;
    target_date := latest_match.match_date::date; -- Ensure target_date is DATE

    -- 2. Get Match Participants & Details
    SELECT
        COALESCE(jsonb_agg(p.name ORDER BY p.name) FILTER (WHERE pm.team = 'A'), '[]'::jsonb),
        COALESCE(jsonb_agg(p.name ORDER BY p.name) FILTER (WHERE pm.team = 'B'), '[]'::jsonb),
        COALESCE(string_agg(CASE WHEN pm.team = 'A' AND pm.goals > 0 THEN p.name || CASE WHEN pm.goals > 1 THEN ' (' || pm.goals || ')' ELSE '' END END, ', ' ORDER BY p.name), ''),
        COALESCE(string_agg(CASE WHEN pm.team = 'B' AND pm.goals > 0 THEN p.name || CASE WHEN pm.goals > 1 THEN ' (' || pm.goals || ')' ELSE '' END END, ', ' ORDER BY p.name), ''),
        array_agg(pm.player_id) FILTER (WHERE p.is_ringer = false AND p.is_retired = false), -- Filter out ringers/retired here
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
            NOW()
        );
        -- Update Cache Metadata
        INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
        VALUES ('match_report', NOW(), 'match_report')
        ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();
        RAISE NOTICE 'update_aggregated_match_report_cache completed (basic info only).';
        RETURN;
    END IF;

    -- 3. Calculate Milestones (for players in the match)
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
        COALESCE(jsonb_agg(jsonb_build_object('name', player_names_json->>pt.player_id::text, 'value', pt.total_goals))
                 FILTER (
                    WHERE pt.total_goals > 0 -- Must have scored goals overall
                    AND pt.goals_in_latest_match > 0 -- Must have scored in the latest match to cross threshold
                    AND milestone_goal_threshold > 0 -- Avoid division by zero if config is bad
                    AND floor(pt.total_goals / milestone_goal_threshold) > floor(pt.total_goals_before / milestone_goal_threshold)
                 ), '[]'::jsonb)
    INTO game_milestones_json, goal_milestones_json FROM player_totals pt;

    -- 4. Calculate Leaders
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
        WHERE p.is_ringer = false AND p.is_retired = false
    ),
    match_stats_with_points AS (
        SELECT
            ms.*,
            calculate_match_fantasy_points(ms.result, ms.heavy_win, ms.heavy_loss, ms.clean_sheet) as calculated_fantasy_points
        FROM match_stats ms
    ),
    current_season_stats AS (
        SELECT
            name,
            SUM(COALESCE(goals, 0)) as total_goals,
            SUM(calculated_fantasy_points) as fantasy_points
        FROM match_stats_with_points
        WHERE match_date >= DATE_TRUNC('year', target_date)::date
        AND match_date <= target_date
        GROUP BY name
    ),
    previous_season_stats AS (
        SELECT
            name,
            SUM(COALESCE(goals, 0)) as total_goals,
            SUM(calculated_fantasy_points) as fantasy_points
        FROM match_stats_with_points
        WHERE match_date >= DATE_TRUNC('year', target_date)::date
        AND match_date < target_date
        GROUP BY name
    ),
    current_half_season_stats AS (
        SELECT
            name,
            SUM(COALESCE(goals, 0)) as total_goals,
            SUM(calculated_fantasy_points) as fantasy_points
        FROM match_stats_with_points
        WHERE match_date >= half_season_start
        AND match_date <= target_date
        GROUP BY name
    ),
    previous_half_season_stats AS (
        SELECT
            name,
            SUM(COALESCE(goals, 0)) as total_goals,
            SUM(calculated_fantasy_points) as fantasy_points
        FROM match_stats_with_points
        WHERE match_date >= half_season_start
        AND match_date < target_date
        GROUP BY name
    )
    SELECT
        (SELECT jsonb_build_object(
            'change_type',
            CASE
                WHEN c.name IS NULL AND p.name IS NOT NULL THEN 'dropped_out'
                WHEN c.name IS NULL THEN 'new_leader'
                WHEN p.name IS NULL THEN 'new_leader'
                WHEN c.name = p.name THEN 'remains'
                WHEN c.total_goals = p.total_goals THEN 'tied'
                ELSE 'overtake'
            END,
            'new_leader', c.name,
            'new_leader_goals', c.total_goals,
            'previous_leader', p.name,
            'previous_leader_goals', p.total_goals
        )
        FROM (SELECT * FROM current_season_stats ORDER BY total_goals DESC, name LIMIT 1) c
        FULL OUTER JOIN (SELECT * FROM previous_season_stats ORDER BY total_goals DESC, name LIMIT 1) p ON c.name = p.name
        ),
        (SELECT jsonb_build_object(
            'change_type',
            CASE
                WHEN c.name IS NULL AND p.name IS NOT NULL THEN 'dropped_out'
                WHEN c.name IS NULL THEN 'new_leader'
                WHEN p.name IS NULL THEN 'new_leader'
                WHEN c.name = p.name THEN 'remains'
                WHEN c.fantasy_points = p.fantasy_points THEN 'tied'
                ELSE 'overtake'
            END,
            'new_leader', c.name,
            'new_leader_points', c.fantasy_points,
            'previous_leader', p.name,
            'previous_leader_points', p.fantasy_points
        )
        FROM (SELECT * FROM current_season_stats ORDER BY fantasy_points DESC, name LIMIT 1) c
        FULL OUTER JOIN (SELECT * FROM previous_season_stats ORDER BY fantasy_points DESC, name LIMIT 1) p ON c.name = p.name
        ),
        (SELECT jsonb_build_object(
            'change_type',
            CASE
                WHEN c.name IS NULL AND p.name IS NOT NULL THEN 'dropped_out'
                WHEN c.name IS NULL THEN 'new_leader'
                WHEN p.name IS NULL THEN 'new_leader'
                WHEN c.name = p.name THEN 'remains'
                WHEN c.total_goals = p.total_goals THEN 'tied'
                ELSE 'overtake'
            END,
            'new_leader', c.name,
            'new_leader_goals', c.total_goals,
            'previous_leader', p.name,
            'previous_leader_goals', p.total_goals
        )
        FROM (SELECT * FROM current_half_season_stats ORDER BY total_goals DESC, name LIMIT 1) c
        FULL OUTER JOIN (SELECT * FROM previous_half_season_stats ORDER BY total_goals DESC, name LIMIT 1) p ON c.name = p.name
        ),
        (SELECT jsonb_build_object(
            'change_type',
            CASE
                WHEN c.name IS NULL AND p.name IS NOT NULL THEN 'dropped_out'
                WHEN c.name IS NULL THEN 'new_leader'
                WHEN p.name IS NULL THEN 'new_leader'
                WHEN c.name = p.name THEN 'remains'
                WHEN c.fantasy_points = p.fantasy_points THEN 'tied'
                ELSE 'overtake'
            END,
            'new_leader', c.name,
            'new_leader_points', c.fantasy_points,
            'previous_leader', p.name,
            'previous_leader_points', p.fantasy_points
        )
        FROM (SELECT * FROM current_half_season_stats ORDER BY fantasy_points DESC, name LIMIT 1) c
        FULL OUTER JOIN (SELECT * FROM previous_half_season_stats ORDER BY fantasy_points DESC, name LIMIT 1) p ON c.name = p.name
        )
    INTO
        season_leaders_json->'goals',
        season_leaders_json->'fantasy',
        half_season_leaders_json->'goals',
        half_season_leaders_json->'fantasy';

    -- 5. Update Player Streaks
    RAISE NOTICE 'Updating player streaks...';
    UPDATE aggregated_match_streaks ams
    SET
        current_win_streak = 0,
        current_unbeaten_streak = 0,
        current_winless_streak = 0,
        current_loss_streak = 0,
        current_scoring_streak = 0,
        goals_in_scoring_streak = 0
    WHERE ams.player_id NOT IN (
        SELECT pm.player_id
        FROM player_matches pm
        WHERE pm.match_id = latest_match.match_id
    );

    -- Goal Scoring Streaks (assuming the logic is correct)
    -- ... (Win Streaks, Unbeaten, Winless, Loss Streaks CTEs and UPDATEs) ...
    WITH latest_players AS (
        SELECT DISTINCT pm.player_id
        FROM player_matches pm
        WHERE pm.match_id = latest_match.match_id
    ),
    player_matches_scoring AS (
        SELECT
            p.player_id,
            p.name,
            m.match_date,
            pm.goals,
            ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false
        AND p.is_retired = false
        AND p.player_id IN (SELECT player_id FROM latest_players)
    ),
    streak_groups_scoring AS (
        SELECT
            player_id,
            name,
            match_num,
            goals,
            SUM(CASE WHEN COALESCE(goals, 0) = 0 THEN 1 ELSE 0 END) OVER (
                PARTITION BY player_id
                ORDER BY match_num
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) as streak_group
        FROM player_matches_scoring
        WHERE match_num <= 20
    ),
    current_streaks_scoring AS (
        SELECT
            player_id,
            COUNT(*) as streak_length,
            SUM(goals) as total_goals
        FROM streak_groups_scoring
        WHERE streak_group = 0
        GROUP BY player_id
    )
    UPDATE aggregated_match_streaks ams
    SET
        current_scoring_streak = cs.streak_length,
        goals_in_scoring_streak = cs.total_goals
    FROM current_streaks_scoring cs
    WHERE ams.player_id = cs.player_id;

    -- Win Streaks
    WITH latest_players_win AS (
        SELECT DISTINCT pm.player_id FROM player_matches pm WHERE pm.match_id = latest_match.match_id
    ),
    player_matches_win AS (
        SELECT p.player_id, pm.result, ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
        FROM players p JOIN player_matches pm ON p.player_id = pm.player_id JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false AND p.is_retired = false AND p.player_id IN (SELECT player_id FROM latest_players_win)
    ),
    streak_groups_win AS (
        SELECT player_id, match_num, SUM(CASE WHEN result != 'win' THEN 1 ELSE 0 END) OVER (PARTITION BY player_id ORDER BY match_num) as streak_group
        FROM player_matches_win WHERE match_num <= 20
    ),
    current_streaks_win AS (SELECT player_id, COUNT(*) as streak_length FROM streak_groups_win WHERE streak_group = 0 GROUP BY player_id)
    UPDATE aggregated_match_streaks ams SET current_win_streak = cs.streak_length FROM current_streaks_win cs WHERE ams.player_id = cs.player_id;

    -- Unbeaten Streaks
    WITH latest_players_unbeaten AS (
        SELECT DISTINCT pm.player_id FROM player_matches pm WHERE pm.match_id = latest_match.match_id
    ),
    player_matches_unbeaten AS (
        SELECT p.player_id, pm.result, ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
        FROM players p JOIN player_matches pm ON p.player_id = pm.player_id JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false AND p.is_retired = false AND p.player_id IN (SELECT player_id FROM latest_players_unbeaten)
    ),
    streak_groups_unbeaten AS (
        SELECT player_id, match_num, SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) OVER (PARTITION BY player_id ORDER BY match_num) as streak_group
        FROM player_matches_unbeaten WHERE match_num <= 20
    ),
    current_streaks_unbeaten AS (SELECT player_id, COUNT(*) as streak_length FROM streak_groups_unbeaten WHERE streak_group = 0 GROUP BY player_id)
    UPDATE aggregated_match_streaks ams SET current_unbeaten_streak = cs.streak_length FROM current_streaks_unbeaten cs WHERE ams.player_id = cs.player_id;

    -- Winless Streaks
    WITH latest_players_winless AS (
        SELECT DISTINCT pm.player_id FROM player_matches pm WHERE pm.match_id = latest_match.match_id
    ),
    player_matches_winless AS (
        SELECT p.player_id, pm.result, ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
        FROM players p JOIN player_matches pm ON p.player_id = pm.player_id JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false AND p.is_retired = false AND p.player_id IN (SELECT player_id FROM latest_players_winless)
    ),
    streak_groups_winless AS (
        SELECT player_id, match_num, SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) OVER (PARTITION BY player_id ORDER BY match_num) as streak_group
        FROM player_matches_winless WHERE match_num <= 20
    ),
    current_streaks_winless AS (SELECT player_id, COUNT(*) as streak_length FROM streak_groups_winless WHERE streak_group = 0 GROUP BY player_id)
    UPDATE aggregated_match_streaks ams SET current_winless_streak = cs.streak_length FROM current_streaks_winless cs WHERE ams.player_id = cs.player_id;

    -- Loss Streaks
    WITH latest_players_loss AS (
        SELECT DISTINCT pm.player_id FROM player_matches pm WHERE pm.match_id = latest_match.match_id
    ),
    player_matches_loss AS (
        SELECT p.player_id, pm.result, ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
        FROM players p JOIN player_matches pm ON p.player_id = pm.player_id JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false AND p.is_retired = false AND p.player_id IN (SELECT player_id FROM latest_players_loss)
    ),
    streak_groups_loss AS (
        SELECT player_id, match_num, SUM(CASE WHEN result != 'loss' THEN 1 ELSE 0 END) OVER (PARTITION BY player_id ORDER BY match_num) as streak_group
        FROM player_matches_loss WHERE match_num <= 20
    ),
    current_streaks_loss AS (SELECT player_id, COUNT(*) as streak_length FROM streak_groups_loss WHERE streak_group = 0 GROUP BY player_id)
    UPDATE aggregated_match_streaks ams SET current_loss_streak = cs.streak_length FROM current_streaks_loss cs WHERE ams.player_id = cs.player_id;

    -- 6. Update aggregated_match_report Table
    RAISE NOTICE 'Updating aggregated_match_report table for match ID: %', latest_match.match_id;
    DELETE FROM aggregated_match_report WHERE TRUE; -- Keep WHERE TRUE fix

    INSERT INTO aggregated_match_report (
        match_id, match_date, team_a_score, team_b_score,
        team_a_players, team_b_players, team_a_scorers, team_b_scorers,
        config_values, game_milestones, goal_milestones,
        half_season_goal_leaders, half_season_fantasy_leaders,
        season_goal_leaders, season_fantasy_leaders,
        last_updated
    ) VALUES (
        latest_match.match_id, latest_match.match_date, latest_match.team_a_score, latest_match.team_b_score,
        team_a_players_json, team_b_players_json, team_a_scorers, team_b_scorers,
        jsonb_build_object(
            'game_milestone_threshold', milestone_game_threshold,
            'goal_milestone_threshold', milestone_goal_threshold
        ),
        game_milestones_json, goal_milestones_json,
        half_season_leaders_json->'goals', half_season_leaders_json->'fantasy',
        season_leaders_json->'goals', season_leaders_json->'fantasy',
        NOW()
    );

    -- 7. Update Cache Metadata
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('match_report', NOW(), 'match_report')
    ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();

    RAISE NOTICE 'update_aggregated_match_report_cache completed.';

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in update_aggregated_match_report_cache: %', SQLERRM;
END; $$;