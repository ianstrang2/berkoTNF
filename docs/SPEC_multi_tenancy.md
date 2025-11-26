# Capo Multi-Tenancy Specification

**Version:** 2.1.0  
**Last Updated:** November 26, 2025  
**Status:** ✅ Production Complete (October 2025)

**🔄 For Implementation History:** See `ARCHIVE_multi_tenancy_implementation.md` for Phases 0-3 details

---

## Executive Summary

### Current Architecture (Production)

**Multi-tenancy foundation:** ✅ Complete and operational

**Key Components:**
- 33 tables with `tenant_id` fields and foreign keys
- Application-level tenant filtering (`withTenantFilter()` helper)
- Tenant context resolution via `withTenantContext()` wrapper
- Tenant-aware advisory locks
- Background job tenant propagation

### Why Multi-Tenancy

Required for:
- **RSVP System:** Token uniqueness per tenant
- **Activity Feeds:** Isolated per tenant
- **Push Notifications:** Tenant-scoped ledgers
- **Advisory Locks:** Tenant-aware match locking
- **Background Jobs:** Tenant context propagation
- **Data Isolation:** Complete separation for compliance

### Design Principles

1. **Vendor-Agnostic:** Works with any PostgreSQL database
2. **Pragmatic:** Application-level filtering (not RLS-dependent)
3. **Type-Safe:** Compile-time enforcement via TypeScript
4. **Explicit:** Tenant filtering visible in code (auditable)
5. **Zero-Downtime:** Migrations designed for minimal disruption

---

## Current Architecture

### Tenant Model

**What is a Tenant:** A club/organization using Capo

**Identifier:** UUID (`tenant_id`)

**Storage:** `tenants` table
```sql
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,        -- URL-friendly (e.g., "berko-tnf")
    name VARCHAR(255) NOT NULL,              -- Display name
    club_code VARCHAR(5) UNIQUE NOT NULL,    -- Join code (e.g., "FC247")
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb
);
```

**Default Tenant:** `00000000-0000-0000-0000-000000000001` (Berko TNF)

### Tenant Context Propagation

**Flow:**
```
Request → withTenantContext → tenantId → withTenantFilter → Prisma → Database
```

**API Route Pattern (MANDATORY):**
```typescript
import { withTenantContext } from '@/lib/tenantContext';
import { withTenantFilter } from '@/lib/tenantFilter';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // Tenant context automatically set
    
    const data = await prisma.players.findMany({
      where: withTenantFilter(tenantId, { is_retired: false })
    });
    
    return NextResponse.json({ success: true, data });
  });
}
```

### Tenant Resolution Contexts

**Admin routes:** From authenticated session (`players.tenant_id` via `auth_user_id`)  
**Public RSVP routes:** From invite token lookup  
**Background workers:** From job payload  
**Superadmin:** Optional tenant override cookie

### Tenant-Aware Advisory Locks

**Implementation:** PostgreSQL advisory locks with tenant-specific keys

```typescript
import { withTenantMatchLock } from '@/lib/tenantLocks';

// Tenant-scoped lock (prevents cross-tenant interference)
await withTenantMatchLock(tenantId, matchId, async () => {
  // Atomic operations within tenant scope
  await prisma.upcoming_matches.update({
    where: { upcoming_match_id: matchId },
    data: { state: 'TeamsBalanced' }
  });
});
```

**Lock Key Generation:**
```typescript
function hashString(input: string): number {
  const hash = createHash('sha256').update(input).digest('hex');
  return parseInt(hash.substring(0, 8), 16) | 0;
}

const lockKey1 = hashString(tenantId);
const lockKey2 = matchId;
await prisma.$executeRaw`SELECT pg_advisory_lock(${lockKey1}, ${lockKey2})`;
```

---

## Database Schema

### Core Tables (All Tenant-Scoped)

**Pattern:** Every table has `tenant_id UUID NOT NULL REFERENCES tenants(tenant_id)`

