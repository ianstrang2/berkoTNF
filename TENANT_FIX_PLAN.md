# 🚨 CRITICAL BUG FIX: Multi-Tenant Query Key Isolation

## Root Cause
React Query cache keys did NOT include `tenant_id`, causing data from different tenants to be cached globally. This led to:
- Intermittent "No Data Available" messages
- Wrong tenant's data being displayed briefly
- Race conditions during tenant switching
- Data appearing after 5-10 second delays

## The Fix
Add `tenantId` to ALL React Query keys to isolate cache per tenant.

## Implementation Plan

### Step 1: ✅ Update queryKeys.ts
- Added `tenantId` parameter to all query key functions
- Exception: `authProfile()` stays global (auth is cross-tenant)

### Step 2: Update ALL Query Hooks (11 hooks)
Each hook needs:
1. Get `tenantId` from `useAuth()`
2. Pass `tenantId` to `queryKeys.xxx(tenantId)`
3. Disable query if no `tenantId` (prevents errors during auth loading)

**Hooks to update:**
1. ✅ `src/hooks/queries/useMatchReport.hook.ts`
2. ✅ `src/hooks/queries/usePlayers.hook.ts`
3. ✅ `src/hooks/queries/usePersonalBests.hook.ts`
4. ✅ `src/hooks/queries/useAppConfig.hook.ts`
5. ✅ `src/hooks/queries/useHalfSeasonStats.hook.ts`
6. ✅ `src/hooks/queries/useCurrentStats.hook.ts`
7. ✅ `src/hooks/queries/useSeasons.hook.ts`
8. ✅ `src/hooks/queries/useCurrentSeason.hook.ts`
9. ✅ `src/hooks/queries/useSeasonRaceData.hook.ts`
10. ✅ `src/hooks/queries/useAllTimeStats.hook.ts`
11. ✅ `src/hooks/queries/useHonourRoll.hook.ts`

### Step 3: Update useAuth hook
- Already invalidates queries on auth changes ✅
- Will now properly clear per-tenant caches

### Pattern for Each Hook

```typescript
// BEFORE (BROKEN - no tenant isolation)
export function usePlayers() {
  return useQuery({
    queryKey: queryKeys.players(),  // ❌ No tenant_id
    queryFn: fetchPlayers,
  });
}

// AFTER (FIXED - tenant-isolated cache)
import { useAuth } from '@/hooks/useAuth.hook';

export function usePlayers() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.players(tenantId),  // ✅ Includes tenant_id
    queryFn: fetchPlayers,
    enabled: !!tenantId,  // ✅ Wait for auth to load
  });
}
```

## Testing Plan
1. Switch tenants in superadmin
2. Navigate between pages
3. Verify NO "No Data Available" messages
4. Verify correct tenant's data always shows
5. Verify no cross-tenant data contamination

## Impact
- **Fixes:** All intermittent loading issues
- **Security:** Prevents tenant data leakage in cache
- **Performance:** Slightly better (cache hits are more reliable)
- **Breaking:** None (query keys change but cache regenerates automatically)


