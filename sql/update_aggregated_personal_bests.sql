-- sql/update_aggregated_personal_bests.sql
CREATE OR REPLACE FUNCTION update_aggregated_personal_bests(target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_latest_match_id INT;
    v_latest_match_date DATE;
    v_player_records RECORD; -- Will now include player_name
    v_player_id INT;
    v_player_name TEXT;
    v_current_goals INT;
    v_previous_max_goals INT;
    v_current_win_streak INT;
    v_previous_max_win_streak INT;
    v_current_undefeated_streak INT;
    v_previous_max_undefeated_streak INT;
    v_current_losing_streak INT;
    v_previous_max_losing_streak INT;
    v_current_winless_streak INT;
    v_previous_max_winless_streak INT;
    v_current_attendance_streak INT;
    v_previous_max_attendance_streak INT;
    v_current_scoring_streak INT;
    v_previous_max_scoring_streak INT;
    v_player_pb_array JSONB;
    v_final_json_payload JSONB;
    MIN_GOALS_FOR_PB CONSTANT INT := 2;
    MIN_STREAK_FOR_PB CONSTANT INT := 4;
BEGIN
    -- Phase 2: Set RLS context for this function (required for prisma_app role)
    PERFORM set_config('app.tenant_id', target_tenant_id::text, false);
    
    RAISE NOTICE 'Starting update_aggregated_personal_bests processing (v2 with player names)...';

    SELECT match_id, match_date INTO v_latest_match_id, v_latest_match_date
    FROM public.matches
    WHERE tenant_id = target_tenant_id
    ORDER BY match_date DESC, match_id DESC
    LIMIT 1;

    IF v_latest_match_id IS NULL THEN
        RAISE NOTICE 'No matches found. Exiting.';
        RETURN;
    END IF;
    RAISE NOTICE 'Processing for latest match_id: %, match_date: %', v_latest_match_id, v_latest_match_date;

    v_final_json_payload := '{}'::jsonb;

    FOR v_player_records IN
        SELECT p.player_id, p.name -- Fetch player name here
        FROM public.player_matches pm
        JOIN public.players p ON pm.player_id = p.player_id
        WHERE pm.match_id = v_latest_match_id
          AND pm.tenant_id = target_tenant_id
          AND p.tenant_id = target_tenant_id
          AND p.is_ringer = false
    LOOP
        v_player_id := v_player_records.player_id;
        v_player_name := v_player_records.name;
        v_player_pb_array := '[]'::jsonb;

        RAISE NOTICE 'Checking PBs for player_id: %, player_name: %', v_player_id, v_player_name;

        -- Metric 1: Most Goals in a Game
        SELECT COALESCE(goals, 0) INTO v_current_goals
        FROM public.player_matches
        WHERE match_id = v_latest_match_id AND player_id = v_player_id AND tenant_id = target_tenant_id;
        SELECT COALESCE(MAX(goals), 0) INTO v_previous_max_goals
        FROM public.player_matches
        WHERE player_id = v_player_id AND match_id < v_latest_match_id AND tenant_id = target_tenant_id;
        IF v_current_goals >= MIN_GOALS_FOR_PB AND v_current_goals > v_previous_max_goals THEN
            v_player_pb_array := v_player_pb_array || jsonb_build_object(
                'metric_type', 'most_goals_in_game',
                'value', v_current_goals,
                'previous_best_value', v_previous_max_goals
            );
        END IF;

        -- Streaks Calculations
        -- Part 1: Streaks related to game results (win, loss, undefeated, winless)
        -- These are based on matches the player *actually played*.
        WITH player_played_match_details AS (
            SELECT
                m.match_id,
                m.match_date,
                pm.result,
                (pm.result = 'W') AS is_win,
                (pm.result = 'L') AS is_loss,
                (pm.result = 'D') AS is_draw,
                (pm.result = 'W' OR pm.result = 'D') AS is_undefeated,
                (pm.result = 'L' OR pm.result = 'D') AS is_winless,
                (COALESCE(pm.goals, 0) > 0) AS has_scored,
                ROW_NUMBER() OVER (ORDER BY m.match_date, m.match_id) as played_match_seq_num
            FROM public.matches m
            JOIN public.player_matches pm ON m.match_id = pm.match_id
            WHERE pm.player_id = v_player_id 
            AND m.tenant_id = target_tenant_id 
            AND pm.tenant_id = target_tenant_id 
            AND m.match_date::date <= v_latest_match_date::date -- Ensure context of played matches
        ),
        played_game_streak_groups AS (
            SELECT
                match_id, match_date, is_win, is_loss, is_draw, is_undefeated, is_winless, has_scored, played_match_seq_num,
                played_match_seq_num - ROW_NUMBER() OVER (PARTITION BY is_win ORDER BY match_date, match_id) as win_streak_group,
                played_match_seq_num - ROW_NUMBER() OVER (PARTITION BY is_undefeated ORDER BY match_date, match_id) as undefeated_streak_group,
                played_match_seq_num - ROW_NUMBER() OVER (PARTITION BY is_loss ORDER BY match_date, match_id) as losing_streak_group,
                played_match_seq_num - ROW_NUMBER() OVER (PARTITION BY is_winless ORDER BY match_date, match_id) as winless_streak_group,
                played_match_seq_num - ROW_NUMBER() OVER (PARTITION BY has_scored ORDER BY match_date, match_id) as scoring_streak_group
            FROM player_played_match_details
        ),
        result_streaks_by_played_match AS (
            SELECT
                match_id, match_date,
                CASE WHEN is_win THEN COUNT(*) OVER (PARTITION BY is_win, win_streak_group ORDER BY match_date, match_id) ELSE 0 END as current_win_streak_val,
                CASE WHEN is_undefeated THEN COUNT(*) OVER (PARTITION BY is_undefeated, undefeated_streak_group ORDER BY match_date, match_id) ELSE 0 END as current_undefeated_streak_val,
                CASE WHEN is_loss THEN COUNT(*) OVER (PARTITION BY is_loss, losing_streak_group ORDER BY match_date, match_id) ELSE 0 END as current_losing_streak_val,
                CASE WHEN is_winless THEN COUNT(*) OVER (PARTITION BY is_winless, winless_streak_group ORDER BY match_date, match_id) ELSE 0 END as current_winless_streak_val,
                CASE WHEN has_scored THEN COUNT(*) OVER (PARTITION BY has_scored, scoring_streak_group ORDER BY match_date, match_id) ELSE 0 END as current_scoring_streak_val
            FROM played_game_streak_groups
        ),

        -- Part 2: Attendance Streak
        -- This is based on *all* matches up to the latest relevant match date.
        all_matches_ranked AS (
            SELECT
                m.match_id,
                m.match_date,
                ROW_NUMBER() OVER (ORDER BY m.match_date, m.match_id) as overall_match_seq_num
            FROM public.matches m
            WHERE m.tenant_id = target_tenant_id AND m.match_date::date <= v_latest_match_date::date
        ),
        player_attendance_status_for_all_matches AS (
            SELECT
                am.match_id,
                am.match_date,
                am.overall_match_seq_num,
                (pm.player_id IS NOT NULL) AS attended_this_match
            FROM all_matches_ranked am
            LEFT JOIN public.player_matches pm ON am.match_id = pm.match_id AND pm.player_id = v_player_id AND pm.tenant_id = target_tenant_id
        ),
        attendance_streak_break_groups AS (
            SELECT
                match_id,
                match_date,
                attended_this_match,
                overall_match_seq_num,
                overall_match_seq_num - ROW_NUMBER() OVER (PARTITION BY attended_this_match ORDER BY match_date, match_id) as attendance_group_key
            FROM player_attendance_status_for_all_matches
        ),
        attendance_streaks_by_match AS (
            SELECT
                match_id,
                match_date,
                CASE
                    WHEN attended_this_match THEN COUNT(*) OVER (PARTITION BY attended_this_match, attendance_group_key ORDER BY match_date, match_id)
                    ELSE 0
                END as current_attendance_streak_val
            FROM attendance_streak_break_groups
        ),

        -- Part 3: Combine all streak calculations per match
        all_streaks_per_match_for_player AS (
            SELECT
                m.match_id,
              --m.match_date, -- Not strictly needed in final select from this CTE
                COALESCE(rsbpm.current_win_streak_val, 0) as current_win_streak_val,
                COALESCE(rsbpm.current_undefeated_streak_val, 0) as current_undefeated_streak_val,
                COALESCE(rsbpm.current_losing_streak_val, 0) as current_losing_streak_val,
                COALESCE(rsbpm.current_winless_streak_val, 0) as current_winless_streak_val,
                COALESCE(rsbpm.current_scoring_streak_val, 0) as current_scoring_streak_val,
                asbm.current_attendance_streak_val
            FROM public.matches m -- Base for all matches in context
            LEFT JOIN result_streaks_by_played_match rsbpm ON m.match_id = rsbpm.match_id
            JOIN attendance_streaks_by_match asbm ON m.match_id = asbm.match_id
            WHERE m.tenant_id = target_tenant_id AND m.match_date::date <= v_latest_match_date::date -- Critical filter for context
        )
        -- Final SELECT statement to populate variables
        SELECT
            COALESCE(s.current_win_streak_val, 0),
            COALESCE(MAX(s_prev.current_win_streak_val) FILTER (WHERE s_prev.match_id < v_latest_match_id AND s_prev.current_win_streak_val > 0), 0),
            COALESCE(s.current_undefeated_streak_val, 0),
            COALESCE(MAX(s_prev.current_undefeated_streak_val) FILTER (WHERE s_prev.match_id < v_latest_match_id AND s_prev.current_undefeated_streak_val > 0), 0),
            COALESCE(s.current_losing_streak_val, 0),
            COALESCE(MAX(s_prev.current_losing_streak_val) FILTER (WHERE s_prev.match_id < v_latest_match_id AND s_prev.current_losing_streak_val > 0), 0),
            COALESCE(s.current_winless_streak_val, 0),
            COALESCE(MAX(s_prev.current_winless_streak_val) FILTER (WHERE s_prev.match_id < v_latest_match_id AND s_prev.current_winless_streak_val > 0), 0),
            COALESCE(s.current_attendance_streak_val, 0),
            COALESCE(MAX(s_prev.current_attendance_streak_val) FILTER (WHERE s_prev.match_id < v_latest_match_id AND s_prev.current_attendance_streak_val > 0), 0),
            COALESCE(s.current_scoring_streak_val, 0),
            COALESCE(MAX(s_prev.current_scoring_streak_val) FILTER (WHERE s_prev.match_id < v_latest_match_id AND s_prev.current_scoring_streak_val > 0), 0)
        INTO
            v_current_win_streak, v_previous_max_win_streak,
            v_current_undefeated_streak, v_previous_max_undefeated_streak,
            v_current_losing_streak, v_previous_max_losing_streak,
            v_current_winless_streak, v_previous_max_winless_streak,
            v_current_attendance_streak, v_previous_max_attendance_streak,
            v_current_scoring_streak, v_previous_max_scoring_streak
        FROM all_streaks_per_match_for_player s
        LEFT JOIN all_streaks_per_match_for_player s_prev ON s_prev.match_id < v_latest_match_id
        WHERE s.match_id = v_latest_match_id
        GROUP BY
            s.current_win_streak_val, s.current_undefeated_streak_val,
            s.current_losing_streak_val, s.current_winless_streak_val,
            s.current_attendance_streak_val, s.current_scoring_streak_val;

        -- Metric 2: Longest Win Streak
        IF v_current_win_streak >= MIN_STREAK_FOR_PB AND v_current_win_streak > v_previous_max_win_streak THEN
             v_player_pb_array := v_player_pb_array || jsonb_build_object('metric_type', 'longest_win_streak', 'value', v_current_win_streak, 'previous_best_value', v_previous_max_win_streak);
        END IF;
        -- Metric 3: Longest Undefeated Streak
        IF v_current_undefeated_streak >= MIN_STREAK_FOR_PB AND v_current_undefeated_streak > v_previous_max_undefeated_streak THEN
             v_player_pb_array := v_player_pb_array || jsonb_build_object('metric_type', 'longest_undefeated_streak', 'value', v_current_undefeated_streak, 'previous_best_value', v_previous_max_undefeated_streak);
        END IF;
        -- Metric 4: Longest Losing Streak
        IF v_current_losing_streak >= MIN_STREAK_FOR_PB AND v_current_losing_streak > v_previous_max_losing_streak THEN
             v_player_pb_array := v_player_pb_array || jsonb_build_object('metric_type', 'longest_losing_streak', 'value', v_current_losing_streak, 'previous_best_value', v_previous_max_losing_streak);
        END IF;
        -- Metric 5: Longest Winless Streak
        IF v_current_winless_streak >= MIN_STREAK_FOR_PB AND v_current_winless_streak > v_previous_max_winless_streak THEN
             v_player_pb_array := v_player_pb_array || jsonb_build_object('metric_type', 'longest_winless_streak', 'value', v_current_winless_streak, 'previous_best_value', v_previous_max_winless_streak);
        END IF;
        -- Metric 6: Attendance Streak
        -- FIXED: Only include attendance streaks that are CURRENT (extend to latest match)
        IF v_current_attendance_streak >= MIN_STREAK_FOR_PB 
           AND v_current_attendance_streak > v_previous_max_attendance_streak 
           AND EXISTS (
               -- Check if player attended the latest match (making the streak current)
               SELECT 1 FROM public.player_matches pm_latest 
               WHERE pm_latest.match_id = v_latest_match_id 
               AND pm_latest.player_id = v_player_id
               AND pm_latest.tenant_id = target_tenant_id
           ) THEN
             v_player_pb_array := v_player_pb_array || jsonb_build_object('metric_type', 'attendance_streak', 'value', v_current_attendance_streak, 'previous_best_value', v_previous_max_attendance_streak);
        END IF;
        -- Metric 7: Longest Scoring Streak
        IF v_current_scoring_streak >= MIN_STREAK_FOR_PB AND v_current_scoring_streak > v_previous_max_scoring_streak THEN
             v_player_pb_array := v_player_pb_array || jsonb_build_object('metric_type', 'longest_scoring_streak', 'value', v_current_scoring_streak, 'previous_best_value', v_previous_max_scoring_streak);
        END IF;

        IF jsonb_array_length(v_player_pb_array) > 0 THEN
            v_final_json_payload := jsonb_set(
                v_final_json_payload,
                ARRAY[v_player_id::text],
                jsonb_build_object(
                    'name', v_player_name,
                    'pbs', v_player_pb_array
                ),
                true
            );
        END IF;
    END LOOP;

    IF v_final_json_payload <> '{}'::jsonb THEN
        RAISE NOTICE 'PBs found for match_id: %. Inserting/Updating aggregated_personal_bests: %', v_latest_match_id, v_final_json_payload;
        INSERT INTO public.aggregated_personal_bests (match_id, tenant_id, broken_pbs_data, created_at, updated_at)
        VALUES (v_latest_match_id, target_tenant_id, v_final_json_payload, NOW(), NOW())
        ON CONFLICT (match_id, tenant_id) DO UPDATE
        SET broken_pbs_data = excluded.broken_pbs_data,
            updated_at = NOW();
    ELSE
        RAISE NOTICE 'No new PBs found for match_id: %. Upserting empty record.', v_latest_match_id;
        INSERT INTO public.aggregated_personal_bests (match_id, tenant_id, broken_pbs_data, created_at, updated_at)
        VALUES (v_latest_match_id, target_tenant_id, '{}'::jsonb, NOW(), NOW())
        ON CONFLICT (match_id, tenant_id) DO UPDATE
        SET broken_pbs_data = '{}'::jsonb,
            updated_at = NOW();
    END IF;

    -- Update cache_metadata
    RAISE NOTICE 'Updating cache_metadata for personal_bests...';
    INSERT INTO public.cache_metadata (cache_key, last_invalidated, dependency_type, tenant_id)
    VALUES ('personal_bests', NOW(), 'personal_bests', target_tenant_id)
    ON CONFLICT (cache_key, tenant_id) DO UPDATE
    SET last_invalidated = NOW(),
        dependency_type = excluded.dependency_type; -- Ensures dependency_type is also set/updated

    RAISE NOTICE 'Finished update_aggregated_personal_bests processing (v2 with cache_metadata).';
END;
$$; 