**Core entities:**
- `players` - Player roster
- `matches` - Historical match data
- `player_matches` - Historical player performance
- `seasons` - Season definitions

**Match management:**
- `upcoming_matches` - Future matches
- `upcoming_match_players` - Team assignments
- `match_player_pool` - RSVP tracking
- `team_slots` - Position assignments

**Configuration:**
- `app_config` - Application settings (per-tenant + global)
- `team_size_templates` - Match format templates
- `team_balance_weights` - Algorithm configuration
- `balance_config` - Balance algorithm settings

**Aggregated statistics:** 30+ tables (all prefixed `aggregated_*`)

### Unique Constraints (Tenant-Scoped)

**Pattern:** Replace global uniqueness with per-tenant uniqueness

```sql
-- Players: unique name per tenant
UNIQUE(tenant_id, name)

-- Match pool: one entry per player per match per tenant
UNIQUE(tenant_id, upcoming_match_id, player_id)

-- Active match: one active match per tenant
CREATE UNIQUE INDEX idx_upcoming_matches_active_per_tenant 
    ON upcoming_matches(tenant_id) WHERE is_active = true;
```

### Indexes for Performance

**Pattern:** `tenant_id` leads all composite indexes

```sql
-- Hot query patterns
CREATE INDEX idx_players_tenant_active 
    ON players(tenant_id, is_retired) WHERE is_retired = false;

CREATE INDEX idx_upcoming_matches_tenant_date 
    ON upcoming_matches(tenant_id, match_date);

CREATE INDEX idx_match_pool_tenant_status 
    ON match_player_pool(tenant_id, response_status);
```

---

## Security Model

### RLS Architecture Decision (October 2025)

**CRITICAL DECISION:** Disable RLS on operational tables, use application-level filtering

**Problem:** RLS + connection pooling causes race conditions
- Middleware sets RLS context on Connection A
- Query executes on Connection B (no context)
- RLS blocks all rows → 0 results returned

**Solution:** Application-level filtering with type-safe helper

**Tables with RLS Enabled (3 only):**
- `auth.*` - Supabase auth system
- `tenants` - Superadmin-only access
- `admin_profiles` - Role/permission data

**Tables with RLS Disabled (30+ operational tables):**
- All `aggregated_*` tables
- Core entities: `players`, `matches`, `player_matches`, `seasons`
- Match management: `upcoming_matches`, `upcoming_match_players`, `match_player_pool`
- Configuration: `app_config`, `team_size_templates`, `team_balance_weights`

**Security Pattern:**
```typescript
import { withTenantFilter } from '@/lib/tenantFilter';

// Type-safe helper enforces tenant isolation
const data = await prisma.players.findMany({
  where: withTenantFilter(tenantId, { is_retired: false })
});

// Throws error if tenantId is null
// Compile-time enforcement (TypeScript)
```

**Benefits:**
- ✅ Eliminates connection pooling race conditions
- ✅ Type-safe at compile time (RLS is runtime only)
- ✅ Explicit and auditable in code
- ✅ Easier debugging (queries visible in logs)
- ✅ Better performance (optimizer uses indexes directly)

**See:** `.cursor/rules/code-generation.mdc` for mandatory implementation patterns

### Critical Security Rules

**🚨 MANDATORY for every tenant-scoped query:**

```typescript
// ALWAYS use withTenantFilter()
where: withTenantFilter(tenantId)

// Or with additional filters
where: withTenantFilter(tenantId, { is_retired: false })

// ❌ NEVER use manual filtering
where: { tenant_id: tenantId }  // No type safety!
```

**🚨 MANDATORY for every API route:**

```typescript
// ALWAYS use withTenantContext() wrapper
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // Tenant context set, queries must use withTenantFilter()
    const data = await prisma.table.findMany({
      where: withTenantFilter(tenantId)
    });
    return NextResponse.json({ success: true, data });
  });
}
```

---

## Tenant Context Resolution

