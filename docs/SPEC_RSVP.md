# Capo RSVP & Player Invitation System — Consolidated Implementation Specification

**Version 4.3.0-updated • Updated January 2025**

**UPDATE NOTES (v4.3.0):**
- Updated to align with completed multi-tenancy implementation (Phase 2 patterns)
- Updated to align with auth implementation (v6.0 - Phone-Only + Club Creation)
- Replaced RLS enforcement with `withTenantFilter()` helper pattern
- Updated all API patterns to use `withTenantContext` wrapper
- Removed duplicate phone/email fields (already exist from auth)
- Updated React Query patterns to match `queryKeys.ts`
- Updated tenant resolution to use `getTenantFromRequest()`
- Clarified background job integration with `withBackgroundTenantContext`

**PREVIOUS CONSOLIDATION (v4.2.0):**
- Removed calendar integration (out of scope)
- Simplified auto-balance coverage (leverages existing implementation)
- Aligned with actual codebase patterns (worker HTTP calls, method name mapping)
- Reduced redundancy while preserving all critical technical details

---

**BUILDING ON COMPLETED MULTI-TENANCY & AUTH FOUNDATIONS**

This specification builds on **fully implemented infrastructure**:

**Multi-Tenancy (COMPLETE ✅):**
- All 33+ tables tenant-scoped with `tenant_id` fields
- Defense-in-depth: Explicit filtering + RLS on auth tables
- `withTenantFilter()` helper for type-safe queries
- `withTenantContext()` wrapper for automatic context propagation
- See `SPEC_multi_tenancy.md` v2.1.0 for architecture details

**Authentication (COMPLETE ✅):**
- Phone-only auth via Supabase (all users)
- Players table has: `phone`, `email`, `auth_user_id`, `is_admin`
- Auto-linking via phone number matching
- Deep links configured (`capo://match/123`)
- See `SPEC_auth.md` v6.0 for authentication patterns

**Dependencies:** 
- `SPEC_auth.md` (v6.0) - Phone authentication, admin privileges, auto-linking
- `SPEC_multi_tenancy.md` (v2.1.0) - Tenant isolation, security patterns
- All authentication and tenant logic is defined in those specs
- This spec focuses **only** on RSVP booking logic

---

## **Human Overview — How It Works**

### **1) What the admin does**

**Create match as usual.** Set capacity (e.g., 20 players for 10v10).

**If they want self-serve bookings:** toggle "Allow self-serve booking" and configure:
- **Invite mode:** "All at once" or "Tiered" (A/B/C windows)
- **Auto-balance:** Automatically balance teams when match fills (default OFF)
- **Auto-lock:** Automatically lock pool when full (default OFF)

**Share one link** in WhatsApp: "Book for Sunday's match: [link]"

**Watch real-time updates** in Match Control Centre:
- Live counters: "Booked 15/20" • "Waitlist 3"
- Player lists with source badges: 📱 App, 🌐 Web, 👤 Admin, 🎯 Guest
- Activity feed showing timeline of all RSVP events

**Add guests manually** using existing "Add Player" modal.

**Teams auto-balance when full** (if enabled):
- Triggers when confirmed IN count reaches capacity
- On dropout below capacity: Teams unbalance automatically
- On refill to capacity: Auto-balance triggers again
- Uses existing balance system at `/api/admin/balance-teams`

**When ready:** Lock Pool → Balance Teams → Complete (unchanged workflow).

### **2) What regular players see/do**

**Tap the shared deep link:** Opens in app with immediate RSVP interface for authenticated users, or SMS verification for new users.

**Three simple actions:**
- **IN** - "I'm coming" (counts toward capacity)
- **OUT** - "Can't make it" (with optional "Might be available later")
- **Join Waitlist** - if match is full

**Real-time updates:** Live booking count, push notifications, view teams once balanced.

**Waitlist system:** Top-3 simultaneous offers when someone drops out, first to claim wins, dynamic offer timing (4h/1h/30min based on proximity to kick-off).

**Last-call notifications:** Fixed windows at T-12h and T-3h if match is short.

### **3) Who gets invited when**

**All at once (default):** Anyone with link can book immediately.

**Tiered mode:** Time-based windows - Tier A (regulars) first, Tier B (semi-regulars) later, Tier C (casuals/default) last. New players default to Tier C; admins manually promote to A or B.

**Who gets notifications:** Regular players get tier-open and last-call pushes. Guests excluded from auto-notifications but receive transactional pushes (teams released, cancellation, waitlist offers).

### **4) Waitlist & offers**

Grace period after dropout (5min/2min/1min based on time to kick-off). Top-3 simultaneous offers, first to claim wins. Dynamic TTL (4h/1h/30min/instant). Auto-cascade until spot claimed or waitlist empty.

### **5) Smart notifications**

Push-only via Capacitor (FCM/APNs). Tier-open, waitlist offers, last-call, teams released, cancellation. Spam protection: max 3 last-call per player per match, 6-hour cooldown, batching.

### **6) Admin Match Control Centre**

Enhanced booking panel with live counters, invite mode selection, auto-balance controls (method dropdown + enable checkbox), player lists with badges, activity feed, manual triggers, waitlist dashboard.

### **7) Guests explained**

Guest players admin brings occasionally. Don't self-book, admin adds manually, don't get invite/last-call pushes, DO get transactional pushes. Can be promoted to regulars via `is_ringer=false` toggle.

---

## **0) Scope & Goals**

Add RSVP functionality to keep matches full with minimal admin effort.

**In scope:**
- Two match modes: Manual only (default) | Self-serve booking
- Invitations & responses (IN/OUT/WAITLIST) with tier windows
- Waitlist with simultaneous offers and TTL
- Native push notifications via Capacitor
- Enhanced admin features: audit trail, activity feed, auto-balance integration
- Production reliability: concurrency protection, rate limiting, security

**Out of scope:**
- Payment processing and billing
- Season memberships
- Complex pricing/credits

---

## **1) Guiding Principles**

- **No new match states.** RSVP in Draft; existing lifecycle unchanged
- **Single source of truth:** extend `match_player_pool` for attendance
- **Deterministic & auditable:** every event logged
- **Race-safe waitlist:** offers have TTL, claims are atomic
- **One link for everything:** deep-links to app
- **Enhanced capacity management:** LIFO demotion to waitlist if capacity lowered
- **All operations** use `withTenantMatchLock` for race safety

---

## **2) Modes**

**Manual only (default):** No public link. Admin adds players as today.

**Self-serve booking:** Toggle "Allow self-serve booking" → generates public link. Optional tier open times. Admin can still add players manually.

---

## **3) Database Schema Changes**

Multi-tenancy foundation complete. All 33+ tables have `tenant_id`, RLS policies, tenant-scoped indexes. This section covers RSVP-specific additions only.

### **3.1 Players Table**

**Fields Already Added by Auth Implementation (v6.0):**
- ✅ `phone` (TEXT) - Phone number in E.164 format
- ✅ `email` (TEXT, nullable) - Email address for notifications
- ✅ `auth_user_id` (UUID, nullable) - Link to Supabase auth.users
- ✅ `is_admin` (BOOLEAN, default false) - Admin privilege flag
- ✅ `tenant_id` (UUID) - Tenant isolation (multi-tenancy)
- ✅ `idx_players_phone` index already exists

**RSVP-Specific Fields to Add:**

```sql
-- Add RSVP-specific fields only (phone, email, auth_user_id already exist)
ALTER TABLE players
  ADD COLUMN tier TEXT NOT NULL DEFAULT 'C' CHECK (tier IN ('A','B','C')),
  ADD COLUMN last_verified_at TIMESTAMPTZ;

-- Add tier index for RSVP invite filtering
CREATE INDEX IF NOT EXISTS idx_players_tenant_tier ON players(tenant_id, tier);
```

**Phone Normalization:** Use E.164 utilities from Auth Specification (`normalizeToE164`, `isValidUKPhone`).

### **3.2 Upcoming Matches**

```sql
-- Current: upcoming_matches(upcoming_match_id, tenant_id, ...) ✅ EXISTS

ALTER TABLE upcoming_matches
  ADD COLUMN booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN invite_mode TEXT NOT NULL DEFAULT 'all'
    CHECK (invite_mode IN ('all','tiered')),
  ADD COLUMN invite_token_hash TEXT,
  ADD COLUMN invite_token_created_at TIMESTAMPTZ NULL,
  ADD COLUMN a_open_at TIMESTAMPTZ NULL,
  ADD COLUMN b_open_at TIMESTAMPTZ NULL,
  ADD COLUMN c_open_at TIMESTAMPTZ NULL,
  ADD COLUMN match_timezone TEXT NOT NULL DEFAULT 'Europe/London',
  ADD COLUMN capacity INT NULL,
  ADD COLUMN auto_balance_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN auto_balance_method TEXT NOT NULL DEFAULT 'performance'
    CHECK (auto_balance_method IN ('ability','performance','random')),
  ADD COLUMN auto_lock_when_full BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN last_call_12_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN last_call_3_sent_at TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_upcoming_matches_tenant_token_hash
  ON upcoming_matches(tenant_id, invite_token_hash)
  WHERE invite_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_upcoming_matches_tenant_tier_opens
  ON upcoming_matches(tenant_id, a_open_at, b_open_at, c_open_at);
```

