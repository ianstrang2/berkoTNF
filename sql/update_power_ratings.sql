-- sql/update_power_ratings.sql  (UPDATED: EWMA Performance Rating System)
-- NEW: Calculates exponentially weighted moving average ratings with 2-year half-life
-- REPLACES: 6-month period-based system with smooth recency weighting
-- SAME FUNCTION NAME: update_power_ratings() - maintains compatibility

CREATE OR REPLACE FUNCTION update_power_ratings(target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    half_life numeric;
    lambda_val numeric;
    prior_weight CONSTANT numeric := 5;  -- Bayesian prior strength
    qualification_threshold numeric;
BEGIN
    -- Phase 2: Set RLS context for this function (required for prisma_app role)
    PERFORM set_config('app.tenant_id', target_tenant_id::text, false);
    
    -- Fetch configuration values from app_config table (tenant-scoped)
    SELECT COALESCE(
        (SELECT config_value::numeric FROM app_config WHERE config_key = 'performance_half_life_days' AND tenant_id = target_tenant_id LIMIT 1),
        730  -- Default: 2-year half-life
    ) INTO half_life;
    
    SELECT COALESCE(
        (SELECT config_value::numeric FROM app_config WHERE config_key = 'performance_qualification_threshold' AND tenant_id = target_tenant_id LIMIT 1), 
        5   -- Default: minimum 5 games
    ) INTO qualification_threshold;
    
    -- Calculate lambda from half_life
    lambda_val := LN(2) / half_life;
    
    -- Main EWMA calculation pipeline (tenant-scoped)
    WITH all_players AS (
        SELECT player_id FROM players WHERE is_retired = false AND tenant_id = target_tenant_id
    ),
    player_join_dates AS (
        SELECT 
            player_id,
            MIN(m.match_date) AS join_date
        FROM player_matches pm
        JOIN matches m ON m.match_id = pm.match_id
        WHERE pm.tenant_id = target_tenant_id AND m.tenant_id = target_tenant_id
        GROUP BY player_id
    ),
    matches_weighted AS (
        SELECT 
            match_id,
            match_date,
            EXP(-lambda_val * (CURRENT_DATE - match_date)::numeric) AS weight
        FROM matches
        WHERE match_date <= CURRENT_DATE AND tenant_id = target_tenant_id
    ),
    player_raw_stats AS (
        SELECT 
            ap.player_id,
            COALESCE(pjd.join_date, '1900-01-01'::date) AS join_date,
            SUM(CASE WHEN pm.player_id IS NOT NULL THEN mw.weight ELSE 0 END) AS weighted_played,
            SUM(CASE WHEN mw.match_date >= COALESCE(pjd.join_date, '1900-01-01'::date) 
                     THEN mw.weight ELSE 0 END) AS weighted_available,
            SUM(CASE WHEN pm.player_id IS NOT NULL 
                     THEN calculate_match_fantasy_points(
                         pm.result, 
                         CASE WHEN COALESCE(pm.actual_team, pm.team) = 'A' THEN m.team_a_score - m.team_b_score WHEN COALESCE(pm.actual_team, pm.team) = 'B' THEN m.team_b_score - m.team_a_score ELSE 0 END,
                         pm.clean_sheet, 
                         pm.goals,
                         target_tenant_id
                     ) * mw.weight
                     ELSE 0 END) AS weighted_fp,
            SUM(CASE WHEN pm.player_id IS NOT NULL 
                     THEN COALESCE(pm.goals, 0) * mw.weight
                     ELSE 0 END) AS weighted_goals
        FROM all_players ap
        LEFT JOIN player_join_dates pjd ON pjd.player_id = ap.player_id
        CROSS JOIN matches_weighted mw
        LEFT JOIN player_matches pm ON pm.match_id = mw.match_id AND pm.player_id = ap.player_id AND pm.tenant_id = target_tenant_id
        LEFT JOIN matches m ON mw.match_id = m.match_id AND m.tenant_id = target_tenant_id
        GROUP BY ap.player_id, pjd.join_date
    ),
    league_means AS (
        SELECT 
            SUM(weighted_fp) / NULLIF(SUM(weighted_played), 0) AS mean_power,
            SUM(weighted_goals) / NULLIF(SUM(weighted_played), 0) AS mean_goal_threat
        FROM player_raw_stats prs
        JOIN players p ON p.player_id = prs.player_id
        WHERE weighted_played >= (qualification_threshold * 0.6) AND p.is_ringer = false AND p.tenant_id = target_tenant_id
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
            p.name, -- Pull name from players table
            p.is_retired, -- Pull is_retired from players table
            p.is_ringer, -- Pull is_ringer from players table
            p.selected_club, -- Pull selected_club from players table
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
        -- Include ALL non-retired players (both qualified and unqualified) within tenant
        WHERE p.is_retired = false AND p.tenant_id = target_tenant_id
    )
    -- Insert into EWMA table (tenant-scoped)
    INSERT INTO aggregated_performance_ratings 
        (player_id, tenant_id, power_rating, goal_threat, participation, weighted_played, 
         weighted_available, is_qualified, power_percentile, goal_percentile, 
         participation_percentile, first_match_date, name, is_retired, is_ringer, selected_club, updated_at)
    SELECT 
        player_id, target_tenant_id, power_rating, goal_threat, participation, weighted_played,
        weighted_available, is_qualified, power_percentile, goal_percentile,
        participation_percentile, first_match_date, name, is_retired, is_ringer, selected_club, NOW()
    FROM player_percentiles
    ON CONFLICT (player_id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
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
        name = EXCLUDED.name,
        is_retired = EXCLUDED.is_retired,
        is_ringer = EXCLUDED.is_ringer,
        selected_club = EXCLUDED.selected_club,
        updated_at = NOW();

    -- Update cache metadata (tenant-scoped)
    INSERT INTO cache_metadata (cache_key, tenant_id, last_invalidated, dependency_type)
    VALUES ('player_power_rating', target_tenant_id, NOW(), 'function_execution')
    ON CONFLICT (cache_key, tenant_id) DO UPDATE
    SET last_invalidated = NOW(), dependency_type = 'function_execution';
    
END;
$$; 