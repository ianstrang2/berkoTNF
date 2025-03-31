-- Sample data from aggregated_match_report
SELECT match_id, match_date, team_a_score, team_b_score 
FROM aggregated_match_report
ORDER BY match_date DESC
LIMIT 1;

-- Check the actual structure of aggregated_match_streaks table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'aggregated_match_streaks';

-- Sample data from aggregated_match_streaks (without using id)
SELECT player_id, name, current_win_streak, current_unbeaten_streak, current_scoring_streak
FROM aggregated_match_streaks
LIMIT 5; 