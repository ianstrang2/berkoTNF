# Context Handoff - React Query Migration Continuation

## What Was Accomplished

### Pages Optimized (2 of ~5-7 total)
1. ✅ **Dashboard** - 189 → 52 requests (72% reduction)
2. ✅ **Table Page** - 105 → 40 requests (62% reduction)

**Overall:** 294 → 92 requests (69% reduction), 75-85% faster load times

---

## What We Did (Step-by-Step)

### Phase 1: React Query Infrastructure
1. **Installed** `@tanstack/react-query` and devtools
2. **Created** `QueryClientProvider` in root layout (`src/providers/ReactQueryProvider.tsx`)
3. **Configured** sensible defaults:
   - staleTime: 5 minutes
   - gcTime: 10 minutes
   - refetchOnWindowFocus: false
   - retry: 1

### Phase 2: Query Key Factory
Created `src/lib/queryKeys.ts` with centralized keys:
```typescript
export const queryKeys = {
  matchReport: () => ['matchReport'] as const,
  players: () => ['players'] as const,
  personalBests: () => ['personalBests'] as const,
  appConfig: (group?: string) => group ? ['appConfig', group] : ['appConfig'] as const,
  // ... etc
}
```

### Phase 3: Custom Query Hooks
Created reusable hooks in `src/hooks/queries/`:
- `useMatchReport()` - Match report data
- `usePlayers()` - All players  
- `usePersonalBests()` - Personal bests
- `useAppConfig(group)` - App configuration
- `useAuthProfile()` - User profile
- `useCurrentSeason()` - Current season
- `useHalfSeasonStats()` - Half-season table
- `useCurrentStats(year)` - Full season table (parameterized)
- `useSeasons()` - Seasons list
- `useSeasonRaceData(period)` - Race graph data

### Phase 4: Component Migration Pattern
**Before:**
```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/endpoint')
    .then(r => r.json())
    .then(d => setData(d));
}, []);
```

**After:**
```typescript
const { data, isLoading, error } = useEndpoint();
// That's it! Automatic caching, deduplication, error handling
```

### Phase 5: Critical Performance Fixes (IMPORTANT!)

#### **1. Fixed N+1 Problem in Stats Endpoints**
**Files affected:**
- `src/app/api/stats/half-season/route.ts`
- `src/app/api/stats/route.ts`

**Problem:**
```typescript
// O(n²) - For each of 30 players, scan 30-item array twice
goalStats.map(player => ({
  lastFiveGames: recentPerformance.find(perf => perf.name === player.name),
  maxGoals: recentPerformance.find(perf => perf.name === player.name)
}))
```

**Fix:**
```typescript
// O(n) - Create Map once, then O(1) lookups
const perfByName = new Map(
  recentPerformance.map(perf => [perf.name, perf])
);
goalStats.map(player => ({
  lastFiveGames: perfByName.get(player.name) // O(1) lookup
}))
```

**Impact:** 4.96s → 201ms (25x faster!)

#### **2. Optimized Prisma Middleware**
**File:** `src/lib/prisma.ts`

**Problem:** Calling `set_config('app.tenant_id', ...)` before EVERY query

**Fix:** Only call once per request using context flag:
```typescript
if (!(context as any)._rlsContextSet) {
  await client.$executeRawUnsafe(`SELECT set_config(...)`);
  (context as any)._rlsContextSet = true;
}
```

**Impact:** Eliminated 5-6 redundant calls per request

#### **3. Removed Wasteful Test Query**
**File:** `src/app/api/admin/app-config/route.ts`

**Problem:** Doing findFirst just to check if table exists, then findMany

**Fix:** Just do findMany with try/catch

**Impact:** 50% faster config requests

#### **4. Reduced Prisma Logging**
**File:** `src/lib/prisma.ts`

Changed from `['query', 'info', 'warn', 'error']` to `['warn', 'error']`

**Impact:** Reduced console noise and I/O overhead

#### **5. Fixed API Response Format Mismatches**
Some APIs return `{data: [...]}`, others return `{success: true, data: [...]}`

Made sure each hook matches its API's format.

### Phase 6: Tenant Context Fix
**File:** `src/components/layout/ProfileDropdown.component.tsx`

Added `queryClient.clear()` when switching tenants to prevent showing stale data from previous tenant.

---

## Remaining Screens to Migrate

