# 🚀 New Cursor Session - RLS Refactor & Performance Completion

## Context from Previous Session

**Project:** Multi-tenant SaaS app (BerkoTNF) using Next.js + Prisma + PostgreSQL with RLS

**What We Accomplished:**
- ✅ Fixed RLS on 15 aggregated tables (disabled RLS, added `withTenantFilter()`)
- ✅ Optimized 6/7 user-facing screens with React Query (85% speed improvement)
- ✅ Created 28 query/mutation hooks
- ✅ Eliminated 300+ duplicate API requests

**Current Blocker:**
- 🚨 **RLS + connection pooling** causes 0-row queries on core tables
- `upcoming_matches` table returns 0 rows despite explicit `WHERE tenant_id = ...`
- **Proof:** Server logs show `[UPCOMING_MATCHES] Found 0 total matches` (data exists in DB)
- **Root cause:** Middleware sets RLS on Connection A, query runs on Connection B without RLS

**Impact:**
- Matches page shows "no active matches" until hard refresh
- Tenant switching unreliable (requires `Ctrl+Shift+R`)
- Same issue likely affects other core tables

---

## 🎯 IMMEDIATE TASK

### Step 1: Execute Pending SQL Migration

**File:** `DISABLE_RLS_UPCOMING_MATCHES.sql`

```sql
ALTER TABLE upcoming_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_match_players DISABLE ROW LEVEL SECURITY;
```

**Action:** Run in Supabase SQL Editor, then test if Matches page loads without hard refresh.

### Step 2: Audit All RLS-Enabled Tables

**Run in Supabase:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
  AND tablename NOT LIKE 'auth%'
  AND tablename NOT LIKE 'aggregated_%'
ORDER BY tablename;
```

**Categorize:**
- **Keep RLS:** Auth tables, `tenants`, security-critical
- **Disable RLS:** Operational tables queried by application

### Step 3: Disable RLS on Operational Tables

**Generate SQL for remaining tables:**
```sql
-- Disable RLS on operational tables
ALTER TABLE match_player_pool DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE seasons DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_config DISABLE ROW LEVEL SECURITY;
-- etc. (based on audit results)
```

### Step 4: Verify All Queries Use `withTenantFilter()`

**Search for queries to affected tables:**
```bash
grep -r "prisma.upcoming_matches" src/app/api --include="*.ts"
grep -r "prisma.match_player_pool" src/app/api --include="*.ts"
grep -r "prisma.team_slots" src/app/api --include="*.ts"
```

**Ensure all use:**
```typescript
import { withTenantFilter } from '@/lib/tenantFilter';

