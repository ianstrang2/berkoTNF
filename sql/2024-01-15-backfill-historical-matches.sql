-- ======================================================================
-- Historical Match Backfill Script
-- Purpose: Create upcoming_matches records for all historical matches
--          that currently have upcoming_match_id = NULL
-- Date: 2024-01-15
-- ======================================================================

-- Step 1: Create dummy upcoming_matches records for each historical match
-- These will be set to 'Completed' state so they open in read-only mode
-- but can still be edited through the Match Control Centre

INSERT INTO upcoming_matches (
    match_date, 
    team_size, 
    team_a_name,
    team_b_name,
    location,
    notes,
    is_completed, 
    is_active, 
    is_balanced, 
    state,
    state_version,
    created_at,
    updated_at
)
SELECT 
    m.match_date,
    9 as team_size,  -- Default team size, you can adjust this
    'Orange' as team_a_name,
    'Green' as team_b_name,
    'Historical Location' as location,
    'Backfilled from historical data' as notes,
    true as is_completed,
    false as is_active,
    true as is_balanced,
    'Completed' as state,
    0 as state_version,
    m.created_at,
    COALESCE(m.created_at, NOW()) as updated_at
FROM matches m
WHERE m.upcoming_match_id IS NULL
ORDER BY m.match_date;

-- Step 2: Link each historical match to its newly created upcoming_matches record
-- We match by date since that's the most reliable identifier
-- Note: If you have multiple matches on the same date, this will need manual adjustment

UPDATE matches m
SET upcoming_match_id = (
    SELECT u.upcoming_match_id 
    FROM upcoming_matches u 
    WHERE u.match_date = m.match_date 
      AND u.notes = 'Backfilled from historical data'
    LIMIT 1
)
WHERE m.upcoming_match_id IS NULL;

-- Step 3: Populate the upcoming_match_players table with historical player data
-- This creates the team assignments needed for the new interface

INSERT INTO upcoming_match_players (
    upcoming_match_id,
    player_id,
    team,
    slot_number,
    created_at,
    updated_at
)
SELECT 
    m.upcoming_match_id,
    pm.player_id,
    pm.team,
    ROW_NUMBER() OVER (PARTITION BY m.upcoming_match_id, pm.team ORDER BY pm.player_match_id) as slot_number,
    COALESCE(pm.updated_at, m.created_at, NOW()) as created_at,
    COALESCE(pm.updated_at, m.created_at, NOW()) as updated_at
FROM matches m
JOIN player_matches pm ON m.match_id = pm.match_id
WHERE m.upcoming_match_id IS NOT NULL
  AND pm.player_id IS NOT NULL
  AND pm.team IS NOT NULL;

-- Step 4: Populate match_player_pool to show which players were available
-- This creates a complete picture of who was in the pool for each match

INSERT INTO match_player_pool (
    upcoming_match_id,
    player_id,
    response_status,
    response_timestamp,
    notification_sent,
    created_at,
    updated_at
)
SELECT DISTINCT
    m.upcoming_match_id,
    pm.player_id,
    'IN' as response_status,  -- Mark all historical players as 'IN'
    m.match_date as response_timestamp,
    true as notification_sent,  -- Mark as notified to avoid confusion
    COALESCE(m.created_at, NOW()) as created_at,
    COALESCE(m.created_at, NOW()) as updated_at
FROM matches m
JOIN player_matches pm ON m.match_id = pm.match_id
WHERE m.upcoming_match_id IS NOT NULL
  AND pm.player_id IS NOT NULL
  AND NOT EXISTS (
    -- Avoid duplicates if running script multiple times
    SELECT 1 FROM match_player_pool mpp 
    WHERE mpp.upcoming_match_id = m.upcoming_match_id 
      AND mpp.player_id = pm.player_id
  );

-- ======================================================================
-- Verification Queries (run these after the migration)
-- ======================================================================

-- Count of matches before and after
-- SELECT COUNT(*) as total_matches FROM matches;
-- SELECT COUNT(*) as matches_with_upcoming_id FROM matches WHERE upcoming_match_id IS NOT NULL;
-- SELECT COUNT(*) as matches_without_upcoming_id FROM matches WHERE upcoming_match_id IS NULL;

-- Check for any potential date conflicts (multiple matches same date)
-- SELECT match_date, COUNT(*) as match_count 
-- FROM matches 
-- GROUP BY match_date 
-- HAVING COUNT(*) > 1 
-- ORDER BY match_date;

-- Verify the linkage worked correctly
-- SELECT 
--     COUNT(DISTINCT m.match_id) as historical_matches,
--     COUNT(DISTINCT u.upcoming_match_id) as upcoming_records,
--     COUNT(DISTINCT ump.upcoming_match_id) as matches_with_players
-- FROM matches m
-- LEFT JOIN upcoming_matches u ON m.upcoming_match_id = u.upcoming_match_id
-- LEFT JOIN upcoming_match_players ump ON u.upcoming_match_id = ump.upcoming_match_id
-- WHERE u.notes = 'Backfilled from historical data';

-- ======================================================================
-- IMPORTANT NOTES:
-- 
-- 1. This script assumes one match per date. If you have multiple matches
--    on the same date, you'll need to manually link them after running.
--
-- 2. All historical matches will appear as "Completed" in the interface
--    but can be edited by clicking "Edit Result" or using "Undo Complete"
--    if needed.
--
-- 3. The script is idempotent - safe to run multiple times.
--
-- 4. After running this script, you can remove the legacy handling code
--    from your React components since all matches will have upcoming_match_id.
-- ====================================================================== 