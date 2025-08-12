-- =====================================================
-- Uneven Teams Feature Migration (Part A)
-- Date: 2025-01-16
-- Author: StatKick Development Team
-- Description: Adds support for uneven team sizes with data integrity constraints
-- Requirements: PostgreSQL 12+ for partial indexes
-- =====================================================

-- 0) PREFLIGHT: Check for duplicates that would block constraints
-- Run these queries first and ensure both return empty results:

-- Duplicate team slots (only non-null slots on A/B)
SELECT upcoming_match_id, team, slot_number, COUNT(*) AS dup_count
FROM upcoming_match_players
WHERE team IN ('A','B') AND slot_number IS NOT NULL
GROUP BY upcoming_match_id, team, slot_number
HAVING COUNT(*) > 1;

-- Duplicate player in same match
SELECT upcoming_match_id, player_id, COUNT(*) AS dup_count
FROM upcoming_match_players
GROUP BY upcoming_match_id, player_id
HAVING COUNT(*) > 1;

-- Proceed only when both result sets are empty.

-- 1) Add actual team size columns (idempotent)
ALTER TABLE upcoming_matches
  ADD COLUMN IF NOT EXISTS actual_size_a INTEGER;

ALTER TABLE upcoming_matches
  ADD COLUMN IF NOT EXISTS actual_size_b INTEGER;

-- 2) Comments
COMMENT ON COLUMN upcoming_matches.actual_size_a IS
  'Actual size of team A when pool is locked (source of truth for team balancing)';
COMMENT ON COLUMN upcoming_matches.actual_size_b IS
  'Actual size of team B when pool is locked (source of truth for team balancing)';

-- 3) Composite unique: one row per (match, player) (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'upcoming_match_id_player_id_unique'
  ) THEN
    ALTER TABLE upcoming_match_players
      ADD CONSTRAINT upcoming_match_id_player_id_unique
      UNIQUE (upcoming_match_id, player_id);
  END IF;
END $$;

-- 4) Check constraint for sizes (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_actual_sizes_valid'
  ) THEN
    ALTER TABLE upcoming_matches
      ADD CONSTRAINT chk_actual_sizes_valid
      CHECK (
        (actual_size_a IS NULL AND actual_size_b IS NULL) OR
        (actual_size_a IS NOT NULL AND actual_size_b IS NOT NULL AND
         actual_size_a >= 4 AND actual_size_b >= 4 AND
         actual_size_a + actual_size_b BETWEEN 8 AND 22)
      );
    COMMENT ON CONSTRAINT chk_actual_sizes_valid ON upcoming_matches IS
      'Ensures actual team sizes are either both NULL or both valid (4+ each, 8–22 total)';
  END IF;
END $$;

-- =====================================================
-- Uneven Teams Feature Migration (Part B - MUST RUN OUTSIDE TRANSACTION)
-- =====================================================

-- IMPORTANT: Run Part B separately in Supabase SQL editor outside of transaction




-- =====================================================
-- ROLLBACK Instructions (run in reverse order; Part B first)
-- =====================================================

-- Step 1: Drop indexes first (must also be outside transaction if using CONCURRENTLY)
-- DROP INDEX CONCURRENTLY IF EXISTS idx_upcoming_matches_actual_sizes;
-- DROP INDEX CONCURRENTLY IF EXISTS uniq_team_slot;

-- Step 2: Then constraints/columns (can run in transaction)
-- ALTER TABLE upcoming_match_players
--   DROP CONSTRAINT IF EXISTS upcoming_match_id_player_id_unique;
-- ALTER TABLE upcoming_matches
--   DROP CONSTRAINT IF EXISTS chk_actual_sizes_valid;
-- ALTER TABLE upcoming_matches
--   DROP COLUMN IF EXISTS actual_size_b;
-- ALTER TABLE upcoming_matches
--   DROP COLUMN IF EXISTS actual_size_a;

-- =====================================================
-- Production Deployment Notes
-- =====================================================

-- DEPLOYMENT STEPS:
-- 1. Run preflight duplicate checks (at top of this file)
-- 2. Run Part A in Supabase SQL editor (transaction OK)
-- 3. Run Part B separately in Supabase SQL editor (CONCURRENTLY requires no transaction)

-- CRITICAL IMPROVEMENTS:
-- - Added AND slot_number IS NOT NULL to prevent NULL slot conflicts
-- - Used CONCURRENTLY to avoid table locks during index creation
-- - Made migration idempotent with IF NOT EXISTS and DO blocks
-- - Added preflight checks to catch existing duplicates

-- VERIFICATION QUERIES (run after migration):
-- Check no duplicate slots:
-- SELECT upcoming_match_id, team, slot_number, COUNT(*) 
-- FROM upcoming_match_players 
-- WHERE team IN ('A','B') AND slot_number IS NOT NULL
-- GROUP BY upcoming_match_id, team, slot_number 
-- HAVING COUNT(*) > 1;

-- Check no duplicate players:
-- SELECT upcoming_match_id, player_id, COUNT(*) 
-- FROM upcoming_match_players 
-- GROUP BY upcoming_match_id, player_id 
-- HAVING COUNT(*) > 1;

-- STATE LIFECYCLE RULES:
-- - Draft → PoolLocked: Set both actual_size_a and actual_size_b
-- - PoolLocked → Draft: Set both to NULL
-- - PoolLocked → TeamsBalanced: Keep both values
-- - TeamsBalanced → PoolLocked: Keep both values

-- DATABASE REQUIREMENTS: PostgreSQL 12+ for partial indexes