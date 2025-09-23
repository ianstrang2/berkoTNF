# BerkoTNF Multi-Tenancy Implementation Specification

Version 1.0.0 • Implementation-Ready Design Document

**VENDOR-AGNOSTIC, PRAGMATIC MULTI-TENANCY FOR PRODUCTION DEPLOYMENT**

This specification provides a comprehensive, execution-ready plan for introducing robust multi-tenancy (MT) across the entire BerkoTNF application with minimal downtime and clear audit trails.

---

## A. Executive Summary

### Why Multi-Tenancy Now

The BerkoTNF RSVP system specification (`docs/SPEC_in_out_functionality_plan.md`) requires tenant-aware functionality across the entire application stack:

- **RSVP Token Uniqueness**: Invite tokens must be unique per tenant, not globally
- **Activity Feed Isolation**: Each tenant needs isolated activity streams
- **Push Notifications**: Tenant-scoped notification ledgers and rate limiting
- **Advisory Locks**: Tenant-aware match locking to prevent cross-tenant race conditions
- **Background Jobs**: Tenant context propagation through worker system
- **Data Isolation**: Complete tenant separation for regulatory compliance

### Non-Goals & Out-of-Scope

- **Multi-tenant UI**: Frontend remains single-tenant focused
- **Tenant onboarding flows**: Admin-managed tenant provisioning only
- **Billing/subscription management**: Outside scope of this implementation
- **Cross-tenant data sharing**: Strict isolation model
- **Tenant branding/customization**: UI remains unified

### High-Level Approach

**Phase 1**: Single-tenant-but-MT-ready scaffold
- Add `tenant_id` columns with default tenant backfill
- Update all database queries to include tenant context
- Implement tenant resolution middleware

**Phase 2**: Feature work activation
- Enable RLS policies
- Activate tenant-aware locks and rate limiting
- Deploy RSVP functionality with tenant-scoped tokens

---

## B. Current-State Inventory

### Database Tables in Production

Based on Prisma schema analysis, the following tables are actively used and require MT enablement:

#### Core Match & Player Tables
- **`players`** (134 rows): `player_id` PK, unique constraint on `name`
- **`upcoming_matches`** (697 rows): `upcoming_match_id` PK, match state management
- **`upcoming_match_players`** (11,638 rows): Player-match assignments
- **`match_player_pool`** (11,440 rows): RSVP response tracking
- **`matches`** (697 rows): Historical match data
- **`player_matches`** (11,652 rows): Historical player performance

#### Configuration Tables
- **`app_config`** (31 rows): Application settings
- **`team_slots`** (0 rows, RLS enabled): Team assignment slots
- **`team_size_templates`** (7 rows): Match format templates
- **`team_balance_weights`** (15 rows): Algorithm configuration

#### Background Processing
- **`background_job_status`** (57 rows, RLS enabled): Job queue with `tenant_id` column already present
- **`debug_logs`** (278 rows): System debugging

#### Aggregated Statistics (30+ tables)
All `aggregated_*` tables for caching player stats, performance ratings, and historical data.

### Current RLS Policies

Only 2 RLS policies currently exist:
1. **`background_job_status`**: "Allow all operations" for public role
2. **`team_slots`**: "Allow all operations" for authenticated role

### Prisma Schema Models

Located in `prisma/schema.prisma` with 40+ models. Key models for MT:
- `upcoming_matches`, `match_player_pool`, `players`
- `background_job_status` (already has `tenant_id` field)
- All aggregated statistics tables

### Database Access Patterns

**API Routes Pattern**: All routes in `src/app/api/` use Prisma client via `src/lib/prisma.ts`

**Key Access Files**:
- `src/app/api/playerprofile/route.ts`: Complex multi-table queries
- `src/app/api/admin/upcoming-matches/route.ts`: Match management
- `src/app/api/admin/match-player-pool/route.ts`: RSVP data access
- `src/app/api/admin/trigger-stats-update/route.ts`: Background job coordination

**Database Client**: Single Prisma instance with query logging enabled

### Current Single-Tenant Assumptions

1. **Global player name uniqueness**: `UNIQUE(name)` constraint
2. **Single active match**: `is_active` boolean without tenant scoping
3. **Global configuration**: `app_config` shared across all contexts
4. **Token uniqueness**: No current token system, but RSVP spec requires per-tenant uniqueness

### External IDs & Tokens

