# Phase 2 Example: Updating API Routes

This document shows concrete before/after examples for updating API routes to use Phase 2 middleware.

---

## Example 1: GET /api/players

### Before Phase 2

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerProfile } from '@/lib/transform/player.transform';
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

async function getPlayersDataForTenant(tenantId: string) {
  console.log(`Fetching fresh players data from DB for tenant ${tenantId}`);
  
  // ❌ Manual RLS context setting (Phase 1)
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
  
  const playersFromDb = await prisma.players.findMany({
    where: { tenant_id: tenantId },
    orderBy: { name: 'asc' }
  });

  return playersFromDb.map(toPlayerProfile);
}

export async function GET(request: NextRequest) {
  try {
    // Manual tenant resolution
    const tenantId = await getTenantFromRequest(request);
    const transformedPlayers = await getPlayersDataForTenant(tenantId);

    return NextResponse.json({
      data: transformedPlayers
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Vary': 'Cookie',
      }
    });
  } catch (error) {
    return handleTenantError(error);
  }
}
```

### After Phase 2

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerProfile } from '@/lib/transform/player.transform';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

async function getPlayersDataForTenant(tenantId: string) {
  console.log(`Fetching fresh players data from DB for tenant ${tenantId}`);
  
  // ✅ No manual RLS setup needed - middleware handles it automatically
  
  const playersFromDb = await prisma.players.findMany({
    where: { tenant_id: tenantId }, // Still required for defense-in-depth!
    orderBy: { name: 'asc' }
  });

  return playersFromDb.map(toPlayerProfile);
}

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // ✅ RLS context automatically set by middleware
    const transformedPlayers = await getPlayersDataForTenant(tenantId);

    return NextResponse.json({
      data: transformedPlayers
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Vary': 'Cookie',
      }
    });
  }).catch(handleTenantError); // Simplified error handling
}
```

### Key Changes

- ✅ **Removed:** Manual `$executeRaw` RLS setup
- ✅ **Added:** `withTenantContext` wrapper
- ✅ **Kept:** Explicit `where: { tenant_id }` filtering
- ✅ **Cleaner:** Error handling with `.catch()`

---

## Example 2: POST /api/admin/players (Create Player)

### Before Phase 2

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    // Manual tenant resolution
    const tenantId = await getTenantFromRequest(request);
    
    // ❌ Manual RLS context setting
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const { name, email, phone } = await request.json();
    
    // Validate inputs
    if (!name || name.length > 14) {
      return NextResponse.json(
        { error: 'Invalid name' },
        { status: 400 }
      );
    }
    
    // Create player
    const newPlayer = await prisma.players.create({
      data: {
        tenant_id: tenantId,
        name,
        email,
        phone,
        is_retired: false,
        is_ringer: false
      }
    });
    
    return NextResponse.json({
      success: true,
      player: newPlayer
    });
  } catch (error) {
    return handleTenantError(error);
  }
}
```

### After Phase 2

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // ✅ RLS context automatically set
    
    const { name, email, phone } = await request.json();
    
    // Validate inputs
    if (!name || name.length > 14) {
      return NextResponse.json(
        { error: 'Invalid name' },
        { status: 400 }
      );
    }
    
    // Create player
    const newPlayer = await prisma.players.create({
      data: {
        tenant_id: tenantId, // Still required!
        name,
        email,
        phone,
        is_retired: false,
        is_ringer: false
      }
    });
    
    return NextResponse.json({
      success: true,
      player: newPlayer
    });
  }).catch(handleTenantError);
}
```

---

## Example 3: Complex Query with Multiple Operations

### Before Phase 2

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromRequest(request);
    
    // ❌ Manual RLS context setting
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    // Multiple queries in sequence
    const players = await prisma.players.findMany({
      where: { tenant_id: tenantId, is_retired: false }
    });
    
    const matches = await prisma.matches.findMany({
      where: { tenant_id: tenantId },
      orderBy: { match_date: 'desc' },
      take: 10
    });
    
    const stats = await prisma.aggregated_season_stats.findMany({
      where: { tenant_id: tenantId }
    });
    
    return NextResponse.json({
      players,
      matches,
      stats
    });
  } catch (error) {
    return handleTenantError(error);
  }
}
```

### After Phase 2

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // ✅ RLS context set once, applies to all queries
    
    // Multiple queries - all automatically have RLS context
    const players = await prisma.players.findMany({
      where: { tenant_id: tenantId, is_retired: false }
    });
    
    const matches = await prisma.matches.findMany({
      where: { tenant_id: tenantId },
      orderBy: { match_date: 'desc' },
      take: 10
    });
    
    const stats = await prisma.aggregated_season_stats.findMany({
      where: { tenant_id: tenantId }
    });
    
    return NextResponse.json({
      players,
      matches,
      stats
    });
  }).catch(handleTenantError);
}
```

**Benefit:** One `withTenantContext` call sets context for ALL queries in the handler.

