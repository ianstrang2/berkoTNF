BerkoTNF RSVP & Player Invitation System — Complete Implementation Specification

Version 3.1.2 • Codebase-Aligned Implementation Plan

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
- **Tiered mode:** Set Priority/Everyone windows (simple) or A/B/Casual (advanced)
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

**On the berkotnf.com/upcoming page,** they can IN, OUT, or Join Waitlist if full.

**If they're waitlisted and a spot opens:**
- The system sends a push to the top 3 waitlisted players.
- First to claim gets the spot. Others get a "spot filled" notification.

**Near kick-off** (if the match is short of players), the system sends a last-call push (see timings below).

### **3) Who gets invited when (invite modes)**

**Two invite modes per match:**

**All at once (default):** Anyone with the link can book immediately until capacity is reached.

**Tiered mode:** Time-based booking windows:
- **Simple mode (default):** "Priority" players can book first, then "Everyone" after a delay
- **Advanced mode (optional):** Traditional A/B/Casual tiers with custom timing

**Global defaults:** Admins can set default tier offsets (e.g., Everyone opens +2 hours after Priority) to minimize per-match configuration.

### **4) How the waitlist & offers work**

**When the match is full,** players can Join Waitlist.

**If someone drops OUT,** there is a dynamic grace period (5min normally, 2min if <24h, 1min if <3h to kick-off) so they can change their mind.

**After grace,** the system checks capacity; if a spot is free it offers to the top 3 waitlisted (by position).

**Offers have a time limit (TTL):**
- **Dynamic TTL:** 4h normally, 1h if <24h to kick-off, 30min if <3h to kick-off
- **TTL never runs past kick-off;** minimum hold 30min
- **Auto-cascade:** When offers expire, automatically offer to next top-3 players
- **First to claim gets in;** the rest see "spot filled" and remain on the waitlist

### **5) Notifications (push only; no SMS/email)**

- **Tier-open push** (when a player's tier window opens).
- **Waitlist offer push** (top 3 with TTL).
- **Last-call push** if still short before kick-off:
  - **Enhanced system:** T-12h and T-3h messages (targeted to unresponded and "OUT but flexible").
  - **Quiet hours guard:** delays 22:00-07:00 notifications to 08:00.
  - **Early morning matches:** shifts to T-9h/T-2h to avoid 3am notifications.
- **Cancellation push** to all booked + waitlist.
- **Spam guard:** max 3 dropout/last-call pushes per player per match. Tier-open and waitlist_offer pushes are uncapped (still deduped/batched); inside 24h events are batched (10-minute window).
- **Quiet hours:** use the match's local timezone; all scheduling computed server-side in UTC.

### **6) What the admin sees in Match Control Centre**

**A Booking panel (when enabled) with:**
- **Invite mode toggle:** "All at once" | "Tiered" 
- **Tiered mode controls:** Priority/Everyone windows (simple) or A/B/Casual (advanced)
- Copy/Share link buttons and editable share text
- Counters (Booked n/m, Waitlist k)
- Lists: Pending / IN / OUT / WAITLIST, with tier badges
- **Waitlist section:** Active offers + countdown + Offer log + "Reissue offers now" button
- **Dropout controls:** "Process dropout now" for manual grace override
- Activity Feed ("X confirmed (7/10)", "Top-3 waitlist notified", etc.)
- "Send last-call now" button (manual override)

**The Lock/Balance/Complete steps behave exactly as today.**

### **7) Billing (deferred to future release)**

**Billing is completely out of scope** for v3.1 to keep the release lean and focused.

**No billing fields, UI, or logic** are included in this implementation.

**Future billing implementation** is covered in the existing `Billing_Plan.md` specification.

---

0) Scope & Goals

Add in/out (RSVP) functionality to keep matches full with minimal admin effort and no paid messaging.

In scope

Two match modes per match:

Manual only (default) — works exactly as today.

Self-serve booking (shareable link) — optional toggle.

Invitations & responses (IN / OUT / WAITLIST) with tier open windows (A | B | null).

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

