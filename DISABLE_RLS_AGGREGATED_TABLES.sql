-- ============================================================================
-- DISABLE RLS ON AGGREGATED TABLES
-- ============================================================================
-- 
-- Context: These tables are read-only and populated ONLY by background jobs.
-- Background jobs cannot set session-level RLS context (app.tenant_id).
-- Therefore, RLS on these tables causes queries to fail.
--
-- Security: All queries to these tables use explicit WHERE tenant_id = filtering
-- enforced by the withTenantFilter() TypeScript helper.
--
-- Run this in Supabase SQL Editor with superuser permissions.
-- ============================================================================

-- Disable RLS on all 15 aggregated tables
ALTER TABLE aggregated_all_time_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_half_season_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_hall_of_fame DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_match_report DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_match_streaks DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_performance_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_personal_bests DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_player_power_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_player_profile_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_player_teammate_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_recent_performance DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_season_honours DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_season_race_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_season_stats DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'aggregated_%'
ORDER BY tablename;
-- Expected: All should show rls_enabled = false



