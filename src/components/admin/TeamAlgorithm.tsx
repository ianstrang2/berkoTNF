SELECT 
    t.tgname AS trigger_name,
    CASE WHEN t.tgenabled = 'O' THEN 'ON' ELSE 'OFF' END AS status,
    c.relname AS table_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname IN ('matches', 'player_matches')
ORDER BY c.relname, t.tgname; 