Capacity management: If admin lowers capacity below current IN, the last IN by timestamp moves to WAITLIST (FIFO), with a push explaining the change.

2) Modes (per match)

Manual only (default)
No public link. Admin adds players as today.

Self-serve booking
Toggle Allow self-serve booking → app generates a public booking link + editable share text.
Optional tier open times (A→B→Casual). Admin can still add players manually at any time.

3) Database Schema Changes

**EXISTING SCHEMA ANALYSIS:**
- `players` table: ✅ Already exists with all required fields
- `upcoming_matches` table: ✅ Already exists with match lifecycle states
- `match_player_pool` table: ✅ Already exists with basic RSVP functionality
- `background_job_status` table: ✅ Already exists for job processing

**REQUIRED ADDITIONS:**

3.1 Players (Add Tier System)
```sql
ALTER TABLE players
  ADD COLUMN tier TEXT CHECK (tier IN ('A','B')) NULL; -- NULL = casual
CREATE INDEX IF NOT EXISTS idx_players_tier ON players(tier);
```

3.2 Upcoming Matches (Add RSVP Features)
```sql
ALTER TABLE upcoming_matches
  ADD COLUMN booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN invite_token TEXT,                           -- secure token for the public link
  ADD COLUMN a_open_at TIMESTAMPTZ NULL,
  ADD COLUMN b_open_at TIMESTAMPTZ NULL,
  ADD COLUMN casual_open_at TIMESTAMPTZ NULL;

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
  ADD COLUMN invite_stage TEXT NULL,                       -- 'A','B','CASUAL'
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
  stage TEXT NOT NULL,                  -- 'A','B','CASUAL' or custom
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
-- Add RSVP feature flags to existing app_config table (using string values)
INSERT INTO app_config(config_key, config_value, config_description, config_group) VALUES
('enable_rsvp_system', 'false', 'Enable RSVP invitation system', 'rsvp'),
('enable_push_notifications', 'false', 'Enable native push notifications', 'rsvp'),
-- Tiered invite system configuration
('tiered_invites_default', 'false', 'Default new matches to Tiered invites', 'rsvp'),
('tier_b_offset_hours', '0', 'Default Tier B opens +X hours after Tier A', 'rsvp'),
('tier_c_offset_hours', '0', 'Default Tier C opens +Y hours after Tier A', 'rsvp'),
('advanced_tiers', 'false', 'Expose A/B/C instead of Priority/Everyone', 'rsvp')
ON CONFLICT (config_key) DO NOTHING;

-- Note: enable_match_billing flag deferred to existing billing specification (Billing_Plan.md)
```

**Helper Functions for Feature Flags:**
```typescript
// src/lib/feature-flags.ts
export const getFlag = async (key: string): Promise<boolean> => {
  const row = await prisma.app_config.findUnique({ where: { config_key: key } });
  return (row?.config_value ?? '').toString().trim().toLowerCase() === 'true';
};

export const getNumber = async (key: string): Promise<number> => {
  const row = await prisma.app_config.findUnique({ where: { config_key: key } });
  return parseInt((row?.config_value ?? '0').toString()) || 0;
};
```

4) Access & Security
4.1 One Smart Link (deep-links)

URL: https://berkotnf.com/upcoming/match/:id?token=...

Universal Links (iOS) / App Links (Android): if the app is installed, the link opens the match in the app; otherwise, it opens the web landing.

**Invite Token Security:** `invite_token` is a 32+ byte URL-safe random value; store hash of token server-side; compare on request. Rotate on demand; auto-expire after match date.

4.2 Rate Limits & Abuse

Respond endpoint: 10/min per IP + per device + per playerId per match.

Magic links for one-tap actions carry short-lived signed tokens.

