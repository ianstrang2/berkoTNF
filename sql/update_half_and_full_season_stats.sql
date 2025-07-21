-- sql/update_half_and_full_season_stats.sql
-- Updated for 3-metric system: Power Rating + Goal Threat + Participation (all with sophisticated trending)
-- Version 3.1: Enhanced participation calculation with same sophistication as power rating and goal threat

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
    v_games_possible INT;
    v_participation_rate DECIMAL;
    v_decayed_fantasy_points DECIMAL := 0;
    v_decayed_goals DECIMAL := 0;
    v_decayed_games DECIMAL := 0;
    v_weights_sum DECIMAL := 0;
    v_historical_blocks JSONB := '[]';
    
    -- Variables for trend calculation
    v_blocks_count INT;
    v_valid_blocks_count INT;
    v_block_data JSONB;
    v_prev_block_data JSONB;
    v_trend_rating DECIMAL;
    v_trend_goal_threat DECIMAL;
    v_trend_participation DECIMAL;
    v_long_term_avg_rating DECIMAL;
    v_long_term_avg_goals DECIMAL;
    v_long_term_avg_participation DECIMAL;
    v_percentage_change DECIMAL;
    v_variation DECIMAL;
    v_is_consistent BOOLEAN;
    
    -- Variables for league averages
    v_sum_trend_rating DECIMAL := 0;
    v_sum_trend_goal_threat DECIMAL := 0;
    v_sum_trend_participation DECIMAL := 0;
    v_count_players INT := 0;
    v_league_avg_goal_threat DECIMAL;
    v_league_avg_participation DECIMAL;
    
    -- Additional variables for trend calculation
    v_block_rating DECIMAL;
    v_prev_block_rating DECIMAL;
    v_block_goals DECIMAL;
    v_prev_block_goals DECIMAL;
    v_block_participation DECIMAL;
    v_prev_block_participation DECIMAL;
    v_sum_percentage_changes DECIMAL := 0;
    v_percentage_changes_count INT := 0;
    v_last_two_avg_rating DECIMAL;
    v_last_two_avg_goals DECIMAL;
    v_player_years INT[];
    v_year_idx INT;
    
    -- Variables for multi-tiered system
    v_tier_min_games INT;
    v_player_tier TEXT;
    v_confidence_weight DECIMAL;
    v_recent_block_games INT;
