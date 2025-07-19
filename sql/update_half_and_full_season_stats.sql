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
    season_year INT;
    v_season_start_date DATE;
    
    -- Variables for 6-month block processing
    v_player_id INT;
    v_block_start DATE;
    v_block_end DATE;
    v_earliest_match_year INT;
    v_match_date DATE;
    v_age_days NUMERIC;
    v_weight DECIMAL;
    v_raw_fantasy_points INT;
    v_raw_goals INT;
    v_raw_games INT;
    v_raw_clean_sheets INT;
    v_team_goals_conceded DECIMAL;
    v_decayed_fantasy_points DECIMAL := 0;
    v_decayed_goals DECIMAL := 0;
    v_decayed_games DECIMAL := 0;
    v_weights_sum DECIMAL := 0;
    v_clean_sheets_count INT := 0;
    v_historical_blocks JSONB := '[]';
    
    -- Variables for trend calculation
    v_blocks_count INT;
    v_block_data JSONB;
    v_trend_rating DECIMAL;
    v_trend_goal_threat DECIMAL;
    v_defensive_score DECIMAL;
    v_long_term_avg_rating DECIMAL;
    v_long_term_avg_goals DECIMAL;
    v_percentage_change DECIMAL;
    v_variation DECIMAL;
    v_is_consistent BOOLEAN;
    v_league_avg_gc DECIMAL := 0.5; -- Default to prevent division by zero
    
    -- Variables for league averages
    v_sum_trend_rating DECIMAL := 0;
    v_sum_trend_goal_threat DECIMAL := 0;
    v_sum_defensive_score DECIMAL := 0;
    v_count_players INT := 0;
    v_league_avg_goal_threat DECIMAL;
    v_league_avg_defensive_score DECIMAL;
