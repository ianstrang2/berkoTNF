# Phase 2 Issue: Profile API Lookup Blocked by RLS

**Date:** 2025-01-08  
**Issue:** Profile API returning no player data, causing player sidebar to show instead of admin  
**Status:** ✅ FIXED  
**Root Cause:** Cross-tenant profile lookup blocked by Phase 2 middleware

---

## 🐛 Issue Description

After implementing Phase 2 Prisma middleware, users logging in as admins were seeing the player sidebar instead of the admin sidebar, even though they were on `/admin/*` pages.

**Symptom:**
- User logs in with admin phone number (`07949251277`)
- Correctly redirected to `/admin/matches` ✅
- But sidebar shows player navigation (Dashboard, Upcoming, Table, Records) ❌
- Should show admin navigation (Matches, Players, Seasons, Setup)

**Example:**
- Phone: `07949251277` (BerkoTNF admin with `is_admin = true`)
- URL: `/admin/matches` (correct)
- Sidebar: Player nav (wrong)

---

## 🔍 Root Cause Analysis

### The Flow

1. User logs in → Redirected to `/admin/matches` ✅
2. Layout component calls `useAuth()` hook
3. `useAuth()` fetches `/api/auth/profile`
4. `/api/auth/profile` tries to look up player:
   ```typescript
   const playerProfile = await prisma.players.findFirst({
     where: { auth_user_id: user.id }
   });
   ```
5. **Phase 2 middleware runs before this query**
6. Middleware looks for tenant context in AsyncLocalStorage
7. **No tenant context available** (we're trying to find which tenant user belongs to!)
8. RLS blocks query → returns 0 rows
9. Profile API returns `isAdmin: false`
10. Sidebar shows player navigation

### The Chicken-and-Egg Problem

```
┌─────────────────────────────────────────────────┐
│ Need tenant context to query database           │
│        ↓                                         │
│ Need to query database to find tenant           │
│        ↓                                         │
│ Need tenant context to query database           │
│        ↓                                         │
│ (infinite loop)                                  │
└─────────────────────────────────────────────────┘
```

**The profile API's job is to determine which tenant a user belongs to**, but Phase 2 middleware requires tenant context to be set BEFORE querying. This creates a circular dependency.

---

## ✅ The Fix

### Solution: Use Supabase Service Role for Profile Lookup

Similar to the Phase 1 login fix, we use Supabase's admin client with service role to bypass RLS for authentication-specific cross-tenant lookups:

**Updated Code:**

```typescript
// Use Supabase admin client for cross-tenant profile lookup
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

// Check for superadmin
const { data: superadminProfile } = await supabaseAdmin
  .from('admin_profiles')
  .select('user_role, tenant_id, player_id, display_name')
  .eq('user_id', user.id)
  .maybeSingle();

// Check for player profile
const { data: playerProfile } = await supabaseAdmin
  .from('players')
  .select('player_id, name, tenant_id, is_admin')
  .eq('auth_user_id', user.id)
  .maybeSingle();
```

### Why This Is Secure

1. **User already authenticated** via `requireAuth(request)` before this endpoint
2. **Read-only lookup** - just finding which tenant/role they have
3. **Returns only user's own data** - filtered by `user.id` from session
4. **No tenant context needed** - this IS the tenant resolution
5. **Legitimate auth use case** - determining user's role and tenant membership

---

## 📁 Files Modified

### Fixed File
- `src/app/api/auth/profile/route.ts` - Use Supabase admin for cross-tenant profile lookup

### Documentation
- `docs/PHASE2_ISSUE_PROFILE_FIX.md` - This document
- `docs/PHASE2_PRISMA_MIDDLEWARE.md` - Update with this pattern

---

## 🧪 Testing

### Test Case 1: BerkoTNF Admin Login

```
Phone: 07949251277
Expected:
  - URL: /admin/matches ✅
  - Sidebar: Admin nav (Matches, Players, Seasons, Setup) ✅
  - Profile API returns: isAdmin: true ✅
Status: ✅ FIXED
```

### Test Case 2: Poo Wanderers Admin Login

```
Phone: 07949222222 (if is_admin = true)
Expected:
  - URL: /admin/matches ✅
  - Sidebar: Admin nav ✅
  - Profile API returns: isAdmin: true ✅
Status: ✅ Should work (test after fix)
```

### Test Case 3: Regular Player Login

```
Phone: [any player without is_admin]
Expected:
  - URL: / or /player/dashboard ✅
  - Sidebar: Player nav (Dashboard, Upcoming, Table, Records) ✅
  - Profile API returns: isAdmin: false ✅
Status: ✅ Should work correctly
```

---

## 📝 Pattern for Cross-Tenant Auth Lookups

### When to Use Service Role (Bypass RLS)

**Use Supabase admin client for:**
1. ✅ `/api/auth/profile` - Determining user's tenant/role
2. ✅ `/api/auth/link-by-phone` - Finding which tenant a phone belongs to
3. ✅ Invitation validation - Cross-tenant token lookups
4. ✅ Password reset - Cross-tenant user lookups

**Characteristics of legitimate bypasses:**
- User is already authenticated
- Purpose is determining tenant membership
- Returns only user's own data
- Cross-tenant lookup is inherent to the operation

### When to Use Middleware (Normal Flow)

**Use `withTenantContext` for:**
- All regular data queries after tenant is known
- CRUD operations on tenant-scoped data
- Reports, stats, player lists
- Match management

---

## 🔍 How to Identify Similar Issues

**Symptoms:**
- Queries returning 0 rows unexpectedly
- User authentication works but profile wrong
- Console warnings: `[PRISMA_MIDDLEWARE] No tenant context`
- Features work in Phase 1 but break in Phase 2

**Check for:**
- Queries that determine tenant membership
- Lookups by `auth_user_id` without prior tenant knowledge
- Authentication flows
- Token validation endpoints

**Fix:**
Use Supabase admin client for the cross-tenant lookup portions, then use Prisma with explicit tenant filtering for subsequent queries.

---

## ✅ Resolution Checklist

- [x] Identified root cause (middleware blocking profile lookup)
- [x] Implemented fix (Supabase admin client)
- [x] Tested admin login flow
- [x] Verified sidebar shows correct navigation
- [x] Documented the fix
- [x] Updated Phase 2 documentation

---

## 📊 Status

**Issue:** Profile API blocked by RLS middleware  
**Root Cause:** Cross-tenant lookup without tenant context  
**Fix:** Use Supabase service role for auth-specific lookups  
**Status:** ✅ RESOLVED  
**Testing:** ✅ Verified admin sidebar now shows correctly

**Next:** Continue Phase 2 testing, watch for similar patterns in other auth endpoints

---

## 🎓 Lessons Learned

### Authentication Endpoints Are Special

**Key Insight:** Authentication and authorization endpoints that determine WHO a user is and WHICH tenant they belong to are inherently cross-tenant operations.

**Pattern Established:**
1. **Auth determination** = Use service role (bypass RLS)
2. **Data access** = Use middleware (enforce RLS)

**Where to draw the line:**
- Before you know the tenant → Service role
- After you know the tenant → Middleware + explicit filtering

---

**Status:** Phase 2 auth fix complete ✅  
**Impact:** Admin users now see correct navigation  
**Testing:** Verified with BerkoTNF admin login  
**Ready:** Continue Phase 2 testing with both tenants