**Auto-balance integration:** Uses existing system at `/api/admin/balance-teams`. Method mapping: `'ability'` → `'balanceByRating'`, `'performance'` → `'balanceByPerformance'`, `'random'` → `'random'`.

### **3.3 Match Player Pool**

```sql
-- Current: match_player_pool(id, tenant_id, upcoming_match_id, player_id, response_status, ...) ✅ EXISTS
-- Response status values: 'IN' (confirmed), 'OUT' (cannot attend), 'MAYBE' (soft interest), 
-- 'WAITLIST' (wants to attend but full), 'PENDING' (no response)

ALTER TABLE match_player_pool
  ADD COLUMN invited_at TIMESTAMPTZ NULL,
  ADD COLUMN invite_stage TEXT NULL,
  ADD COLUMN reminder_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN muted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN out_flexible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN waitlist_position INTEGER NULL,
  ADD COLUMN offer_expires_at TIMESTAMPTZ NULL,
  ADD COLUMN response_timestamp TIMESTAMPTZ NULL,
  ADD COLUMN source TEXT NULL;

ALTER TABLE match_player_pool 
  DROP CONSTRAINT IF EXISTS match_player_pool_response_status_check;
ALTER TABLE match_player_pool 
  ADD CONSTRAINT match_player_pool_response_status_check 
  CHECK (response_status IN ('PENDING','IN','OUT','MAYBE','WAITLIST'));

CREATE INDEX IF NOT EXISTS idx_mpp_tenant_match_waitpos
  ON match_player_pool(tenant_id, upcoming_match_id, waitlist_position);
CREATE INDEX IF NOT EXISTS idx_mpp_tenant_waitlist_active
  ON match_player_pool (tenant_id, upcoming_match_id, waitlist_position)
  WHERE response_status='WAITLIST' AND offer_expires_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mpp_tenant_waitpos_per_match
  ON match_player_pool (tenant_id, upcoming_match_id, waitlist_position)
  WHERE response_status = 'WAITLIST' AND waitlist_position IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mpp_active_offer_per_player
  ON match_player_pool (tenant_id, upcoming_match_id, player_id)
  WHERE response_status = 'WAITLIST' AND offer_expires_at > now();

ALTER TABLE match_player_pool
  ADD CONSTRAINT offer_expiry_only_for_waitlist
  CHECK (offer_expires_at IS NULL OR response_status='WAITLIST');
```

### **3.4 New Tables**

**Invitation Waves:**
```sql
CREATE TABLE IF NOT EXISTS match_invites (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  upcoming_match_id INT NOT NULL REFERENCES upcoming_matches(upcoming_match_id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_count INTEGER NULL
);
CREATE INDEX IF NOT EXISTS idx_match_invites_tenant_match
  ON match_invites(tenant_id, upcoming_match_id);
```

**Notification Ledger:**
```sql
CREATE TABLE IF NOT EXISTS notification_ledger (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  upcoming_match_id INT NOT NULL REFERENCES upcoming_matches(upcoming_match_id) ON DELETE CASCADE,
  player_id INT NULL REFERENCES players(player_id) ON DELETE SET NULL,
  kind TEXT NOT NULL
    CHECK (kind IN (
      'invite','dropout','waitlist_offer','last_call','cancellation',
      'audit/admin_add_player','audit/admin_remove_player','audit/admin_capacity_change',
      'audit/admin_override_grace','audit/admin_manual_offer',
      'waitlist_offer_claimed','autobalance.balanced','teams.published'
    )),
  batch_key TEXT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_name TEXT NULL,
  source TEXT NULL,
  details JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_ledger_tenant_match_player
  ON notification_ledger(tenant_id, upcoming_match_id, player_id);
CREATE INDEX IF NOT EXISTS idx_notif_ledger_tenant_kind
  ON notification_ledger(tenant_id, kind, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_ledger_tenant_audit
  ON notification_ledger(tenant_id, upcoming_match_id, kind, sent_at DESC)
  WHERE kind LIKE 'audit/%';
```

**Design Notes:**
- `player_id` is **nullable** with `ON DELETE SET NULL` to preserve audit history when players are removed
- `details` is **JSONB** (not TEXT) to store structured metadata (e.g., capacity changes, offer TTLs)
- `actor_name` stores masked player name for display (since player_id may be NULL after deletion)
- `batch_key` groups related notifications (e.g., all tier-open pushes in one wave)

**Push Tokens:**
```sql
CREATE TABLE IF NOT EXISTS push_tokens (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  player_id INT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android')),
  fcm_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, player_id, device_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_tenant_player
  ON push_tokens(tenant_id, player_id);
```

**Tenant Integrity:**
```sql
CREATE OR REPLACE FUNCTION enforce_tenant_match_pool()
RETURNS trigger AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM (SELECT tenant_id FROM upcoming_matches WHERE upcoming_match_id = NEW.upcoming_match_id) THEN
    RAISE EXCEPTION 'tenant mismatch between player pool and match';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM (SELECT tenant_id FROM players WHERE player_id = NEW.player_id) THEN
    RAISE EXCEPTION 'tenant mismatch between player pool and player';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mpp_tenant_enforce ON match_player_pool;
CREATE TRIGGER trg_mpp_tenant_enforce
  BEFORE INSERT OR UPDATE ON match_player_pool
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_match_pool();
```

**Feature Flags:**
```sql
INSERT INTO app_config(config_key, config_value, config_description, config_group) VALUES
('enable_rsvp_system', 'false', 'Enable RSVP system', 'rsvp'),
('enable_push_notifications', 'false', 'Enable push notifications', 'rsvp'),
('default_booking_enabled', 'false', 'RSVP enabled by default', 'match_settings'),
('default_invite_mode', 'all', 'Default invite mode', 'match_settings'),
('tier_b_offset_hours', '24', 'Tier B offset hours', 'match_settings'),
('tier_c_offset_hours', '48', 'Tier C offset hours', 'match_settings'),
('default_auto_balance_enabled', 'false', 'Auto-balance by default', 'match_settings'),
('default_auto_balance_method', 'performance', 'Default balance method', 'match_settings'),
('default_auto_lock_when_full', 'false', 'Auto-lock when full', 'match_settings'),
('enable_ringer_self_book', 'false', 'Allow guest self-booking', 'rsvp_policies'),
('include_ringers_in_invites', 'false', 'Include guests in invites', 'rsvp_policies'),
('block_unknown_players', 'true', 'Block unknown phone numbers', 'rsvp_policies'),
('rsvp_burst_guard_enabled', 'true', 'Enable burst protection', 'rsvp_advanced'),
('default_phone_country', 'GB', 'Phone normalization country', 'rsvp_advanced')
ON CONFLICT (config_key) DO NOTHING;
```

---

## **4) Implementation Patterns**

All RSVP endpoints follow established Capo patterns.

### **4.1 API Response Format**

```typescript
export type ApiOk<T> = { success: true; data: T };
export type ApiErr = { success: false; error: string; code: string };
export const ok = <T>(data: T): ApiOk<T> => ({ success: true, data });
export const fail = (error: string, code: string): ApiErr => ({ success: false, error, code });
```

**Error Codes (Machine-Readable):**

```typescript
export const RSVP_ERROR_CODES = {
  // Auth errors
  AUTH_REQUIRED: 'ERR_AUTH_REQUIRED',
  PLAYER_NOT_FOUND: 'ERR_PLAYER_NOT_FOUND',
  
  // Match errors
  MATCH_NOT_FOUND: 'ERR_MATCH_NOT_FOUND',
  MATCH_NOT_BOOKABLE: 'ERR_MATCH_NOT_BOOKABLE',
  BOOKING_CLOSED: 'ERR_BOOKING_CLOSED',
  
  // Capacity errors
  MATCH_FULL: 'ERR_MATCH_FULL',
  CAPACITY_REACHED: 'ERR_CAPACITY_REACHED',
  
  // Waitlist errors
  WAITLIST_OFFER_EXPIRED: 'ERR_WAITLIST_OFFER_EXPIRED',
  WAITLIST_OFFER_NOT_FOUND: 'ERR_WAITLIST_OFFER_NOT_FOUND',
  ALREADY_ON_WAITLIST: 'ERR_ALREADY_ON_WAITLIST',
  
  // Tier errors
  TIER_NOT_OPEN: 'ERR_TIER_NOT_OPEN',
  TIER_INVALID: 'ERR_TIER_INVALID',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'ERR_RATE_LIMIT_EXCEEDED',
  BURST_LIMIT_EXCEEDED: 'ERR_BURST_LIMIT_EXCEEDED',
  
  // Token errors
  TOKEN_INVALID: 'ERR_TOKEN_INVALID',
  TOKEN_EXPIRED: 'ERR_TOKEN_EXPIRED',
  
  // Policy errors
  GUEST_BOOKING_DISABLED: 'ERR_GUEST_BOOKING_DISABLED',
  UNKNOWN_PLAYER_BLOCKED: 'ERR_UNKNOWN_PLAYER_BLOCKED',
} as const;

// Usage example
return NextResponse.json(
  fail('This offer has expired', RSVP_ERROR_CODES.WAITLIST_OFFER_EXPIRED),
  { status: 410 }
);
```