### withTenantContext() Wrapper

**File:** `src/lib/tenantContext.ts`

**Purpose:** Extracts tenant context from request and provides to handler

```typescript
export async function withTenantContext<T>(
  request: NextRequest,
  handler: (tenantId: string) => Promise<T>,
  options?: { allowUnauthenticated?: boolean }
): Promise<T> {
  // 1. Check for superadmin tenant override (cookie)
  const overrideTenantId = request.cookies.get('admin_tenant_override')?.value;
  if (overrideTenantId) {
    return handler(overrideTenantId);
  }
  
  // 2. Get session and resolve tenant from player record
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && !options?.allowUnauthenticated) {
    throw new Error('Unauthorized');
  }
  
  const player = await prisma.players.findFirst({
    where: { auth_user_id: session.user.id },
    select: { tenant_id: true }
  });
  
  if (!player) {
    throw new Error('No tenant association');
  }
  
  // 3. Set RLS context (for auth tables that still use RLS)
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${player.tenant_id}, false)`;
  
  // 4. Execute handler with tenant context
  return handler(player.tenant_id);
}
```

**Usage:** Wrap every tenant-scoped API route handler

### withTenantFilter() Helper

**File:** `src/lib/tenantFilter.ts`

**Purpose:** Type-safe tenant filtering for all queries

```typescript
export function withTenantFilter<T extends object>(
  tenantId: string | null,
  additionalFilters?: T
): { tenant_id: string } & T {
    if (!tenantId) {
    throw new Error('Tenant ID required for query');
  }
  
  return {
    tenant_id: tenantId,
    ...additionalFilters
  } as { tenant_id: string } & T;
}
```

**Usage Examples:**
```typescript
// Simple: just tenant filter
where: withTenantFilter(tenantId)

// With additional filters
where: withTenantFilter(tenantId, { is_retired: false })

// With OR conditions
where: withTenantFilter(tenantId, {
  OR: [
    { name: { contains: 'John' } },
    { email: { contains: 'john' } }
  ]
})

// With composite keys
where: {
  ...withTenantFilter(tenantId),
  player_id: playerId
}
```

---

## Background Jobs & Workers

### Tenant Context in Jobs

**Job Payload Pattern:**
```typescript
interface JobPayload {
  tenant_id: string;  // MANDATORY
  job_type: string;
  triggered_by: 'post-match' | 'admin' | 'cron';
  match_id?: number;
  request_id: string;
}
```

**Enqueue Pattern:**
```typescript
await prisma.background_job_status.create({
  data: {
    tenant_id: tenantId,  // From withTenantContext
    job_type: 'stats_update',
    job_payload: {
      tenant_id: tenantId,  // Also in payload
      triggered_by: 'admin'
    },
    status: 'queued'
  }
});
```

**Worker Processing Pattern:**
```typescript
// Worker extracts tenant from payload
  const { tenant_id } = job.payload;
  
// Set RLS context before any queries
  await supabase.rpc('set_config', {
    setting_name: 'app.tenant_id',
    new_value: tenant_id,
    is_local: false
  });
  
// All SQL RPC calls include target_tenant_id parameter
await supabase.rpc('update_power_ratings', {
  target_tenant_id: tenant_id
});
```

**See:** `SPEC_background_jobs.md` for complete worker architecture

---

## URL Routing

### Slug-Based Public Routes

**Pattern:** `/clubs/[slug]/...` for public club pages

```typescript
// Example URLs
'/clubs/berko-tnf'              // Club homepage
'/clubs/berko-tnf/tables'       // League tables
'/clubs/berko-tnf/fixtures'     // Upcoming fixtures
'/clubs/berko-tnf/players/123'  // Player profile
```

**Tenant Resolution:**
```typescript
// Middleware resolves slug → tenant_id
const tenantId = await getTenantIdFromSlug(params.slug);

