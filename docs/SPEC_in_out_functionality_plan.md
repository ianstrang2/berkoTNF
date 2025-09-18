BerkoTNF RSVP & Player Invitation System — Complete Implementation Specification

Version 3.2.4 • Final Production-Ready Implementation Plan

**UPDATED FOR ACTUAL CODEBASE ARCHITECTURE**

This specification has been thoroughly reviewed against the existing BerkoTNF codebase and updated to align with:
- Existing database schema and naming conventions
- Current match lifecycle system (Draft → PoolLocked → TeamsBalanced → Completed)
- Established UI patterns and soft-UI styling
- Background worker infrastructure
- API patterns using Prisma
- Component architecture and file organization

---

## **Human Overview — How It Works (Plain English)**

### **1) What the admin does**

**Create match as usual.**

**If they want bookings:** toggle "Allow self-serve booking", choose invite mode:
- **All at once (default):** Everyone can book immediately
- **Tiered mode:** Set tier windows (A/B/C) with customizable timing
- Global defaults minimize per-match configuration

**Share one link** in WhatsApp (or anywhere).

**Watch "Booked n/m" (and "Waitlist k")** tick up in the Match Control Centre.

**Add ringers manually any time** (manual add always works).

**When ready:** Lock Pool → Balance Teams → Complete (unchanged workflow).

### **2) What players see / do**

**Tap the shared link:**
- Opens the familiar berkotnf.com/upcoming page with match-specific RSVP interface.
- Shows match details, current status, and RSVP buttons.
- Works perfectly on mobile and desktop browsers.

**On the berkotnf.com/upcoming page,** they can:
- **IN** - Confirm attendance
- **OUT** - Can't make it (with subtle "Might be available later" option underneath)
- **Join Waitlist** - if match is full

**If they're waitlisted and a spot opens:**
- The system sends a push to the top 3 waitlisted players.
- First to claim gets the spot. Others get a "spot filled" notification.

**Near kick-off** (if the match is short of players), the system sends a last-call push (see timings below).

### **3) Who gets invited when (invite modes)**

**Two invite modes per match:**

**All at once (default):** Anyone with the link can book immediately until capacity is reached.

**Tiered mode:** Time-based booking windows with A/B/C tiers:
- **Tier A** players can book first
- **Tier B** players can book from a later time
- **Tier C** players (default tier for all players) can book from an even later time
- Admins can set any two tiers to open simultaneously for a two-window flow

**Tier Assignment:** Tier C is the default for all players unless explicitly set to A or B by an admin.

**Global defaults:** Admins can set default tier offsets (e.g., Tier B opens +24 hours after Tier A, Tier C +48 hours) to minimize per-match configuration.

### **4) How the waitlist & offers work**

**When the match is full,** players can Join Waitlist.

**If someone drops OUT,** there is a dynamic grace period (5min normally, 2min if <24h, 1min if <3h to kick-off) so they can change their mind.

**After grace,** the system checks capacity; if a spot is free it offers to the top 3 waitlisted (by queue order).

**Offers have a time limit (TTL):**
- **Dynamic TTL:** 4h normally, 1h if <24h to kick-off, 30min if <3h to kick-off
- **TTL never runs past kick-off;** minimum hold 5min; when <15m to kick-off → instant claim (no hold)
- **Auto-cascade:** When offers expire, automatically offer to next top-3 players
- **First to claim gets in;** the rest see "spot filled" and remain on the waitlist

### **5) Notifications (push only; no SMS/email)**

- **Tier-open push** (when a player's tier window opens).
- **Waitlist offer push** (top 3 with TTL).
- **Last-call push** if still short before kick-off:
  - **Enhanced system:** T-12h and T-3h messages (targeted to unresponded and "OUT but flexible").
  - **No quiet hours:** All notifications send immediately when scheduled.
- **Cancellation push** to all booked + waitlist.
- **Spam guard:** max 3 dropout/last-call pushes per player per match. Tier-open and waitlist_offer pushes are uncapped (still deduped/batched).
- **6h last-call cooldown:** Players who received last-call in past 6h are excluded from subsequent last-call messages.

### **6) What the admin sees in Match Control Centre**

**A Booking panel (when enabled) with:**

**Top row (always visible):**
- Enable RSVP toggle • Copy link button • "Booked 15/20" • "Waitlist 3"

**Main controls:**
- **Invite mode:** "All at once" (default) | "Tiered"
- **Tiered controls:** Tier A/B/C windows with customizable timing
- Player lists: IN / OUT / WAITLIST / PENDING with ringer badges

**Advanced sections (collapsible):**
- **Waitlist management:** Active offers + countdown + Offer log + "Send new waitlist offers"
- **Manual overrides:** "Release spot now" | "Send last-call"
- **Quick-share messages (WhatsApp):** Pre-filled messages for manual sharing (tier-open, last-call, waitlist offers)
- **RSVP Activity:** Real-time RSVP events and admin actions

**The Lock/Balance/Complete steps behave exactly as today.**

### **7) Ringers (guests/one-off players)**

**Ringers = one-off players** the admin adds manually (don't appear in season stats; same as today).

**By default, ringers do not receive automatic invites** - admin keeps control over who gets notified.

**Two global policy settings** (configured in admin settings, off by default):
- "Include ringers in invites" - they get tier-open and last-call notifications
- "Allow ringers to book" - they can use the public booking link

**If a ringer becomes a regular,** admin flips `is_ringer=false` - no duplicate profiles, no data loss.

**Phone-based identity:** One phone number = one player record (prevents duplicates).

**Auto-created ringer profiles** (when unknown phone books):
- **Name**: User-provided (required, max 14 characters, must be globally unique)
- **Phone**: Normalized E.164 format
- **Profile**: `is_ringer=true`, all ratings=3, tier='C', club=null
- **Validation**: Same rules as admin player creation (14-char limit, unique name check)

---

0) Scope & Goals

Add in/out (RSVP) functionality to keep matches full with minimal admin effort and no paid messaging.

In scope

Two match modes per match:

Manual only (default) — works exactly as today.

Self-serve booking (shareable link) — optional toggle.

Invitations & responses (IN / OUT / WAITLIST) with tier open windows (A | B | C).

Waitlist with top-3 simultaneous offers and offer TTL.

Native push notifications via Capacitor (FCM/APNs).

Deep links: the same URL opens the app if installed, web booking otherwise.

Optional calendar .ics files for reminders.

Admin Activity Feed.

Secure booking link; “remember me” for web hold-outs.

DB schema, APIs, background jobs (Render worker), RLS, and UI.

Out of scope (deferred to separate specification)

Per-match billing and payment processing

Season memberships/billing

Payment provider integration (Stripe)

Complex pricing/credits/no-shows

1) Guiding Principles

No new match states. RSVP in Draft; Lock/Balancing/Complete unchanged.
Flow: Draft → PoolLocked → TeamsBalanced → Completed (+ Cancelled).

