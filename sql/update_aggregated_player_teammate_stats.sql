-- sql/update_aggregated_player_teammate_stats.sql
-- Dedicated function for teammate chemistry calculations
-- Extracted from update_aggregated_player_profile_stats to resolve PostgREST timeout issues
DROP FUNCTION IF EXISTS update_aggregated_player_teammate_stats(UUID);
CREATE OR REPLACE FUNCTION update_aggregated_player_teammate_stats(target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    start_time TIMESTAMPTZ;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE 'Starting update_aggregated_player_teammate_stats processing...';

    -- Load config once into a temp table (single query!)
    CREATE TEMP TABLE IF NOT EXISTS temp_fantasy_config AS
    SELECT 
        COALESCE(MAX(CASE WHEN config_key = 'fantasy_win_points' THEN config_value::int END), 20) as win_points,
        COALESCE(MAX(CASE WHEN config_key = 'fantasy_draw_points' THEN config_value::int END), 10) as draw_points,
        COALESCE(MAX(CASE WHEN config_key = 'fantasy_loss_points' THEN config_value::int END), -10) as loss_points,
        COALESCE(MAX(CASE WHEN config_key = 'fantasy_heavy_win_points' THEN config_value::int END), 30) as heavy_win_points,
        COALESCE(MAX(CASE WHEN config_key = 'fantasy_heavy_loss_points' THEN config_value::int END), -20) as heavy_loss_points,
        COALESCE(MAX(CASE WHEN config_key = 'fantasy_clean_sheet_win_points' THEN config_value::int END), 30) as cs_win_points,
        COALESCE(MAX(CASE WHEN config_key = 'fantasy_clean_sheet_draw_points' THEN config_value::int END), 20) as cs_draw_points,
        COALESCE(MAX(CASE WHEN config_key = 'fantasy_heavy_clean_sheet_win_points' THEN config_value::int END), 40) as heavy_cs_win_points,
        COALESCE(MAX(CASE WHEN config_key = 'fantasy_goals_scored_points' THEN config_value::int END), 0) as goals_scored_points,
        COALESCE(MAX(CASE WHEN config_key = 'fantasy_heavy_win_threshold' THEN config_value::int END), 4) as heavy_win_threshold
    FROM app_config 
    WHERE tenant_id = target_tenant_id;

    -- Clear the table before repopulating
    RAISE NOTICE 'Clearing existing data from aggregated_player_teammate_stats...';
    DELETE FROM public.aggregated_player_teammate_stats WHERE tenant_id = target_tenant_id;

    -- Calculate and insert teammate chemistry data with inline calculation
    RAISE NOTICE 'Calculating and inserting teammate data...';
    
    INSERT INTO public.aggregated_player_teammate_stats (
        player_id, tenant_id, teammate_chemistry_all, last_updated
    )
    WITH config AS (
        SELECT * FROM temp_fantasy_config
    ),
    teammate_data AS (
        SELECT
            pm_player.player_id,
            pm_teammate.player_id as teammate_id,
            p_teammate.name as teammate_name,
            COUNT(DISTINCT pm_player.match_id) as games_played_with,
            AVG(
                -- Inline fantasy point calculation using config from temp table
                CASE 
                    WHEN pm_player.result = 'win' THEN
                        c.win_points
                        + CASE WHEN ABS(CASE WHEN pm_player.team = 'A' THEN m.team_a_score - m.team_b_score ELSE m.team_b_score - m.team_a_score END) >= c.heavy_win_threshold 
                               THEN (c.heavy_win_points - c.win_points) ELSE 0 END
                        + CASE WHEN pm_player.clean_sheet THEN (c.cs_win_points - c.win_points) ELSE 0 END
                        + CASE WHEN pm_player.clean_sheet AND ABS(CASE WHEN pm_player.team = 'A' THEN m.team_a_score - m.team_b_score ELSE m.team_b_score - m.team_a_score END) >= c.heavy_win_threshold
                               THEN (c.heavy_cs_win_points - c.win_points - (c.heavy_win_points - c.win_points) - (c.cs_win_points - c.win_points)) ELSE 0 END
                        + (COALESCE(pm_player.goals, 0) * c.goals_scored_points)
                    WHEN pm_player.result = 'draw' THEN
                        c.draw_points
                        + CASE WHEN pm_player.clean_sheet THEN (c.cs_draw_points - c.draw_points) ELSE 0 END
                        + (COALESCE(pm_player.goals, 0) * c.goals_scored_points)
                    WHEN pm_player.result = 'loss' THEN
                        c.loss_points
                        + CASE WHEN ABS(CASE WHEN pm_player.team = 'A' THEN m.team_a_score - m.team_b_score ELSE m.team_b_score - m.team_a_score END) >= c.heavy_win_threshold
                               THEN (c.heavy_loss_points - c.loss_points) ELSE 0 END
                        + (COALESCE(pm_player.goals, 0) * c.goals_scored_points)
                    ELSE 0
                END
            ) as player_avg_fp_with_teammate
        FROM public.player_matches pm_player
        JOIN public.matches m ON pm_player.match_id = m.match_id AND m.tenant_id = target_tenant_id
        JOIN public.player_matches pm_teammate ON m.match_id = pm_teammate.match_id 
            AND pm_player.team = pm_teammate.team 
            AND pm_player.player_id != pm_teammate.player_id
            AND pm_teammate.tenant_id = target_tenant_id
        JOIN public.players p_teammate ON pm_teammate.player_id = p_teammate.player_id
            AND p_teammate.tenant_id = target_tenant_id
            AND p_teammate.is_ringer = FALSE 
            AND p_teammate.is_retired = FALSE
        CROSS JOIN config c
        WHERE pm_player.tenant_id = target_tenant_id
        GROUP BY pm_player.player_id, pm_teammate.player_id, p_teammate.name
        HAVING COUNT(DISTINCT pm_player.match_id) >= 10
    )
    SELECT
        player_id,
        target_tenant_id,
        COALESCE(json_agg(
            json_build_object(
                'player_id', teammate_id, 
                'name', teammate_name, 
                'games_played_with', games_played_with,
                'average_fantasy_points_with', ROUND(player_avg_fp_with_teammate::numeric, 2)
            ) ORDER BY player_avg_fp_with_teammate DESC
        ), '[]'::json),
        NOW()
    FROM teammate_data 
    WHERE player_avg_fp_with_teammate IS NOT NULL
    GROUP BY player_id;

    -- Clean up temp table
    DROP TABLE IF EXISTS temp_fantasy_config;

    -- Update cache_metadata
    RAISE NOTICE 'Updating cache_metadata for player_teammate_stats...';
    INSERT INTO public.cache_metadata (cache_key, tenant_id, last_invalidated, dependency_type)
    VALUES ('player_teammate_stats', target_tenant_id, NOW(), 'player_teammate_stats')
    ON CONFLICT (cache_key, tenant_id) DO UPDATE
    SET last_invalidated = NOW(),
        dependency_type = excluded.dependency_type;

    RAISE NOTICE 'Finished update_aggregated_player_teammate_stats processing. Total time: %ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time);
END;
$$;
