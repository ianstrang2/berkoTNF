-- sql/update_aggregated_season_race_data.sql
CREATE OR REPLACE FUNCTION update_aggregated_season_race_data()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
    current_week INT := EXTRACT(WEEK FROM CURRENT_DATE);
    is_first_half BOOLEAN := current_week <= 26;
    inserted_count INT := 0;
BEGIN
    RAISE NOTICE 'Starting update_aggregated_season_race_data for year %...', current_year;
    RAISE NOTICE 'Current week: %, First half: %', current_week, is_first_half;

    -- Delete existing data for current year
    DELETE FROM aggregated_season_race_data WHERE season_year = current_year;

    -- Calculate race data for both periods
    WITH all_season_matches AS (
        SELECT m.match_id, m.match_date, pm.player_id, p.name,
               calculate_match_fantasy_points(
                   COALESCE(pm.result, 'loss'), 
                   COALESCE(pm.heavy_win, false), 
                   COALESCE(pm.heavy_loss, false), 
                   COALESCE(pm.clean_sheet, false)
               ) as fantasy_points,
               EXTRACT(WEEK FROM m.match_date) as match_week
        FROM matches m
        JOIN player_matches pm ON m.match_id = pm.match_id  
        JOIN players p ON pm.player_id = p.player_id
        WHERE EXTRACT(YEAR FROM m.match_date) = current_year
          AND p.is_ringer = false
        ORDER BY m.match_date, m.match_id
    ),
    -- Generate weekly dates for the full year (January 1 to December 31)
    week_series AS (
        SELECT 
            generate_series(
                DATE(current_year || '-01-01'),
                DATE(current_year || '-12-31'),
                INTERVAL '7 days'
            )::date AS week_date,
            EXTRACT(WEEK FROM generate_series(
                DATE(current_year || '-01-01'),
                DATE(current_year || '-12-31'),
                INTERVAL '7 days'
            )) AS week_number
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
        WHERE (is_first_half AND match_week <= 26) 
           OR (NOT is_first_half AND match_week > 26)
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
    -- Calculate weekly cumulative points for whole season
    whole_season_weekly AS (
        SELECT 
            t5.player_id,
            t5.name,
            ws.week_date,
            ws.week_number,
            CASE 
                WHEN ws.week_number <= (
                    SELECT MAX(asm.match_week) 
                    FROM all_season_matches asm 
                    WHERE asm.player_id = t5.player_id
                ) THEN
                    COALESCE(
                        (SELECT SUM(asm.fantasy_points)
                         FROM all_season_matches asm
                         WHERE asm.player_id = t5.player_id 
                           AND asm.match_week <= ws.week_number),
                        0
                    )
                ELSE NULL -- Don't include data for weeks beyond player's last match
            END as cumulative_points
        FROM top_5_whole_season t5
        CROSS JOIN week_series ws
    ),
    -- Generate current half week series based on what half we're in
    current_half_weeks AS (
        SELECT 
            generate_series(
                CASE 
                    WHEN current_week <= 26 THEN DATE(current_year || '-01-01')
                    ELSE DATE(current_year || '-07-01')
                END,
                CASE 
                    WHEN current_week <= 26 THEN DATE(current_year || '-06-30')
                    ELSE DATE(current_year || '-12-31')
                END,
                INTERVAL '7 days'
            )::date AS week_date,
            EXTRACT(WEEK FROM generate_series(
                CASE 
                    WHEN current_week <= 26 THEN DATE(current_year || '-01-01')
                    ELSE DATE(current_year || '-07-01')
                END,
                CASE 
                    WHEN current_week <= 26 THEN DATE(current_year || '-06-30')
                    ELSE DATE(current_year || '-12-31')
                END,
                INTERVAL '7 days'
            )) AS week_number
    ),
    -- Calculate weekly cumulative points for current half season  
    current_half_weekly AS (
        SELECT 
            t5.player_id,
            t5.name,
            ws.week_date,
            ws.week_number,
            CASE 
                WHEN current_week <= 26 THEN
                    -- First half: weeks 1-26
                    CASE 
                        WHEN ws.week_number <= (
                            SELECT MAX(asm.match_week) 
                            FROM all_season_matches asm 
                            WHERE asm.player_id = t5.player_id AND asm.match_week <= 26
                        ) THEN
                            COALESCE(
                                (SELECT SUM(asm.fantasy_points)
                                 FROM all_season_matches asm
                                 WHERE asm.player_id = t5.player_id 
                                   AND asm.match_week <= ws.week_number
                                   AND asm.match_week <= 26),
                                0
                            )
                        ELSE NULL
                    END
                ELSE
                    -- Second half: weeks 27-52
                    CASE 
                        WHEN ws.week_number <= (
                            SELECT MAX(asm.match_week) 
                            FROM all_season_matches asm 
                            WHERE asm.player_id = t5.player_id AND asm.match_week > 26
                        ) THEN
                            COALESCE(
                                (SELECT SUM(asm.fantasy_points)
                                 FROM all_season_matches asm
                                 WHERE asm.player_id = t5.player_id 
                                   AND asm.match_week <= ws.week_number
                                   AND asm.match_week > 26),
                                0
                            )
                        ELSE NULL
                    END
            END as cumulative_points
        FROM top_5_current_half t5
        CROSS JOIN current_half_weeks ws
    ),
    -- Format whole season data (keep full timeline with nulls)
    whole_season_race_data AS (
        SELECT 
            player_id, 
            name,
            jsonb_agg(
                jsonb_build_object(
                    'date', week_date,
                    'points', cumulative_points,
                    'week_number', week_number
                ) ORDER BY week_number
            ) as cumulative_data
        FROM whole_season_weekly
        GROUP BY player_id, name
    ),
    -- Format current half season data (keep full timeline with nulls)
    current_half_race_data AS (
        SELECT 
            player_id, 
            name,
            jsonb_agg(
                jsonb_build_object(
                    'date', week_date,
                    'points', cumulative_points,
                    'week_number', week_number
                ) ORDER BY week_number
            ) as cumulative_data
        FROM current_half_weekly
        GROUP BY player_id, name
    ),
    -- Aggregate whole season data
    whole_season_final AS (
        SELECT 
            current_year as season_year,
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
            current_year as season_year,
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
    INSERT INTO aggregated_season_race_data (season_year, period_type, player_data)
    SELECT season_year, period_type, COALESCE(player_data, '[]'::jsonb)
    FROM whole_season_final
    UNION ALL
    SELECT season_year, period_type, COALESCE(player_data, '[]'::jsonb)
    FROM current_half_final;

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