**Current State**: No external token system implemented
**RSVP Requirements**: 
- `invite_token` with secure hashing per tenant
- Push notification tokens (tenant-scoped)
- Match invitation tokens for public RSVP access

---

## C. Target Architecture

### Tenant Model

**What is a Tenant**: A club/organization using BerkoTNF
- **Identifier**: UUID (`tenant_id`)
- **Storage**: New `tenants` table with metadata
- **Resolution**: Middleware extracts from session, token, or job context

**Tenant Resolution Contexts**:
- **Admin routes**: From authenticated session/organization
- **Public RSVP routes**: Derived from `(matchId, invite_token)` → hash lookup → tenant
- **Background workers**: Persisted in job payload, set before DB operations

### Tenant Context Propagation

```typescript
// Request → Middleware → Services → Prisma → Database
Request Headers/Token → tenantId → Prisma.where({ tenant_id }) → SQL
```

**Implementation Points**:
1. **API Route Middleware**: Extract tenant from session/token
2. **Prisma Query Wrapper**: Auto-inject `tenant_id` in WHERE clauses
3. **Background Job Payload**: Include `tenant_id` in all job data
4. **RLS Session Context**: `set_config('app.tenant_id', $tenantUuid, false)`

### Tenant-Aware Advisory Locks

Replace current `withMatchLock` pattern:

```typescript
// Before (global)
withMatchLock(matchId, callback)

// After (tenant-scoped)
withTenantMatchLock(tenantId, matchId, callback)
```

**Implementation**: PostgreSQL advisory locks with tenant-specific keys:
```sql
SELECT pg_advisory_lock(hashtext(tenant_id::text), match_id);
```

### Tenant-Scoped Rate Limiting

**Current**: No rate limiting implemented
**Target**: Tenant-prefixed keys for RSVP endpoints

```typescript
// Rate limit key pattern
const rateLimitKey = `rsvp:${tenantId}:${playerId}:${timeWindow}`;
```

### Token Hashing Uniqueness Per Tenant

**Pattern**: `(tenant_id, token_hash)` composite unique constraints
```sql
-- Example for invite tokens
UNIQUE(tenant_id, invite_token_hash)
```

### Logging & Metrics

**Log Format**: Include `tenant_id` in all structured logs
**PII Masking**: Mask phone numbers, preserve tenant context
**Metrics**: Per-tenant dashboards for fill rates, conversion rates

---

## D. Data Model Changes

### New Tables

#### Tenants Table
```sql
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL, -- URL-friendly identifier
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb
);
```

#### Match Invitations (for RSVP)
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
    UNIQUE(tenant_id, upcoming_match_id) -- One invite per match per tenant
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

#### Push Tokens
```sql
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    player_id INT REFERENCES players(player_id),
    token_hash VARCHAR(255) NOT NULL,
    platform VARCHAR(20) NOT NULL, -- ios, android, web
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(tenant_id, token_hash)
);
```

### Core Table Modifications

#### Players Table
```sql
-- Add tenant_id column
ALTER TABLE players ADD COLUMN tenant_id UUID;

-- Update unique constraint to be tenant-scoped
ALTER TABLE players DROP CONSTRAINT unique_player_name;
ALTER TABLE players ADD CONSTRAINT unique_player_name_per_tenant 
    UNIQUE(tenant_id, name);

-- Add tenant reference after backfill
ALTER TABLE players ADD CONSTRAINT fk_players_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
```

#### Upcoming Matches Table
```sql
-- Add tenant_id and RSVP configuration
ALTER TABLE upcoming_matches ADD COLUMN tenant_id UUID;
ALTER TABLE upcoming_matches ADD COLUMN allow_self_serve_booking BOOLEAN DEFAULT false;
ALTER TABLE upcoming_matches ADD COLUMN auto_balance_when_full BOOLEAN DEFAULT true;
ALTER TABLE upcoming_matches ADD COLUMN auto_lock_when_full BOOLEAN DEFAULT false;
ALTER TABLE upcoming_matches ADD COLUMN invite_mode VARCHAR(20) DEFAULT 'all_at_once';
ALTER TABLE upcoming_matches ADD COLUMN capacity INT; -- Total player capacity

-- Update active match constraint to be tenant-scoped
CREATE UNIQUE INDEX idx_upcoming_matches_active_per_tenant 
    ON upcoming_matches(tenant_id) WHERE is_active = true;
```

