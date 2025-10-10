# 🚀 React Query Migration - Continuation Handoff

## Context
I'm continuing a React Query migration to eliminate duplicate API calls across my app and improve performance.

---

## ✅ COMPLETED (4 of ~5-7 screens)

### Screens Optimized
1. ✅ **Dashboard** - 189 → 52 requests (72% reduction, 2-3s load time)
2. ✅ **Table page** - 105 → 40 requests (62% reduction, 2-3s load time)
3. ✅ **Records screen** - ~50% reduction (Leaderboard, Legends, Feats tabs)
4. ✅ **Upcoming Matches** - 7 → 3 requests (57% reduction, config/status shared)

### Infrastructure Complete
- ✅ React Query installed and configured (`@tanstack/react-query`)
- ✅ QueryClientProvider in root layout
- ✅ **14 query hooks created in `src/hooks/queries/`**
- ✅ Centralized query keys in `src/lib/queryKeys.ts`
- ✅ **Multi-tenant cache isolation implemented** (CRITICAL!)

### Major Bug Fixes
- ✅ N+1 problem fixed in stats endpoints (25-34x speedup)
- ✅ Prisma middleware optimized (once per request)
- ✅ **Tenant isolation race condition fixed** (root cause of intermittent loading)

---

## 🚨 CRITICAL: Multi-Tenant Query Pattern (MANDATORY)

**ALL query hooks MUST follow this pattern** (documented in `.cursor/rules/code-generation.mdc`):

```typescript
import { useAuth } from '@/hooks/useAuth.hook';
import { queryKeys } from '@/lib/queryKeys';

async function fetchPlayers(tenantId: string | null): Promise<PlayerProfile[]> {
  // Gracefully handle missing tenantId - return empty data
  if (!tenantId) return [];
  
  const response = await fetch('/api/players', { credentials: 'include' });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const result = await response.json();
  return result.data || [];
}

export function usePlayers() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.players(tenantId),  // ✅ Includes tenant_id
    queryFn: () => fetchPlayers(tenantId),  // ✅ Pass tenantId to fetch
    staleTime: 10 * 60 * 1000,
    // ✅ NO enabled condition - queryFn handles missing tenantId gracefully
  });
}
```

**Key Points:**
1. **Include `tenantId` in query key** - Isolates cache per tenant
2. **Pass `tenantId` to fetchFn** - Allows graceful handling of missing auth
3. **NO `enabled` condition** - Avoids permanent disable race condition
4. **Early return in fetchFn** - Returns empty data if `tenantId` is null

**Exception:** `authProfile()` query key does NOT need tenant_id (auth is global)

---

## 📂 Reference Files

### Query Hooks (14 total)
All in `src/hooks/queries/`:
- `useAuthProfile.hook.ts` - User authentication (NO tenant_id)
- `useMatchReport.hook.ts` - Match data
- `usePlayers.hook.ts` - All players
- `usePersonalBests.hook.ts` - Personal bests
- `useAppConfig.hook.ts` - App configuration
- `useHalfSeasonStats.hook.ts` - Half-season stats
- `useCurrentStats.hook.ts` - Full season stats (parameterized by year)
- `useSeasons.hook.ts` - Seasons list
- `useCurrentSeason.hook.ts` - Current season
- `useSeasonRaceData.hook.ts` - Race graph data
- `useAllTimeStats.hook.ts` - All-time stats (Records screen)
- `useHonourRoll.hook.ts` - Season winners, top scorers, records
- **`useUpcomingMatches.hook.ts` - Upcoming matches list** ✨ NEW
- **`useUpcomingMatchDetails.hook.ts` - Match details with players** ✨ NEW
- **`useLatestPlayerStatus.hook.ts` - On fire/grim reaper status** ✨ NEW

### Core Infrastructure
- `src/lib/queryKeys.ts` - Centralized query key factory (ALL keys include tenantId)
- `src/lib/queryClient.ts` - React Query configuration
- `src/providers/ReactQueryProvider.tsx` - Provider wrapper
- `.cursor/rules/code-generation.mdc` - Updated with multi-tenant query pattern

### Performance Fix Examples
- `src/app/api/stats/half-season/route.ts` - Map-based N+1 fix
- `src/app/api/stats/route.ts` - Map-based N+1 fix
- `src/lib/prisma.ts` - Middleware optimization

