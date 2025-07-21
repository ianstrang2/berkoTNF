-- BerkoTNF Performance Rating System Validation Query
-- This query shows all players, their historical 6-month blocks, and rating calculations
-- Use this to validate whether the algorithm is working as expected

WITH 
-- Step 1: Extract all historical blocks for each player
player_blocks AS (
    SELECT 
        p.player_id,
        p.name,
        -- Extract each historical block from the JSONB array
        (block_data->>'start_date')::DATE AS period_start,
        (block_data->>'end_date')::DATE AS period_end,
        (block_data->>'games_played')::INT AS matches_played,
        (block_data->>'games_possible')::INT AS matches_possible,
        (block_data->>'fantasy_points')::DECIMAL AS weighted_fantasy_points,
        (block_data->>'goals')::DECIMAL AS weighted_goals,
        (block_data->>'weights_sum')::DECIMAL AS weights_sum,
        (block_data->>'participation_rate')::DECIMAL AS participation_rate,
        -- Calculate per-game averages (this is what the rating system uses)
        CASE 
            WHEN (block_data->>'weights_sum')::DECIMAL > 0 
            THEN ROUND((block_data->>'fantasy_points')::DECIMAL / (block_data->>'weights_sum')::DECIMAL, 2)
            ELSE 0 
        END AS points_per_weighted_game,
        CASE 
            WHEN (block_data->>'weights_sum')::DECIMAL > 0 
            THEN ROUND((block_data->>'goals')::DECIMAL / (block_data->>'weights_sum')::DECIMAL, 2)
            ELSE 0 
        END AS goals_per_weighted_game,
        ROUND((block_data->>'participation_rate')::DECIMAL * 100, 1) AS participation_percentage
    FROM players p
    JOIN aggregated_half_season_stats ahs ON p.player_id = ahs.player_id
    CROSS JOIN LATERAL jsonb_array_elements(ahs.historical_blocks) AS block_data
    WHERE p.is_ringer = FALSE
),

-- Step 2: Get current power ratings and league stats for percentage calculation
current_ratings AS (
    SELECT 
        player_id,
        trend_rating,
        trend_goal_threat,
        trend_participation,
        league_avg_goal_threat,
        league_avg_participation,
        updated_at
    FROM aggregated_player_power_ratings
),

-- Step 3: Calculate league maximums for percentage scaling (qualified players only)
league_stats AS (
    SELECT 
        -- Use qualified maximum (players with 15+ games) for scaling
        MAX(CASE WHEN ahs.games_played >= 15 THEN cr.trend_rating END) AS power_rating_max,
        MAX(CASE WHEN ahs.games_played >= 15 THEN cr.trend_goal_threat END) AS goal_threat_max,
        AVG(cr.trend_rating) AS power_rating_avg,
        AVG(cr.trend_goal_threat) AS goal_threat_avg,
        COUNT(*) AS total_players
    FROM current_ratings cr
    JOIN aggregated_half_season_stats ahs ON cr.player_id = ahs.player_id
    WHERE cr.trend_rating IS NOT NULL
),

-- Step 4: Calculate player tier and total career games
player_tiers AS (
    SELECT 
        pb.player_id,
        pb.name,
        SUM(pb.matches_played) AS total_career_games,
        CASE 
            WHEN SUM(pb.matches_played) <= 30 THEN 'NEW'
            WHEN SUM(pb.matches_played) <= 75 THEN 'DEVELOPING'
            ELSE 'ESTABLISHED'
        END AS player_tier
    FROM player_blocks pb
    GROUP BY pb.player_id, pb.name
)

-- Final output: Complete validation view
SELECT 
    -- Player info
    pb.player_id,
    pb.name,
    pt.player_tier,
    pt.total_career_games,
    
    -- Period info
    pb.period_start,
    pb.period_end,
    CONCAT(
        EXTRACT(YEAR FROM pb.period_start), 
        CASE 
            WHEN EXTRACT(MONTH FROM pb.period_start) = 1 THEN '-H1'
            ELSE '-H2'
        END
    ) AS period_label,
    
    -- Raw period data
    pb.matches_played,
    pb.matches_possible,
    pb.participation_percentage,
    pb.weighted_fantasy_points,
    pb.weighted_goals,
    pb.weights_sum,
    
    -- Calculated period ratings (what the algorithm uses)
    pb.points_per_weighted_game AS period_power_rating,
    pb.goals_per_weighted_game AS period_goal_threat,
    LEAST(1.5, pb.goals_per_weighted_game) AS period_goal_threat_capped,
    
    -- Current ratings (trend-adjusted)
    cr.trend_rating AS current_power_rating,
    cr.trend_goal_threat AS current_goal_threat,
    cr.trend_participation AS current_participation,
    
    -- Percentage display (how it appears in UI)
    CASE 
        WHEN cr.trend_rating IS NOT NULL AND ls.power_rating_max > 0 
        THEN LEAST(100, ROUND((cr.trend_rating / ls.power_rating_max) * 100, 1))
        ELSE NULL 
    END AS power_rating_percentage,
    
    CASE 
        WHEN cr.trend_goal_threat IS NOT NULL AND ls.goal_threat_max > 0 
        THEN LEAST(100, ROUND((cr.trend_goal_threat / ls.goal_threat_max) * 100, 1))
        ELSE NULL 
    END AS goal_threat_percentage,
    
    ROUND(cr.trend_participation, 1) AS participation_percentage_display,
    
    -- League context
    ls.power_rating_max AS league_power_max,
    ls.goal_threat_max AS league_goal_max,
    ROUND(ls.power_rating_avg, 2) AS league_power_avg,
    ROUND(ls.goal_threat_avg, 2) AS league_goal_avg,
    
    -- Period analysis helpers
    ROW_NUMBER() OVER (PARTITION BY pb.player_id ORDER BY pb.period_end DESC) AS period_recency_rank,
    COUNT(*) OVER (PARTITION BY pb.player_id) AS total_periods,
    
    -- Last updated
    cr.updated_at AS ratings_updated

FROM player_blocks pb
JOIN player_tiers pt ON pb.player_id = pt.player_id
LEFT JOIN current_ratings cr ON pb.player_id = cr.player_id
CROSS JOIN league_stats ls

ORDER BY 
    pt.total_career_games DESC,  -- Most experienced players first
    pb.player_id,
    pb.period_end DESC           -- Most recent periods first for each player

-- Example usage and interpretation:
-- 1. Look for players with unexpected rating changes between periods
-- 2. Verify tier classification makes sense (NEW/DEVELOPING/ESTABLISHED)
-- 3. Check if trend_rating is reasonably derived from recent period_power_rating values
-- 4. Ensure percentage calculations look reasonable (no one over 100%)
-- 5. Validate that capped goal threat (1.5 max) is applied correctly
-- 6. Check participation calculations match expected attendance patterns

-- Key patterns to look for:
-- - NEW players: Should have responsive ratings, may have fewer periods
-- - DEVELOPING players: Should show progression, moderate stability
-- - ESTABLISHED players: Should have stable ratings with outlier protection
-- - Recent periods (period_recency_rank = 1,2) should heavily influence current ratings
-- - Players with many periods should show gradual evolution, not wild swings 