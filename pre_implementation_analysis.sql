-- Pre-Implementation Analysis: Validate Multi-Objective Assumptions
-- Run these queries to understand current metric distributions

-- 1. Current metric distributions and standard deviations
WITH current_metrics AS (
  SELECT 
    trend_rating,
    trend_goal_threat,
    defensive_score,
    effective_games
  FROM aggregated_player_power_ratings
  WHERE trend_rating IS NOT NULL
    AND effective_games >= 10  -- Focus on established players
)
SELECT 
  'Power Rating' as metric,
  ROUND(MIN(trend_rating)::numeric, 2) as min_val,
  ROUND(MAX(trend_rating)::numeric, 2) as max_val,
  ROUND(AVG(trend_rating)::numeric, 2) as mean_val,
  ROUND(STDDEV(trend_rating)::numeric, 2) as std_dev,
  ROUND((STDDEV(trend_rating) / AVG(trend_rating))::numeric, 3) as coeff_variation,
  COUNT(*) as player_count
FROM current_metrics

UNION ALL

SELECT 
  'Goal Threat' as metric,
  ROUND(MIN(trend_goal_threat)::numeric, 3) as min_val,
  ROUND(MAX(trend_goal_threat)::numeric, 3) as max_val,
  ROUND(AVG(trend_goal_threat)::numeric, 3) as mean_val,
  ROUND(STDDEV(trend_goal_threat)::numeric, 3) as std_dev,
  ROUND((STDDEV(trend_goal_threat) / AVG(trend_goal_threat))::numeric, 3) as coeff_variation,
  COUNT(*) as player_count
FROM current_metrics

UNION ALL

SELECT 
  'Defensive Score' as metric,
  ROUND(MIN(defensive_score)::numeric, 3) as min_val,
  ROUND(MAX(defensive_score)::numeric, 3) as max_val,
  ROUND(AVG(defensive_score)::numeric, 3) as mean_val,
  ROUND(STDDEV(defensive_score)::numeric, 3) as std_dev,
  ROUND((STDDEV(defensive_score) / AVG(defensive_score))::numeric, 3) as coeff_variation,
  COUNT(*) as player_count
FROM current_metrics;

-- 2. Analyze potential team balance gaps with current data
WITH sample_match AS (
  -- Get a recent match for testing
  SELECT 
    pm.player_id,
    pm.team,
    apr.trend_rating,
    apr.trend_goal_threat,
    apr.defensive_score
  FROM player_matches pm
  JOIN aggregated_player_power_ratings apr ON pm.player_id = apr.player_id
  WHERE pm.match_id = (
    SELECT match_id 
    FROM matches 
    WHERE match_date >= '2024-06-01'
    ORDER BY match_date DESC 
    LIMIT 1
  )
),
team_totals AS (
  SELECT 
    team,
    SUM(trend_rating) as total_power,
    SUM(trend_goal_threat) as total_goals,
    SUM(defensive_score) as total_defensive,
    COUNT(*) as player_count
  FROM sample_match
  GROUP BY team
),
league_stats AS (
  SELECT 
    STDDEV(trend_rating) as power_std,
    STDDEV(trend_goal_threat) as goal_std,
    STDDEV(defensive_score) as def_std
  FROM aggregated_player_power_ratings
  WHERE trend_rating IS NOT NULL
)
SELECT 
  'Current 3-Metric Analysis' as analysis_type,
  ABS(a.total_power - b.total_power) as power_gap,
  ABS(a.total_goals - b.total_goals) as goal_gap,
  ABS(a.total_defensive - b.total_defensive) as defensive_gap,
  
  -- Normalized gaps (multi-objective approach)
  ROUND((ABS(a.total_power - b.total_power) / ls.power_std)::numeric, 3) as power_gap_norm,
  ROUND((ABS(a.total_goals - b.total_goals) / ls.goal_std)::numeric, 3) as goal_gap_norm,
  ROUND((ABS(a.total_defensive - b.total_defensive) / ls.def_std)::numeric, 3) as def_gap_norm,
  
  -- Combined losses
  ROUND((ABS(a.total_power - b.total_power) / ls.power_std + 
         ABS(a.total_goals - b.total_goals) / ls.goal_std)::numeric, 3) as two_metric_loss,
  ROUND((ABS(a.total_power - b.total_power) / ls.power_std + 
         ABS(a.total_goals - b.total_goals) / ls.goal_std + 
         ABS(a.total_defensive - b.total_defensive) / ls.def_std)::numeric, 3) as three_metric_loss
         
FROM team_totals a
CROSS JOIN team_totals b  
CROSS JOIN league_stats ls
WHERE a.team = 'A' AND b.team = 'B';