Single source of truth: extend match_player_pool for attendance.

Deterministic & auditable: every push/wave logged; Activity Feed is data-driven.

Race-safe waitlist: offers have TTL; claims are atomic.

Clean RSVP-only implementation without billing complexity.

One link for everything: deep-links to app or falls back to web landing.

Capacity management: If admin lowers capacity below current IN, the last IN by timestamp moves to WAITLIST (FIFO), with activity log entry and push notification. Outstanding waitlist offers are auto-expired/superseded when capacity drops to full.

2) Modes (per match)

Manual only (default)
No public link. Admin adds players as today.

Self-serve booking
Toggle Allow self-serve booking → app generates a public booking link + editable share text.
Optional tier open times (A→B→C). Admin can still add players manually at any time.

3) Database Schema Changes

**EXISTING SCHEMA ANALYSIS:**
- `players` table: ✅ Already exists with all required fields
- `upcoming_matches` table: ✅ Already exists with match lifecycle states
- `match_player_pool` table: ✅ Already exists with basic RSVP functionality
- `background_job_status` table: ✅ Already exists for job processing

**REQUIRED ADDITIONS:**

3.1 Players (Add Phone & Tier System)
```sql
-- Add phone field for RSVP identity (international E.164 format)
-- Note: All new players default to Tier C unless explicitly assigned A or B by admin
ALTER TABLE players
  ADD COLUMN phone TEXT UNIQUE,
  ADD COLUMN tier TEXT NOT NULL DEFAULT 'C' CHECK (tier IN ('A','B','C'));

-- Indexes for RSVP lookups
CREATE INDEX IF NOT EXISTS idx_players_phone ON players(phone);
CREATE INDEX IF NOT EXISTS idx_players_tier ON players(tier);
CREATE INDEX IF NOT EXISTS idx_players_ringer ON players(is_ringer);

-- Phone validation constraint (E.164 international format)
ALTER TABLE players
  ADD CONSTRAINT valid_e164_phone 
  CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{7,14}$');
```

**Phone Normalization:** All phone input must be normalized to E.164 format before storage to prevent duplicates

**Normalization Examples:**
- `07123456789` → `+447123456789` (UK mobile)
- `+44 7123 456789` → `+447123456789` (remove spaces)
- `+1 555 123 4567` → `+15551234567` (US number)

**Implementation:**
```typescript
// src/utils/phone.util.ts
export function normalizeToE164(phone: string, defaultCountry: string = 'GB'): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If starts with +, validate E.164 format
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // UK-specific normalization (07... → +447...)
  if (defaultCountry === 'GB' && cleaned.startsWith('07')) {
    return '+44' + cleaned.substring(1);
  }
  
  // Add default country code if needed
  // (Add other country logic as needed for SaaS expansion)
  
  return cleaned;
}
```

**Note:** `is_ringer` field already exists - will be used for guest/one-off players

3.2 Upcoming Matches (Add RSVP Features)
```sql
ALTER TABLE upcoming_matches
  ADD COLUMN booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN invite_token TEXT,                           -- secure token for the public link
  ADD COLUMN a_open_at TIMESTAMPTZ NULL,
  ADD COLUMN b_open_at TIMESTAMPTZ NULL,
  ADD COLUMN c_open_at TIMESTAMPTZ NULL,
  ADD COLUMN match_timezone TEXT NOT NULL DEFAULT 'Europe/London';  -- for display only (not used for scheduling)

CREATE UNIQUE INDEX IF NOT EXISTS idx_upcoming_matches_invite_token
  ON upcoming_matches(invite_token);
```

3.3 Match Player Pool (Extend Existing Table)
**CURRENT:** Already has `response_status` field with values 'IN', 'OUT', 'MAYBE', 'PENDING'

**RESPONSE STATUS SEMANTICS:**
- **IN**: Confirmed attendance (counts toward capacity)
- **OUT**: Cannot attend  
- **MAYBE**: Soft interest (excluded from capacity counts, kept for backward compatibility)
- **WAITLIST**: Wants to attend but match is full
- **PENDING**: No response yet

**CAPACITY CALCULATION:** Capacity counts IN only. MAYBE, PENDING, and WAITLIST are excluded.

```sql
-- Extend existing match_player_pool table
ALTER TABLE match_player_pool
  ADD COLUMN invited_at TIMESTAMPTZ NULL,
  ADD COLUMN invite_stage TEXT NULL,                       -- 'A','B','C'
  ADD COLUMN reminder_count INTEGER NOT NULL DEFAULT 0,    -- used for caps
  ADD COLUMN muted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN out_flexible BOOLEAN NOT NULL DEFAULT FALSE,  -- "I might be available later"
  ADD COLUMN waitlist_position INTEGER NULL,
  ADD COLUMN offer_expires_at TIMESTAMPTZ NULL,            -- TTL for waitlist offer
  ADD COLUMN source TEXT NULL;                             -- 'app'|'web'|'admin'

-- Update response_status to include WAITLIST
ALTER TABLE match_player_pool 
  DROP CONSTRAINT IF EXISTS match_player_pool_response_status_check;
ALTER TABLE match_player_pool 
  ADD CONSTRAINT match_player_pool_response_status_check 
  CHECK (response_status IN ('PENDING','IN','OUT','MAYBE','WAITLIST'));

-- Unique constraint to prevent duplicate player entries
ALTER TABLE match_player_pool
  ADD CONSTRAINT uniq_mpp_player_match UNIQUE (upcoming_match_id, player_id);

-- Performance and integrity indexes
CREATE INDEX IF NOT EXISTS idx_mpp_match_status
  ON match_player_pool(upcoming_match_id, response_status);
CREATE INDEX IF NOT EXISTS idx_mpp_match_waitpos
  ON match_player_pool(upcoming_match_id, waitlist_position);
CREATE INDEX IF NOT EXISTS idx_mpp_match_offer_exp
  ON match_player_pool(upcoming_match_id, offer_expires_at);

-- Optimized waitlist query index
CREATE INDEX IF NOT EXISTS idx_mpp_waitlist_active
  ON match_player_pool (upcoming_match_id, waitlist_position)
  WHERE response_status='WAITLIST' AND offer_expires_at IS NULL;

-- Waitlist position integrity (prevents duplicate positions)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mpp_waitpos_per_match
  ON match_player_pool (upcoming_match_id, waitlist_position)
  WHERE response_status = 'WAITLIST' AND waitlist_position IS NOT NULL;

-- Integrity constraint for offer expiry
ALTER TABLE match_player_pool
  ADD CONSTRAINT offer_expiry_only_for_waitlist
  CHECK (offer_expires_at IS NULL OR response_status='WAITLIST');
```

3.4 New Tables (Following BerkoTNF Conventions)

