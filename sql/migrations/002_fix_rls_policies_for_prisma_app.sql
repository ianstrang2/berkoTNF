-- ============================================================================
-- Fix RLS Policies for prisma_app Role
-- ============================================================================
-- Purpose: Replace auth.uid() based policies with current_setting('app.tenant_id') policies
-- Reason: prisma_app role has no auth.uid(), so old policies block everything
-- Impact: RLS will enforce tenant isolation via app.tenant_id setting
-- Date: 2025-01-08
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop all existing RLS policies (auth.uid() based)
-- ============================================================================

-- Players table
DROP POLICY IF EXISTS players_admin_access ON players;
DROP POLICY IF EXISTS players_own_update ON players;
DROP POLICY IF EXISTS players_tenant_isolation ON players;

-- Matches table
DROP POLICY IF EXISTS matches_tenant_isolation ON matches;

-- Player matches table
DROP POLICY IF EXISTS player_matches_tenant_isolation ON player_matches;

-- Upcoming matches table
DROP POLICY IF EXISTS upcoming_matches_tenant_isolation ON upcoming_matches;
DROP POLICY IF EXISTS upcoming_match_players_tenant_isolation ON upcoming_match_players;

-- Seasons table
DROP POLICY IF EXISTS seasons_tenant_isolation ON seasons;

-- Aggregated tables
DROP POLICY IF EXISTS aggregated_match_report_tenant_isolation ON aggregated_match_report;
DROP POLICY IF EXISTS aggregated_personal_bests_tenant_isolation ON aggregated_personal_bests;
DROP POLICY IF EXISTS aggregated_all_time_stats_tenant_isolation ON aggregated_all_time_stats;
DROP POLICY IF EXISTS aggregated_season_stats_tenant_isolation ON aggregated_season_stats;
DROP POLICY IF EXISTS aggregated_recent_performance_tenant_isolation ON aggregated_recent_performance;
DROP POLICY IF EXISTS aggregated_season_honours_tenant_isolation ON aggregated_season_honours;
DROP POLICY IF EXISTS aggregated_records_tenant_isolation ON aggregated_records;
DROP POLICY IF EXISTS aggregated_player_power_ratings_tenant_isolation ON aggregated_player_power_ratings;

-- Config tables
DROP POLICY IF EXISTS app_config_tenant_isolation ON app_config;
DROP POLICY IF EXISTS team_balance_weights_tenant_isolation ON team_balance_weights;
DROP POLICY IF EXISTS team_size_templates_tenant_isolation ON team_size_templates;

-- Join requests
DROP POLICY IF EXISTS player_join_requests_tenant_isolation ON player_join_requests;
DROP POLICY IF EXISTS club_invite_tokens_tenant_isolation ON club_invite_tokens;

-- Admin profiles
DROP POLICY IF EXISTS admin_profiles_tenant_isolation ON admin_profiles;

-- ============================================================================
-- STEP 2: Create new RLS policies that work with prisma_app role
-- ============================================================================

-- Players table
CREATE POLICY players_tenant_isolation ON players
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Matches table
CREATE POLICY matches_tenant_isolation ON matches
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Player matches table
CREATE POLICY player_matches_tenant_isolation ON player_matches
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Upcoming matches table
CREATE POLICY upcoming_matches_tenant_isolation ON upcoming_matches
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY upcoming_match_players_tenant_isolation ON upcoming_match_players
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY match_player_pool_tenant_isolation ON match_player_pool
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Seasons table
CREATE POLICY seasons_tenant_isolation ON seasons
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Aggregated tables
CREATE POLICY aggregated_match_report_tenant_isolation ON aggregated_match_report
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_personal_bests_tenant_isolation ON aggregated_personal_bests
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_all_time_stats_tenant_isolation ON aggregated_all_time_stats
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_season_stats_tenant_isolation ON aggregated_season_stats
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_recent_performance_tenant_isolation ON aggregated_recent_performance
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_season_honours_tenant_isolation ON aggregated_season_honours
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_records_tenant_isolation ON aggregated_records
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY aggregated_player_power_ratings_tenant_isolation ON aggregated_player_power_ratings
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Config tables
CREATE POLICY app_config_tenant_isolation ON app_config
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY team_balance_weights_tenant_isolation ON team_balance_weights
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY team_size_templates_tenant_isolation ON team_size_templates
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Join requests
CREATE POLICY player_join_requests_tenant_isolation ON player_join_requests
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY club_invite_tokens_tenant_isolation ON club_invite_tokens
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Admin profiles (no tenant_id check - uses user_id from service role lookups)
-- Skip for now - admin_profiles accessed via service role only

-- ============================================================================
-- STEP 3: Re-enable RLS on all tables
-- ============================================================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_match_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_personal_bests ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_all_time_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_recent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_season_honours ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_player_power_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_balance_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_size_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_invite_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

/*
-- After running migration, verify policies exist:

SELECT 
  tablename,
  policyname,
  cmd as "Applies To",
  qual as "USING Expression"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('players', 'matches', 'seasons')
ORDER BY tablename, policyname;

-- Expected: One policy per table checking current_setting('app.tenant_id')

-- Test with prisma_app role:
SET ROLE prisma_app;
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', false);
SELECT COUNT(*) FROM players;
-- Expected: 53 players

RESET ROLE;
*/

-- ============================================================================
-- NOTES
-- ============================================================================

/*
⚠️ IMPORTANT:

1. These policies check current_setting('app.tenant_id')
   - Works with prisma_app role (no auth.uid() needed)
   - Middleware sets app.tenant_id before each query
   - Explicit filtering still required for defense-in-depth

2. Policy applies to ALL operations (SELECT, INSERT, UPDATE, DELETE)
   - Simpler than separate policies per operation
   - Consistent enforcement across all operations

3. Using 'true' parameter in current_setting
   - Returns NULL if not set (instead of error)
   - Policy blocks access when NULL (safe default)

4. Admin profiles table
   - No RLS policy (accessed via service role only)
   - Used for auth checks, not data queries
   - Service role bypasses RLS anyway

📊 EXPECTED IMPACT:

Security: ✅ Tenant isolation enforced at database level
Performance: ~5-10% slower (policy evaluation overhead)
Code: No changes needed (middleware + explicit filtering already in place)
Testing: Verify both tenants isolated after migration
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