-- 3. Test impact of removing defensive metric on balance
WITH recent_matches AS (
  SELECT match_id
  FROM matches 
  WHERE match_date >= '2024-06-01'
  ORDER BY match_date DESC
  LIMIT 10
),
match_analysis AS (
  SELECT 
    pm.match_id,
    pm.team,
    SUM(apr.trend_rating) as team_power,
    SUM(apr.trend_goal_threat) as team_goals,
    SUM(apr.defensive_score) as team_defensive
  FROM player_matches pm
  JOIN aggregated_player_power_ratings apr ON pm.player_id = apr.player_id
  JOIN recent_matches rm ON pm.match_id = rm.match_id
  GROUP BY pm.match_id, pm.team
),
balance_comparison AS (
  SELECT 
    a.match_id,
    -- Current 3-metric composite (approximate)
    ABS((a.team_power + 0.6 * a.team_goals + 0.4 * a.team_defensive) - 
        (b.team_power + 0.6 * b.team_goals + 0.4 * b.team_defensive)) as composite_gap,
    
    -- Proposed 2-metric gaps
    ABS(a.team_power - b.team_power) as power_gap,
    ABS(a.team_goals - b.team_goals) as goal_gap,
    ABS(a.team_defensive - b.team_defensive) as defensive_gap
    
  FROM match_analysis a
  JOIN match_analysis b ON a.match_id = b.match_id
  WHERE a.team = 'A' AND b.team = 'B'
)
SELECT 
  'Balance Impact Analysis' as analysis_type,
  ROUND(AVG(composite_gap)::numeric, 2) as avg_composite_gap,
  ROUND(AVG(power_gap)::numeric, 2) as avg_power_gap,
  ROUND(AVG(goal_gap)::numeric, 3) as avg_goal_gap,
  ROUND(AVG(defensive_gap)::numeric, 3) as avg_defensive_gap,
  
  -- Correlation between gaps
  ROUND(CORR(power_gap, goal_gap)::numeric, 3) as power_goal_correlation,
  ROUND(CORR(power_gap, defensive_gap)::numeric, 3) as power_def_correlation,
  ROUND(CORR(goal_gap, defensive_gap)::numeric, 3) as goal_def_correlation
  
FROM balance_comparison;

-- 4. Identify potential edge cases for multi-objective optimization
WITH player_metrics AS (
  SELECT 
    player_id,
    trend_rating,
    trend_goal_threat,
    effective_games,
    -- Identify outliers
    CASE 
      WHEN trend_rating > (SELECT AVG(trend_rating) + 2*STDDEV(trend_rating) FROM aggregated_player_power_ratings) 
      THEN 'HIGH_POWER_OUTLIER'
      WHEN trend_rating < (SELECT AVG(trend_rating) - 2*STDDEV(trend_rating) FROM aggregated_player_power_ratings) 
      THEN 'LOW_POWER_OUTLIER'
      ELSE 'NORMAL_POWER'
    END as power_category,
    
    CASE 
      WHEN trend_goal_threat > (SELECT AVG(trend_goal_threat) + 2*STDDEV(trend_goal_threat) FROM aggregated_player_power_ratings) 
      THEN 'HIGH_GOAL_OUTLIER'
      WHEN trend_goal_threat < (SELECT AVG(trend_goal_threat) - 2*STDDEV(trend_goal_threat) FROM aggregated_player_power_ratings) 
      THEN 'LOW_GOAL_OUTLIER'
      ELSE 'NORMAL_GOAL'
    END as goal_category
    
  FROM aggregated_player_power_ratings
  WHERE trend_rating IS NOT NULL
)
SELECT 
  power_category,
  goal_category,
  COUNT(*) as player_count,
  ROUND(AVG(trend_rating)::numeric, 2) as avg_power,
  ROUND(AVG(trend_goal_threat)::numeric, 3) as avg_goal_threat
FROM player_metrics
GROUP BY power_category, goal_category
ORDER BY player_count DESC;

-- 5. Simulate multi-objective vs composite scoring on sample data
WITH sample_players AS (
  SELECT 
    player_id,
    trend_rating,
    trend_goal_threat,
    ROW_NUMBER() OVER (ORDER BY trend_rating DESC) as power_rank
  FROM aggregated_player_power_ratings
  WHERE trend_rating IS NOT NULL 
    AND effective_games >= 10
  LIMIT 18  -- Simulate 9v9 match
),
league_stats AS (
  SELECT 
    AVG(trend_rating) as avg_power,
    AVG(trend_goal_threat) as avg_goal,
    STDDEV(trend_rating) as power_std,
    STDDEV(trend_goal_threat) as goal_std
  FROM aggregated_player_power_ratings
  WHERE trend_rating IS NOT NULL
),
mock_teams AS (
  SELECT 
    sp.*,
    CASE 
      WHEN power_rank % 4 IN (1, 0) THEN 'A'  -- Positions 0,3 to Team A
      ELSE 'B'  -- Positions 1,2 to Team B
    END as team
  FROM sample_players sp
)
SELECT 
  'Multi-Objective vs Composite' as comparison,
  
  -- Team A totals
  (SELECT SUM(trend_rating) FROM mock_teams WHERE team = 'A') as team_a_power,
  (SELECT SUM(trend_goal_threat) FROM mock_teams WHERE team = 'A') as team_a_goals,
  
  -- Team B totals  
  (SELECT SUM(trend_rating) FROM mock_teams WHERE team = 'B') as team_b_power,
  (SELECT SUM(trend_goal_threat) FROM mock_teams WHERE team = 'B') as team_b_goals,
  
  -- Balance metrics
  ABS((SELECT SUM(trend_rating) FROM mock_teams WHERE team = 'A') - 
      (SELECT SUM(trend_rating) FROM mock_teams WHERE team = 'B')) as power_gap,
      
  ABS((SELECT SUM(trend_goal_threat) FROM mock_teams WHERE team = 'A') - 
      (SELECT SUM(trend_goal_threat) FROM mock_teams WHERE team = 'B')) as goal_gap,
      
  -- Normalized multi-objective loss
  ROUND((
    ABS((SELECT SUM(trend_rating) FROM mock_teams WHERE team = 'A') - 
        (SELECT SUM(trend_rating) FROM mock_teams WHERE team = 'B')) / ls.power_std +
    ABS((SELECT SUM(trend_goal_threat) FROM mock_teams WHERE team = 'A') - 
        (SELECT SUM(trend_goal_threat) FROM mock_teams WHERE team = 'B')) / ls.goal_std
  )::numeric, 3) as multi_objective_loss

FROM league_stats ls; 