**Invitation Waves (Audit Trail)**
```sql
CREATE TABLE IF NOT EXISTS match_invites (
  id BIGSERIAL PRIMARY KEY,
  upcoming_match_id INT NOT NULL REFERENCES upcoming_matches(upcoming_match_id) ON DELETE CASCADE,
  stage TEXT NOT NULL,                  -- 'A','B','C' or custom
  created_by INT NOT NULL,              -- admin user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_count INTEGER NULL
);
CREATE INDEX IF NOT EXISTS idx_match_invites_match
  ON match_invites(upcoming_match_id);
```

**Notification Ledger (Push Audit, Caps, Batching)**
```sql
CREATE TABLE IF NOT EXISTS notification_ledger (
  id BIGSERIAL PRIMARY KEY,
  upcoming_match_id INT NOT NULL REFERENCES upcoming_matches(upcoming_match_id) ON DELETE CASCADE,
  player_id INT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  kind TEXT NOT NULL
    CHECK (kind IN ('invite','dropout','waitlist_offer','last_call','cancellation','digest')),
  batch_key TEXT NULL,                  -- window key to coalesce pushes
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_ledger_match_player
  ON notification_ledger(upcoming_match_id, player_id);
CREATE INDEX IF NOT EXISTS idx_notif_ledger_match_kind
  ON notification_ledger(upcoming_match_id, kind);
```

**Native Push Tokens (Capacitor App)**
```sql
CREATE TABLE IF NOT EXISTS push_tokens (
  id BIGSERIAL PRIMARY KEY,
  player_id INT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android')),
  fcm_token TEXT NOT NULL,              -- FCM for Android, APNs via FCM for iOS
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, device_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_player
  ON push_tokens(player_id);
```

**Feature Flags (Extend Existing app_config)**
**CURRENT:** `app_config` table already exists with proper structure

```sql
-- Add RSVP configuration to existing app_config table (integrate with admin setup)
INSERT INTO app_config(config_key, config_value, config_description, config_group, display_name, display_group, sort_order) VALUES
-- RSVP system configuration
('enable_rsvp_system', 'false', 'Enable RSVP invitation system', 'rsvp', 'Enable RSVP', 'RSVP System', 1),
('enable_push_notifications', 'false', 'Enable native push notifications', 'rsvp', 'Push Notifications', 'RSVP System', 2),
-- Match creation defaults (appear in existing "Match Creation Defaults" section)
('default_booking_enabled', 'false', 'Enable RSVP by default for new matches', 'match_settings', 'Default RSVP Enabled', 'Match Creation Defaults', 10),
('default_invite_mode', 'all', 'Default invite mode for new matches', 'match_settings', 'Default Invite Mode', 'Match Creation Defaults', 11),
('tier_b_offset_hours', '24', 'Default hours between Tier A and Tier B', 'match_settings', 'Tier B Offset (hours)', 'Match Creation Defaults', 12),
('tier_c_offset_hours', '48', 'Default hours between Tier A and Tier C', 'match_settings', 'Tier C Offset (hours)', 'Match Creation Defaults', 13),
-- Global RSVP policies (new section - club-wide settings)
('enable_ringer_self_book', 'false', 'Allow ringers to book via public links', 'rsvp_policies', 'Allow Ringers to Book', 'RSVP Policies', 1),
('include_ringers_in_invites', 'false', 'Include ringers in automatic invitations', 'rsvp_policies', 'Include Ringers in Invites', 'RSVP Policies', 2),
('block_unknown_players', 'false', 'Block unknown phone numbers from booking', 'rsvp_policies', 'Block Unknown Players', 'RSVP Policies', 3),
-- Advanced RSVP settings (technical settings)
('rsvp_burst_guard_enabled', 'false', 'Enable write-burst protection for leaked links', 'rsvp_advanced', 'Burst Protection', 'RSVP Advanced', 1)
ON CONFLICT (config_key) DO NOTHING;

-- Note: enable_match_billing flag deferred to existing billing specification (Billing_Plan.md)
-- Integration: These settings appear in your existing admin/setup interface:
--   - "RSVP System" section for enable/disable flags
--   - "Match Creation Defaults" section for new match defaults
--   - "RSVP Policies" section for club-wide booking policies
--   - "RSVP Advanced" section for technical settings
-- Reset functionality: Uses existing app_config_defaults table for "Reset to Defaults" buttons
```

**Feature Flag System (Hybrid: Environment Overrides Database):**
```typescript
// src/lib/flags.ts
import { prisma } from '@/lib/prisma';

const envBool = (k: string) => (process.env[k] ?? '').trim().toLowerCase() === 'true';

export async function getFlag(key: string, envKey?: string): Promise<boolean> {
  if (envKey && process.env[envKey] !== undefined) return envBool(envKey);
  const row = await prisma.app_config.findUnique({ where: { config_key: key }});
  return (row?.config_value ?? '').toString().trim().toLowerCase() === 'true';
}

export async function getNumberFlag(key: string, envKey?: string): Promise<number> {
  if (envKey && process.env[envKey] !== undefined) return parseInt(process.env[envKey]!, 10) || 0;
  const row = await prisma.app_config.findUnique({ where: { config_key: key }});
  return parseInt((row?.config_value ?? '0').toString(), 10) || 0;
}

// Usage examples:
// await getFlag('enable_push_notifications', 'ENABLE_NATIVE_PUSH')
// await getFlag('rsvp_burst_guard_enabled', 'RSVP_BURST_GUARD')
```

4) Implementation Patterns (Match Existing Codebase)

4.1 API Response Format (Consistent with Existing)
```typescript
// src/lib/api.ts
export type ApiOk<T> = { success: true; data: T };
export type ApiErr = { success: false; error: string; code?: string };
export const ok = <T>(data: T): ApiOk<T> => ({ success: true, data });
export const fail = (error: string, code?: string): ApiErr => ({ success: false, error, code });
```

4.2 PostgreSQL Error Mapping (Match Existing Patterns)
```typescript
// src/lib/pg-errors.ts
export function httpFromPg(e: any): { status: number; message: string } {
  const code = e?.code as string|undefined;
  if (code === '23505') return { status: 409, message: 'Conflict' };          // unique
  if (code === '23503') return { status: 400, message: 'Invalid reference' }; // FK
  if (code === '23514') return { status: 400, message: 'Invalid value' };     // CHECK
  if (code?.startsWith('23')) return { status: 409, message: 'Conflict' };
  return { status: 500, message: 'Internal error' };
}
```

4.3 Cache Integration (Extend Existing CACHE_TAGS)
```typescript
// src/lib/cache/constants.ts - ADD TO EXISTING
export const CACHE_TAGS = {
  // ... existing tags
  RSVP_MATCH: (mid: number) => `RSVP_MATCH:${mid}`,
  PLAYER_POOL: (mid: number) => `PLAYER_POOL:${mid}`,
};

// src/lib/cache.ts
import { revalidateTag } from 'next/cache';
export async function revalidateRsvp(matchId: number) {
  await Promise.allSettled([
    revalidateTag(CACHE_TAGS.UPCOMING_MATCH),
    revalidateTag(CACHE_TAGS.RSVP_MATCH(matchId)),
    revalidateTag(CACHE_TAGS.PLAYER_POOL(matchId)),
  ]);
}
```

