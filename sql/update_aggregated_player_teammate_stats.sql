-- sql/update_aggregated_player_teammate_stats.sql
-- Dedicated function for teammate chemistry calculations
-- Extracted from update_aggregated_player_profile_stats to resolve PostgREST timeout issues
DROP FUNCTION IF EXISTS update_aggregated_player_teammate_stats(UUID);
CREATE OR REPLACE FUNCTION update_aggregated_player_teammate_stats(target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    start_time TIMESTAMPTZ;
    block_start_time TIMESTAMPTZ;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE 'Starting update_aggregated_player_teammate_stats processing...';

    -- Clear the table before repopulating
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Clearing existing data from aggregated_player_teammate_stats...';
    DELETE FROM public.aggregated_player_teammate_stats WHERE tenant_id = target_tenant_id;
    
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp, tenant_id)
    VALUES ('update_aggregated_player_teammate_stats', 'TRUNCATE completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW(), target_tenant_id);

    -- Step 1: Calculate teammate chemistry data
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Step 1: Calculating teammate_data...';
    
    CREATE TEMP TABLE temp_teammate_stats_json AS
    WITH teammate_data AS (
        SELECT
            mps_player.player_id,
            mps_teammate.player_id as teammate_id,
            p_teammate.name as teammate_name,
            COUNT(DISTINCT mps_player.match_id) as games_played_with,
            AVG(
                calculate_match_fantasy_points(
                    mps_player.result,
                    mps_player.goal_difference,  -- Use pre-calculated from view
                    mps_player.clean_sheet,
                    mps_player.goals,
                    target_tenant_id
                )
            ) as player_avg_fp_with_teammate
        FROM match_player_stats mps_player  -- Use view for better performance
        JOIN match_player_stats mps_teammate ON mps_player.match_id = mps_teammate.match_id 
            AND mps_player.team = mps_teammate.team 
            AND mps_player.player_id != mps_teammate.player_id
        JOIN public.players p_teammate ON mps_teammate.player_id = p_teammate.player_id
        WHERE mps_player.tenant_id = target_tenant_id 
        AND mps_teammate.tenant_id = target_tenant_id 
        AND p_teammate.tenant_id = target_tenant_id
        AND p_teammate.is_ringer = FALSE AND p_teammate.is_retired = FALSE
        GROUP BY mps_player.player_id, mps_teammate.player_id, p_teammate.name
        HAVING COUNT(DISTINCT mps_player.match_id) >= 10
    )
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
    GROUP BY player_id;
    
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp, tenant_id)
    VALUES ('update_aggregated_player_teammate_stats', 'Step 1 (teammate_data) completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW(), target_tenant_id);

    -- Step 2: Insert data into aggregated_player_teammate_stats
    block_start_time := clock_timestamp();
    RAISE NOTICE 'Step 2: Inserting teammate data...';
    
    INSERT INTO public.aggregated_player_teammate_stats (
        player_id, tenant_id, teammate_chemistry_all, last_updated
    )
    SELECT
        tsj.player_id,
        target_tenant_id,
        tsj.teammate_chemistry_all,
        NOW()
    FROM temp_teammate_stats_json tsj;
    
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp, tenant_id)
    VALUES ('update_aggregated_player_teammate_stats', 'Step 2 (data insertion) completed in ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - block_start_time) || 'ms', NOW(), target_tenant_id);

    RAISE NOTICE 'Finished calculating teammate chemistry stats.';

    -- Update cache_metadata
    RAISE NOTICE 'Updating cache_metadata for player_teammate_stats...';
    INSERT INTO public.cache_metadata (cache_key, tenant_id, last_invalidated, dependency_type)
    VALUES ('player_teammate_stats', target_tenant_id, NOW(), 'player_teammate_stats')
    ON CONFLICT (cache_key, tenant_id) DO UPDATE
    SET last_invalidated = NOW(),
        dependency_type = excluded.dependency_type;

    -- Log total execution time
    PERFORM pg_sleep(0); -- dummy to keep position
    INSERT INTO debug_logs (source, message, timestamp, tenant_id)
    VALUES ('update_aggregated_player_teammate_stats', 'TOTAL EXECUTION TIME: ' || EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time) || 'ms', NOW(), target_tenant_id);

    RAISE NOTICE 'Finished update_aggregated_player_teammate_stats processing. Total time: %ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time);
END;
$$;
