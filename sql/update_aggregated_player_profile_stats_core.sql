-- sql/update_aggregated_player_profile_stats_core.sql
-- Core player stats calculation (Steps 1-5, 7 from original function)
-- Excludes expensive attendance streaks (Step 6) and teammate stats (Step 8)
CREATE OR REPLACE FUNCTION update_aggregated_player_profile_stats_core()
RETURNS TABLE(
    player_id INTEGER,
    name TEXT,
    selected_club TEXT,
    games_played INTEGER,
    fantasy_points INTEGER,
    most_game_goals INTEGER,
    most_game_goals_date TEXT,
    most_season_goals INTEGER, 
    most_season_goals_year TEXT,
    win_streak INTEGER,
    win_streak_dates TEXT,
    losing_streak INTEGER,
    losing_streak_dates TEXT,
    undefeated_streak INTEGER,
    undefeated_streak_dates TEXT,
    winless_streak INTEGER,
    winless_streak_dates TEXT,
    scoring_streak INTEGER,
    scoring_streak_dates TEXT,
    yearly_stats_json JSON
) LANGUAGE plpgsql AS $$
DECLARE
    start_time TIMESTAMPTZ;
    block_start_time TIMESTAMPTZ;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE 'Starting update_aggregated_player_profile_stats_core processing (v4, core-only)...';

    -- Step 1: Create temporary table for base stats
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Step 1: Calculating player_match_stats...';
    
    CREATE TEMP TABLE temp_player_match_stats AS
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
    WHERE p.is_ringer = FALSE
    GROUP BY p.player_id, p.name, p.selected_club;
    
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp)
    VALUES ('update_aggregated_player_profile_stats_core', 'Step 1 (player_match_stats) completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW());

    -- Step 2: Most goals in a game
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Step 2: Calculating player_most_goals_game...';
    
    CREATE TEMP TABLE temp_player_most_goals_game AS
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
    ) q WHERE rn = 1;
    
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp)
    VALUES ('update_aggregated_player_profile_stats_core', 'Step 2 (player_most_goals_game) completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW());

    -- Step 3: Most goals in a season
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Step 3: Calculating player_most_goals_season...';
    
    CREATE TEMP TABLE temp_player_most_goals_season AS
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
    ) q WHERE rn = 1;
    
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp)
    VALUES ('update_aggregated_player_profile_stats_core', 'Step 3 (player_most_goals_season) completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW());

    -- Step 4: Player streaks (this is the complex one)
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Step 4: Calculating player_streaks...';
    
    CREATE TEMP TABLE temp_player_streaks AS
    WITH
    numbered_matches AS (
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
    GROUP BY player_id;
    
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp)
    VALUES ('update_aggregated_player_profile_stats_core', 'Step 4 (player_streaks) completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW());

    -- Step 5: Scoring streaks
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Step 5: Calculating player_scoring_streak...';
    
    CREATE TEMP TABLE temp_player_scoring_streak AS
    WITH
    numbered_goal_matches AS (
        SELECT
            pm.player_id, m.match_date, m.match_id, pm.goals,
            ROW_NUMBER() OVER (PARTITION BY pm.player_id ORDER BY m.match_date, m.match_id) as match_num
        FROM public.player_matches pm 
        JOIN public.matches m ON pm.match_id = m.match_id
        JOIN public.players p ON pm.player_id = p.player_id
        WHERE p.is_ringer = FALSE
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
    FROM max_scoring_streaks WHERE rn = 1;
    
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp)
    VALUES ('update_aggregated_player_profile_stats_core', 'Step 5 (player_scoring_streak) completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW());

    -- Step 7: Yearly stats (moved from original Step 7)
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Step 7: Calculating player_yearly_stats...';
    
    CREATE TEMP TABLE temp_player_yearly_stats AS
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
    GROUP BY player_id;
    
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp)
    VALUES ('update_aggregated_player_profile_stats_core', 'Step 7 (player_yearly_stats) completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW());

    -- Return combined core data
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Returning core player profile data...';

    RETURN QUERY
    SELECT
        pms.player_id, pms.name, pms.selected_club,
        COALESCE(pms.games_played, 0), COALESCE(pms.fantasy_points, 0),
        pmgg.most_game_goals, pmgg.most_game_goals_date,
        pmgs.most_season_goals, pmgs.most_season_goals_year,
        COALESCE(ps.win_streak, 0), ps.win_streak_dates,
        COALESCE(ps.losing_streak, 0), ps.losing_streak_dates,
        COALESCE(ps.undefeated_streak, 0), ps.undefeated_streak_dates,
        COALESCE(ps.winless_streak, 0), ps.winless_streak_dates,
        COALESCE(pss.max_scoring_streak, 0), pss.scoring_streak_dates,
        COALESCE(pys.yearly_stats_json, '[]'::json)
    FROM temp_player_match_stats pms
    LEFT JOIN temp_player_most_goals_game pmgg ON pms.player_id = pmgg.player_id
    LEFT JOIN temp_player_most_goals_season pmgs ON pms.player_id = pmgs.player_id
    LEFT JOIN temp_player_streaks ps ON pms.player_id = ps.player_id
    LEFT JOIN temp_player_scoring_streak pss ON pms.player_id = pss.player_id
    LEFT JOIN temp_player_yearly_stats pys ON pms.player_id = pys.player_id;

    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp)
    VALUES ('update_aggregated_player_profile_stats_core', 'Core data return completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW());

    RAISE NOTICE 'Finished update_aggregated_player_profile_stats_core processing. Total time: %ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time);
END;
$$;
