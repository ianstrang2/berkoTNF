-- ======================================================================
-- Historical Match Verification Script
-- Purpose: Check the current state of matches and identify what needs migration
-- ======================================================================

-- 1. Overall match statistics
SELECT 
    'Total Matches' as metric,
    COUNT(*) as count
FROM matches
UNION ALL
SELECT 
    'Matches with upcoming_match_id' as metric,
    COUNT(*) as count
FROM matches 
WHERE upcoming_match_id IS NOT NULL
UNION ALL
SELECT 
    'Historical matches (NULL upcoming_match_id)' as metric,
    COUNT(*) as count
FROM matches 
WHERE upcoming_match_id IS NULL;

-- 2. Date range of historical matches
SELECT 
    'Earliest historical match' as metric,
    MIN(match_date)::text as value
FROM matches 
WHERE upcoming_match_id IS NULL
UNION ALL
SELECT 
    'Latest historical match' as metric,
    MAX(match_date)::text as value
FROM matches 
WHERE upcoming_match_id IS NULL;

-- 3. Check for potential date conflicts (multiple matches on same date)
SELECT 
    match_date,
    COUNT(*) as matches_on_this_date,
    array_agg(match_id) as match_ids
FROM matches 
WHERE upcoming_match_id IS NULL
GROUP BY match_date 
HAVING COUNT(*) > 1 
ORDER BY match_date;

-- 4. Sample of historical matches
SELECT 
    match_id,
    match_date,
    team_a_score,
    team_b_score,
    created_at
FROM matches 
WHERE upcoming_match_id IS NULL
ORDER BY match_date DESC
LIMIT 10;

-- 5. Player data for historical matches
SELECT 
    'Historical matches with player data' as metric,
    COUNT(DISTINCT m.match_id) as count
FROM matches m
JOIN player_matches pm ON m.match_id = pm.match_id
WHERE m.upcoming_match_id IS NULL; 