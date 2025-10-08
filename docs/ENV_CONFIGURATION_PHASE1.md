# Environment Configuration - Phase 1 RLS Migration

**Updated:** 2025-01-08  
**Purpose:** Switch from postgres superuser to restricted prisma_app role  
**Security Impact:** Enforces Row Level Security (RLS) policies

---

## Database Connection Changes

### ❌ OLD (Insecure - BYPASSES RLS)

```bash
DATABASE_URL="postgresql://postgres:your_password@db.supabase.co:5432/postgres"
```

**Problems:**
- Uses superuser role (`postgres`)
- Has `BYPASSRLS` privilege
- RLS policies completely ignored
- Single point of failure for security
- Not suitable for production launch

---

### ✅ NEW (Secure - ENFORCES RLS)

```bash
DATABASE_URL="postgresql://prisma_app:YOUR_STRONG_PASSWORD_HERE@db.supabase.co:5432/postgres"
```

**Configuration Details:**
- **Role:** `prisma_app` (restricted, no BYPASSRLS)
- **Password:** Generate 32+ character password in Supabase Dashboard
- **Port:** `5432` (direct connection, NOT `6543` pooler)
- **Database:** `postgres` (default Supabase database name)

**Why Direct Connection (5432)?**
- Prisma needs session-level features
- Connection pooler (`6543`) breaks Prisma's query engine
- RLS policies require per-session tenant context

**Security Improvements:**
- ✅ RLS policies now enforced
- ✅ Defense-in-depth (explicit filtering + RLS)
- ✅ Reduced blast radius (limited permissions)
- ✅ Audit trail (separate role for app queries)

---

## Getting Your Connection String

### Step 1: Find Connection Details in Supabase

1. Open Supabase Dashboard
2. Navigate to: **Project Settings** → **Database**
3. Scroll to: **Connection String**
4. Select: **URI** (with session pooler **disabled**)
5. Copy the connection string

### Step 2: Modify the Connection String

**Original from Supabase:**
```
postgresql://postgres.abc123xyz:password123@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

**Changes to make:**
1. Replace `postgres` with `prisma_app`
2. Replace `password123` with your new strong password
3. Ensure port is `:5432` (NOT `:6543`)
4. Remove `.pooler` from hostname if present

**Final connection string:**
```
postgresql://prisma_app:Xy9$mK2#pQw8Zn4...@db.abc123xyz.supabase.co:5432/postgres
```

### Step 3: Update .env File

Create or update `.env.local` (for development):

```bash
# Database Connection - Phase 1 Restricted Role
DATABASE_URL="postgresql://prisma_app:YOUR_PASSWORD@db.xyz.supabase.co:5432/postgres"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://abc123xyz.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_JWT_SECRET="your-jwt-secret"

# Application
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## Password Generation

### Generate Secure Password

**Command Line (recommended):**
```bash
openssl rand -base64 32
```

**Example output:**
```
Xy9$mK2#pQw8Zn4!vB7@tL5%rF3&hJ6^
```

**Password Requirements:**
- Minimum 32 characters
- Mix of uppercase, lowercase, numbers, symbols
- No dictionary words
- Different passwords for dev/staging/production

### Set Password in Supabase

1. Open Supabase Dashboard
2. Navigate to: **Database** → **Roles**
3. Find: `prisma_app` role
4. Click: **Edit** → **Change Password**
5. Paste your generated password
6. Click: **Save**

---

## Verification Steps

### 1. Test Database Connection

```bash
# Test connection with psql
psql "$DATABASE_URL" -c "SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;"
```

**Expected output:**
```
 current_user | rolbypassrls 
--------------+--------------
 prisma_app   | f
```

If `rolbypassrls` is `f` (false), RLS enforcement is working! ✅

### 2. Test Prisma Connection

```bash
# Test Prisma can connect and read schema
npm run prisma -- db pull
```

**Expected:** Success message, no errors

**If you see:** "permission denied", go back and re-run the migration grants

### 3. Test Application Startup

```bash
# Start dev server
npm run dev
```

**Expected:** Server starts without database connection errors

**Check logs for:**
- ❌ "permission denied for table X"
- ❌ "role prisma_app does not exist"
- ❌ "connection timeout"

### 4. Test API Routes

```bash
# Test a simple API endpoint
curl http://localhost:3000/api/auth/profile
```

**Expected:** 
- `200 OK` (if you have valid session)
- `401 Unauthorized` (if no session - this is correct)

**Not expected:**
- `500 Internal Server Error` with "permission denied"

---

## Common Issues & Fixes

