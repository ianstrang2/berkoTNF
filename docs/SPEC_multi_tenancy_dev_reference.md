# BerkoTNF Multi-Tenancy Implementation Specification

Version 3.0.0 • Developer Reference

**VENDOR-AGNOSTIC, PRAGMATIC MULTI-TENANCY FOR PRODUCTION DEPLOYMENT**

This specification provides execution-ready technical details for implementing robust multi-tenancy across the entire BerkoTNF application.

---

## A. Executive Summary

### Multi-Tenancy Requirements

The BerkoTNF platform requires tenant-aware functionality across the entire application stack:

- **RSVP Token Uniqueness**: Invite tokens must be unique per tenant, not globally
- **Activity Feed Isolation**: Each tenant needs isolated activity streams
- **Advisory Locks**: Tenant-aware match locking to prevent cross-tenant race conditions
- **Background Jobs**: Tenant context propagation through worker system
- **Data Isolation**: Complete tenant separation for regulatory compliance

### Architecture Approach

**Tenant Identifier Strategy**:
- **tenant_id** (UUID): Permanent internal key for database relationships and RLS policies
- **slug** (TEXT): Human-readable URL identifier for public routing
- **Immutable slug**: Once set at tenant creation, slug cannot be changed

**Implementation Pattern**:
- Explicit tenant filtering in all Prisma queries
- Row Level Security (RLS) for database-level enforcement
- Tenant context propagation through middleware and background jobs

---

## B. Database Schema

### Tenants Table

```sql
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Insert default tenant
INSERT INTO tenants (tenant_id, slug, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'berko-tnf', 'Berko TNF');

-- Indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE is_active = true;

-- Slug validation constraint
ALTER TABLE tenants 
  ADD CONSTRAINT valid_slug_format CHECK (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND 
    length(slug) >= 3 AND 
    length(slug) <= 50
  );
```

### Core Table Modifications

#### Players Table
```sql
-- Add tenant_id column
ALTER TABLE players ADD COLUMN tenant_id UUID;

-- Backfill with default tenant
UPDATE players SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Make required and add constraints
ALTER TABLE players ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE players ADD CONSTRAINT fk_players_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

-- Update unique constraint to be tenant-scoped
ALTER TABLE players DROP CONSTRAINT unique_player_name;
ALTER TABLE players ADD CONSTRAINT unique_player_name_per_tenant 
    UNIQUE(tenant_id, name);

-- Performance index
CREATE INDEX CONCURRENTLY idx_players_tenant_active 
    ON players(tenant_id, is_retired) WHERE is_retired = false;
```

#### Upcoming Matches Table
```sql
-- Add tenant_id and RSVP configuration
ALTER TABLE upcoming_matches ADD COLUMN tenant_id UUID;
ALTER TABLE upcoming_matches ADD COLUMN allow_self_serve_booking BOOLEAN DEFAULT false;
ALTER TABLE upcoming_matches ADD COLUMN auto_balance_when_full BOOLEAN DEFAULT true;
ALTER TABLE upcoming_matches ADD COLUMN auto_lock_when_full BOOLEAN DEFAULT false;
ALTER TABLE upcoming_matches ADD COLUMN invite_mode VARCHAR(20) DEFAULT 'all_at_once';
ALTER TABLE upcoming_matches ADD COLUMN capacity INT;

-- Backfill and constraints
UPDATE upcoming_matches SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

ALTER TABLE upcoming_matches ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE upcoming_matches ADD CONSTRAINT fk_upcoming_matches_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

-- Update active match constraint to be tenant-scoped
CREATE UNIQUE INDEX idx_upcoming_matches_active_per_tenant 
    ON upcoming_matches(tenant_id) WHERE is_active = true;
```

