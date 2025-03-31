SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'aggregated_match_report' 
ORDER BY ordinal_position; 