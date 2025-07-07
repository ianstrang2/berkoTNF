-- Investigate Problematic Matches - Detailed Analysis
-- Copy and paste this into Supabase SQL Editor

-- First, let's see the 9 problematic matches in detail
WITH problematic_matches AS (
  SELECT m.match_id
  FROM matches m
  LEFT JOIN player_matches pm ON m.match_id = pm.match_id
  GROUP BY m.match_id, m.team_a_score, m.team_b_score, m.team_a_own_goals, m.team_b_own_goals
  HAVING 
    (m.team_a_score != COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) + m.team_a_own_goals) OR
    (m.team_b_score != COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) + m.team_b_own_goals)
)
SELECT 
  m.match_id,
  TO_CHAR(m.match_date, 'YYYY-MM-DD') as match_date,
  m.team_a_score,
  m.team_b_score,
  m.team_a_own_goals,
  m.team_b_own_goals,
  
  -- Team A player details
  STRING_AGG(
    CASE WHEN pm.team = 'A' THEN p.name || ' (' || pm.goals || ')' END, 
    ', ' ORDER BY pm.goals DESC, p.name
  ) FILTER (WHERE pm.team = 'A') as team_a_players_goals,
  
  -- Team B player details  
  STRING_AGG(
    CASE WHEN pm.team = 'B' THEN p.name || ' (' || pm.goals || ')' END, 
    ', ' ORDER BY pm.goals DESC, p.name
  ) FILTER (WHERE pm.team = 'B') as team_b_players_goals,
  
  -- Calculated totals
  COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) as team_a_player_goals_total,
  COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) as team_b_player_goals_total,
  
  -- Expected vs actual
  (COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) + m.team_a_own_goals) as team_a_expected_total,
  (COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) + m.team_b_own_goals) as team_b_expected_total,
  
  -- Discrepancies
  (m.team_a_score - (COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) + m.team_a_own_goals)) as team_a_discrepancy,
  (m.team_b_score - (COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) + m.team_b_own_goals)) as team_b_discrepancy

FROM matches m
JOIN problematic_matches prob ON m.match_id = prob.match_id
LEFT JOIN player_matches pm ON m.match_id = pm.match_id
LEFT JOIN players p ON pm.player_id = p.player_id
GROUP BY m.match_id, m.match_date, m.team_a_score, m.team_b_score, m.team_a_own_goals, m.team_b_own_goals
ORDER BY m.match_date DESC;

-- Also show count of players per team for these matches
SELECT 
  m.match_id,
  TO_CHAR(m.match_date, 'YYYY-MM-DD') as match_date,
  COUNT(*) FILTER (WHERE pm.team = 'A') as team_a_player_count,
  COUNT(*) FILTER (WHERE pm.team = 'B') as team_b_player_count,
  COUNT(*) as total_players
FROM matches m
JOIN (
  SELECT m.match_id
  FROM matches m
  LEFT JOIN player_matches pm ON m.match_id = pm.match_id
  GROUP BY m.match_id, m.team_a_score, m.team_b_score, m.team_a_own_goals, m.team_b_own_goals
  HAVING 
    (m.team_a_score != COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) + m.team_a_own_goals) OR
    (m.team_b_score != COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) + m.team_b_own_goals)
) prob ON m.match_id = prob.match_id
LEFT JOIN player_matches pm ON m.match_id = pm.match_id
GROUP BY m.match_id, m.match_date
ORDER BY m.match_date DESC; 