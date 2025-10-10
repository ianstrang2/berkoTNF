# 🔧 Fix Prisma RLS Connection Pooling Issue

## The Problem

My Next.js multi-tenant app uses Prisma with PostgreSQL Row Level Security (RLS). **Prisma queries return 0 rows even though data exists in the database.**

**Evidence:**
```sql
-- Direct SQL: Returns 31 rows ✅
SELECT COUNT(*) FROM aggregated_season_stats 
WHERE tenant_id='00000000-0000-0000-0000-000000000001';

-- Prisma query: Returns 0 rows ❌
prisma.aggregated_season_stats.findMany({
  where: { tenant_id: '00000000-0000-0000-0000-000000000001' }
})
```

**Root Cause:** Connection pooling causes stale RLS context. Prisma middleware sets `app.tenant_id` once per AsyncLocalStorage context, but connections get reused with wrong/stale context.

---

## Current Middleware (Broken)

**File:** `src/lib/prisma.ts`

```typescript
client.$use(async (params, next) => {
  const context = tenantContext.getStore();
  
  if (context?.tenantId) {
    if (!(context as any)._rlsContextSet) {  // ❌ Checks AsyncLocalStorage, not connection
      await client.$executeRawUnsafe(
        `SELECT set_config('app.tenant_id', '${context.tenantId}', false)`
      );
      (context as any)._rlsContextSet = true;
    }
  }
  
  return next(params);
});
```

**The bug:** `_rlsContextSet` is on AsyncLocalStorage context, but `app.tenant_id` is on database connection. Different lifecycles!

---

## What We Tried (All Caused 500 Errors)

1. ❌ Remove `_rlsContextSet` check → Infinite recursion
2. ❌ Use `true` parameter (transaction-local) → 500 errors  
3. ❌ Use WeakSet to track contexts → 500 errors
4. ❌ Skip executeRaw actions → 500 errors

**All attempts reverted** - back to original middleware

---

## Recommended Solution

### Option 1: Prisma Interactive Transactions (Try This First)

Wrap queries in `$transaction` to guarantee RLS and query on same connection:

```typescript
async function getHalfSeasonStats(tenantId: string) {
  return prisma.$transaction(async (tx) => {
    // Set RLS within transaction
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.tenant_id', '${tenantId}', false)`
    );
    
    // Query within same transaction/connection
    const data = await tx.aggregated_half_season_stats.findMany({
      where: { tenant_id: tenantId }
    });
    
    return data;
  });
}
```

**Test this in:**
- `src/app/api/stats/half-season/route.ts` (line ~18)
- `src/app/api/stats/route.ts` (line ~18)
- `src/app/api/matchReport/route.ts` (line ~370)

### Option 2: If Transactions Work
Create helper:
```typescript
export async function queryWithRLS<T>(
  tenantId: string,
  queryFn: (tx: any) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', '${tenantId}', false)`);
    return queryFn(tx);
  });
}
```

---

## Testing

**After applying fix:**
1. Hard refresh Dashboard (`Ctrl+Shift+R`)
2. Check: All 4 components show data?
3. Navigate to Table/Half Season
4. Check: Shows data?
5. Navigate to Table/Whole Season
6. Check: Shows data?
7. Navigate to Superadmin → Back to Player
8. Check: Still works?

**Success criteria:**
- ✅ No 500 errors
- ✅ No startup hanging
- ✅ Consistent data loading (not intermittent)
- ✅ All screens work

---

## Key Files

- `src/lib/prisma.ts` - Prisma middleware (THE PROBLEM)
- `src/lib/tenantContext.ts` - Tenant resolution
- `src/app/api/stats/half-season/route.ts` - Half season stats
- `src/app/api/stats/route.ts` - Full season stats
- `src/app/api/matchReport/route.ts` - Match report
- `HANDOFF_RLS_ISSUE.md` - Full technical details

---

## Side Issue

**App hangs on startup** until `Ctrl+C` is pressed, then works normally.

**Likely related to:** Prisma connection initialization or middleware blocking

**Investigate:** Why is first connection hanging?

---

**GOAL:** Fix Prisma middleware or use transactions to ensure RLS is set correctly for every query without 500 errors.

**READ:** `HANDOFF_RLS_ISSUE.md` for complete technical details.