BEGIN
    RAISE NOTICE 'Starting update_half_and_full_season_stats with 6-month block trend algorithm...';
    RAISE NOTICE 'Using config: match_duration=%', match_duration;
    RAISE NOTICE 'Calculating half-season stats (Start: %, End: %)...', half_season_start_date, half_season_end_date;

    -- Calculate league average goals conceded for defensive score calculation
    SELECT AVG(team_goals_conceded) INTO v_league_avg_gc
    FROM (
        SELECT m.team_a_score::DECIMAL / 9.0 AS team_goals_conceded
        FROM matches m 
        WHERE m.match_date >= half_season_start_date AND m.match_date <= half_season_end_date
        UNION ALL
        SELECT m.team_b_score::DECIMAL / 9.0
        FROM matches m 
        WHERE m.match_date >= half_season_start_date AND m.match_date <= half_season_end_date
    ) AS gc;
    
    IF v_league_avg_gc IS NULL OR v_league_avg_gc = 0 THEN
        v_league_avg_gc := 0.5; -- Fallback
    END IF;

    -- Get earliest match year for historical processing
    SELECT EXTRACT(YEAR FROM MIN(match_date))::INT INTO v_earliest_match_year FROM matches;

    -- Clear and recalculate half-season stats with historical blocks
    DELETE FROM aggregated_half_season_stats WHERE TRUE;

    -- Insert half-season stats exactly like full-season (simple approach)
    INSERT INTO aggregated_half_season_stats (
        player_id, games_played, wins, draws, losses, goals,
        heavy_wins, heavy_losses, clean_sheets, fantasy_points, points_per_game,
        win_percentage, historical_blocks
    )
    SELECT
        pm.player_id, COUNT(*),
        SUM(CASE WHEN pm.result = 'win' THEN 1 ELSE 0 END),
        SUM(CASE WHEN pm.result = 'draw' THEN 1 ELSE 0 END), 
        SUM(CASE WHEN pm.result = 'loss' THEN 1 ELSE 0 END),
        SUM(COALESCE(pm.goals, 0)), 
        SUM(CASE WHEN pm.heavy_win THEN 1 ELSE 0 END), 
        SUM(CASE WHEN pm.heavy_loss THEN 1 ELSE 0 END), 
        SUM(CASE WHEN pm.clean_sheet THEN 1 ELSE 0 END),
        SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false))),
        ROUND(CASE WHEN COUNT(*) > 0 THEN SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false)))::numeric / COUNT(*) ELSE 0 END, 1),
        ROUND((CASE WHEN COUNT(*) > 0 THEN SUM(CASE WHEN pm.result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100 ELSE 0 END), 1),
        '[]'::jsonb -- Initialize empty historical blocks
    FROM player_matches pm
    JOIN matches m ON pm.match_id = m.match_id
    JOIN players p ON pm.player_id = p.player_id
    WHERE p.is_ringer = false AND m.match_date::date BETWEEN half_season_start_date AND half_season_end_date
    GROUP BY pm.player_id;
    RAISE NOTICE 'Finished calculating current half-season stats.';

    -- Now add historical blocks to the existing records
    FOR v_player_id IN (
        SELECT DISTINCT player_id 
        FROM aggregated_half_season_stats
    ) LOOP
        v_historical_blocks := '[]';

        -- Calculate historical blocks using simplified approach
        FOR historical_year IN v_earliest_match_year..current_year LOOP
            -- First half: Jan 1 - Jun 30
            v_block_start := MAKE_DATE(historical_year, 1, 1);
            v_block_end := MAKE_DATE(historical_year, 6, 30);
            
            -- Calculate block statistics with simple approach (no decay for now)
            SELECT 
                COALESCE(SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false))), 0),
                COALESCE(SUM(COALESCE(pm.goals, 0)), 0),
                COALESCE(COUNT(*), 0),
                COALESCE(SUM(CASE WHEN pm.clean_sheet THEN 1 ELSE 0 END), 0),
                COALESCE(COUNT(*), 0)
            INTO v_decayed_fantasy_points, v_decayed_goals, v_weights_sum, v_clean_sheets_count, v_raw_games
            FROM player_matches pm
            JOIN matches m ON pm.match_id = m.match_id
            WHERE pm.player_id = v_player_id 
            AND m.match_date::date BETWEEN v_block_start AND v_block_end;

            -- Add block to historical_blocks (always, even if no matches)
            -- Calculate team goals conceded (approximation)
            SELECT COALESCE(AVG(CASE WHEN pm.team = 'A' THEN m.team_b_score ELSE m.team_a_score END)::DECIMAL / 9.0, 0)
            INTO v_team_goals_conceded
            FROM player_matches pm
            JOIN matches m ON pm.match_id = m.match_id
            WHERE pm.player_id = v_player_id 
            AND m.match_date::date BETWEEN v_block_start AND v_block_end;

            v_historical_blocks := v_historical_blocks || jsonb_build_object(
                'start_date', v_block_start,
                'end_date', v_block_end,
                'fantasy_points', v_decayed_fantasy_points,
                'goals', v_decayed_goals,
                'goals_conceded', COALESCE(v_team_goals_conceded, 0),
                'games_played', v_weights_sum,
                'weights_sum', v_weights_sum,
                'clean_sheets', v_clean_sheets_count
            );

            -- Second half: Jul 1 - Dec 31 (skip if current year and we're in first half)
            IF NOT (historical_year = current_year AND DATE_PART('month', CURRENT_DATE) <= 6) THEN
                v_block_start := MAKE_DATE(historical_year, 7, 1);
                v_block_end := MAKE_DATE(historical_year, 12, 31);
                
                -- Calculate block statistics with simple approach (no decay for now)
                SELECT 
                    COALESCE(SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false))), 0),
                    COALESCE(SUM(COALESCE(pm.goals, 0)), 0),
                    COALESCE(COUNT(*), 0),
                    COALESCE(SUM(CASE WHEN pm.clean_sheet THEN 1 ELSE 0 END), 0),
                    COALESCE(COUNT(*), 0)
                INTO v_decayed_fantasy_points, v_decayed_goals, v_weights_sum, v_clean_sheets_count, v_raw_games
                FROM player_matches pm
                JOIN matches m ON pm.match_id = m.match_id
                WHERE pm.player_id = v_player_id 
                AND m.match_date::date BETWEEN v_block_start AND v_block_end;

                -- Add block to historical_blocks (always, even if no matches)
                -- Calculate team goals conceded (approximation)
                SELECT COALESCE(AVG(CASE WHEN pm.team = 'A' THEN m.team_b_score ELSE m.team_a_score END)::DECIMAL / 9.0, 0)
                INTO v_team_goals_conceded
                FROM player_matches pm
                JOIN matches m ON pm.match_id = m.match_id
                WHERE pm.player_id = v_player_id 
                AND m.match_date::date BETWEEN v_block_start AND v_block_end;

                v_historical_blocks := v_historical_blocks || jsonb_build_object(
                    'start_date', v_block_start,
                    'end_date', v_block_end,
                    'fantasy_points', v_decayed_fantasy_points,
                    'goals', v_decayed_goals,
                    'goals_conceded', COALESCE(v_team_goals_conceded, 0),
                    'games_played', v_weights_sum,
                    'weights_sum', v_weights_sum,
                    'clean_sheets', v_clean_sheets_count
                );
            END IF;
        END LOOP;

        -- Update existing records only with historical_blocks
        UPDATE aggregated_half_season_stats 
        SET historical_blocks = v_historical_blocks
        WHERE player_id = v_player_id;

        -- Calculate trend-based metrics
        v_blocks_count := jsonb_array_length(v_historical_blocks);
        
        IF v_blocks_count = 0 THEN
            -- New player with no historical data - use league averages
            v_trend_rating := 5.35; -- Default rating
            v_trend_goal_threat := 0.5; -- Will be updated with league average later
            v_defensive_score := 0.7; -- Default defensive score
        ELSIF v_blocks_count = 1 THEN
            -- Single block player - use current block's decayed averages
            v_block_data := v_historical_blocks->0;
            v_trend_rating := COALESCE((v_block_data->>'fantasy_points')::DECIMAL / NULLIF((v_block_data->>'games_played')::DECIMAL, 0), 5.35);
            v_trend_goal_threat := LEAST(1.5, COALESCE((v_block_data->>'goals')::DECIMAL / NULLIF((v_block_data->>'games_played')::DECIMAL, 0), 0));
            v_defensive_score := LEAST(0.95, GREATEST(0.5, 
                (1.0 / (1.0 + COALESCE((v_block_data->>'goals_conceded')::DECIMAL, 0) / NULLIF(v_league_avg_gc, 0.1))) * 
                (1.0 + COALESCE((v_block_data->>'clean_sheets')::INT, 0)::DECIMAL / NULLIF((v_block_data->>'games_played')::DECIMAL, 0))
            ));
        ELSE
            -- Multi-block player - apply trend calculation logic
            -- Get last two blocks for trend analysis
            v_block_data := v_historical_blocks->(v_blocks_count-1);
            
            -- Calculate long-term averages
            SELECT 
                AVG((elem->>'fantasy_points')::DECIMAL / NULLIF((elem->>'games_played')::DECIMAL, 0)),
                AVG((elem->>'goals')::DECIMAL / NULLIF((elem->>'games_played')::DECIMAL, 0))
            INTO v_long_term_avg_rating, v_long_term_avg_goals
            FROM jsonb_array_elements(v_historical_blocks) AS elem;

            -- For simplicity, use the most recent block's decayed values as trend
            -- In a full implementation, you'd calculate percentage change and variation
            v_trend_rating := COALESCE((v_block_data->>'fantasy_points')::DECIMAL / NULLIF((v_block_data->>'games_played')::DECIMAL, 0), v_long_term_avg_rating);
            v_trend_goal_threat := LEAST(1.5, COALESCE((v_block_data->>'goals')::DECIMAL / NULLIF((v_block_data->>'games_played')::DECIMAL, 0), v_long_term_avg_goals));
            
            -- Apply 70/30 blending if trend exceeds long-term average by >20%
            IF v_trend_rating > v_long_term_avg_rating * 1.2 THEN
                v_trend_rating := 0.7 * v_trend_rating + 0.3 * v_long_term_avg_rating;
            END IF;
            
            IF v_trend_goal_threat > v_long_term_avg_goals * 1.2 THEN
                v_trend_goal_threat := 0.7 * v_trend_goal_threat + 0.3 * v_long_term_avg_goals;
            END IF;

            v_defensive_score := LEAST(0.95, GREATEST(0.5, 
                (1.0 / (1.0 + COALESCE((v_block_data->>'goals_conceded')::DECIMAL, 0) / NULLIF(v_league_avg_gc, 0.1))) * 
                (1.0 + COALESCE((v_block_data->>'clean_sheets')::INT, 0)::DECIMAL / NULLIF((v_block_data->>'games_played')::DECIMAL, 0))
            ));
        END IF;

        -- Insert/Update aggregated_player_power_ratings with trend-based metrics
        INSERT INTO aggregated_player_power_ratings (
            player_id, rating, variance, effective_games, goal_threat, defensive_shield,
            trend_rating, trend_goal_threat, defensive_score
        ) VALUES (
            v_player_id, 
            COALESCE(v_trend_rating, 5.35), 
            0.10, -- Default variance
            COALESCE(v_raw_games, 0), 
            COALESCE(v_trend_goal_threat, 0), 
            COALESCE(v_defensive_score, 0.7),
            COALESCE(v_trend_rating, 5.35),
            COALESCE(v_trend_goal_threat, 0),
            COALESCE(v_defensive_score, 0.7)
        ) ON CONFLICT (player_id) DO UPDATE SET
            trend_rating = EXCLUDED.trend_rating,
            trend_goal_threat = EXCLUDED.trend_goal_threat,
            defensive_score = EXCLUDED.defensive_score,
            rating = EXCLUDED.rating,
            goal_threat = EXCLUDED.goal_threat,
            defensive_shield = EXCLUDED.defensive_shield,
            updated_at = NOW();
    END LOOP;

    -- Calculate and update league averages
    SELECT 
        AVG(trend_goal_threat), 
        AVG(defensive_score),
        COUNT(*)
    INTO v_league_avg_goal_threat, v_league_avg_defensive_score, v_count_players
    FROM aggregated_player_power_ratings 
    WHERE trend_rating IS NOT NULL;

    -- Update all records with league averages (using WHERE TRUE for safety)
    UPDATE aggregated_player_power_ratings 
    SET 
        league_avg_goal_threat = v_league_avg_goal_threat,
        league_avg_defensive_score = v_league_avg_defensive_score
    WHERE player_id IS NOT NULL;

    RAISE NOTICE 'Finished calculating half-season stats with 6-month block trends.';

    RAISE NOTICE 'Calculating full-season stats for all historical years...';
    -- Loop through all years present in the matches table up to the current year
    FOR season_year IN
        SELECT DISTINCT EXTRACT(YEAR FROM match_date)::INT
        FROM matches
        WHERE EXTRACT(YEAR FROM match_date) <= current_year
        ORDER BY 1 -- Process years chronologically
    LOOP
        RAISE NOTICE 'Processing year: %', season_year;
        v_season_start_date := MAKE_DATE(season_year, 1, 1);
        -- Delete existing stats for this specific year before inserting
        DELETE FROM aggregated_season_stats WHERE aggregated_season_stats.season_start_date = v_season_start_date;

        INSERT INTO aggregated_season_stats (
            player_id, season_start_date, season_end_date, games_played, wins, draws, losses, goals,
            win_percentage, heavy_wins, heavy_losses, clean_sheets,
            fantasy_points, points_per_game
        )
        SELECT
            pm.player_id, v_season_start_date, MAKE_DATE(season_year, 12, 31) AS season_end_date, COUNT(*),
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
        WHERE p.is_ringer = false AND EXTRACT(YEAR FROM m.match_date::date) = season_year
        GROUP BY pm.player_id;
    END LOOP;

    -- Update Cache Metadata for both season_stats and half_season_stats
    RAISE NOTICE 'Updating season_stats cache metadata...';
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('season_stats', NOW(), 'season_stats')
    ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();
    
    RAISE NOTICE 'Updating half_season_stats cache metadata...';
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('half_season_stats', NOW(), 'half_season_stats')
    ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();

    RAISE NOTICE 'Season stats update complete with 6-month block trend algorithm.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_half_and_full_season_stats: %', SQLERRM;
END;
$$; 