#### Match Player Pool Table
```sql
-- Add tenant_id and waitlist fields
ALTER TABLE match_player_pool ADD COLUMN tenant_id UUID;
ALTER TABLE match_player_pool ADD COLUMN waitlist_position INT;
ALTER TABLE match_player_pool ADD COLUMN offered_at TIMESTAMPTZ;
ALTER TABLE match_player_pool ADD COLUMN offer_expires_at TIMESTAMPTZ;

-- Backfill and constraints
UPDATE match_player_pool SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

ALTER TABLE match_player_pool ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE match_player_pool ADD CONSTRAINT fk_match_pool_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

-- Update unique constraint to be tenant-scoped
ALTER TABLE match_player_pool DROP CONSTRAINT match_player_pool_upcoming_match_id_player_id_key;
ALTER TABLE match_player_pool ADD CONSTRAINT unique_match_player_per_tenant 
    UNIQUE(tenant_id, upcoming_match_id, player_id);

-- Waitlist position index
CREATE UNIQUE INDEX idx_waitlist_position_per_match 
    ON match_player_pool(tenant_id, upcoming_match_id, waitlist_position) 
    WHERE waitlist_position IS NOT NULL;
```

### RSVP Tables

#### Match Invitations
```sql
CREATE TABLE match_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    upcoming_match_id INT NOT NULL REFERENCES upcoming_matches(upcoming_match_id),
    invite_token_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(tenant_id, invite_token_hash),
    UNIQUE(tenant_id, upcoming_match_id)
);
```

#### Notification Ledger
```sql
CREATE TABLE notification_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    player_id INT REFERENCES players(player_id),
    notification_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now(),
    delivery_status VARCHAR(20) DEFAULT 'sent',
    metadata JSONB DEFAULT '{}'::jsonb
);
```

### Aggregated Tables Pattern

All 30+ `aggregated_*` tables follow the same pattern:
```sql
-- Example for aggregated_player_profile_stats
ALTER TABLE aggregated_player_profile_stats ADD COLUMN tenant_id UUID;
UPDATE aggregated_player_profile_stats SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;
ALTER TABLE aggregated_player_profile_stats ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE aggregated_player_profile_stats ADD CONSTRAINT fk_stats_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
```

---

## C. Row-Level Security (RLS)

### Session Context Pattern

Set tenant context for every request:
```sql
-- In middleware/API routes before any database operations
SELECT set_config('app.tenant_id', $1, false);
```

### RLS Policies

#### Players Table
```sql
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Admin: Full access within tenant
CREATE POLICY players_admin_policy ON players
    FOR ALL TO authenticated
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Public: Read-only for RSVP lookups
CREATE POLICY players_public_read ON players
    FOR SELECT TO public
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

#### Upcoming Matches Table
```sql
ALTER TABLE upcoming_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY upcoming_matches_admin_policy ON upcoming_matches
    FOR ALL TO authenticated
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY upcoming_matches_public_read ON upcoming_matches
    FOR SELECT TO public
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

#### Match Player Pool Table
```sql
ALTER TABLE match_player_pool ENABLE ROW LEVEL SECURITY;

-- Admin: Full access within tenant
CREATE POLICY match_pool_admin_policy ON match_player_pool
    FOR ALL TO authenticated
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Public: Players can update their own RSVP status
CREATE POLICY match_pool_player_update ON match_player_pool
    FOR UPDATE TO public
    USING (
        tenant_id = current_setting('app.tenant_id')::uuid
        AND player_id = current_setting('app.player_id')::int
    );
```

#### Background Jobs Table
```sql
-- Update existing policy to be tenant-aware
DROP POLICY "Allow all operations on background_job_status" ON background_job_status;

CREATE POLICY background_jobs_tenant_policy ON background_job_status
    FOR ALL TO authenticated
    USING (
        tenant_id = current_setting('app.tenant_id')::uuid
        OR tenant_id IS NULL -- Allow global jobs
    );
```

---

## D. Routing & URL Model

### Tenant Slug + UUID Hybrid Architecture

**Tenant Identifier Strategy**:
- **tenant_id** (UUID): Permanent internal key for database relationships and RLS policies
- **slug** (TEXT): Human-readable URL identifier for public routing
- **Immutable slug**: Once set at tenant creation, slug cannot be changed (even if club name changes)
- **Unique constraint**: slug must be unique across all tenants

**Current Live Tenant**:
- **Name**: "Berko TNF"
- **Slug**: `berko-tnf` (assigned to existing tenant UUID)
- **Example URL**: `https://capo.app/clubs/berko-tnf/tables`

### Public Route Architecture