---

## Example 4: Public Route (No Auth Required)

### Before Phase 2

```typescript
export async function GET(request: NextRequest) {
  try {
    // No tenant resolution for public route
    const { slug } = await request.json();
    
    const club = await prisma.tenants.findUnique({
      where: { slug },
      select: { tenant_id: true, name: true, club_code: true }
    });
    
    return NextResponse.json({ club });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to find club' },
      { status: 500 }
    );
  }
}
```

### After Phase 2

```typescript
export async function GET(request: NextRequest) {
  // ✅ No withTenantContext needed for truly public routes
  // Public routes that don't access tenant-scoped data can skip the wrapper
  
  const { slug } = await request.json();
  
  const club = await prisma.tenants.findUnique({
    where: { slug },
    select: { tenant_id: true, name: true, club_code: true }
  });
  
  return NextResponse.json({ club });
}
```

**Note:** Public routes that DON'T access tenant-scoped tables can skip `withTenantContext`.

---

## Example 5: Background Job

### Before Phase 2

```typescript
// worker/src/jobs/update-stats.ts
import { prisma } from '@/lib/prisma';

interface StatsJob {
  tenant_id: string;
  match_id: number;
}

export async function processStatsUpdate(job: StatsJob) {
  // ❌ No way to set RLS context in background jobs
  
  // Would fail or return 0 rows due to RLS
  await prisma.aggregated_season_stats.updateMany({
    where: {
      tenant_id: job.tenant_id,
      match_id: job.match_id
    },
    data: { /* updates */ }
  });
}
```

### After Phase 2

```typescript
// worker/src/jobs/update-stats.ts
import { prisma } from '@/lib/prisma';
import { withBackgroundTenantContext } from '@/lib/tenantContext';

interface StatsJob {
  tenant_id: string;
  match_id: number;
}

export async function processStatsUpdate(job: StatsJob) {
  // ✅ Set tenant context for background job
  return withBackgroundTenantContext(job.tenant_id, async () => {
    // RLS context automatically set
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
- Jobs MUST include `tenant_id` in payload
- Use `withBackgroundTenantContext` wrapper
- Still use explicit tenant filtering

---

## Migration Checklist for Each Route

### Step 1: Identify Routes to Update

```bash
# Find routes with manual RLS setup
grep -r "executeRaw.*set_config" src/app/api/

# Results will look like:
# src/app/api/players/route.ts:  await prisma.$executeRaw`SELECT set_config...`
```

### Step 2: Update One Route

- [ ] Import `withTenantContext` from `@/lib/tenantContext`
- [ ] Wrap handler with `withTenantContext(request, async (tenantId) => { ... })`
- [ ] Remove manual `$executeRaw` RLS setup
- [ ] Keep explicit `where: { tenant_id }` filters
- [ ] Update error handling to `.catch(handleTenantError)`

### Step 3: Test the Route

```bash
# Start dev server
npm run dev

# Test the updated route
curl http://localhost:3000/api/[your-route]

# Check logs for:
[PRISMA_MIDDLEWARE] Set RLS context: <uuid>
```

### Step 4: Verify Tenant Isolation

- [ ] Login as BerkoTNF → Test route → See BerkoTNF data only
- [ ] Login as Poo Wanderers → Test route → See Poo Wanderers data only
- [ ] Verify no cross-tenant data visible

### Step 5: Move to Next Route

Repeat for each route found in Step 1.

---

## Common Patterns Summary

| Route Type | Pattern | Keep Explicit Filter? | Use withTenantContext? |
|------------|---------|----------------------|----------------------|
| Standard API | Read/Write tenant data | ✅ YES | ✅ YES |
| Cross-tenant auth | Auth lookup | ✅ YES (after resolution) | ❌ NO (use service role) |
| Public route | No tenant data | N/A | ❌ NO |
| Background job | Process tenant data | ✅ YES | ✅ YES (use withBackgroundTenantContext) |
| Superadmin | Specific tenant | ✅ YES | ⚠️ MANUAL (use tenantContext.run) |

---

## Quick Reference

### Import Statements

```typescript
// For standard API routes
import { withTenantContext } from '@/lib/tenantContext';

// For background jobs
import { withBackgroundTenantContext } from '@/lib/tenantContext';

// Error handling
import { handleTenantError } from '@/lib/api-helpers';
```

### Standard Pattern

```typescript
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const data = await prisma.table.findMany({
      where: { tenant_id: tenantId }
    });
    return NextResponse.json({ data });
  }).catch(handleTenantError);
}
```

### Background Job Pattern

```typescript
export async function processJob(job: { tenant_id: string }) {
  return withBackgroundTenantContext(job.tenant_id, async () => {
    await prisma.table.updateMany({ /* ... */ });
  });
}
```

---

**Status:** Examples complete ✅  
**Next:** Update routes gradually, test thoroughly, proceed to Phase 3

