-- sql/update_half_and_full_season_stats.sql

-- Helper functions (calculate_match_fantasy_points, date helpers) are defined in sql/helpers.sql

CREATE OR REPLACE FUNCTION update_half_and_full_season_stats()
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

    DELETE FROM aggregated_half_season_stats WHERE TRUE;
    INSERT INTO aggregated_half_season_stats (
        player_id, games_played, wins, draws, losses, goals,
        heavy_wins, heavy_losses, clean_sheets, fantasy_points, points_per_game,
        win_percentage
    )
    SELECT
        pm.player_id, COUNT(*),
        SUM(CASE WHEN pm.result = 'win' THEN 1 ELSE 0 END), SUM(CASE WHEN pm.result = 'draw' THEN 1 ELSE 0 END), SUM(CASE WHEN pm.result = 'loss' THEN 1 ELSE 0 END),
        SUM(COALESCE(pm.goals, 0)), SUM(CASE WHEN pm.heavy_win THEN 1 ELSE 0 END), SUM(CASE WHEN pm.heavy_loss THEN 1 ELSE 0 END), SUM(CASE WHEN pm.clean_sheet THEN 1 ELSE 0 END),
        -- Call centralized helper with NULL protection
        SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false))),
        ROUND(CASE WHEN COUNT(*) > 0 THEN SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false)))::numeric / COUNT(*) ELSE 0 END, 1),
        -- Calculate win_percentage
        ROUND((CASE WHEN COUNT(*) > 0 THEN SUM(CASE WHEN pm.result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100 ELSE 0 END), 1)
    FROM player_matches pm
    JOIN matches m ON pm.match_id = m.match_id
    JOIN players p ON pm.player_id = p.player_id
    WHERE p.is_ringer = false AND m.match_date::date BETWEEN half_season_start_date AND half_season_end_date
    GROUP BY pm.player_id;
    RAISE NOTICE 'Finished calculating half-season stats.';

    RAISE NOTICE 'Calculating full-season stats for all historical years...';
    -- Loop through all years present in the matches table up to the current year
    FOR historical_year IN
        SELECT DISTINCT EXTRACT(YEAR FROM match_date)::INT
        FROM matches
        WHERE EXTRACT(YEAR FROM match_date) <= current_year
        ORDER BY 1 -- Process years chronologically
    LOOP
        RAISE NOTICE 'Processing year: %', historical_year;
        v_season_start_date := MAKE_DATE(historical_year, 1, 1);
        -- Delete existing stats for this specific year before inserting
        DELETE FROM aggregated_season_stats WHERE aggregated_season_stats.season_start_date = v_season_start_date;

        INSERT INTO aggregated_season_stats (
            player_id, season_start_date, season_end_date, games_played, wins, draws, losses, goals,
            win_percentage, heavy_wins, heavy_losses, clean_sheets,
            fantasy_points, points_per_game
        )
        SELECT
            pm.player_id, v_season_start_date, MAKE_DATE(historical_year, 12, 31) AS season_end_date, COUNT(*),
            SUM(CASE WHEN pm.result = 'win' THEN 1 ELSE 0 END), SUM(CASE WHEN pm.result = 'draw' THEN 1 ELSE 0 END), SUM(CASE WHEN pm.result = 'loss' THEN 1 ELSE 0 END),
            SUM(COALESCE(pm.goals, 0)),
            -- Calculated fields
            ROUND((CASE WHEN COUNT(*) > 0 THEN SUM(CASE WHEN pm.result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100 ELSE 0 END), 1),
            SUM(CASE WHEN pm.heavy_win THEN 1 ELSE 0 END),
            SUM(CASE WHEN pm.heavy_loss THEN 1 ELSE 0 END),
            SUM(CASE WHEN pm.clean_sheet THEN 1 ELSE 0 END),
            -- Call centralized helper with NULL protection
            SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false))),
            ROUND((CASE WHEN COUNT(*) > 0 THEN SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false)))::numeric / COUNT(*) ELSE 0 END), 1)
        FROM player_matches pm
        JOIN matches m ON pm.match_id = m.match_id
        JOIN players p ON pm.player_id = p.player_id
        WHERE p.is_ringer = false AND EXTRACT(YEAR FROM m.match_date::date) = historical_year
        GROUP BY pm.player_id;
    END LOOP;

    -- Update Cache Metadata
    RAISE NOTICE 'Updating season_stats cache metadata...';
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('season_stats', NOW(), 'season_stats')
    ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();

    RAISE NOTICE 'Season stats update complete.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_half_and_full_season_stats: %', SQLERRM;
END;
$$; 