#### Match Player Pool Table
```sql
-- Add tenant_id and waitlist position
ALTER TABLE match_player_pool ADD COLUMN tenant_id UUID;
ALTER TABLE match_player_pool ADD COLUMN waitlist_position INT;
ALTER TABLE match_player_pool ADD COLUMN offered_at TIMESTAMPTZ;
ALTER TABLE match_player_pool ADD COLUMN offer_expires_at TIMESTAMPTZ;

-- Update unique constraint to be tenant-scoped
ALTER TABLE match_player_pool DROP CONSTRAINT match_player_pool_upcoming_match_id_player_id_key;
ALTER TABLE match_player_pool ADD CONSTRAINT unique_match_player_per_tenant 
    UNIQUE(tenant_id, upcoming_match_id, player_id);

-- Partial unique index for waitlist positions
CREATE UNIQUE INDEX idx_waitlist_position_per_match 
    ON match_player_pool(tenant_id, upcoming_match_id, waitlist_position) 
    WHERE waitlist_position IS NOT NULL;
```

#### Background Job Status Table
```sql
-- Table already has tenant_id, add constraints
ALTER TABLE background_job_status ADD CONSTRAINT fk_background_jobs_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

-- Update index to include tenant_id
CREATE INDEX idx_background_job_status_tenant_status 
    ON background_job_status(tenant_id, status);
```

#### App Config Table
```sql
-- Add tenant_id for tenant-specific configuration
ALTER TABLE app_config ADD COLUMN tenant_id UUID;

-- Update unique constraint to allow per-tenant config overrides
ALTER TABLE app_config DROP CONSTRAINT app_config_config_key_unique;
CREATE UNIQUE INDEX idx_app_config_key_per_tenant 
    ON app_config(tenant_id, config_key) 
    WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX idx_app_config_key_global 
    ON app_config(config_key) 
    WHERE tenant_id IS NULL;
```

### Aggregated Tables Pattern

All 30+ `aggregated_*` tables follow the same pattern:
```sql
-- Example for aggregated_player_profile_stats
ALTER TABLE aggregated_player_profile_stats ADD COLUMN tenant_id UUID;
ALTER TABLE aggregated_player_profile_stats ADD CONSTRAINT fk_stats_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

-- Update unique constraints to include tenant_id
-- (Specific constraints vary per table)
```

### Indexes for Performance

Key indexes with `tenant_id` leading for hot query paths:
```sql
-- Hot query patterns
CREATE INDEX idx_players_tenant_active ON players(tenant_id, is_retired) WHERE is_retired = false;
CREATE INDEX idx_upcoming_matches_tenant_date ON upcoming_matches(tenant_id, match_date);
CREATE INDEX idx_match_pool_tenant_status ON match_player_pool(tenant_id, response_status);
CREATE INDEX idx_notifications_tenant_player ON notification_ledger(tenant_id, player_id, sent_at);
```

---

## E. Migration Plan (Zero/Minimal Downtime)

### Default Tenant Setup
```sql
-- Create default tenant for existing data
INSERT INTO tenants (tenant_id, slug, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'berko-tnf', 'Berko TNF');

-- Store as constant for migrations
SET DEFAULT_TENANT_UUID = '00000000-0000-0000-0000-000000000001';
```

### Step 1: Add Nullable Tenant Columns
```sql
-- Core tables (can run during normal operation)
ALTER TABLE players ADD COLUMN tenant_id UUID;
ALTER TABLE upcoming_matches ADD COLUMN tenant_id UUID;
ALTER TABLE match_player_pool ADD COLUMN tenant_id UUID;
ALTER TABLE match_invites ADD COLUMN tenant_id UUID;
-- ... repeat for all MT tables

-- Rollback: ALTER TABLE players DROP COLUMN tenant_id;
```

### Step 2: Backfill with Default Tenant
```sql
-- Backfill in batches to avoid long locks
UPDATE players SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

UPDATE upcoming_matches SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Continue for all tables...

-- Validation query after each table:
SELECT 'players', COUNT(*) as total, COUNT(tenant_id) as backfilled 
FROM players;
```

### Step 3: Add NOT NULL Constraints and Indexes
```sql
-- Make tenant_id required (brief lock per table)
ALTER TABLE players ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE upcoming_matches ALTER COLUMN tenant_id SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE players ADD CONSTRAINT fk_players_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

-- Build indexes CONCURRENTLY (no locks)
CREATE INDEX CONCURRENTLY idx_players_tenant_active 
    ON players(tenant_id, is_retired) WHERE is_retired = false;
```

