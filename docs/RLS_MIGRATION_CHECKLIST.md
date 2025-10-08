# RLS Migration Checklist - Phase 1

**Migration:** Switch from postgres superuser to restricted prisma_app role  
**Purpose:** Enable Row Level Security (RLS) enforcement for multi-tenant isolation  
**Risk Level:** Low (instant rollback available)  
**Estimated Time:** 15-20 minutes (including verification)  
**Date:** 2025-01-08

---

## 🎯 Migration Goals

### Security Objectives
- ✅ Enforce RLS policies at database level
- ✅ Remove BYPASSRLS privilege from application connection
- ✅ Create defense-in-depth (explicit filtering + RLS)
- ✅ Reduce blast radius of potential security bugs

### Success Criteria
- [ ] Restricted role created with correct permissions
- [ ] Application connects successfully with new role
- [ ] All 81 API routes function correctly
- [ ] Tenant isolation verified with both test tenants
- [ ] No permission errors in logs
- [ ] Performance degradation < 10%

---

## ⚠️ Pre-Migration Checklist

### Environment Preparation

- [ ] **Backup database** (Supabase automatic backups enabled)
- [ ] **Document current state:**
  ```bash
  # Current role check
  psql $DATABASE_URL -c "SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;"
  # Save output
  ```

- [ ] **Verify test tenants exist:**
  ```sql
  SELECT tenant_id, name, is_active, created_at 
  FROM tenants 
  ORDER BY created_at;
  ```
  Expected: BerkoTNF and Poo Wanderers

- [ ] **Verify RLS policies exist:**
  ```sql
  SELECT COUNT(*) as policy_count 
  FROM pg_policies 
  WHERE schemaname = 'public';
  ```
  Expected: 25+ policies

- [ ] **Test credentials work:**
  ```bash
  psql "$DATABASE_URL" -c "SELECT version();"
  ```
  Expected: PostgreSQL version details

### Team Coordination

- [ ] Notify team of planned migration
- [ ] Schedule during low-traffic window (if possible)
- [ ] Have rollback script ready (`001_rollback_restricted_role.sql`)
- [ ] Ensure monitoring/logging access available

---

## 📋 Migration Steps

### Step 1: Create Restricted Role (Database)

**Action:** Run the migration script as postgres superuser

```bash
# Connect using current postgres superuser credentials
psql "$DATABASE_URL" -f sql/migrations/001_create_restricted_role.sql
```

**Expected Output:**
```
NOTICE: Created role: prisma_app
GRANT
GRANT
GRANT
...
(Multiple GRANT statements)
```

**Verification Query:**
```sql
-- Confirm role created with correct privileges
SELECT 
  rolname AS "Role Name",
  rolsuper AS "Superuser?",
  rolbypassrls AS "Bypass RLS?",
  rolcreaterole AS "Create Roles?",
  rolcreatedb AS "Create DBs?",
  rolcanlogin AS "Can Login?"
FROM pg_roles 
WHERE rolname = 'prisma_app';
```

**Expected Result:**
```
 Role Name  | Superuser? | Bypass RLS? | Create Roles? | Create DBs? | Can Login?
------------+------------+-------------+---------------+-------------+------------
 prisma_app | f          | f           | f             | f           | t
```

**All should be FALSE except "Can Login"!** ✅

---

### Step 2: Set Strong Password (Supabase Dashboard)

**⚠️ CRITICAL SECURITY STEP**

1. **Generate secure password:**
   ```bash
   openssl rand -base64 32
   ```
   Example output: `Xy9$mK2#pQw8Zn4!vB7@tL5%rF3&hJ6^`

2. **Set password in Supabase:**
   - Open Supabase Dashboard
   - Navigate: **Database** → **Roles** (or use SQL)
   - Find: `prisma_app`
   - Set password (copy from step 1)

   **OR via SQL:**
   ```sql
   ALTER USER prisma_app WITH PASSWORD 'YOUR_GENERATED_PASSWORD_HERE';
   ```

3. **Save password securely:**
   - Store in password manager
   - Do NOT commit to git
   - Use different passwords for dev/staging/prod

