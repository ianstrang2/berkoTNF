-- Simplified Performance Rating Validation Query
-- Shows: Player | Period | Matches | PPG | Power Rating | Current Rating | UI %

WITH player_periods AS (
    SELECT 
        p.player_id,
        p.name,
        (block->>'start_date')::DATE AS period_start,
        (block->>'end_date')::DATE AS period_end,
        (block->>'games_played')::INT AS matches,
        ROUND((block->>'fantasy_points')::DECIMAL / NULLIF((block->>'weights_sum')::DECIMAL, 0), 1) AS ppg,
        ROUND((block->>'goals')::DECIMAL / NULLIF((block->>'weights_sum')::DECIMAL, 0), 2) AS goals_per_game,
        ROUND((block->>'participation_rate')::DECIMAL * 100, 0) AS attendance_pct,
        -- Period label for easier reading
        EXTRACT(YEAR FROM (block->>'start_date')::DATE)::TEXT || 
        CASE WHEN EXTRACT(MONTH FROM (block->>'start_date')::DATE) = 1 THEN '-H1' ELSE '-H2' END AS period
    FROM players p
    JOIN aggregated_half_season_stats ahs ON p.player_id = ahs.player_id
    CROSS JOIN jsonb_array_elements(ahs.historical_blocks) AS block
    WHERE p.is_ringer = FALSE 
    AND (block->>'games_played')::INT > 0  -- Only periods with actual matches
),
current_stats AS (
    SELECT 
        player_id,
        ROUND(trend_rating, 1) AS current_power_rating,
        ROUND(trend_goal_threat, 2) AS current_goal_threat,
        ROUND(trend_participation, 0) AS current_participation
    FROM aggregated_player_power_ratings
),
league_max AS (
    SELECT 
        MAX(trend_rating) FILTER (WHERE ahs.games_played >= 15) AS power_max,
        MAX(trend_goal_threat) FILTER (WHERE ahs.games_played >= 15) AS goal_max
    FROM aggregated_player_power_ratings apr
    JOIN aggregated_half_season_stats ahs ON apr.player_id = ahs.player_id
)
SELECT 
    pp.name,
    pp.period,
    pp.matches,
    pp.ppg,
    pp.goals_per_game,
    pp.attendance_pct,
    -- Current ratings (only show for most recent row per player)
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY pp.player_id ORDER BY pp.period_end DESC) = 1 
         THEN cs.current_power_rating END AS current_power,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY pp.player_id ORDER BY pp.period_end DESC) = 1 
         THEN cs.current_goal_threat END AS current_goals,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY pp.player_id ORDER BY pp.period_end DESC) = 1 
         THEN cs.current_participation END AS current_attend,
    -- UI Percentages (only show for most recent row per player)
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY pp.player_id ORDER BY pp.period_end DESC) = 1 
         THEN LEAST(100, ROUND((cs.current_power_rating / lm.power_max) * 100, 0)) END AS power_ui_pct,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY pp.player_id ORDER BY pp.period_end DESC) = 1 
         THEN LEAST(100, ROUND((cs.current_goal_threat / lm.goal_max) * 100, 0)) END AS goals_ui_pct,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY pp.player_id ORDER BY pp.period_end DESC) = 1 
         THEN cs.current_participation END AS attend_ui_pct,
    -- League maximums (for dashboard calculation)
    lm.power_max AS league_power_max,
    lm.goal_max AS league_goal_max
FROM player_periods pp
LEFT JOIN current_stats cs ON pp.player_id = cs.player_id  
CROSS JOIN league_max lm
ORDER BY 
    (SELECT SUM(matches) FROM player_periods pp2 WHERE pp2.player_id = pp.player_id) DESC, -- Total games desc
    pp.player_id, 
    pp.period_end DESC;

-- How to read this output:
-- - Each row = one 6-month period for a player
-- - 'matches' = games played in that period  
-- - 'ppg' = fantasy points per game (time-decay weighted) - this becomes power rating
-- - 'goals_per_game' = goals per game (time-decay weighted) - this becomes goal threat
-- - 'attendance_pct' = attendance % for that period
-- - 'current_*' columns show final trend-adjusted ratings (only on first row per player)
-- - '*_ui_pct' columns show how ratings appear as percentages in the UI (only on first row per player)
--
-- What to look for:
-- ✅ Current ratings should be influenced mostly by recent periods (latest 1-2 rows)
-- ✅ PPG values should be reasonable (typically -10 to +50 range)
-- ✅ UI percentages should make sense relative to other players
-- ✅ No UI percentages over 100%
-- ⚠️  Large jumps in PPG between periods (might indicate algorithm issues)
-- ⚠️  Current ratings that don't reflect recent performance trends 