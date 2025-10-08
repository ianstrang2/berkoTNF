# Phase 1 RLS Issue: Login Flow Broken

**Date:** 2025-01-08  
**Issue:** Login stopped working after Phase 1 RLS migration  
**Status:** ✅ FIXED  
**Root Cause:** Cross-tenant phone lookup blocked by RLS enforcement

---

## 🐛 Issue Description

After switching from `postgres` superuser to `prisma_app` restricted role in Phase 1, the login flow broke:

**Symptom:**
- User enters phone number that exists in database
- Completes OTP verification successfully
- Gets redirected to "We couldn't find your club" page
- This is a phone number that **definitely exists** and **used to work**

**Example:**
- Phone: `07949222222` (Poo Wanderers tenant)
- Used to work fine before Phase 1
- After Phase 1: Shows "no club found" error

---

## 🔍 Root Cause Analysis

### The Authentication Flow

1. User enters phone → Receives OTP → Verifies code ✅
2. System calls `/api/auth/link-by-phone` to find player ❌
3. Endpoint tries to search **across ALL tenants** to find which club the phone belongs to
4. Query: `prisma.players.findMany({ where: { phone: { not: null } } })`

### What Changed in Phase 1

**Before (postgres superuser):**
```sql
-- postgres role has BYPASSRLS = true
SELECT * FROM players;
-- Returns ALL players from ALL tenants ✅
```

**After (prisma_app restricted):**
```sql
-- prisma_app role has BYPASSRLS = false
SELECT * FROM players;
-- RLS enforces! Without app.tenant_id set, returns 0 rows ❌
```

### Why It Failed

The authentication endpoint **legitimately needs** to search across all tenants to determine which club a phone number belongs to. This is a special case where cross-tenant lookup is required for the authentication flow itself.

With RLS enforcing and no `app.tenant_id` set, the query returned 0 rows, so the system couldn't find the player, even though they existed in the database.

---

## ✅ The Fix

### Solution: Use Supabase Service Role for Auth Lookups

For authentication-specific cross-tenant lookups, we use Supabase's admin client with the service role key, which bypasses RLS:

**Updated Code:**

```typescript
// Use Supabase admin client to bypass RLS for cross-tenant phone lookup
// This is a legitimate use case: we need to find which tenant a phone belongs to
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Query using Supabase admin client (bypasses RLS)
const { data: allPlayers } = await supabaseAdmin
  .from('players')
  .select('player_id, name, phone, tenant_id, auth_user_id, is_admin')
  .eq('is_ringer', false)
  .eq('is_retired', false)
  .not('phone', 'is', null);

// Then use Prisma with tenant context for the UPDATE
await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${matchingPlayer.tenant_id}, false)`;
await prisma.players.update({
  where: { 
    player_id: matchingPlayer.player_id,
    tenant_id: matchingPlayer.tenant_id
  },
  data: { auth_user_id: session.user.id }
});
```

### Why This Is Secure

1. **User is already authenticated** via Supabase phone OTP before this endpoint is called
2. **Read-only cross-tenant lookup** - just finding which club they belong to
3. **Write operation uses explicit tenant context** - the actual UPDATE has RLS + explicit filtering
4. **No data leakage** - we only return the player's own data
5. **Legitimate use case** - authentication inherently requires knowing which tenant a user belongs to

---

## 📁 Files Modified

### Fixed File
- `src/app/api/auth/link-by-phone/route.ts` - Use Supabase admin for cross-tenant phone lookup

### Documentation
- `docs/PHASE1_RLS_ISSUE_LOGIN_FIX.md` - This document

---

## 🧪 Testing

### Test Case 1: BerkoTNF Login
```
Phone: 07949251277
Expected: Login successful → Redirect to /admin/matches
Status: ✅ WORKING
```

### Test Case 2: Poo Wanderers Login
```
Phone: 07949222222
Expected: Login successful → Redirect to appropriate page
Status: ✅ FIXED (was broken, now working)
```

### Test Case 3: Unknown Phone Number
```
Phone: 07999999999 (not in any tenant)
Expected: Redirect to /auth/no-club page
Status: ✅ WORKING
```

---

## 📝 Lessons Learned

### Expected Phase 1 Behavior

We documented that "queries return 0 rows" was **EXPECTED** in Phase 1, but we didn't anticipate it would break **authentication flows** that need cross-tenant lookups.

### What We Missed

The authentication flow is a special case:
- It needs to search across all tenants
- It determines which tenant a user belongs to
- This is inherently a cross-tenant operation
- But it's also secure (user already authenticated)

### Pattern for Future

**When to bypass RLS:**
1. ✅ **Authentication/Authorization lookups** - Determining which tenant a user belongs to
2. ✅ **Superadmin operations** - Platform-level management (explicitly scoped)
3. ❌ **Regular data queries** - Use explicit tenant filtering + RLS

**How to bypass RLS securely:**
- Use Supabase admin client (service role) for READ operations
- Use Prisma with explicit tenant context for WRITE operations
- Document why the bypass is necessary
- Ensure user is already authenticated
- Verify no data leakage

---

## 🚀 Similar Endpoints to Check

These endpoints may need similar fixes if they do cross-tenant lookups:

### Potentially Affected
- ✅ `/api/auth/link-by-phone` - FIXED
- [ ] `/api/join/link-player` - Check if this needs similar fix
- [ ] `/api/admin/create-club` - Check tenant resolution
- [ ] Superadmin tenant switching - May need service role

### Action Item
Audit these endpoints during Phase 2 implementation to ensure they handle RLS correctly.

---

## ✅ Resolution Checklist

- [x] Identified root cause (RLS blocking cross-tenant auth lookup)
- [x] Implemented fix (Supabase admin client for phone lookup)
- [x] Added explicit tenant context for UPDATE operation
- [x] Added logging for debugging
- [x] Tested with both tenants
- [x] Documented the fix
- [x] Updated Phase 1 status document

---

## 📊 Status

**Issue:** Login broken after Phase 1 RLS migration  
**Root Cause:** Cross-tenant phone lookup blocked by RLS  
**Fix:** Use Supabase service role for auth-specific cross-tenant queries  
**Status:** ✅ RESOLVED  
**Testing:** ✅ Verified with both test tenants  

**Next:** Continue with Phase 1 verification, then proceed to Phase 2

---

**Key Takeaway:** Authentication flows that determine tenant membership are legitimate cases for bypassing RLS, as long as the user is already authenticated and we use explicit tenant context for write operations.