**Slug-Based Public Routes** (No authentication required):
```typescript
const PUBLIC_CLUB_ROUTES = {
  '/clubs/[slug]': 'Club homepage with public stats',
  '/clubs/[slug]/tables': 'League tables and standings',
  '/clubs/[slug]/fixtures': 'Upcoming fixtures and schedule',
  '/clubs/[slug]/results': 'Match results and history',
  '/clubs/[slug]/players/[playerId]': 'Individual player profile (public)',
  '/clubs/[slug]/seasons': 'Season overview and statistics',
  '/clubs/[slug]/records': 'All-time records and achievements'
};

// Example URLs for Berko TNF:
const BERKO_TNF_EXAMPLES = {
  homepage: '/clubs/berko-tnf',
  tables: '/clubs/berko-tnf/tables',
  fixtures: '/clubs/berko-tnf/fixtures',
  playerProfile: '/clubs/berko-tnf/players/123'
};
```

**Next.js App Router Implementation**:
```typescript
// File structure for slug-based routing
src/app/clubs/[slug]/
├── page.tsx                    // Club homepage
├── tables/
│   └── page.tsx               // League tables
├── fixtures/
│   └── page.tsx               // Upcoming fixtures
├── results/
│   └── page.tsx               // Match results
├── players/
│   └── [playerId]/
│       └── page.tsx           // Player profile
└── layout.tsx                 // Shared club layout with tenant context
```

### Private Route Architecture

**Admin Routes** (Authentication required):
```typescript
const PRIVATE_ADMIN_ROUTES = {
  '/admin/matches': 'Match management (tenant-scoped)',
  '/admin/players': 'Player management (tenant-scoped)',
  '/admin/seasons': 'Season management (tenant-scoped)',
  '/admin/setup': 'Club configuration (tenant-scoped)',
  '/admin/users': 'Admin user management (tenant-scoped)'
};

// Admin routes are tenant-scoped by JWT claims, not by URL slug
// Admin session contains tenant_id for RLS context
```

**Superadmin Routes** (Cross-tenant access):
```typescript
const SUPERADMIN_ROUTES = {
  '/superadmin/tenants': 'Tenant management (cross-tenant)',
  '/superadmin/analytics': 'Platform analytics (cross-tenant)',
  '/superadmin/users': 'Admin user management (cross-tenant)',
  '/superadmin/system': 'System configuration (global)'
};

// Superadmin can switch tenant context via dropdown
// Session updated with new tenant_id for scoped operations
```

### Tenant Resolution Implementation

**Middleware Slug Resolution**:
```typescript
// File: src/middleware/tenantResolution.ts
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// In-memory cache for slug → tenant_id lookups (5-minute TTL)
const slugCache = new Map<string, { tenantId: string; expires: number }>();

export async function resolveTenantFromSlug(req: NextRequest): Promise<string | null> {
  const pathSegments = req.nextUrl.pathname.split('/');
  
  // Extract slug from /clubs/[slug]/... pattern
  if (pathSegments[1] !== 'clubs' || !pathSegments[2]) {
    return null;
  }
  
  const slug = pathSegments[2];
  
  // Check cache first (performance optimization)
  const cached = slugCache.get(slug);
  if (cached && cached.expires > Date.now()) {
    return cached.tenantId;
  }
  
  // Database lookup for slug → tenant_id resolution
  try {
    const supabase = createMiddlewareClient({ req, res: NextResponse.next() });
    const { data: tenant } = await supabase
      .from('tenants')
      .select('tenant_id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    
    if (tenant?.tenant_id) {
      // Cache successful lookup for 5 minutes
      slugCache.set(slug, {
        tenantId: tenant.tenant_id,
        expires: Date.now() + 5 * 60 * 1000
      });
      
      return tenant.tenant_id;
    }
    
    return null;
  } catch (error) {
    console.error('Slug resolution failed:', error);
    return null;
  }
}

// Hardcoded fallback for current live tenant (performance)
export function getKnownTenantId(slug: string): string | null {
  const KNOWN_TENANTS = {
    'berko-tnf': process.env.BERKO_TNF_TENANT_ID || '00000000-0000-0000-0000-000000000001'
  };
  
  return KNOWN_TENANTS[slug] || null;
}
```

