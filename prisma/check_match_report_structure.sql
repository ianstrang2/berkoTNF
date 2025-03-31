-- Check the actual structure of aggregated_match_report table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'aggregated_match_report';

-- Sample data from first row
SELECT * FROM aggregated_match_report LIMIT 1; 