4.4 Transaction Patterns (Match Existing)
```typescript
// src/lib/rsvp-lock.ts
import { prisma } from '@/lib/prisma';

export async function withMatchLock<T>(matchId: number, fn: (tx: typeof prisma) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1)', matchId);
    return fn(tx);
  });
}
```

4.5 Notification Interface (Stub for Push)
```typescript
// src/lib/notifier.ts
export type PushKind = 'invite'|'waitlist_offer'|'last_call'|'cancellation';
export interface Notifier { 
  send(kind: PushKind, playerIds: number[], payload: any): Promise<void>; 
}

export const DevNotifier: Notifier = {
  async send(kind, playerIds, payload) {
    console.log('[DEV_PUSH]', kind, playerIds, payload);
    // Write to notification_ledger for cooldown tracking
  }
};
```

```typescript
// src/middleware/rate.ts
const buckets = new Map<string, { n: number; t: number }>();

export function burstGuard(key: string, limit = 50, windowMs = 10_000) {
  const now = Date.now();
  const b = buckets.get(key) ?? { n: 0, t: now };
  if (now - b.t > windowMs) { b.n = 0; b.t = now; }
  b.n++; buckets.set(key, b);
  return b.n <= limit;
}
```

4.7 One Smart Link & Security

URL: https://berkotnf.com/upcoming/match/:id?token=...

**Invite Token Security:** `invite_token` is a 32+ byte URL-safe random value; store hash of token server-side; compare on request. Rotate on demand; auto-expire after match date.

**Rate Limits:**
- Standard: 10/min per IP + per device + per playerId per match
- Burst protection: 50 writes/10s per match (feature-flagged)
- Block unknown players: Per-match toggle for closed sessions

4.3 RLS (Supabase or equivalent)

Admins: full CRUD on RSVP for matches they own.

Players: SELECT limited match info; SELECT/UPDATE only their own match_player_pool row.

Public web: only booking flow via token; server performs writes.

5) API Surface (Following BerkoTNF Patterns)

**INTEGRATION WITH EXISTING APIs:**
- Extend existing `/api/admin/upcoming-matches` endpoints
- Use existing `/api/admin/match-player-pool` for RSVP data
- Follow established Prisma patterns and error handling
- Integrate with existing background job system

5.1 Match RSVP Management (Admin)

**Extend existing admin endpoints:**

```typescript
// GET /api/admin/upcoming-matches?matchId={id}&includeRsvp=true
// Returns match with RSVP data, invite mode, tier windows, booking status

// PATCH /api/admin/upcoming-matches/[id]/enable-booking
// Enables RSVP for a match, generates fresh invite_token (new token each time toggled ON)
{
  "inviteMode": "all" | "tiered",
  "tierWindows": {
    "a_open_at": "2024-01-15T10:00:00Z",      // Tier A
    "b_open_at": "2024-01-15T12:00:00Z",      // Tier B
    "c_open_at": "2024-01-15T14:00:00Z"  // Tier C
  }
}
// API enforces monotonicity (A ≤ B ≤ C), past time clamping, kick-off limits
// Admins can set B and C to same time for two-window flow

// POST /api/admin/invites/[matchId]/send
// Send tier-based invitations (tiered mode only)
{ "stages": ["A", "B", "C"], "targetCount": 20 }

// NEW: Waitlist management
// POST /api/admin/waitlist/reissue
{ "matchId": 123 }
// Immediately triggers waitlist offer logic (respects caps/muted)
// UI: "Send new waitlist offers" button

// NEW: Grace period override
// POST /api/admin/dropout/process-now  
{ "matchId": 123, "playerId": 456 }
// Skip remaining grace period, finalize dropout, trigger offers
// UI: "Release spot now" button (clarifies it skips grace period)

```

5.2 Public Booking Interface

**New public endpoints for RSVP:**

```typescript
// GET /api/booking/match/[id]?token={invite_token}
// Public match details for RSVP (no auth required)

// POST /api/booking/respond
// Player RSVP response (idempotent per matchId+playerId)
{ 
  "matchId": 123, 
  "token": "secure_token", 
  "phone": "+447...", 
  "action": "IN" | "OUT" | "WAITLIST",
  "source": "app" | "web",
  "outFlexible": true // optional, for "Might be available later"
}
// Implementation: 
// - Phone normalization to E.164, check unique constraint violations
// - Unknown player logic (uses global block_unknown_players setting): 
//   - If block_unknown_players=true → reject with "not registered" message
//   - If false + enable_ringer_self_book=false → reject with ringer message  
//   - If false + enable_ringer_self_book=true → auto-create as ringer
// - Ringer access control: block if is_ringer=true and enable_ringer_self_book=false
// - Burst protection: 50 writes/10s per matchId if rsvp_burst_guard_enabled=true
// - Idempotent on (matchId, playerId) - ignores duplicates/no-ops, returns current state
// - Use transaction with SELECT ... FOR UPDATE to prevent race conditions
// - Atomic waitlist position assignment: ORDER BY waitlist_position ASC (pure FIFO queue)

// POST /api/booking/waitlist/claim
// Claim waitlist offer (with re-validation)
{ "matchId": 123, "token": "abc", "phone": "+447..." }
// Implementation: prisma.$transaction with pg_advisory_xact_lock(matchId) to serialize mutations

// GET /api/booking/match/[id]/live  
// Live match status updates (15s polling for non-push users)
// Returns: capacity, user status, active offer (with expiresAt), spots remaining
// Headers: Cache-Control: no-store
```

5.3 Background Job Integration

**Extend existing background job system:**

```typescript
// Use existing /api/admin/enqueue-stats-job endpoint
// Add new job types to existing worker:

// Background jobs run on existing Render worker:
// - tier_open_notifications
// - dropout_grace_processor  
// - waitlist_offer_processor
// - notification_batcher
```

5.4 Push Notification System (New)

```typescript
// POST /api/push/register
// Register device for push notifications (Capacitor app)
{ "deviceId": "uuid", "playerId": 123, "platform": "ios|android", "fcmToken": "..." }

// DELETE /api/push/register
// Unregister device token (app uninstall, device change)
{ "deviceId": "uuid", "playerId": 123, "platform": "ios|android" }

// POST /api/push/send (internal)
// Send push notification (called by background jobs)
{ "playerIds": [123, 456], "message": "...", "data": {...} }

// POST /api/push/test (admin-only, optional)
// Send test push to self for QA
{ "message": "Test notification" }
```

5.5 Calendar Integration (Optional)

```typescript
// GET /api/calendar/match/[id].ics?token={token}&playerId={id}
// Generate .ics calendar file for match reminders
```

6) Notifications (Native Push Only)
6.1 Triggers

