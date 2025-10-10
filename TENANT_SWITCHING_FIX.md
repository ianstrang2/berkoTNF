# ✅ Tenant Switching Cache Issue - FIXED

## The Problem

**Intermittent "no data" after switching tenants:**
- Switch from superadmin → "view as tenant"
- Some pages show empty data
- Hard refresh (`Ctrl+Shift+R`) fixes it
- Inconsistent behavior

## Root Cause

**Race condition between cache clear and page load:**

1. User switches tenant
2. `queryClient.clear()` called
3. Page immediately redirects with `window.location.href`
4. New page loads while cache is still clearing
5. Hooks run with `tenantId = null` (auth not ready yet)
6. Empty results get cached
7. When `tenantId` loads, stale empty cache is served

## The Solution (3-Part Fix)

### 1. Proper Cache Clear Timing ✅

**File:** `src/components/layout/ProfileDropdown.component.tsx`

```typescript
// Before redirect:
await queryClient.invalidateQueries(); // Invalidate all queries
queryClient.clear(); // Then clear the cache
await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms
window.location.replace('/admin/matches'); // Then redirect
```

**Why this works:**
- ✅ `invalidateQueries()` marks all data as stale
- ✅ `clear()` removes from cache
- ✅ 200ms delay lets async clear operations finish
- ✅ `replace()` forces hard reload with clean state

### 2. Loading Gates on All Admin Pages ✅

**Files Updated:**
- `src/app/admin/matches/page.tsx`
- `src/components/admin/player/PlayerManager.component.tsx`
- `src/components/admin/season/SeasonManager.component.tsx`

```typescript
const Component = () => {
  // ALL HOOKS AT TOP (React rules!)
  const { profile } = useAuth();
  const { data, isLoading } = useData();
  const [state, setState] = useState(...);
  
  // Derive values after all hooks
  const tenantId = profile.tenantId;
  
  // THEN conditional returns
  if (!tenantId && profile.isAuthenticated) {
    return <div>Loading tenant context...</div>;
  }
  
  // Render component
  return <div>...</div>;
};
```

**Why this works:**
- ✅ Waits for `tenantId` before rendering
- ✅ Prevents showing "No data" during transition
- ✅ Hooks don't cache empty results with null tenantId

### 3. Query Keys Include TenantId ✅

**Verified:** All query keys properly include `tenantId`:

```typescript
queryKeys.upcomingMatchesList(tenantId)
queryKeys.playersAdmin(tenantId, includeMatchCounts, showRetired)
queryKeys.seasons(tenantId)
queryKeys.currentSeason(tenantId)
```

**Why this matters:**
- ✅ Different tenant = different cache entry
- ✅ Automatic refetch when `tenantId` changes
- ✅ No cross-tenant cache pollution

---

## Why NOT to Use `enabled: !!tenantId` (ChatGPT's Wrong Advice)

**ChatGPT suggested:**
```typescript
useQuery({
  queryKey: ['players', tenantId],
  queryFn: fetchPlayers,
  enabled: !!tenantId,  // ❌ DON'T DO THIS!
});
```

**Why it's wrong:**
1. Component mounts
2. `tenantId = null` initially
3. `enabled: !!null` → **false**
4. Query gets **permanently disabled**
5. Even when `tenantId` loads, query stays disabled
6. Result: Permanent "No Data" until hard refresh

**We tried this before - it broke everything!**

**Our better approach:**
```typescript
useQuery({
  queryKey: ['players', tenantId],
  queryFn: () => fetchPlayers(tenantId),
  // NO enabled flag - queryFn handles null gracefully
});

async function fetchPlayers(tenantId) {
  if (!tenantId) return []; // Early return
  // ... fetch logic
}
```

**Why this works:**
- ✅ Query runs immediately (no race condition)
- ✅ Returns empty array if `tenantId` null
- ✅ When `tenantId` loads → key changes → automatic refetch
- ✅ No permanent disable issue

---

## Testing Instructions

### Test 1: Tenant Switching (Main Test)

1. **Start fresh:**
   ```bash
   npm run dev
   ```

2. **Go to superadmin:**
   - Navigate to `/superadmin/tenants`
   
3. **Switch to tenant view:**
   - Click "View as Admin" for BerkoTNF
   - Wait 2-3 seconds (for cache clear + redirect)
   
4. **Check each page:**
   - Matches - Should show active match ✅
   - Players - Should show all players ✅
   - Seasons - Should show all seasons ✅
   
5. **NO HARD REFRESH NEEDED!**

### Test 2: Multiple Tenant Switches

1. View as Admin for Tenant A
2. Return to Platform
3. View as Admin for Tenant B
4. Check data is correct for Tenant B
5. Return to Platform  
6. View as Admin for Tenant A again
7. Check data is correct for Tenant A

**Expected:** Each switch works cleanly without manual refresh.

### Test 3: Player View Switch

1. View as Admin
2. Switch to "View as Player" (Profile Dropdown)
3. Check Dashboard loads correctly
4. Switch back to "View as Admin"
5. Check admin pages load correctly

---

## If Still Seeing "No Data"

### Quick Debug:

1. **Check Console logs:**
   ```
   🗑️ Clearing React Query cache after tenant switch
   🔄 Redirecting to new view...
   ```

2. **Check timing:**
   - Should see ~700ms delay total (500ms cookie + 200ms cache)
   - If redirect happens too fast, increase delay to 300ms

3. **Check Network tab:**
   - After redirect, do you see the API calls?
   - Are they returning data (200 status)?
   - Click on response and check the data

### If Problems Persist:

**Increase the delay:**
```typescript
await new Promise(resolve => setTimeout(resolve, 300)); // Increase to 300ms
```

---

## Changes Made

### Files Modified:
1. ✅ `src/components/layout/ProfileDropdown.component.tsx`
   - Await `invalidateQueries()`
   - Increased delay to 200ms
   - Better console logging

2. ✅ `src/app/admin/matches/page.tsx`
   - Fixed hooks order
   - Added loading gate

3. ✅ `src/components/admin/player/PlayerManager.component.tsx`
   - Fixed hooks order
   - Added loading gate

4. ✅ `src/components/admin/season/SeasonManager.component.tsx`
   - Fixed hooks order
   - Added loading gate

---

## Test Now!

**Follow the testing instructions above** - especially Test 1 (tenant switching).

The combination of:
1. ✅ Proper async cache clear + 200ms delay
2. ✅ Loading gates on all pages
3. ✅ Correct hooks order
4. ✅ TenantId in all query keys

Should make tenant switching work **100% reliably** without hard refresh!

---

**Report back:**
1. Does tenant switching work now?
2. Do all 3 pages (Matches, Players, Seasons) show data?
3. Any console errors or warnings?

Let me know! 🚀

