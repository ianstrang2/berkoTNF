# CRITICAL Phase 2 Security Fix

**Date:** 2025-01-08  
**Severity:** 🚨 CRITICAL  
**Status:** ✅ FIXED  
**Issue:** Default tenant fallback + RLS blocking tenant resolution

---

## 🚨 Critical Security Issue Found

User reported seeing:
```
[TENANT_CONTEXT] Falling back to default tenant for user <uuid> - THIS IS A SECURITY RISK IN PRODUCTION
```

**This is a MAJOR security vulnerability!**

### What Was Wrong

The `getTenantFromRequest` function had a fallback that returned `DEFAULT_TENANT_ID` when a user had no tenant association. This means:

- ❌ User from Tenant A could see Tenant B's data
- ❌ Authenticated but unassigned users get access
- ❌ Silent failure instead of proper error
- ❌ Defeats entire multi-tenancy security model

**This was left over from old code and should NEVER exist in production!**

---

## ✅ Fixes Applied

### Fix 1: Removed Default Tenant Fallback

**Before (INSECURE):**
```typescript
if (!playerProfile) {
  console.warn(`Falling back to default tenant - THIS IS A SECURITY RISK`);
  return DEFAULT_TENANT_ID; // ❌ SECURITY VULNERABILITY
}
```

**After (SECURE):**
```typescript
if (!playerProfile) {
  console.error(`User ${session.user.id} has no tenant association`);
  throw new Error(`SECURITY: User has no tenant association - redirect to /auth/no-club`);
}
```

**Impact:** Now properly fails instead of silently exposing wrong tenant's data ✅

---

### Fix 2: getTenantFromRequest Uses Service Role

**Problem:** `getTenantFromRequest` was using Prisma to look up which tenant a user belongs to, but Phase 2 middleware requires tenant context BEFORE querying. Chicken-and-egg problem.

**Solution:** Use Supabase admin client for tenant resolution (bypasses RLS):

```typescript
export async function getTenantFromRequest(request?: any, options = {}) {
  // Use Supabase admin client for cross-tenant tenant resolution
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Check admin_profiles (use service role)
  const { data: adminProfile } = await supabaseAdmin
    .from('admin_profiles')
    .select('tenant_id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  
  // Check players (use service role)
  const { data: playerProfile } = await supabaseAdmin
    .from('players')
    .select('tenant_id, name, player_id')
    .eq('auth_user_id', session.user.id)
    .maybeSingle();
  
  // If still no tenant found → THROW ERROR (no fallback!)
  if (!playerProfile) {
    throw new Error('User has no tenant association');
  }
}
```

**Why this is secure:**
- User already authenticated (session exists)
- Read-only lookup (just finding their tenant)
- Returns only their own tenant
- No fallback to default

---

## 🐛 Secondary Issue: Player Not Linked

User logged in with `07949251277` but system couldn't find player:
```
[TENANT_CONTEXT] ❌ NO PLAYER FOUND for auth_user_id: 9cd1e822-460e-4324-ae91-907da7ad26be
```

### Possible Causes

1. **Player exists but auth_user_id not set**
   - Login flow didn't link the player
   - `/api/auth/link-by-phone` failed silently
   - UPDATE blocked by RLS

2. **Multiple auth.users records**
   - Supabase creating new user each login
   - Player linked to old auth_user_id
   - New session has different ID

3. **Phone number mismatch**
   - Normalization issue
   - Player phone in different format
   - Link-by-phone not finding match

### Debug Steps

**Run this SQL in Supabase:**
```sql
-- Check auth.users
SELECT id, phone, created_at, last_sign_in_at
FROM auth.users
WHERE phone LIKE '%949251277%'
ORDER BY created_at DESC;

-- Check players
SELECT player_id, name, phone, auth_user_id, is_admin, tenant_id
FROM players
WHERE phone LIKE '%949251277%';

-- If player has no auth_user_id, manually link:
UPDATE players
SET auth_user_id = '<auth_user_id_from_first_query>'
WHERE phone LIKE '%949251277%'
  AND auth_user_id IS NULL;
```

**See:** `debug_auth_state.sql` for complete debug script

---

## 🔧 Additional Fix Needed: Link-by-Phone RLS

The `/api/auth/link-by-phone` endpoint may be failing to UPDATE the player due to RLS:

**Current code:**
```typescript
// Link to this user (use Prisma with tenant context)
if (!matchingPlayer.auth_user_id) {
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${matchingPlayer.tenant_id}, false)`;
  
  await prisma.players.update({
    where: { 
      player_id: matchingPlayer.player_id,
      tenant_id: matchingPlayer.tenant_id
    },
    data: { auth_user_id: session.user.id },
  });
}
```

**Better approach - use Supabase admin for UPDATE too:**

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">src/app/api/auth/link-by-phone/route.ts
