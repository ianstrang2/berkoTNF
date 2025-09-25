-- sql/update_aggregated_all_time_stats.sql

-- Helper function is now defined in sql/helpers.sql
-- CREATE OR REPLACE FUNCTION calculate_match_fantasy_points(...) ...


CREATE OR REPLACE FUNCTION update_aggregated_all_time_stats(target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID)
-- No config_json parameter needed
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    -- Fetch config from app_config using helper function
    match_duration INT := get_config_value('match_duration_minutes', '60')::int;
    min_games_for_hof INT := get_config_value('games_required_for_hof', '0')::int; -- Default to 0 if not found
    inserted_count INT := 0;
BEGIN
    RAISE NOTICE 'Starting update_aggregated_all_time_stats...';
    RAISE NOTICE 'Using config: match_duration=% min, min_games_for_hof=%',
                 match_duration, min_games_for_hof;

    -- Calculate base stats directly into insert statement (tenant-scoped)
    RAISE NOTICE 'Deleting existing all-time stats for tenant %...', target_tenant_id;
    DELETE FROM aggregated_all_time_stats WHERE tenant_id = target_tenant_id;

    RAISE NOTICE 'Calculating and inserting new all-time stats...';
    WITH player_base_stats AS (
        SELECT
            pm.player_id,
            COUNT(*) as games_played,
            SUM(CASE WHEN pm.result = 'win' THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN pm.result = 'draw' THEN 1 ELSE 0 END) as draws,
            SUM(CASE WHEN pm.result = 'loss' THEN 1 ELSE 0 END) as losses,
            SUM(COALESCE(pm.goals, 0)) as goals,
            SUM(CASE WHEN pm.heavy_win THEN 1 ELSE 0 END) as heavy_wins,
            SUM(CASE WHEN pm.heavy_loss THEN 1 ELSE 0 END) as heavy_losses,
            SUM(CASE WHEN pm.clean_sheet THEN 1 ELSE 0 END) as clean_sheets,
            -- Call the centralized helper function (no config needed)
            SUM(calculate_match_fantasy_points(
                pm.result, 
                COALESCE(pm.heavy_win, false), 
                COALESCE(pm.heavy_loss, false), 
                COALESCE(pm.clean_sheet, false)
            )) as fantasy_points
        FROM player_matches pm
        JOIN players p ON pm.player_id = p.player_id
        WHERE p.is_ringer = false AND pm.tenant_id = target_tenant_id AND p.tenant_id = target_tenant_id
        GROUP BY pm.player_id
        HAVING SUM(calculate_match_fantasy_points(pm.result, COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false))) IS NOT NULL
           AND COUNT(*) >= min_games_for_hof -- Add this condition
    )
    INSERT INTO aggregated_all_time_stats (
        player_id, tenant_id, games_played, wins, draws, losses, goals,
        win_percentage, minutes_per_goal, heavy_wins, heavy_win_percentage,
        heavy_losses, heavy_loss_percentage, clean_sheets, clean_sheet_percentage,
        fantasy_points, points_per_game, last_updated
    )
    SELECT
        player_id, target_tenant_id, games_played, wins, draws, losses, goals,
        ROUND((CASE WHEN games_played > 0 THEN wins::numeric / games_played * 100 ELSE 0 END), 1),
        CASE WHEN goals > 0 THEN ROUND((games_played::numeric * match_duration / goals), 1) ELSE NULL END,
        heavy_wins,
        ROUND((CASE WHEN games_played > 0 THEN heavy_wins::numeric / games_played * 100 ELSE 0 END), 1),
        heavy_losses,
        ROUND((CASE WHEN games_played > 0 THEN heavy_losses::numeric / games_played * 100 ELSE 0 END), 1),
        clean_sheets,
        ROUND((CASE WHEN games_played > 0 THEN clean_sheets::numeric / games_played * 100 ELSE 0 END), 1),
        fantasy_points,
        ROUND((CASE WHEN games_played > 0 THEN fantasy_points::numeric / games_played ELSE 0 END), 1),
        NOW() -- last_updated
    FROM player_base_stats;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'update_aggregated_all_time_stats completed. Inserted % rows.', inserted_count;

    -- Update Cache Metadata
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type, tenant_id)
    VALUES ('all_time_stats', NOW(), 'match_result', target_tenant_id) -- Assuming depends on match results
    ON CONFLICT (cache_key, tenant_id) DO UPDATE SET last_invalidated = NOW();

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_aggregated_all_time_stats: %', SQLERRM;
END;
$$; 