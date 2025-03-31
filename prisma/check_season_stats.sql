SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'aggregated_season_stats' 
ORDER BY ordinal_position;

-- Check a sample row 
SELECT * FROM aggregated_season_stats LIMIT 1; 