-- sql/update_aggregated_recent_performance.sql
CREATE OR REPLACE FUNCTION update_aggregated_recent_performance(target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID)
RETURNS VOID -- Or return some status/count
LANGUAGE plpgsql
AS $$
DECLARE
    batch_size INT := 50; -- Process players in batches
    offset_num INT := 0;
    processed_players INT := 0;
    inserted_count INT := 0;
    player_batch RECORD;
    player_match RECORD;
    player_stats RECORD;
    temp_performance RECORD;
    last_5_games_json JSONB;
    v_last_5_goals INT;
    player_record RECORD;
    -- Temporary table to hold calculated stats before final insert
    temp_recent_perf_table TEXT := 'temp_recent_perf_' || replace(uuid_generate_v4()::text, '-', '');
BEGIN
    RAISE NOTICE 'Starting update_aggregated_recent_performance...';

    -- Create a temporary table to store results
    EXECUTE format('
        CREATE TEMP TABLE %I (
            player_id INT PRIMARY KEY,
            last_5_games JSONB,
            last_5_goals INT,
            last_updated TIMESTAMPTZ
        ) ON COMMIT DROP;', temp_recent_perf_table);

    RAISE NOTICE 'Processing players in batches of %...', batch_size;

    LOOP
        RAISE NOTICE 'Fetching player batch starting from offset %...', offset_num;
        FOR player_batch IN
            SELECT player_id
            FROM players
            WHERE tenant_id = target_tenant_id AND is_ringer = false
            ORDER BY player_id
            LIMIT batch_size OFFSET offset_num
        LOOP
            processed_players := processed_players + 1;
            -- RAISE NOTICE 'Processing player ID %...', player_batch.player_id; -- Can be noisy

            -- Calculate last 5 games stats for the current player
            v_last_5_goals := 0;
            last_5_games_json := '[]'::jsonb;

            WITH last_5_matches_for_player AS (
                SELECT
                    m.match_date,
                    pm.goals,
                    pm.result,
                    pm.team,
                    m.team_a_score,
                    m.team_b_score
                FROM player_matches pm
                JOIN matches m ON pm.match_id = m.match_id
                WHERE pm.player_id = player_batch.player_id 
                AND pm.tenant_id = target_tenant_id 
                AND m.tenant_id = target_tenant_id
                ORDER BY m.match_date DESC
                LIMIT 5
            )
            SELECT
                COALESCE(SUM(COALESCE(l5m.goals, 0)), 0),
                COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'date', l5m.match_date,
                        'goals', COALESCE(l5m.goals, 0),
                        'result', COALESCE(l5m.result, ''),
                        'score', CASE WHEN l5m.team = 'A' THEN (COALESCE(l5m.team_a_score,0)::text || '-' || COALESCE(l5m.team_b_score,0)::text) ELSE (COALESCE(l5m.team_b_score,0)::text || '-' || COALESCE(l5m.team_a_score,0)::text) END,
                        'clean_sheet', CASE WHEN l5m.team = 'A' THEN COALESCE(l5m.team_b_score,0) = 0 ELSE COALESCE(l5m.team_a_score,0) = 0 END
                    ) ORDER BY l5m.match_date DESC
                ), '[]'::jsonb)
            INTO v_last_5_goals, last_5_games_json
            FROM last_5_matches_for_player l5m;

            -- Insert calculated stats into the temporary table
            EXECUTE format('
                INSERT INTO %I (player_id, last_5_games, last_5_goals, last_updated)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (player_id) DO NOTHING;', temp_recent_perf_table)
            USING player_batch.player_id, last_5_games_json, v_last_5_goals;

        END LOOP;

        -- Check if the last batch was smaller than batch_size or empty
        IF NOT FOUND OR (SELECT COUNT(*) FROM (SELECT player_id FROM players WHERE tenant_id = target_tenant_id AND is_ringer = false ORDER BY player_id LIMIT batch_size OFFSET offset_num) AS sub) < batch_size THEN
            RAISE NOTICE 'Last batch processed.';
            EXIT; -- Exit the loop
        END IF;

        offset_num := offset_num + batch_size;
    END LOOP;

    RAISE NOTICE 'Finished processing % players.', processed_players;
    RAISE NOTICE 'Deleting old data from aggregated_recent_performance...';

    DELETE FROM aggregated_recent_performance WHERE tenant_id = target_tenant_id;

    RAISE NOTICE 'Inserting new data into aggregated_recent_performance from temporary table...';

    EXECUTE format('
        INSERT INTO aggregated_recent_performance (player_id, tenant_id, last_5_games, last_5_goals, last_updated)
        SELECT player_id, $1, last_5_games, last_5_goals, last_updated
        FROM %I;', temp_recent_perf_table)
    USING target_tenant_id;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % rows into aggregated_recent_performance.', inserted_count;
    
    -- Update Cache Metadata
    RAISE NOTICE 'Updating recent_performance cache metadata...';
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type, tenant_id)
    VALUES ('recent_performance', NOW(), 'recent_performance', target_tenant_id)
    ON CONFLICT (cache_key, tenant_id) DO UPDATE SET last_invalidated = NOW();

    -- Temp table is dropped automatically ON COMMIT
    RAISE NOTICE 'update_aggregated_recent_performance completed.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_aggregated_recent_performance: %', SQLERRM;
        -- Temp table should still be dropped automatically on error commit/rollback
END;
$$; 