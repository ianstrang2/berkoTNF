-- sql/update_aggregated_player_profile_stats_wrapper.sql
-- Wrapper function that orchestrates the split player profile stats functions
-- Calls core, attendance, and teammate functions then assembles the final result
CREATE OR REPLACE FUNCTION update_aggregated_player_profile_stats_all()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    start_time TIMESTAMPTZ;
    block_start_time TIMESTAMPTZ;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE 'Starting update_aggregated_player_profile_stats_all processing (v4, wrapper function)...';

    -- Clear the table before repopulating
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Clearing existing data from aggregated_player_profile_stats...';
    TRUNCATE TABLE public.aggregated_player_profile_stats;
    
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp)
    VALUES ('update_aggregated_player_profile_stats_all', 'TRUNCATE completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW());

    RAISE NOTICE 'Calling split functions and combining results...';
    
    -- Final step: Combine all data from the three split functions
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Final step: Combining all data and inserting...';
    
    INSERT INTO public.aggregated_player_profile_stats (
        player_id, name, games_played, fantasy_points, most_game_goals,
        most_game_goals_date, most_season_goals, most_season_goals_year,
        win_streak, win_streak_dates, losing_streak, losing_streak_dates,
        undefeated_streak, undefeated_streak_dates, winless_streak,
        winless_streak_dates, scoring_streak, scoring_streak_dates,
        attendance_streak, attendance_streak_dates, selected_club, yearly_stats, 
        teammate_chemistry_all, last_updated
    )
    SELECT
        core.player_id, core.name,
        COALESCE(core.games_played, 0), COALESCE(core.fantasy_points, 0),
        core.most_game_goals, core.most_game_goals_date,
        core.most_season_goals, core.most_season_goals_year,
        COALESCE(core.win_streak, 0), core.win_streak_dates,
        COALESCE(core.losing_streak, 0), core.losing_streak_dates,
        COALESCE(core.undefeated_streak, 0), core.undefeated_streak_dates,
        COALESCE(core.winless_streak, 0), core.winless_streak_dates,
        COALESCE(core.scoring_streak, 0), core.scoring_streak_dates,
        COALESCE(attendance.attendance_streak, 0), attendance.attendance_streak_dates,
        core.selected_club,
        COALESCE(core.yearly_stats_json, '[]'::json),
        COALESCE(teammate.teammate_chemistry_all, '[]'::json),
        NOW() -- last_updated
    FROM update_aggregated_player_profile_stats_core() core
    LEFT JOIN update_aggregated_player_attendance_streaks() attendance 
        ON core.player_id = attendance.player_id
    LEFT JOIN update_aggregated_teammate_stats() teammate 
        ON core.player_id = teammate.player_id;
    
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp)
    VALUES ('update_aggregated_player_profile_stats_all', 'Final step (data combination) completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW());

    RAISE NOTICE 'Finished calculating all player profiles.';

    -- Update cache_metadata
    RAISE NOTICE 'Updating cache_metadata for player_profile_stats...';
    INSERT INTO public.cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('player_profile_stats', NOW(), 'player_profile_stats')
    ON CONFLICT (cache_key) DO UPDATE
    SET last_invalidated = NOW(),
        dependency_type = excluded.dependency_type;

    -- Log total execution time
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp)
    VALUES ('update_aggregated_player_profile_stats_all', 'TOTAL EXECUTION TIME: ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time) || 'ms', NOW());

    RAISE NOTICE 'Finished update_aggregated_player_profile_stats_all processing (v4, wrapper function). Total time: %ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time);
END;
$$;
