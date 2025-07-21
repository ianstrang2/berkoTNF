-- Trend Analysis Query for Performance Rating System
-- Focuses on how the algorithm calculates trends between periods

WITH player_blocks AS (
    SELECT 
        p.player_id,
        p.name,
        ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY (block->>'end_date')::DATE DESC) AS recency_rank,
        (block->>'end_date')::DATE AS period_end,
        (block->>'games_played')::INT AS games,
        ROUND((block->>'fantasy_points')::DECIMAL / NULLIF((block->>'weights_sum')::DECIMAL, 0), 2) AS period_power,
        ROUND((block->>'goals')::DECIMAL / NULLIF((block->>'weights_sum')::DECIMAL, 0), 3) AS period_goals,
        ROUND((block->>'participation_rate')::DECIMAL * 100, 1) AS period_participation,
        EXTRACT(YEAR FROM (block->>'start_date')::DATE)::TEXT || 
        CASE WHEN EXTRACT(MONTH FROM (block->>'start_date')::DATE) = 1 THEN '-H1' ELSE '-H2' END AS period_label
    FROM players p
    JOIN aggregated_half_season_stats ahs ON p.player_id = ahs.player_id
    CROSS JOIN jsonb_array_elements(ahs.historical_blocks) AS block
    WHERE p.is_ringer = FALSE 
    AND (block->>'games_played')::INT > 0
),
player_tiers AS (
    SELECT 
        player_id,
        name,
        SUM(games) AS total_games,
        CASE 
            WHEN SUM(games) <= 30 THEN 'NEW'
            WHEN SUM(games) <= 75 THEN 'DEVELOPING'  
            ELSE 'ESTABLISHED'
        END AS tier,
        CASE 
            WHEN SUM(games) <= 30 THEN 3  -- NEW: 3+ games per block
            WHEN SUM(games) <= 75 THEN 6  -- DEVELOPING: 6+ games per block
            ELSE 10                       -- ESTABLISHED: 10+ games per block  
        END AS tier_min_games
    FROM player_blocks
    GROUP BY player_id, name
),
trend_comparison AS (
    SELECT 
        pb1.player_id,
        pb1.name,
        pt.tier,
        pt.total_games,
        pt.tier_min_games,
        -- Most recent period (current)
        pb1.period_label AS current_period,
        pb1.games AS current_games,
        pb1.period_power AS current_power,
        pb1.period_goals AS current_goals,
        pb1.period_participation AS current_participation,
        -- Previous period
        pb2.period_label AS previous_period,
        pb2.games AS previous_games,
        pb2.period_power AS previous_power,
        pb2.period_goals AS previous_goals,
        pb2.period_participation AS previous_participation,
        -- Change calculations
        CASE 
            WHEN pb2.period_power > 0 THEN 
                ROUND(((pb1.period_power - pb2.period_power) / pb2.period_power) * 100, 1)
            ELSE NULL 
        END AS power_change_pct,
        CASE 
            WHEN pb2.period_goals > 0 THEN 
                ROUND(((pb1.period_goals - pb2.period_goals) / pb2.period_goals) * 100, 1)
            ELSE NULL 
        END AS goals_change_pct,
        -- Variation analysis (algorithm uses >10% as "consistent" threshold)
        CASE 
            WHEN pb2.period_power > 0 THEN 
                ABS((pb1.period_power - pb2.period_power) / pb2.period_power * 100) > 10
            ELSE FALSE 
        END AS is_consistent_trend,
        -- Confidence weight calculation
        LEAST(1.0, pb1.games::DECIMAL / pt.tier_min_games::DECIMAL) AS confidence_weight
    FROM player_blocks pb1
    JOIN player_tiers pt ON pb1.player_id = pt.player_id
    LEFT JOIN player_blocks pb2 ON pb1.player_id = pb2.player_id AND pb2.recency_rank = 2
    WHERE pb1.recency_rank = 1  -- Most recent period only
    AND pb1.games >= CASE pt.tier
        WHEN 'NEW' THEN 3
        WHEN 'DEVELOPING' THEN 6  
        ELSE 10
    END -- Only qualifying blocks
)
SELECT 
    tc.name,
    tc.tier,
    tc.total_games,
    tc.current_period,
    tc.current_games,
    tc.current_power,
    tc.previous_period,
    tc.previous_games,
    tc.previous_power,
    tc.power_change_pct,
    tc.is_consistent_trend,
    tc.confidence_weight,
    -- Current algorithm output
    apr.trend_rating,
    apr.trend_goal_threat,
    apr.trend_participation,
    -- Trend type prediction based on algorithm logic
    CASE 
        WHEN tc.previous_power IS NULL THEN 'Single Block'
        WHEN tc.is_consistent_trend THEN 'Consistent Trend'
        ELSE 'Inconsistent Trend'
    END AS trend_type,
    -- Expected blend ratio based on tier (Version 3.2 fixed ratios)
    CASE tc.tier
        WHEN 'NEW' THEN '90% recent + 10% historical'
        WHEN 'DEVELOPING' THEN '70% recent + 30% historical'  
        ELSE '30% recent + 70% historical'
    END AS expected_blend_ratio,
    -- Change limits by tier
    CASE tc.tier
        WHEN 'NEW' THEN '±30%'
        WHEN 'DEVELOPING' THEN '±40%'
        ELSE '±50%'
    END AS tier_change_limits
FROM trend_comparison tc
LEFT JOIN aggregated_player_power_ratings apr ON tc.player_id = apr.player_id
ORDER BY tc.total_games DESC, tc.name;

-- How to interpret this output:
--
-- 🔍 KEY VALIDATIONS:
-- 1. is_consistent_trend = TRUE when power_change_pct > 10%
--    - TRUE should use trend projection (current_power × (1 + capped_change))  
--    - FALSE should use weighted average (60% current + 40% previous)
--
-- 2. confidence_weight shows how much to trust recent data
--    - 1.0 = full confidence (enough games for tier)
--    - <1.0 = partial confidence (gets blended with long-term average)
--
-- 3. Version 3.2 blend ratios (FIXED from backwards logic):
--    - NEW: Trust recent form 90% (they have little history)
--    - DEVELOPING: Trust recent form 70% (building confidence)  
--    - ESTABLISHED: Trust recent form 30% (we know who they are)
--
-- 4. trend_rating should reflect:
--    - Recent periods more than old ones
--    - Tier-appropriate responsiveness vs stability
--    - Reasonable progression (no wild swings)
--
-- ⚠️  RED FLAGS:
-- - ESTABLISHED players with trend_rating wildly different from recent periods
-- - NEW players stuck at historical averages despite good recent form
-- - Anyone with >100% UI percentages
-- - Trend calculations that ignore large improvements/declines 