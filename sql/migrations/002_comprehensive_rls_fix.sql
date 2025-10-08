-- ============================================================================
-- Comprehensive RLS Policy Fix for All Tables
-- ============================================================================
-- Purpose: Replace ALL auth.uid() based policies with current_setting('app.tenant_id')
-- Reason: prisma_app role has no auth.uid(), old policies block everything
-- Date: 2025-01-08
-- Tables: 30 tenant-scoped tables (excluding defaults tables)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop ALL existing RLS policies
-- ============================================================================

-- Core tables
DROP POLICY IF EXISTS players_admin_access ON players;
DROP POLICY IF EXISTS players_own_update ON players;
DROP POLICY IF EXISTS players_tenant_isolation ON players;
DROP POLICY IF EXISTS matches_tenant_isolation ON matches;
DROP POLICY IF EXISTS player_matches_tenant_isolation ON player_matches;
DROP POLICY IF EXISTS seasons_tenant_isolation ON seasons;

-- Upcoming match tables
DROP POLICY IF EXISTS upcoming_matches_tenant_isolation ON upcoming_matches;
DROP POLICY IF EXISTS upcoming_match_players_tenant_isolation ON upcoming_match_players;
DROP POLICY IF EXISTS match_player_pool_tenant_isolation ON match_player_pool;

-- Aggregated stats tables
DROP POLICY IF EXISTS aggregated_match_report_tenant_isolation ON aggregated_match_report;
DROP POLICY IF EXISTS aggregated_personal_bests_tenant_isolation ON aggregated_personal_bests;
DROP POLICY IF EXISTS aggregated_all_time_stats_tenant_isolation ON aggregated_all_time_stats;
DROP POLICY IF EXISTS aggregated_season_stats_tenant_isolation ON aggregated_season_stats;
DROP POLICY IF EXISTS aggregated_half_season_stats_tenant_isolation ON aggregated_half_season_stats;
DROP POLICY IF EXISTS aggregated_recent_performance_tenant_isolation ON aggregated_recent_performance;
DROP POLICY IF EXISTS aggregated_season_honours_tenant_isolation ON aggregated_season_honours;
DROP POLICY IF EXISTS aggregated_records_tenant_isolation ON aggregated_records;
DROP POLICY IF EXISTS aggregated_player_power_ratings_tenant_isolation ON aggregated_player_power_ratings;
DROP POLICY IF EXISTS aggregated_player_profile_stats_tenant_isolation ON aggregated_player_profile_stats;
DROP POLICY IF EXISTS aggregated_player_teammate_stats_tenant_isolation ON aggregated_player_teammate_stats;
DROP POLICY IF EXISTS aggregated_match_streaks_tenant_isolation ON aggregated_match_streaks;
DROP POLICY IF EXISTS aggregated_season_race_data_tenant_isolation ON aggregated_season_race_data;
DROP POLICY IF EXISTS aggregated_performance_ratings_tenant_isolation ON aggregated_performance_ratings;
DROP POLICY IF EXISTS aggregated_hall_of_fame_tenant_isolation ON aggregated_hall_of_fame;

-- Config tables
DROP POLICY IF EXISTS app_config_tenant_isolation ON app_config;
DROP POLICY IF EXISTS team_balance_weights_tenant_isolation ON team_balance_weights;
DROP POLICY IF EXISTS team_size_templates_tenant_isolation ON team_size_templates;
DROP POLICY IF EXISTS team_slots_tenant_isolation ON team_slots;

-- System tables
DROP POLICY IF EXISTS cache_metadata_tenant_isolation ON cache_metadata;
DROP POLICY IF EXISTS background_job_status_tenant_isolation ON background_job_status;
DROP POLICY IF EXISTS debug_logs_tenant_isolation ON debug_logs;

-- Auth tables
DROP POLICY IF EXISTS player_join_requests_tenant_isolation ON player_join_requests;
DROP POLICY IF EXISTS club_invite_tokens_tenant_isolation ON club_invite_tokens;
DROP POLICY IF EXISTS auth_activity_log_tenant_isolation ON auth_activity_log;
DROP POLICY IF EXISTS admin_profiles_tenant_isolation ON admin_profiles;
DROP POLICY IF EXISTS admin_invitations_tenant_isolation ON admin_invitations;

-- ============================================================================
-- STEP 2: Create new policies for ALL tenant-scoped tables
-- ============================================================================

