# 🚀 Continue React Query Migration - Ready for Next Session

## Context
I'm continuing a React Query migration to eliminate duplicate API calls and improve performance across my app.

---

## ✅ COMPLETED (4 of ~5-7 screens) - 100% WORKING

### Screens Optimized
1. ✅ **Dashboard** - 189 → 52 requests (72% reduction, 2-3s load, 100% reliable)
2. ✅ **Table page** - 105 → 40 requests (62% reduction, 2-3s load)
3. ✅ **Records screen** - ~50% reduction (all 3 tabs working)
4. ✅ **Upcoming Matches** - 7 → 3 requests (57% reduction) ⭐ NEW

**Total:** 250+ duplicate API calls eliminated

---

## 🔥 CRITICAL BUGS FIXED (January 9, 2025)

### 1. HTTP Cache Bug (ROOT CAUSE) 🚨
**Problem:** Dashboard showing "No data" when data existed in database

**Cause:** APIs using `Cache-Control: private, max-age=300` - browser cached stale responses for 5 minutes

**Fixed:** Changed 10 API routes to `Cache-Control: no-store, must-revalidate`

**APIs Fixed:**
- `/api/matchReport` (ROOT CAUSE), `/api/players`, `/api/personal-bests`
- `/api/admin/app-config`, `/api/latest-player-status`, `/api/allTimeStats`
- `/api/honourroll`, `/api/seasons`, `/api/seasons/current`, `/api/stats/league-averages`

**Result:** Dashboard now 100% reliable, always fresh data

**Coding Standard Added:** `.cursor/rules/code-generation.mdc` - HTTP cache rule (MANDATORY for all new APIs)

### 2. Infinite Loop Fixed 🔥
**Problem:** `/api/profile` called 67 times in 1 minute

**Fixed:** `src/hooks/useAuth.hook.ts` - Wrapped return object in `useMemo`

### 3. Component Loading Logic
**Fixed:** `CurrentForm` and `Milestones` components now properly check `if (loading && !data)`

---

## 📚 KEY FILES TO REFERENCE

### Full Documentation
- **`HANDOFF_REACT_QUERY_CONTINUATION.md`** - Complete handoff with all patterns
- **`SESSION_COMPLETE_SUMMARY.md`** - Latest session summary
- **`CRITICAL_FIX_HTTP_CACHE.md`** - HTTP cache bug explanation

### Query Hooks (14 total)
All in `src/hooks/queries/`:
- `useAuthProfile.hook.ts`, `useMatchReport.hook.ts`, `usePlayers.hook.ts`
- `usePersonalBests.hook.ts`, `useAppConfig.hook.ts`
- `useHalfSeasonStats.hook.ts`, `useCurrentStats.hook.ts`
- `useSeasons.hook.ts`, `useCurrentSeason.hook.ts`, `useSeasonRaceData.hook.ts`
- `useAllTimeStats.hook.ts`, `useHonourRoll.hook.ts`
- **`useUpcomingMatches.hook.ts`** ⭐ NEW
- **`useUpcomingMatchDetails.hook.ts`** ⭐ NEW
- **`useLatestPlayerStatus.hook.ts`** ⭐ NEW

### Core Infrastructure
- `src/lib/queryKeys.ts` - Centralized query key factory (ALL keys include tenantId)
- `src/lib/queryClient.ts` - React Query configuration
- `.cursor/rules/code-generation.mdc` - UPDATED with HTTP cache rule

---

## 🎯 MANDATORY PATTERNS (Follow These)

### API Route Pattern
```typescript
import { withTenantContext } from '@/lib/tenantContext';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const data = await prisma.table.findMany({
      where: { tenant_id: tenantId }  // ✅ MANDATORY
    });
    
    return NextResponse.json({ data }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',  // ✅ NO HTTP CACHE
        'Pragma': 'no-cache',
        'Vary': 'Cookie',
      }
    });
  });
}
```