// Set RLS context for request
await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
```

### Admin Routes (Session-Based)

**Pattern:** `/admin/*` routes use session-based tenant resolution

```typescript
// Tenant extracted from authenticated session
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // tenantId from session (player.tenant_id)
    const data = await prisma.table.findMany({
      where: withTenantFilter(tenantId)
    });
    return NextResponse.json({ data });
  });
}
```

### Superadmin Tenant Switching

**Implementation:** HTTP-only cookie with tenant override

```typescript
// Set tenant override (superadmin only)
response.cookies.set('admin_tenant_override', tenantId, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24  // 24 hours
});

// Clear override (return to own tenant)
response.cookies.delete('admin_tenant_override');
```

**UI:** Tenant selector dropdown in admin header (superadmin only)

---

## Implementation Patterns

### API Route Template

**Standard pattern for all tenant-scoped routes:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/tenantContext';
import { withTenantFilter } from '@/lib/tenantFilter';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // 🔒 Authorization check
      await requireAdminRole(request);
      
      // 🔒 Tenant-scoped query (MANDATORY)
      const data = await prisma.players.findMany({
        where: withTenantFilter(tenantId, { is_retired: false })
      });
      
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}
```

### SQL Function Template

**Pattern:** All SQL functions accept `target_tenant_id` parameter

```sql
CREATE OR REPLACE FUNCTION update_aggregated_stats(
  target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID
)
RETURNS void AS $$
BEGIN
  DELETE FROM aggregated_stats WHERE tenant_id = target_tenant_id;
  
  INSERT INTO aggregated_stats (tenant_id, player_id, stats)
  SELECT 
    target_tenant_id,
    p.player_id,
    calculate_stats(p.player_id)
  FROM players p
  WHERE p.tenant_id = target_tenant_id;
END;
$$ LANGUAGE plpgsql;
```

### Advisory Lock Template

**Pattern:** Hash tenant_id for first lock key, use entity ID for second

```typescript
import { withTenantMatchLock } from '@/lib/tenantLocks';

// Lock specific match within tenant scope
await withTenantMatchLock(tenantId, matchId, async () => {
  // Atomic operations
  // No other process can modify this match
});
```

**Implementation:**
```typescript
export async function withTenantMatchLock<T>(
  tenantId: string,
  matchId: number,
  callback: () => Promise<T>
): Promise<T> {
  const lockKey1 = hashString(tenantId);
  const lockKey2 = matchId;
  
    await prisma.$executeRaw`SELECT pg_advisory_lock(${lockKey1}, ${lockKey2})`;
  try {
    return await callback();
  } finally {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${lockKey1}, ${lockKey2})`;
  }
}
```

---

## Key Design Decisions

### Decision 1: Application-Level Filtering vs RLS (October 2025)

**Problem:** RLS + Prisma connection pooling causes intermittent 0-row results

**Mechanism:**
1. Middleware sets RLS context on Connection A
2. Query executes on Connection B from pool (no context)
3. RLS blocks all rows → Empty results

**Solution:** Disable RLS on operational tables, use `withTenantFilter()` helper

**Benefits:**
- ✅ No race conditions
- ✅ Type-safe at compile time
- ✅ Explicit in code (easy to audit)
- ✅ Better performance (direct index usage)

**RLS Still Enabled:** Auth tables only (`auth.*`, `tenants`, `admin_profiles`)

### Decision 2: UUID vs Integer for tenant_id

**Chosen:** UUID

**Rationale:**
- No cross-tenant ID guessing
- Distributed generation (no sequences)
- URL-safe in API routes
- Standard for multi-tenant systems

### Decision 3: Slug-Based URLs vs Subdomains

**Chosen:** Path-based routing (`/clubs/berko-tnf/...`)

**Rationale:**
- Simpler DNS management
- Better SEO consolidation
- Single codebase deployment
- Immutable slugs for stable URLs

**See:** Section F2 for complete routing architecture

### Decision 4: Explicit Filtering vs Query Wrapper

**Chosen:** Explicit filtering with helper function

**Previous:** `TenantAwarePrisma` wrapper class (1167 lines, retired September 2025)

**Current:** `withTenantFilter()` helper (simple, explicit)

**Rationale:**
- Wrapper broke nested includes
- Hidden complexity made debugging hard
- Explicit filtering is clearer
- 95% code reduction
- Better TypeScript support

---

## Monitoring & Observability

### Tenant Health Check

```sql
-- Verify tenant data isolation
SELECT 
  t.slug as tenant,
  COUNT(p.player_id) as players,
  COUNT(um.upcoming_match_id) as upcoming_matches,
  COUNT(mpp.id) as rsvp_responses
FROM tenants t
LEFT JOIN players p ON p.tenant_id = t.tenant_id
LEFT JOIN upcoming_matches um ON um.tenant_id = t.tenant_id  
LEFT JOIN match_player_pool mpp ON mpp.tenant_id = t.tenant_id
GROUP BY t.tenant_id, t.slug;
```

### Data Consistency Check

```sql
-- Verify no orphaned records without tenant_id
SELECT 
  'players' as table_name,
  COUNT(*) as records_without_tenant
FROM players 
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  'upcoming_matches',
  COUNT(*)
FROM upcoming_matches 
WHERE tenant_id IS NULL;

-- Expected result: 0 rows for all tables
```

### Logging Strategy

**Structured Logging Format:**
```json
{
  "timestamp": "2025-11-26T10:30:00Z",
  "level": "info",
  "message": "Player RSVP updated",
  "tenant_id": "tenant-uuid",
  "player_id": 123,
  "match_id": 456
}
```

**Include tenant_id in all log statements**

---

## Testing & Validation

### Unit Tests

**Tenant Context Resolution:**
```typescript
describe('withTenantContext', () => {
  it('should extract tenant from session', async () => {
    const mockRequest = createMockAdminRequest();
    await withTenantContext(mockRequest, async (tenantId) => {
      expect(tenantId).toBe('expected-tenant-uuid');
    });
  });
  
  it('should throw error if no tenant found', async () => {
    const mockRequest = createMockUnauthenticatedRequest();
    await expect(
      withTenantContext(mockRequest, async () => {})
    ).rejects.toThrow('Unauthorized');
  });
});
```

**Tenant Filter Helper:**
```typescript
describe('withTenantFilter', () => {
  it('should add tenant_id to filters', () => {
    const result = withTenantFilter('tenant-123', { is_retired: false });
    expect(result).toEqual({
      tenant_id: 'tenant-123',
      is_retired: false
    });
  });
  
  it('should throw if tenantId is null', () => {
    expect(() => withTenantFilter(null)).toThrow('Tenant ID required');
  });
});
```

### Integration Tests

**Tenant Isolation:**
```typescript
it('should not return data from other tenants', async () => {
  // Create data in tenant A
  await createPlayer({ tenant_id: 'tenant-a', name: 'Player A' });
  
  // Query as tenant B
  const result = await prisma.players.findMany({
    where: withTenantFilter('tenant-b')
  });
  
  // Should return 0 rows
  expect(result).toHaveLength(0);
});
```

**Advisory Locks:**
```typescript
it('should allow parallel locks for different tenants', async () => {
  const results = await Promise.all([
    withTenantMatchLock('tenant-a', 1, async () => 'done-a'),
    withTenantMatchLock('tenant-b', 1, async () => 'done-b')
  ]);
  
  expect(results).toEqual(['done-a', 'done-b']);
});
```

---

## Common Patterns

### Pattern 1: Simple Query

```typescript
const players = await prisma.players.findMany({
  where: withTenantFilter(tenantId)
});
```

### Pattern 2: Query with Filters

```typescript
const activePlayers = await prisma.players.findMany({
  where: withTenantFilter(tenantId, {
    is_retired: false,
    is_admin: true
  })
});
```

### Pattern 3: Query with Relations

```typescript
const matches = await prisma.upcoming_matches.findMany({
  where: withTenantFilter(tenantId),
  include: {
    upcoming_match_players: {
      where: { tenant_id: tenantId },  // Filter nested relations too
      include: {
        players: true
      }
    }
  }
});
```

### Pattern 4: Create with Tenant

```typescript
const newPlayer = await prisma.players.create({
  data: {
    tenant_id: tenantId,  // Always include
    name: 'John Smith',
    phone: '+447123456789'
  }
});
```

### Pattern 5: Update with Verification

```typescript
// Verify ownership before update
const player = await prisma.players.findFirst({
  where: withTenantFilter(tenantId, { player_id: playerId })
});

if (!player) {
  throw new Error('Player not found or wrong tenant');
}

await prisma.players.update({
  where: { player_id: playerId },
  data: { name: 'New Name' }
});
```

---

## Troubleshooting

### Issue: "No tenant association" Error

**Cause:** User authenticated but not linked to any player record

**Solution:** Check `players` table for matching `auth_user_id`
```sql
SELECT * FROM players WHERE auth_user_id = 'user-uuid';
```

### Issue: Cross-Tenant Data Appearing

**Cause:** Missing `withTenantFilter()` in query

**Solution:** Add tenant filtering to all queries
```typescript
// ❌ Wrong
const data = await prisma.players.findMany();

// ✅ Correct
const data = await prisma.players.findMany({
  where: withTenantFilter(tenantId)
});
```

### Issue: Advisory Lock Timeout

**Cause:** Lock held too long or deadlock

**Solution:** Add timeout and error handling
```typescript
try {
  await withTenantMatchLock(tenantId, matchId, async () => {
    // Keep operations quick
  });
} catch (error) {
  if (error.message.includes('lock timeout')) {
    throw new Error('Match is being edited by another user');
  }
  throw error;
}
```

---

## Useful SQL Queries

### Find All Tenants
```sql
SELECT tenant_id, slug, name, club_code, is_active
FROM tenants
ORDER BY created_at DESC;
```

### Check Player Tenant Association
```sql
SELECT 
  p.player_id,
  p.name,
  p.phone,
  t.name as club_name,
  t.slug
FROM players p
JOIN tenants t ON t.tenant_id = p.tenant_id
WHERE p.phone = '+447123456789';
```

### Verify Tenant Isolation
```sql
-- Should return counts only for specified tenant
SELECT 
  COUNT(DISTINCT player_id) as players,
  COUNT(DISTINCT upcoming_match_id) as matches
FROM players p, upcoming_matches um
WHERE p.tenant_id = '00000000-0000-0000-0000-000000000001'
AND um.tenant_id = '00000000-0000-0000-0000-000000000001';
```

### Find Missing Tenant Filters
```sql
-- Check for any NULL tenant_id values (should be 0)
SELECT 
  'players' as table_name,
  COUNT(*) as null_tenant_count
FROM players WHERE tenant_id IS NULL
UNION ALL
SELECT 'matches', COUNT(*) FROM matches WHERE tenant_id IS NULL;
```

---

## Production Deployment Status

**Implementation:** ✅ Complete (October 2025)

**Validated:**
- ✅ 33 tables with tenant_id fields
- ✅ 70+ API routes using withTenantContext
- ✅ All queries using withTenantFilter
- ✅ Background jobs propagating tenant context
- ✅ Advisory locks tenant-scoped
- ✅ Zero breaking changes to existing functionality

**Ready For:**
- Multi-tenant expansion (add new clubs)
- RSVP system implementation
- Cross-tenant analytics (superadmin only)

---

**Document Status:** ✅ Production Complete  
**Last Updated:** November 26, 2025  
**Version:** 2.1.0

**For implementation history:** See `ARCHIVE_multi_tenancy_implementation.md`  
**For RLS discussion:** See Section on RLS Architecture Decision (above)  
**For code patterns:** See `.cursor/rules/code-generation.mdc`