Tier open → push to that tier: “Booking open. ✅ IN | ❌ OUT”

Waitlist offer (after 5-min grace) → push top-3 with TTL.

Last-call (near kickoff if short) → push likely responders.

Cancellation → push to confirmed + waitlist.

6.2 Caps & Batching

Max 3 dropout/last-call pushes per player per match. Tier-open and waitlist_offer pushes are uncapped (still deduped/batched).

Batching windows:

>5 days: 1/day digest per match.

≤24 hours: 10-minute window.

Use notification_ledger.batch_key to coalesce events.

6.3 Grace Period

5 minutes post-dropout before offers fan-out. Cancel if player returns to IN.

7) Waitlist Details

Visible by default (admin toggleable).

Top-3 offers with dynamic TTL (4h normally, 1h if <24h to kick-off, 30min if <3h to kick-off), clamped to kickoff−15m, minimum TTL 5min; when <15m to kick-off → instant claim (no hold).

First to claim wins (transactionally enforced).

Others get "spot filled"; remain on waitlist.

**Offer Log**: Admin can see offer history (issued time, Claimed/Expired/Superseded status) via notification_ledger data.

**Offer Log Semantics:**
- **Claimed**: Player moved WAITLIST → IN before offer_expires_at
- **Expired**: No transition by offer_expires_at deadline
- **Superseded**: Later offer batch issued before this offer was claimed

**Manual Controls**: "Send new waitlist offers" button for immediate waitlist processing.

**Edge Case Behaviors:**
- **Capacity increase**: Auto-promote earliest bumped WAITLIST players by queue order with notification
- **Near kick-off offers**: Auto-expire all offers at kick-off−15m with "No more offers after..." countdown
- **Manual admin add**: Consumes capacity and supersedes outstanding offers (logged in activity feed)
- **Instant claim mode**: When <15min to kick-off, switch to instant claim (no hold period)
- Public page banner: "Kick-off soon! Spots are first-come, first-served."
- Push copy: "Spot open now — first to tap gets it."
- UI: Hide timers, claim proceeds immediately

8) UI/UX Implementation (BerkoTNF Design System)

**INTEGRATION WITH EXISTING COMPONENTS:**
- Use existing soft-UI styling and component patterns
- Follow established modal structures (SeasonFormModal, SeasonDeleteModal patterns)
- Integrate with existing Match Control Centre interface
- Use existing Button, Card, and form components

8.1 Admin Interface Extensions

**Match Control Centre Enhancements:**

```typescript
// src/components/admin/matches/RSVPBookingPane.component.tsx
// New pane in Match Control Centre for RSVP management
// Follows existing BalanceTeamsPane.component.tsx patterns

// Features:
// - Toggle "Enable RSVP" with soft-UI switch
// - Tier window configuration (A/B/C open times)
// - Booking link generation with copy button (existing pattern)
// - Share to WhatsApp integration
// - Capacity counters: "Booked 12/20, Waitlist 3"
// - Player lists with status badges (IN/OUT/WAITLIST/PENDING)
// - RSVP Activity showing invitations, responses, offers
```

**New Admin Components:**

```typescript
// src/components/admin/matches/RSVPConfigModal.component.tsx
// Modal for configuring RSVP settings
// Follows SeasonFormModal.component.tsx patterns

// src/components/admin/matches/ActivityFeed.component.tsx  
// Shows RSVP activity timeline
// Uses existing Card and soft-UI styling

// src/components/admin/matches/PlayerTierManager.component.tsx
// Manage player tiers (A/B/C)
// Integrates with existing player management
// Include tooltip: "Tier C = casual/default. All players start here unless assigned A or B."
```

8.2 Capacitor Mobile App

**New Mobile Components:**

```typescript
// src/app/booking/[id]/page.tsx
// Public booking page (mobile-first)
// Uses existing MainLayout.layout.tsx

// src/components/booking/RSVPInterface.component.tsx
// One-tap IN/OUT/WAITLIST buttons
// Waitlist offer banner with countdown
// Deep-link handling from WhatsApp/SMS

// src/components/booking/CalendarIntegration.component.tsx
// Add to calendar functionality
// Optional .ics file generation
```

8.3 Public Web Landing

**Minimal Web Interface:**

```typescript
// src/app/match/[id]/booking/page.tsx
// Public web booking (if app not installed)
// Minimal interface with app install prompts
// Uses existing soft-UI components

// Features:
// - App detection and deep-linking
// - Install app prompts with store badges
// - Basic booking functionality (no push notifications)
// - Post-booking app install nudges
```

9) Background Jobs (Existing Render Worker Integration)

**EXTEND EXISTING BACKGROUND JOB SYSTEM:**
- Use existing `background_job_status` table
- Integrate with current Render worker infrastructure  
- Follow established job patterns and error handling
- Add new job types to existing worker

**New Job Types:**

```typescript
// worker/src/jobs/rsvp-jobs.ts
// Extends existing job processing system

export const RSVP_JOB_TYPES = {
  TIER_OPEN_NOTIFICATIONS: 'tier_open_notifications',
  DROPOUT_GRACE_PROCESSOR: 'dropout_grace_processor', 
  WAITLIST_OFFER_PROCESSOR: 'waitlist_offer_processor',
  NOTIFICATION_BATCHER: 'notification_batcher'
} as const;
```

**Job Implementations:**

```typescript
// tier_open_notifications
// - Triggered by cron at tier open times (a_open_at, b_open_at, c_open_at)
// - Target players: is_ringer=false (+ ringers if include_ringers_in_invites=true)
// - Send push notifications to eligible players in that tier
// - Mark as invited in match_player_pool
// - Create notification_ledger entries

// dropout_grace_processor  
// - Runs every minute
// - Process players who marked OUT with dynamic grace period
// - Grace selection: 5min normally, 2min if <24h to kickoff, 1min if <3h to kickoff
// - If grace expired and capacity available, trigger waitlist offers
// - Atomic updates to prevent race conditions

// waitlist_offer_processor
// - Runs every 5 minutes  
// - Expire unclaimed waitlist offers (dynamic TTL logic)
// - TTL selection: 4h normally, 1h if <24h to kickoff, 30min if <3h to kickoff
// - Apply TTL safety guards (min 30m, max kickoff-15m)
// - Auto-cascade: Send offers to next 3 players when current offers expire
// - Log all offers to notification_ledger for admin visibility

// notification_batcher
// - Adaptive last-call system:
//   - Target players: is_ringer=false (+ ringers if include_ringers_in_invites=true)
//   - T-12h: Send if confirmed < capacity (skip non-flexible OUT, capped players)
//   - T-3h: Send if still short (exclude players with last-call in notification_ledger within 6h)
//   - Send immediately when scheduled (no quiet hours)
// - Waitlist offers: Send to ALL waitlisted players (including ringers) - always immediate
// - Cancellation: Send to ALL confirmed + waitlist players (including ringers) - always immediate
// - Respect notification caps (max 3 dropout/last-call per player per match)
// - Worker prunes tokens on permanent errors (invalid/expired FCM tokens)
// - Log token removal to notification_ledger (kind='push_token_removed') for observability
```

