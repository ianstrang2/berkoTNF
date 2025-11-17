-- match_player_stats.sql
-- Provides a denormalized view of player match data with calculated fields
-- Used by trigger functions and stats calculations

CREATE OR REPLACE VIEW match_player_stats AS
SELECT 
    pm.player_match_id,
    pm.player_id,
    pm.match_id,
    pm.team,
    pm.goals,
    pm.clean_sheet,
    pm.result,
    pm.tenant_id,
    m.match_date,
    m.team_a_score,
    m.team_b_score,
    -- Calculate goal_difference from team perspective
    CASE 
        WHEN COALESCE(pm.actual_team, pm.team) = 'A' THEN m.team_a_score - m.team_b_score
        WHEN COALESCE(pm.actual_team, pm.team) = 'B' THEN m.team_b_score - m.team_a_score
        ELSE 0
    END AS goal_difference,
    -- Result code for compatibility with existing queries
    CASE 
        WHEN pm.result = 'win' THEN 'W'
        WHEN pm.result = 'loss' THEN 'L'
        WHEN pm.result = 'draw' THEN 'D'
        ELSE NULL
    END AS result_code
FROM player_matches pm
JOIN matches m ON pm.match_id = m.match_id;

-- Grant permissions
GRANT SELECT ON match_player_stats TO authenticated;
GRANT SELECT ON match_player_stats TO service_role;