### Step 4: Update Unique Constraints
```sql
-- Replace global unique constraints with tenant-scoped ones
ALTER TABLE players DROP CONSTRAINT unique_player_name;
ALTER TABLE players ADD CONSTRAINT unique_player_name_per_tenant 
    UNIQUE(tenant_id, name);

-- For composite constraints, drop and recreate
ALTER TABLE match_player_pool DROP CONSTRAINT match_player_pool_upcoming_match_id_player_id_key;
ALTER TABLE match_player_pool ADD CONSTRAINT unique_match_player_per_tenant 
    UNIQUE(tenant_id, upcoming_match_id, player_id);
```

### Step 5: Create Tenant Consistency Triggers
```sql
-- Ensure cross-table tenant consistency
CREATE OR REPLACE FUNCTION validate_tenant_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- Example: match_player_pool entries must match upcoming_matches tenant
    IF TG_TABLE_NAME = 'match_player_pool' THEN
        IF NOT EXISTS (
            SELECT 1 FROM upcoming_matches 
            WHERE upcoming_match_id = NEW.upcoming_match_id 
            AND tenant_id = NEW.tenant_id
        ) THEN
            RAISE EXCEPTION 'Tenant mismatch: match_player_pool.tenant_id must match upcoming_matches.tenant_id';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER trg_match_pool_tenant_consistency
    BEFORE INSERT OR UPDATE ON match_player_pool
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_consistency();
```

### Rollback Strategy

Each step has a clear rollback path:
1. **Step 1**: `ALTER TABLE DROP COLUMN tenant_id`
2. **Step 2**: No rollback needed (data remains valid)
3. **Step 3**: `ALTER TABLE ALTER COLUMN tenant_id DROP NOT NULL`
4. **Step 4**: Recreate original constraints
5. **Step 5**: `DROP TRIGGER`, `DROP FUNCTION`

---

## F. Row-Level Security (RLS)

### Session Context Approach

Set tenant context for every request:
```sql
-- In middleware/API routes
SELECT set_config('app.tenant_id', $1, false);
```

### RLS Policies Per Table

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

-- Admin: Full CRUD within tenant
CREATE POLICY upcoming_matches_admin_policy ON upcoming_matches
    FOR ALL TO authenticated
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Public: Read-only for RSVP pages
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
-- Already has RLS enabled
-- Update existing policy to be tenant-aware
DROP POLICY "Allow all operations on background_job_status" ON background_job_status;

CREATE POLICY background_jobs_tenant_policy ON background_job_status
    FOR ALL TO authenticated
    USING (
        tenant_id = current_setting('app.tenant_id')::uuid
        OR tenant_id IS NULL -- Allow global jobs
    );
```

### Staging Plan for RLS Enablement

1. **Phase 1**: Create policies but keep RLS disabled
2. **Phase 2**: Enable RLS on non-critical tables first (logs, cache)
3. **Phase 3**: Enable on core tables with feature flag protection
4. **Phase 4**: Full RLS enforcement after validation

---

## G. App Changes (Code Touch Points)

### Tenant Resolution Middleware

**File**: `src/lib/tenantContext.ts`
```typescript
export async function getTenantContext(request: Request): Promise<string> {
  // Admin routes: from session
  if (request.url.includes('/admin/')) {
    return getTenantFromSession(request);
  }
  
  // Public RSVP routes: from token
  if (request.url.includes('/upcoming/match/')) {
    return getTenantFromInviteToken(request);
  }
  
  throw new Error('Unable to resolve tenant context');
}
```

### Prisma Query Wrapper

**File**: `src/lib/prismaWithTenant.ts`
```typescript
export class TenantAwarePrisma {
  constructor(private prisma: PrismaClient, private tenantId: string) {}
  
  get players() {
    return {
      findMany: (args = {}) => this.prisma.players.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      // ... other methods
    };
  }
}
```

### API Route Updates

**Pattern**: Update all API routes to use tenant-aware Prisma

**Example**: `src/app/api/admin/upcoming-matches/route.ts`
```typescript
// Before
const matches = await prisma.upcoming_matches.findMany({
  where: { is_active: true }
});