### High Priority
1. **Records** (`/records`) - ~40-60 duplicate requests
2. **Player Profiles** (`/player/profiles/[id]`) - ~20-30 per profile

### Lower Priority
3. **Admin screens** (`/admin/*`) - ~50-80 per screen
4. **Upcoming matches** - Unknown duplicates

---

## Migration Checklist for New Screens

For each new screen:

1. **Identify duplicate API calls** (use Network tab)
2. **Check if hooks already exist** in `src/hooks/queries/`
3. **Create new hooks if needed** (follow existing pattern)
4. **Add query keys** to `src/lib/queryKeys.ts`
5. **Migrate components** - replace useState/useEffect with useQuery
6. **Test** - verify deduplication works
7. **Check for N+1 problems** in API routes (look for `.find()` in loops)
8. **Add performance logging** if endpoint is slow
9. **Fix and optimize** as needed

---

## Common Issues & Solutions

### Issue: "No data" after migration
**Cause:** API response format mismatch
**Fix:** Check if API returns `{data: [...]}` or `{success: true, data: [...]}`

### Issue: Infinite loop
**Cause:** useCallback with array dependencies
**Fix:** Don't use useCallback, or depend on `array.length` not `array`

### Issue: Stale data after tenant switch
**Cause:** React Query cache not cleared
**Fix:** Call `queryClient.clear()` when switching tenants

### Issue: Slow requests (4-5 seconds)
**Causes:**
1. N+1 problem (nested `.find()` in loops)
2. Multiple set_config calls (Prisma middleware)
3. Wasteful test queries

**Fix:** Apply the same performance optimizations from Phase 5

---

## Files to Reference

### For React Query patterns:
- `src/hooks/queries/useMatchReport.hook.ts` - Basic query
- `src/hooks/queries/useCurrentStats.hook.ts` - Parameterized query
- `src/components/dashboard/MatchReport.component.tsx` - Component example

### For performance optimization patterns:
- `src/app/api/stats/half-season/route.ts` - N+1 fix with Map
- `src/lib/prisma.ts` - Middleware optimization
- `src/app/api/admin/app-config/route.ts` - Removed wasteful query

---

## Ready for New Context Window

**Paste this into the new chat:**

"I'm continuing a React Query migration to eliminate duplicate API calls.

**Already complete:**
- Dashboard: 189 → 52 requests (72% reduction)
- Table page: 105 → 40 requests (62% reduction)

**What was done:**
1. React Query infrastructure installed and configured
2. 11 query hooks created in src/hooks/queries/
3. 10 components migrated to use React Query
4. Major performance fixes:
   - Fixed N+1 problem in stats endpoints (25-34x speedup)
   - Optimized Prisma middleware (once per request instead of per query)
   - Removed wasteful test queries
   - Reduced Prisma logging overhead

**Files to reference:**
- See REACT_QUERY_MIGRATION_COMPLETE.md for full details
- Query hooks: src/hooks/queries/
- Query keys: src/lib/queryKeys.ts
- Performance fixes: src/app/api/stats/half-season/route.ts (N+1 fix example)

**Next screens to migrate (in order):**
1. Records screen (/records) - Estimated 40-60 duplicates
2. Player Profiles (/player/profiles/[id]) - Estimated 20-30 per profile
3. Admin screens - Lower priority

**Pattern to follow:**
1. Identify duplicate API calls in Network tab
2. Create/reuse query hooks
3. Migrate components from fetch/useState to useQuery
4. Check for N+1 problems in API routes (look for .find() in loops)
5. Add performance logging if slow
6. Test and verify

Start with the next screen I tell you."

---

## Answer to Your Second Question

**Do dashboard APIs need the same performance fixes?**

**Short answer:** Probably not critical, but worth checking.

**Why:**
The dashboard APIs (matchReport, personalBests, players) don't appear to have the same nested `.find()` loops that caused the N+1 problem. But it's worth:

1. **Checking their response times** in Network tab
   - If any are >500ms, investigate
   - If all are <100ms, they're fine

2. **Quick audit:** Look for `.find()` inside `.map()` loops in these files:
   - `src/app/api/matchReport/route.ts`
   - `src/app/api/personal-bests/route.ts`
   - `src/app/api/players/route.ts`

If you see similar patterns, apply the Map optimization.

**Want me to quickly check those before we close this window?** Or should I prepare the handoff and you'll audit them in the new window if needed?