BEGIN
    RAISE NOTICE 'Starting update_half_and_full_season_stats with 2-metric system (Power + Goal + Participation)...';
    RAISE NOTICE 'Using config: match_duration=%', match_duration;
    RAISE NOTICE 'Calculating half-season stats (Start: %, End: %)...', half_season_start_date, half_season_end_date;

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

        -- FIX #1: Only get years where this player actually has matches
        SELECT ARRAY(
            SELECT DISTINCT EXTRACT(YEAR FROM m.match_date)::INT
            FROM player_matches pm
            JOIN matches m ON pm.match_id = m.match_id
            WHERE pm.player_id = v_player_id
            ORDER BY 1
        ) INTO v_player_years;

        -- Calculate historical blocks only for years where player has matches
        FOR v_year_idx IN 1..array_length(v_player_years, 1) LOOP
            historical_year := v_player_years[v_year_idx];
            
            -- First half: Jan 1 - Jun 30
            v_block_start := MAKE_DATE(historical_year, 1, 1);
            v_block_end := MAKE_DATE(historical_year, 6, 30);
            
            -- Calculate total possible games in this period
            SELECT COUNT(*) INTO v_games_possible
            FROM matches m
            WHERE m.match_date::date BETWEEN v_block_start AND v_block_end;
            
            -- Calculate block statistics with proper decay weights
            SELECT 
                COALESCE(SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false)) * POWER(2, -((v_block_end - m.match_date::date) / 180.0))), 0),
                COALESCE(SUM(COALESCE(pm.goals, 0) * POWER(2, -((v_block_end - m.match_date::date) / 180.0))), 0),
                COALESCE(SUM(POWER(2, -((v_block_end - m.match_date::date) / 180.0))), 0),
                COALESCE(COUNT(*), 0)
            INTO v_decayed_fantasy_points, v_decayed_goals, v_weights_sum, v_raw_games
            FROM player_matches pm
            JOIN matches m ON pm.match_id = m.match_id
            WHERE pm.player_id = v_player_id 
            AND m.match_date::date BETWEEN v_block_start AND v_block_end;

            -- Calculate participation rate
            v_participation_rate := CASE 
                WHEN v_games_possible > 0 THEN v_raw_games::DECIMAL / v_games_possible::DECIMAL 
                ELSE 0 
            END;

            -- Only add block if there's actual data
            IF v_raw_games > 0 THEN
                v_historical_blocks := v_historical_blocks || jsonb_build_object(
                    'start_date', v_block_start,
                    'end_date', v_block_end,
                    'fantasy_points', v_decayed_fantasy_points,
                    'goals', v_decayed_goals,
                    'games_played', v_raw_games,
                    'games_possible', v_games_possible,
                    'participation_rate', v_participation_rate,
                    'weights_sum', v_weights_sum
                );
            END IF;

            -- Second half: Jul 1 - Dec 31 (only if not current year or if we're past June)
            IF historical_year < current_year OR (historical_year = current_year AND DATE_PART('month', CURRENT_DATE) > 6) THEN
                v_block_start := MAKE_DATE(historical_year, 7, 1);
                v_block_end := MAKE_DATE(historical_year, 12, 31);
                
                -- Calculate total possible games in this period
                SELECT COUNT(*) INTO v_games_possible
                FROM matches m
                WHERE m.match_date::date BETWEEN v_block_start AND v_block_end;
                
                -- Calculate block statistics with proper decay weights
                SELECT 
                    COALESCE(SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false)) * POWER(2, -((v_block_end - m.match_date::date) / 180.0))), 0),
                    COALESCE(SUM(COALESCE(pm.goals, 0) * POWER(2, -((v_block_end - m.match_date::date) / 180.0))), 0),
                    COALESCE(SUM(POWER(2, -((v_block_end - m.match_date::date) / 180.0))), 0),
                    COALESCE(COUNT(*), 0)
                INTO v_decayed_fantasy_points, v_decayed_goals, v_weights_sum, v_raw_games
                FROM player_matches pm
                JOIN matches m ON pm.match_id = m.match_id
                WHERE pm.player_id = v_player_id 
                AND m.match_date::date BETWEEN v_block_start AND v_block_end;

                -- Calculate participation rate
                v_participation_rate := CASE 
                    WHEN v_games_possible > 0 THEN v_raw_games::DECIMAL / v_games_possible::DECIMAL 
                    ELSE 0 
                END;

                -- Only add block if there's actual data
                IF v_raw_games > 0 THEN
                    v_historical_blocks := v_historical_blocks || jsonb_build_object(
                        'start_date', v_block_start,
                        'end_date', v_block_end,
                        'fantasy_points', v_decayed_fantasy_points,
                        'goals', v_decayed_goals,
                        'games_played', v_raw_games,
                        'games_possible', v_games_possible,
                        'participation_rate', v_participation_rate,
                        'weights_sum', v_weights_sum
                    );
                END IF;
            END IF;
        END LOOP;

        -- Update existing records only with historical_blocks
        UPDATE aggregated_half_season_stats 
        SET historical_blocks = v_historical_blocks
        WHERE player_id = v_player_id;

        -- FIX #2: Calculate trend-based metrics with improved multi-tiered logic
        v_blocks_count := jsonb_array_length(v_historical_blocks);
        
        -- Count valid blocks (blocks with actual data)
        SELECT COUNT(*) INTO v_valid_blocks_count
        FROM jsonb_array_elements(v_historical_blocks) AS elem
        WHERE (elem->>'weights_sum')::DECIMAL > 0;
        
        -- Calculate total career games for tier determination
        SELECT SUM((elem->>'games_played')::INT) INTO v_raw_games
        FROM jsonb_array_elements(v_historical_blocks) AS elem;
        
        IF v_valid_blocks_count = 0 THEN
            -- New player with no historical data - return NULL (no fake data)
            v_trend_rating := NULL;
            v_trend_goal_threat := NULL;
            v_trend_participation := NULL;
        ELSIF v_valid_blocks_count = 1 THEN
            -- Single valid block player - use that block's decayed averages
            SELECT elem INTO v_block_data
            FROM jsonb_array_elements(v_historical_blocks) AS elem
            WHERE (elem->>'weights_sum')::DECIMAL > 0
            LIMIT 1;
            
            v_trend_rating := (v_block_data->>'fantasy_points')::DECIMAL / NULLIF((v_block_data->>'weights_sum')::DECIMAL, 0);
            v_trend_goal_threat := LEAST(1.5, COALESCE((v_block_data->>'goals')::DECIMAL / NULLIF((v_block_data->>'weights_sum')::DECIMAL, 0), 0));
            v_trend_participation := COALESCE((v_block_data->>'participation_rate')::DECIMAL * 100, NULL);
        ELSE
            -- FIX #3: Multi-tiered adaptive trend calculation system
                -- Determine player tier and minimum block size
                IF v_raw_games <= 30 THEN
                    v_tier_min_games := 3;  -- New players: lenient for first games
                    v_player_tier := 'NEW';
                ELSIF v_raw_games <= 75 THEN
                    v_tier_min_games := 6;  -- Developing players: moderate requirements
                    v_player_tier := 'DEVELOPING';
                ELSE
                    v_tier_min_games := 10; -- Established players: high reliability requirement
                    v_player_tier := 'ESTABLISHED';
                END IF;
                
                RAISE NOTICE 'Player % is % tier with % total games, requiring % games per block', 
                    v_player_id, v_player_tier, v_raw_games, v_tier_min_games;
                
                -- Get the last two qualifying blocks based on tier requirements
                WITH qualifying_blocks AS (
                    SELECT elem, ROW_NUMBER() OVER (ORDER BY (elem->>'end_date')::DATE DESC) as rn
                    FROM jsonb_array_elements(v_historical_blocks) AS elem
                    WHERE (elem->>'weights_sum')::DECIMAL > 0 
                    AND (elem->>'games_played')::INT >= v_tier_min_games
                )
                SELECT 
                    (SELECT elem FROM qualifying_blocks WHERE rn = 1),
                    (SELECT elem FROM qualifying_blocks WHERE rn = 2)
                INTO v_block_data, v_prev_block_data;
                
                -- If no blocks meet tier requirements, fall back with relaxed standards
                IF v_block_data IS NULL THEN
                    -- For established players, look for any block with 5+ games
                    IF v_player_tier = 'ESTABLISHED' THEN
                        WITH fallback_blocks AS (
                            SELECT elem, ROW_NUMBER() OVER (ORDER BY (elem->>'end_date')::DATE DESC) as rn
                            FROM jsonb_array_elements(v_historical_blocks) AS elem
                            WHERE (elem->>'weights_sum')::DECIMAL > 0 
                            AND (elem->>'games_played')::INT >= 5
                        )
                        SELECT 
                            (SELECT elem FROM fallback_blocks WHERE rn = 1),
                            (SELECT elem FROM fallback_blocks WHERE rn = 2)
                        INTO v_block_data, v_prev_block_data;
                    END IF;
                    
                    -- Final fallback: use any valid blocks
                    IF v_block_data IS NULL THEN
                        WITH any_valid_blocks AS (
                            SELECT elem, ROW_NUMBER() OVER (ORDER BY (elem->>'end_date')::DATE DESC) as rn
                            FROM jsonb_array_elements(v_historical_blocks) AS elem
                            WHERE (elem->>'weights_sum')::DECIMAL > 0
                        )
                        SELECT 
                            (SELECT elem FROM any_valid_blocks WHERE rn = 1),
                            (SELECT elem FROM any_valid_blocks WHERE rn = 2)
                        INTO v_block_data, v_prev_block_data;
                    END IF;
                END IF;
                
                -- Calculate base trend metrics from the selected blocks
                v_block_rating := COALESCE((v_block_data->>'fantasy_points')::DECIMAL / NULLIF((v_block_data->>'weights_sum')::DECIMAL, 0), 0);
                v_block_goals := COALESCE((v_block_data->>'goals')::DECIMAL / NULLIF((v_block_data->>'weights_sum')::DECIMAL, 0), 0);
                v_block_participation := COALESCE((v_block_data->>'participation_rate')::DECIMAL * 100, 75.0);
                v_recent_block_games := (v_block_data->>'games_played')::INT;
                
                -- Calculate long-term average for outlier detection (established players only)
                IF v_player_tier = 'ESTABLISHED' THEN
                    SELECT 
                        AVG((elem->>'fantasy_points')::DECIMAL / NULLIF((elem->>'weights_sum')::DECIMAL, 0)),
                        AVG((elem->>'goals')::DECIMAL / NULLIF((elem->>'weights_sum')::DECIMAL, 0)),
                        AVG((elem->>'participation_rate')::DECIMAL * 100)
                    INTO v_long_term_avg_rating, v_long_term_avg_goals, v_long_term_avg_participation
                    FROM jsonb_array_elements(v_historical_blocks) AS elem
                    WHERE (elem->>'weights_sum')::DECIMAL > 0
                    AND (elem->>'games_played')::INT >= 6; -- Use more blocks for long-term average
                    
                    -- REMOVED: Outlier capping to allow natural aging decline
                    -- Players can genuinely decline with age - don't artificially boost them
                    
                    -- Keep participation bounds only (0-100% is natural range)
                    IF v_long_term_avg_participation IS NOT NULL AND v_long_term_avg_participation > 0 THEN
                        v_block_participation := GREATEST(v_block_participation, v_long_term_avg_participation * 0.3); -- Allow 70% drops (e.g. 80% -> 24%)
                        v_block_participation := LEAST(v_block_participation, 100.0); -- Cap at 100%
                    END IF;
                END IF;
                
                IF v_prev_block_data IS NOT NULL THEN
                    v_prev_block_rating := COALESCE((v_prev_block_data->>'fantasy_points')::DECIMAL / NULLIF((v_prev_block_data->>'weights_sum')::DECIMAL, 0), 0);
                    v_prev_block_goals := COALESCE((v_prev_block_data->>'goals')::DECIMAL / NULLIF((v_prev_block_data->>'weights_sum')::DECIMAL, 0), 0);
                    v_prev_block_participation := COALESCE((v_prev_block_data->>'participation_rate')::DECIMAL * 100, NULL);
                    
                    -- REMOVED: Previous block outlier capping to allow natural aging decline
                    -- Keep participation bounds only (0-100% is natural range)
                    IF v_player_tier = 'ESTABLISHED' AND v_long_term_avg_participation IS NOT NULL AND v_long_term_avg_participation > 0 THEN
                        v_prev_block_participation := GREATEST(v_prev_block_participation, v_long_term_avg_participation * 0.3);
                        v_prev_block_participation := LEAST(v_prev_block_participation, 100.0);
                    END IF;
                END IF;
                
                -- Calculate variation with improved logic (FIXED: handle negative ratings)
                IF v_prev_block_rating > 0 THEN
                    v_variation := ABS((v_block_rating - v_prev_block_rating) / v_prev_block_rating * 100);
                ELSIF v_prev_block_rating < 0 AND v_block_rating > 0 THEN
                    -- Negative to positive transition: always treat as consistent upward trend
                    v_variation := 100; -- Force consistent trend path
                ELSIF v_prev_block_rating < 0 AND v_block_rating < 0 THEN
                    -- Both negative: calculate variation based on absolute values
                    v_variation := ABS((v_block_rating - v_prev_block_rating) / ABS(v_prev_block_rating) * 100);
                ELSE
                    -- Edge case: zero or other unusual values
                    v_variation := 0;
                END IF;
                
                v_is_consistent := v_variation > 10;
                
                IF v_is_consistent THEN
                    -- Consistent trend: use percentage change with safeguards
                    IF v_prev_block_rating > 0 THEN
                        v_percentage_change := (v_block_rating - v_prev_block_rating) / v_prev_block_rating;
                    ELSIF v_prev_block_rating < 0 AND v_block_rating > 0 THEN
                        -- Negative to positive: treat as significant positive change (capped)
                        v_percentage_change := 0.5; -- 50% improvement (will be capped by tier limits)
                    ELSIF v_prev_block_rating < 0 AND v_block_rating < 0 THEN
                        -- Both negative: calculate change based on absolute values
                        v_percentage_change := (ABS(v_block_rating) - ABS(v_prev_block_rating)) / ABS(v_prev_block_rating);
                        -- Flip sign if getting more negative
                        IF v_block_rating < v_prev_block_rating THEN
                            v_percentage_change := -v_percentage_change;
                        END IF;
                    ELSE
                        v_percentage_change := 0;
                    END IF;
                    
                    -- Apply tier-specific percentage change limits
                    CASE v_player_tier
                        WHEN 'NEW' THEN 
                            v_percentage_change := GREATEST(-0.3, LEAST(0.3, v_percentage_change)); -- ±30% for new players
                        WHEN 'DEVELOPING' THEN 
                            v_percentage_change := GREATEST(-0.4, LEAST(0.4, v_percentage_change)); -- ±40% for developing
                        ELSE 
                            v_percentage_change := GREATEST(-0.5, LEAST(0.5, v_percentage_change)); -- ±50% for established
                    END CASE;
                    
                    v_trend_rating := v_block_rating * (1 + v_percentage_change);
                    
                    v_percentage_change := CASE WHEN v_prev_block_goals > 0 THEN (v_block_goals - v_prev_block_goals) / v_prev_block_goals ELSE 0 END;
                    v_percentage_change := GREATEST(-0.4, LEAST(0.4, v_percentage_change)); -- ±40% for goals
                    v_trend_goal_threat := v_block_goals * (1 + v_percentage_change);
                    
                    -- Participation trend: more conservative change limits (attendance is generally more stable)
                    v_percentage_change := CASE WHEN v_prev_block_participation > 0 THEN (v_block_participation - v_prev_block_participation) / v_prev_block_participation ELSE 0 END;
                    v_percentage_change := GREATEST(-0.25, LEAST(0.25, v_percentage_change)); -- ±25% for participation
                    v_trend_participation := v_block_participation * (1 + v_percentage_change);
                ELSE
                    -- Inconsistent trend: use weighted average
                    v_trend_rating := 0.6 * v_block_rating + 0.4 * v_prev_block_rating;
                    v_trend_goal_threat := 0.6 * v_block_goals + 0.4 * v_prev_block_goals;
                    v_trend_participation := 0.6 * v_block_participation + 0.4 * v_prev_block_participation;
                END IF;
                
                -- Calculate confidence weight based on recent block sample size
                v_confidence_weight := LEAST(1.0, v_recent_block_games::DECIMAL / v_tier_min_games::DECIMAL);
                
                -- Apply confidence weighting with long-term averages
                SELECT 
                    AVG((elem->>'fantasy_points')::DECIMAL / NULLIF((elem->>'weights_sum')::DECIMAL, 0)),
                    AVG((elem->>'goals')::DECIMAL / NULLIF((elem->>'weights_sum')::DECIMAL, 0)),
                    AVG((elem->>'participation_rate')::DECIMAL * 100)
                INTO v_long_term_avg_rating, v_long_term_avg_goals, v_long_term_avg_participation
                FROM jsonb_array_elements(v_historical_blocks) AS elem
                WHERE (elem->>'weights_sum')::DECIMAL > 0
                AND (elem->>'games_played')::INT >= CASE 
                    WHEN v_player_tier = 'NEW' THEN 2
                    WHEN v_player_tier = 'DEVELOPING' THEN 4  
                    ELSE 6
                END;
                
                -- Blend with long-term average based on confidence and tier (FIXED: logical ratios)
                IF v_long_term_avg_rating IS NOT NULL THEN
                    CASE v_player_tier
                        WHEN 'NEW' THEN
                            -- New players: trust recent form (we don't know their history yet)
                            v_trend_rating := (0.9 * v_confidence_weight * v_trend_rating) + 
                                            (0.1 * v_long_term_avg_rating);
                            v_trend_goal_threat := (0.9 * v_confidence_weight * v_trend_goal_threat) + 
                                                 (0.1 * COALESCE(v_long_term_avg_goals, 0));
                            v_trend_participation := (0.9 * v_confidence_weight * v_trend_participation) + 
                                                    (0.1 * COALESCE(v_long_term_avg_participation, 0));
                        WHEN 'DEVELOPING' THEN
                            -- Developing players: moderate trust in recent form
                            v_trend_rating := (0.7 * v_confidence_weight * v_trend_rating) + 
                                            ((1 - 0.7 * v_confidence_weight) * v_long_term_avg_rating);
                            v_trend_goal_threat := (0.7 * v_confidence_weight * v_trend_goal_threat) + 
                                                 ((1 - 0.7 * v_confidence_weight) * COALESCE(v_long_term_avg_goals, 0));
                            v_trend_participation := (0.7 * v_confidence_weight * v_trend_participation) + 
                                                    ((1 - 0.7 * v_confidence_weight) * COALESCE(v_long_term_avg_participation, 0));
                        ELSE
                            -- Established players: trust historical performance (we know who they are)
                            v_trend_rating := (0.3 * v_confidence_weight * v_trend_rating) + 
                                            (0.7 * v_long_term_avg_rating);
                            v_trend_goal_threat := (0.3 * v_confidence_weight * v_trend_goal_threat) + 
                                                 (0.7 * COALESCE(v_long_term_avg_goals, 0));
                            v_trend_participation := (0.3 * v_confidence_weight * v_trend_participation) + 
                                                    (0.7 * COALESCE(v_long_term_avg_participation, 0));
                    END CASE;
                END IF;
                
                -- Apply participation bounds (0-100%) only - remove artificial rating floors to allow aging decline
                IF v_trend_participation IS NOT NULL THEN
                    v_trend_participation := GREATEST(0.0, LEAST(100.0, v_trend_participation));
                END IF;
                
                -- Handle zero goals with historical context
                IF v_trend_goal_threat = 0 AND v_valid_blocks_count > 1 THEN
                    SELECT AVG((elem->>'goals')::DECIMAL / NULLIF((elem->>'weights_sum')::DECIMAL, 0))
                    INTO v_trend_goal_threat
                    FROM jsonb_array_elements(v_historical_blocks) AS elem
                    WHERE (elem->>'weights_sum')::DECIMAL > 0
                    AND (elem->>'goals')::DECIMAL > 0
                    AND (elem->>'games_played')::INT >= 3; -- Minimum 3 games for goal average
                    
                    v_trend_goal_threat := COALESCE(v_trend_goal_threat, 0);
                END IF;
                
                -- Cap trend_goal_threat at 1.5
                v_trend_goal_threat := LEAST(1.5, GREATEST(0.0, v_trend_goal_threat));
        END IF;

        -- Insert/Update aggregated_player_power_ratings with trend-based metrics (no fake defaults)
        INSERT INTO aggregated_player_power_ratings (
            player_id, rating, variance, effective_games, goal_threat,
            trend_rating, trend_goal_threat, trend_participation
        ) VALUES (
            v_player_id, 
            v_trend_rating, -- No fake default - show real data quality
            0.10, -- Default variance
            COALESCE(v_raw_games, 0), 
            v_trend_goal_threat, -- No fake default - show real data quality
            v_trend_rating, -- No fake default - show real data quality
            v_trend_goal_threat, -- No fake default - show real data quality
            v_trend_participation -- No fake default - show real data quality
        ) ON CONFLICT (player_id) DO UPDATE SET
            trend_rating = EXCLUDED.trend_rating,
            trend_goal_threat = EXCLUDED.trend_goal_threat,
            trend_participation = EXCLUDED.trend_participation,
            rating = EXCLUDED.rating,
            goal_threat = EXCLUDED.goal_threat,
            updated_at = NOW();
    END LOOP;

    -- Calculate and update league averages (2-metric system + participation)
    SELECT 
        AVG(trend_goal_threat),
        AVG(trend_participation),
        COUNT(*)
    INTO v_league_avg_goal_threat, v_league_avg_participation, v_count_players
    FROM aggregated_player_power_ratings 
    WHERE trend_rating IS NOT NULL;

    -- Update all records with league averages (using WHERE TRUE for safety)
    UPDATE aggregated_player_power_ratings 
    SET 
        league_avg_goal_threat = v_league_avg_goal_threat,
        league_avg_participation = v_league_avg_participation
    WHERE player_id IS NOT NULL;

    RAISE NOTICE 'Finished calculating half-season stats with 3-metric system (Power + Goal + Participation).';

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

    RAISE NOTICE 'Updating player_power_ratings cache metadata...';
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('player_power_ratings', NOW(), 'player_power_ratings')
    ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();

    RAISE NOTICE 'Season stats update complete with 6-month block trend algorithm.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_half_and_full_season_stats: %', SQLERRM;
END;
$$; 