**Verification:**
```bash
# Test authentication with new password
psql "postgresql://prisma_app:YOUR_PASSWORD@db.xyz.supabase.co:5432/postgres" -c "SELECT current_user;"
```

Expected: `current_user = prisma_app`

---

### Step 3: Update Environment Variables

**Development (.env.local):**

```bash
# OLD (commented out for reference):
# DATABASE_URL="postgresql://postgres:old_password@host:5432/postgres"

# NEW (Phase 1 - Restricted Role):
DATABASE_URL="postgresql://prisma_app:YOUR_SECURE_PASSWORD@db.xyz.supabase.co:5432/postgres"
```

**Production (Vercel Environment Variables):**

1. Navigate: Vercel Dashboard → Project → Settings → Environment Variables
2. Find: `DATABASE_URL`
3. Update: With new `prisma_app` connection string
4. Select: Production environment
5. Save changes

**⚠️ Important:** Use port `:5432` (direct), NOT `:6543` (pooler)

---

### Step 4: Verify Prisma Connection

**Test Prisma can read schema:**

```bash
# Should complete without errors
npm run prisma -- db pull
```

**Expected:** No output or success message

**If errors occur:**
- `permission denied for table X` → Re-run Step 1 migration
- `connection timeout` → Check port is 5432
- `authentication failed` → Verify password matches Step 2

---

### Step 5: Restart Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
vercel --prod
```

**Watch logs for:**
- ✅ "Server started on port 3000" (or production URL)
- ❌ "permission denied for table X"
- ❌ "connection timeout"
- ❌ "authentication failed"

If you see errors, proceed to **Troubleshooting** section below.

---

## 🧪 Verification & Testing

### Level 1: Database Verification

**Run these queries to confirm setup:**

#### Query 1: Verify Role Properties
```sql
SELECT 
  rolname,
  rolbypassrls AS "Bypasses RLS?"
FROM pg_roles 
WHERE rolname IN ('postgres', 'prisma_app')
ORDER BY rolname;
```

**Expected:**
```
   rolname   | Bypasses RLS?