// After
const tenantId = await getTenantContext(request);
const matches = await prisma.upcoming_matches.findMany({
  where: { tenant_id: tenantId, is_active: true }
});
```

### Advisory Lock Helper

**File**: `src/lib/tenantLocks.ts`
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

### Rate Limiting Updates

**File**: `src/lib/rateLimiting.ts`
```typescript
export function getTenantRateLimitKey(
  tenantId: string,
  endpoint: string,
  identifier: string
): string {
  return `rate_limit:${tenantId}:${endpoint}:${identifier}`;
}
```

### Background Job Updates

**File**: `src/app/api/admin/trigger-stats-update/route.ts`
```typescript
// Update job payload to include tenant context
const jobPayload = {
  tenant_id: tenantId,
  triggered_by: 'admin',
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

### Files Requiring Updates

**API Routes** (60+ files in `src/app/api/`):
- All admin routes: Add tenant resolution
- All database queries: Add tenant_id to WHERE clauses
- Background job triggers: Include tenant_id in payloads

**Hooks** (`src/hooks/`):
- `useMatchData.hook.ts`: Add tenant context
- `usePlayerData.hook.ts`: Tenant-scoped player queries

**Services** (`src/services/`):
- `TeamBalance.service.ts`: Tenant-aware team balancing
- `TeamAPI.service.ts`: Add tenant context to API calls

**Transform Functions** (`src/lib/transform/`):
- `player.transform.ts`: Handle tenant-aware player data

---

## H. API Surface & Contracts

### Request/Response Changes

**No Breaking Changes**: All tenant resolution happens server-side

**Internal Changes**:
- Add tenant context to request processing
- Database queries automatically scoped to tenant
- Error messages remain unchanged

### RSVP Public API

**New Endpoints**:
```typescript
// Public RSVP endpoint
GET /api/rsvp/match/[matchId]?token=<invite_token>

// Response includes tenant-derived match data
{
  success: true,
  data: {
    match: { /* match details */ },
    player: { /* resolved from token */ },
    rsvp_status: "IN" | "OUT" | "WAITLIST"
  }
}
```

### Backward Compatibility

**Admin Interface**: No changes to existing admin API contracts
**Mobile App**: Existing endpoints continue to work with tenant context resolved server-side

---

## I. Background Jobs / Workers

### Current Job Types

Based on `src/app/api/admin/trigger-stats-update/route.ts`:
1. `call-update-half-and-full-season-stats`
2. `call-update-all-time-stats`
3. `call-update-hall-of-fame`
4. `call-update-recent-performance`
5. `call-update-season-honours-and-records`
6. `call-update-match-report-cache`
7. `call-update-personal-bests`
8. `call-update-player-profile-stats`
9. `call-update-player-teammate-stats`
10. `call-update-season-race-data`
11. `call-update-power-ratings`

### Tenant Context Threading

**Job Enqueue**: Always include `tenant_id` in job payload
```typescript
const jobPayload = {
  tenant_id: tenantId,
  job_type: 'stats_update',
  triggered_by: source,
  request_id: crypto.randomUUID()
};
```

**Worker Processing**: Set tenant context before any database operations
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

### Job Isolation

**No Cross-Tenant Coalescing**: Jobs for different tenants never combined
**Tenant-Specific Queues**: Optional enhancement for load isolation
**Idempotency Keys**: Include tenant_id in uniqueness calculation

---

## J. Testing Strategy

### Unit Tests

**New Test Categories**:
1. **Tenant Resolution**: Middleware correctly extracts tenant from various contexts
2. **Query Scoping**: Prisma wrapper adds tenant_id to all queries
3. **Advisory Locks**: Tenant-scoped locks prevent cross-tenant interference
4. **Token Uniqueness**: Invite tokens unique per tenant, not globally

**Example Test**: `src/lib/__tests__/tenantContext.test.ts`
```typescript
describe('Tenant Context Resolution', () => {
  it('should extract tenant from admin session', async () => {
    const mockRequest = createMockAdminRequest();
    const tenantId = await getTenantContext(mockRequest);
    expect(tenantId).toBe('expected-tenant-uuid');
  });
  
  it('should extract tenant from RSVP token', async () => {
    const mockRequest = createMockRSVPRequest();
    const tenantId = await getTenantContext(mockRequest);
    expect(tenantId).toBe('token-derived-tenant-uuid');
  });
});
```

### Integration Tests

**RSVP Flow Testing**:
1. **Token Generation**: Admin creates match with RSVP enabled
2. **Public Access**: Player accesses via invite token
3. **Tenant Isolation**: Verify no cross-tenant data leakage

**Background Job Testing**:
1. **Tenant Propagation**: Jobs process only tenant-scoped data
2. **Isolation**: Multiple tenant jobs don't interfere
3. **Error Handling**: Failed jobs don't affect other tenants

### RLS Testing

**Positive Tests**: Verify users can access their tenant's data
**Negative Tests**: Verify users cannot access other tenants' data

```sql
-- Test script example
SET app.tenant_id = 'tenant-a-uuid';
SELECT COUNT(*) FROM players; -- Should return tenant A players only

SET app.tenant_id = 'tenant-b-uuid';
SELECT COUNT(*) FROM players; -- Should return tenant B players only
```

### Concurrency Testing

**Advisory Lock Testing**: Verify tenant-scoped locks work correctly
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

### Test Data & Fixtures

**Multi-Tenant Fixtures**: Create test data for multiple tenants
**Isolation Validation**: Automated tests to verify no data bleeding

---

## K. Observability & Ops

### Logging Updates

**Structured Logging Format**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "Player RSVP updated",
  "tenant_id": "tenant-uuid",
  "player_id": "123",
  "match_id": "456",
  "phone": "***-***-5678" // Masked PII
}
```

**Implementation**: Update all log statements to include tenant context

### Metrics & Dashboards

**Per-Tenant Metrics**:
- RSVP conversion rates by tenant
- Match fill rates by tenant
- Background job success/failure rates by tenant
- API response times by tenant

**Alerting Thresholds**:
- Per-tenant error rate spikes
- Cross-tenant data access attempts (security)
- Background job failures by tenant

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

---

## L. Rollout Plan

### Phase 0: Infrastructure Preparation

**Timeline**: Week 1-2
- [ ] Create `tenants` table and default tenant
- [ ] Run migration steps 1-2 (add columns, backfill data)
- [ ] Deploy tenant resolution middleware (disabled)
- [ ] Update Prisma queries with feature flag protection

**Success Criteria**: 
- All tables have `tenant_id` columns populated
- No application functionality changes
- Database performance unaffected

### Phase 1: Code Deployment

**Timeline**: Week 3
- [ ] Enable tenant-aware Prisma queries via feature flag
- [ ] Deploy advisory lock helpers
- [ ] Update background job system to include tenant context
- [ ] Enable structured logging with tenant_id

**Success Criteria**:
- All database queries scoped to default tenant
- Background jobs process correctly with tenant context
- No user-facing changes

### Phase 2: RLS Enablement

**Timeline**: Week 4
- [ ] Enable RLS on non-critical tables (logs, cache)
- [ ] Enable RLS on core tables with monitoring
- [ ] Validate no cross-tenant data access
- [ ] Performance testing under RLS

**Success Criteria**:
- RLS policies enforce tenant isolation
- Application performance within acceptable limits
- Security audit passes

### Phase 3: RSVP Feature Activation

**Timeline**: Week 5-6
- [ ] Deploy RSVP endpoints with tenant-scoped tokens
- [ ] Create match invitation system
- [ ] Enable tenant-aware rate limiting
- [ ] Launch public RSVP functionality

**Success Criteria**:
- RSVP system fully functional
- Tenant isolation verified in production
- Performance monitoring shows healthy metrics

### Data Validation Checklist

After each phase:
- [ ] Run tenant consistency queries
- [ ] Verify no NULL tenant_id values
- [ ] Check cross-tenant data isolation
- [ ] Validate background job processing
- [ ] Review security audit logs

### Owner Assignments

- **Database Migrations**: Senior Backend Engineer
- **API Updates**: Full-stack Team Lead
- **RLS Implementation**: Database Administrator
- **RSVP Frontend**: Frontend Engineer
- **Testing & QA**: QA Team Lead
- **Monitoring Setup**: DevOps Engineer

### Communication Plan

**Week -1**: Team briefing on MT architecture
**Week 1**: Daily standup updates during migration
**Week 3**: Stakeholder demo of tenant-aware system
**Week 5**: Go-live communication and monitoring setup

---

## M. Risk Register & Mitigations

### High-Impact Risks

#### 1. Unique Constraint Violations During Migration

**Risk**: Existing data has duplicate names across what will become different tenants
**Probability**: Medium
**Impact**: High (migration failure)

**Mitigation**:
- Pre-migration analysis to identify potential duplicates
- Data cleanup scripts before constraint updates
- Rollback plan for constraint failures

#### 2. Cross-Tenant Data Leakage

**Risk**: RLS policies or query scoping bugs allow tenant data access
**Probability**: Low
**Impact**: Critical (security/compliance)

**Mitigation**:
- Comprehensive RLS testing in staging
- Security audit before production deployment
- Monitoring alerts for cross-tenant access attempts
- Gradual RLS rollout with immediate rollback capability

#### 3. Background Job Tenant Context Loss

**Risk**: Jobs process without tenant context, affecting all tenants
**Probability**: Medium
**Impact**: High (data corruption)

**Mitigation**:
- Mandatory tenant_id in all job payloads
- Worker validation to reject jobs without tenant context
- Separate staging environment for job testing
- Job isolation testing

#### 4. Performance Degradation from RLS

**Risk**: RLS policies slow down queries significantly
**Probability**: Medium
**Impact**: Medium (user experience)

**Mitigation**:
- Performance testing with RLS enabled in staging
- Index optimization for tenant-scoped queries
- Query plan analysis and optimization
- Gradual rollout with performance monitoring

### Medium-Impact Risks

#### 5. Advisory Lock Contention

**Risk**: Tenant-scoped locks create unexpected bottlenecks
**Probability**: Low
**Impact**: Medium

**Mitigation**:
- Lock timeout configuration
- Monitoring for lock wait times
- Fallback strategies for lock failures

#### 6. Migration Downtime

**Risk**: Database migrations take longer than expected
**Probability**: Medium
**Impact**: Medium

**Mitigation**:
- Practice migrations in staging environment
- Use CONCURRENTLY for index creation
- Batch processing for large data updates
- Maintenance window planning

### Fallback Strategies

**Immediate Rollback**: Feature flags allow instant revert to single-tenant mode
**Partial Rollback**: RLS can be disabled per table if issues arise
**Data Recovery**: All migration steps have documented rollback procedures
**Alternative Processing**: Background jobs can fall back to edge functions

---

## N. Acceptance Criteria

### Database Layer

- [ ] All core tables have `tenant_id` columns with NOT NULL constraints
- [ ] Unique constraints updated to be tenant-scoped (e.g., `(tenant_id, name)`)
- [ ] Foreign key relationships maintain tenant consistency
- [ ] RLS policies enforce tenant isolation on all sensitive tables
- [ ] Advisory locks work correctly with tenant scoping
- [ ] Background job table properly tracks tenant context

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
- [ ] Push notification tokens scoped to tenant
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
- [ ] No memory leaks in tenant context management
- [ ] Graceful degradation when tenant context unavailable

### Monitoring & Operations

- [ ] All logs include tenant_id field
- [ ] Per-tenant metrics available in monitoring dashboard
- [ ] Alerts configured for cross-tenant access attempts
- [ ] Data consistency checks automated and scheduled
- [ ] Rollback procedures documented and tested

---

## O. Appendix

### SQL Migration Scripts

#### Create Tenants Table
```sql
-- Create the tenants table
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