**Integration with Existing Worker:**

```typescript
// worker/src/index.ts - extend existing job processor
// Add RSVP job types to existing switch statement
// Use existing database connection and error handling
// Follow established retry and logging patterns
// All notifications send immediately when jobs run (no quiet hours)
```

10) Future Enhancements

Optional enhancements that could be added in future releases:

- Manual "Send last-call" button in Match Control Centre
- Admin test push notification endpoint for QA
- Advanced tier assignment based on player power ratings
- Enhanced activity feed with filtering and search
- Bulk tier management tools

11) RLS Policy Sketch

match_player_pool

Admin: full access for owned matches.

Player: SELECT own row; UPDATE own row only.

notification_ledger, match_invites, push_tokens

Admin-only.

upcoming_matches

Players can SELECT limited fields for matches they’re invited to or have a valid token for.

12) Transactions & Concurrency

Book/Claim run within a single transaction.

Use SELECT … FOR UPDATE on an “active IN count” or capacity row to prevent over-allocation.

Background jobs are idempotent and keyed via batch_key.

13) Analytics & Observability

Track:

invite.wave.sent, invite.player.pushed

rsvp.responded (status, source, latency)

dropout.created, dropout.finalised

waitlist.offer.sent/claimed/expired

notification.sent (kind, platform), push.opt_in rate

Dashboards:

Fill rate, time-to-full, waitlist conversion, last-call impact, install/opt-in funnel.

14) Testing Strategy

Unit

RSVP transitions (PENDING↔IN↔OUT↔WAITLIST)

Tier windows & capacity

Caps/batching logic

Offer TTL & cascade

Integration

End-to-end dropout → grace → offer → claim with concurrent claims

Tier-open runner

Magic link token validation

E2E

Admin enables booking, sets tier windows, shares link, fills capacity

Player app flows: deep-link, push receive, claim offer, cancel

Public web landing → install → deep-link works

15) Rollout & Migration

DB migrations (additive).

Ship Manual only + Self-serve booking (web landing + booking page, no pushes yet).

Wrap with Capacitor; implement push/register; collect native tokens.

Enable Render worker jobs: tier_open_runner, dropout_finaliser, offer_expirer, then near_match_batcher.

Monitor logs/metrics; tune caps/windows.

Keep RSVP flags off until ready for production rollout.

16) Developer Notes

Deep-links: configure iOS Associated Domains and Android App Links so the same URL opens the app when installed.

Push: use FCM for both Android and iOS (APNs keys added to Firebase).

Tokens: 32+ byte URL-safe random for invite_token; sign one-tap RSVP links; short TTL.

Phone: normalize to E.164 format before storage (prevents duplicates like 07123... vs +447123...).

Timezone: store UTC; render local.

Copy templates: centralize (variables for date/time, slots left, claim link).

ICS: harmless free fallback; attach after key actions.

Privacy & logging: Redact phone numbers in logs; normalize and store E.164; do not log invite_token or push tokens.

Phone normalization: Implement server-side E.164 normalization (e.g., 07123456789 → +447123456789) to prevent duplicate player creation.

17) Example Flows

A) Tiered Fill

Admin enables booking (cap 10), sets A/B/C open times, shares link.

At A_open_at, app pushes to Tier A → 8 book IN.

At B_open_at, pushes to Tier B → 2 book IN (10/10).

Admin Lock Pool → Balance → Complete.

B) Dropout & Waitlist

Night before, 1 player drops OUT; start 5-min grace.

After grace, capacity frees → push waitlist_offer to top-3 with dynamic TTL (4h/1h).

First to tap Claim wins; others get “spot filled”.

18) Copy Snippets (v3.2.0)

**Copy Logic Rules:**
- **Tier B+C Collapse:** When `b_open_at` equals `c_open_at`, use "Tiers B+C" format instead of separate times
- **Implementation:** Frontend checks if tier open times are identical and renders appropriate copy

**WhatsApp Templates (for manual sharing - clean, Apple-style)**
Tier open (manual fallback):
"⚽ Booking now open for {date}! Tap to confirm: {link}"

Last call (manual fallback):  
"⚡ We're {n} short for {date}. Can you make it? {link}"

Waitlist offers (manual fallback):
"🎯 Spot just opened for {date}! First to claim: {link}"

**Share Messages**
All at once mode:
"Book now for {date}. {booked}/{capacity} confirmed → {link}"

Tiered mode:
"Book now for {date}. Tier A now, Tier B from {time}, Tier C from {time} → {link}"

Tiered mode (B+C simultaneous):
"Book now for {date}. Tier A now, Tiers B+C from {time} → {link}"

**Push Notifications**
Tier open:
"Booking open for {date}. Tier {A/B/C} can now book. Tap to RSVP: ✅ IN | ❌ OUT"

Tier open (B+C simultaneous):
"Booking open for {date}. Tiers B+C can now book. Tap to RSVP: ✅ IN | ❌ OUT"

Waitlist offer:
"Spot open for {date}! First to claim gets it. Expires in {countdown}."

Last call:
"We're {n} short for {date}. Can you make it? ✅ IN | ❌ OUT"

**Public Page Messages**
Before window (tiered mode):
"Booking opens for Tier {tierLabel} at {time}."

Before window (B+C simultaneous, player in B or C):
"Booking opens for Tier {tierLabel} at {time}. (Tiers B+C open together)"

Too-early tap:
"Too early — Tier {tierLabel} opens at {time}. The IN button will appear here 👍"
[Show disabled IN button with countdown: "Opens in 2h 15min"]

After open:
"{n} spots left — tap IN to secure yours."
[Show prominent counter next to IN button]

Full match:
"Game is full. Join the waitlist as #{position} — first to claim gets in."
[Show prominent "Join Waitlist" button with queue position]

**Status Display**
Public match status (before open):
"{booked}/{capacity} confirmed • {waitlistCount} waiting • Tier {tierLabel} opens in {countdown}"

Public match status (before open, B+C simultaneous):
"{booked}/{capacity} confirmed • {waitlistCount} waiting • Tiers B+C open in {countdown}"

Public match status (after open):
"{booked}/{capacity} confirmed • {waitlistCount} waiting"

**Error Messages**
Invalid/expired link: "This link isn't valid anymore. Please ask the organiser for a new one."

**Ringer Access Control**
Ringer blocked (self-book OFF):
"Please ask the organiser to add you for this match."

Ringer allowed (self-book ON, before open):
"Booking opens for your tier at {time}."

Unknown number (global block_unknown_players=true):
"This number isn't registered. Please ask the organiser to add you."

Unknown number (global block_unknown_players=false):
"Enter your name to join the list:"
[Show name input: max 14 characters, real-time validation]

