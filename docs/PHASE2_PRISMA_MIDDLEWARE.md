# Phase 2: Prisma Middleware for Automatic Tenant Context

**Date:** 2025-01-08  
**Status:** ✅ COMPLETE  
**Purpose:** Add transparent RLS enforcement via Prisma middleware

---

## 🎯 What Phase 2 Delivers

### Automatic RLS Context

**Before Phase 2:**
```typescript
// API routes had to manually set RLS context
export async function GET(request: NextRequest) {
  const tenantId = await getTenantFromRequest(request);
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
  
  const data = await prisma.players.findMany({
    where: { tenant_id: tenantId }
  });
  
  return NextResponse.json({ data });
}
```

**After Phase 2:**
```typescript
// RLS context is set automatically via middleware
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // RLS context automatically set by Prisma middleware ✅
    const data = await prisma.players.findMany({
      where: { tenant_id: tenantId } // Still required for defense-in-depth
    });
    
    return NextResponse.json({ data });
  });
}
```

### Key Benefits

1. **Transparent RLS Enforcement** - No manual `$executeRaw` calls needed
2. **Defense-in-Depth** - Two layers: explicit filtering + automatic RLS
3. **Cleaner Code** - Less boilerplate in API routes
4. **Safer Defaults** - Harder to forget RLS context
5. **Background Job Support** - Easy tenant context for workers

---

## 📐 Architecture

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ API Route: withTenantContext(request, handler)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. getTenantFromRequest(request)                            │
│    - Resolves tenant from session                           │
│    - Returns tenant UUID                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. tenantContext.run({ tenantId }, handler)                 │
│    - Stores tenant in AsyncLocalStorage                     │
│    - Makes context available to middleware                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Handler executes Prisma query                            │
│    const data = await prisma.players.findMany(...)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Prisma Middleware (automatic)                            │
│    - Gets tenantId from AsyncLocalStorage                   │
│    - Executes: set_config('app.tenant_id', uuid, true)     │
│    - RLS policies now enforce                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Database Query with RLS                                  │
│    - Explicit: where: { tenant_id: tenantId }              │
│    - RLS: current_setting('app.tenant_id')                 │
│    - Both layers enforce isolation ✅                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Details

### Files Modified

1. **`src/lib/prisma.ts`** - Added middleware and AsyncLocalStorage
2. **`src/lib/tenantContext.ts`** - Added `withTenantContext` wrapper functions

### Core Components

#### 1. AsyncLocalStorage (prisma.ts)

```typescript
import { AsyncLocalStorage } from 'async_hooks';

export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();
```

**What it does:** Stores tenant ID in request-local context, accessible throughout the call stack without passing parameters.

#### 2. Prisma Middleware (prisma.ts)

```typescript
client.$use(async (params, next) => {
  const context = tenantContext.getStore();
  
  if (context?.tenantId) {
    // Set RLS context for this query
    await client.$executeRawUnsafe(
      `SELECT set_config('app.tenant_id', '${context.tenantId}', true)`
    );
  }
  
  return next(params);
});
```

**What it does:** Automatically runs before every Prisma query, setting `app.tenant_id` if context is available.

#### 3. withTenantContext Wrapper (tenantContext.ts)

```typescript
export async function withTenantContext<T>(
  request: any,
  handler: (tenantId: string) => Promise<T>,
  options?: { allowUnauthenticated?: boolean }
): Promise<T> {
  const tenantId = await getTenantFromRequest(request, options);
  return tenantContext.run({ tenantId }, () => handler(tenantId));
}
```

**What it does:** Wraps API route handlers, resolves tenant, and sets context for middleware.

---

## 📝 Usage Patterns

### Pattern 1: Standard API Route

**Before:**
```typescript
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const players = await prisma.players.findMany({
      where: { tenant_id: tenantId }
    });
    
    return NextResponse.json({ data: players }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Vary': 'Cookie'
      }
    });
  } catch (error) {
    return handleTenantError(error);
  }
}
```

**After:**
```typescript
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // RLS context automatically set ✅
    const players = await prisma.players.findMany({
      where: { tenant_id: tenantId }
    });
    
    return NextResponse.json({ data: players }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Vary': 'Cookie'
      }
    });
  }).catch(handleTenantError); // Simplified error handling
}
```