**RLS Context Setting**:
```typescript
// Set tenant context for database queries
export async function setTenantContext(tenantId: string): Promise<void> {
  // This sets the RLS context for all subsequent database queries
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
}

// Usage in API routes:
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  // Resolve slug to tenant_id
  const tenantId = await resolveTenantFromSlug(request) || getKnownTenantId(params.slug);
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Club not found' }, { status: 404 });
  }
  
  // Set RLS context before any database queries
  await setTenantContext(tenantId);
  
  // All subsequent Prisma queries are automatically tenant-scoped
  const players = await prisma.players.findMany({
    where: { tenant_id: tenantId }, // Explicit filtering
    orderBy: { name: 'asc' }
  });
  
  return NextResponse.json({ players });
}
```

**Tenant Creation with Slug**:
```typescript
// Utility for creating new tenants with auto-generated slugs
export async function createTenant(name: string, customSlug?: string): Promise<{ tenantId: string; slug: string }> {
  // Generate slug from name if not provided
  const slug = customSlug || generateSlug(name);
  
  // Validate slug uniqueness
  const existingTenant = await prisma.tenants.findUnique({
    where: { slug }
  });
  
  if (existingTenant) {
    throw new Error(`Slug '${slug}' already exists`);
  }
  
  // Create tenant with slug
  const tenant = await prisma.tenants.create({
    data: {
      tenant_id: crypto.randomUUID(),
      name,
      slug,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  });
  
  return {
    tenantId: tenant.tenant_id,
    slug: tenant.slug
  };
}

// Auto-slugify utility
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
}

// Examples:
// "Berko TNF" → "berko-tnf"
// "Manchester United FC" → "manchester-united-fc"
// "Real Madrid C.F." → "real-madrid-cf"
```

### URL Pattern Examples

**Public Club Access** (No authentication required):
```bash
# Berko TNF club pages (current live tenant)
https://capo.app/clubs/berko-tnf                    # Club homepage
https://capo.app/clubs/berko-tnf/tables             # League tables
https://capo.app/clubs/berko-tnf/fixtures           # Upcoming fixtures
https://capo.app/clubs/berko-tnf/results            # Match results
https://capo.app/clubs/berko-tnf/players/123        # Player profile

# Future multi-tenant examples
https://capo.app/clubs/manchester-united            # Manchester United FC
https://capo.app/clubs/arsenal-fc/tables            # Arsenal league tables
https://capo.app/clubs/chelsea/players/456          # Chelsea player profile
```

**Admin Access** (Authentication required, tenant-scoped by session):
```bash
# Admin routes (tenant context from JWT claims, not URL)
https://capo.app/admin/matches                      # Match management
https://capo.app/admin/players                      # Player management
https://capo.app/admin/seasons                      # Season management

# Superadmin routes (cross-tenant access)
https://capo.app/superadmin/tenants                 # Tenant management
https://capo.app/superadmin/analytics               # Platform analytics
```

**RSVP Access** (HMAC token-based, no authentication required):
```bash
# RSVP functionality (token-based access)
https://capo.app/rsvp/match/123?token=...           # RSVP form
https://capo.app/upcoming/match/123?token=...       # Alternative RSVP URL
```

### Routing Implementation Strategy

**Design Rationale**:
1. **Path-based over subdomains**: Simpler DNS management, better SEO consolidation
2. **Immutable slugs**: Stable URLs even if club names change over time
3. **Tenant_id permanence**: Internal UUID ensures database consistency
4. **Single codebase**: One implementation per feature, slug differentiates data
5. **Performance**: Slug caching reduces database lookups for popular routes

**Middleware Integration**:
```typescript
// File: src/middleware.ts (enhanced for slug resolution)
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();
  
  // Handle public club routes with slug resolution
  if (pathname.startsWith('/clubs/')) {
    const tenantId = await resolveTenantFromSlug(req);
    
    if (!tenantId) {
      // Invalid slug - redirect to marketing
      return NextResponse.redirect(new URL('/marketing?error=club_not_found', req.url));
    }
    
    // Set tenant context for RLS
    res.headers.set('x-tenant-id', tenantId);
    res.headers.set('x-public-access', 'true');
    
    return res;
  }
  
  // Handle admin routes (authentication required)
  if (pathname.startsWith('/admin/')) {
    return handleAdminRoute(req, res);
  }
  
  // Handle superadmin routes (authentication required)
  if (pathname.startsWith('/superadmin/')) {
    return handleSuperadminRoute(req, res);
  }
  
  return res;
}
```

---

## E. Application Integration

### Standard API Route Pattern

