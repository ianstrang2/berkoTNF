-- Phase 2 Verification: Check Data Migration Results  
-- Run this after the migration to ensure data integrity

-- Check for any data inconsistencies after migration
SELECT 
  m.match_id,
  m.match_date,
  m.team_a_score,
  m.team_b_score,
  m.team_a_own_goals,
  m.team_b_own_goals,
  
  -- Calculate player goals from player_matches
  COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) as actual_team_a_player_goals,
  COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) as actual_team_b_player_goals,
  
  -- Verify: team_score should equal player_goals + own_goals
  (m.team_a_score = COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) + m.team_a_own_goals) as team_a_total_correct,
  (m.team_b_score = COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) + m.team_b_own_goals) as team_b_total_correct
  
FROM matches m
LEFT JOIN player_matches pm ON m.match_id = pm.match_id
GROUP BY m.match_id, m.match_date, m.team_a_score, m.team_b_score, m.team_a_own_goals, m.team_b_own_goals
HAVING 
  (m.team_a_score != COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) + m.team_a_own_goals) OR
  (m.team_b_score != COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) + m.team_b_own_goals)
ORDER BY m.match_date DESC;

-- Sample of recent matches to verify manually
SELECT 
  m.match_id,
  m.match_date,
  m.team_a_score,
  m.team_b_score,
  m.team_a_own_goals,
  m.team_b_own_goals,
  (m.team_a_score - m.team_a_own_goals) as team_a_player_goals_should_be,
  (m.team_b_score - m.team_b_own_goals) as team_b_player_goals_should_be
FROM matches m
ORDER BY m.match_date DESC 
LIMIT 20; 