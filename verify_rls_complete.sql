-- ============================================================================
-- Comprehensive RLS Verification
-- ============================================================================
-- Run these queries in Supabase SQL Editor to verify everything is correct
-- ============================================================================

-- ============================================================================
-- CHECK 1: Verify RLS is enabled on all tenant-scoped tables
-- ============================================================================

SELECT 
  tablename,
  rowsecurity as "RLS Enabled?"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE '%_defaults'
  AND tablename != '_prisma_migrations'
ORDER BY tablename;

-- Expected: All tables should have RLS enabled EXCEPT 'tenants'
-- tenants = FALSE (correct - needed for tenant resolution)
-- All others = TRUE

-- ============================================================================
-- CHECK 2: Verify policies exist and use correct pattern
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd as "Applies To",
  CASE 
    WHEN qual LIKE '%current_setting%app.tenant_id%' THEN '✅ Uses app.tenant_id'
    WHEN qual LIKE '%auth.uid()%' THEN '❌ Uses auth.uid() - WRONG!'
    ELSE '⚠️  Other pattern'
  END as "Policy Type",
  qual as "Full USING Expression"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: 
-- - One policy per table (30 tables)
-- - All should show "✅ Uses app.tenant_id"
-- - NONE should show "❌ Uses auth.uid()"

-- ============================================================================
-- CHECK 3: Test queries work with prisma_app role
-- ============================================================================

-- Switch to prisma_app role
SET ROLE prisma_app;

-- Test 1: Query WITHOUT tenant context (should return 0)
SELECT COUNT(*) as "Without Context (Should Be 0)" FROM players;

-- Test 2: Set tenant context
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', false);

-- Test 3: Verify context was set
SELECT current_setting('app.tenant_id', true) as "Current Tenant (Should Be BerkoTNF UUID)";

-- Test 4: Query WITH context (should return data)
SELECT COUNT(*) as "BerkoTNF Players (Should Be 53)" FROM players;
SELECT COUNT(*) as "Matches" FROM matches;
SELECT COUNT(*) as "Seasons" FROM seasons;
SELECT COUNT(*) as "Upcoming Matches" FROM upcoming_matches;
SELECT COUNT(*) as "Player Matches" FROM player_matches;

-- Test 5: Try to access Poo Wanderers data (should return 0 - blocked by RLS)
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', false);
SELECT COUNT(*) as "Poo Wanderers Data (Should Be 0)" 
FROM players 
WHERE tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3';
-- Even with explicit WHERE, should return 0 because app.tenant_id is set to BerkoTNF

-- Reset role
RESET ROLE;

-- ============================================================================
-- CHECK 4: Summary of all tables and their RLS status
-- ============================================================================

SELECT 
  t.tablename as "Table",
  t.rowsecurity as "RLS?",
  COUNT(p.policyname) as "Policies",
  CASE 
    WHEN COUNT(p.policyname) = 0 AND t.rowsecurity = true THEN '⚠️  NO POLICIES - WILL BLOCK ALL'
    WHEN COUNT(p.policyname) > 0 AND t.rowsecurity = true THEN '✅ Protected'
    WHEN t.rowsecurity = false THEN '🔓 No RLS'
    ELSE '❓ Check manually'
  END as "Status"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE '%_defaults'
  AND t.tablename != '_prisma_migrations'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Expected:
-- - tenants: 🔓 No RLS (correct)
-- - All others: ✅ Protected (1 policy each)
-- - NONE should show "⚠️ NO POLICIES"

-- ============================================================================
-- CHECK 5: Count policies by type
-- ============================================================================

SELECT 
  CASE 
    WHEN qual LIKE '%current_setting%app.tenant_id%' THEN 'app.tenant_id based (GOOD)'
    WHEN qual LIKE '%auth.uid()%' THEN 'auth.uid() based (BAD - REMOVE!)'
    ELSE 'Other pattern'
  END as "Policy Pattern",
  COUNT(*) as "Count"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY 
  CASE 
    WHEN qual LIKE '%current_setting%app.tenant_id%' THEN 'app.tenant_id based (GOOD)'
    WHEN qual LIKE '%auth.uid()%' THEN 'auth.uid() based (BAD - REMOVE!)'
    ELSE 'Other pattern'
  END;

-- Expected:
-- app.tenant_id based (GOOD): 30 (or more)
-- auth.uid() based (BAD): 0
-- Other pattern: 0 (or minimal for special cases)

-- ============================================================================
-- PASS/FAIL Summary
-- ============================================================================

/*
✅ PASS CRITERIA:

1. RLS enabled on 30+ tables (all except tenants and defaults)
2. Each table has exactly 1 policy
3. All policies use current_setting('app.tenant_id')
4. NO policies use auth.uid()
5. Test queries return correct counts with context set
6. Test queries return 0 without context set

❌ FAIL IF:

1. Any table shows "NO POLICIES - WILL BLOCK ALL"
2. Any policy uses "auth.uid()" 
3. Test queries return 0 even WITH context set
4. Cross-tenant access works (should be blocked)

🔧 If tests fail:
- Re-run the migration
- Check error messages
- Verify prisma_app role exists and has correct permissions
- Check DATABASE_URL uses prisma_app (not postgres)
*/

-- ============================================================================
-- END OF VERIFICATION
-- ============================================================================