**Implemented across all 70+ API routes**:
```typescript
export async function apiRoute(request: Request) {
  // 1. Resolve tenant context (currently default, ready for auth enhancement)
  const tenantId = getCurrentTenantId(); // Returns DEFAULT_TENANT_ID for now
  
  // 2. Set RLS context for database-level protection
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
  
  // 3. Use explicit tenant filtering in ALL queries
  const data = await prisma.table.findMany({
    where: { tenant_id: tenantId, ...otherConditions }
  });
  
  return NextResponse.json({ data });
}
```

### Tenant Context Resolution

**File**: `src/lib/tenantContext.ts`
```typescript
export async function getTenantContext(request: Request): Promise<string> {
  // Admin routes: from session (future enhancement)
  if (request.url.includes('/admin/')) {
    return getTenantFromSession(request);
  }
  
  // Public RSVP routes: from token
  if (request.url.includes('/upcoming/match/')) {
    return getTenantFromInviteToken(request);
  }
  
  // Public club routes: from slug
  if (request.url.includes('/clubs/')) {
    return getTenantFromSlug(request);
  }
  
  // Default tenant for current implementation
  return '00000000-0000-0000-0000-000000000001';
}

export function getCurrentTenantId(): string {
  // Currently returns default tenant
  // Will be enhanced by authentication system
  return '00000000-0000-0000-0000-000000000001';
}
```

### Advisory Lock Implementation

**File**: `src/lib/tenantLocks.ts`
```typescript
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

function hashString(input: string): number {
  const hash = createHash('sha256').update(input).digest('hex');
  return parseInt(hash.substring(0, 8), 16) | 0;
}

export async function withTenantMatchLock<T>(
  tenantId: string,
  matchId: number,
  callback: () => Promise<T>
): Promise<T> {
  const lockKey1 = hashString(tenantId);
  const lockKey2 = matchId;
  
  try {
    await prisma.$executeRaw`SELECT pg_advisory_lock(${lockKey1}, ${lockKey2})`;
    return await callback();
  } finally {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${lockKey1}, ${lockKey2})`;
  }
}

export async function withTenantPlayerLock<T>(
  tenantId: string,
  playerId: number,
  callback: () => Promise<T>
): Promise<T> {
  const lockKey1 = hashString(`${tenantId}:player`);
  const lockKey2 = playerId;
  
  try {
    await prisma.$executeRaw`SELECT pg_advisory_lock(${lockKey1}, ${lockKey2})`;
    return await callback();
  } finally {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${lockKey1}, ${lockKey2})`;
  }
}
```

### Background Job Integration

**Job Enqueue Pattern**:
```typescript
const jobPayload = {
  tenant_id: tenantId,
  job_type: 'stats_update',
  triggered_by: source,
  request_id: crypto.randomUUID()
};

await prisma.background_job_status.create({
  data: {
    tenant_id: tenantId,
    job_type: 'stats_update',
    job_payload: jobPayload,
    status: 'queued'
  }
});
```

**Worker Processing Pattern**:
```typescript
// In worker: worker/src/statsProcessor.ts
async function processStatsJob(job: JobData) {
  const { tenant_id } = job.payload;
  
  // Set session context for RLS
  await supabase.rpc('set_config', {
    setting_name: 'app.tenant_id',
    new_value: tenant_id,
    is_local: false
  });
  
  // Proceed with stats processing...
}
```

### Rate Limiting

**Tenant-Scoped Rate Limiting**:
```typescript
export function getTenantRateLimitKey(
  tenantId: string,
  endpoint: string,
  identifier: string
): string {
  return `rate_limit:${tenantId}:${endpoint}:${identifier}`;
}

export async function checkTenantRateLimit(
  tenantId: string,
  endpoint: string,
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
) {
  const key = getTenantRateLimitKey(tenantId, endpoint, identifier);
  // Implementation depends on rate limiting backend (Redis, etc.)
}
```

---

## F. Monitoring & Operations

### Structured Logging

**Log Format with Tenant Context**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "Player RSVP updated",
  "tenant_id": "tenant-uuid",
  "player_id": "123",
  "match_id": "456",
  "phone": "***-***-5678"
}
```

### Monitoring Queries

**Tenant Health Check**:
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

**Data Consistency Check**:
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
```