Waitlist claim requires an active, unexpired offer.

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
// Enables RSVP for a match, generates invite_token
{
  "inviteMode": "all" | "tiered",
  "tierWindows": {
    "priority_open_at": "2024-01-15T10:00:00Z",  // Simple mode
    "everyone_open_at": "2024-01-15T12:00:00Z",  // Simple mode
    // OR (if advanced_tiers=true)
    "a_open_at": "2024-01-15T10:00:00Z",
    "b_open_at": "2024-01-15T12:00:00Z", 
    "casual_open_at": "2024-01-15T14:00:00Z"
  }
}
// API enforces monotonicity (A ≤ B ≤ C), past time clamping, kick-off limits

// POST /api/admin/invites/[matchId]/send
// Send tier-based invitations (tiered mode only)
{ "stages": ["priority", "everyone"], "targetCount": 20 }

// NEW: Waitlist management
// POST /api/admin/waitlist/reissue
{ "matchId": 123 }
// Immediately triggers waitlist offer logic (respects caps/muted)

// NEW: Grace period override
// POST /api/admin/dropout/process-now  
{ "matchId": 123, "playerId": 456 }
// Skip remaining grace period, finalize dropout, trigger offers
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
  "source": "app" | "web"
}
// Implementation: Use transaction with SELECT ... FOR UPDATE to prevent race conditions

// POST /api/booking/waitlist/claim
// Claim waitlist offer
{ "matchId": 123, "token": "abc", "phone": "+447..." }
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

Quiet hours use the match's local timezone; all scheduling computed server-side in UTC.

6.3 Grace Period

5 minutes post-dropout before offers fan-out. Cancel if player returns to IN.

7) Waitlist Details

Visible by default (admin toggleable).

Top-3 offers with dynamic TTL (4h normally, 1h if <24h to kick-off, 30min if <3h to kick-off), clamped to kickoff−15m, minimum TTL 30min.

First to claim wins (transactionally enforced).

Others get "spot filled"; remain on waitlist.

**Offer Log**: Admin can see offer history (issued time, Claimed/Expired/Superseded status) via notification_ledger data.