-- Create indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE is_active = true;
```

#### Players Table Migration
```sql
-- Step 1: Add nullable tenant_id
ALTER TABLE players ADD COLUMN tenant_id UUID;

-- Step 2: Backfill with default tenant
UPDATE players 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Step 3: Make required and add constraints
ALTER TABLE players ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE players ADD CONSTRAINT fk_players_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

-- Step 4: Update unique constraint
ALTER TABLE players DROP CONSTRAINT unique_player_name;
ALTER TABLE players ADD CONSTRAINT unique_player_name_per_tenant 
    UNIQUE(tenant_id, name);

-- Step 5: Add performance indexes
CREATE INDEX CONCURRENTLY idx_players_tenant_active 
    ON players(tenant_id, is_retired) WHERE is_retired = false;
```

#### RLS Policy Examples
```sql
-- Enable RLS on players table
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Admin policy: full access within tenant
CREATE POLICY players_admin_policy ON players
    FOR ALL TO authenticated
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Public policy: read-only for RSVP
CREATE POLICY players_public_read ON players
    FOR SELECT TO public
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Service role: bypass RLS for background jobs
ALTER TABLE players FORCE ROW LEVEL SECURITY;
```

### Prisma Schema Updates

#### Tenant Model
```prisma
model tenants {
  tenant_id UUID      @id @default(dbgenerated("gen_random_uuid()"))
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
  push_tokens        push_tokens[]
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

### Code Templates

#### Tenant Context Middleware
```typescript
// src/lib/middleware/tenantContext.ts
import { NextRequest } from 'next/server';

export async function getTenantContext(request: NextRequest): Promise<string> {
  const pathname = request.nextUrl.pathname;
  
  // Admin routes: extract from session/auth
  if (pathname.startsWith('/api/admin/')) {
    return await getTenantFromSession(request);
  }
  
  // Public RSVP routes: extract from invite token
  if (pathname.includes('/rsvp/') || pathname.includes('/upcoming/match/')) {
    const token = request.nextUrl.searchParams.get('token');
    if (token) {
      return await getTenantFromInviteToken(token);
    }
  }
  
  // Background job routes: from job payload
  if (pathname.startsWith('/api/internal/')) {
    return await getTenantFromJobContext(request);
  }
  
  throw new Error(`Unable to resolve tenant context for ${pathname}`);
}

async function getTenantFromSession(request: NextRequest): Promise<string> {
  // Implementation depends on auth system
  // For now, return default tenant
  return '00000000-0000-0000-0000-000000000001';
}

async function getTenantFromInviteToken(token: string): Promise<string> {
  const tokenHash = await hashToken(token);
  
  const invite = await prisma.match_invites.findFirst({
    where: { invite_token_hash: tokenHash },
    select: { tenant_id: true }
  });
  
  if (!invite) {
    throw new Error('Invalid invite token');
  }
  
  return invite.tenant_id;
}
```

#### Tenant-Aware Prisma Wrapper
```typescript
// src/lib/prismaWithTenant.ts
import { PrismaClient } from '@prisma/client';

export class TenantAwarePrisma {
  constructor(
    private prisma: PrismaClient, 
    private tenantId: string
  ) {}
  
  get players() {
    return {
      findMany: (args: any = {}) => this.prisma.players.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prisma.players.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prisma.players.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prisma.players.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prisma.players.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }
  
  get upcoming_matches() {
    return {
      findMany: (args: any = {}) => this.prisma.upcoming_matches.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      // ... other methods
    };
  }
}

// Usage in API routes
export async function createTenantPrisma(request: NextRequest) {
  const tenantId = await getTenantContext(request);
  return new TenantAwarePrisma(prisma, tenantId);
}
```

#### Advisory Lock Helper
```typescript
// src/lib/tenantLocks.ts
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

function hashString(input: string): number {
  const hash = createHash('sha256').update(input).digest('hex');
  // Convert first 8 hex chars to signed 32-bit integer
  return parseInt(hash.substring(0, 8), 16) | 0;
}

export async function withTenantMatchLock<T>(
  tenantId: string,
  matchId: number,
  callback: () => Promise<T>
): Promise<T> {
  const lockKey1 = hashString(tenantId);
  const lockKey2 = matchId;
  
  console.log(`Acquiring tenant lock: ${tenantId} (${lockKey1}), match ${matchId} (${lockKey2})`);
  
  try {
    await prisma.$executeRaw`SELECT pg_advisory_lock(${lockKey1}, ${lockKey2})`;
    console.log(`Lock acquired for tenant ${tenantId}, match ${matchId}`);
    
    return await callback();
  } finally {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${lockKey1}, ${lockKey2})`;
    console.log(`Lock released for tenant ${tenantId}, match ${matchId}`);
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

#### Rate Limiting Helper
```typescript
// src/lib/tenantRateLimit.ts
export class TenantRateLimit {
  constructor(private tenantId: string) {}
  
  getRateLimitKey(endpoint: string, identifier: string): string {
    return `rate_limit:${this.tenantId}:${endpoint}:${identifier}`;
  }
  
  async checkRateLimit(
    endpoint: string, 
    identifier: string, 
    limit: number, 
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const key = this.getRateLimitKey(endpoint, identifier);
    
    // Implementation depends on rate limiting backend (Redis, etc.)
    // For now, return allowed
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: new Date(Date.now() + windowMs)
    };
  }
}

// Usage in API routes
export async function checkTenantRateLimit(
  tenantId: string,
  endpoint: string,
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
) {
  const rateLimiter = new TenantRateLimit(tenantId);
  return await rateLimiter.checkRateLimit(endpoint, identifier, limit, windowMs);
}
```

---

**Document Status**: Ready for Implementation
**Next Steps**: Begin Phase 0 infrastructure preparation
**Contact**: Senior Staff Engineer for questions and clarifications

This specification provides a complete, actionable plan for implementing multi-tenancy across the BerkoTNF application. Each section contains concrete implementation details, file paths, and code examples specific to the existing codebase architecture.