---

## 🎯 Migration Pattern (FOLLOW THIS)

### Step 1: Identify Duplicate API Calls
- Open Network tab → Filter: `/api/`
- Load the screen
- Look for duplicate calls to same endpoint

### Step 2: Check if Hook Exists
- Look in `src/hooks/queries/` for existing hook
- If exists → use it
- If not → create following the pattern above

### Step 3: Add Query Key (if new hook)
```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  // ...
  newEndpoint: (tenantId: string | null) => ['newEndpoint', tenantId] as const,
}
```

### Step 4: Migrate Component
```typescript
// Before
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetch('/api/endpoint').then(r => r.json()).then(d => setData(d.data));
}, []);

// After  
const { data = [], isLoading } = useEndpoint();
```

### Step 5: Check API Route for N+1 Problems
Look for nested `.find()` in `.map()` loops:
```typescript
// ❌ BAD - O(n²)
players.map(player => ({
  detail: otherData.find(d => d.name === player.name)
}))

// ✅ GOOD - O(n)
const detailMap = new Map(otherData.map(d => [d.name, d]));
players.map(player => ({
  detail: detailMap.get(player.name)
}))
```

### Step 6: Test
- Verify no duplicate API calls
- Verify data loads correctly
- Verify navigation works smoothly

---

## 🔥 Critical Lessons Learned

### 1. Tenant Isolation is End-to-End
- Backend uses `withTenantContext()` and explicit `where: { tenant_id }`
- **Frontend MUST include `tenantId` in React Query keys**
- Missing either = data leaks or race conditions

### 2. React Query `enabled` Creates Race Conditions
- `enabled: !!tenantId` seems logical
- **But**: If checked before auth loads → stays disabled forever
- **Solution**: No `enabled`, handle in `queryFn` with early return

### 3. Query Key Changes Trigger Refetch
- When `tenantId` changes from `null` → `'abc-123'`, query key changes
- React Query automatically refetches (this is the magic!)
- No need for `enabled` or manual refetch logic

### 4. Stale-While-Revalidate Pattern
Components should:
```typescript
if (loading && data.length === 0) {
  return <LoadingSpinner />;  // Only show spinner if NO cached data
}
// Otherwise show cached data immediately, refetch in background
```

---

## 📋 Remaining Screens to Migrate

### High Priority
1. **Player Profiles** (`/player/profiles/[id]`)
   - Individual player detail pages
   - Estimated: 20-30 duplicate calls per profile
   - Will benefit from shared `usePlayers()` and `useLatestPlayerStatus()` cache

### Lower Priority  
2. **Admin screens** (`/admin/*`)
   - Match management
   - Player management
   - Seasons management
   - Settings
   - Estimated: 50-80 duplicates per screen
   - **Note:** Found `BalanceTeamsPane` component making duplicate config/status calls
   - **Quick Win:** Can use existing `useAppConfig()` and `useLatestPlayerStatus()` hooks!

---

## 🔧 Config Files Reference

### React Query Configuration
```typescript
// src/lib/queryClient.ts
{
  staleTime: 5 * 60 * 1000,     // 5 min - data stays fresh
  gcTime: 10 * 60 * 1000,       // 10 min - cache retained
  refetchOnMount: true,         // ✅ Ensures fresh data
  refetchOnWindowFocus: false,  // Reduces noise
}
```

### Query Key Factory
```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  players: (tenantId: string | null) => ['players', tenantId] as const,
  matchReport: (tenantId: string | null) => ['matchReport', tenantId] as const,
  currentStats: (tenantId: string | null, year: number) => ['currentStats', tenantId, year] as const,
  // ... all keys include tenantId except authProfile()
}
```

---

## 📊 Performance Metrics Achieved

### Request Reduction
- Dashboard: 189 → 52 (72% reduction)
- Table: 105 → 40 (62% reduction)
- Records: ~50% reduction
- **Upcoming Matches: 7 → 3 (57% reduction)** ✨ NEW
- **Total: 250+ duplicate API calls eliminated**

### Speed Improvements
- Page load: 10-15s → 2-3s (75-85% faster)
- API endpoints: 4-5s → <200ms (25-34x faster via N+1 fixes)
- Navigation: 500ms → <50ms (90% faster via caching)