Name validation errors:
"Use 14 characters or fewer" | "That name's already taken — try another"

Shared phone blocked:
"This number is already linked to another player — each player needs their own."

Offer expired/capacity unavailable:
"This offer has expired — check the waitlist for your current place."

**Admin UI Copy**
Invite mode toggle: "All at once" | "Tiered"
- "All at once" tooltip: "Everyone can book immediately."
- "Tiered" tooltip: "Set timed booking windows by tier (A/B/C)."

Tier labels: "Tier A" | "Tier B" | "Tier C"
Tier C tooltip: "Tier C is the default for all players (casual tier). Admins can upgrade to A or B."

Reset button: "Use default timings"
- Tooltip: "Restore global default offsets for tier windows."

Manual actions: "Send new waitlist offers" | "Release spot now" | "Send last-call"
- "Release spot now" tooltip: "Skip grace period and free this spot immediately"

OUT options: "OUT" button with subtle "Might be available later" toggle underneath
- Toggle tooltip: "Player is OUT, but open to being called back if needed."
Quick-share messages (WhatsApp): Copy buttons for pre-filled messages
- Tooltip: "Copy pre-filled messages to share manually if needed."

RSVP Activity: Real-time event feed
- Tooltip: "Shows all RSVP changes, offers, and admin actions in real time."

19) Open Questions (non-blocking)

Default for waitlist visibility?

Configurable “viable number” to encourage early locking?

Notification frequency tuning based on user feedback?

20) Implementation Roadmap & Deliverables

**PHASE 1: Database & Core Backend (Week 1-2)**
- [ ] Database migrations (extend existing tables + new tables)
- [ ] Update Prisma schema with new fields and relationships
- [ ] Extend existing API endpoints for RSVP functionality
- [ ] Add new public booking endpoints
- [ ] Feature flag integration with existing app_config system

**PHASE 2: Background Jobs & Notifications (Week 2-3)**  
- [ ] Extend existing Render worker with RSVP job types
- [ ] Implement push notification system (FCM integration)
- [ ] Add notification ledger and batching logic
- [ ] Tier-based invitation processing
- [ ] Waitlist management and grace periods

**PHASE 3: Admin Interface (Week 3-4)**
- [ ] RSVPBookingPane component for Match Control Centre
- [ ] RSVP configuration modals (following existing patterns)
- [ ] Player tier management interface  
- [ ] RSVP Activity component
- [ ] Integration with existing useMatchState hook

**PHASE 4: Public RSVP Interface (Week 4-5)**
- [ ] Extend existing `/upcoming` page with RSVP functionality
- [ ] Match-specific RSVP pages: `/upcoming/match/[id]?token=...`
- [ ] RSVP buttons and status display
- [ ] Live match status updates
- [ ] Phone number capture and validation
- [ ] Rate limiting and security

**PHASE 5: Mobile Optimization (Week 5-6)**
- [ ] Mobile-responsive RSVP interface
- [ ] Touch-friendly buttons and interactions
- [ ] Optional: Capacitor app wrapper for push notifications
- [ ] Calendar integration (.ics files)
- [ ] Progressive Web App features

**PHASE 6: Testing & Polish (Week 6-7)**
- [ ] **Critical Race Condition Tests:**
  - [ ] Concurrent claims on final slot (SELECT ... FOR UPDATE)
  - [ ] Grace cancel vs waitlist fan-out timing
  - [ ] TTL expiry and cascade under load
  - [ ] Notification caps/batching enforcement
  - [ ] Token rotation/expiration behavior
  - [ ] Capacity downshift reflow (IN → WAITLIST)
  - [ ] Duplicate respond attempts (idempotency)
- [ ] **Deep-Link Testing:**
  - [ ] WhatsApp → app (if installed)
  - [ ] WhatsApp → web fallback (if not installed)
  - [ ] iOS Associated Domains / Android App Links
- [ ] **End-to-End RSVP Flows:**
  - [ ] Invite mode switching (All at once ↔ Tiered)
  - [ ] Tier window configuration and validation
  - [ ] Tier window monotonicity validation (A ≤ B ≤ C)
  - [ ] Past time clamping and kick-off limits
  - [ ] Dynamic waitlist TTL behavior (4h/1h/30min based on time to kickoff)
  - [ ] Dynamic grace periods (5min/2min/1min based on time to kickoff)
  - [ ] Auto-cascade waitlist offers on expiry
  - [ ] Offer log display (Claimed/Expired/Superseded)
  - [ ] Manual override buttons (Send new waitlist offers, Release spot now)
  - [ ] Adaptive last-call notifications (T-12h/T-3h)
  - [ ] Mode switching semantics (Tiered→All opens to everyone, All→Tiered only affects new bookings)
  - [ ] Capacity downshift behavior (FIFO demotion with notifications)
  - [ ] Capacity increase auto-promotion of bumped waitlist players
  - [ ] Ringer access control (blocked when enable_ringer_self_book=false)
  - [ ] Ringer notification exclusion (tier-open/last-call skip ringers unless flag enabled)
  - [ ] Ringer participation (waitlist offers + cancellation always sent to participating ringers)
  - [ ] Phone-based identity (one phone = one player, no duplicates, strict enforcement)
  - [ ] Global unknown player policy (block_unknown_players setting)
  - [ ] OUT with flexibility option ("can sub late")
  - [ ] Instant claim mode (<15min to kick-off, no hold period)
  - [ ] Live polling updates (15s refresh for non-push users)
  - [ ] Invite link regeneration (automatic on toggle ON)
  - [ ] Last-call cooldown based on actual send time (6h from notification_ledger)
  - [ ] Claim re-validation (capacity check at claim time)
  - [ ] Burst protection (50 writes/10s per match, feature-flagged)
- [ ] **Load Testing:**
  - [ ] Background job system under high load
  - [ ] Concurrent booking attempts
  - [ ] Push notification delivery rates
- [ ] **Mobile App Testing:**
  - [ ] iOS/Android push notifications
  - [ ] Deep-link handling
  - [ ] Offline/connectivity scenarios
- [ ] **Admin Interface Polish:**
  - [ ] Tier management UI
  - [ ] RSVP activity feed
  - [ ] Match Control Centre integration
- [ ] **Documentation & Training:**
  - [ ] Admin user guides
  - [ ] Player onboarding materials
  - [ ] Technical documentation

**TECHNICAL REQUIREMENTS:**
- Node.js 18+ (existing requirement met)
- Capacitor CLI and mobile development environment
- Firebase project for FCM push notifications  
- App Store / Google Play developer accounts
- Existing Render worker and Supabase infrastructure

---

## 21) Integration with Existing BerkoTNF System

### 21.1 Match Lifecycle Integration

**CURRENT SYSTEM:** Draft → PoolLocked → TeamsBalanced → Completed

