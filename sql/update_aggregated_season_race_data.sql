-- sql/update_aggregated_season_race_data.sql
CREATE OR REPLACE FUNCTION update_aggregated_season_race_data()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
    inserted_count INT := 0;
BEGIN
    RAISE NOTICE 'Starting update_aggregated_season_race_data for year %...', current_year;

    -- Delete existing data for current year
    DELETE FROM aggregated_season_race_data WHERE season_year = current_year;

    -- Calculate race data
    WITH current_season_matches AS (
        SELECT m.match_id, m.match_date, pm.player_id, p.name,
               calculate_match_fantasy_points(
                   COALESCE(pm.result, 'loss'), 
                   COALESCE(pm.heavy_win, false), 
                   COALESCE(pm.heavy_loss, false), 
                   COALESCE(pm.clean_sheet, false)
               ) as fantasy_points
        FROM matches m
        JOIN player_matches pm ON m.match_id = pm.match_id  
        JOIN players p ON pm.player_id = p.player_id
        WHERE EXTRACT(YEAR FROM m.match_date) = current_year
          AND p.is_ringer = false
        ORDER BY m.match_date, m.match_id
    ),
    total_season_points AS (
        SELECT player_id, name, SUM(fantasy_points) as total_points
        FROM current_season_matches
        GROUP BY player_id, name
    ),
    top_5_players AS (
        SELECT player_id, name, total_points,
               ROW_NUMBER() OVER (ORDER BY total_points DESC, name ASC) as rank
        FROM total_season_points
        WHERE total_points > 0
        ORDER BY total_points DESC, name ASC
        LIMIT 5
    ),
    player_match_cumulative AS (
        SELECT tp.player_id, tp.name,
               csm.match_date::date as match_date,
               csm.fantasy_points,
               SUM(csm.fantasy_points) OVER (
                   PARTITION BY tp.player_id 
                   ORDER BY csm.match_date, csm.match_id 
                   ROWS UNBOUNDED PRECEDING
               ) as cumulative_points,
               ROW_NUMBER() OVER (
                   PARTITION BY tp.player_id 
                   ORDER BY csm.match_date, csm.match_id
               ) as match_number
        FROM top_5_players tp
        JOIN (
            SELECT DISTINCT player_id, match_id, match_date, fantasy_points
            FROM current_season_matches
        ) csm ON tp.player_id = csm.player_id
    ),
    cumulative_race_data AS (
        SELECT player_id, name,
               jsonb_agg(
                   jsonb_build_object(
                       'date', match_date,
                       'points', cumulative_points,
                       'match_number', match_number
                   ) ORDER BY match_date, match_number
               ) as cumulative_data
        FROM player_match_cumulative
        GROUP BY player_id, name
    ),
    final_player_data AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'player_id', player_id,
                'name', name,
                'cumulative_data', cumulative_data
            ) ORDER BY player_id
        ) as player_data_json
        FROM cumulative_race_data
    )
    INSERT INTO aggregated_season_race_data (season_year, player_data)
    SELECT current_year, COALESCE(player_data_json, '[]'::jsonb)
    FROM final_player_data;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % race data records for year %', inserted_count, current_year;

    -- Update cache metadata
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('season_race_data', NOW(), 'season_race_data')
    ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();

    RAISE NOTICE 'update_aggregated_season_race_data completed successfully.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_aggregated_season_race_data: %', SQLERRM;
END;
$$; 