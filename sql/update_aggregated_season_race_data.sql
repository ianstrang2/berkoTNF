-- sql/update_aggregated_season_race_data.sql
-- Updated version that uses actual match dates with zero-point starting records
CREATE OR REPLACE FUNCTION update_aggregated_season_race_data()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    current_season_record RECORD;
    is_first_half BOOLEAN;
    inserted_count INT := 0;
BEGIN
    -- Get current season
    SELECT * INTO current_season_record FROM get_current_season();
    
    IF current_season_record.id IS NULL THEN
        RAISE EXCEPTION 'No current season found. Please create a season that includes today''s date.';
    END IF;
    
    is_first_half := CURRENT_DATE <= current_season_record.half_date;
    
    RAISE NOTICE 'Starting update_aggregated_season_race_data for season %...', current_season_record.id;
    RAISE NOTICE 'Current date: %, First half: %, Half date: %', CURRENT_DATE, is_first_half, current_season_record.half_date;

    -- Delete existing data for current season
    DELETE FROM aggregated_season_race_data WHERE season_year = EXTRACT(YEAR FROM current_season_record.start_date)::int;

    -- Calculate race data for both periods
    WITH all_season_matches AS (
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
        WHERE m.match_date BETWEEN current_season_record.start_date AND current_season_record.end_date
          AND p.is_ringer = false
        ORDER BY m.match_date, m.match_id
    ),
    -- Calculate total points for whole season (for top 5 selection)
    whole_season_totals AS (
        SELECT player_id, name, SUM(fantasy_points) as total_points
        FROM all_season_matches
        GROUP BY player_id, name
    ),
    -- Calculate total points for current half season (for top 5 selection)
    current_half_totals AS (
        SELECT player_id, name, SUM(fantasy_points) as total_points
        FROM all_season_matches
        WHERE (is_first_half AND match_date <= current_season_record.half_date) 
           OR (NOT is_first_half AND match_date > current_season_record.half_date)
        GROUP BY player_id, name
    ),
    -- Top 5 players for whole season
    top_5_whole_season AS (
        SELECT player_id, name, total_points,
               ROW_NUMBER() OVER (ORDER BY total_points DESC, name ASC) as rank
        FROM whole_season_totals
        WHERE total_points > 0
        ORDER BY total_points DESC, name ASC
        LIMIT 5
    ),
    -- Top 5 players for current half season
    top_5_current_half AS (
        SELECT player_id, name, total_points,
               ROW_NUMBER() OVER (ORDER BY total_points DESC, name ASC) as rank
        FROM current_half_totals
        WHERE total_points > 0
        ORDER BY total_points DESC, name ASC
        LIMIT 5
    ),
    -- Create zero-point starting records for whole season
    whole_season_start_points AS (
        SELECT
            player_id,
            name,
            current_season_record.start_date AS match_date,
            0 AS cumulative_points
        FROM top_5_whole_season
    ),
    -- Create zero-point starting records for current half season
    current_half_start_points AS (
        SELECT
            player_id,
            name,
            CASE 
                WHEN is_first_half THEN current_season_record.start_date
                ELSE (current_season_record.half_date + INTERVAL '1 day')::DATE
            END AS match_date,
            0 AS cumulative_points
        FROM top_5_current_half
    ),
    -- Calculate cumulative points per match for whole season (actual match dates)
    whole_season_match_cumulative AS (
        SELECT 
            t5.player_id,
            t5.name,
            asm.match_date::date as match_date,
            SUM(asm.fantasy_points) OVER (
                PARTITION BY t5.player_id 
                ORDER BY asm.match_date, asm.match_id 
                ROWS UNBOUNDED PRECEDING
            ) as cumulative_points
        FROM top_5_whole_season t5
        JOIN all_season_matches asm ON t5.player_id = asm.player_id
    ),
    -- Calculate cumulative points per match for current half (actual match dates)
    current_half_match_cumulative AS (
        SELECT 
            t5.player_id,
            t5.name,
            asm.match_date::date as match_date,
            SUM(asm.fantasy_points) OVER (
                PARTITION BY t5.player_id 
                ORDER BY asm.match_date, asm.match_id 
                ROWS UNBOUNDED PRECEDING
            ) as cumulative_points
        FROM top_5_current_half t5
        JOIN all_season_matches asm ON t5.player_id = asm.player_id
        WHERE (is_first_half AND asm.match_date <= current_season_record.half_date) 
           OR (NOT is_first_half AND asm.match_date > current_season_record.half_date)
    ),
    -- Combine whole season match data with zero starting points
    whole_season_combined AS (
        SELECT * FROM whole_season_match_cumulative
        UNION ALL
        SELECT * FROM whole_season_start_points
    ),
    -- Combine current half match data with zero starting points
    current_half_combined AS (
        SELECT * FROM current_half_match_cumulative
        UNION ALL
        SELECT * FROM current_half_start_points
    ),
    -- Generate JSON data for whole season using actual match dates
    whole_season_race_data AS (
        SELECT 
            player_id,
            name,
            jsonb_agg(
                jsonb_build_object(
                    'date', match_date,
                    'points', cumulative_points
                ) ORDER BY match_date
            ) as cumulative_data
        FROM whole_season_combined
        GROUP BY player_id, name
    ),
    -- Generate JSON data for current half season using actual match dates
    current_half_race_data AS (
        SELECT 
            player_id,
            name,
            jsonb_agg(
                jsonb_build_object(
                    'date', match_date,
                    'points', cumulative_points
                ) ORDER BY match_date
            ) as cumulative_data
        FROM current_half_combined
        GROUP BY player_id, name
    ),
    -- Aggregate whole season data
    whole_season_final AS (
        SELECT 
            current_season_record.id as season_id,
            'whole_season' as period_type,
            jsonb_agg(
                jsonb_build_object(
                    'player_id', player_id,
                    'name', name,
                    'cumulative_data', cumulative_data
                ) ORDER BY player_id
            ) as player_data
        FROM whole_season_race_data
    ),
    -- Aggregate current half season data
    current_half_final AS (
        SELECT 
            current_season_record.id as season_id,
            'current_half' as period_type,
            jsonb_agg(
                jsonb_build_object(
                    'player_id', player_id,
                    'name', name,
                    'cumulative_data', cumulative_data
                ) ORDER BY player_id
            ) as player_data
        FROM current_half_race_data
    )
    
    -- Insert both period types
    INSERT INTO aggregated_season_race_data (season_year, period_type, player_data, last_updated)
    SELECT EXTRACT(YEAR FROM current_season_record.start_date)::int, period_type, COALESCE(player_data, '[]'::jsonb), NOW()
    FROM whole_season_final
    UNION ALL
    SELECT EXTRACT(YEAR FROM current_season_record.start_date)::int, period_type, COALESCE(player_data, '[]'::jsonb), NOW()
    FROM current_half_final;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % race data records for season %', inserted_count, current_season_record.id;

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