-------------+---------------
 postgres    | t             ← Can bypass (but we're not using it)
 prisma_app  | f             ← Cannot bypass (THIS IS WHAT WE WANT)
```

#### Query 2: Verify RLS Enabled on Critical Tables
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity AS "RLS Enabled?"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('players', 'tenants', 'matches', 'admin_profiles', 'upcoming_matches')
ORDER BY tablename;
```

**Expected:**
```
 schemaname |    tablename     | RLS Enabled?
------------+------------------+--------------
 public     | admin_profiles   | t
 public     | matches          | t
 public     | players          | t
 public     | tenants          | t
 public     | upcoming_matches | t
```

All should be `t` (true)! ✅

#### Query 3: Test RLS Enforcement
```sql
-- Connect as prisma_app
SET ROLE prisma_app;

-- Try to query WITHOUT setting tenant context
SELECT COUNT(*) FROM players;
```

**Expected:** `0` rows (or error if policies are strict)

This confirms RLS is enforcing! ✅

**Now test WITH tenant context:**
```sql
-- Set tenant context (BerkoTNF)
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', false);

-- Query should now work
SELECT COUNT(*) FROM players;
```

**Expected:** 82+ rows (BerkoTNF players)

#### Query 4: Verify Cannot Access Other Tenant
```sql
-- Still as prisma_app with BerkoTNF tenant context
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', false);

-- Try to query Poo Wanderers player (different tenant)
SELECT COUNT(*) 
FROM players 
WHERE tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3';
```

**Expected:** `0` rows

RLS policy blocks access to other tenant's data! ✅

---

### Level 2: Application Verification

**Test critical API routes:**

#### Test 1: Auth Profile Endpoint
```bash
curl -v http://localhost:3000/api/auth/profile \
  -H "Cookie: sb-access-token=YOUR_SESSION_TOKEN"
```

**Expected:** 
- Status: `200 OK` (if authenticated)
- Status: `401 Unauthorized` (if no session - this is correct)
- NOT: `500` with "permission denied"

#### Test 2: Players List (Admin Route)
```bash
curl http://localhost:3000/api/admin/players \
  -H "Cookie: sb-access-token=YOUR_ADMIN_SESSION"
```

**Expected:**
- Status: `200 OK`
- Body: JSON with players from admin's tenant only
- NOT: Empty array (unless it's a new tenant with no players)

#### Test 3: Match Report (Player Route)
```bash
curl http://localhost:3000/api/matchReport?match_id=123 \
  -H "Cookie: sb-access-token=YOUR_SESSION"
```

**Expected:**
- Status: `200 OK` (if match exists in user's tenant)
- Status: `404` (if match doesn't exist or wrong tenant)
- NOT: `500` with database errors

#### Test 4: All-Time Stats
```bash
curl http://localhost:3000/api/allTimeStats \
  -H "Cookie: sb-access-token=YOUR_SESSION"
```

**Expected:**
- Status: `200 OK`
- Body: Stats for user's tenant only
- Verify club name matches user's club (not other tenant)

---

### Level 3: Tenant Isolation Testing

**Critical security test - verify each tenant sees ONLY their data**

#### Test with BerkoTNF Admin

1. **Login as BerkoTNF admin:**
   - Phone: `07949251277`
   - Expected tenant_id: `00000000-0000-0000-0000-000000000001`

2. **Check Players API:**
   ```bash
   curl http://localhost:3000/api/admin/players
   ```
   **Expected:** 82 players, all with BerkoTNF names

3. **Check they CANNOT see Poo Wanderers:**
   - No players named "Poo Jones"
   - No club data for Poo Wanderers tenant
   - Player count should be exactly 82 (not 83)

4. **Check Dashboard:**
   - Navigate: `/admin/dashboard`
   - Verify: Club name shows "BerkoTNF"
   - Verify: Stats show BerkoTNF data only

#### Test with Poo Wanderers Admin

1. **Login as Poo Wanderers admin:**
   - Phone: `447949222222`
   - Expected tenant_id: `2cd8f68f-6389-4b54-9065-18ec447434e3`

2. **Check Players API:**
   ```bash
   curl http://localhost:3000/api/admin/players
   ```
   **Expected:** 1 player (Poo Jones only)

3. **Check they CANNOT see BerkoTNF:**
   - No players from BerkoTNF
   - No matches from BerkoTNF
   - Player count should be exactly 1 (not 83)

4. **Check Dashboard:**
   - Navigate: `/admin/dashboard`
   - Verify: Club name shows "Poo Wanderers" (or test club name)
   - Verify: Empty states show (new tenant with minimal data)

#### Cross-Tenant Attack Simulation

**Attempt to access other tenant's data via API:**

1. **Login as BerkoTNF, try to access Poo Wanderers data:**
   ```bash
   # Get Poo Wanderers player ID from database
   # Try to access it while logged in as BerkoTNF
   curl http://localhost:3000/api/playerprofile/[POO_WANDERERS_PLAYER_ID] \
     -H "Cookie: [BERKO_SESSION_TOKEN]"
   ```
   **Expected:** `403 Forbidden` or `404 Not Found` (NOT the player data)

2. **Try to modify other tenant's data:**
   ```bash
   curl -X PUT http://localhost:3000/api/admin/players/[OTHER_TENANT_PLAYER] \
     -H "Cookie: [YOUR_SESSION]" \
     -d '{"name": "Hacked"}'
   ```
   **Expected:** `403 Forbidden` or `404 Not Found` (NOT successful update)

**✅ If all tests pass:** Tenant isolation is working correctly!

---

### Level 4: Performance Verification

**Measure query performance impact:**

#### Baseline Measurement
```sql
-- Run each query 5 times, note average time
EXPLAIN ANALYZE
SELECT * FROM players WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
```

**Expected Impact:**
- Query time increase: 5-10%
- RLS policy evaluation overhead: ~1-2ms per query
- Index usage: Should still use `idx_players_tenant` efficiently

#### If Performance Issues Detected

**Check indexes exist:**
```sql
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%tenant_id%'
ORDER BY tablename;
```

**Expected:** All tenant_id columns have indexes

**Check RLS policies are efficient:**
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,  -- SELECT, INSERT, UPDATE, DELETE
  qual  -- Policy condition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

**Verify policies use indexed columns (tenant_id, auth.uid())**

---

## ❌ Troubleshooting

### Issue 1: "permission denied for table X"

**Symptom:** API routes return 500 error with database permission error

**Diagnosis:**
```sql
-- Check what permissions prisma_app has
SELECT 
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'prisma_app'
  AND table_schema = 'public'
  AND table_name = 'X'  -- Replace X with problematic table
ORDER BY table_name, privilege_type;
```

**Fix:**
```sql
-- Grant missing permission
GRANT SELECT, INSERT, UPDATE, DELETE ON public.X TO prisma_app;
```

**Prevention:** Re-run full migration script:
```bash
psql "$DATABASE_URL" -f sql/migrations/001_create_restricted_role.sql
```

---

### Issue 2: "connection timeout"

**Symptom:** Application won't start, connection hangs

**Diagnosis:**
```bash
# Check your DATABASE_URL
echo $DATABASE_URL | grep -o ':[0-9]*/'
```

**Fix:**
- If shows `:6543/` → Change to `:5432/`
- Connection pooler (6543) doesn't work with Prisma
- Direct connection (5432) required

**Correct format:**
```bash
DATABASE_URL="postgresql://prisma_app:password@host:5432/postgres"
                                                        ^^^^ Not 6543
```

---

### Issue 3: "authentication failed for user prisma_app"

**Symptom:** Cannot connect to database

**Diagnosis:**
```bash
# Try connecting with psql to see exact error
psql "$DATABASE_URL"
```

**Common causes:**
1. **Password mismatch:** .env password ≠ Supabase Dashboard password
2. **Special characters in password:** Not escaped properly
3. **Wrong database name:** Using wrong Supabase project

**Fix:**
```bash
# If password has special chars, wrap in single quotes
DATABASE_URL="postgresql://prisma_app:'P@ss$word!'@host:5432/postgres"
                                        ^          ^
                                        Quotes protect special chars
```

**Verify password in Supabase:**
1. Dashboard → Database → Roles
2. Find `prisma_app`
3. Reset password
4. Copy exact password to .env

---

### Issue 4: "queries return 0 rows" (even for valid data)

**Symptom:** API returns empty results, but data exists in database

**Diagnosis:**
```sql
-- Check if RLS is blocking queries
SET ROLE prisma_app;
SELECT current_setting('app.tenant_id', true) AS current_tenant;
SELECT COUNT(*) FROM players;
```

**Expected:** 
- `current_tenant` is `NULL` → RLS blocks queries
- `COUNT(*)` returns `0` → RLS enforcing

**Status:** ✅ This is EXPECTED in Phase 1!

**Why:** You haven't implemented Phase 2 middleware yet. RLS requires `app.tenant_id` to be set before each query.

**Fix:** Proceed to Phase 2 (Prisma middleware implementation)

**Temporary workaround** (for testing only):
```sql
-- Set tenant context manually
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', false);

-- Now queries work
SELECT COUNT(*) FROM players;  -- Should return 82
```

---

### Issue 5: "role prisma_app does not exist"

**Symptom:** Connection fails immediately

**Diagnosis:**
```sql
-- Check if role was created
SELECT rolname FROM pg_roles WHERE rolname = 'prisma_app';
```

**Fix:** Run migration as postgres superuser:
```bash
# Use original postgres credentials
psql "postgresql://postgres:admin_password@host:5432/postgres" \
  -f sql/migrations/001_create_restricted_role.sql
```

---

## 🔄 Rollback Procedure

**If critical issues occur and you need to revert immediately:**

### Step 1: Update .env
```bash
# Change back to postgres superuser
DATABASE_URL="postgresql://postgres:original_password@host:5432/postgres"
```

### Step 2: Restart Application
```bash
npm run dev  # Development
# OR
vercel --prod  # Production
```

### Step 3: Verify Rollback
```bash
psql "$DATABASE_URL" -c "SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;"
```

**Expected:**
```
 current_user | rolbypassrls 
--------------+--------------
 postgres     | t
```

Back to superuser mode (RLS bypassed) ✅

### Step 4: Document Rollback

**Record in:** `sql/migrations/001_rollback_restricted_role.sql` (see template)

- Date/time of rollback
- Reason for rollback
- Root cause of issue
- Resolution plan
- Expected re-deployment date

### Step 5: Plan Re-Deployment

Don't rush. Fix the root cause properly:
1. Identify exact error
2. Test fix in development
3. Document fix in migration script
4. Re-test thoroughly
5. Re-apply when ready

---

## ✅ Sign-Off Checklist

**Before marking Phase 1 complete:**

### Database
- [ ] Restricted role `prisma_app` created
- [ ] Role has NOBYPASSRLS privilege
- [ ] All table permissions granted correctly
- [ ] auth.users SELECT permission granted
- [ ] Sequences accessible
- [ ] System catalogs accessible (pg_read_all_stats)

### Application
- [ ] .env updated with new connection string
- [ ] Strong password generated and set
- [ ] Prisma can connect (`prisma db pull` works)
- [ ] Application starts without errors
- [ ] No "permission denied" in logs

### Security
- [ ] RLS policies enforcing (verified with queries)
- [ ] BerkoTNF tenant isolation verified
- [ ] Poo Wanderers tenant isolation verified
- [ ] Cross-tenant access blocked (attack simulation passed)
- [ ] Password stored securely (not in git)

### Performance
- [ ] Query performance measured (< 10% impact)
- [ ] No timeouts or connection issues
- [ ] All 81 API routes tested
- [ ] Dashboard loads correctly

### Documentation
- [ ] Rollback procedure tested
- [ ] Issues documented
- [ ] Team notified
- [ ] Next steps (Phase 2) planned

---

## 📊 Migration Summary

**Fill this out after completion:**

- **Date Started:** _________________
- **Date Completed:** _________________
- **Total Duration:** _________________
- **Issues Encountered:** _________________
- **Performance Impact:** _________________% slower
- **Rollbacks Required:** _________________
- **Final Status:** ✅ COMPLETE / ❌ ROLLED BACK / ⏸️ PAUSED

**Tested By:**
- [ ] Developer: _________________
- [ ] QA: _________________
- [ ] Product Owner: _________________

**Approval:**
- [ ] Approved for Production
- [ ] Approved for Phase 2 Implementation

---

## 🚀 Next Steps (Phase 2)

**What's Next:** Prisma middleware to set tenant context automatically

**Why:** Currently, RLS blocks queries without `app.tenant_id` set. Phase 2 adds middleware that automatically sets tenant context from the request.

**Implementation Preview:**
```typescript
// Phase 2 will add this middleware
prisma.$use(async (params, next) => {
  const tenantId = await getTenantFromRequest(request);
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
  return next(params);
});
```

**Expected Impact:**
- Transparent tenant context (no code changes to API routes)
- RLS enforcement automatic
- True defense-in-depth (explicit + RLS)

**See:** Phase 2 specification (coming in next prompt)

---

## 📚 Reference Documents

**Migration Files:**
- `sql/migrations/001_create_restricted_role.sql` - Main migration
- `sql/migrations/001_rollback_restricted_role.sql` - Rollback script
- `docs/ENV_CONFIGURATION_PHASE1.md` - Environment setup guide

**Architecture:**
- `docs/SPEC_multi_tenancy.md` - Multi-tenancy specification
- `docs/SPEC_auth.md` - Authentication specification
- `docs/PHASE_6_IMPLEMENTATION_STATUS.md` - Current status

**Security:**
- `.cursor/rules/code-generation.mdc` - Security rules (tenant filtering mandatory)

---

**Status:** Ready for implementation  
**Risk Level:** Low (rollback available)  
**Estimated Time:** 15-20 minutes  
**Security Impact:** ⭐⭐⭐⭐⭐ CRITICAL (enables RLS enforcement)  
**Production Ready:** After verification checklist complete ✅

