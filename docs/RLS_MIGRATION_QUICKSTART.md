# RLS Migration Quick Start - Phase 1

**For experienced users - condensed instructions. See [RLS_MIGRATION_CHECKLIST.md](./RLS_MIGRATION_CHECKLIST.md) for detailed guide.**

---

## 📋 TL;DR

Switch from `postgres` superuser (bypasses RLS) to `prisma_app` restricted role (enforces RLS).

**Time:** 5-10 minutes  
**Risk:** Low (instant rollback available)  
**Impact:** Enables Row Level Security enforcement

---

## ⚡ Quick Steps

### 1. Run Migration (as postgres)

```bash
psql "$DATABASE_URL" -f sql/migrations/001_create_restricted_role.sql
```

### 2. Generate & Set Password

```bash
# Generate password
openssl rand -base64 32

# Set in Supabase Dashboard → Database → Roles → prisma_app
# OR via SQL:
psql "$DATABASE_URL" -c "ALTER USER prisma_app WITH PASSWORD 'YOUR_GENERATED_PASSWORD';"
```

### 3. Update .env

```bash
# OLD:
# DATABASE_URL="postgresql://postgres:password@host:5432/postgres"

# NEW:
DATABASE_URL="postgresql://prisma_app:YOUR_PASSWORD@host:5432/postgres"
```

⚠️ Use port **5432** (direct), NOT 6543 (pooler)

### 4. Restart & Verify

```bash
# Test connection
npm run prisma -- db pull

# Start app
npm run dev

# Verify role
psql "$DATABASE_URL" -c "SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;"
# Expected: prisma_app | f
```

---

## ✅ Critical Verifications

### Database Level

```sql
-- 1. Role has NOBYPASSRLS
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'prisma_app';
-- Expected: prisma_app | f

-- 2. RLS enforcing (should return 0 without tenant context)
SET ROLE prisma_app;
SELECT COUNT(*) FROM players;
-- Expected: 0

-- 3. RLS works WITH tenant context
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', false);
SELECT COUNT(*) FROM players;
-- Expected: 82 (BerkoTNF players)
```

### Application Level

```bash
# 1. Auth endpoint works
curl http://localhost:3000/api/auth/profile

# 2. Players API works
curl http://localhost:3000/api/admin/players

# 3. No permission errors in logs
```

### Tenant Isolation

**Test both tenants see ONLY their data:**

1. Login as BerkoTNF (`07949251277`) → Should see 82 players
2. Login as Poo Wanderers (`447949222222`) → Should see 1 player
3. Verify NO cross-tenant data visible

---

## ❌ Common Issues

| Error | Cause | Fix |
|-------|-------|-----|
| `permission denied for table X` | Missing grant | Re-run migration |
| `connection timeout` | Using pooler (6543) | Change to port 5432 |
| `authentication failed` | Password mismatch | Verify password in Supabase |
| `queries return 0 rows` | RLS enforcing, no tenant context | ✅ Expected! Proceed to Phase 2 |
| `role prisma_app does not exist` | Migration not run | Run migration as postgres |

---

## 🔄 Instant Rollback

```bash
# 1. Update .env
DATABASE_URL="postgresql://postgres:original_password@host:5432/postgres"

# 2. Restart
npm run dev

# 3. Verify
psql "$DATABASE_URL" -c "SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;"
# Expected: postgres | t
```

---

## 📊 Expected State After Phase 1

**✅ Working:**
- Database role created
- RLS policies enforcing
- Tenant isolation at database level
- Can rollback instantly if needed

**❌ Known Limitation:**
- Queries return 0 rows without tenant context
- This is EXPECTED - Phase 2 adds automatic tenant context

**🔜 Next:**
- Phase 2: Prisma middleware (automatic tenant context)
- Phase 3: Integration tests

---

## 🚨 Emergency Contact

**Issues?** See detailed troubleshooting:
- [RLS_MIGRATION_CHECKLIST.md](./RLS_MIGRATION_CHECKLIST.md) - Complete guide
- [ENV_CONFIGURATION_PHASE1.md](./ENV_CONFIGURATION_PHASE1.md) - Environment setup
- `sql/migrations/001_rollback_restricted_role.sql` - Rollback script

**Status:** Phase 1 complete when all verifications pass ✅

