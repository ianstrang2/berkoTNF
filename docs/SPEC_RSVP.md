# BerkoTNF RSVP & Player Invitation System — Consolidated Implementation Specification

**Version 4.2.0-consolidated • Updated January 2025**

**CONSOLIDATION NOTES:**
- Removed calendar integration (out of scope)
- Simplified auto-balance coverage (leverages existing implementation)
- Aligned with actual codebase patterns (worker HTTP calls, method name mapping)
- Reduced redundancy while preserving all critical technical details
- Clarified dropout/refill rebalance behavior
- Merged security and concurrency sections for clarity
- Length reduced from 2477 to 1273 lines (~49% reduction)

---

**BUILDING ON COMPLETE MULTI-TENANCY FOUNDATION**

This specification builds on **fully implemented multi-tenancy infrastructure** (all 33+ tables tenant-scoped with RLS policies) and established API patterns across 70+ routes. Current system includes Draft → PoolLocked → TeamsBalanced → Completed match lifecycle, established UI patterns, and production-ready tenant-aware infrastructure.

**Dependencies:** This specification builds on `SPEC_auth.md` (v5.0 - Phone-Only) for phone authentication, admin privileges, auto-linking, and session management. All authentication logic is defined in the Auth Specification. This spec focuses on RSVP booking logic only.

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
- Player lists with source badges: 📱 App, 🌐 Web, 👤 Admin, 🎯 Ringer
- Activity feed showing timeline of all RSVP events

**Add ringers manually** using existing "Add Player" modal.

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

**Who gets notifications:** Regular players get tier-open and last-call pushes. Ringers excluded from auto-notifications but receive transactional pushes (teams released, cancellation, waitlist offers).

### **4) Waitlist & offers**

Grace period after dropout (5min/2min/1min based on time to kick-off). Top-3 simultaneous offers, first to claim wins. Dynamic TTL (4h/1h/30min/instant). Auto-cascade until spot claimed or waitlist empty.

### **5) Smart notifications**

Push-only via Capacitor (FCM/APNs). Tier-open, waitlist offers, last-call, teams released, cancellation. Spam protection: max 3 last-call per player per match, 6-hour cooldown, batching.

### **6) Admin Match Control Centre**

Enhanced booking panel with live counters, invite mode selection, auto-balance controls (method dropdown + enable checkbox), player lists with badges, activity feed, manual triggers, waitlist dashboard.

### **7) Ringers explained**

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

```sql
-- Current: players(player_id, tenant_id, name, is_ringer, ...) ✅ EXISTS

ALTER TABLE players
  ADD COLUMN phone TEXT,
  ADD COLUMN tier TEXT NOT NULL DEFAULT 'C' CHECK (tier IN ('A','B','C')),
  ADD COLUMN last_verified_at TIMESTAMPTZ;

ALTER TABLE players
  ADD CONSTRAINT valid_uk_phone 
  CHECK (phone IS NULL OR phone ~ '^\+44[1-9]\d{9}$');

CREATE UNIQUE INDEX IF NOT EXISTS uniq_players_tenant_phone 
  ON players (tenant_id, phone) WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_tenant_phone ON players(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_players_tenant_tier ON players(tenant_id, tier);
```

**Phone Normalization:** Use E.164 utilities from Auth Specification (`normalizeToE164`, `isValidUKPhone`).

### **3.2 Upcoming Matches**