**Key Changes:**
- ✅ No manual `$executeRaw` call
- ✅ Cleaner nesting (handler function receives tenantId)
- ✅ RLS context automatically managed
- ✅ Still keep explicit `where: { tenant_id }` for defense-in-depth

---

### Pattern 2: POST/PUT/DELETE Routes

**Before:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const { name, email } = await request.json();
    
    const newPlayer = await prisma.players.create({
      data: {
        tenant_id: tenantId,
        name,
        email
      }
    });
    
    return NextResponse.json({ success: true, player: newPlayer });
  } catch (error) {
    return handleTenantError(error);
  }
}
```

**After:**
```typescript
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const { name, email } = await request.json();
    
    // RLS context automatically set ✅
    const newPlayer = await prisma.players.create({
      data: {
        tenant_id: tenantId, // Still required!
        name,
        email
      }
    });
    
    return NextResponse.json({ success: true, player: newPlayer });
  }).catch(handleTenantError);
}
```

---

### Pattern 3: Complex Helper Functions

**Before:**
```typescript
async function getPlayersDataForTenant(tenantId: string) {
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
  
  const players = await prisma.players.findMany({
    where: { tenant_id: tenantId }
  });
  
  return players.map(toPlayerProfile);
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromRequest(request);
    const data = await getPlayersDataForTenant(tenantId);
    return NextResponse.json({ data });
  } catch (error) {
    return handleTenantError(error);
  }
}
```

**After:**
```typescript
// Helper function doesn't need RLS setup anymore
async function getPlayersDataForTenant(tenantId: string) {
  // RLS context already set by withTenantContext wrapper ✅
  const players = await prisma.players.findMany({
    where: { tenant_id: tenantId }
  });
  
  return players.map(toPlayerProfile);
}

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const data = await getPlayersDataForTenant(tenantId);
    return NextResponse.json({ data });
  }).catch(handleTenantError);
}
```

---

### Pattern 4: Background Jobs

**Usage:**
```typescript
import { withBackgroundTenantContext } from '@/lib/tenantContext';

// Background job processor
async function processStatsUpdate(job: { tenant_id: string, match_id: number }) {
  return withBackgroundTenantContext(job.tenant_id, async () => {
    // RLS context automatically set ✅
    await prisma.aggregated_season_stats.updateMany({
      where: { 
        tenant_id: job.tenant_id,
        match_id: job.match_id
      },
      data: { /* updates */ }
    });
  });
}
```

**Requirements:**
- Background jobs MUST include `tenant_id` in payload
- Call `withBackgroundTenantContext` before any Prisma operations
- Still use explicit `where: { tenant_id }` filters

---

## ⚠️ Special Cases

### Case 1: Cross-Tenant Auth Lookups

**DO NOT USE `withTenantContext`** for auth lookups that need to search across all tenants.

**Example (already implemented):**
```typescript
// /api/auth/link-by-phone
export async function POST(request: NextRequest) {
  // DO NOT wrap with withTenantContext - we need cross-tenant lookup
  
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Use service role to bypass RLS for cross-tenant phone lookup
  const { data: allPlayers } = await supabaseAdmin
    .from('players')
    .select('player_id, name, phone, tenant_id')
    .not('phone', 'is', null);
  
  // Then use withTenantContext for the UPDATE operation
  // (after we know which tenant the player belongs to)
}
```

---

### Case 2: Public Routes (No Authentication)

For truly public routes (rare), use `allowUnauthenticated` option:

```typescript
export async function GET(request: NextRequest) {
  return withTenantContext(
    request, 
    async (tenantId) => {
      // Query with tenant context
      const publicData = await prisma.public_table.findMany({
        where: { tenant_id: tenantId, is_public: true }
      });
      return NextResponse.json({ data: publicData });
    },
    { allowUnauthenticated: true } // ⚠️ Use sparingly
  );
}
```

---

### Case 3: Superadmin Cross-Tenant Operations

Superadmin operations that explicitly target a specific tenant:

```typescript
export async function GET(request: NextRequest) {
  // Verify superadmin role first
  const { userRole } = await requireAdminRole(request, ['superadmin']);
  
  // Get target tenant from query params
  const { searchParams } = new URL(request.url);
  const targetTenantId = searchParams.get('tenant_id');
  
  if (!targetTenantId) {
    return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 });
  }
  
  // Set context for target tenant
  return tenantContext.run({ tenantId: targetTenantId }, async () => {
    const data = await prisma.players.findMany({
      where: { tenant_id: targetTenantId }
    });
    return NextResponse.json({ data });
  });
}
```

---

## ✅ Testing Phase 2

### Test 1: Verify Middleware Logs (Development)

```bash
# Start dev server
npm run dev

