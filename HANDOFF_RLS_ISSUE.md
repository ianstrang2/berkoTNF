# 🚨 CRITICAL: Prisma RLS + Connection Pooling Issue

## Executive Summary

**Problem:** Aggregated tables return 0 rows via Prisma even though data exists in database (confirmed via direct SQL).

**Root Cause:** Prisma middleware sets RLS context via `set_config('app.tenant_id', '...', false)` but connection pooling causes stale RLS. Some queries execute on connections without correct RLS set, getting blocked by RLS policies.

**Status:** App loads but shows "No Data" intermittently on Dashboard and Table pages. Records page works (doesn't use aggregated tables).

---

## 🎯 What We Fixed Today (KEEP THESE)

### 1. HTTP Cache Headers - Prevents Stale Cached Responses ✅

**Problem:** Browser was caching API responses for 5 minutes with empty/wrong data

**Solution:** Changed 14 API routes to use:
```typescript
headers: {
  'Cache-Control': 'no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Vary': 'Cookie',
}
```

**Files Fixed:**
- `src/app/api/matchReport/route.ts`
- `src/app/api/players/route.ts`
- `src/app/api/personal-bests/route.ts`
- `src/app/api/admin/app-config/route.ts`
- `src/app/api/latest-player-status/route.ts`
- `src/app/api/allTimeStats/route.ts`
- `src/app/api/honourroll/route.ts`
- `src/app/api/seasons/route.ts`
- `src/app/api/seasons/current/route.ts`
- `src/app/api/stats/league-averages/route.ts`
- `src/app/api/stats/route.ts`
- `src/app/api/stats/half-season/route.ts`

**Result:** This helped but didn't fully solve the issue

### 2. Infinite Loop Fix - useAuth Stability ✅

**Problem:** `useAuth()` returning new object every render, causing `/api/profile` to be called 67 times/minute

**Solution:** Wrapped return in `useMemo`, functions in `useCallback`

**File:** `src/hooks/useAuth.hook.ts`

**Result:** No more infinite loops

### 3. Component Loading Logic ✅

**Problem:** Components showing spinner even when cached data available

**Solution:** Changed to `if (loading && !data)` pattern

**Files:** 
- `src/components/dashboard/CurrentForm.component.tsx`
- `src/components/dashboard/Milestones.component.tsx`

**Result:** Better UX with stale-while-revalidate

### 4. Upcoming Matches Migration ✅

**New hooks:** 3 React Query hooks created
- `src/hooks/queries/useUpcomingMatches.hook.ts`
- `src/hooks/queries/useUpcomingMatchDetails.hook.ts`
- `src/hooks/queries/useLatestPlayerStatus.hook.ts`

**Result:** 57% reduction in API calls

### 5. Layouts Simplified ✅

**Removed blocking loading gates** from:
- `src/app/player/layout.tsx` - Simple passthrough
- `src/app/admin/layout.tsx` - Simple wrapper

**Result:** Faster perceived load time

### 6. Coding Standards Updated ✅

**Added HTTP cache rule** to `.cursor/rules/code-generation.mdc` (MANDATORY for new APIs)

---

## 🔥 The Current Problem

### Evidence

**Server Logs Show:**
```
[HALF-SEASON] aggregated_half_season_stats query: 135ms (0 rows)
[FULL-SEASON] aggregated_season_stats query: 103ms (0 rows)
```

**But Direct SQL Shows:**
```sql
SELECT COUNT(*) FROM aggregated_half_season_stats 
WHERE tenant_id='00000000-0000-0000-0000-000000000001'
-- Returns: 28 rows ✅

SELECT COUNT(*) FROM aggregated_season_stats
WHERE tenant_id='00000000-0000-0000-0000-000000000001' 
AND season_start_date='2025-01-01'
-- Returns: 31 rows ✅
```

**RLS Policy on aggregated_season_stats:**
```sql
WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
```

### Why This Happens

**Connection Pooling Flow:**
```
Request 1: /api/stats/half-season
  ↓
Gets Connection #1 from pool
  ↓
Middleware sets: app.tenant_id = '00000000...' 
  ↓
Marks AsyncLocalStorage context: _rlsContextSet = true
  ↓
Query runs successfully
  ↓
Connection #1 returned to pool

Request 2: /api/stats/route (whole season)
  ↓
Gets Connection #1 from pool (REUSED!)
  ↓
Middleware checks: _rlsContextSet flag
  ↓
Flag says "already set" (from Request 1's AsyncLocalStorage)
  ↓
SKIPS setting RLS
  ↓
Connection still has app.tenant_id = '00000000...' (correct by luck)

Request 3: After /superadmin/tenants (queries both tenants)
  ↓
Gets Connection #1 from pool
  ↓
Last tenant queried: '2cd8f68f...' (wrong!)
  ↓
Connection has: app.tenant_id = '2cd8f68f...'
  ↓
Request 4 uses this connection → Wrong tenant → 0 rows!
```

**The bug:** `_rlsContextSet` is on AsyncLocalStorage context, but `app.tenant_id` is on database connection. Different lifecycles!

---

## ❌ What We Tried (All Failed)

### Attempt 1: Remove _rlsContextSet Optimization
```typescript
// Tried: Always set RLS, don't check _rlsContextSet flag
if (context?.tenantId) {
  await client.$executeRawUnsafe(`SELECT set_config(...)`);
}
```
**Result:** ❌ Caused infinite recursion → 500 errors

### Attempt 2: Use Transaction-Local RLS
```typescript
SELECT set_config('app.tenant_id', '...', true)  // true = transaction-local
```
**Result:** ❌ Still caused 500 errors

### Attempt 3: Use WeakSet to Track Contexts
```typescript
let contextSetForRequest = new WeakSet();
if (!contextSetForRequest.has(context)) { ... }
```
**Result:** ❌ Caused 500 errors

### Attempt 4: Skip executeRaw Actions
```typescript
if (context?.tenantId && params.action !== 'executeRaw') { ... }
```
**Result:** ❌ Still caused 500 errors

**All attempts reverted** - back to original middleware

---

## 🎯 Current Workaround (Temporary)

Added explicit `set_config` calls at the start of functions querying aggregated tables:

**Files:**
- `src/app/api/matchReport/route.ts` - Line ~398
- `src/app/api/stats/route.ts` - Line ~23
- `src/app/api/stats/half-season/route.ts` - Line ~24

```typescript
await prisma.$executeRawUnsafe(`SELECT set_config('app.tenant_id', '${tenantId}', false)`);
```

**This works** but is NOT the right solution - it's a band-aid.

---

## 🚨 Side Effect: App Hangs on Startup

**Symptom:** When loading any page, server hangs until `Ctrl+C` is pressed, then works normally

**Likely Cause:** Prisma connection initialization or middleware issue

**Workaround:** Press `Ctrl+C` to interrupt, then page loads

**Needs Investigation:**
- Is Prisma waiting for something on startup?
- Is middleware blocking first connection?
- Connection pool initialization issue?

---

## 💡 Potential Solutions (Not Yet Tried)

### Option 1: Use Prisma Interactive Transactions
```typescript
await prisma.$transaction(async (tx) => {
  await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', '${tenantId}', false)`);
  const data = await tx.aggregated_season_stats.findMany({ ... });
  return data;
});
```

**Pros:** Guarantees RLS and query on same connection  
**Cons:** Adds transaction overhead to every query

### Option 2: Disable RLS on Aggregated Tables (DANGEROUS)
```sql
ALTER TABLE aggregated_season_stats DISABLE ROW LEVEL SECURITY;
```

**Pros:** Removes RLS interference  
**Cons:** Relies 100% on explicit `where: { tenant_id }` - security risk

### Option 3: Use Supabase Client Instead of Prisma
```typescript
const { data } = await supabase
  .from('aggregated_season_stats')
  .select('*')
  .eq('tenant_id', tenantId);