### Reliability
- Before: 10-20% failure rate (intermittent issues)
- After: 100% success rate ✅

---

## 🚨 Common Pitfalls to Avoid

### ❌ DON'T Do This:
```typescript
// Missing tenant_id
queryKey: ['endpoint']

// Using enabled condition
enabled: !!tenantId

// Not passing tenantId to fetchFn
queryFn: fetchData  // fetchData doesn't know tenantId
```

### ✅ DO This:
```typescript
// Include tenant_id
queryKey: queryKeys.endpoint(tenantId)

// Pass tenantId to fetch
queryFn: () => fetchData(tenantId)

// Handle missing tenantId in fetch
if (!tenantId) return [];
```

---

## 📝 Documentation Created

**Summary Docs:**
- `REACT_QUERY_MIGRATION_COMPLETE.md` - Initial migration (Dashboard + Table)
- `RECORDS_MIGRATION_COMPLETE.md` - Records screen migration
- **`UPCOMING_MATCHES_MIGRATION_COMPLETE.md` - Upcoming matches migration** ✨ NEW
- `TENANT_ISOLATION_FIX_COMPLETE.md` - Multi-tenant cache fix
- `NAVIGATION_BUG_FIXED.md` - Race condition fix details
- `HANDOFF_TO_NEW_CONTEXT.md` - Original handoff doc

**Testing Guides:**
- `TEST_RECORDS_MIGRATION.md` - Records testing checklist

**Technical Details:**
- `PERFORMANCE_FIXES_APPLIED.md` - N+1 fixes and optimizations
- `FINAL_PERFORMANCE_SUMMARY.md` - Overall performance metrics

---

## ✅ CRITICAL BUG FIXES APPLIED (January 9, 2025)

### **HTTP Cache Bug - THE ACTUAL ROOT CAUSE** 🚨

**Problem:** Components showing "No data" when data existed in database (20-50% failure rate)

**Root Cause:** APIs using `Cache-Control: private, max-age=300` causing browser to cache stale responses for 5 minutes. When data changed in DB, browser served old cached response with empty arrays.

**Solution:** Changed 10 API routes to use `Cache-Control: no-store, must-revalidate`

**APIs Fixed:**
- `/api/matchReport` ⭐ (ROOT CAUSE - had empty arrays cached)
- `/api/players`, `/api/personal-bests`, `/api/admin/app-config`
- `/api/latest-player-status`, `/api/allTimeStats`, `/api/honourroll`
- `/api/seasons`, `/api/seasons/current`, `/api/stats/league-averages`

**Result:** 100% reliable loading, always fresh data from DB

**Documentation:** `CRITICAL_FIX_HTTP_CACHE.md`, `SESSION_COMPLETE_SUMMARY.md`

### **Infinite Loop Fix** 🔥

**Problem:** `/api/profile` called 67 times in 1 minute

**Root Cause:** `useAuth()` returning new object on every render

**Solution:** Wrapped return object in `useMemo`, functions in `useCallback`

**File:** `src/hooks/useAuth.hook.ts`

### **Component Loading Logic**

**Problem:** Components showing spinner even when they had cached data

**Solution:** Changed to `if (loading && !data)` to match working components

**Files:** `CurrentForm.component.tsx`, `Milestones.component.tsx`

**Updated Coding Standards:** Added HTTP cache rule to `.cursor/rules/code-generation.mdc`

---

## ✅ READY FOR NEW WINDOW

**Status:** 4 screens optimized, HTTP cache bug ELIMINATED, infinite loops FIXED, 100% reliable loading

**Latest Session (January 9, 2025):** 
- ✅ Upcoming Matches migrated - 3 new hooks, 57% reduction
- ✅ HTTP cache bug fixed - 10 API routes, now serving fresh data
- ✅ Infinite loop fixed - useAuth stabilized with useMemo
- ✅ Dashboard 100% reliable - all components showing consistently
- ✅ Coding standards updated - HTTP cache rule added

**Next:** Continue migration to Player Profiles or Admin screens

**Key Learning:** HTTP caching was the root cause - React Query caches in-memory (good), HTTP cache persists stale data (bad)

---


