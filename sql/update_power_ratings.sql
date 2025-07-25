-- sql/update_power_ratings.sql  (UPDATED: EWMA Performance Rating System)
-- NEW: Calculates exponentially weighted moving average ratings with 2-year half-life
-- REPLACES: 6-month period-based system with smooth recency weighting
-- SAME FUNCTION NAME: update_power_ratings() - maintains compatibility

CREATE OR REPLACE FUNCTION update_power_ratings()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    half_life CONSTANT numeric := 730;  -- 2-year half-life
    lambda_val CONSTANT numeric := LN(2) / half_life;
    prior_weight CONSTANT numeric := 5;  -- Bayesian prior strength
    qualification_threshold CONSTANT numeric := 5;  -- Qualification threshold
BEGIN
    -- Main EWMA calculation pipeline
    WITH all_players AS (
        SELECT player_id FROM players WHERE is_retired = false
    ),
    player_join_dates AS (
        SELECT 
            player_id,
            MIN(m.match_date) AS join_date
        FROM player_matches pm
        JOIN matches m ON m.match_id = pm.match_id
        GROUP BY player_id
    ),
    matches_weighted AS (
        SELECT 
            match_id,
            match_date,
            EXP(-lambda_val * (CURRENT_DATE - match_date)::numeric) AS weight
        FROM matches
        WHERE match_date <= CURRENT_DATE
    ),
    player_raw_stats AS (
        SELECT 
            ap.player_id,
            COALESCE(pjd.join_date, '1900-01-01'::date) AS join_date,
            SUM(CASE WHEN pm.player_id IS NOT NULL THEN mw.weight ELSE 0 END) AS weighted_played,
            SUM(CASE WHEN mw.match_date >= COALESCE(pjd.join_date, '1900-01-01'::date) 
                     THEN mw.weight ELSE 0 END) AS weighted_available,
            SUM(CASE WHEN pm.player_id IS NOT NULL 
                     THEN calculate_match_fantasy_points(pm.result, pm.heavy_win, pm.heavy_loss, pm.clean_sheet) * mw.weight
                     ELSE 0 END) AS weighted_fp,
            SUM(CASE WHEN pm.player_id IS NOT NULL 
                     THEN COALESCE(pm.goals, 0) * mw.weight
                     ELSE 0 END) AS weighted_goals
        FROM all_players ap
        LEFT JOIN player_join_dates pjd ON pjd.player_id = ap.player_id
        CROSS JOIN matches_weighted mw
        LEFT JOIN player_matches pm ON pm.match_id = mw.match_id AND pm.player_id = ap.player_id
        GROUP BY ap.player_id, pjd.join_date
    ),
    league_means AS (
        SELECT 
            SUM(weighted_fp) / NULLIF(SUM(weighted_played), 0) AS mean_power,
            SUM(weighted_goals) / NULLIF(SUM(weighted_played), 0) AS mean_goal_threat
        FROM player_raw_stats prs
        JOIN players p ON p.player_id = prs.player_id
        WHERE weighted_played >= (qualification_threshold * 0.6) AND p.is_ringer = false
    ),
    player_adjusted AS (
        SELECT 
            prs.player_id,
            (prs.weighted_fp + lm.mean_power * prior_weight) / 
                (prs.weighted_played + prior_weight) AS power_rating,
            (prs.weighted_goals + lm.mean_goal_threat * prior_weight) / 
                (prs.weighted_played + prior_weight) AS goal_threat,
            CASE WHEN prs.weighted_available > 0 
                 THEN (prs.weighted_played / prs.weighted_available) * 100 
                 ELSE 0 END AS participation,
            prs.weighted_played,
            prs.weighted_available,
            prs.weighted_played >= qualification_threshold AS is_qualified,
            COALESCE(pjd.join_date, '1900-01-01'::date) AS first_match_date
        FROM player_raw_stats prs
        CROSS JOIN league_means lm
        LEFT JOIN player_join_dates pjd ON pjd.player_id = prs.player_id
    ),
    player_percentiles AS (
        SELECT 
            pa.*,
            CASE WHEN pa.is_qualified 
                 THEN ROUND((PERCENT_RANK() OVER (ORDER BY pa.power_rating) * 100)::numeric, 1) 
                 ELSE 50 END AS power_percentile,
            CASE WHEN pa.is_qualified 
                 THEN ROUND((PERCENT_RANK() OVER (ORDER BY pa.goal_threat) * 100)::numeric, 1) 
                 ELSE 50 END AS goal_percentile,
            CASE WHEN pa.is_qualified 
                 THEN ROUND((PERCENT_RANK() OVER (ORDER BY pa.participation) * 100)::numeric, 1) 
                 ELSE 50 END AS participation_percentile
        FROM player_adjusted pa
        JOIN players p ON p.player_id = pa.player_id
        -- Include ALL non-retired players (both qualified and unqualified)
        WHERE p.is_retired = false
    )
    -- Insert into EWMA table
    INSERT INTO aggregated_performance_ratings 
        (player_id, power_rating, goal_threat, participation, weighted_played, 
         weighted_available, is_qualified, power_percentile, goal_percentile, 
         participation_percentile, first_match_date, updated_at)
    SELECT 
        player_id, power_rating, goal_threat, participation, weighted_played,
        weighted_available, is_qualified, power_percentile, goal_percentile,
        participation_percentile, first_match_date, NOW()
    FROM player_percentiles
    ON CONFLICT (player_id) DO UPDATE SET
        power_rating = EXCLUDED.power_rating,
        goal_threat = EXCLUDED.goal_threat,
        participation = EXCLUDED.participation,
        weighted_played = EXCLUDED.weighted_played,
        weighted_available = EXCLUDED.weighted_available,
        is_qualified = EXCLUDED.is_qualified,
        power_percentile = EXCLUDED.power_percentile,
        goal_percentile = EXCLUDED.goal_percentile,
        participation_percentile = EXCLUDED.participation_percentile,
        first_match_date = EXCLUDED.first_match_date,
        updated_at = NOW();

    -- Update cache metadata
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('player_power_rating', NOW(), 'function_execution')
    ON CONFLICT (cache_key) DO UPDATE
    SET last_invalidated = NOW(), dependency_type = 'function_execution';
    
END;
$$; 