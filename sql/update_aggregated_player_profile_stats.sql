-- sql/update_aggregated_player_profile_stats.sql
CREATE OR REPLACE FUNCTION update_aggregated_player_profile_stats()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_player_record RECORD;
    v_numeric_id INT;
BEGIN
    RAISE NOTICE 'Starting update_aggregated_player_profile_stats processing (v2 with fixes)..';

    -- Clear the table before repopulating
    RAISE NOTICE 'Clearing existing data from aggregated_player_profile_stats...';
    TRUNCATE TABLE public.aggregated_player_profile_stats;

    -- Loop through each non-ringer player (include retired)
    FOR v_player_record IN
        SELECT player_id FROM public.players WHERE is_ringer = FALSE
    LOOP
        v_numeric_id := v_player_record.player_id;
        RAISE NOTICE 'Processing player_id: %', v_numeric_id;

        INSERT INTO public.aggregated_player_profile_stats (
            player_id,
            name,
            games_played,
            fantasy_points,
            most_game_goals,
            most_game_goals_date,
            most_season_goals,
            most_season_goals_year,
            win_streak,
            win_streak_dates,
            losing_streak,
            losing_streak_dates,
            undefeated_streak,
            undefeated_streak_dates,
            winless_streak,
            winless_streak_dates,
            attendance_streak,
            selected_club,
            yearly_stats,
            teammate_frequency_top5,
            teammate_performance_high_top5,
            teammate_performance_low_top5,
            last_updated
        )
        WITH
        player_base_info AS (
            SELECT
                p.player_id,
                p.name,
                p.selected_club
            FROM public.players p
            WHERE p.player_id = v_numeric_id
        ),
        player_max_goals_in_game AS ( -- Calculate max goals separately to avoid issues in subquery
            SELECT MAX(pm_inner.goals) as max_goals
            FROM public.player_matches pm_inner
            WHERE pm_inner.player_id = v_numeric_id
        ),
        player_match_aggregated_stats AS (
          SELECT
            pm.player_id,
            COUNT(pm.match_id) as games_played,
            SUM(
                calculate_match_fantasy_points(
                    pm.result,
                    pm.heavy_win,
                    pm.heavy_loss,
                    CASE
                        WHEN pm.team = 'A' AND m.team_b_score = 0 THEN TRUE
                        WHEN pm.team = 'B' AND m.team_a_score = 0 THEN TRUE
                        ELSE FALSE
                    END -- clean_sheet
                )
            ) as fantasy_points,
            MAX(pm.goals) as most_game_goals,
            (
              SELECT m2.match_date::text
              FROM public.player_matches pm2
              JOIN public.matches m2 ON pm2.match_id = m2.match_id
              WHERE pm2.player_id = v_numeric_id
                AND pm2.goals = (SELECT max_goals FROM player_max_goals_in_game) -- Use pre-calculated max goals
              ORDER BY m2.match_date DESC, m2.match_id DESC
              LIMIT 1
            ) as most_game_goals_date
          FROM public.player_matches pm
          JOIN public.matches m ON pm.match_id = m.match_id
          WHERE pm.player_id = v_numeric_id
          GROUP BY pm.player_id
        ),
        player_season_goals_stats AS (
            SELECT
                most_goals.goals_scored as most_season_goals,
                most_goals.year::text as most_season_goals_year
            FROM (
                SELECT
                  EXTRACT(YEAR FROM m.match_date) as year,
                  SUM(pm.goals) as goals_scored,
                  ROW_NUMBER() OVER (ORDER BY SUM(pm.goals) DESC, EXTRACT(YEAR FROM m.match_date) DESC) as rn
                FROM public.player_matches pm
                JOIN public.matches m ON pm.match_id = m.match_id
                WHERE pm.player_id = v_numeric_id
                GROUP BY EXTRACT(YEAR FROM m.match_date)
            ) most_goals
            WHERE rn = 1
            LIMIT 1 -- Ensure only one record if multiple years have the same max goals
        ),
        streaks AS (
          WITH numbered_matches AS (
            SELECT
              m.match_date, m.match_id, -- Added match_id for consistent ordering
              pm.result,
              ROW_NUMBER() OVER (PARTITION BY pm.player_id ORDER BY m.match_date, m.match_id) as match_num
            FROM public.player_matches pm
            JOIN public.matches m ON pm.match_id = m.match_id
            WHERE pm.player_id = v_numeric_id
          ),
          win_gaps AS ( SELECT match_date, match_num, match_num - ROW_NUMBER() OVER (ORDER BY match_date, match_id) as grp FROM numbered_matches WHERE result = 'win' ),
          loss_gaps AS ( SELECT match_date, match_num, match_num - ROW_NUMBER() OVER (ORDER BY match_date, match_id) as grp FROM numbered_matches WHERE result = 'loss' ),
          undefeated_gaps AS ( SELECT match_date, match_num, match_num - ROW_NUMBER() OVER (ORDER BY match_date, match_id) as grp FROM numbered_matches WHERE result != 'loss' ),
          winless_gaps AS ( SELECT match_date, match_num, match_num - ROW_NUMBER() OVER (ORDER BY match_date, match_id) as grp FROM numbered_matches WHERE result != 'win' ),
          win_streak_calc AS ( SELECT COUNT(*) as streak, MIN(match_date)::text as start_date, MAX(match_date)::text as end_date FROM win_gaps GROUP BY grp ORDER BY COUNT(*) DESC, MAX(match_date) DESC LIMIT 1 ),
          loss_streak_calc AS ( SELECT COUNT(*) as streak, MIN(match_date)::text as start_date, MAX(match_date)::text as end_date FROM loss_gaps GROUP BY grp ORDER BY COUNT(*) DESC, MAX(match_date) DESC LIMIT 1 ),
          undefeated_streak_calc AS ( SELECT COUNT(*) as streak, MIN(match_date)::text as start_date, MAX(match_date)::text as end_date FROM undefeated_gaps GROUP BY grp ORDER BY COUNT(*) DESC, MAX(match_date) DESC LIMIT 1 ),
          winless_streak_calc AS ( SELECT COUNT(*) as streak, MIN(match_date)::text as start_date, MAX(match_date)::text as end_date FROM winless_gaps GROUP BY grp ORDER BY COUNT(*) DESC, MAX(match_date) DESC LIMIT 1 )
          SELECT
            COALESCE(wsc.streak, 0) as win_streak,
            CASE WHEN wsc.streak > 0 THEN wsc.start_date || ' to ' || wsc.end_date ELSE NULL END as win_streak_dates,
            COALESCE(lsc.streak, 0) as losing_streak,
            CASE WHEN lsc.streak > 0 THEN lsc.start_date || ' to ' || lsc.end_date ELSE NULL END as losing_streak_dates,
            COALESCE(usc.streak, 0) as undefeated_streak,
            CASE WHEN usc.streak > 0 THEN usc.start_date || ' to ' || usc.end_date ELSE NULL END as undefeated_streak_dates,
            COALESCE(wlsc.streak, 0) as winless_streak,
            CASE WHEN wlsc.streak > 0 THEN wlsc.start_date || ' to ' || wlsc.end_date ELSE NULL END as winless_streak_dates
          FROM (SELECT 1) dummy_left_join -- To ensure a row even if no streaks
          LEFT JOIN win_streak_calc wsc ON true
          LEFT JOIN loss_streak_calc lsc ON true
          LEFT JOIN undefeated_streak_calc usc ON true
          LEFT JOIN winless_streak_calc wlsc ON true
        ),
        attendance_streak_calc AS (
            WITH all_matches_ordered AS (
                SELECT
                    m.match_id,
                    m.match_date,
                    ROW_NUMBER() OVER (ORDER BY m.match_date, m.match_id) as overall_match_seq_num
                FROM public.matches m
                WHERE m.match_date <= COALESCE( -- Consider all matches up to player's last game or system's last game
                    (SELECT MAX(m_sub.match_date) 
                     FROM public.player_matches pm_sub 
                     JOIN public.matches m_sub ON pm_sub.match_id = m_sub.match_id 
                     WHERE pm_sub.player_id = v_numeric_id),
                    (SELECT MAX(match_date) FROM public.matches)
                )
            ),
            player_attendance_status AS (
                SELECT
                    amo.match_id,
                    amo.match_date,
                    amo.overall_match_seq_num,
                    (pm.player_id IS NOT NULL) AS attended_this_match
                FROM all_matches_ordered amo
                LEFT JOIN public.player_matches pm ON amo.match_id = pm.match_id AND pm.player_id = v_numeric_id
            ),
            attendance_groups AS (
                -- This creates a grouping key for each continuous block of attended or missed matches
                SELECT
                    pas.attended_this_match,
                    pas.overall_match_seq_num - ROW_NUMBER() OVER (PARTITION BY pas.attended_this_match ORDER BY pas.match_date, pas.match_id) as attendance_group_key
                FROM player_attendance_status pas
            ),
            individual_attendance_streaks AS (
                -- This counts the length of each continuous block of attended matches
                SELECT
                    COUNT(*) as streak_len
                FROM attendance_groups ag
                WHERE ag.attended_this_match = TRUE -- Only count streaks of attendance
                GROUP BY ag.attendance_group_key
            )
            -- Select the maximum length from all identified attendance streaks
            SELECT COALESCE(MAX(ias.streak_len), 0) as max_attendance_streak
            FROM individual_attendance_streaks ias
        ),
        yearly_stats_calc AS (
          SELECT
            COALESCE(json_agg(json_build_object(
                'year', ys.year,
                'games_played', ys.games_played,
                'goals_scored', ys.goals_scored,
                'fantasy_points', ys.fantasy_points,
                'minutes_per_goal', ROUND(ys.games_played * get_config_value('match_duration_minutes', '60')::numeric / NULLIF(ys.goals_scored, 0), 1),
                'points_per_game', ROUND(ys.fantasy_points::numeric / NULLIF(ys.games_played, 0), 1)
            ) ORDER BY ys.year DESC), '[]'::json) as yearly_stats_json
          FROM (
            SELECT
              EXTRACT(YEAR FROM m.match_date)::integer as year,
              COUNT(pm.match_id) as games_played,
              SUM(pm.goals) as goals_scored,
              SUM(
                calculate_match_fantasy_points(
                    pm.result,
                    pm.heavy_win,
                    pm.heavy_loss,
                    CASE
                        WHEN pm.team = 'A' AND m.team_b_score = 0 THEN TRUE
                        WHEN pm.team = 'B' AND m.team_a_score = 0 THEN TRUE
                        ELSE FALSE
                    END -- clean_sheet for player's team
                )
            ) as fantasy_points
            FROM public.player_matches pm
            JOIN public.matches m ON pm.match_id = m.match_id
            WHERE pm.player_id = v_numeric_id
            GROUP BY EXTRACT(YEAR FROM m.match_date)
          ) ys
        ),
        teammate_data AS (
            SELECT
                pm_teammate.player_id as teammate_id,
                p_teammate.name as teammate_name,
                COUNT(DISTINCT m.match_id) as games_played_with,
                AVG(
                    calculate_match_fantasy_points(
                        pm_player.result,
                        pm_player.heavy_win,
                        pm_player.heavy_loss,
                        CASE
                            WHEN pm_player.team = 'A' AND m.team_b_score = 0 THEN TRUE
                            WHEN pm_player.team = 'B' AND m.team_a_score = 0 THEN TRUE
                            ELSE FALSE
                        END -- clean_sheet for player's team
                    )
                ) as player_avg_fp_with_teammate -- This is the *current* player's avg FP when playing with this teammate
            FROM public.player_matches pm_player
            JOIN public.matches m ON pm_player.match_id = m.match_id
            JOIN public.player_matches pm_teammate ON m.match_id = pm_teammate.match_id
                AND pm_player.team = pm_teammate.team -- Must be on the same team
                AND pm_player.player_id != pm_teammate.player_id -- Must not be the player themselves
            JOIN public.players p_teammate ON pm_teammate.player_id = p_teammate.player_id
            WHERE pm_player.player_id = v_numeric_id
              AND p_teammate.is_ringer = FALSE AND p_teammate.is_retired = FALSE -- Consider only active, non-ringer teammates
            GROUP BY pm_teammate.player_id, p_teammate.name
            HAVING COUNT(DISTINCT m.match_id) >= 5 -- Added condition for min 5 games played together
        ),
        teammate_frequency_top5_calc AS (
            SELECT
                COALESCE(json_agg(json_build_object(
                    'player_id', td.teammate_id,
                    'name', td.teammate_name,
                    'games_played_with', td.games_played_with
                ) ORDER BY td.games_played_with DESC, td.teammate_name ASC), '[]'::json) as teammate_freq_json
            FROM (SELECT * FROM teammate_data ORDER BY games_played_with DESC, teammate_name ASC LIMIT 5) td
        ),
        teammate_performance_high_top5_calc AS (
            SELECT
                COALESCE(json_agg(json_build_object(
                    'player_id', td.teammate_id,
                    'name', td.teammate_name,
                    'average_fantasy_points_with', ROUND(td.player_avg_fp_with_teammate::numeric, 2)
                ) ORDER BY td.player_avg_fp_with_teammate DESC, td.games_played_with DESC, td.teammate_name ASC), '[]'::json) as teammate_perf_high_json
            FROM (SELECT * FROM teammate_data WHERE teammate_data.player_avg_fp_with_teammate IS NOT NULL ORDER BY player_avg_fp_with_teammate DESC, games_played_with DESC, teammate_name ASC LIMIT 5) td
        ),
        teammate_performance_low_top5_calc AS (
            SELECT
                COALESCE(json_agg(json_build_object(
                    'player_id', td.teammate_id,
                    'name', td.teammate_name,
                    'average_fantasy_points_with', ROUND(td.player_avg_fp_with_teammate::numeric, 2)
                ) ORDER BY td.player_avg_fp_with_teammate ASC, td.games_played_with DESC, td.teammate_name ASC), '[]'::json) as teammate_perf_low_json
            FROM (SELECT * FROM teammate_data WHERE teammate_data.player_avg_fp_with_teammate IS NOT NULL ORDER BY player_avg_fp_with_teammate ASC, games_played_with DESC, teammate_name ASC LIMIT 5) td
        )
        SELECT
            pbi.player_id,
            pbi.name,
            COALESCE(pmas.games_played, 0),
            COALESCE(pmas.fantasy_points, 0),
            pmas.most_game_goals,
            pmas.most_game_goals_date,
            psgs.most_season_goals,
            psgs.most_season_goals_year,
            s.win_streak,
            s.win_streak_dates,
            s.losing_streak,
            s.losing_streak_dates,
            s.undefeated_streak,
            s.undefeated_streak_dates,
            s.winless_streak,
            s.winless_streak_dates,
            COALESCE(asc_calc.max_attendance_streak, 0), -- Use max_attendance_streak here
            pbi.selected_club, -- This should be JSONB from players table
            ysc.yearly_stats_json,
            tft5.teammate_freq_json,
            tpht5.teammate_perf_high_json,
            tplt5.teammate_perf_low_json,
            NOW() -- last_updated
        FROM player_base_info pbi
        LEFT JOIN player_match_aggregated_stats pmas ON pbi.player_id = pmas.player_id
        LEFT JOIN player_season_goals_stats psgs ON true -- Only one row expected
        LEFT JOIN streaks s ON true -- Only one row expected
        LEFT JOIN attendance_streak_calc asc_calc ON true -- Will be empty if player has no games, COALESCE handles this
        LEFT JOIN yearly_stats_calc ysc ON true
        LEFT JOIN teammate_frequency_top5_calc tft5 ON true
        LEFT JOIN teammate_performance_high_top5_calc tpht5 ON true
        LEFT JOIN teammate_performance_low_top5_calc tplt5 ON true;

        RAISE NOTICE 'Finished processing for player_id: %', v_numeric_id;

    END LOOP;

    -- Update cache_metadata
    RAISE NOTICE 'Updating cache_metadata for player_profile_stats...';
    INSERT INTO public.cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('player_profile_stats', NOW(), 'player_profile_stats')
    ON CONFLICT (cache_key) DO UPDATE
    SET last_invalidated = NOW(),
        dependency_type = excluded.dependency_type;

    RAISE NOTICE 'Finished update_aggregated_player_profile_stats processing (v2 with fixes).';
END;
$$; 