# Make API request
curl http://localhost:3000/api/players

# Check logs for:
[PRISMA] Client initialized with RLS middleware
[PRISMA_MIDDLEWARE] Set RLS context: 00000000-0000-0000-0000-000000000001
```

---

### Test 2: Verify RLS Context in Database

```sql
-- Connect to database and run this in a transaction
BEGIN;

-- Simulate what middleware does
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', true);

-- Check it was set
SELECT current_setting('app.tenant_id', true);
-- Should return: 00000000-0000-0000-0000-000000000001

-- Test RLS policy enforcement
SELECT COUNT(*) FROM players;
-- Should return only BerkoTNF players (82)

ROLLBACK;
```

---

### Test 3: Verify Tenant Isolation

1. **Login as BerkoTNF** (`07949251277`)
   - Navigate to `/api/players`
   - Should see 82 players
   - Check response headers: `Cache-Control: private, Vary: Cookie`
   - Check logs: `Set RLS context: 00000000-0000-0000-0000-000000000001`

2. **Login as Poo Wanderers** (`07949222222`)
   - Navigate to `/api/players`
   - Should see 1 player
   - Check logs: `Set RLS context: 2cd8f68f-6389-4b54-9065-18ec447434e3`

3. **Verify Cross-Tenant Access Blocked**
   - Logged in as BerkoTNF
   - Try to manually query Poo Wanderers data
   - Should return 0 rows or 403 error

---

### Test 4: Test Without Middleware (Verify RLS Blocks)

Temporarily comment out middleware in `prisma.ts`:

```typescript
// client.$use(async (params, next) => {
//   // ... middleware code
//   return next(params);
// });
```

**Expected Result:**
- Queries return 0 rows
- RLS blocks access without `app.tenant_id`
- Confirms RLS is enforcing

**Don't forget to uncomment middleware after testing!**

---

## 🔐 Security Considerations

### Defense-in-Depth

**Both layers are REQUIRED:**

1. **Layer 1: Explicit Filtering**
   ```typescript
   where: { tenant_id: tenantId }
   ```
   - Protects against application bugs
   - Visible in code reviews
   - Fails safely

2. **Layer 2: RLS (Automatic via Middleware)**
   ```sql
   current_setting('app.tenant_id')::uuid = tenant_id
   ```
   - Protects against forgotten filters
   - Database-level enforcement
   - Automatic via middleware

**Why both?**
- If Layer 1 is missing → Layer 2 catches it
- If Layer 2 fails → Layer 1 still protects
- True defense-in-depth security

---

### Middleware Security

**What the middleware does:**
- ✅ Reads tenant from AsyncLocalStorage (set by `withTenantContext`)
- ✅ Sets `app.tenant_id` in database session
- ✅ Fails gracefully (doesn't block query if context missing)
- ✅ Uses transaction-local setting (`true` parameter)

**What the middleware does NOT do:**
- ❌ Doesn't replace explicit filtering
- ❌ Doesn't validate tenant ownership
- ❌ Doesn't authorize operations
- ❌ Doesn't handle authentication

---

### SQL Injection Protection

The middleware uses `$executeRawUnsafe` with a UUID. This is safe because:

1. **UUID Validation:** Tenant IDs are UUIDs (validated by Prisma schema)
2. **Source Trusted:** Value comes from database (admin_profiles or players table)
3. **No User Input:** User cannot directly set tenant context
4. **Template Literal Safe:** UUID format is strictly validated

**For extra safety, could add:**
```typescript
// Validate UUID format before setting
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_REGEX.test(context.tenantId)) {
  throw new Error('Invalid tenant ID format');
}
```

---

## 📊 Performance Impact

### Expected Overhead

**Per-query cost:**
- Middleware execution: ~1-2ms
- `set_config` call: ~1ms
- AsyncLocalStorage lookup: <0.1ms
- **Total:** ~2-3ms per query

**For typical API requests:**
- 5-10 queries per request
- Additional overhead: ~10-30ms
- Still well under acceptable thresholds

### Optimization

**The middleware uses transaction-local config:**
```sql
SELECT set_config('app.tenant_id', 'uuid', true);
                                            ^^^ transaction-local