const data = await prisma.upcoming_matches.findMany({
  where: withTenantFilter(tenantId, { ...additionalFilters })
});
```

### Step 5: Update Coding Standards

**File:** `.cursor/rules/code-generation.mdc`

Add comprehensive section documenting:
- Which tables have RLS enabled vs disabled
- Mandatory `withTenantFilter()` usage
- No `include` from RLS-disabled to RLS-enabled tables
- Connection pooling considerations

### Step 6: Test Tenant Switching

**After SQL changes:**
1. Restart dev server
2. Superadmin → View as Admin (BerkoTNF)
3. Check: Matches, Players, Seasons all load **without hard refresh**
4. Switch tenants multiple times
5. Verify: No empty screens, no stale data

---

## 🎯 SECONDARY TASKS (After RLS Fixed)

### Complete Match Control Center Optimization
- **Current:** 60 requests, 66 seconds
- **Target:** ~50 requests, 5-10 seconds
- **Status:** Hooks created, 4/5 components updated
- **Remaining:** Test and verify performance

### Optional: Admin Screens Polish
- Players Manager - Already optimized
- Seasons Manager - Already optimized
- Setup/Config - Already fast (1.90s)

---

## 📂 KEY FILES REFERENCE

### Created This Session
- `src/lib/tenantFilter.ts` - Type-safe helper ✅
- `src/hooks/queries/` - 28 hooks created ✅
- `DISABLE_RLS_AGGREGATED_TABLES.sql` - ✅ Executed
- `DISABLE_RLS_UPCOMING_MATCHES.sql` - ⚠️ **Execute this first!**

### Modified This Session  
- 13 API routes (aggregated tables)
- 19+ components (React Query migration)
- `src/lib/queryKeys.ts` (50+ query keys)
- `.cursor/rules/code-generation.mdc` (security patterns)
- `src/components/layout/ProfileDropdown.component.tsx` (cache clearing)

### Need Attention
- `src/app/api/admin/upcoming-matches/route.ts` - Uses `withTenantFilter()` ✅
- Other routes using `upcoming_matches`, `match_player_pool`, `team_slots`
- Any route querying core tables with RLS enabled

---

## 🔍 DEBUGGING INFO

### Server Logs Show The Problem
```
[UPCOMING_MATCHES] Fetching all matches for tenant 00000000-...
[TENANT_FILTER] ✅ Tenant filter applied: 00000000-...
prisma.upcoming_matches.findMany({ where: { tenant_id: "00000000-..." } })
[UPCOMING_MATCHES] Found 0 total matches  ← RLS blocking despite explicit filter!
```

### Database Confirms Data Exists
```sql
SELECT * FROM upcoming_matches 
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
AND state != 'Completed';
-- Returns: 1 row (match_id 741, state 'Draft')
```

### RLS Policy is Active
```sql
tenant_id = current_setting('app.tenant_id', true)::uuid
```

**Conclusion:** Middleware sets RLS on one connection, query runs on different connection → RLS blocks → 0 rows.

---

## ✅ RECOMMENDED APPROACH

### Phase 1: Quick Fix (Immediate)
1. Execute `DISABLE_RLS_UPCOMING_MATCHES.sql`
2. Test if Matches page works without hard refresh
3. If yes, proceed to Phase 2

### Phase 2: Systematic RLS Refactor
1. Audit all RLS-enabled tables
2. Categorize: Security vs Operational
3. Disable RLS on all operational tables
4. Verify `withTenantFilter()` usage on all affected routes
5. Update coding standards document

### Phase 3: Final Testing
1. Tenant switching works smoothly
2. All screens load without hard refresh
3. No 0-row query issues
4. Performance remains excellent
5. Security model documented and enforced

---

## 🎯 SUCCESS CRITERIA

**When complete, you should have:**
- ✅ Tenant switching works 100% reliably (no hard refresh needed)
- ✅ All screens load in under 6 seconds
- ✅ Zero duplicate API requests
- ✅ Clear security model: RLS on auth tables, explicit filtering on operational tables
- ✅ Type-safe `withTenantFilter()` prevents security bugs
- ✅ Updated coding standards for future development

---

## 📊 PERFORMANCE METRICS (Current)

| Screen | Status | Performance |
|--------|--------|-------------|
| Dashboard | ✅ Complete | 1.59s (was 10-15s) |
| Player Profiles | ✅ Complete | 5.10s (was 96s!) |
| Tables | ✅ Complete | 1.90s (was 10-15s) |
| Records | ✅ Complete | 1.90s |
| Upcoming | ✅ Complete | 1.49s |
| Admin Matches List | ✅ Complete | 2.41s (was 6.45s) |
| Admin Players | ✅ Complete | 1.59s |
| Admin Seasons | ✅ Complete | 1.60s → pending retest |
| **Match Control** | ⚠️ Pending | Target: 5-10s (was 66s) |

---

## 🚀 START HERE (Next Window)

**First action:**
```
Execute DISABLE_RLS_UPCOMING_MATCHES.sql in Supabase SQL Editor
```

**Then:**
1. Test Matches page - should work without hard refresh
2. Audit remaining RLS tables
3. Disable RLS on other operational tables
4. Verify/fix all queries use `withTenantFilter()`
5. Complete Match Control Center optimization
6. Final testing and documentation

---

**You're 85% done! Just need to finish the RLS refactor systematically.** 🎯

