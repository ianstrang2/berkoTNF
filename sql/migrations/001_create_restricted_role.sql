-- ============================================================================
-- Phase 1: Create Restricted Database Role for RLS Enforcement
-- ============================================================================
-- Purpose: Replace postgres superuser with restricted role that enforces RLS
-- Impact: All Prisma queries will now respect Row Level Security policies
-- Date: 2025-01-08
-- Estimated Time: 5 minutes
-- Rollback: See 001_rollback_restricted_role.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Create the restricted role
-- ============================================================================

-- Create role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'prisma_app') THEN
    CREATE ROLE prisma_app WITH
      LOGIN
      PASSWORD 'CHANGE_ME_IN_PRODUCTION'  -- ⚠️ UPDATE THIS IN SUPABASE DASHBOARD
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;  -- ⚠️ CRITICAL: This enforces RLS policies
    
    RAISE NOTICE 'Created role: prisma_app';
  ELSE
    RAISE NOTICE 'Role prisma_app already exists, skipping creation';
  END IF;
END
$$;

-- ============================================================================
-- STEP 2: Grant schema-level permissions
-- ============================================================================

-- Grant USAGE on public schema (required to access schema objects)
GRANT USAGE ON SCHEMA public TO prisma_app;

-- Grant USAGE on auth schema (required for FK checks on auth.users)
GRANT USAGE ON SCHEMA auth TO prisma_app;

-- ============================================================================
-- STEP 3: Grant table-level permissions on public schema
-- ============================================================================

-- Grant DML operations on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO prisma_app;

-- Grant permissions on future tables (automatic for new tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prisma_app;

-- ============================================================================
-- STEP 4: Grant sequence permissions (for auto-increment IDs)
-- ============================================================================

-- Grant USAGE and SELECT on all sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO prisma_app;

-- Grant on future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT USAGE, SELECT ON SEQUENCES TO prisma_app;

-- ============================================================================
-- STEP 5: Grant auth.users access (required for FK validation)
-- ============================================================================

-- Players and admin_profiles have FKs to auth.users
-- Prisma needs SELECT to validate these relationships
GRANT SELECT ON auth.users TO prisma_app;

-- Note: We do NOT grant INSERT/UPDATE/DELETE on auth.users
-- Supabase Auth manages that table exclusively

-- ============================================================================
-- STEP 6: Grant system catalog access (Prisma introspection)
-- ============================================================================

-- Prisma needs to read system catalogs for:
-- - prisma generate (reading schema)
-- - prisma db pull (introspection)
-- - Query planning
GRANT pg_read_all_stats TO prisma_app;

-- Grant access to information_schema (Prisma uses this)
GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO prisma_app;

-- ============================================================================
-- STEP 7: Verification queries (run these after migration)
-- ============================================================================

-- These are commented out - copy them to run in a separate session

/*
-- 1. Confirm role has correct privileges
SELECT 
  rolname,
  rolsuper AS "Is Superuser?",
  rolbypassrls AS "Bypasses RLS?",
  rolcreaterole AS "Can Create Roles?",
  rolcreatedb AS "Can Create DBs?"
FROM pg_roles 
WHERE rolname = 'prisma_app';

-- Expected output:
-- prisma_app | f | f | f | f
-- All should be FALSE!

-- 2. Check RLS is enabled on critical tables
SELECT 
  schemaname,
  tablename,
  rowsecurity AS "RLS Enabled?"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('players', 'tenants', 'matches', 'admin_profiles')
ORDER BY tablename;

-- Expected: rowsecurity = true for all tables

-- 3. Verify table permissions
SELECT 
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'prisma_app'
  AND table_schema = 'public'
ORDER BY table_name, privilege_type;

-- Expected: SELECT, INSERT, UPDATE, DELETE on all public tables

-- 4. Verify auth.users access (SELECT only)
SELECT 
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'prisma_app'
  AND table_schema = 'auth'
  AND table_name = 'users';

-- Expected: SELECT only (no INSERT/UPDATE/DELETE)
*/

-- ============================================================================
-- NOTES & WARNINGS
-- ============================================================================

/*
⚠️ CRITICAL SECURITY NOTES:

1. PASSWORD CHANGE REQUIRED
   - The default password 'CHANGE_ME_IN_PRODUCTION' is intentionally weak
   - Generate a strong password (32+ characters) in Supabase Dashboard
   - Update your .env file with the new connection string
   - Example: DATABASE_URL="postgresql://prisma_app:YOUR_STRONG_PASSWORD@..."

2. CONNECTION STRING UPDATE
   - OLD: postgresql://postgres:password@host:5432/db
   - NEW: postgresql://prisma_app:new_password@host:5432/db
   - Use direct connection (port 5432), NOT pooler (6543)
   - Prisma requires session features unavailable in connection pooler

3. RLS ENFORCEMENT
   - This role has NOBYPASSRLS - all queries go through RLS policies
   - Every API route MUST set app.tenant_id before queries
   - Missing tenant context = queries return 0 rows
   - See Phase 2 for Prisma middleware implementation

4. TESTING BEFORE PRODUCTION
   - Test with both tenants (BerkoTNF, Poo Wanderers)
   - Verify explicit filtering still works
   - Check all 81 API routes function correctly
   - Monitor for permission errors in logs

5. ROLLBACK PROCEDURE
   - If issues occur, revert to postgres role immediately
   - See 001_rollback_restricted_role.sql
   - No data loss - only connection change
   - Can switch back instantly if needed

📊 EXPECTED IMPACT:

Performance: ~5-10% slower queries (RLS policy evaluation overhead)
Security: 100% improvement (defense-in-depth now enforced)
Code Changes: None in Phase 1 (only connection string)
Downtime: <1 minute (connection string update + restart)

✅ READY FOR PHASE 2:
Once this migration is verified and working:
- Phase 2: Add Prisma middleware to set tenant context
- Phase 3: Add integration tests for tenant isolation
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