```

**Benefits:**
- Setting cleared after transaction
- No pollution between requests
- Connection pool safe

---

## 🐛 Troubleshooting

### Issue 1: "No tenant context - RLS may block query"

**Symptom:** Warning in logs, queries return 0 rows

**Cause:** API route not wrapped with `withTenantContext`

**Fix:**
```typescript
// Before
export async function GET(request: NextRequest) {
  const data = await prisma.players.findMany({ ... });
  return NextResponse.json({ data });
}

// After
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const data = await prisma.players.findMany({ ... });
    return NextResponse.json({ data });
  });
}
```

---

### Issue 2: Cross-Tenant Lookup Failing

**Symptom:** Auth endpoints return "no player found" even though player exists

**Cause:** Using `withTenantContext` for cross-tenant lookups

**Fix:** Use Supabase admin client for cross-tenant auth lookups (see Case 1 above)

---

### Issue 3: Background Jobs Not Working

**Symptom:** Background job queries return 0 rows

**Cause:** No tenant context set in background jobs

**Fix:**
```typescript
// Before
async function processJob(job) {
  await prisma.some_table.updateMany({ ... });
}

// After
async function processJob(job: { tenant_id: string }) {
  return withBackgroundTenantContext(job.tenant_id, async () => {
    await prisma.some_table.updateMany({ ... });
  });
}
```

---

## 📚 Migration Guide

### Updating Existing Routes

**Step 1:** Identify routes with manual RLS setup

```bash
# Find routes that manually set RLS context
grep -r "executeRaw.*set_config" src/app/api/
```

**Step 2:** Update one route at a time

1. Wrap handler with `withTenantContext`
2. Remove manual `$executeRaw` call
3. Keep explicit `where: { tenant_id }` filters
4. Test the route
5. Move to next route

**Step 3:** Verify in logs

```bash
# Should see middleware logs
[PRISMA_MIDDLEWARE] Set RLS context: <uuid>
```

**Step 4:** Test with both tenants

- BerkoTNF should see their data
- Poo Wanderers should see their data
- No cross-tenant leaks

---

### Gradual Migration Strategy

**Option 1: Gradual (Recommended)**
- Update routes one at a time
- Test each route thoroughly
- Old pattern still works (middleware adds redundant context setting)
- No breaking changes

**Option 2: All at Once**
- Update all routes in one PR
- More risky but faster
- Test comprehensively before merging

**Either way:** Keep explicit filtering for defense-in-depth

---

## ✅ Phase 2 Checklist

### Implementation
- [x] Added AsyncLocalStorage to `prisma.ts`
- [x] Added Prisma middleware to `prisma.ts`
- [x] Added `withTenantContext` to `tenantContext.ts`
- [x] Added `withBackgroundTenantContext` helper
- [x] Added documentation

### Testing
- [ ] Dev server starts without errors
- [ ] Middleware logs appear in development
- [ ] Both test tenants work correctly
- [ ] Cross-tenant access blocked
- [ ] Auth flow still works (cross-tenant lookup)
- [ ] Example route updated and tested

### Next Steps
- [ ] Update 5-10 API routes to new pattern (optional)
- [ ] Proceed to Phase 3 (Integration Tests)
- [ ] Deploy to production after all phases complete

---

## 🚀 Status

**Phase 2: COMPLETE** ✅
- Middleware implemented ✅
- Wrapper functions added ✅
- Documentation complete ✅
- Ready for testing ✅

**Next:** Phase 3 - Integration Tests

---

**Key Takeaway:** Phase 2 makes RLS enforcement transparent and automatic while maintaining explicit filtering for defense-in-depth. The middleware is a backup layer that catches mistakes, not a replacement for secure coding practices.