```

**Pros:** Supabase handles RLS correctly  
**Cons:** Lose Prisma type safety and transformations

### Option 4: Fix Middleware with Connection-Level Tracking
Track which **connections** have RLS set, not which AsyncLocalStorage contexts:
```typescript
const connectionsWithRLS = new WeakMap<any, string>();
// Track connection object + tenant ID
```

**Pros:** Addresses root cause  
**Cons:** No easy way to get connection object from Prisma query

---

## 📂 Key Files

### Core Infrastructure
- `src/lib/prisma.ts` - Prisma client + RLS middleware (THE PROBLEM)
- `src/lib/tenantContext.ts` - `withTenantContext` wrapper, tenant resolution
- `src/lib/queryKeys.ts` - React Query keys (all include tenantId)

### Problematic APIs (Return 0 rows)
- `src/app/api/matchReport/route.ts` - Uses aggregated_match_report
- `src/app/api/stats/route.ts` - Uses aggregated_season_stats
- `src/app/api/stats/half-season/route.ts` - Uses aggregated_half_season_stats

### Working APIs (No issues)
- `src/app/api/players/route.ts` - Direct table, no RLS issues
- `src/app/api/allTimeStats/route.ts` - Works fine
- `src/app/api/honourroll/route.ts` - Works fine

---

## 🔬 Debugging Steps

### 1. Check RLS Context in Database
```sql
-- In Supabase SQL editor or via MCP:
SELECT current_setting('app.tenant_id', true) as current_tenant;
```

Should return `00000000-0000-0000-0000-000000000001` when query runs

### 2. Check RLS Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'aggregated_season_stats';
```

