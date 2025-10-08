# Database Migrations - RLS Enforcement

This directory contains SQL migrations for enabling Row Level Security (RLS) enforcement.

---

## 📁 Files in This Directory

### 001_create_restricted_role.sql
**Purpose:** Create restricted database role for Prisma connection  
**Impact:** Enables RLS enforcement (removes BYPASSRLS privilege)  
**Risk Level:** Low (instant rollback available)  
**Estimated Time:** 5 minutes

**What it does:**
- Creates `prisma_app` role with NOBYPASSRLS
- Grants SELECT, INSERT, UPDATE, DELETE on public schema
- Grants SELECT on auth.users (for FK validation)
- Grants system catalog access (for Prisma introspection)
- Includes verification queries

### 001_rollback_restricted_role.sql
**Purpose:** Emergency rollback to postgres superuser  
**Use Case:** Critical issues requiring immediate revert  
**Risk Level:** Low (returns to known state)  
**Estimated Time:** < 1 minute

**What it does:**
- Documents rollback procedure
- Lists common rollback scenarios
- Includes lessons learned template
- Provides verification queries

---

## 🚀 How to Execute

### Quick Execution

```bash
# 1. Run migration (as postgres superuser)
psql "$DATABASE_URL" -f sql/migrations/001_create_restricted_role.sql

# 2. Generate password
openssl rand -base64 32

# 3. Set password in Supabase Dashboard
# Database → Roles → prisma_app → Edit → Change Password

# 4. Update .env
DATABASE_URL="postgresql://prisma_app:YOUR_PASSWORD@host:5432/postgres"

# 5. Restart application
npm run dev
```

### Detailed Guide

See: `docs/RLS_MIGRATION_CHECKLIST.md`

---

## ⚠️ Important Notes

### Before Running

- [ ] Backup database (Supabase does this automatically)
- [ ] Read migration file comments
- [ ] Have rollback script ready
- [ ] Test in development first

### After Running

- [ ] Verify role properties (NOBYPASSRLS)
- [ ] Test application functionality
- [ ] Check both test tenants
- [ ] Monitor for permission errors

### If Issues Occur

1. Check troubleshooting section in migration checklist
2. Review error messages carefully
3. Use rollback script if needed
4. Document issue for future reference

---

## 🔄 Rollback Procedure

**If you need to revert:**

```bash
# 1. Update .env
DATABASE_URL="postgresql://postgres:original_password@host:5432/postgres"

# 2. Restart application
npm run dev

# 3. Verify rollback
psql "$DATABASE_URL" -c "SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;"
# Expected: postgres | t
```

**Note:** Rollback does NOT require running SQL script - just change connection string!

---

## 📚 Documentation

**Complete Documentation:**
- `docs/PHASE1_RLS_MIGRATION_SUMMARY.md` - Overview and file reference
- `docs/RLS_MIGRATION_QUICKSTART.md` - Quick start for experienced users
- `docs/RLS_MIGRATION_CHECKLIST.md` - Step-by-step detailed guide
- `docs/ENV_CONFIGURATION_PHASE1.md` - Environment configuration help

**Context:**
- `docs/PHASE_6_IMPLEMENTATION_STATUS.md` - Project status
- `docs/SPEC_multi_tenancy.md` - Multi-tenancy architecture
- `docs/SPEC_auth.md` - Authentication specification

---

## 🎯 Success Criteria

**Migration is complete when:**

1. Role `prisma_app` exists with `rolbypassrls = false`
2. Application connects successfully
3. All API routes work
4. Both tenants see only their data
5. No permission errors in logs

**See:** `docs/RLS_MIGRATION_CHECKLIST.md` for complete sign-off checklist

---

## 🔒 Security Impact

**Before:** postgres superuser (BYPASSRLS = true)
- RLS policies ignored
- Single layer of protection (explicit filtering only)
- Higher risk of data leaks

**After:** prisma_app restricted (BYPASSRLS = false)
- RLS policies enforced
- Double protection (explicit + RLS)
- Defense-in-depth security

---

## 📊 Migration History

| Migration | Date | Status | Notes |
|-----------|------|--------|-------|
| 001_create_restricted_role | 2025-01-08 | ✅ Ready | Phase 1 RLS enforcement |

---

## 🆘 Support

**Questions?** 
- Check `docs/RLS_MIGRATION_CHECKLIST.md` troubleshooting section
- Review `docs/ENV_CONFIGURATION_PHASE1.md` for .env help
- See `001_rollback_restricted_role.sql` for rollback scenarios

**Issues?**
- Use rollback procedure (instant revert)
- Document the issue
- Check known issues in rollback script

---

**Status:** Ready for execution  
**Risk Level:** Low  
**Security Impact:** CRITICAL  
**Estimated Time:** 15-20 minutes

