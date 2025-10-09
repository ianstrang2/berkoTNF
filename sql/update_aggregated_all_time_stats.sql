-- sql/update_aggregated_all_time_stats.sql
--
-- ⚠️ FANTASY POINT CALCULATION DUPLICATED IN 3 PLACES:
-- 1. sql/update_aggregated_player_teammate_stats.sql (lines 50-69)
-- 2. sql/update_aggregated_player_profile_stats.sql (lines 52-72)
-- 3. sql/update_aggregated_all_time_stats.sql (this file - lines 56-75)
-- If you change the fantasy points logic, update all 3 files!
-- Uses temp_fantasy_config table to avoid repeated config lookups (performance optimization)
--
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
    min_games_for_hof INT := get_config_value('games_required_for_hof', '0')::int;
    inserted_count INT := 0;
BEGIN
    -- Phase 2: Set RLS context for this function (required for prisma_app role)
    PERFORM set_config('app.tenant_id', target_tenant_id::text, false);
    
    RAISE NOTICE 'Starting update_aggregated_all_time_stats...';
    RAISE NOTICE 'Using config: match_duration=% min, min_games_for_hof=%',
                 match_duration, min_games_for_hof;

    -- Load config once into a temp table (optimization to avoid repeated lookups)
    DROP TABLE IF EXISTS temp_fantasy_config;
    CREATE TEMP TABLE temp_fantasy_config AS
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
            SUM(CASE WHEN pm.result = 'win' AND ABS(CASE WHEN pm.team = 'A' THEN m.team_a_score - m.team_b_score WHEN pm.team = 'B' THEN m.team_b_score - m.team_a_score ELSE 0 END) >= c.heavy_win_threshold THEN 1 ELSE 0 END) as heavy_wins,
            SUM(CASE WHEN pm.result = 'loss' AND ABS(CASE WHEN pm.team = 'A' THEN m.team_a_score - m.team_b_score WHEN pm.team = 'B' THEN m.team_b_score - m.team_a_score ELSE 0 END) >= c.heavy_win_threshold THEN 1 ELSE 0 END) as heavy_losses,
            SUM(CASE WHEN pm.clean_sheet THEN 1 ELSE 0 END) as clean_sheets,
            -- Inline fantasy points calculation using config from temp table
            SUM(
                CASE 
                    WHEN pm.result = 'win' THEN
                        c.win_points
                        + CASE WHEN ABS(CASE WHEN pm.team = 'A' THEN m.team_a_score - m.team_b_score ELSE m.team_b_score - m.team_a_score END) >= c.heavy_win_threshold 
                               THEN (c.heavy_win_points - c.win_points) ELSE 0 END
                        + CASE WHEN COALESCE(pm.clean_sheet, false) THEN (c.cs_win_points - c.win_points) ELSE 0 END
                        + CASE WHEN COALESCE(pm.clean_sheet, false) AND ABS(CASE WHEN pm.team = 'A' THEN m.team_a_score - m.team_b_score ELSE m.team_b_score - m.team_a_score END) >= c.heavy_win_threshold
                               THEN (c.heavy_cs_win_points - c.win_points - (c.heavy_win_points - c.win_points) - (c.cs_win_points - c.win_points)) ELSE 0 END
                        + (COALESCE(pm.goals, 0) * c.goals_scored_points)
                    WHEN pm.result = 'draw' THEN
                        c.draw_points
                        + CASE WHEN COALESCE(pm.clean_sheet, false) THEN (c.cs_draw_points - c.draw_points) ELSE 0 END
                        + (COALESCE(pm.goals, 0) * c.goals_scored_points)
                    WHEN pm.result = 'loss' THEN
                        c.loss_points
                        + CASE WHEN ABS(CASE WHEN pm.team = 'A' THEN m.team_a_score - m.team_b_score ELSE m.team_b_score - m.team_a_score END) >= c.heavy_win_threshold
                               THEN (c.heavy_loss_points - c.loss_points) ELSE 0 END
                        + (COALESCE(pm.goals, 0) * c.goals_scored_points)
                    ELSE 0
                END
            ) as fantasy_points
        FROM player_matches pm
        JOIN matches m ON pm.match_id = m.match_id AND m.tenant_id = target_tenant_id
        JOIN players p ON pm.player_id = p.player_id
        CROSS JOIN temp_fantasy_config c
        WHERE p.is_ringer = false AND pm.tenant_id = target_tenant_id AND p.tenant_id = target_tenant_id
        GROUP BY pm.player_id
        HAVING COUNT(*) >= min_games_for_hof
    )
    INSERT INTO aggregated_all_time_stats (
        player_id, tenant_id, games_played, wins, draws, losses, goals,
        win_percentage, minutes_per_goal, heavy_wins, heavy_win_percentage,
        heavy_losses, heavy_loss_percentage, clean_sheets, clean_sheet_percentage,
        fantasy_points, points_per_game, name, is_retired, selected_club, last_updated
    )
    SELECT
        pbs.player_id, target_tenant_id, pbs.games_played, pbs.wins, pbs.draws, pbs.losses, pbs.goals,
        ROUND((CASE WHEN pbs.games_played > 0 THEN pbs.wins::numeric / pbs.games_played * 100 ELSE 0 END), 1),
        CASE WHEN pbs.goals > 0 THEN ROUND((pbs.games_played::numeric * match_duration / pbs.goals), 1) ELSE NULL END,
        pbs.heavy_wins,
        ROUND((CASE WHEN pbs.games_played > 0 THEN pbs.heavy_wins::numeric / pbs.games_played * 100 ELSE 0 END), 1),
        pbs.heavy_losses,
        ROUND((CASE WHEN pbs.games_played > 0 THEN pbs.heavy_losses::numeric / pbs.games_played * 100 ELSE 0 END), 1),
        pbs.clean_sheets,
        ROUND((CASE WHEN pbs.games_played > 0 THEN pbs.clean_sheets::numeric / pbs.games_played * 100 ELSE 0 END), 1),
        pbs.fantasy_points,
        ROUND((CASE WHEN pbs.games_played > 0 THEN pbs.fantasy_points::numeric / pbs.games_played ELSE 0 END), 1),
        p.name, -- Pull name from players table
        p.is_retired, -- Pull is_retired from players table
        p.selected_club, -- Pull club from players table
        NOW() -- last_updated
    FROM player_base_stats pbs
    JOIN players p ON pbs.player_id = p.player_id AND p.tenant_id = target_tenant_id;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'update_aggregated_all_time_stats completed. Inserted % rows.', inserted_count;

    -- Clean up temp table
    DROP TABLE IF EXISTS temp_fantasy_config;

    -- Update Cache Metadata
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type, tenant_id)
    VALUES ('all_time_stats', NOW(), 'match_result', target_tenant_id)
    ON CONFLICT (cache_key, tenant_id) DO UPDATE SET last_invalidated = NOW();

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_aggregated_all_time_stats: %', SQLERRM;
END;
$$; 