### **4.2 Cache Integration**

**React Query Keys (Frontend):**

Add RSVP-specific keys to `src/lib/queryKeys.ts`:

```typescript
export const queryKeys = {
  // ... existing keys ...
  
  // RSVP Match Status (public + authenticated)
  rsvpMatch: (tenantId: string | null, matchId: number | null) => 
    ['rsvpMatch', tenantId, matchId] as const,
  
  // Player Pool for Match (admin view)
  matchPlayerPool: (tenantId: string | null, matchId: number | null) => 
    ['matchPlayerPool', tenantId, matchId] as const,
  
  // Waitlist Status (player view)
  waitlistStatus: (tenantId: string | null, matchId: number | null) => 
    ['waitlistStatus', tenantId, matchId] as const,
  
  // Activity Feed (admin view)
  matchActivity: (tenantId: string | null, matchId: number | null) => 
    ['matchActivity', tenantId, matchId] as const,
} as const;
```

**React Query Hook Pattern:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth.hook';
import { queryKeys } from '@/lib/queryKeys';
import { apiFetch } from '@/lib/apiConfig';

async function fetchRsvpMatch(
  tenantId: string | null, 
  matchId: number | null
): Promise<RsvpMatchData> {
  if (!tenantId || !matchId) return null;
  
  const response = await apiFetch(`/booking/match/${matchId}/status`);
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return response.json();
}

export function useRsvpMatch(matchId: number | null) {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.rsvpMatch(tenantId, matchId),
    queryFn: () => fetchRsvpMatch(tenantId, matchId),
    staleTime: 30 * 1000, // 30 seconds for real-time RSVP
  });
}
```

**HTTP Cache Headers (Backend):**

All RSVP endpoints must disable HTTP caching:

```typescript
return NextResponse.json({ data }, {
  headers: {
    'Cache-Control': 'no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Vary': 'Cookie',
  }
});
```

### **4.3 Transaction Patterns**

```typescript
import { withTenantMatchLock } from '@/lib/tenantLocks';

export async function processRSVPResponse<T>(
  tenantId: string, 
  matchId: number, 
  operation: (tx: typeof prisma) => Promise<T>
) {
  return withTenantMatchLock(tenantId, matchId, operation);
}
```

### **4.4 Security & Tenant Resolution**

**Tenant Context Resolution:**

Use standardized `getTenantFromRequest()` for all routes:

```typescript
import { getTenantFromRequest } from '@/lib/tenantContext';
import { withTenantContext } from '@/lib/tenantContext';

// For public RSVP routes (no authentication required)
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // tenantId automatically resolved from:
    // 1. Invite token → match → tenant_id
    // 2. Session if authenticated
    // 3. Player record if phone auth
    
    // Process RSVP with tenant context
  }, { allowUnauthenticated: true });
}

// For admin routes (authentication required)
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    await requireAdminRole(request);
    // Process with tenant context
  });
}
```

**Deep Link Pattern:** `capo://match/{matchId}?token={inviteToken}`

**Token Security & Hashing Strategy:** 
- **Token generation:** 32+ byte URL-safe random tokens (crypto.randomBytes)
- **Hashing method:** HMAC-SHA256 for invite tokens (faster lookups than bcrypt)
  - Use bcrypt only for auth-critical tokens (admin invitations per `SPEC_auth.md`)
  - HMAC allows deterministic hash → efficient indexed lookups
  - Store first 8 chars of hash for prefix matching if needed
- **Storage:** NEVER store raw tokens, only hashed values
- **Expiry:** Auto-expire at kickoff+24h
- **Uniqueness:** Tenant-scoped via composite index `(tenant_id, invite_token_hash)`

```typescript
// Token hashing for invite tokens
import crypto from 'crypto';

const HMAC_SECRET = process.env.INVITE_TOKEN_SECRET!; // Store in env

export function hashInviteToken(token: string): string {
  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(token)
    .digest('hex');
}

// Validation
export async function validateInviteToken(
  tenantId: string, 
  matchId: number, 
  token: string
): Promise<boolean> {
  const tokenHash = hashInviteToken(token);
  
  const invite = await prisma.upcoming_matches.findFirst({
    where: withTenantFilter(tenantId, {
      upcoming_match_id: matchId,
      invite_token_hash: tokenHash,
      booking_enabled: true
    })
  });
  
  return !!invite;
}
```

**Rate Limiting (Multi-Tenant):**

```typescript
const buckets = new Map<string, { n: number; t: number }>();

export function phoneRateLimit(tenantId: string, matchId: number, phone: string) {
  const key = `tenant:${tenantId}:match:${matchId}:phone:${phone}`;
  const now = Date.now();
  const b = buckets.get(key) ?? { n: 0, t: now };
  if (now - b.t > 60_000) { b.n = 0; b.t = now; }
  b.n++; buckets.set(key, b);
  return b.n <= 10;
}
```

**Rate Limit Keys:**
- RSVP response: `tenant:{tenantId}:match:{matchId}:phone:{E164}` (10/min)
- Burst protection: `tenant:{tenantId}:match:{matchId}` (50 writes/10s)
- Token validation: 50/hour per IP

**Idempotency Protection:**

Prevent duplicate RSVP submissions from double-taps:

```typescript
// Idempotency key pattern
const IDEMPOTENCY_WINDOW_MS = 5000; // 5 seconds
const recentSubmissions = new Map<string, number>();

export function checkIdempotency(
  tenantId: string,
  matchId: number,
  playerId: number,
  action: string
): boolean {
  const key = `${tenantId}:${matchId}:${playerId}:${action}`;
  const now = Date.now();
  const lastSubmit = recentSubmissions.get(key);
  
  if (lastSubmit && (now - lastSubmit) < IDEMPOTENCY_WINDOW_MS) {
    return false; // Duplicate - reject
  }
  
  recentSubmissions.set(key, now);
  
  // Cleanup old entries (memory management)
  if (recentSubmissions.size > 10000) {
    const cutoff = now - IDEMPOTENCY_WINDOW_MS;
    for (const [k, t] of recentSubmissions.entries()) {
      if (t < cutoff) recentSubmissions.delete(k);
    }
  }
  
  return true; // Allowed
}

// Usage in /api/booking/respond
if (!checkIdempotency(tenantId, matchId, player.player_id, action)) {
  return NextResponse.json({ 
    success: true, 
    message: 'Already processed' 
  }); // Return success (idempotent)
}
```

### **4.5 Tenant Filtering (MANDATORY)**

**⚠️ CRITICAL:** RLS policies are **disabled** on operational tables due to connection pooling issues. 
All security relies on explicit `withTenantFilter()` helper.

**Security Model:**

Only these tables have RLS **enabled**:
- `auth.*` - Supabase auth system
- `tenants` - Superadmin only
- `admin_profiles` - Role/permission data

All RSVP tables have RLS **disabled** and require explicit filtering:
- `players`
- `upcoming_matches`
- `match_player_pool`
- `match_invites`
- `notification_ledger`
- `push_tokens`

**Mandatory Pattern for All RSVP Queries:**

```typescript
import { withTenantFilter } from '@/lib/tenantFilter';

// Simple query - ALL tables
const players = await prisma.match_player_pool.findMany({
  where: withTenantFilter(tenantId)
});

// With additional filters
const waitlist = await prisma.match_player_pool.findMany({
  where: withTenantFilter(tenantId, {
    upcoming_match_id: matchId,
    response_status: 'WAITLIST'
  })
});

// With complex filters (OR/AND)
const activeOffers = await prisma.match_player_pool.findMany({
  where: withTenantFilter(tenantId, {
    response_status: 'WAITLIST',
    offer_expires_at: { gt: new Date() },
    OR: [
      { waitlist_position: { lte: 3 } },
      { offer_expires_at: null }
    ]
  })
});

// Nested relations - filter ALL levels
const match = await prisma.upcoming_matches.findFirst({
  where: withTenantFilter(tenantId, { 
    upcoming_match_id: matchId 
  }),
  include: {
    match_player_pool: {
      where: withTenantFilter(tenantId),  // ⚠️ MANDATORY
      orderBy: { waitlist_position: 'asc' }
    }
  }
});
```

