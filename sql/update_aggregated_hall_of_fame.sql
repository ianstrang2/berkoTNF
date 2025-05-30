-- sql/update_aggregated_hall_of_fame.sql
CREATE OR REPLACE FUNCTION update_aggregated_hall_of_fame()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    min_games_hof INT;
    hof_limit INT;
    inserted_count INT := 0;
BEGIN
    RAISE NOTICE 'Starting update_aggregated_hall_of_fame...';

    -- Fetch config from app_config using helper
    min_games_hof := get_config_value('games_required_for_hof', '50')::int;
    hof_limit := get_config_value('hall_of_fame_limit', '3')::int;

    RAISE NOTICE 'Using config: min_games=%, limit=%', min_games_hof, hof_limit;

    RAISE NOTICE 'Deleting existing hall of fame data...';
    DELETE FROM aggregated_hall_of_fame WHERE TRUE;

    RAISE NOTICE 'Calculating and inserting new Hall of Fame entries...';
    -- Use existing all-time stats table as source
    WITH ranked_stats AS (
        SELECT
            player_id, goals, fantasy_points, win_percentage, games_played
        FROM aggregated_all_time_stats -- Read from the table populated by the other function
    )
    INSERT INTO aggregated_hall_of_fame (category, player_id, value)
    -- Most Goals
    (SELECT 'most_goals', player_id, goals::numeric
    FROM ranked_stats WHERE goals > 0 ORDER BY goals DESC LIMIT hof_limit)
    UNION ALL
    -- Best Win Percentage (min games applied)
    (SELECT 'best_win_percentage', player_id, win_percentage
    FROM ranked_stats WHERE games_played >= min_games_hof AND win_percentage > 0 ORDER BY win_percentage DESC LIMIT hof_limit)
    UNION ALL
    -- Most Fantasy Points
    (SELECT 'most_fantasy_points', player_id, fantasy_points::numeric
    FROM ranked_stats WHERE fantasy_points > 0 ORDER BY fantasy_points DESC LIMIT hof_limit);

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'update_aggregated_hall_of_fame completed. Inserted % rows.', inserted_count;

    -- Update Cache Metadata
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('hall_of_fame', NOW(), 'match_result') -- Assuming depends on all_time_stats which depends on match results
    ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_aggregated_hall_of_fame: %', SQLERRM;
END; $$; 