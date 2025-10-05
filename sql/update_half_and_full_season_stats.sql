-- sql/update_half_and_full_season_stats.sql

-- Helper functions (calculate_match_fantasy_points, date helpers) are defined in sql/helpers.sql

CREATE OR REPLACE FUNCTION update_half_and_full_season_stats(target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID)
-- No config_json parameter needed
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    -- Use date helpers
    half_season_start_date DATE := get_current_half_season_start_date();
    half_season_end_date DATE := get_current_half_season_end_date();
    -- Fetch config from app_config
    match_duration INT := get_config_value('match_duration_minutes', '60')::int;
    current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
    historical_year INT;
    v_season_start_date DATE;
BEGIN
    RAISE NOTICE 'Starting update_half_and_full_season_stats...';
    RAISE NOTICE 'Using config: match_duration=%', match_duration;
    RAISE NOTICE 'Calculating half-season stats (Start: %, End: %)...', half_season_start_date, half_season_end_date;

    DELETE FROM aggregated_half_season_stats WHERE tenant_id = target_tenant_id;
    INSERT INTO aggregated_half_season_stats (
        player_id, tenant_id, games_played, wins, draws, losses, goals,
        heavy_wins, heavy_losses, clean_sheets, fantasy_points, points_per_game,
        win_percentage, name, selected_club
    )
    SELECT
        pm.player_id, target_tenant_id, COUNT(*),
        SUM(CASE WHEN pm.result = 'win' THEN 1 ELSE 0 END), SUM(CASE WHEN pm.result = 'draw' THEN 1 ELSE 0 END), SUM(CASE WHEN pm.result = 'loss' THEN 1 ELSE 0 END),
        SUM(COALESCE(pm.goals, 0)), SUM(CASE WHEN pm.heavy_win THEN 1 ELSE 0 END), SUM(CASE WHEN pm.heavy_loss THEN 1 ELSE 0 END), SUM(CASE WHEN pm.clean_sheet THEN 1 ELSE 0 END),
        -- Call centralized helper with NULL protection
        SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false))),
        ROUND(CASE WHEN COUNT(*) > 0 THEN SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false)))::numeric / COUNT(*) ELSE 0 END, 1),
        -- Calculate win_percentage
        ROUND((CASE WHEN COUNT(*) > 0 THEN SUM(CASE WHEN pm.result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100 ELSE 0 END), 1),
        MAX(p.name), -- Pull name from players table (MAX is safe since it's the same for all rows per player)
        (SELECT selected_club FROM players WHERE player_id = pm.player_id LIMIT 1) -- Subquery for JSONB column
    FROM player_matches pm
    JOIN matches m ON pm.match_id = m.match_id
    JOIN players p ON pm.player_id = p.player_id
    WHERE p.tenant_id = target_tenant_id AND pm.tenant_id = target_tenant_id AND m.tenant_id = target_tenant_id
    AND p.is_ringer = false AND m.match_date::date BETWEEN half_season_start_date AND half_season_end_date
    GROUP BY pm.player_id;
    RAISE NOTICE 'Finished calculating half-season stats.';

    RAISE NOTICE 'Calculating full-season stats for all seasons...';
    -- Loop through all seasons in the seasons table
    FOR v_season_start_date IN
        SELECT start_date
        FROM seasons
        WHERE tenant_id = target_tenant_id
        ORDER BY start_date -- Process seasons chronologically
    LOOP
        RAISE NOTICE 'Processing season starting: %', v_season_start_date;
        
        -- Get the season record
        SELECT end_date INTO half_season_end_date
        FROM seasons WHERE tenant_id = target_tenant_id AND start_date = v_season_start_date;
        
        -- Delete existing stats for this specific season before inserting
        DELETE FROM aggregated_season_stats WHERE tenant_id = target_tenant_id AND season_start_date = v_season_start_date;

        INSERT INTO aggregated_season_stats (
            player_id, tenant_id, season_start_date, season_end_date, games_played, wins, draws, losses, goals,
            win_percentage, heavy_wins, heavy_losses, clean_sheets,
            fantasy_points, points_per_game, name, selected_club
        )
        SELECT
            pm.player_id, target_tenant_id, v_season_start_date, half_season_end_date AS season_end_date, COUNT(*),
            SUM(CASE WHEN pm.result = 'win' THEN 1 ELSE 0 END), SUM(CASE WHEN pm.result = 'draw' THEN 1 ELSE 0 END), SUM(CASE WHEN pm.result = 'loss' THEN 1 ELSE 0 END),
            SUM(COALESCE(pm.goals, 0)),
            -- Calculated fields
            ROUND((CASE WHEN COUNT(*) > 0 THEN SUM(CASE WHEN pm.result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100 ELSE 0 END), 1),
            SUM(CASE WHEN pm.heavy_win THEN 1 ELSE 0 END),
            SUM(CASE WHEN pm.heavy_loss THEN 1 ELSE 0 END),
            SUM(CASE WHEN pm.clean_sheet THEN 1 ELSE 0 END),
            -- Call centralized helper with NULL protection
            SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false))),
            ROUND((CASE WHEN COUNT(*) > 0 THEN SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false)))::numeric / COUNT(*) ELSE 0 END), 1),
            MAX(p.name), -- Pull name from players table (MAX is safe since it's the same for all rows per player)
            (SELECT selected_club FROM players WHERE player_id = pm.player_id LIMIT 1) -- Subquery for JSONB column
        FROM player_matches pm
        JOIN matches m ON pm.match_id = m.match_id
        JOIN players p ON pm.player_id = p.player_id
        WHERE p.tenant_id = target_tenant_id AND pm.tenant_id = target_tenant_id AND m.tenant_id = target_tenant_id
        AND p.is_ringer = false AND m.match_date BETWEEN v_season_start_date AND half_season_end_date
        GROUP BY pm.player_id;
    END LOOP;

    -- Update Cache Metadata for both season_stats and half_season_stats
    RAISE NOTICE 'Updating season_stats cache metadata...';
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type, tenant_id)
    VALUES ('season_stats', NOW(), 'season_stats', target_tenant_id)
    ON CONFLICT (cache_key, tenant_id) DO UPDATE SET last_invalidated = NOW();
    
    RAISE NOTICE 'Updating half_season_stats cache metadata...';
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type, tenant_id)
    VALUES ('half_season_stats', NOW(), 'half_season_stats', target_tenant_id)
    ON CONFLICT (cache_key, tenant_id) DO UPDATE SET last_invalidated = NOW();

    RAISE NOTICE 'Season stats update complete.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_half_and_full_season_stats: %', SQLERRM;
END;
$$; 