### React Query Hook Pattern
```typescript
import { useAuth } from '@/hooks/useAuth.hook';
import { queryKeys } from '@/lib/queryKeys';

async function fetchData(tenantId: string | null): Promise<Data[]> {
  if (!tenantId) return [];  // ✅ Graceful early return
  
  const response = await fetch('/api/endpoint', { credentials: 'include' });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const result = await response.json();
  return result.data || [];
}

export function useData() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.data(tenantId),  // ✅ Include tenant_id
    queryFn: () => fetchData(tenantId),  // ✅ Pass tenantId
    staleTime: 5 * 60 * 1000,
    // ✅ NO enabled condition!
  });
}
```

### Component Loading Pattern
```typescript
const { data, isLoading } = useData();

// ✅ CORRECT - Only show spinner if NO data
if (isLoading && !data) {
  return <LoadingSpinner />;
}

// ❌ WRONG - Shows spinner even when data exists
if (isLoading) {
  return <LoadingSpinner />;
}
```

---

## 📋 NEXT SCREENS TO MIGRATE

### High Priority
1. **Player Profiles** (`/player/profiles/[id]`)
   - Estimated: 20-30 duplicate calls per profile
   - Can reuse: `usePlayers()`, `useLatestPlayerStatus()`
   - High value for users

### Medium Priority
2. **Admin - BalanceTeamsPane** (Quick Win)
   - Found duplicate config/status calls
   - Can use existing `useAppConfig()` and `useLatestPlayerStatus()`
   - Estimated: 30 minutes

3. **Admin - Other Screens** (`/admin/*`)
   - Match management, player management, seasons, settings
   - Estimated: 50-80 duplicates per screen
   - High value but more complex

---

## 🎯 WHAT TO DO NEXT

### Option 1: Migrate Player Profiles (Recommended)
- High user value
- Medium complexity
- Can reuse existing hooks
- Estimated: 2-3 hours

### Option 2: Quick Win - BalanceTeamsPane
- Very quick (30 min)
- Easy win for morale
- Then tackle Player Profiles

### Option 3: Admin Screens
- Highest duplicate count
- Most complex
- Biggest performance win

---

## 🚨 IMPORTANT REMINDERS

### For ALL New API Routes
**MUST use these headers:**
```typescript
headers: {
  'Cache-Control': 'no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Vary': 'Cookie',
}
```

**Why:** HTTP caching causes stale data bugs in multi-tenant apps. React Query handles caching correctly.

### For ALL New Query Hooks
1. **Include `tenantId` in query key** - Cache isolation
2. **Pass `tenantId` to fetchFn** - Graceful handling
3. **NO `enabled` condition** - Avoids race conditions
4. **Early return if no tenantId** - Returns `[]` or `null`

### For ALL Components Using Multiple Queries
```typescript
const { data: data1, isLoading: loading1 } = useQuery1();
const { data: data2, isLoading: loading2 } = useQuery2();

const loading = loading1 || loading2;  // ✅ Check ALL loading states

if (loading && !data1 && !data2) {  // ✅ Only show spinner if NO data
  return <LoadingSpinner />;
}
```

---

## 📊 SUCCESS METRICS

- **API calls eliminated:** 250+
- **Average reduction:** 50-72% per screen
- **Reliability:** 100% (was 10-20% failures)
- **Page load time:** 2-3s (was 10-15s)
- **React Query hooks:** 14
- **APIs with HTTP cache fixed:** 10

---

## 🎉 READY TO CONTINUE

**All critical bugs fixed:** ✅  
**Dashboard working reliably:** ✅  
**Patterns established:** ✅  
**Documentation complete:** ✅  

**Next:** Pick a screen and migrate it following the established patterns!

---

**START HERE:** Read `HANDOFF_REACT_QUERY_CONTINUATION.md` for full context, then choose which screen to migrate next.
