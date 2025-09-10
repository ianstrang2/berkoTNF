-- sql/update_aggregated_player_attendance_streaks.sql
-- Expensive attendance streak calculation (Step 6 from original function)
-- Isolated due to CROSS JOIN performance impact
CREATE OR REPLACE FUNCTION update_aggregated_player_attendance_streaks()
RETURNS TABLE(
    player_id INTEGER,
    attendance_streak INTEGER,
    attendance_streak_dates TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    start_time TIMESTAMPTZ;
    block_start_time TIMESTAMPTZ;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE 'Starting update_aggregated_player_attendance_streaks processing (v4, attendance-only)...';

    -- Step 6: Attendance streaks (this is expensive due to CROSS JOIN)
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Step 6: Calculating player_attendance_streak...';
    
    CREATE TEMP TABLE temp_player_attendance_streak AS
    WITH
    all_matches AS (
        SELECT match_id, match_date, ROW_NUMBER() OVER (ORDER BY match_date, match_id) as seq
        FROM public.matches
    ),
    player_attendance AS (
        SELECT p.player_id, am.seq, am.match_date, (pm.player_id IS NOT NULL) as attended
        FROM public.players p
        CROSS JOIN all_matches am
        LEFT JOIN public.player_matches pm ON p.player_id = pm.player_id AND am.match_id = pm.match_id
        WHERE p.is_ringer = FALSE
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
    FROM max_streaks WHERE rn = 1;
    
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp)
    VALUES ('update_aggregated_player_attendance_streaks', 'Step 6 (player_attendance_streak) completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW());

    -- Return attendance data
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Returning attendance streak data...';

    RETURN QUERY
    SELECT 
        pas.player_id,
        COALESCE(pas.max_attendance_streak, 0) as attendance_streak,
        pas.attendance_streak_dates
    FROM temp_player_attendance_streak pas;

    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp)
    VALUES ('update_aggregated_player_attendance_streaks', 'Attendance data return completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW());

    RAISE NOTICE 'Finished update_aggregated_player_attendance_streaks processing. Total time: %ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time);
END;
$$;