**Manual Controls**: "Reissue offers now" button for immediate waitlist processing.

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
// - Tier window configuration (A/B/Casual open times)
// - Booking link generation with copy button (existing pattern)
// - Share to WhatsApp integration
// - Capacity counters: "Booked 12/20, Waitlist 3"
// - Player lists with status badges (IN/OUT/WAITLIST/PENDING)
// - Activity feed showing invitations, responses, offers
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
// Manage player tiers (A/B/Casual)
// Integrates with existing player management
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
// - Triggered by cron at tier open times (a_open_at, b_open_at, casual_open_at)
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
//   - T-12h: Send if confirmed < capacity (skip non-flexible OUT, capped players)
//   - T-3h: Send if still short (6h cooldown from T-12h, skip recent waitlist offers)
//   - Quiet hours guard: delay 22:00-07:00 notifications to 08:00 (match local timezone)
//   - Early morning matches: shift to T-9h/T-2h to avoid 3am notifications
// - Respect notification caps (max 3 dropout/last-call per player per match)
// - Worker prunes tokens on permanent errors (invalid/expired FCM tokens)
```

**Integration with Existing Worker:**

```typescript
// worker/src/index.ts - extend existing job processor
// Add RSVP job types to existing switch statement
// Use existing database connection and error handling
// Follow established retry and logging patterns
// All cron scheduling computed UTC; convert using match timezone on send
```

10) Future Enhancements

Optional enhancements that could be added in future releases:

- Manual "Send last-call now" button in Match Control Centre
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

Phone: normalize to E.164.

Timezone: store UTC; render local.

Copy templates: centralize (variables for date/time, slots left, claim link).

ICS: harmless free fallback; attach after key actions.

Privacy & logging: Redact phone numbers in logs; store E.164; do not log invite_token or push tokens.

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

18) Copy Snippets (v3.1.2)

**Share Messages**
All at once mode:
"Book now for {date}. {booked}/{capacity} confirmed → {link}"

Tiered mode (simple):
"Book now for {date}. Priority players can book now, everyone else from {time} → {link}"

Tiered mode (advanced):
"Book now for {date}. Tier A now, B from {time}, Casual from {time} → {link}"

**Push Notifications**
Tier open (simple):
"Booking open for {date}. Tap to book: ✅ IN | ❌ OUT"

Waitlist offer:
"Spot open for {date}! First to claim gets it. Expires in {countdown}."

Last call:
"We're {n} short for {date}. Can you make it? ✅ IN | ❌ OUT"

**Public Page Messages**
Before window (simple mode):
"Booking opens for you at {time}. Priority players can book now."

Too-early tap:
"Booking opens for you at {time}. We'll show a big IN button here 👍"

After open:
"Spots remaining: {n}. Tap IN to lock your place."

Full match:
"Game is full. Tap Join waitlist to be first in if someone drops."

**Status Display**
Public match status:
"{booked}/{capacity} confirmed • {waitlistCount} on waitlist • Booking opens for you in {countdown}"

**Error Messages**
Invalid/expired link: "Sorry, this link is invalid or has expired. Contact the team admin for help."

Unknown number: "This phone number isn't registered. Ask the admin to add you, or continue as a guest."

**Admin UI Copy**
Invite mode toggle: "All at once" | "Tiered"
Simple tier labels: "Priority" | "Everyone"  
Advanced tier labels: "Tier A" | "Tier B" | "Casual"
Reset button: "Reset to defaults"
Manual actions: "Reissue offers now" | "Process dropout now" | "Send last-call now"

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
- [ ] Activity feed component
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
  - [ ] Simple vs Advanced tier modes
  - [ ] Tier window monotonicity validation (A ≤ B ≤ C)
  - [ ] Past time clamping and kick-off limits
  - [ ] Dynamic waitlist TTL behavior (4h/1h/30min based on time to kickoff)
  - [ ] Dynamic grace periods (5min/2min/1min based on time to kickoff)
  - [ ] Auto-cascade waitlist offers on expiry
  - [ ] Offer log display (Claimed/Expired/Superseded)
  - [ ] Manual override buttons (Reissue offers, Process dropout)
  - [ ] Adaptive last-call notifications (T-12h/T-3h)
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
  inviteStage?: 'A' | 'B' | 'CASUAL';
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
**QUESTION:** How should players be assigned to tiers (A/B/Casual)?
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
- **Quiet Hours Guard**: If T-12h falls between 22:00–07:00 local, delay to 08:00
  - For early morning matches: Shift to T-9h and T-2h to avoid 3am notifications

**DYNAMIC WAITLIST TTL:**
```typescript
// TTL Selection Logic (v3.1.2)
const hoursToKickoff = (kickoff - now) / (1000 * 60 * 60);

if (hoursToKickoff < 3) {
  offer_ttl = 30; // minutes
} else if (hoursToKickoff < 24) {
  offer_ttl = 60; // minutes  
} else {
  offer_ttl = 240; // minutes (4h)
}

// Safety Guards  
offer_ttl = Math.min(offer_ttl, (kickoff - now) / (1000 * 60) - 15); // Don't run past kickoff-15m
offer_ttl = Math.max(offer_ttl, 30); // Minimum viable TTL
```

**OTHER TIMINGS:**
- Tier open notifications: Immediate when tier opens
- **Dynamic dropout grace:** 5min normally, 2min if <24h to kickoff, 1min if <3h to kickoff
- Max 3 dropout/last-call pushes per player per match. Tier-open and waitlist_offer pushes are uncapped (still deduped/batched)
- Quiet hours use the match's local timezone; all scheduling computed server-side in UTC

### 22.3 Capacitor vs Web-First Approach
**QUESTION:** Should we prioritize mobile app development or web interface?
**CURRENT PLAN:** Capacitor-first with web fallback
**ALTERNATIVE:** Web-first with mobile app later

**RECOMMENDATION:** Stick with Capacitor-first for proper push notifications, but ensure web interface is fully functional.

### 22.4 Player Tier Management ✅ **CONFIRMED**
**IMPLEMENTATION:** Add tier dropdown to existing admin player management interface
- **Tier Field**: A | B | NULL (NULL = casual)
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

