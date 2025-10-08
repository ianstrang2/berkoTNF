-- ============================================================================
-- ROLLBACK: Revert to postgres superuser role
-- ============================================================================
-- Purpose: Emergency rollback if restricted role causes issues
-- Impact: Returns to BYPASSRLS mode (removes RLS enforcement)
-- Use Case: Permission errors, connection issues, urgent production fix needed
-- ============================================================================

-- ============================================================================
-- ⚠️ WARNING: SECURITY REGRESSION
-- ============================================================================
/*
This rollback script removes RLS enforcement and returns to the insecure
postgres superuser role. Only use this for:

✅ VALID REASONS:
- Production is down due to permission errors
- Need immediate fix while debugging role issues
- Testing/debugging RLS policies

❌ DO NOT USE FOR:
- "It's easier to develop without RLS"
- "RLS is too slow" (10% overhead is acceptable)
- Permanent solution (RLS enforcement is mandatory for launch)

After rollback:
1. Investigate root cause
2. Fix the issue
3. Re-apply restricted role ASAP
4. Update this document with lessons learned
*/

-- ============================================================================
-- STEP 1: Verify current role (safety check)
-- ============================================================================

DO $$
DECLARE
  current_role TEXT;
BEGIN
  SELECT current_user INTO current_role;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Current database role: %', current_role;
  RAISE NOTICE 'About to rollback to postgres superuser';
  RAISE NOTICE '⚠️  This will DISABLE RLS enforcement!';
  RAISE NOTICE '============================================';
END
$$;

-- ============================================================================
-- STEP 2: No database changes needed - just update connection string
-- ============================================================================

/*
To rollback:

1. Update .env file:
   
   # Change FROM:
   DATABASE_URL="postgresql://prisma_app:password@host:5432/db"
   
   # Change TO:
   DATABASE_URL="postgresql://postgres:original_password@host:5432/db"

2. Restart Next.js application:
   npm run dev  # Development
   vercel --prod  # Production

3. Verify connection:
   psql $DATABASE_URL -c "SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;"
   
   Expected: postgres | true (confirms superuser mode)

4. OPTIONAL: Drop prisma_app role (if no longer needed)
*/

-- ============================================================================
-- OPTIONAL: Drop the restricted role (uncomment to execute)
-- ============================================================================

/*
-- ⚠️ WARNING: Only drop if you're certain you won't use it again

-- Drop role (will fail if objects depend on it)
-- DROP ROLE IF EXISTS prisma_app;

-- If drop fails due to dependencies, revoke grants first:
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM prisma_app;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM prisma_app;
REVOKE SELECT ON auth.users FROM prisma_app;
REVOKE pg_read_all_stats FROM prisma_app;

-- Then try drop again:
-- DROP ROLE IF EXISTS prisma_app;
*/

-- ============================================================================
-- STEP 3: Verification after rollback
-- ============================================================================

/*
Run these queries after switching back to postgres role:

-- 1. Confirm you're using postgres role
SELECT current_user, rolbypassrls 
FROM pg_roles 
WHERE rolname = current_user;
-- Expected: postgres | true

-- 2. Test query without tenant context (should work with BYPASSRLS)
SELECT COUNT(*) FROM players;
-- Expected: All players across all tenants (82+ rows)

-- 3. Verify RLS policies still exist (they do, just not enforced)
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- Expected: All 25+ policies still present

-- 4. Check application still works
curl http://localhost:3000/api/auth/profile
-- Expected: 200 OK (with valid session)
*/

-- ============================================================================
-- STEP 4: Document the rollback event
-- ============================================================================

/*
After rollback, update this section with details:

Date: _________________
Reason: _________________
Root Cause: _________________
Downtime Duration: _________________
Resolution Plan: _________________
Expected Re-deployment Date: _________________

LESSONS LEARNED:
1. 
2. 
3. 

PREVENTIVE MEASURES:
1. 
2. 
3. 
*/

-- ============================================================================
-- KNOWN ROLLBACK SCENARIOS & SOLUTIONS
-- ============================================================================

/*
SCENARIO 1: "permission denied for table X"
Root Cause: Missing GRANT on specific table
Solution: Add explicit GRANT in migration script, re-apply
Rollback Needed: No (just add missing permission)

SCENARIO 2: "cannot execute INSERT in a read-only transaction"
Root Cause: Wrong connection pool mode (transaction vs session)
Solution: Change to session mode in Prisma
Rollback Needed: No (configuration change only)

SCENARIO 3: "role prisma_app cannot access auth.users"
Root Cause: Missing SELECT grant on auth schema
Solution: Add GRANT SELECT ON auth.users
Rollback Needed: No (just add missing permission)

SCENARIO 4: "queries return 0 rows"
Root Cause: RLS policy blocks access without app.tenant_id
Solution: Implement Phase 2 (Prisma middleware)
Rollback Needed: Maybe (if middleware not ready)

SCENARIO 5: "connection timeout"
Root Cause: Using pooler (6543) instead of direct (5432)
Solution: Update DATABASE_URL to use port 5432
Rollback Needed: No (just fix connection string)

SCENARIO 6: "prisma generate fails"
Root Cause: Missing pg_read_all_stats or information_schema access
Solution: Add missing system catalog permissions
Rollback Needed: No (just add permissions)
*/

-- ============================================================================
-- RE-APPLYING AFTER ROLLBACK
-- ============================================================================

/*
When ready to re-enable RLS enforcement:

1. Fix the root cause issue
2. Test thoroughly in development environment
3. Re-run 001_create_restricted_role.sql
4. Update .env with prisma_app connection string
5. Restart application
6. Monitor logs for 30 minutes
7. Verify all API routes work
8. Check tenant isolation is enforced

Don't rush the re-deployment. Better to fix properly than rollback again.
*/

-- ============================================================================
-- SUPPORT & ESCALATION
-- ============================================================================

/*
If you're rolling back in production:

1. Document EVERYTHING (timestamps, errors, logs)
2. Take database snapshot before changes
3. Have second person review rollback plan
4. Communicate to users if downtime expected
5. Monitor application metrics during rollback

Post-Incident:
- Write post-mortem document
- Update testing procedures
- Improve monitoring/alerting
- Schedule proper fix implementation
*/

-- ============================================================================
-- END OF ROLLBACK SCRIPT
-- ============================================================================

