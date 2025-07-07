-- Phase 2: Data Migration - Calculate Own Goals for Historical Matches
-- Copy and paste this into Supabase SQL Editor

-- Update existing matches with calculated own goals
-- This calculates own goals as the difference between team score and sum of player goals

WITH match_calculations AS (
  SELECT 
    m.match_id,
    m.team_a_score,
    m.team_b_score,
    
    -- Calculate sum of player goals for each team
    COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) as team_a_player_goals,
    COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) as team_b_player_goals,
    
    -- Calculate own goals (team score minus player goals, minimum 0)
    GREATEST(0, m.team_a_score - COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0)) as calculated_team_a_own_goals,
    GREATEST(0, m.team_b_score - COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0)) as calculated_team_b_own_goals
    
  FROM matches m
  LEFT JOIN player_matches pm ON m.match_id = pm.match_id
  WHERE m.team_a_own_goals IS NULL OR m.team_b_own_goals IS NULL  -- Only update rows that haven't been set
  GROUP BY m.match_id, m.team_a_score, m.team_b_score
)
UPDATE matches 
SET 
  team_a_own_goals = mc.calculated_team_a_own_goals,
  team_b_own_goals = mc.calculated_team_b_own_goals
FROM match_calculations mc
WHERE matches.match_id = mc.match_id;

-- Show summary of migration results
SELECT 
  'Total matches updated' as metric,
  COUNT(*) as count
FROM matches 
WHERE team_a_own_goals IS NOT NULL AND team_b_own_goals IS NOT NULL

UNION ALL

SELECT 
  'Matches with own goals > 0' as metric,
  COUNT(*) as count
FROM matches 
WHERE team_a_own_goals > 0 OR team_b_own_goals > 0

UNION ALL

SELECT 
  'Total own goals migrated' as metric,
  (SUM(team_a_own_goals) + SUM(team_b_own_goals))::text::int as count
FROM matches; 