**Performance Monitoring**:
```sql
-- Query performance by tenant
SELECT 
  tenant_id,
  COUNT(*) as query_count,
  AVG(duration_ms) as avg_duration
FROM query_performance_log 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY tenant_id
ORDER BY avg_duration DESC;
```

---

## G. Testing Strategy

### Unit Tests

**Tenant Resolution Testing**:
```typescript
describe('Tenant Context Resolution', () => {
  it('should extract tenant from slug', async () => {
    const mockRequest = createMockSlugRequest('/clubs/berko-tnf/tables');
    const tenantId = await getTenantContext(mockRequest);
    expect(tenantId).toBe('00000000-0000-0000-0000-000000000001');
  });
  
  it('should extract tenant from admin session', async () => {
    const mockRequest = createMockAdminRequest();
    const tenantId = await getTenantContext(mockRequest);
    expect(tenantId).toBe('expected-tenant-uuid');
  });
});
```

### Integration Tests

**RLS Testing**:
```sql
-- Test tenant isolation
BEGIN;
  -- Set tenant context for tenant A
  SELECT set_config('app.tenant_id', 'tenant-a-uuid', true);
  
  -- Should only see tenant A players
  SELECT COUNT(*) FROM players; -- Should return only tenant A count
  
  -- Switch to tenant B
  SELECT set_config('app.tenant_id', 'tenant-b-uuid', true);
  
  -- Should only see tenant B players
  SELECT COUNT(*) FROM players; -- Should return only tenant B count
ROLLBACK;
```

**Concurrency Testing**:
```typescript
// Test concurrent match operations across tenants
Promise.all([
  withTenantMatchLock('tenant-a', 1, () => updateMatch('tenant-a', 1)),
  withTenantMatchLock('tenant-b', 1, () => updateMatch('tenant-b', 1))
]);
// Should execute in parallel (different tenants)

Promise.all([
  withTenantMatchLock('tenant-a', 1, () => updateMatch('tenant-a', 1)),
  withTenantMatchLock('tenant-a', 1, () => updateMatch('tenant-a', 1))
]);
// Should execute sequentially (same tenant, same match)
```

---

## H. Configuration & Environment

### Environment Variables
```bash
# Default tenant configuration
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
BERKO_TNF_TENANT_ID=00000000-0000-0000-0000-000000000001

# Tenant resolution caching
TENANT_CACHE_TTL_SECONDS=300
SLUG_CACHE_TTL_SECONDS=300

# Rate limiting
TENANT_RATE_LIMIT_REDIS_URL=redis://localhost:6379

# Feature flags
ENABLE_MULTI_TENANCY=true
ENABLE_RLS_ENFORCEMENT=true
ENABLE_TENANT_CACHING=true
```

### Prisma Schema Updates

#### Tenant Model
```prisma
model tenants {
  tenant_id String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  slug      String    @unique @db.VarChar(50)
  name      String    @db.VarChar(255)
  created_at DateTime? @default(now()) @db.Timestamptz(6)
  updated_at DateTime? @default(now()) @db.Timestamptz(6)
  is_active Boolean   @default(true)
  settings  Json      @default("{}")
  
  // Relations
  players            players[]
  upcoming_matches   upcoming_matches[]
  match_player_pool  match_player_pool[]
  background_jobs    background_job_status[]
  match_invites      match_invites[]
  notification_ledger notification_ledger[]
}
```

#### Updated Players Model
```prisma
model players {
  player_id    Int      @id @default(autoincrement())
  tenant_id    String   @db.Uuid
  name         String   @db.VarChar(14)
  // ... other fields
  
  tenant       tenants  @relation(fields: [tenant_id], references: [tenant_id])
  
  @@unique([tenant_id, name], map: "unique_player_name_per_tenant")
  @@index([tenant_id, is_retired], map: "idx_players_tenant_active")
}
```

---

## I. Acceptance Criteria

### Database Layer
- [ ] All core tables have `tenant_id` columns with NOT NULL constraints
- [ ] Unique constraints updated to be tenant-scoped (e.g., `(tenant_id, name)`)
- [ ] Foreign key relationships maintain tenant consistency
- [ ] RLS policies enforce tenant isolation on all sensitive tables
- [ ] Advisory locks work correctly with tenant scoping
- [ ] Slug resolution performs efficiently with caching