**Why withTenantFilter() is mandatory:**
- ✅ Type-safe (throws error if tenantId is null/undefined)
- ✅ Compile-time enforcement (impossible to forget tenant_id)
- ✅ Consistent pattern across entire codebase
- ✅ Development logging helps debugging
- ✅ Single source of truth for tenant filtering

**❌ FORBIDDEN - Missing Tenant Filter:**
```typescript
// ❌ SECURITY VULNERABILITY - NO TENANT FILTER!
const players = await prisma.match_player_pool.findMany({
  where: { response_status: 'WAITLIST' }  // Missing tenant_id!
});
```

### **4.6 SQL Functions**

Complex business logic in version-controlled SQL files (deployed via `deploy_all.ps1`):
- `rsvp_process_waitlist_cascade.sql` - Expire offers, auto-cascade
- `rsvp_calculate_notification_targets.sql` - Filter eligible players
- `rsvp_adjust_match_capacity.sql` - LIFO demotion on capacity decrease

---

## **5) API Surface**

**Authentication:** Admin endpoints require admin auth + tenant validation. Public endpoints use multi-tenant rate limiting. PII protection: always mask phone numbers (`+447******789`).

### **5.1 Admin Endpoints**

**All admin endpoints use Phase 2 pattern:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/tenantContext';
import { withTenantFilter } from '@/lib/tenantFilter';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { handleTenantError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/admin/upcoming-matches - Get matches with optional RSVP data
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      await requireAdminRole(request);
      
      const searchParams = request.nextUrl.searchParams;
      const matchId = searchParams.get('matchId');
      const includeRsvp = searchParams.get('includeRsvp') === 'true';
      
      if (matchId) {
        const match = await prisma.upcoming_matches.findUnique({
          where: withTenantFilter(tenantId, {
            upcoming_match_id: parseInt(matchId)
          }),
          include: includeRsvp ? {
            match_player_pool: {
              where: withTenantFilter(tenantId),
              include: { players: true }
            }
          } : undefined
        });
        
        return NextResponse.json({ success: true, data: match });
      }
      
      // Return all upcoming matches
      const matches = await prisma.upcoming_matches.findMany({
        where: withTenantFilter(tenantId, {
          state: { not: 'Completed' }
        }),
        orderBy: { match_date: 'asc' }
      });
      
      return NextResponse.json({ success: true, data: matches });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}

