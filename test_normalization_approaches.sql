-- Test Range vs Standard Deviation Normalization with Real Match Data
-- This will help you decide which normalization approach works better

WITH recent_match_data AS (
  -- Get last 3 matches for testing
  SELECT 
    pm.match_id,
    pm.team,
    pm.player_id,
    apr.trend_rating,
    apr.trend_goal_threat
  FROM player_matches pm
  JOIN aggregated_player_power_ratings apr ON pm.player_id = apr.player_id
  WHERE pm.match_id IN (
    SELECT match_id 
    FROM matches 
    WHERE match_date >= '2024-06-01'
    ORDER BY match_date DESC 
    LIMIT 3
  )
),

league_stats AS (
  SELECT 
    -- For standard deviation normalization
    STDDEV(trend_rating) as power_std,
    STDDEV(trend_goal_threat) as goal_std,
    
    -- For range normalization  
    MAX(trend_rating) - MIN(trend_rating) as power_range,
    MAX(trend_goal_threat) - MIN(trend_goal_threat) as goal_range,
    
    -- Additional stats
    AVG(trend_rating) as power_mean,
    AVG(trend_goal_threat) as goal_mean
  FROM aggregated_player_power_ratings
  WHERE trend_rating IS NOT NULL
),

team_totals AS (
  SELECT 
    match_id,
    team,
    SUM(trend_rating) as team_power,
    SUM(trend_goal_threat) as team_goal_threat,
    COUNT(*) as player_count
  FROM recent_match_data
  GROUP BY match_id, team
),

balance_analysis AS (
  SELECT 
    a.match_id,
    
    -- Raw gaps
    ABS(a.team_power - b.team_power) as power_gap,
    ABS(a.team_goal_threat - b.team_goal_threat) as goal_gap,
    
    -- Standard deviation normalization (current problematic approach)
    ABS(a.team_power - b.team_power) / ls.power_std as power_gap_std_norm,
    ABS(a.team_goal_threat - b.team_goal_threat) / ls.goal_std as goal_gap_std_norm,
    
    -- Range normalization (proposed solution)
    ABS(a.team_power - b.team_power) / ls.power_range as power_gap_range_norm,
    ABS(a.team_goal_threat - b.team_goal_threat) / ls.goal_range as goal_gap_range_norm,
    
    -- Combined losses
    (ABS(a.team_power - b.team_power) / ls.power_std + 
     ABS(a.team_goal_threat - b.team_goal_threat) / ls.goal_std) as std_dev_total_loss,
     
    (ABS(a.team_power - b.team_power) / ls.power_range + 
     ABS(a.team_goal_threat - b.team_goal_threat) / ls.goal_range) as range_total_loss
     
  FROM team_totals a
  JOIN team_totals b ON a.match_id = b.match_id
  CROSS JOIN league_stats ls
  WHERE a.team = 'A' AND b.team = 'B'
)

SELECT 
  match_id,
  
  -- Raw gaps
  ROUND(power_gap::numeric, 2) as power_gap,
  ROUND(goal_gap::numeric, 3) as goal_gap,
  
  -- Standard deviation approach (problematic)
  ROUND(power_gap_std_norm::numeric, 3) as power_std_norm,
  ROUND(goal_gap_std_norm::numeric, 3) as goal_std_norm,
  ROUND(std_dev_total_loss::numeric, 3) as std_total_loss,
  
  -- Range approach (proposed fix)  
  ROUND(power_gap_range_norm::numeric, 3) as power_range_norm,
  ROUND(goal_gap_range_norm::numeric, 3) as goal_range_norm,
  ROUND(range_total_loss::numeric, 3) as range_total_loss,
  
  -- Ratio analysis
  ROUND((goal_gap_std_norm / NULLIF(power_gap_std_norm, 0))::numeric, 1) as std_goal_to_power_ratio,
  ROUND((goal_gap_range_norm / NULLIF(power_gap_range_norm, 0))::numeric, 1) as range_goal_to_power_ratio

FROM balance_analysis
ORDER BY match_id;

-- Run this as a separate query for summary stats:
/*
WITH recent_match_data AS (
  SELECT 
    pm.match_id,
    pm.team,
    pm.player_id,
    apr.trend_rating,
    apr.trend_goal_threat
  FROM player_matches pm
  JOIN aggregated_player_power_ratings apr ON pm.player_id = apr.player_id
  WHERE pm.match_id IN (
    SELECT match_id 
    FROM matches 
    WHERE match_date >= '2024-06-01'
    ORDER BY match_date DESC 
    LIMIT 3
  )
),

league_stats AS (
  SELECT 
    STDDEV(trend_rating) as power_std,
    STDDEV(trend_goal_threat) as goal_std,
    MAX(trend_rating) - MIN(trend_rating) as power_range,
    MAX(trend_goal_threat) - MIN(trend_goal_threat) as goal_range
  FROM aggregated_player_power_ratings
  WHERE trend_rating IS NOT NULL
),

team_totals AS (
  SELECT 
    match_id,
    team,
    SUM(trend_rating) as team_power,
    SUM(trend_goal_threat) as team_goal_threat
  FROM recent_match_data
  GROUP BY match_id, team
),

balance_summary AS (
  SELECT 
    a.match_id,
    ABS(a.team_power - b.team_power) / ls.power_std + 
    ABS(a.team_goal_threat - b.team_goal_threat) / ls.goal_std as std_dev_loss,
    
    ABS(a.team_power - b.team_power) / ls.power_range + 
    ABS(a.team_goal_threat - b.team_goal_threat) / ls.goal_range as range_loss
    
  FROM team_totals a
  JOIN team_totals b ON a.match_id = b.match_id
  CROSS JOIN league_stats ls
  WHERE a.team = 'A' AND b.team = 'B'
)
SELECT 
  'SUMMARY' as analysis,
  ROUND(AVG(std_dev_loss)::numeric, 3) as avg_std_dev_loss,
  ROUND(AVG(range_loss)::numeric, 3) as avg_range_loss,
  ROUND((AVG(range_loss) / AVG(std_dev_loss))::numeric, 3) as range_vs_std_ratio
FROM balance_summary;
*/ 