Policy uses: `tenant_id = current_setting('app.tenant_id', true)::uuid`

### 3. Test Query With and Without RLS
```sql
-- This should work (direct query):
SELECT COUNT(*) FROM aggregated_season_stats WHERE tenant_id='00000000...';

-- This might fail if RLS not set:
-- (Simulate what Prisma does with RLS enabled)
```

### 4. Check Prisma Middleware Logs
Server logs show:
```
[PRISMA_MIDDLEWARE] Set RLS context once: 00000000... (Xms)
```

If this appears BEFORE every aggregated table query → middleware working  
If this is missing before failed queries → middleware not firing

---

## 🎯 Recommended Approach

### Step 1: Test Interactive Transactions
Try wrapping aggregated queries in `$transaction` to see if it solves the issue.

### Step 2: If Transactions Work
Implement helper function:
```typescript
async function queryWithRLS<T>(
  tenantId: string,
  queryFn: (tx: any) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', '${tenantId}', false)`);
    return queryFn(tx);
  });
}
```

### Step 3: If Transactions Don't Work
Consider disabling RLS on aggregated tables (they're populated by trusted background jobs anyway) and rely on explicit filtering.

---

## 📊 Testing Checklist

After any fix:
- [ ] Dashboard shows all 4 components with data
- [ ] Table/Half Season shows data
- [ ] Table/Whole Season shows data
- [ ] Records page still works
- [ ] No 500 errors
- [ ] No hanging on startup
- [ ] Tenant switching works (superadmin)
- [ ] Navigate between pages doesn't break data

---

## 🚀 Current Workaround in Code

**Explicit RLS calls added to:**
- Line ~398 in `src/app/api/matchReport/route.ts`
- Line ~23 in `src/app/api/stats/route.ts`  
- Line ~24 in `src/app/api/stats/half-season/route.ts`

These can be removed once proper middleware solution is found.

---

## 📝 Additional Context

### Tenant IDs in Use
- `00000000-0000-0000-0000-000000000001` - BerkoTNF (primary/test tenant)
- `2cd8f68f-6389-4b54-9065-18ec447434e3` - Second tenant (minimal data)

### React Query Migration Progress
- ✅ 4 of ~5-7 screens migrated (Dashboard, Table, Records, Upcoming)
- ✅ 14 query hooks created
- ✅ 250+ duplicate API calls eliminated
- 📋 Remaining: Player Profiles, Admin screens

### Performance Notes
- HTTP cache fix improved reliability significantly
- Main issue now is RLS/connection pooling, not caching
- App is usable but intermittent

---

**GOAL:** Fix Prisma middleware to correctly set RLS on every query without causing 500 errors or infinite recursion.

**START HERE:** Try Option 1 (Interactive Transactions) first - it's the cleanest solution.