**RSVP INTEGRATION:**
- RSVP functionality available in **Draft** state only
- Once pool is locked, RSVP is disabled (admin can still manually adjust)
- Existing match progression unchanged
- RSVP data persists through all states for reporting

### 21.2 Player Pool System Extension

**CURRENT:** `match_player_pool` with basic response tracking
**ENHANCED:** Extended with invitation workflow, waitlist, and tier management

```typescript
// Existing PlayerInPool interface extended:
interface PlayerInPool extends PlayerProfile {
  responseStatus: 'IN' | 'OUT' | 'MAYBE' | 'PENDING' | 'WAITLIST'; // WAITLIST added
  // New RSVP fields:
  invitedAt?: Date;
  inviteStage?: 'A' | 'B' | 'C';
  waitlistPosition?: number;
  offerExpiresAt?: Date;
  source?: 'app' | 'web' | 'admin';
  muted?: boolean;
  outFlexible?: boolean;
}
```

### 21.3 UI Component Integration

**Match Control Centre Enhancements:**
```typescript
// Existing: PlayerPoolPane → BalanceTeamsPane → CompleteMatchForm
// New: RSVPBookingPane (optional, when booking enabled)

// Flow becomes:
// Draft + RSVP OFF: PlayerPoolPane (unchanged)
// Draft + RSVP ON: RSVPBookingPane (new, with player pool integration)
// PoolLocked: BalanceTeamsPane (unchanged, but shows RSVP source data)
// TeamsBalanced: CompleteMatchForm (unchanged)
```

### 21.4 Background Job System Integration

**CURRENT:** Stats update jobs via `background_job_status` table
**EXTENDED:** Add RSVP job types to existing worker

```typescript
// worker/src/index.ts - extend existing job processor
const existingJobTypes = ['stats_update', 'profile_generation'];
const newJobTypes = ['tier_open_notifications', 'dropout_grace_processor', 'waitlist_offer_processor'];
```

---

## 22) Key Questions & Decisions Needed

### 22.1 Player Tier Assignment
**QUESTION:** How should players be assigned to tiers (A/B/C)?
**OPTIONS:**
1. Admin manual assignment
2. Based on existing player ratings/stats
3. Player self-selection during registration
4. Hybrid approach

**RECOMMENDATION:** Start with admin manual assignment, add auto-assignment later based on power ratings.

### 22.2 Notification Frequency & Timing ✅ **CONFIRMED**
**ADAPTIVE LAST-CALL SYSTEM:**
- **T-12h**: Send if confirmed < capacity
  - Target: Unresponded + OUT but "flexible" players
  - Skip: Non-flexible OUT players, players at 3-push cap
- **T-3h**: Send only if still short  
  - Target: Same as T-12h minus recent T-12h recipients (6h cooldown) and recent waitlist offers
- **No time-based delays:** All notifications send immediately when scheduled
- **Spam control:** Relies on push caps, per-player mute flag, and 6h last-call cooldown

**DYNAMIC WAITLIST TTL:**
```typescript
// TTL Selection Logic (v3.1.4 - Fixed)
const minutesToKickoff = (kickoff - now) / (1000 * 60);
const hoursToKickoff = minutesToKickoff / 60;

// Base TTL selection
let offer_ttl; // in minutes
if (hoursToKickoff < 3) {
  offer_ttl = 30;
} else if (hoursToKickoff < 24) {
  offer_ttl = 60;  
} else {
  offer_ttl = 240; // 4h
}

// Safety Guards (fixed logic)
const maxAllowedTTL = Math.max(0, minutesToKickoff - 15); // Don't run past kickoff-15m

if (maxAllowedTTL < 15) {
  // Too close to kickoff - switch to instant claim mode (no hold period)
  offer_ttl = 0; // Instant claim
} else {
  offer_ttl = Math.min(offer_ttl, maxAllowedTTL);
  offer_ttl = Math.max(offer_ttl, 5); // Minimum 5min when using hold period
}
```

**OTHER TIMINGS:**
- Tier open notifications: Immediate when tier opens
- **Dynamic dropout grace:** 5min normally, 2min if <24h to kickoff, 1min if <3h to kickoff
- Max 3 dropout/last-call pushes per player per match. Tier-open and waitlist_offer pushes are uncapped (still deduped/batched)
- **6h last-call cooldown:** Exclude players with last-call in notification_ledger within past 6h

### 22.3 Implementation Approach ✅ **CONFIRMED**
**DECISION:** Web-first with Capacitor later
**RATIONALE:** Build on existing berkotnf.com/upcoming infrastructure, add push notifications in Phase 2
**BENEFIT:** Faster development, leverages existing trusted domain, progressive enhancement

### 22.4 Player Tier Management ✅ **CONFIRMED**
**IMPLEMENTATION:** Add tier dropdown to existing admin player management interface
- **Tier Field**: A | B | C (default: C)
- **Default Behavior**: All new players automatically assigned to Tier C
- **Scope**: Global player attribute (not per-season)
- **Assignment**: Manual by admin initially

**UI LOCATIONS:**
- **Primary**: Tier dropdown in existing admin player management form/list
- **Secondary**: Read-only A/B badge in Match Control Centre player lists
- **Future Enhancement**: Edit shortcut in MCC that opens player admin screen

**BEHAVIORAL RULES:**
- Changing tier affects future invites only (no retroactive changes)
- Future billing: tier snapshots will be implemented when billing system is added

### 22.5 Billing System Scope ✅ **CONFIRMED**
**DECISION:** Billing is completely out of scope for v3.1 to keep the release lean and focused.
**FUTURE:** Billing implementation is covered in the existing `Billing_Plan.md` specification.

### 22.6 Ringer/Guest System ✅ **CONFIRMED**
**APPROACH:** Use existing `players.is_ringer=true` for guest/one-off players
**IDENTITY:** Phone-based (one phone = one player record, prevents duplicates)
**DEFAULT POLICY:** Ringers excluded from auto-invites, admin retains control
**FLEXIBILITY:** Two flags allow ringer self-booking and invite inclusion if desired
**PROMOTION PATH:** `is_ringer=false` converts to regular (preserves all history/stats)

---

## 23) Success Criteria & Metrics

### 23.1 User Adoption
- **Target:** 80%+ of regular players use RSVP system within 3 months
- **Metric:** Track response rates and manual vs automatic player addition

### 23.2 Admin Efficiency  
- **Target:** 50% reduction in admin time spent on match organization
- **Metric:** Time from match creation to team confirmation

### 23.3 Match Fill Rates
- **Target:** 95%+ of matches reach minimum viable size (8 players)
- **Metric:** Track match cancellations due to low attendance

### 23.4 Technical Performance
- **Target:** <2 second response times for all RSVP interactions
- **Target:** 99%+ push notification delivery rate
- **Target:** Zero data loss or corruption in RSVP system

This specification provides a comprehensive, codebase-aligned implementation plan that builds on your existing architecture while adding the requested RSVP functionality. The phased approach allows for incremental development and testing.