// PATCH /api/admin/upcoming-matches/[id]/enable-booking
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTenantContext(request, async (tenantId) => {
    try {
      await requireAdminRole(request);
      
      const { inviteMode, tierWindows, autoBalance } = await request.json();
      const matchId = parseInt(params.id);
      
      await prisma.upcoming_matches.update({
        where: withTenantFilter(tenantId, {
          upcoming_match_id: matchId
        }),
        data: {
          booking_enabled: true,
          invite_mode: inviteMode,
          a_open_at: tierWindows?.a_open_at,
          b_open_at: tierWindows?.b_open_at,
          c_open_at: tierWindows?.c_open_at,
          auto_balance_enabled: autoBalance?.enabled || false,
          auto_balance_method: autoBalance?.method || 'performance',
          auto_lock_when_full: autoBalance?.autoLockWhenFull || false
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'RSVP enabled for match' 
      });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}

// GET /api/admin/matches/[id]/activity - RSVP activity feed
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTenantContext(request, async (tenantId) => {
    try {
      await requireAdminRole(request);
      
      const matchId = parseInt(params.id);
      
      const activity = await prisma.notification_ledger.findMany({
        where: withTenantFilter(tenantId, {
          upcoming_match_id: matchId
        }),
        orderBy: { sent_at: 'desc' },
        take: 200
      });
      
      return NextResponse.json({ success: true, data: activity });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}
```

**Additional admin endpoints:**
- `POST /api/admin/invites/[matchId]/send` - Send tier invitations
- `POST /api/admin/matches/[id]/autobalance` - Manual auto-balance trigger
- `POST /api/admin/waitlist/reissue` - Re-issue waitlist offers
- `POST /api/admin/dropout/process-now` - Skip grace period for dropout

### **5.2 Public Booking Endpoints**

**All endpoints use Phase 2 pattern with `withTenantContext` wrapper:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/tenantContext';
import { withTenantFilter } from '@/lib/tenantFilter';
import { withTenantMatchLock } from '@/lib/tenantLocks';
import { requirePlayerAccess } from '@/lib/auth/apiAuth';
import { handleTenantError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

// POST /api/booking/respond - Player RSVP response
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user, player } = await requirePlayerAccess(request);
      const { matchId, action, outFlexible } = await request.json();
      
      // Process RSVP with tenant-aware lock
      await withTenantMatchLock(tenantId, matchId, async (tx) => {
        const poolEntry = await tx.match_player_pool.findFirst({
          where: withTenantFilter(tenantId, {
            upcoming_match_id: matchId,
            player_id: player.player_id
          })
        });
        
        if (!poolEntry) throw new Error('Player not in match pool');
        
        // Update response status
        await tx.match_player_pool.update({
          where: { id: poolEntry.id },
          data: {
            response_status: action,
            out_flexible: action === 'OUT' ? outFlexible : false,
            response_timestamp: new Date()
          }
        });
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'RSVP updated' 
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie',
        }
      });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}

// POST /api/booking/waitlist/claim - Claim waitlist offer
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user, player } = await requirePlayerAccess(request);
      const { matchId } = await request.json();
      
      await withTenantMatchLock(tenantId, matchId, async (tx) => {
        // Find valid offer with SELECT FOR UPDATE
        const offer = await tx.match_player_pool.findFirst({
          where: withTenantFilter(tenantId, {
            upcoming_match_id: matchId,
            player_id: player.player_id,
            response_status: 'WAITLIST',
            offer_expires_at: { gt: new Date() }
          })
        });
        
        if (!offer) throw new Error('No valid offer');
        
        // Atomic claim - update to IN status
        await tx.match_player_pool.update({
          where: { id: offer.id },
          data: {
            response_status: 'IN',
            response_timestamp: new Date(),
            offer_expires_at: null
          }
        });
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Waitlist spot claimed' 
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie',
        }
      });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}

// GET /api/booking/match/[id]/status - Get match RSVP status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user, player } = await requirePlayerAccess(request);
      const matchId = parseInt(params.id);
      
      const match = await prisma.upcoming_matches.findUnique({
        where: withTenantFilter(tenantId, {
          upcoming_match_id: matchId
        }),
        include: {
          match_player_pool: {
            where: withTenantFilter(tenantId, {
              player_id: player.player_id
            })
          }
        }
      });
      
      if (!match) {
        return NextResponse.json({ 
          success: false, 
          error: 'Match not found' 
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: true, 
        data: {
          match,
          playerStatus: match.match_player_pool[0] || null
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie',
        }
      });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}
```

### **5.3 Push Notification Endpoints**

```typescript
// POST /api/push/register
{ "deviceId": "uuid", "playerId": 123, "platform": "ios|android", "fcmToken": "..." }

// DELETE /api/push/register
{ "deviceId": "uuid", "playerId": 123, "platform": "ios|android" }

// POST /api/push/send (internal)
{ "playerIds": [123, 456], "message": "...", "data": {...} }
```

## **6) Notifications**

### **6.1 Triggers**

**Player Notifications:**
- Tier open → push to that tier
- Waitlist offer (after grace) → push top-3 with TTL
- Last-call (T-12h/T-3h if short) → push likely responders
- Cancellation → push to confirmed + waitlist
- Teams released → push to participants only

**Admin Notifications:**
- Payment failed (FUTURE) → push to admins

### **6.2 Caps & Batching**

Max 3 dropout/last-call pushes per player per match. Tier-open and waitlist offers uncapped (deduped/batched).

**Batching windows:**
- >5 days: 1/day digest per match
- ≤24 hours: 10-min window

Use `notification_ledger.batch_key` to coalesce events.

### **6.3 Grace Period**

Dynamic grace post-dropout: 5min normally, 2min if <24h, 1min if <3h. Cancel if player returns to IN.

---

## **7) Waitlist Details**

Top-3 simultaneous offers. Dynamic TTL: 4h normally, 1h if <24h, 30min if <3h, instant if <15min. Clamped to kickoff−15m, minimum 5min when using hold period.

First to claim wins (transactional). Others get "spot filled", remain on waitlist.

**Offer Log:** Admin sees history via `notification_ledger` (Claimed/Expired/Superseded).

**Manual Controls:** "Send new waitlist offers" button for immediate processing.

**Edge Cases:**
- **Capacity increase:** Auto-promote earliest WAITLIST players by queue order with notification
- **Capacity decrease with active offers:** 
  - System demotes most-recent IN players to WAITLIST (LIFO)
  - Revokes ALL outstanding waitlist offers (prevents over-capacity)
  - Sends "capacity reduced" notification to affected players
  - Waitlist positions recalculated from scratch
  - Activity feed logs `audit/admin_capacity_change` event
- **Near kick-off offers:** Auto-expire all offers at kickoff−15m with countdown
- **Manual admin add:** Consumes capacity and supersedes outstanding offers (logged in activity feed)
- **Instant claim mode:** When <15min to kick-off, switch to instant claim (no hold period)
  - Public page banner: "Kick-off soon! Spots are first-come, first-served."
  - Push copy: "Spot open now — first to tap gets it."
  - UI: Hide timers, claim proceeds immediately

---

## **8) UI/UX Implementation**

Integration with existing Capo soft-UI styling and component patterns.

### **8.1 Admin Interface**

**Match Control Centre enhancements:**

```typescript
// src/components/admin/matches/RSVPBookingPane.component.tsx
// New pane in Match Control Centre for RSVP management
// Follows existing BalanceTeamsPane.component.tsx patterns

// Features:
// - Toggle "Enable RSVP" with soft-UI switch
// - Tier window configuration (A/B/C open times)
// - Booking link generation with copy button
// - Share to WhatsApp integration
// - Capacity counters: "Booked 12/20, Waitlist 3"
// - Player lists with status badges (IN/OUT/WAITLIST)
// - Auto-balance controls: method dropdown + enable checkbox
// - RSVP Activity showing invitations, responses, offers
```

**New Admin Components:**

```typescript
// src/components/admin/matches/RSVPConfigModal.component.tsx
// Modal for configuring RSVP settings
// Follows SeasonFormModal.component.tsx patterns

// src/components/admin/matches/ActivityFeed.component.tsx  
// Minimal reverse-chronological activity timeline (no filters/search)
// Props: events: ActivityEvent[] from GET /api/admin/matches/{id}/activity
// Displays: timestamp (relative), emoji + copy, masked player names
// See Section 10 for activity kind display mapping

// src/components/admin/matches/PlayerTierManager.component.tsx
// Manage player tiers (A/B/C)
// Integrates with existing player management
// Tooltip: "Tier C = casual/default. All players start here unless assigned A or B."
```

### **8.2 Mobile App**

**Unified RSVP page:**

```typescript
// src/app/player/upcoming/match/[id]/page.tsx
// Unified RSVP page for all users (app, web, logged-in)
// Uses existing MainLayout.layout.tsx

// src/components/rsvp/RSVPInterface.component.tsx
// One-tap IN/OUT/WAITLIST buttons
// Waitlist offer banner with countdown
// Deep-link handling from WhatsApp
// Context-aware: phone entry for web users, skip for app users
```

### **8.3 Public Web**

App-only interface. All users use Capacitor app (`capo://match/123`). Authenticated users → immediate RSVP. New users → SMS verification first.

---

## **9) Background Jobs**

Extend existing multi-tenant background job system with RSVP job types.

**Tenant context pattern (use withBackgroundTenantContext):**

```typescript
import { withBackgroundTenantContext } from '@/lib/tenantContext';
import { withTenantFilter } from '@/lib/tenantFilter';

async function processJob(job: JobData) {
  const { tenant_id } = job.payload;
  if (!tenant_id) throw new Error('Missing tenant_id in job payload');
  
  return withBackgroundTenantContext(tenant_id, async () => {
    // Tenant context automatically available to Prisma middleware
    // All queries still need explicit withTenantFilter() for safety
    
    const offers = await prisma.match_player_pool.findMany({
      where: withTenantFilter(tenant_id, {
        response_status: 'WAITLIST',
        offer_expires_at: { lt: new Date() }
      })
    });
    
    // Process expired offers...
  });
}
```

**Job types:**

```typescript
export const RSVP_JOB_TYPES = {
  TIER_OPEN_NOTIFICATIONS: 'tier_open_notifications',
  DROPOUT_GRACE_PROCESSOR: 'dropout_grace_processor', 
  WAITLIST_OFFER_PROCESSOR: 'waitlist_offer_processor',
  NOTIFICATION_BATCHER: 'notification_batcher',
  AUTO_BALANCE_PROCESSOR: 'auto_balance_processor',
  LAST_CALL_PROCESSOR: 'last_call_processor'
};
```

**AUTO_BALANCE_PROCESSOR implementation:**

Uses existing balance system. Worker makes HTTP call to balance endpoint.

**Deduplication:** Prevents rapid-fire rebalance jobs during dropout/refill churn:

```typescript
const REBALANCE_COOLDOWN_MS = 60_000; // 1 minute cooldown per match
const rebalanceTimestamps = new Map<string, number>();

export async function processAutoBalanceJob(jobId: string, payload: AutoBalanceJobPayload) {
  const { matchId, method, tenantId, playerIds, state_version } = payload;
  
  // Deduplication: Skip if rebalanced within last minute
  const cooldownKey = `${tenantId}:${matchId}`;
  const lastRebalance = rebalanceTimestamps.get(cooldownKey);
  const now = Date.now();
  
  if (lastRebalance && (now - lastRebalance) < REBALANCE_COOLDOWN_MS) {
    console.log(`[AUTO_BALANCE] Skipping duplicate job for match ${matchId} (cooldown active)`);
    await updateJobStatus(jobId, 'skipped');
    return;
  }
  
  rebalanceTimestamps.set(cooldownKey, now);
  
  // Map UI method names to API
  const apiMethod = method === 'ability' ? 'balanceByRating' 
    : method === 'performance' ? 'balanceByPerformance' 
    : 'random';
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/balance-teams`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WORKER_API_KEY}`
    },
    body: JSON.stringify({ 
      matchId: matchId.toString(), 
      playerIds: playerIds.map(id => id.toString()), 
      method: apiMethod,
      state_version 
    })
  });
  
  if (!response.ok) throw new Error(`Balance failed: ${await response.text()}`);
  
  // Log to activity feed
  await prisma.notification_ledger.create({
    data: {
      tenant_id: tenantId,
      upcoming_match_id: matchId,
      player_id: null, // System action (no specific player)
      kind: 'autobalance.balanced',
      batch_key: `autobalance:${matchId}:${Date.now()}`
    }
  });
  
  await updateJobStatus(jobId, 'completed');
}
```

**Trigger logic:**
- When IN count reaches capacity: Enqueue AUTO_BALANCE_PROCESSOR
- On dropout below capacity: Set `is_balanced=false`, clear team assignments
- On refill to capacity: Auto-balance triggers again
- Teams can be balanced multiple times during dropout/refill churn
- Admin can manually lock pool to finalize

**State handling:**
- `auto_lock_when_full=false` (default): Keep Draft, balance & publish teams
- `auto_lock_when_full=true`: Lock → Balance → TeamsBalanced state

**Other job implementations:**

- **tier_open_notifications:** Cron at tier times, target `is_ringer=false`, send push
- **dropout_grace_processor:** Every minute, dynamic grace (5m/2m/1m), trigger offers after grace
- **waitlist_offer_processor:** Every 5 min, expire offers (4h/1h/30min TTL), auto-cascade, log to `notification_ledger`
- **notification_batcher:** Teams released (participants only), cancellation (all confirmed+waitlist), respect caps
- **last_call_processor:** T-12h and T-3h windows, target unresponded + OUT flexible, exclude muted, set timestamp for idempotency

---

## **10) Copy Snippets**

**WhatsApp Templates:**

Tier open:
```
⚽ Booking now open for {date}! Tap to confirm: {link}
```

Last call:
```
⚡ We're {n} short for {date}. Can you make it? {link}
```

Waitlist:
```
🎯 Spot just opened for {date}! First to claim: {link}
```

**Share Messages:**

All at once mode:
```
Book now for {date}. {booked}/{capacity} confirmed → {link}
```

Tiered mode:
```
Book now for {date}. Tier A now, Tier B from {time}, Tier C from {time} → {link}
```

Tiered mode (B+C simultaneous):
```
Book now for {date}. Tier A now, Tiers B+C from {time} → {link}
```

**Push Notifications:**

Tier open:
```
Booking open for {date}. Tier {A/B/C} can now book. ✅ IN | ❌ OUT
```

Tier open (B+C simultaneous):
```
Booking open for {date}. Tiers B+C can now book. ✅ IN | ❌ OUT
```

Waitlist offer:
```
Spot open for {date}! First to claim gets it. Expires in {countdown}.
```

Last call:
```
We're {n} short for {date}. Can you make it? ✅ IN | ❌ OUT
```

**Public Page Messages:**

Before window (tiered mode):
```
Booking opens for Tier {tierLabel} at {time}.
```

Before window (B+C simultaneous, player in B or C):
```
Booking opens for Tier {tierLabel} at {time}. (Tiers B+C open together)
```

Too-early tap:
```
Too early — Tier {tierLabel} opens at {time}. The IN button will appear here 👍
[Show disabled IN button with countdown: "Opens in 2h 15min"]
```

After open:
```
{n} spots left — tap IN to secure yours.
[Show prominent counter next to IN button]
```

Full match:
```
Game is full. Join the waitlist as #{position} — first to claim gets in.
[Show prominent "Join Waitlist" button with queue position]
```

Near kick-off:
```
Kick-off soon — spots are first-come, first-served.
```

**Status Display:**

Public match status (before open):
```
{booked}/{capacity} confirmed • {waitlistCount} waiting • Tier {tierLabel} opens in {countdown}
```

Public match status (before open, B+C simultaneous):
```
{booked}/{capacity} confirmed • {waitlistCount} waiting • Tiers B+C open in {countdown}
```

Public match status (after open):
```
{booked}/{capacity} confirmed • {waitlistCount} waiting
```

**Error Messages:**

Invalid/expired link:
```
This link isn't valid anymore. Please ask the organiser for a new one.
```

Guest blocked (self-book OFF):
```
Please ask the organiser to add you for this match.
```

Unknown number (block_unknown_players=true - DEFAULT):
```
This number isn't registered with this club. Please ask the organiser to add you.
```

Unknown number (block_unknown_players=false - OPTIONAL):
```
Enter your name to join the list:
[Show name input: max 14 characters, real-time validation]
```

Name validation errors:
```
Use 14 characters or fewer | That name's already taken — try another
```

Shared phone blocked:
```
This number is already linked to another player. Ask the organiser to help.
```

Offer expired:
```
This offer has expired — check the waitlist for your current place.
```

Too early (tiered mode):
```
Too early — Tier {tierLabel} opens at {time}. The IN button will appear here 👍
```

Rate limited:
```
Too many attempts. Please wait a moment and try again.
```

**Admin UI Copy:**

Invite mode toggle:
```
"All at once" | "Tiered"
```
- "All at once" tooltip: "Everyone can book immediately."
- "Tiered" tooltip: "Set timed booking windows by tier (A/B/C)."

Tier labels:
```
"Tier A" | "Tier B" | "Tier C"
```
Tier C tooltip: "Tier C is the default for all players (casual tier). Admins can upgrade to A or B."

Reset button:
```
"Use default timings"
```
Tooltip: "Restore global default offsets for tier windows."

Manual actions:
```
"Send new waitlist offers" | "Release spot now" | "Auto-balance now"
```
- "Release spot now" tooltip: "Skip grace period and free this spot immediately"

OUT options:
```
"OUT" button with subtle "Might be available later" toggle underneath
```
Toggle tooltip: "Player is OUT, but open to being called back if needed."

Quick-share messages (WhatsApp):
```
Copy buttons for pre-filled messages
```
Tooltip: "Copy pre-filled messages to share manually if needed."

RSVP Activity:
```
Real-time event feed
```
Tooltip: "Shows all RSVP changes, offers, and admin actions in real time."

**Activity Feed Display Mapping:**
```
invite → "📣 Tier opened"
waitlist_offer → "🎯 Waitlist offer issued"  
waitlist_offer_claimed → "✅ Offer claimed"
last_call → "⚡ Last-call sent"
cancellation → "🛑 Match cancelled"
audit/admin_add_player → "👤 Admin added {player}"
audit/admin_remove_player → "➖ Admin removed {player}"
audit/admin_capacity_change → "📏 Capacity changed {old}→{new}"
autobalance.balanced → "⚖️ Teams auto-balanced"
teams.published → "📝 Teams published"
```

---

## **11) Implementation Roadmap**

**PHASE 1: Database & Core Backend (Week 1-2)**
- Database migrations (extend existing tables)
- Update Prisma schema
- Production reliability: indexes, constraints, concurrency protection
- Extend existing API endpoints for RSVP
- Core booking API (IN/OUT/WAITLIST)
- Feature flag integration
- Token hashing security

**PHASE 2: Background Jobs & Notifications (Week 2-3)**
- Extend Render worker with RSVP job types
- Auto-balance processor with HTTP call pattern
- Push notification system (FCM integration)
- Enhanced notification ledger
- Tier-based invitation processing
- Waitlist management and grace periods

**PHASE 3: Admin Interface (Week 3-4)**
- Enhanced RSVPBookingPane with badges and warnings
- Auto-balance and auto-lock toggles
- RSVP Activity Feed with event logging
- Integration with existing useMatchState hook

**PHASE 4: Unified RSVP Interface (Week 4-5)**
- Enhanced /player/upcoming overview with RSVP status
- Unified RSVP experience for all users
- Phone validation with E.164 normalization
- Rate limiting, burst protection, security
- Guest access control

**PHASE 5: Polish & Testing (Week 5-6)**
- App installation tracking
- Guest management UI polish
- End-to-end testing
- Load testing
- Documentation

---

## **12) Integration with Existing System**

### **Match Lifecycle**

**Current:** Draft → PoolLocked → TeamsBalanced → Completed

**RSVP integration:** Available in Draft only, data persists through all states

### **Player Pool Extension**

```typescript
interface PlayerInPool extends PlayerProfile {
  responseStatus: 'IN' | 'OUT' | 'MAYBE' | 'PENDING' | 'WAITLIST';
  invitedAt?: Date;
  inviteStage?: 'A' | 'B' | 'C';
  waitlistPosition?: number;
  offerExpiresAt?: Date;
  source?: 'app' | 'web' | 'admin';
  muted?: boolean;
  outFlexible?: boolean;
}
```

### **UI Component Flow**

- Draft + RSVP OFF: PlayerPoolPane (unchanged)
- Draft + RSVP ON: RSVPBookingPane (new, with player pool integration)
- PoolLocked: BalanceTeamsPane (unchanged, shows RSVP source data)
- TeamsBalanced: CompleteMatchForm (unchanged)

### **Background Job System**

Extend existing worker with RSVP job types. Use existing database connection, error handling, retry patterns.

---

## **13) Success Criteria & Metrics**

**User Adoption:**
- Target: 80%+ of regular players use RSVP within 3 months
- Metric: Track response rates, manual vs automatic player addition

**Admin Efficiency:**
- Target: 50% reduction in admin time for match organization
- Metric: Time from match creation to team confirmation

**Match Fill Rates:**
- Target: 95%+ matches reach minimum viable size
- Metric: Track cancellations due to low attendance

**Technical Performance:**
- Target: <2s response times for all RSVP interactions
- Target: 99%+ push notification delivery rate
- Target: Zero data loss or corruption

---

## **14) Security & Reliability**

### **Concurrency Protection**

All critical operations use tenant-aware advisory locks:

```typescript
export async function processAutoBalance(tenantId: string, matchId: number) {
  await withTenantMatchLock(tenantId, matchId, async (tx) => {
    const match = await tx.upcoming_matches.findUnique({ 
      where: { upcoming_match_id: matchId, tenant_id: tenantId }
    });
    
    // Idempotency checks
    if (!match?.auto_balance_enabled || match.state !== 'Draft') return;
    if (match.is_balanced) return; // Already processed
    
    // Atomic operations within transaction
    await lockPoolTx(tx, matchId);
    await balanceTeamsTx(tx, matchId, match.auto_balance_method ?? 'performance');
    await confirmTeamsTx(tx, matchId);
  });
}
```

**Waitlist claims** use `SELECT ... FOR UPDATE` to prevent double-claims.

**Offer TTL calculation** clamps to kickoff−15m; <15m switches to instant claim.

**Drop-out grace period** (5m/2m/1m) cancels if player returns to IN during grace.

**Auto-balance triggers** when IN count reaches capacity or via admin manual trigger. On dropout below capacity, teams unbalance (`is_balanced=false`, assignments cleared). On refill to capacity, auto-balance triggers again.

**Background jobs** use existing tenant-scoped infrastructure and are idempotent with `batch_key` scoping.

### **Rate Limiting**

- **Admin endpoints:** Require admin auth + tenant validation
- **Public endpoints:** Multi-tenant rate limited (10/min per phone, 50/10s per match)
- **Token security:** Hashed storage, TTL enforcement, auto-expire at kickoff+24h
- **PII protection:** Never log full phone numbers, always mask in UI (`+447******789`)

### **Data Integrity**

Tenant consistency triggers prevent cross-tenant data corruption. All queries include `tenant_id` in WHERE clauses. RLS policies enforce tenant isolation.

### **Error Handling**

Production-grade error messages with PII protection. Phone numbers always masked. Never log raw tokens or full phone numbers.

### **Activity Feed & Audit Trail**

All RSVP events logged to `notification_ledger` with masked player identifiers. Admin sees complete timeline without PII exposure.

---

## **15) Match Day Reality & Payment Stability - ✅ BASE FEATURE IMPLEMENTED (January 2025)**

### **Core Principle: Lock Backwards, Flex Forward**

Once payments are enabled OR RSVP deadline passes:
- ❌ Cannot go back to Draft or PoolLocked (prevents payment/RSVP disruption)
- ❌ Cannot remove players from pool/teams via planning screens
- ✅ Handle all real-world chaos via "Match Day Adjustments" on results screen

### **Already Implemented: Base Feature (No RSVP Required)**

The foundation for handling match-day reality is **already live** and works today without RSVP:

**Database Schema (Complete):**
```sql
ALTER TABLE player_matches
  ADD COLUMN actual_team VARCHAR(20);  -- Track team swaps
-- Note: is_no_show column removed - absence from table = no-show
```

**UI/UX (Complete):**
- **Location:** CompleteMatchForm (results screen)
- **No-Show Handling:** Uncheck player → not saved to `player_matches` → no stats credit
- **Team Swaps:** Click arrow (→/←) → player moves visually between columns
- **Soft UI Styling:** Purple gradient checkmarks, circular swap buttons

**Visual Example:**
```
ORANGE                          GREEN
[✓] → Lee Miles   - [2] +      [✓] ← Scott Daly  - [1] +
[✓] → Greg Dormer - [0] +      [✓] ← Simon Gill  - [0] +
[○]   Sharpey (No Show)        [✓] ← Ade Duncan  - [0] +
```

**How It Works:**
1. Admin enters results screen
2. Unchecks players who didn't show (checkbox = purple circle with checkmark)
3. Clicks arrow buttons to swap players between teams
4. Players **visually move** to the other column
5. Enters goals and saves
6. Only checked players get saved to `player_matches` table
7. Stats automatically correct (no filtering needed)

**Data Flow:**
```typescript
// Submit only players who played
player_stats = allPlayers
  .filter(player => isChecked)  // Checkbox controls row creation
  .map(player => ({
    player_id: player.id,
    goals: goals,
    actual_team: swappedTeam || plannedTeam  // For team swaps
  }));

// No-shows determined by absence:
// If player exists in upcoming_match_players but NOT in player_matches = no-show
```

**Re-Editing Support:**
```typescript
// Cross-reference tables to restore UI state
const playedPlayerIds = new Set(player_matches.map(pm => pm.player_id));
const noShows = upcoming_match_players.filter(p => !playedPlayerIds.has(p.player_id));
const swaps = player_matches.filter(pm => pm.actual_team !== pm.team);
```

### **Future RSVP Integration**

When RSVP is fully implemented, this base feature extends naturally:

**1. Auto-Mark No-Shows from RSVP:**
```typescript
// Pre-uncheck players who marked OUT in RSVP
players.forEach(player => {
  if (player.rsvpStatus === 'OUT' && match.state === 'TeamsBalanced') {
    setNoShowPlayers(prev => new Set([...prev, player.id]));
  }
});
```

**2. Backwards Navigation Locking:**
```sql
-- Add to upcoming_matches when RSVP implemented
ALTER TABLE upcoming_matches
  ADD COLUMN locked_for_payments BOOLEAN DEFAULT FALSE;
```

**UI Changes:**
```typescript
// Disable unlock buttons once payments are enabled
const canUnlock = !matchData.locked_for_payments;

{canUnlock ? (
  <button onClick={actions.unlockPool}>← Back to Pool</button>
) : (
  <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded">
    🔒 Teams locked for payments - use Match Day adjustments for changes
  </div>
)}
```

**3. Payment vs Participation Separation:**

Financial records (stable after payment):
```sql
match_player_pool {
  player_id: 123,
  response_status: 'IN',
  payment_status: 'paid',  -- Never changes
  team: 'A'  -- Planned team
}
```

Participation records (flexible until completed):
```sql
player_matches {
  player_id: 123,
  team: 'A',  -- Planned
  actual_team: 'B',  -- Actually played (swapped)
  goals: 2
}
-- If player no-shows: no row created at all
```

**4. No Automatic Refunds:**
- Admin policy: No-shows don't get refunds
- Payment record stays `status: 'paid'`
- Admin can manually refund externally if desired
- No refund logic in codebase

### **Benefits of This Architecture**

✅ **Simple Today:** Works without RSVP/payments (already live)  
✅ **Future-Ready:** Extends cleanly when RSVP implemented  
✅ **Payment Safe:** Planning locked, reality flexible  
✅ **Stats Clean:** No filtering needed, just works  
✅ **Real-World Flexible:** Handles no-shows and swaps elegantly  

### **Implementation Status**

**✅ Phase 1 (COMPLETE - January 2025):**
- No-show checkbox UI
- Team swap arrows
- Cross-reference restoration for re-editing
- `actual_team` column for team swaps
- Stats integrity maintained

**⏳ Phase 2 (When RSVP Implemented):**
- Auto-mark no-shows from RSVP status
- Add `locked_for_payments` column
- Disable backwards navigation when locked
- Connect to payment records

See `SPEC_match-control-centre.md` for complete implementation details of Phase 1.

---

## **16) Developer Guide**

### **Phone Normalization**

All phone inputs must normalize to E.164 before storage:

```typescript
import { normalizeToE164, isValidUKPhone } from '@/utils/phone.util';
const normalizedPhone = normalizeToE164(userInput);
```

### **Deep Links**

Configure iOS Associated Domains and Android App Links:
- Custom scheme: `capo://match/123`
- Universal links: `https://capo.app/match/123`

### **Token Management**

Generate 32+ byte URL-safe random tokens. Hash with bcrypt before storage. Never store or log raw tokens. Auto-expire at kickoff+24h.

### **Timezone Handling**

Store UTC in database. Render in local timezone for display. Use `match_timezone` field for UI rendering only.

### **Copy Templates**

Centralize all user-facing copy with variables for date/time, slots left, player names. Never include raw phone numbers or tokens in copy.

### **Privacy & Logging**

Redact phone numbers in logs. Normalize to E.164 before storage. Never log `invite_token` or push tokens. Mask phone numbers in UI as `+447******789`.

---

## **16) Technical Requirements**

### **Dependencies**

- Node.js 18+ (existing requirement)
- Firebase project for FCM push notifications
- Capacitor for native app wrapper
- Existing Render worker and Supabase infrastructure

### **New Libraries**

- Phone validation library for E.164 normalization
- Firebase Admin SDK for push notifications
- Rate limiting middleware for API protection

### **Infrastructure**

- Firebase project with FCM setup
- App Store/Google Play developer accounts (optional)
- Background job scaling for enhanced worker capacity

---

## **17) Production Deployment**

### **Database Migration Strategy**

1. Add nullable columns first
2. Backfill existing data with default values
3. Set NOT NULL constraints after backfill
4. Create indexes CONCURRENTLY on large tables
5. Enable RLS policies
6. Deploy tenant integrity triggers

**Example migration:**

```sql
-- Step 1: Add nullable columns
ALTER TABLE players ADD COLUMN phone TEXT;
ALTER TABLE players ADD COLUMN tier TEXT DEFAULT 'C';

-- Step 2: Backfill (if needed)
-- UPDATE players SET tier = 'C' WHERE tier IS NULL;

-- Step 3: Set NOT NULL after backfill
ALTER TABLE players ALTER COLUMN tier SET NOT NULL;

-- Step 4: Create indexes CONCURRENTLY
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_tenant_phone 
  ON players(tenant_id, phone);

-- Step 5: Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Step 6: Deploy integrity triggers
CREATE TRIGGER trg_mpp_tenant_enforce
  BEFORE INSERT OR UPDATE ON match_player_pool
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_match_pool();
```

### **Feature Flag Rollout**

1. Deploy with all flags OFF
2. Enable for test tenant
3. Monitor logs/metrics
4. Gradually enable for production tenants
5. Tune caps/windows based on feedback

### **Monitoring**

Track: `invite.wave.sent`, `rsvp.responded`, `dropout.created`, `waitlist.offer.sent/claimed/expired`, `notification.sent`, `push.opt_in` rate

### **Rollback Plan**

All database changes are additive. Can disable RSVP via feature flags without data loss. Original manual workflow remains unchanged.

## **18) Example Flows**

### **A) Tiered Fill**

1. Admin enables booking (cap 10), sets A/B/C open times, shares link
2. At A open, app pushes to Tier A → 8 book IN
3. At B open, pushes to Tier B → 2 book IN (10/10)
4. Auto-balance triggers (if enabled), teams published
5. Admin Lock Pool → Complete

### **B) Dropout & Waitlist**

1. Night before, 1 player drops OUT; 5-min grace starts
2. After grace, capacity frees → push waitlist_offer to top-3 with 4h TTL
3. First to tap Claim wins; others get "spot filled"
4. If enabled, auto-balance triggers to rebalance teams

### **C) Capacity Adjustment**

1. Match at 20/20, all IN
2. Admin lowers capacity to 18
3. System demotes 2 most-recent IN players to WAITLIST (LIFO)
4. Sends polite notifications to demoted players
5. Teams unbalance, ready for manual rebalancing

---

## **19) Future Enhancements**

### **Near-Term (Post-MVP)**

**RSVP-Specific:**
- **WebSocket real-time updates:** Replace 30s polling with live match fill counter
- **Email/SMS fallback:** Notification delivery via Twilio if push fails
- **Auto-tier promotion:** Promote to Tier B after X attendances (reduces admin burden)
- **Bulk tier management:** CSV upload for tier assignments (for clubs with 100+ players)

**UX Polish:**
- **Push notification templates:** Server-side rendering (not client substitution)
- **Optimistic UI updates:** Instant feedback before server confirmation
- **Offline support:** Queue RSVP responses when network unavailable

### **Scale-Related (>200 Tenants)**

**Infrastructure:**
- **Redis rate limiting:** Replace in-memory Map with distributed cache
- **Job queue partitioning:** Separate queues per tenant for load isolation
- **Per-tenant monitoring:** Alert thresholds and dashboards per club

**Performance:**
- **Notification batching optimization:** Smart batching algorithms for large clubs
- **Lock granularity refinement:** Player-level locks instead of match-level where safe
- **Database read replicas:** Offload read-heavy RSVP status queries

**Operations:**
- **Automated tier assignment:** ML-based tier suggestions from attendance patterns
- **Cross-tenant analytics:** Benchmark RSVP conversion rates across clubs
- **Capacity planning tools:** Predict optimal match capacity from historical data

### **Already Documented**

See `docs/FUTURE_PROBLEMS.md` for:
- Multi-league identity management
- Payment authorization timing
- Profile name conflict resolution

### **Scale Context**

**Current target:** ~200 tenants over 3 years
- **Per tenant:** 30-50 active players
- **Total players:** ~6,000 across platform
- **Concurrent matches:** <50 at peak times
- **Verdict:** Current architecture handles this easily

**Scale threshold for optimization:** >500 tenants or >20,000 active players

Most "future enhancements" in this section can be deferred until hitting scale thresholds. Focus on correctness and user experience first.

---

## **20) Final Summary**

This consolidated specification delivers a **production-ready multi-tenant RSVP system**:

✅ **Streamlined RSVP** with unified experience for all users  
✅ **Auto-balance integration** leveraging existing team balancing system  
✅ **Admin-only guest management** without complex approval flows  
✅ **Real-time activity feed** with comprehensive event tracking  
✅ **Fixed last-call windows** (T-12h/T-3h) with timestamp-based idempotency  
✅ **Enhanced waitlist** with offer logging and batch tracking  
✅ **Production security** with token hashing, rate limiting, tenant isolation  
✅ **WhatsApp-simple workflow** optimized for casual football matches

### **Key Architectural Decisions**

- **Multi-tenant from day one** (all 33+ tables tenant-scoped)
- **Phone-only authentication** (UK mobile numbers initially)
- **App-first experience** (Capacitor wrapper with deep links)
- **Conservative defaults** (booking OFF, auto-balance OFF, auto-lock OFF)
- **Dropout/refill rebalancing** (teams unbalance when below capacity)
- **Worker HTTP calls** for balance (not RPC, matches existing pattern)
- **Type-safe tenant filtering** (`withTenantFilter()` helper mandatory)
- **Explicit over implicit** (RLS disabled, application-level security)

### **Database Changes**

- **6 tables enhanced** with RSVP fields:
  - `players` (+2 fields: tier, last_verified_at)
  - `upcoming_matches` (+13 fields: booking config, tier windows, auto-balance)
  - `match_player_pool` (+8 fields: waitlist, offers, timestamps)
- **3 new tables:** match_invites, notification_ledger, push_tokens
- **25+ tenant-scoped indexes** with security constraints
- **Audit trail protection** (ON DELETE SET NULL for notification ledger)
- **Idempotency safeguards** (unique indexes prevent double-offers, double-taps)

### **Security Enhancements**

- **HMAC-SHA256 token hashing** (faster than bcrypt for lookups)
- **Machine-readable error codes** (20+ error types for frontend UX)
- **Idempotency protection** (5-second window prevents double-submissions)
- **Rebalance job deduplication** (1-minute cooldown prevents thrashing)
- **Active offer prevention** (unique index prevents race-condition double-offers)
- **Audit trail preservation** (SET NULL keeps history when players deleted)

### **Implementation Phases**

5-6 week roadmap covering database, backend, admin UI, mobile app, and production testing. Phased rollout with feature flags ensures safe deployment.

The specification maintains **backward compatibility** throughout. Teams using manual-only workflow see zero impact. RSVP is purely additive functionality.

---

## **21) Implementation Guidance (v4.3.0 Updates)**

### **Key Pattern Changes from v4.2.0**

**1. All API Routes Use withTenantContext Wrapper:**
```typescript
// ✅ NEW PATTERN (v4.3.0)
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      await requireAdminRole(request);
      const data = await prisma.players.findMany({
        where: withTenantFilter(tenantId)
      });
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}

// ❌ OLD PATTERN (v4.2.0)
export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  const tenantId = session.user.app_metadata?.tenant_id;
  // ... manual tenant handling
}
```

**2. All Queries Use withTenantFilter Helper:**
```typescript
// ✅ NEW PATTERN (v4.3.0)
const players = await prisma.match_player_pool.findMany({
  where: withTenantFilter(tenantId, {
    response_status: 'WAITLIST'
  })
});

// ❌ OLD PATTERN (v4.2.0)
const players = await prisma.match_player_pool.findMany({
  where: { 
    tenant_id: tenantId,
    response_status: 'WAITLIST'
  }
});
```

**3. Background Jobs Use withBackgroundTenantContext:**
```typescript
// ✅ NEW PATTERN (v4.3.0)
async function processJob(job: JobData) {
  const { tenant_id } = job.payload;
  return withBackgroundTenantContext(tenant_id, async () => {
    const offers = await prisma.match_player_pool.findMany({
      where: withTenantFilter(tenant_id, { ... })
    });
  });
}

// ❌ OLD PATTERN (v4.2.0)
async function processJob(job: JobData) {
  const { tenant_id } = job.payload;
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant_id}, false)`;
  // ... manual RLS context
}
```

**4. React Query Keys Follow Established Pattern:**
```typescript
// ✅ NEW PATTERN (v4.3.0)
export const queryKeys = {
  rsvpMatch: (tenantId: string | null, matchId: number | null) => 
    ['rsvpMatch', tenantId, matchId] as const,
} as const;

export function useRsvpMatch(matchId: number | null) {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.rsvpMatch(tenantId, matchId),
    queryFn: () => fetchRsvpMatch(tenantId, matchId),
    staleTime: 30 * 1000,
    // NO enabled condition - avoids race condition
  });
}
```

### **Fields Already Implemented**

Don't add these to the database (already exist from auth implementation):
- ✅ `players.phone` (E.164 format)
- ✅ `players.email` (nullable)
- ✅ `players.auth_user_id` (link to Supabase auth)
- ✅ `players.is_admin` (admin flag)
- ✅ `players.tenant_id` (multi-tenancy)
- ✅ `idx_players_phone` index

Only add RSVP-specific fields:
- ⭕ `players.tier` (A/B/C for booking priority)
- ⭕ `players.last_verified_at` (phone verification tracking)

### **Security Reminders**

**RLS is NOT enforcing on operational tables:**
- Only `auth.*`, `tenants`, `admin_profiles` have RLS enabled
- All RSVP tables rely on explicit `withTenantFilter()` helper
- Missing `withTenantFilter()` = security vulnerability
- See `SPEC_multi_tenancy.md` Section Q for architecture decision

**HTTP Cache Headers Required:**
All RSVP endpoints must include:
```typescript
headers: {
  'Cache-Control': 'no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Vary': 'Cookie',
}
```

### **Reference Implementations**

Study these existing files before implementing RSVP:
- **API Pattern**: `src/app/api/admin/match-player-pool/route.ts`
- **React Query**: `src/hooks/queries/useLatestPlayerStatus.hook.ts`
- **Query Keys**: `src/lib/queryKeys.ts`
- **Tenant Filtering**: `src/lib/tenantFilter.ts`
- **Tenant Context**: `src/lib/tenantContext.ts`
- **Auth Helpers**: `src/lib/auth/apiAuth.ts`
- **Advisory Locks**: `src/lib/tenantLocks.ts`

---

**End of Consolidated Specification v4.3.0**
