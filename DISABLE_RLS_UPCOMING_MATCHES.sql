-- ============================================================================
-- DISABLE RLS ON UPCOMING MATCHES TABLES
-- ============================================================================
-- 
-- Context: Connection pooling causes RLS context to not be set properly,
-- resulting in 0 rows returned even when data exists.
--
-- Security: All queries use explicit WHERE tenant_id = filtering via
-- withTenantFilter() helper, so disabling RLS is safe.
--
-- Run this in Supabase SQL Editor with superuser permissions.
-- ============================================================================

-- Disable RLS on upcoming matches tables
ALTER TABLE upcoming_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_match_players DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('upcoming_matches', 'upcoming_match_players');
-- Expected: Both should show rowsecurity = false