```sql
-- Current: upcoming_matches(upcoming_match_id, tenant_id, ...) ✅ EXISTS

ALTER TABLE upcoming_matches
  ADD COLUMN booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
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
  player_id INT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
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
  details TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_ledger_tenant_match_player
  ON notification_ledger(tenant_id, upcoming_match_id, player_id);
CREATE INDEX IF NOT EXISTS idx_notif_ledger_tenant_kind
  ON notification_ledger(tenant_id, kind, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_ledger_tenant_audit
  ON notification_ledger(tenant_id, upcoming_match_id, kind, sent_at DESC)
  WHERE kind LIKE 'audit/%';
```

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
('enable_ringer_self_book', 'false', 'Allow ringer self-booking', 'rsvp_policies'),
('include_ringers_in_invites', 'false', 'Include ringers in invites', 'rsvp_policies'),
('block_unknown_players', 'true', 'Block unknown phone numbers', 'rsvp_policies'),
('rsvp_burst_guard_enabled', 'true', 'Enable burst protection', 'rsvp_advanced'),
('default_phone_country', 'GB', 'Phone normalization country', 'rsvp_advanced')
ON CONFLICT (config_key) DO NOTHING;
```

---

## **4) Implementation Patterns**

All RSVP endpoints follow established BerkoTNF patterns.

### **4.1 API Response Format**

```typescript
export type ApiOk<T> = { success: true; data: T };
export type ApiErr = { success: false; error: string; code?: string };
export const ok = <T>(data: T): ApiOk<T> => ({ success: true, data });
export const fail = (error: string, code?: string): ApiErr => ({ success: false, error, code });
```

### **4.2 Cache Integration**

```typescript
export const CACHE_TAGS = {
  RSVP_MATCH: (tenantId: string, mid: number) => `RSVP_MATCH:${tenantId}:${mid}`,
  PLAYER_POOL: (tenantId: string, mid: number) => `PLAYER_POOL:${tenantId}:${mid}`,
};

export async function revalidateRsvp(tenantId: string, matchId: number) {
  await Promise.allSettled([
    revalidateTag(CACHE_TAGS.RSVP_MATCH(tenantId, matchId)),
    revalidateTag(CACHE_TAGS.PLAYER_POOL(tenantId, matchId)),
  ]);
}
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

### **4.4 Security & Rate Limiting**

**Deep Link:** `capo://match/123`

**Token Security:** 32+ byte URL-safe random, hashed storage (bcrypt), auto-expire at kickoff+24h.

**Rate Limits (multi-tenant):**
- Respond: `tenant:{tenantId}:match:{matchId}:phone:{E164}` (10/min)
- Burst: `tenant:{tenantId}:match:{matchId}` (50 writes/10s)
- Token validation: 50/hour per IP

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

### **4.5 RLS Policies**

```sql
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_players ON players
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Set tenant context: `SELECT set_config('app.tenant_id', $1, false);`

### **4.6 SQL Functions**

Complex business logic in version-controlled SQL files (deployed via `deploy_all.ps1`):
- `rsvp_process_waitlist_cascade.sql` - Expire offers, auto-cascade
- `rsvp_calculate_notification_targets.sql` - Filter eligible players
- `rsvp_adjust_match_capacity.sql` - LIFO demotion on capacity decrease

---

## **5) API Surface**

**Authentication:** Admin endpoints require admin auth + tenant validation. Public endpoints use multi-tenant rate limiting. PII protection: always mask phone numbers (`+447******789`).

### **5.1 Admin Endpoints**

```typescript
// GET /api/admin/upcoming-matches?matchId={id}&includeRsvp=true
// Returns match with RSVP data, tenant-scoped

// PATCH /api/admin/upcoming-matches/[id]/enable-booking
{
  "inviteMode": "all" | "tiered",
  "tierWindows": { "a_open_at": "...", "b_open_at": "...", "c_open_at": "..." },
  "autoBalance": { "enabled": false, "method": "performance", "autoLockWhenFull": false }
}

// POST /api/admin/invites/[matchId]/send
{ "stages": ["A", "B", "C"], "targetCount": 20 }

// GET /api/admin/matches/[id]/activity
// Last 200 events from notification_ledger, ORDER BY sent_at DESC

// POST /api/admin/matches/[id]/autobalance
// Manual auto-balance trigger (Draft only, auto_balance_enabled=true)

// POST /api/admin/waitlist/reissue
{ "matchId": 123 }

// POST /api/admin/dropout/process-now  
{ "matchId": 123, "playerId": 456 }
```

### **5.2 Public Booking Endpoints**

```typescript
// POST /api/booking/respond
export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return unauthorized();
  
  const playerPhone = session.user.phone;
  const tenantId = session.user.app_metadata?.tenant_id;
  const { matchId, action, outFlexible } = await request.json();
  
  await processRSVP(tenantId, matchId, playerPhone, action, outFlexible);
}