-- Core data tables
CREATE POLICY players_tenant_isolation ON players
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY matches_tenant_isolation ON matches
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY player_matches_tenant_isolation ON player_matches
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY seasons_tenant_isolation ON seasons
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Upcoming match tables
CREATE POLICY upcoming_matches_tenant_isolation ON upcoming_matches
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY upcoming_match_players_tenant_isolation ON upcoming_match_players
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY match_player_pool_tenant_isolation ON match_player_pool
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Aggregated stats tables
CREATE POLICY aggregated_match_report_tenant_isolation ON aggregated_match_report
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_personal_bests_tenant_isolation ON aggregated_personal_bests
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_all_time_stats_tenant_isolation ON aggregated_all_time_stats
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_season_stats_tenant_isolation ON aggregated_season_stats
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_half_season_stats_tenant_isolation ON aggregated_half_season_stats
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_recent_performance_tenant_isolation ON aggregated_recent_performance
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_season_honours_tenant_isolation ON aggregated_season_honours
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_records_tenant_isolation ON aggregated_records
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_player_power_ratings_tenant_isolation ON aggregated_player_power_ratings
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_player_profile_stats_tenant_isolation ON aggregated_player_profile_stats
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_player_teammate_stats_tenant_isolation ON aggregated_player_teammate_stats
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_match_streaks_tenant_isolation ON aggregated_match_streaks
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_season_race_data_tenant_isolation ON aggregated_season_race_data
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_performance_ratings_tenant_isolation ON aggregated_performance_ratings
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_hall_of_fame_tenant_isolation ON aggregated_hall_of_fame
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Config tables
CREATE POLICY app_config_tenant_isolation ON app_config
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY team_balance_weights_tenant_isolation ON team_balance_weights
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY team_size_templates_tenant_isolation ON team_size_templates
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY team_slots_tenant_isolation ON team_slots
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- System tables
CREATE POLICY cache_metadata_tenant_isolation ON cache_metadata
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY background_job_status_tenant_isolation ON background_job_status
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY debug_logs_tenant_isolation ON debug_logs
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Auth/Join tables
CREATE POLICY player_join_requests_tenant_isolation ON player_join_requests
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY club_invite_tokens_tenant_isolation ON club_invite_tokens
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY auth_activity_log_tenant_isolation ON auth_activity_log
  FOR ALL USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid 
    OR tenant_id IS NULL  -- Allow NULL tenant_id for platform-level logs
  );

-- Admin tables (accessed via service role, but add policy for consistency)
CREATE POLICY admin_profiles_tenant_isolation ON admin_profiles
  FOR ALL USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid 
    OR tenant_id IS NULL  -- Allow NULL for superadmin
  );

CREATE POLICY admin_invitations_tenant_isolation ON admin_invitations
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- STEP 3: Enable RLS on ALL tenant-scoped tables
-- ============================================================================

-- Core tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- Upcoming match tables
ALTER TABLE upcoming_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_pool ENABLE ROW LEVEL SECURITY;

-- Aggregated stats tables
ALTER TABLE aggregated_match_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_personal_bests ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_all_time_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_half_season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_recent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_season_honours ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_player_power_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_player_profile_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_player_teammate_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_match_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_season_race_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_performance_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_hall_of_fame ENABLE ROW LEVEL SECURITY;

-- Config tables
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_balance_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_size_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_slots ENABLE ROW LEVEL SECURITY;

-- System tables
ALTER TABLE cache_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_job_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Auth/Join tables
ALTER TABLE player_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Tenants table: DO NOT enable RLS
-- ============================================================================
-- Tenants table should NOT have RLS - it's queried without tenant context
-- for tenant resolution and club code lookups
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

-- Check all policies were created
SELECT 
  tablename,
  policyname,
  cmd as "Applies To",
  qual as "USING Expression"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: One _tenant_isolation policy per table

-- Check RLS is enabled on all tenant-scoped tables
SELECT 
  tablename,
  rowsecurity as "RLS Enabled?"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE '%_defaults'
  AND tablename != '_prisma_migrations'
  AND tablename != 'tenants'
ORDER BY tablename;

-- Expected: All should be TRUE except tenants

-- ============================================================================
-- STEP 5: Test with prisma_app role
-- ============================================================================

/*
SET ROLE prisma_app;

-- Without context (should return 0)
SELECT COUNT(*) as "Without Context" FROM players;

-- Set context
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', false);

-- With context (should return 53)
SELECT COUNT(*) as "BerkoTNF Players" FROM players;

-- Test other tables
SELECT COUNT(*) as "Matches" FROM matches;
SELECT COUNT(*) as "Seasons" FROM seasons;
SELECT COUNT(*) as "Join Requests" FROM player_join_requests;

RESET ROLE;
*/

-- ============================================================================
-- NOTES
-- ============================================================================

/*
📊 TABLES FIXED (30 total):

Core Data (4):
- players, matches, player_matches, seasons

Match Management (3):
- upcoming_matches, upcoming_match_players, match_player_pool

Aggregated Stats (15):
- aggregated_match_report, aggregated_personal_bests
- aggregated_all_time_stats, aggregated_season_stats, aggregated_half_season_stats
- aggregated_recent_performance, aggregated_season_honours, aggregated_records
- aggregated_player_power_ratings, aggregated_player_profile_stats
- aggregated_player_teammate_stats, aggregated_match_streaks
- aggregated_season_race_data, aggregated_performance_ratings, aggregated_hall_of_fame

Config (4):
- app_config, team_balance_weights, team_size_templates, team_slots

System (3):
- cache_metadata, background_job_status, debug_logs

Auth/Join (5):
- player_join_requests, club_invite_tokens, auth_activity_log
- admin_profiles, admin_invitations

TABLES EXCLUDED (4):
- tenants (no RLS - queried for tenant resolution)
- app_config_defaults, team_size_templates_defaults, team_balance_weights_defaults (no tenant_id)
- _prisma_migrations (system table)

🔒 SECURITY MODEL:

Layer 1: Explicit WHERE clause (application code)
  where: { tenant_id: tenantId }

Layer 2: RLS Policy (database enforcement)
  tenant_id = current_setting('app.tenant_id')::uuid

Both layers must pass for query to succeed = Defense-in-depth ✅

⚡ PERFORMANCE:

Expected overhead: 5-10% per query
Acceptable for security benefit
Indexes on tenant_id already exist
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

