-- sql/update_aggregated_player_profile_stats.sql
CREATE OR REPLACE FUNCTION update_aggregated_player_profile_stats()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    RAISE NOTICE 'Starting update_aggregated_player_profile_stats processing (v3, single-query)...';

    -- Clear the table before repopulating
    RAISE NOTICE 'Clearing existing data from aggregated_player_profile_stats...';
    TRUNCATE TABLE public.aggregated_player_profile_stats;

    RAISE NOTICE 'Calculating all player profiles in a single query...';

    INSERT INTO public.aggregated_player_profile_stats (
        player_id, name, games_played, fantasy_points, most_game_goals,
        most_game_goals_date, most_season_goals, most_season_goals_year,
        win_streak, win_streak_dates, losing_streak, losing_streak_dates,
        undefeated_streak, undefeated_streak_dates, winless_streak,
        winless_streak_dates, scoring_streak, scoring_streak_dates,
        attendance_streak, attendance_streak_dates, selected_club, yearly_stats, 
        teammate_chemistry_all, last_updated
    )
    WITH
    -- 1. Aggregate base match stats for all non-ringer players
    player_match_stats AS (
        SELECT
            p.player_id,
            p.name,
            p.selected_club,
            COUNT(pm.match_id) as games_played,
            SUM(
                calculate_match_fantasy_points(
                    pm.result, pm.heavy_win, pm.heavy_loss,
                    CASE
                        WHEN pm.team = 'A' AND m.team_b_score = 0 THEN TRUE
                        WHEN pm.team = 'B' AND m.team_a_score = 0 THEN TRUE
                        ELSE FALSE
                    END
                )
            ) as fantasy_points
        FROM public.players p
        LEFT JOIN public.player_matches pm ON p.player_id = pm.player_id
        LEFT JOIN public.matches m ON pm.match_id = m.match_id
        WHERE p.is_retired = FALSE
        GROUP BY p.player_id, p.name, p.selected_club
    ),
    -- 2. Most goals in a single game and the date it happened
    player_most_goals_game AS (
        SELECT
            player_id,
            goals as most_game_goals,
            match_date::text as most_game_goals_date
        FROM (
            SELECT
                pm.player_id,
                pm.goals,
                m.match_date,
                ROW_NUMBER() OVER(PARTITION BY pm.player_id ORDER BY pm.goals DESC, m.match_date DESC, m.match_id DESC) as rn
            FROM public.player_matches pm
            JOIN public.matches m ON pm.match_id = m.match_id
            WHERE pm.goals > 0
        ) q WHERE rn = 1
    ),
    -- 3. Most goals in a single season and the year it happened
    player_most_goals_season AS (
        SELECT
            player_id,
            goals_scored as most_season_goals,
            year::text as most_season_goals_year
        FROM (
            SELECT
                pm.player_id,
                EXTRACT(YEAR FROM m.match_date) as year,
                SUM(pm.goals) as goals_scored,
                ROW_NUMBER() OVER (PARTITION BY pm.player_id ORDER BY SUM(pm.goals) DESC, EXTRACT(YEAR FROM m.match_date) DESC) as rn
            FROM public.player_matches pm
            JOIN public.matches m ON pm.match_id = m.match_id
            WHERE pm.goals > 0
            GROUP BY pm.player_id, EXTRACT(YEAR FROM m.match_date)
        ) q WHERE rn = 1
    ),
    -- 4. All-time best streaks for each type
    player_streaks AS (
        WITH numbered_matches AS (
            SELECT
                pm.player_id, m.match_date, m.match_id, pm.result,
                ROW_NUMBER() OVER (PARTITION BY pm.player_id ORDER BY m.match_date, m.match_id) as match_num
            FROM public.player_matches pm JOIN public.matches m ON pm.match_id = m.match_id
        ),
        streak_groups AS (
            SELECT
                player_id, result, match_date,
                match_num - ROW_NUMBER() OVER (PARTITION BY player_id, result ORDER BY match_date, match_id) as result_group,
                match_num - ROW_NUMBER() OVER (PARTITION BY player_id, CASE WHEN result != 'loss' THEN 1 ELSE 0 END ORDER BY match_date, match_id) as undefeated_group,
                match_num - ROW_NUMBER() OVER (PARTITION BY player_id, CASE WHEN result != 'win' THEN 1 ELSE 0 END ORDER BY match_date, match_id) as winless_group
            FROM numbered_matches
        ),
        streaks_by_length AS (
            SELECT player_id, 'win' as type, COUNT(*) as streak, MIN(match_date) as start_date, MAX(match_date) as end_date FROM streak_groups WHERE result = 'win' GROUP BY player_id, result_group
            UNION ALL
            SELECT player_id, 'loss' as type, COUNT(*) as streak, MIN(match_date) as start_date, MAX(match_date) as end_date FROM streak_groups WHERE result = 'loss' GROUP BY player_id, result_group
            UNION ALL
            SELECT player_id, 'undefeated' as type, COUNT(*) as streak, MIN(match_date) as start_date, MAX(match_date) as end_date FROM streak_groups WHERE result != 'loss' GROUP BY player_id, undefeated_group
            UNION ALL
            SELECT player_id, 'winless' as type, COUNT(*) as streak, MIN(match_date) as start_date, MAX(match_date) as end_date FROM streak_groups WHERE result != 'win' GROUP BY player_id, winless_group
        ),
        max_streaks AS (
            SELECT player_id, type, streak, start_date::text || ' to ' || end_date::text as dates
            FROM (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY player_id, type ORDER BY streak DESC, end_date DESC) as rn
                FROM streaks_by_length
            ) q WHERE rn = 1
        )
        SELECT
            player_id,
            MAX(CASE WHEN type = 'win' THEN streak END) as win_streak,
            MAX(CASE WHEN type = 'win' THEN dates END) as win_streak_dates,
            MAX(CASE WHEN type = 'loss' THEN streak END) as losing_streak,
            MAX(CASE WHEN type = 'loss' THEN dates END) as losing_streak_dates,
            MAX(CASE WHEN type = 'undefeated' THEN streak END) as undefeated_streak,
            MAX(CASE WHEN type = 'undefeated' THEN dates END) as undefeated_streak_dates,
            MAX(CASE WHEN type = 'winless' THEN streak END) as winless_streak,
            MAX(CASE WHEN type = 'winless' THEN dates END) as winless_streak_dates
        FROM max_streaks
        GROUP BY player_id
    ),
    -- 5. All-time best scoring streak (with dates)
    player_scoring_streak AS (
        WITH numbered_goal_matches AS (
            SELECT
                pm.player_id, m.match_date, m.match_id, pm.goals,
                ROW_NUMBER() OVER (PARTITION BY pm.player_id ORDER BY m.match_date, m.match_id) as match_num
            FROM public.player_matches pm 
            JOIN public.matches m ON pm.match_id = m.match_id
            JOIN public.players p ON pm.player_id = p.player_id
            WHERE p.is_retired = FALSE
        ),
        scoring_groups AS (
            SELECT 
                player_id, match_date, goals,
                match_num - ROW_NUMBER() OVER (PARTITION BY player_id, CASE WHEN goals > 0 THEN 1 ELSE 0 END ORDER BY match_date, match_id) as scoring_group
            FROM numbered_goal_matches
        ),
        scoring_streaks AS (
            SELECT 
                player_id, 
                COUNT(*) as streak_len,
                MIN(match_date) as start_date,
                MAX(match_date) as end_date
            FROM scoring_groups 
            WHERE goals > 0
            GROUP BY player_id, scoring_group
        ),
        max_scoring_streaks AS (
            SELECT 
                player_id, 
                streak_len as max_scoring_streak,
                start_date::text || ' to ' || end_date::text as scoring_streak_dates,
                ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY streak_len DESC, end_date DESC) as rn
            FROM scoring_streaks
        )
        SELECT player_id, max_scoring_streak, scoring_streak_dates
        FROM max_scoring_streaks WHERE rn = 1
    ),
    
    -- 6. All-time best attendance streak (with dates)
    player_attendance_streak AS (
        WITH all_matches AS (
            SELECT match_id, match_date, ROW_NUMBER() OVER (ORDER BY match_date, match_id) as seq
            FROM public.matches
        ),
        player_attendance AS (
            SELECT p.player_id, am.seq, am.match_date, (pm.player_id IS NOT NULL) as attended
            FROM public.players p
            CROSS JOIN all_matches am
            LEFT JOIN public.player_matches pm ON p.player_id = pm.player_id AND am.match_id = pm.match_id
            WHERE p.is_retired = FALSE
        ),
        attendance_groups AS (
            SELECT player_id, attended, seq, match_date, seq - ROW_NUMBER() OVER (PARTITION BY player_id, attended ORDER BY seq) as grp
            FROM player_attendance
        ),
        streaks_with_dates AS (
            SELECT 
                player_id, 
                COUNT(*) as streak_len,
                MIN(match_date) as start_date,
                MAX(match_date) as end_date
            FROM attendance_groups 
            WHERE attended = TRUE 
            GROUP BY player_id, grp
        ),
        max_streaks AS (
            SELECT 
                player_id, 
                streak_len as max_attendance_streak,
                start_date::text || ' to ' || end_date::text as attendance_streak_dates,
                ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY streak_len DESC, end_date DESC) as rn
            FROM streaks_with_dates
        )
        SELECT player_id, max_attendance_streak, attendance_streak_dates
        FROM max_streaks WHERE rn = 1
    ),
    -- 6. Yearly stats aggregated into a JSON array
    player_yearly_stats AS (
        SELECT
            player_id,
            COALESCE(json_agg(json_build_object(
                'year', year, 'games_played', games_played, 'goals_scored', goals_scored,
                'fantasy_points', fantasy_points,
                'minutes_per_goal', ROUND(games_played * get_config_value('match_duration_minutes', '60')::numeric / NULLIF(goals_scored, 0), 1),
                'points_per_game', ROUND(fantasy_points::numeric / NULLIF(games_played, 0), 1)
            ) ORDER BY year DESC), '[]'::json) as yearly_stats_json
        FROM (
            SELECT
                pm.player_id,
                EXTRACT(YEAR FROM m.match_date)::integer as year,
                COUNT(pm.match_id) as games_played,
                SUM(pm.goals) as goals_scored,
                SUM(calculate_match_fantasy_points(
                    pm.result, pm.heavy_win, pm.heavy_loss,
                    CASE WHEN pm.team = 'A' AND m.team_b_score = 0 THEN TRUE WHEN pm.team = 'B' AND m.team_a_score = 0 THEN TRUE ELSE FALSE END
                )) as fantasy_points
            FROM public.player_matches pm JOIN public.matches m ON pm.match_id = m.match_id
            GROUP BY pm.player_id, EXTRACT(YEAR FROM m.match_date)
        ) ys
        GROUP BY player_id
    ),
    -- 7. Teammate stats
    teammate_data AS (
        SELECT
            pm_player.player_id,
            pm_teammate.player_id as teammate_id,
            p_teammate.name as teammate_name,
            COUNT(DISTINCT m.match_id) as games_played_with,
            AVG(
                calculate_match_fantasy_points(
                    pm_player.result, pm_player.heavy_win, pm_player.heavy_loss,
                    CASE WHEN pm_player.team = 'A' AND m.team_b_score = 0 THEN TRUE WHEN pm_player.team = 'B' AND m.team_a_score = 0 THEN TRUE ELSE FALSE END
                )
            ) as player_avg_fp_with_teammate
        FROM public.player_matches pm_player
        JOIN public.matches m ON pm_player.match_id = m.match_id
        JOIN public.player_matches pm_teammate ON m.match_id = pm_teammate.match_id AND pm_player.team = pm_teammate.team AND pm_player.player_id != pm_teammate.player_id
        JOIN public.players p_teammate ON pm_teammate.player_id = p_teammate.player_id
        WHERE p_teammate.is_ringer = FALSE AND p_teammate.is_retired = FALSE
        GROUP BY pm_player.player_id, pm_teammate.player_id, p_teammate.name
        HAVING COUNT(DISTINCT m.match_id) >= 10
    ),
    teammate_stats_json AS (
        SELECT
            player_id,
            COALESCE(json_agg(
                json_build_object(
                    'player_id', teammate_id, 
                    'name', teammate_name, 
                    'games_played_with', games_played_with,
                    'average_fantasy_points_with', ROUND(player_avg_fp_with_teammate::numeric, 2)
                ) ORDER BY player_avg_fp_with_teammate DESC
            ), '[]'::json) as teammate_chemistry_all
        FROM teammate_data 
        WHERE player_avg_fp_with_teammate IS NOT NULL
        GROUP BY player_id
    )
    -- Final SELECT to join all CTEs
    SELECT
        pms.player_id, pms.name,
        COALESCE(pms.games_played, 0), COALESCE(pms.fantasy_points, 0),
        pmgg.most_game_goals, pmgg.most_game_goals_date,
        pmgs.most_season_goals, pmgs.most_season_goals_year,
        COALESCE(ps.win_streak, 0), ps.win_streak_dates,
        COALESCE(ps.losing_streak, 0), ps.losing_streak_dates,
        COALESCE(ps.undefeated_streak, 0), ps.undefeated_streak_dates,
        COALESCE(ps.winless_streak, 0), ps.winless_streak_dates,
        COALESCE(pss.max_scoring_streak, 0), pss.scoring_streak_dates,
        COALESCE(pas.max_attendance_streak, 0), pas.attendance_streak_dates,
        pms.selected_club,
        COALESCE(pys.yearly_stats_json, '[]'::json),
        COALESCE(tsj.teammate_chemistry_all, '[]'::json),
        NOW() -- last_updated
    FROM player_match_stats pms
    LEFT JOIN player_most_goals_game pmgg ON pms.player_id = pmgg.player_id
    LEFT JOIN player_most_goals_season pmgs ON pms.player_id = pmgs.player_id
    LEFT JOIN player_streaks ps ON pms.player_id = ps.player_id
    LEFT JOIN player_scoring_streak pss ON pms.player_id = pss.player_id
    LEFT JOIN player_attendance_streak pas ON pms.player_id = pas.player_id
    LEFT JOIN player_yearly_stats pys ON pms.player_id = pys.player_id
    LEFT JOIN teammate_stats_json tsj ON pms.player_id = tsj.player_id;

    RAISE NOTICE 'Finished calculating all player profiles.';

    -- Update cache_metadata
    RAISE NOTICE 'Updating cache_metadata for player_profile_stats...';
    INSERT INTO public.cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('player_profile_stats', NOW(), 'player_profile_stats')
    ON CONFLICT (cache_key) DO UPDATE
    SET last_invalidated = NOW(),
        dependency_type = excluded.dependency_type;

    RAISE NOTICE 'Finished update_aggregated_player_profile_stats processing (v3, single-query).';
END;
$$; 