// POST /api/booking/waitlist/claim
export async function POST(request: NextRequest) {
  const { user, player, tenantId } = await requirePlayerAccess(request);
  const { matchId } = await request.json();
  
  await withTenantMatchLock(tenantId, matchId, async (tx) => {
    const offer = await tx.match_player_pool.findFirst({
      where: { 
        tenant_id: tenantId,
        upcoming_match_id: matchId,
        phone: player.phone,
        response_status: 'WAITLIST',
        offer_expires_at: { gt: new Date() }
      },
      lock: 'UPDATE'
    });
    
    if (!offer) throw new Error('No valid offer');
    await claimWaitlistSpot(tx, tenantId, matchId, player.phone);
  });
}

// GET /api/booking/match/[id]/status
// Returns match status for authenticated player
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
- **Near kick-off offers:** Auto-expire all offers at kickoff−15m with countdown
- **Manual admin add:** Consumes capacity and supersedes outstanding offers (logged in activity feed)
- **Instant claim mode:** When <15min to kick-off, switch to instant claim (no hold period)
  - Public page banner: "Kick-off soon! Spots are first-come, first-served."
  - Push copy: "Spot open now — first to tap gets it."
  - UI: Hide timers, claim proceeds immediately

---

## **8) UI/UX Implementation**

Integration with existing BerkoTNF soft-UI styling and component patterns.

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
// src/app/upcoming/match/[id]/page.tsx
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

**Tenant context pattern (critical):**

```typescript
async function processJob(job: JobData) {
  const { tenant_id } = job.payload;
  if (!tenant_id) throw new Error('Missing tenant_id');
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant_id}, false)`;
  await processJobLogic(job);
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

Uses existing balance system. Worker makes HTTP call to balance endpoint:

```typescript
export async function processAutoBalanceJob(jobId: string, payload: AutoBalanceJobPayload) {
  const { matchId, method, tenantId, playerIds, state_version } = payload;
  
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
      player_id: 0,
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

Ringer blocked (self-book OFF):
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
- Enhanced /upcoming overview with RSVP status
- Unified RSVP experience for all users
- Phone validation with E.164 normalization
- Rate limiting, burst protection, security
- Ringer access control

**PHASE 5: Polish & Testing (Week 5-6)**
- App installation tracking
- Ringer management UI polish
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

## **15) Developer Guide**

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

Document moved to `docs/FUTURE_PROBLEMS.md`:
- Multi-league identity management
- Payment authorization timing
- Profile name conflict resolution
- Bulk operations for large leagues
- Cross-platform admin notifications
- Email/SMS fallback for notifications

---

## **20) Final Summary**

This consolidated specification delivers a **production-ready multi-tenant RSVP system**:

✅ **Streamlined RSVP** with unified experience for all users  
✅ **Auto-balance integration** leveraging existing team balancing system  
✅ **Admin-only ringer management** without complex approval flows  
✅ **Real-time activity feed** with comprehensive event tracking  
✅ **Fixed last-call windows** (T-12h/T-3h) with timestamp-based idempotency  
✅ **Enhanced waitlist** with offer logging and batch tracking  
✅ **Production security** with token hashing, rate limiting, tenant isolation  
✅ **WhatsApp-simple workflow** optimized for casual football matches

### **Key Architectural Decisions**

- Multi-tenant from day one (all 33+ tables tenant-scoped)
- Phone-only authentication (UK mobile numbers initially)
- App-first experience (Capacitor wrapper)
- Conservative defaults (booking OFF, auto-balance OFF, auto-lock OFF)
- Dropout/refill rebalancing (teams unbalance when below capacity)
- Worker HTTP calls for balance (not RPC, matches existing pattern)

### **Database Changes**

- 6 tables enhanced with RSVP fields
- 3 new tables (match_invites, notification_ledger, push_tokens)
- 20+ tenant-scoped indexes
- FK integrity triggers
- Complete RLS policies

### **Implementation Phases**

5-6 week roadmap covering database, backend, admin UI, mobile app, and production testing. Phased rollout with feature flags ensures safe deployment.

The specification maintains **backward compatibility** throughout. Teams using manual-only workflow see zero impact. RSVP is purely additive functionality.

---

**End of Consolidated Specification**