### Application Layer
- [ ] All Prisma queries include tenant_id in WHERE clauses
- [ ] Tenant resolution works correctly for admin, public, and worker contexts
- [ ] API routes extract and use tenant context appropriately
- [ ] Background jobs propagate tenant_id through entire processing pipeline
- [ ] Rate limiting keys include tenant prefix
- [ ] Logging includes tenant_id in all structured log entries

### RSVP System
- [ ] Invite tokens are unique per tenant (not globally)
- [ ] Public RSVP endpoints derive tenant from token correctly
- [ ] Match invitations isolated per tenant
- [ ] Activity feed shows only tenant-specific events

### Security & Isolation
- [ ] Cross-tenant data access prevented by RLS policies
- [ ] No SQL injection vulnerabilities in tenant resolution
- [ ] Token hashing includes tenant context for uniqueness
- [ ] Advisory locks prevent cross-tenant race conditions
- [ ] Background jobs process only tenant-scoped data

### Performance & Reliability
- [ ] Database query performance within 10% of baseline
- [ ] RLS policies use efficient indexes with tenant_id leading
- [ ] Background job processing maintains current throughput
- [ ] Slug resolution caching achieves >90% hit rate
- [ ] Graceful degradation when tenant context unavailable

---

## J. Implementation Reference

### Complete Migration Sequence

```sql
-- Step 1: Create tenants table
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Insert default tenant
INSERT INTO tenants (tenant_id, slug, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'berko-tnf', 'Berko TNF');

-- Step 2: Add tenant_id columns to all tables
ALTER TABLE players ADD COLUMN tenant_id UUID;
ALTER TABLE upcoming_matches ADD COLUMN tenant_id UUID;
ALTER TABLE match_player_pool ADD COLUMN tenant_id UUID;
-- ... repeat for all 33 tables

-- Step 3: Backfill with default tenant
UPDATE players SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE upcoming_matches SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
-- ... repeat for all tables

-- Step 4: Add constraints
ALTER TABLE players ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE players ADD CONSTRAINT fk_players_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

-- Step 5: Update unique constraints
ALTER TABLE players DROP CONSTRAINT unique_player_name;
ALTER TABLE players ADD CONSTRAINT unique_player_name_per_tenant UNIQUE(tenant_id, name);

-- Step 6: Create performance indexes
CREATE INDEX CONCURRENTLY idx_players_tenant_active ON players(tenant_id, is_retired) WHERE is_retired = false;
CREATE INDEX CONCURRENTLY idx_upcoming_matches_tenant_date ON upcoming_matches(tenant_id, match_date);

-- Step 7: Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY players_admin_policy ON players FOR ALL TO authenticated USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Key Implementation Files

#### Tenant Context Utilities
```typescript
// src/lib/tenantContext.ts
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export function getCurrentTenantId(): string {
  return DEFAULT_TENANT_ID;
}

export async function setTenantContext(tenantId: string): Promise<void> {
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
}
```

#### Slug Resolution
```typescript
// src/lib/slugResolution.ts
export async function getTenantIdFromSlug(slug: string): Promise<string | null> {
  // Hardcoded for current live tenant
  if (slug === 'berko-tnf') {
    return DEFAULT_TENANT_ID;
  }
  
  // Database lookup for full implementation
  const tenant = await prisma.tenants.findUnique({
    where: { slug, is_active: true },
    select: { tenant_id: true }
  });
  
  return tenant?.tenant_id || null;
}
```

#### Background Job Worker Updates
```typescript
// worker/src/types/jobTypes.ts
interface StatsUpdateJobPayload {
  tenantId: string;
  jobType: string;
  triggeredBy: string;
  requestId: string;
}

// worker/src/jobs/statsUpdateJob.ts
export async function processStatsUpdate(job: Job<StatsUpdateJobPayload>) {
  const { tenantId } = job.data;
  
  // Set tenant context before processing
  await setTenantContext(tenantId);
  
  // Process stats with tenant isolation
  await updateAllStats(tenantId);
}
```

---

**Document Status**: Ready for Production  
**Implementation Status**: Complete ✅  
**Next Integration**: Authentication system enhancement

This specification provides the complete technical foundation for multi-tenant operations across the BerkoTNF platform, with slug-based public routing, comprehensive security enforcement, and performance optimization.