### Issue 1: "permission denied for table X"

**Cause:** Missing GRANT in migration script  
**Fix:** Re-run `001_create_restricted_role.sql`

```bash
psql "$DATABASE_URL" -f sql/migrations/001_create_restricted_role.sql
```

### Issue 2: "connection timeout"

**Cause:** Using pooler port (6543) instead of direct (5432)  
**Fix:** Change `:6543` to `:5432` in DATABASE_URL

### Issue 3: "password authentication failed for user prisma_app"

**Cause:** Password mismatch between .env and Supabase  
**Fix:** 
1. Verify password in Supabase Dashboard
2. Copy exact password to .env (including special characters)
3. Wrap password in single quotes if it contains special chars

**Example with special characters:**
```bash
DATABASE_URL="postgresql://prisma_app:'P@ss$123!'@host:5432/postgres"
```

### Issue 4: "role prisma_app does not exist"

**Cause:** Migration not run yet  
**Fix:** Run the migration first

```bash
psql "postgresql://postgres:admin_password@host:5432/postgres" \
  -f sql/migrations/001_create_restricted_role.sql
```

### Issue 5: "queries return 0 rows"

**Cause:** RLS is enforcing, but tenant context not set  
**Fix:** This is **EXPECTED** in Phase 1! Proceed to Phase 2 for Prisma middleware

---

## Rollback Procedure

If you encounter critical issues and need to revert:

### Step 1: Update .env

```bash
# Change FROM:
DATABASE_URL="postgresql://prisma_app:password@host:5432/postgres"

# Change TO (your original):
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

If `rolbypassrls` is `t` (true), you're back to bypassing RLS.

**⚠️ Important:** Document why you rolled back and plan to re-apply the fix.

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Migration tested in development
- [ ] Migration tested in staging
- [ ] Strong password generated (32+ characters)
- [ ] Password stored securely (not in git)
- [ ] Connection string updated in Vercel environment variables
- [ ] Rollback procedure documented
- [ ] Team notified of deployment window

### Deployment Steps

1. **Run migration on production database**
   ```bash
   psql "$PRODUCTION_DATABASE_URL" -f sql/migrations/001_create_restricted_role.sql
   ```

2. **Update Vercel environment variables**
   - Navigate to: Vercel Dashboard → Project → Settings → Environment Variables
   - Update: `DATABASE_URL` with new connection string
   - Save changes

3. **Redeploy application**
   ```bash
   vercel --prod
   ```

4. **Verify deployment**
   - Check application logs for errors
   - Test critical API routes
   - Verify tenant isolation
   - Monitor for 30 minutes

### Post-Deployment Monitoring

**Watch for:**
- Permission denied errors
- Connection timeouts
- Increased query times (5-10% expected)
- Tenant data leaks (should be zero)

**Success Metrics:**
- All API routes return correct data
- Tenants see only their own data
- No permission errors in logs
- Application performance acceptable

---

## Next Steps

### After Phase 1 is Complete

✅ **Phase 1 COMPLETE:** Restricted role created, RLS enforcement enabled  
🔜 **Phase 2 NEXT:** Add Prisma middleware to set tenant context  
⏸️ **Phase 3 WAITING:** Integration tests for tenant isolation

### Phase 2 Preview

Phase 2 will add Prisma middleware that automatically sets `app.tenant_id` before each query:

```typescript
// Preview of Phase 2 implementation
prisma.$use(async (params, next) => {
  // Get tenant from request context
  const tenantId = await getTenantFromRequest(request);
  
  // Set tenant context for RLS
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
  
  // Execute query (RLS will enforce)
  return next(params);
});
```

This will make RLS enforcement transparent to your API routes.

---

## Support & Resources

**Documentation:**
- [RLS Migration Checklist](./RLS_MIGRATION_CHECKLIST.md) - Complete verification guide
- [Multi-Tenancy Spec](./SPEC_multi_tenancy.md) - Architecture details
- [Phase 6 Status](./PHASE_6_IMPLEMENTATION_STATUS.md) - Current implementation

**Migration Files:**
- `sql/migrations/001_create_restricted_role.sql` - Main migration
- `sql/migrations/001_rollback_restricted_role.sql` - Rollback script

**Need Help?**
- Check [Troubleshooting](#common-issues--fixes) section above
- Review rollback procedure if issues persist
- Document any new issues for future reference

---

**Status:** Ready for implementation  
**Estimated Time:** 5-10 minutes  
**Risk Level:** Low (can rollback instantly)  
**Security Impact:** High (enables RLS enforcement)

