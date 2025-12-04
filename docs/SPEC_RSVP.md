# Capo RSVP & Player Invitation System — Consolidated Implementation Specification

**Version 6.0.0 • Updated December 2025**

**UPDATE NOTES (v6.0.0 - Three-Mode Architecture + State Simplification):**
- **NEW** Three operating modes: Manual, RSVP, Auto-pilot (Section 2)
- **SIMPLIFIED** State machine: Draft → TeamsBalanced → Completed (removed PoolLocked)
- **DECOUPLED** Balancing from sending: `teams_balanced_at` vs `teams_sent_at`
- **ADDED** `auto_pilot_enabled` with send mode config (immediate/scheduled)
- **ADDED** `is_pool_closed` escape hatch for admins
- **REMOVED** `auto_lock_when_full` (replaced by auto_pilot_enabled)
- **REMOVED** State reversion logic (no more Draft ↔ PoolLocked bouncing)
- **CLARIFIED** `booking_enabled` locked at match creation
- **CLARIFIED** UI driven by timestamps, not state
- **ALIGNED** Email templates and notifications (Section 10.5)
- **SIMPLIFIED** Tiered booking: Hidden power-user feature (Section 3.5)
- **SIMPLIFIED** Grace period: Configurable (default 3 minutes) via `superadmin_config`
- **GRADUATED** Waitlist TTL: Configurable via `superadmin_config` (see Section 7)
- **CONFIGURABLE** All timing values stored in `superadmin_config` table (see Section 0.1)
- **ADDED** Push notification setup guide (Firebase/FCM)

*Previous versions: v4.5.0 (RSVP toggle), v4.4.0 (schema reconciliation), v4.3.0 (multi-tenancy), v4.2.0 (consolidation) - see git history*

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
- Auto-linking via phone number matching with OTP verification
- Email notifications via Resend (approval, teams released, etc.)
- Deep links configured (`capo://match/123`)
- See `SPEC_auth.md` v6.6 for authentication patterns

**Match Control Centre (COMPLETE ✅ - Updated for RSVP v6.0):**
- Simplified match lifecycle: Draft → TeamsBalanced → Completed
- UI driven by `teams_balanced_at` timestamp (not state)
- Uneven teams: 4v4 to 11v11 (8-22 total players)
- No-show handling: Checkbox controls `player_matches` row creation
- Team swaps: `actual_team` field tracks match-day changes
- Own goals: `team_a_own_goals`, `team_b_own_goals` persisted
- See `SPEC_match-control-centre.md` for complete implementation

**Dependencies:** 
- `SPEC_auth.md` (v6.6) - Phone authentication, admin privileges, auto-linking, email notifications
- `SPEC_multi_tenancy.md` (v2.1.0) - Tenant isolation, security patterns
- `SPEC_match-control-centre.md` - Match lifecycle, uneven teams, no-shows
- All authentication, match lifecycle, and tenant logic is defined in those specs
- This spec focuses **only** on RSVP booking logic

---

## **0.1) Platform Configuration (superadmin_config)**

**⚠️ DO NOT HARDCODE** timing values. All RSVP timing configuration is stored in the `superadmin_config` table and managed via `/superadmin/settings`.

### Config Keys (RSVP Display Group)

| Key | Default | Description |
|-----|---------|-------------|
| `grace_period_minutes` | 3 | Minutes to wait after dropout before sending waitlist offers |
| `waitlist_ttl_over_24h` | 120 | TTL (minutes) for offers when >24h to kickoff |
| `waitlist_ttl_6h_to_24h` | 60 | TTL (minutes) for offers when 6-24h to kickoff |
| `waitlist_ttl_3h_to_6h` | 45 | TTL (minutes) for offers when 3-6h to kickoff |
| `waitlist_ttl_1h_to_3h` | 30 | TTL (minutes) for offers when 1-3h to kickoff |
| `waitlist_ttl_15min_to_1h` | 15 | TTL (minutes) for offers when 15min-1h to kickoff |
| `waitlist_ttl_under_15min` | 5 | TTL floor (minutes) for offers when <15min to kickoff |
| `last_call_hours_before` | "12,3" | Comma-separated hours before kickoff for last-call notifications |

### Accessing Config Values

**From SQL functions** (use `SECURITY DEFINER` pattern - bypasses RLS):
```sql
-- Fail-loudly: raises exception if key not found
grace_minutes := get_superadmin_config_value('grace_period_minutes')::int;
ttl_minutes := get_superadmin_config_value('waitlist_ttl_over_24h')::int;
```

**From API routes** (tenant context NOT required - these are platform-wide):
```typescript
// Direct Supabase query (superadmin_config has read access for all authenticated users)
const { data } = await supabaseAdmin
  .from('superadmin_config')
  .select('config_value')
  .eq('config_key', 'grace_period_minutes')
  .single();

const gracePeriodMinutes = parseInt(data.config_value);
```

**Multi-tenancy note:** These are **platform-wide settings**, not per-tenant. All tenants share the same RSVP timing configuration. The `superadmin_config` table has RLS that allows:
- **Read:** All authenticated users (tenants can read config values)
- **Write:** Superadmin only (via `/superadmin/settings` UI)

---

## **Human Overview — How It Works**

### **0) Three Operating Modes (v6.0.0)**

At match creation, admin chooses how to manage the match:

| Mode | Description | Who Does What |
|------|-------------|---------------|
| **Manual** | "I'll handle it" | Admin adds players, balances, sends teams (WhatsApp) |
| **RSVP** | "Let players book" | System sends invites, players book, admin balances & sends |
| **Auto-pilot** | "Full automation" | System handles invites, balancing, AND sending teams |

**Mode Locking:**
- `booking_enabled` (Manual vs RSVP/Auto-pilot) is **locked at match creation** - can't change
- `auto_pilot_enabled` (RSVP vs Auto-pilot) **can toggle anytime** during the match

### **1) What the admin does**

**Create match and choose mode:**

```
┌─────────────────────────────────────────┐
│  Create Match                           │
│                                         │
│  How do you want to manage this match?  │
│                                         │
│  ○ I'll handle it (Manual)              │
│    Add players and send teams yourself  │
│                                         │
│  ● Let players book (RSVP)              │
│    Players book themselves, you send    │
│                                         │
│  ○ Full auto-pilot                      │
│    System handles everything            │
└─────────────────────────────────────────┘
```

**If RSVP or Auto-pilot:** Share one link in WhatsApp: "Book for Sunday's match: [link]"

**Watch real-time updates** in Match Control Centre:
- Live counters: "Booked 15/20" • "Waitlist 3"
- Player lists with source badges: 📱 App, 🌐 Web, 👤 Admin
- Push status icon: 🔔 (green = has push token, grey = no token) - helps admin know who gets notifications
- Activity feed showing timeline of all RSVP events

**Add guests manually** using existing "Add Player" modal (works in all modes).

**RSVP mode:** Admin clicks "Balance Teams" when ready, then "Send Teams"

**Auto-pilot mode:** System auto-balances when full, auto-sends at scheduled time (or immediately)
- If dropout: Waitlist fills spot → System re-balances → Re-sends updated teams
- Admin can toggle auto-pilot OFF to take over manually anytime

**Escape hatch:** Admin can click "Close Pool" to stop accepting RSVP responses (e.g., "let's just go with 16 players")

### **2) What regular players see/do**

**Tap the shared deep link:** Opens in app with immediate RSVP interface for authenticated users, or SMS verification for new users.

**Three simple actions:**
- **IN** - "I'm coming" (counts toward capacity)
- **OUT** - "Can't make it" (with optional "Might be available later")
- **Join Waitlist** - if match is full

**Real-time updates:** Live booking count, push notifications, view teams once balanced.

**Waitlist system:** Top-3 simultaneous offers when someone drops out, first to claim wins. Graduated TTL based on time to kickoff (2h → 1h → 45m → 30m → 15m → 5m floor).

**Last-call notifications:** Configurable windows (default T-12h and T-3h, via `last_call_hours_before` in superadmin_config) if match is short.

### **3) Who gets invited when**

**All at once (default):** Anyone with link can book immediately.

**Tiered mode:** Time-based windows - Tier A (regulars) first, Tier B (semi-regulars) later, Tier C (casuals/default) last. New players default to Tier C; admins manually promote to A or B.

**Who gets notifications:** Regular players get tier-open and last-call pushes. Guests excluded from auto-notifications but receive transactional pushes (teams released, cancellation, waitlist offers).

### **4) Waitlist & offers**

Fixed 3-minute grace period after dropout (cancel if player returns to IN). Top-3 simultaneous offers, first to claim wins. Graduated TTL: 2h (>24h) → 1h (6-24h) → 45m (3-6h) → 30m (1-3h) → 15m (15m-1h) → 5m floor (<15m). Auto-cascade until spot claimed or waitlist empty.

### **5) Smart notifications**

Push-only via Capacitor (FCM/APNs). Tier-open, waitlist offers, last-call, teams released, cancellation. Spam protection: max 3 last-call per player per match, 6-hour cooldown, batching.

### **6) Admin Match Control Centre**

Enhanced booking panel with live counters, invite mode selection, auto-balance controls (method dropdown + enable checkbox), player lists with badges, activity feed, manual triggers, waitlist dashboard.

### **7) Guests explained**

Guest players admin brings occasionally. Don't self-book, admin adds manually, don't get invite/last-call pushes, admin must WhatsApp them manually. Can be promoted to regulars via `is_guest=false` toggle.

---

## **0) Scope & Goals**

Add RSVP functionality to keep matches full with minimal admin effort.

**In scope:**
- Three match modes: Manual | RSVP | Auto-pilot
- Invitations & responses (IN/OUT/WAITLIST) with optional tier windows
- Waitlist with simultaneous offers and TTL
- Native push notifications via Capacitor (FCM/APNs)
- Auto-pilot: automatic balancing and team sending
- Enhanced admin features: audit trail, activity feed
- Production reliability: concurrency protection, rate limiting, security

**Out of scope:**
- Payment processing and billing
- Season memberships
- Complex pricing/credits

---

## **1) Guiding Principles**

- **Simplified state machine:** Draft → TeamsBalanced → Completed (removed PoolLocked)
- **UI driven by timestamps:** `teams_balanced_at` and `teams_sent_at` control UI, not state
- **Decoupled operations:** Balancing and sending are separate actions
- **Single source of truth:** `match_player_pool` for attendance
- **Deterministic & auditable:** every event logged
- **Race-safe waitlist:** offers have TTL, claims are atomic
- **One link for everything:** deep-links to app
- **Simple capacity management:** block reduction if it would demote players
- **Pool always fluid:** Changes allowed until match; `is_pool_closed` as escape hatch

---

## **2) Modes**

### **Three Operating Modes (v6.0.0)**

| Mode | `booking_enabled` | `auto_pilot_enabled` | Description |
|------|-------------------|---------------------|-------------|
| **Manual** | `false` | N/A | Admin adds players, balances, sends via WhatsApp |
| **RSVP** | `true` | `false` | Players self-book, admin balances & sends |
| **Auto-pilot** | `true` | `true` | Full automation: invites, balance, send |

### **Mode Selection Rules**

**`booking_enabled` (Manual vs RSVP):**
- Set at match creation
- **Fully locked after creation** - cannot change in either direction
- Made a mistake? Delete the match and create a new one (30 seconds)
- Controls whether RSVP link exists and players can self-book

**`auto_pilot_enabled` (RSVP vs Auto-pilot):**
- Can toggle ON/OFF anytime during the match
- OFF → ON: "System, take over from here"
- ON → OFF: "I'll handle it from here"

### **Auto-pilot Configuration**

When auto-pilot is enabled, configure when teams are sent:

```
Auto-pilot Settings:
├── Send teams: 
│   ├── ○ As soon as pool is full
│   └── ○ [24] hours before kickoff (if pool is full)
```

**Database fields:**
- `auto_pilot_send_mode`: `'immediate'` | `'scheduled'`
- `auto_pilot_send_hours_before`: number (only if scheduled)

**Tiered Mode + Auto-pilot Interaction:**
If tiered mode enabled AND auto-pilot enabled:
- Auto-pilot balances when pool hits capacity - **does NOT wait for lower tiers**
- Tiered booking = "priority access" for higher tiers, not "hold spots for everyone"
- **Example:** Pool fills with A+B at 18/18 → auto-balance + send immediately
- Lower tier players who join late go to waitlist (normal rules)
- **Why:** Waiting for all tiers causes "Tier C flood" chaos when 10 casuals pile in after window opens

**`is_pool_closed` + Auto-pilot Interaction:**
If `is_pool_closed = true`, auto-pilot is PAUSED:
- No new RSVPs accepted (public link blocked)
- No auto re-balancing on changes
- Admin must manually manage or reopen pool
- Auto-pilot resumes if pool reopened

### **Escape Hatch: Close/Reopen Pool**

Admin can toggle pool open/closed at any time:
- **Close Pool:** Sets `is_pool_closed = true` → RSVP link returns "Pool is closed"
- **Reopen Pool:** Sets `is_pool_closed = false` → RSVP link works again
- Useful for: "We have 16, let's go" → "Wait, two more want in, reopen it"
- Does NOT affect existing pool or teams - just controls whether new RSVPs accepted

**UI when pool closed:** Show "+ Add player (admin only)" button prominently so admin knows they can still manually add. Public link is blocked, but admin override works.

### **How Each Mode Works**

**Manual mode:**
1. Admin adds players via "Add Player" modal
2. Admin clicks "Balance Teams" when ready
3. Admin sends teams via WhatsApp (outside app)
4. Admin enters result after match

**RSVP mode:**
1. System generates booking link
2. Players self-book via link (IN/OUT/WAITLIST)
3. Admin monitors in Match Control Centre
4. Admin clicks "Balance Teams" when ready
5. Admin clicks "Send Teams" to notify players
6. Admin enters result after match

**Auto-pilot mode:**
1. System generates booking link
2. Players self-book via link
3. When pool fills → System auto-balances (sets `teams_balanced_at`)
4. At scheduled time (or immediately) → System sends teams (sets `teams_sent_at`)
5. If dropout → Waitlist fills → System re-balances → Re-sends
6. Admin enters result after match (only manual step!)

### **Design Principles**

- Pool is always fluid until `is_pool_closed` or kickoff
- `booking_enabled` locked at creation (fundamental choice)
- `auto_pilot_enabled` toggleable (just "who does the work")
- Timestamps drive UI: `teams_balanced_at`, `teams_sent_at`
- State only changes for result entry (Draft → TeamsBalanced)

---

## **3) Database Schema Changes**

Multi-tenancy foundation complete. All 33+ tables have `tenant_id`, RLS policies, tenant-scoped indexes. This section covers RSVP-specific additions only.

### **3.1 Players Table**

**Fields Already Added by Auth Implementation (v6.6):**
- ✅ `phone` (TEXT) - Phone number in E.164 format (required for all users)
- ✅ `email` (TEXT, nullable) - Email address for notifications (optional for players, required for admins)
- ✅ `auth_user_id` (UUID, nullable) - Link to Supabase auth.users (set after OTP verification)
- ✅ `is_admin` (BOOLEAN, default false) - Admin privilege flag
- ✅ `tenant_id` (UUID) - Tenant isolation (multi-tenancy)
- ✅ `idx_players_phone` index already exists
- ✅ `idx_players_auth_user` index already exists

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

**Note:** Auth v6.6 implements OTP-before-join: all phones are verified via SMS before join requests are created, so `last_verified_at` will track most recent RSVP phone verification (distinct from initial signup verification).

### **3.1.1 Guest vs Regular Players (v5.0.0)**

**The `is_guest` field (previously `is_ringer`) distinguishes two player types:**

| Aspect | Regular Player | Guest Player |
|--------|----------------|--------------|
| **Club Membership** | Active member (Tier A/B/C) | On-call / occasional fill-in |
| **RSVP Self-Booking** | ✅ Can book via link | ❌ Must be admin-added |
| **Broadcast Notifications** | ✅ Booking open, last-call | ❌ Not sent |
| **Match Notifications** | ✅ When in pool | ✅ When in pool (admin added them) |
| **Leaderboard/Stats** | ✅ Included | ❌ Excluded |
| **Typical Use** | Weekly squad member | Holiday fill-in, friend of a player |

**Why This Distinction Exists:**
1. **Stats integrity:** A guest who plays once and scores 10 goals shouldn't be the all-time leader
2. **Clean leaderboards:** 15+ occasional players would bloat the table
3. **Notification hygiene:** Guests don't need weekly "booking open" spam
4. **Clear club membership:** Regulars are subscribed; guests are invited per-match

**Guest Lifecycle:**
```
Admin creates guest profile (for stats tracking)
    ↓
Guest exists but is dormant (no notifications, can't self-book)
    ↓
Admin adds guest to specific match (guest now gets match notifications)
    ↓
Match completes (guest stats recorded but not in leaderboard)
    ↓
Option A: Guest stays dormant until next invite
Option B: Admin promotes to regular (is_guest = false, assign tier)
```

**Guest Promotion Requirements:**
1. **Tier assignment:** UI must require admin to assign a tier (A/B/C). Default 'C' may not be appropriate.
2. **Phone verification:** Guest cannot become a Regular who can log into the app until `auth_user_id` is established. If guest was added without verified phone, promotion flow triggers SMS invite: "You've been promoted to a member. Click to claim your account."

**Database:**
```sql
-- Already exists on players table
is_guest BOOLEAN DEFAULT false  -- Previously named is_ringer
```

**RSVP Notification Logic:**
```typescript
function shouldReceiveBroadcastNotification(player: Player): boolean {
  // Guests don't get "booking open" or "last call" broadcasts
  return !player.is_guest;
}

function shouldReceiveMatchNotification(player: Player, matchId: number): boolean {
  // Everyone in the match pool gets match-specific notifications
  return isPlayerInMatchPool(player.id, matchId);
}
```

**Self-Booking Prevention:**
```typescript
// POST /api/booking/respond
if (player.is_guest) {
  return fail(
    'Please contact the organiser to be added to this match',
    RSVP_ERROR_CODES.GUEST_BOOKING_DISABLED
  );
}
```

### **3.2 Upcoming Matches**

```sql
-- Current: upcoming_matches(upcoming_match_id, tenant_id, ...) ✅ EXISTS

ALTER TABLE upcoming_matches
  -- Mode selection (v6.0.0)
  ADD COLUMN booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,  -- Locked at creation
  ADD COLUMN auto_pilot_enabled BOOLEAN NOT NULL DEFAULT FALSE,  -- Toggleable anytime
  ADD COLUMN auto_pilot_send_mode TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (auto_pilot_send_mode IN ('immediate','scheduled')),
  ADD COLUMN auto_pilot_send_hours_before INT NOT NULL DEFAULT 24,
  
  -- Escape hatch
  ADD COLUMN is_pool_closed BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Timestamps for UI (replaces state-based UI logic)
  ADD COLUMN teams_balanced_at TIMESTAMPTZ NULL,  -- When teams were last calculated
  ADD COLUMN teams_sent_at TIMESTAMPTZ NULL;  -- When teams were sent to players

-- Prevent timestamp desync (sent can't happen before balanced)
ALTER TABLE upcoming_matches
  ADD CONSTRAINT teams_sent_after_balanced
  CHECK (teams_sent_at IS NULL OR (teams_balanced_at IS NOT NULL AND teams_sent_at >= teams_balanced_at));
  
  -- Tiered booking (optional)
  ADD COLUMN invite_mode TEXT NOT NULL DEFAULT 'all'
    CHECK (invite_mode IN ('all','tiered')),
  ADD COLUMN invite_token_hash TEXT,
  ADD COLUMN invite_token_created_at TIMESTAMPTZ NULL;
  
-- One invite token per match (prevents token reuse confusion)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_invite_token_per_match
  ON upcoming_matches (tenant_id, upcoming_match_id)
  WHERE invite_token_hash IS NOT NULL;

ALTER TABLE upcoming_matches
  ADD COLUMN a_open_at TIMESTAMPTZ NULL,
  ADD COLUMN b_open_at TIMESTAMPTZ NULL,
  ADD COLUMN c_open_at TIMESTAMPTZ NULL,
  
  -- Match settings
  ADD COLUMN match_timezone TEXT NOT NULL DEFAULT 'Europe/London',
  ADD COLUMN capacity INT NOT NULL DEFAULT 20,
  ADD COLUMN auto_balance_method TEXT NOT NULL DEFAULT 'performance'
    CHECK (auto_balance_method IN ('ability','performance','random')),
  
  -- Notification tracking (JSON to support configurable last_call_hours_before)
  ADD COLUMN last_call_sent_at JSONB NOT NULL DEFAULT '{}'::JSONB;
  -- Format: {"12": "2025-01-15T10:00:00Z", "3": "2025-01-15T19:00:00Z"}
  -- Keys are hours-before-kickoff, values are when notification was sent
  -- Hours are configured via superadmin_config.last_call_hours_before (e.g., "12,3")

COMMENT ON COLUMN upcoming_matches.booking_enabled IS 
  'RSVP mode. Set at match creation, CANNOT change after.
   FALSE = Manual mode (admin adds players).
   TRUE = RSVP/Auto-pilot mode (players self-book).';

COMMENT ON COLUMN upcoming_matches.auto_pilot_enabled IS 
  'Auto-pilot toggle. Can change anytime.
   FALSE = RSVP mode (admin balances/sends).
   TRUE = Auto-pilot (system balances/sends).';

COMMENT ON COLUMN upcoming_matches.teams_balanced_at IS 
  'When teams were last calculated. Drives UI: show Teams pane if set.
   Updated on every balance (auto or manual). NULL = show Pool pane.';

COMMENT ON COLUMN upcoming_matches.teams_sent_at IS 
  'When teams were last sent to players. Triggers notifications.
   Players can only see teams after this is set.';

COMMENT ON COLUMN upcoming_matches.is_pool_closed IS 
  'Escape hatch. When TRUE, RSVP link returns "Pool closed".
   Admin uses this to stop accepting responses mid-match.';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_upcoming_matches_tenant_token_hash
  ON upcoming_matches(tenant_id, invite_token_hash)
  WHERE invite_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_upcoming_matches_tenant_tier_opens
  ON upcoming_matches(tenant_id, a_open_at, b_open_at, c_open_at);
```

**Auto-balance integration:** Uses existing system at `/api/admin/balance-teams`. Method mapping: `'ability'` → `'balanceByRating'`, `'performance'` → `'balanceByPerformance'`, `'random'` → `'random'`.

**Related Tables (No RSVP Changes Required):**

These tables are fully implemented in Match Control Centre and work with RSVP system:

```sql
-- matches: Historical match records (linked from upcoming_matches)
-- ✅ IMPLEMENTED: upcoming_match_id INT NOT NULL (non-nullable, migration complete)
-- ✅ IMPLEMENTED: team_a_own_goals INT DEFAULT 0, team_b_own_goals INT DEFAULT 0
-- ✅ LEGACY REMOVED: is_completed (use upcoming_matches.state instead)

-- player_matches: Player participation records
-- ✅ IMPLEMENTED: result TEXT ('win'|'loss'|'draw'), heavy_win BOOLEAN, heavy_loss BOOLEAN, clean_sheet BOOLEAN
-- ✅ IMPLEMENTED: actual_team TEXT (for match-day swaps)
-- ✅ COLUMN EXISTS BUT UNUSED: is_no_show BOOLEAN (absence of row = no-show)
-- Note: Checkbox controls row creation; no row = player did not attend

-- upcoming_matches state management (v6.0.0 - simplified)
-- ✅ SIMPLIFIED: state ENUM (Draft, TeamsBalanced, Completed, Cancelled)
-- NOTE: PoolLocked state REMOVED in v6.0.0 - UI driven by teams_balanced_at timestamp instead
-- ✅ LEGACY DEPRECATED: is_completed BOOLEAN, is_active BOOLEAN (use state instead)
-- Note: Active tab filtering = state IN ('Draft', 'TeamsBalanced')
-- Note: History tab filtering = state = 'Completed'
-- Note: Cancelled state defined but currently UNUSED (deletion is destructive instead)
```

See `SPEC_match-control-centre.md` sections 2, 10, 11 for complete schema details.

### **3.3 Match Player Pool**

```sql
-- Current: match_player_pool(id, tenant_id, upcoming_match_id, player_id, response_status, ...) ✅ EXISTS
-- Response status values:
--   'IN'       = Confirmed attending (counts toward capacity)
--   'OUT'      = Cannot attend (does not count toward capacity)
--   'MAYBE'    = Soft interest (does NOT count toward capacity, receives notifications)
--   'WAITLIST' = Wants to attend but match full (does NOT count, receives offer notifications)
--   'PENDING'  = No response yet (does NOT count, receives reminder notifications)

ALTER TABLE match_player_pool
  ADD COLUMN invited_at TIMESTAMPTZ NULL,
  ADD COLUMN invite_stage TEXT NULL,
  ADD COLUMN reminder_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN muted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN out_flexible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN waitlist_position INTEGER NULL,
  ADD COLUMN offer_expires_at TIMESTAMPTZ NULL, -- NULL = no active offer (add comment in schema)
  ADD COLUMN response_timestamp TIMESTAMPTZ NULL,
  ADD COLUMN dropout_pending_until TIMESTAMPTZ NULL, -- Grace period: if set, waitlist offers delayed until this time
  ADD COLUMN source TEXT NULL CHECK (source IN ('app', 'web', 'admin')),
  -- source: 📱 'app' = mobile app, 🌐 'web' = browser, 👤 'admin' = admin-added
  -- Note: Removed 'guest_link' - guests cannot self-book, always admin-added

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
-- Waitlist position ordering (for calculating next position)
CREATE INDEX IF NOT EXISTS idx_mpp_waitlist_order
  ON match_player_pool (tenant_id, upcoming_match_id, waitlist_position ASC NULLS LAST)
  WHERE response_status = 'WAITLIST';
-- Fast IN count queries (used frequently for capacity checks)
CREATE INDEX IF NOT EXISTS idx_mpp_confirmed_count
  ON match_player_pool (tenant_id, upcoming_match_id)
  WHERE response_status = 'IN';
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mpp_tenant_waitpos_per_match
  ON match_player_pool (tenant_id, upcoming_match_id, waitlist_position)
  WHERE response_status = 'WAITLIST' AND waitlist_position IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mpp_active_offer_per_player
  ON match_player_pool (tenant_id, upcoming_match_id, player_id)
  WHERE response_status = 'WAITLIST' AND offer_expires_at > now();

ALTER TABLE match_player_pool
  ADD CONSTRAINT offer_expiry_only_for_waitlist
  CHECK (offer_expires_at IS NULL OR response_status='WAITLIST');

-- Waitlist entries MUST have a position (prevents ambiguous ordering)
ALTER TABLE match_player_pool
  ADD CONSTRAINT waitlist_must_have_position
  CHECK (response_status != 'WAITLIST' OR waitlist_position IS NOT NULL);
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
      'audit/admin_override_grace','audit/admin_manual_offer','audit/admin_booking_disabled',
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
-- Activity feed queries (recent first)
CREATE INDEX IF NOT EXISTS idx_notif_ledger_activity_feed
  ON notification_ledger(tenant_id, upcoming_match_id, sent_at DESC);
```

**Design Notes:**
- `player_id` is **nullable** with `ON DELETE SET NULL` to preserve audit history when players are removed
- `details` is **JSONB** (not TEXT) to store structured metadata (e.g., capacity changes, offer TTLs)
- `actor_name` stores masked player name for display (since player_id may be NULL after deletion)
- `batch_key` groups related notifications (e.g., all tier-open pushes in one wave)

**GDPR Compliance:** On player deletion (Right to be Forgotten):
1. `player_id` → SET NULL (automatic via FK)
2. `actor_name` → "Deleted User" (via trigger/app code)
3. `details` JSONB → scrub any PII fields (player names, phone numbers)
Masked names like "J*** S****" may still be identifiable in small groups - full anonymization is safer.

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
  -- Note: iOS tokens can change on reinstall. Use ON CONFLICT DO UPDATE in insert
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_tenant_player
  ON push_tokens(tenant_id, player_id);
```

**Guest Push Token Block:** Guests cannot register push tokens (they won't have the app):
```typescript
// In POST /api/player/push-token
if (player.is_guest) {
  return fail('Guests cannot register for push notifications');
}
```

**Guest Communication:** Guests never receive push notifications (no app). If admin adds a guest to a match, admin must notify them manually via WhatsApp. The push status icon (🔔 grey) in player list reminds admin that guest won't get automated notifications.

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
  -- Prevent guest self-booking (source must be 'admin' for guests)
  IF NEW.source != 'admin' AND EXISTS (SELECT 1 FROM players WHERE player_id = NEW.player_id AND is_guest = true) THEN
    RAISE EXCEPTION 'guests cannot self-book, must be admin-added';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mpp_tenant_enforce ON match_player_pool;
CREATE TRIGGER trg_mpp_tenant_enforce
  BEFORE INSERT OR UPDATE ON match_player_pool
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_match_pool();
```

**Feature Flags (Per-Tenant):**

Note: `app_config` table is tenant-scoped (`tenant_id` column). Each club has their own config.

```sql
-- Per-tenant config (each club can have different settings)
INSERT INTO app_config(tenant_id, config_key, config_value, config_description, config_group) VALUES
('enable_rsvp_system', 'false', 'Enable RSVP system', 'rsvp'),
('enable_push_notifications', 'false', 'Enable push notifications', 'rsvp'),
('default_booking_enabled', 'false', 'RSVP enabled by default', 'match_settings'),
('default_auto_pilot_enabled', 'false', 'Auto-pilot enabled by default', 'match_settings'),
('default_auto_pilot_send_mode', 'scheduled', 'Auto-pilot send mode: immediate or scheduled', 'match_settings'),
('default_auto_pilot_send_hours_before', '24', 'Auto-pilot: hours before kickoff to send teams', 'match_settings'),
('default_auto_balance_method', 'performance', 'Default balance method', 'match_settings'),
('enable_tiered_booking', 'false', 'Enable tiered booking windows (power user)', 'match_settings'),
('tier_b_offset_hours', '24', 'Tier B offset hours', 'match_settings'),
('tier_c_offset_hours', '48', 'Tier C offset hours', 'match_settings'),
('enable_guest_self_book', 'false', 'Allow guest self-booking', 'rsvp_policies'),
('include_guests_in_invites', 'false', 'Include guests in invites', 'rsvp_policies'),
('block_unknown_players', 'true', 'Block unknown phone numbers', 'rsvp_policies'),
('rsvp_burst_guard_enabled', 'true', 'Enable burst protection', 'rsvp_advanced'),
('default_phone_country', 'GB', 'Phone normalization country', 'rsvp_advanced')
ON CONFLICT (config_key) DO NOTHING;
```

### **3.5 Tiered Mode: Progressive Disclosure (v5.0.0)**

Tiered booking is a **power-user feature** hidden by default. Most clubs use "All at once" mode.

**Design Principle:** Build the full tier system, but hide UI unless `enable_tiered_booking = true`.

**IMPORTANT:** `invite_mode` ('all' vs 'tiered') is set at match creation and **locked thereafter**. Changing mid-match would confuse players (sudden tier restrictions appearing). Same pattern as `booking_enabled`.

**Default Experience (tiered OFF):**
- Players list: No "Tier" column visible
- Match RSVP: No tier window settings
- Booking: Opens immediately for everyone
- Player `tier` column exists with default 'C', but invisible in UI

**Power-User Experience (tiered ON):**
- Players list: Shows "Tier" column (A/B/C)
- Match RSVP: Shows tier window configuration
- Booking: Respects tier windows

**Toggle Location:** Setup → Standard → Matches tab

```
Match Creation Defaults
├── Days Between Matches: 7
├── Default Team Size: 9
├── [▸ Advanced RSVP Settings] ← collapsed by default
│   └── ☑️ Enable tiered booking windows
│       "Prioritize regular players with staggered booking windows"
│       
│       When enabled:
│       ├── Tier B opens: [24] hours before match
│       └── Tier C opens: [48] hours before match
│       (Tier A always opens immediately)
```

**UI Conditional Logic:**
```typescript
const { data: config } = useAppConfig('match_settings');
const tieredEnabled = config?.enable_tiered_booking === 'true';

// Players list - conditionally show tier column
{tieredEnabled && <TableColumn header="Tier">...</TableColumn>}

// Match RSVP - conditionally show tier windows
{tieredEnabled && <TierWindowConfig matchId={matchId} />}

// Booking API - skip tier validation if disabled
if (!tieredEnabled) {
  // Everyone can book immediately
  return { canBook: true };
}
return validateTierWindow(player.tier, match);
```

**Benefits:**
- 90% of clubs never see tier complexity
- Power users can enable when needed
- Zero code duplication (same feature, just hidden)
- Easy marketing: "Advanced features for power users"

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
  CAPACITY_REDUCTION_BLOCKED: 'ERR_CAPACITY_REDUCTION_BLOCKED',
  
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
  
  // State/Lock errors (v4.5.0)
  STATE_LOCKED: 'ERR_STATE_LOCKED', // Can't toggle RSVP after Draft
  PAYMENTS_LOCKED: 'ERR_PAYMENTS_LOCKED', // FUTURE: Can't change when payments processed
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

**Cache Invalidation Strategy (MANDATORY):**

Successful writes must invalidate related queries:

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

function useRsvpMutation(matchId: number) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: (data) => submitRsvpResponse(matchId, data),
    onSuccess: () => {
      // Invalidate all related caches on successful write
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.rsvpMatch(profile.tenantId, matchId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.matchPlayerPool(profile.tenantId, matchId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.waitlistStatus(profile.tenantId, matchId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.matchActivity(profile.tenantId, matchId) 
      });
    },
  });
}
```

| Mutation | Invalidate Keys |
|----------|-----------------|
| RSVP respond (IN/OUT/WAITLIST) | `rsvpMatch`, `matchPlayerPool`, `waitlistStatus`, `matchActivity` |
| Admin add/remove player | `matchPlayerPool`, `matchActivity` |
| Admin toggle RSVP | `rsvpMatch`, `matchPlayerPool` |
| Capacity change | `rsvpMatch`, `matchPlayerPool`, `waitlistStatus` |

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

**CRITICAL: Concurrent Dropout Race Prevention**

Two concurrent dropouts could trigger 6 waitlist offers for 2 spots if not handled correctly. 

**Rule:** Dropout processing AND waitlist offer issuance MUST be in the same `withTenantMatchLock` call:

```typescript
// CORRECT: Single locked operation
await withTenantMatchLock(tenantId, matchId, async (tx) => {
  // 1. Process dropout (IN → OUT)
  await processDropout(tx, playerId);
  
  // 2. Set grace period
  await setDropoutGrace(tx, playerId); // dropout_pending_until = NOW() + 3min
  
  // 3. Schedule SINGLE job for this match (not per-dropout)
  await scheduleWaitlistOfferJob(matchId, { runAt: dropoutPendingUntil });
});

// Job deduplication: Only one pending waitlist job per match at a time
// New dropouts extend the existing job, don't create new ones
```

### **4.3.1 Atomic Waitlist Claim (v6.0.0)**

Waitlist offers are claimed via a single ACID-compliant transaction to prevent overselling:

```typescript
async function claimWaitlistOffer(
  tenantId: string,
  matchId: number,
  playerId: number
): Promise<ClaimResult> {
  return withTenantMatchLock(tenantId, matchId, async (tx) => {
    // 1. Check offer is still active
    const offer = await tx.match_player_pool.findFirst({
      where: withTenantFilter(tenantId, {
        upcoming_match_id: matchId,
        player_id: playerId,
        response_status: 'WAITLIST',
        offer_expires_at: { gt: new Date() }
      })
    });
    
    if (!offer) {
      return { success: false, error: 'OFFER_EXPIRED_OR_CLAIMED' };
    }
    
    // 2. Check capacity available
    const inCount = await tx.match_player_pool.count({
      where: withTenantFilter(tenantId, {
        upcoming_match_id: matchId,
        response_status: 'IN'
      })
    });
    
    const match = await tx.upcoming_matches.findUnique({
      where: { upcoming_match_id: matchId }
    });
    
    if (inCount >= match.capacity) {
      return { success: false, error: 'MATCH_NOW_FULL' };
    }
    
    // 3. Claim the spot atomically
    await tx.match_player_pool.update({
      where: { id: offer.id },
      data: {
        response_status: 'IN',
        waitlist_position: null,
        offer_expires_at: null,
        response_timestamp: new Date()
      }
    });
    
    // 4. Log success
    await tx.notification_ledger.create({
      data: {
        tenant_id: tenantId,
        upcoming_match_id: matchId,
        player_id: playerId,
        kind: 'waitlist/claimed',
        sent_at: new Date()
      }
    });
    
    // 5. Trigger auto-pilot re-adjustment if needed (see Section 4.3.2)
    await triggerAutoPilotReAdjustment(tenantId, matchId);
    
    return { success: true };
  });
}
```

**Key guarantees:**
- Only one player can claim a spot (advisory lock on match)
- Offer expiry and capacity checked within transaction
- All-or-nothing: either claim succeeds completely or fails completely
- Prevents overselling even under concurrent requests

### **4.3.2 Auto-Pilot Re-Adjustment Flow (v6.0.0)**

When pool changes after teams have been sent, auto-pilot triggers re-balance and re-send:

```typescript
async function triggerAutoPilotReAdjustment(tenantId: string, matchId: number) {
  const match = await prisma.upcoming_matches.findUnique({
    where: { upcoming_match_id: matchId }
  });
  
  // GUARD 1: Auto-pilot must be enabled (re-check in case toggled off)
  if (!match.auto_pilot_enabled) {
    return;
  }
  
  // GUARD 2: Teams must have been sent already
  if (!match.teams_sent_at) {
    return;
  }
  
  // GUARD 3: Cooldown - no re-send within 15 minutes of last send
  // Prevents infinite loop if player flips IN↔OUT repeatedly
  const minutesSinceLastSend = (Date.now() - match.teams_sent_at.getTime()) / 60000;
  if (minutesSinceLastSend < 15) {
    await logActivity(matchId, 'audit/auto_pilot_cooldown_skipped');
    return;
  }
  
  // GUARD 4: Max 2 automatic re-sends per match
  // After 2, admin must manually trigger "Send update"
  const autoResendCount = await prisma.notification_ledger.count({
    where: { upcoming_match_id: matchId, kind: 'audit/auto_pilot_readjusted' }
  });
  if (autoResendCount >= 2) {
    await logActivity(matchId, 'audit/auto_pilot_max_resends_reached');
    return; // Admin must manually send updates now
  }
  
  // GUARD 5: Per-player flapping detection
  // Skip if same player changed status 2+ times in last 15 minutes
  const recentChanges = await prisma.notification_ledger.count({
    where: {
      upcoming_match_id: matchId,
      player_id: triggeringPlayerId,
      kind: { in: ['dropout', 'rsvp_in'] },
      sent_at: { gt: new Date(Date.now() - 15 * 60 * 1000) }
    }
  });
  if (recentChanges >= 2) {
    await logActivity(matchId, 'audit/player_flapping_detected', { player_id: triggeringPlayerId });
    return; // Don't let one flaky player spam everyone
  }
  
  // Re-balance teams
  await balanceTeams(matchId, match.auto_balance_method);
  
  // NOTE: If admin made manual team changes, they should disable auto-pilot
  // for that match. No pinning system - just turn off auto-pilot.
  
  // Re-send updated teams notification
  await sendTeamsNotification(matchId, { isUpdate: true });
  
  // Update both timestamps atomically
  await prisma.upcoming_matches.update({
    where: { upcoming_match_id: matchId },
    data: { 
      teams_balanced_at: new Date(),
      teams_sent_at: new Date()
    }
  });
  
  await logActivity(matchId, 'audit/auto_pilot_readjusted');
}

// NOTIFICATION STRATEGY: Send to ALL confirmed players on every team update
// Rationale: Players want to know the full lineup - it's exciting!
// Players can disable "Team Lineup" notifications in settings if they find it too frequent
async function sendTeamsNotification(matchId: number, options?: { isUpdate: boolean }) {
  const title = options?.isUpdate ? "Updated teams" : "Teams announced! 🎉";
  return sendToAllConfirmedPlayers(matchId, { title, body: "Check your team for the match" });
}
```

**Triggers:**
- Waitlist player claims spot (WAITLIST → IN)
- Player drops out (IN → OUT) after teams sent
- Admin adds/removes player after teams sent

**Condition:** Only if `auto_pilot_enabled=true` AND `teams_sent_at` is set

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

### **4.4.1 Invite Token Purpose (v6.0.0)**

The `invite_token_hash` is a time-bound, tenant-scoped token embedded in the single RSVP deep link. Its purpose:

1. **Grant temporary access:** Allows unauthenticated users to view match status before phone verification
2. **Simplify initial flow:** Player clicks link → sees match → then verifies phone to respond
3. **Single link for all:** One link shared in WhatsApp, works for everyone
4. **Security:** Token is hashed, time-limited (kickoff+24h), and tenant-scoped

**Deep Link Pattern:** `capo://match/{matchId}?token={inviteToken}`

Example: `capo://match/123?token=a1b2c3d4e5f6...`

**Flow:**
```
1. Admin shares link in WhatsApp group
2. Player taps link → Opens app (or web)
3. Token validated → Match status shown (unauthenticated view)
4. Player clicks "I'm In" → Phone verification required
5. After OTP → Response recorded, player fully authenticated
```

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

// Validation - Hash client token first, then index seek (O(1) not O(n))
// Uses index: uniq_upcoming_matches_tenant_token_hash for fast lookup
export async function validateInviteToken(
  tenantId: string, 
  matchId: number, 
  token: string
): Promise<boolean> {
  // Hash the raw token from client before DB lookup
  const tokenHash = hashInviteToken(token);
  
  // Index seek on (tenant_id, invite_token_hash) - fast!
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

// PATCH /api/admin/matches/[id]/toggle-auto-pilot (v6.0.0)
// Note: booking_enabled is locked at creation. Only auto_pilot_enabled can toggle.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTenantContext(request, async (tenantId) => {
    try {
      await requireAdminRole(request);
      
      const { auto_pilot_enabled, send_mode, send_hours_before } = await request.json();
      const matchId = parseInt(params.id);
      
      const match = await prisma.upcoming_matches.findUnique({
        where: withTenantFilter(tenantId, {
          upcoming_match_id: matchId
        })
      });
      
      if (!match) {
        return NextResponse.json(
          fail('Match not found', RSVP_ERROR_CODES.MATCH_NOT_FOUND),
          { status: 404 }
        );
      }
      
      // Auto-pilot only makes sense for RSVP matches
      if (!match.booking_enabled) {
        return NextResponse.json(
          fail('Auto-pilot requires RSVP mode', RSVP_ERROR_CODES.MANUAL_MODE),
          { status: 400 }
        );
      }
      
      // Update auto-pilot settings (can toggle anytime)
      await prisma.upcoming_matches.update({
        where: withTenantFilter(tenantId, {
          upcoming_match_id: matchId
        }),
        data: {
          auto_pilot_enabled: auto_pilot_enabled ?? match.auto_pilot_enabled,
          auto_pilot_send_mode: send_mode ?? match.auto_pilot_send_mode,
          auto_pilot_send_hours_before: send_hours_before ?? match.auto_pilot_send_hours_before
        }
      });
      
      // IMPORTANT: If disabling auto-pilot, cancel any pending scheduled jobs
      // This prevents the system from "taking over" after admin makes manual changes
      if (auto_pilot_enabled === false && match.auto_pilot_enabled === true) {
        await cancelPendingAutoPilotJobs(matchId);
        // Jobs to cancel: AUTO_PILOT_SEND, AUTO_PILOT_REBALANCE
      }
      
      // Log to activity feed
      await logActivity(matchId, auto_pilot_enabled ? 'audit/auto_pilot_enabled' : 'audit/auto_pilot_disabled');
        
        // Expire all active waitlist offers
        await prisma.match_player_pool.updateMany({
          where: withTenantFilter(tenantId, {
            upcoming_match_id: matchId,
            response_status: 'WAITLIST',
            offer_expires_at: { gt: new Date() }
          }),
          data: {
            offer_expires_at: new Date() // Expire immediately
          }
        });
        
        // Log to activity feed
        await prisma.notification_ledger.create({
          data: {
            tenant_id: tenantId,
            upcoming_match_id: matchId,
            player_id: null,
            kind: 'audit/admin_booking_disabled',
            details: { timestamp: new Date().toISOString() }
          }
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: enabled ? 'RSVP enabled' : 'RSVP disabled' 
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
- `PATCH /api/admin/matches/[id]/toggle-rsvp` - Enable/disable RSVP mode (Draft only)
- `POST /api/admin/invites/[matchId]/send` - Send tier invitations
- `POST /api/admin/matches/[id]/autobalance` - Manual auto-balance trigger
- `POST /api/admin/waitlist/reissue` - Re-issue waitlist offers
- `POST /api/admin/dropout/process-now` - Skip grace period for dropout
- `POST /api/admin/waitlist/force-claim` - Force claim spot for specific waitlist player
- `POST /api/admin/waitlist/reorder` - Reorder waitlist positions

**Admin Force Claim:** When player #1-3 on waitlist are unresponsive but #4 is standing next to admin:
```typescript
// POST /api/admin/waitlist/force-claim
// { matchId, playerId } - Admin gives spot to any waitlist player
// Bypasses normal offer cascade - logs "admin_force_claim" to activity feed
```

**Admin Waitlist Reorder:** GK is #3 but team is desperate for a keeper:
```typescript
// POST /api/admin/waitlist/reorder
// { matchId, playerId, newPosition } - Move player up/down in queue
// UI: Simple ↑/↓ arrows in WaitlistCard - just swaps positions
// Logs "admin_waitlist_reorder" to activity feed
```

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
      
      // Validate RSVP is enabled (v4.5.0)
      const match = await prisma.upcoming_matches.findUnique({
        where: withTenantFilter(tenantId, { upcoming_match_id: matchId })
      });
      
      if (!match?.booking_enabled) {
        return NextResponse.json(
          fail('Booking is closed for this match', RSVP_ERROR_CODES.BOOKING_CLOSED),
          { status: 403 }
        );
      }
      
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
      
      // Validate RSVP is enabled (v4.5.0)
      const match = await prisma.upcoming_matches.findUnique({
        where: withTenantFilter(tenantId, { upcoming_match_id: matchId })
      });
      
      if (!match?.booking_enabled) {
        return NextResponse.json(
          fail('Booking is closed for this match', RSVP_ERROR_CODES.BOOKING_CLOSED),
          { status: 403 }
        );
      }
      
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
- Last-call (configurable hours via `superadmin_config.last_call_hours_before`, default T-12h/T-3h if short) → push likely responders
- Cancellation → push to confirmed + waitlist
- Teams released → push to participants only

**Match Cancellation Handler (prevents stale UI):**
```typescript
// When admin cancels a match with teams already sent:
await prisma.upcoming_matches.update({
  where: { upcoming_match_id: matchId },
  data: {
    state: 'Cancelled',
    teams_balanced_at: null,  // Clear to prevent stale teams in history
    teams_sent_at: null
  }
});
await sendCancellationPush(matchId);
```

**Admin Notifications:**
- Payment failed (FUTURE) → push to admins

### **6.2 Caps & Batching**

Max 3 dropout/last-call pushes per player per match. Tier-open and waitlist offers uncapped (deduped/batched).

**Batching windows:**
- >5 days: 1/day digest per match
- ≤24 hours: 10-min window

Use `notification_ledger.batch_key` to coalesce events.

### **6.3 Grace Period (v6.0.0 - Clarified Sequence)**

**Configurable grace period** (default 3 minutes, see Section 0.1) with explicit sequence to prevent race conditions:

```
1. Player A drops out (IN → OUT)
   └── grace_minutes := get_superadmin_config_value('grace_period_minutes')::int
   └── Set dropout_pending_until = NOW() + grace_minutes minutes
   └── NO waitlist offers sent yet
   └── Background job scheduled for dropout_pending_until

2. During grace period:
   └── Player A can return (OUT → IN) 
   └── If returns: clear dropout_pending_until, cancel job
   └── Waitlist players see nothing (no false hope)

3. After grace period expires (job fires):
   └── Check dropout_pending_until still set (not cancelled)
   └── Clear dropout_pending_until
   └── Waitlist engine fires: Top-3 simultaneous offers
   └── First to claim wins
```

**Why `dropout_pending_until` column:** Server restarts/crashes won't lose grace state. Background job reads from DB, not memory.

**Why delayed offers:** Prevents race where waitlist player claims spot, then original player "undoes" - both think they have the spot.

**Why configurable:** Default 3 minutes is long enough for "oops" corrections, short enough to not delay waitlist significantly. Superadmin can adjust based on real-world usage patterns.

**Clarification - Grace Period vs TTL:**
- **Grace period (3 min):** Delay BEFORE sending waitlist offers (dropout → wait 3 min → send offers)
- **TTL (graduated):** Time waitlist player has TO CLAIM once offer is sent (2h/1h/45m/30m/15m depending on kickoff)
- These are separate timers, not the same thing!

**Near-kickoff exception:** If <30min to kickoff, SKIP grace period entirely:
- Send waitlist offers immediately on dropout
- Use 5-minute TTL minimum (even at "instant claim" time)
- **Why:** At 10min to kickoff, 3min grace + 0 TTL = no time for anyone to see the push
- **Minimum TTL clamp:** 5-min floor ensures push can be delivered + player has time to tap

---

## **7) Waitlist Details**

Top-3 simultaneous offers. **Graduated TTL (v6.0.0) - All values configurable via `superadmin_config` (Section 0.1):**

| Time to Kickoff | Config Key | Default |
|-----------------|------------|---------|
| >24h | `waitlist_ttl_over_24h` | 120 min (2h) |
| 6h – 24h | `waitlist_ttl_6h_to_24h` | 60 min (1h) |
| 3h – 6h | `waitlist_ttl_3h_to_6h` | 45 min |
| 1h – 3h | `waitlist_ttl_1h_to_3h` | 30 min |
| 15min – 1h | `waitlist_ttl_15min_to_1h` | 15 min |
| <15min | `waitlist_ttl_under_15min` | 5 min (floor) |

All TTLs clamped to kickoff−15m max. Smoother experience than binary 2h/30min cutoff.

**TTL Calculation Function (reads from superadmin_config):**
```sql
CREATE OR REPLACE FUNCTION calculate_offer_ttl(kickoff_time TIMESTAMPTZ)
RETURNS INTERVAL AS $$
DECLARE
  hours_until NUMERIC;
  raw_ttl INTERVAL;
  ttl_over_24h INT;
  ttl_6h_24h INT;
  ttl_3h_6h INT;
  ttl_1h_3h INT;
  ttl_15m_1h INT;
  ttl_under_15m INT;
BEGIN
  hours_until := EXTRACT(EPOCH FROM (kickoff_time - NOW())) / 3600;
  
  -- Fetch configurable TTL values from superadmin_config (fail-loudly if missing)
  ttl_over_24h := get_superadmin_config_value('waitlist_ttl_over_24h')::int;
  ttl_6h_24h := get_superadmin_config_value('waitlist_ttl_6h_to_24h')::int;
  ttl_3h_6h := get_superadmin_config_value('waitlist_ttl_3h_to_6h')::int;
  ttl_1h_3h := get_superadmin_config_value('waitlist_ttl_1h_to_3h')::int;
  ttl_15m_1h := get_superadmin_config_value('waitlist_ttl_15min_to_1h')::int;
  ttl_under_15m := get_superadmin_config_value('waitlist_ttl_under_15min')::int;
  
  raw_ttl := CASE
    WHEN hours_until > 24 THEN (ttl_over_24h || ' minutes')::INTERVAL
    WHEN hours_until > 6  THEN (ttl_6h_24h || ' minutes')::INTERVAL
    WHEN hours_until > 3  THEN (ttl_3h_6h || ' minutes')::INTERVAL
    WHEN hours_until > 1  THEN (ttl_1h_3h || ' minutes')::INTERVAL
    WHEN hours_until > 0.25 THEN (ttl_15m_1h || ' minutes')::INTERVAL
    ELSE (ttl_under_15m || ' minutes')::INTERVAL -- Floor (so push can be delivered + seen)
  END;
  
  RETURN raw_ttl;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER: Bypasses RLS to read superadmin_config
```

First to claim wins (transactional). Others get "spot filled", remain on waitlist.

**Offer Log:** Admin sees history via `notification_ledger` (Claimed/Expired/Superseded).

**Manual Controls:** "Send new waitlist offers" button for immediate processing.

**Edge Cases:**
- **Capacity increase:** Auto-promote earliest WAITLIST players by queue order with notification
- **Capacity decrease (v6.0.0 - Simplified):** 
  - If `newCapacity < confirmedCount`: **Block the reduction**
  - Admin must manually remove players first
  - Prevents automatic demotion and associated drama
  - Activity feed logs `audit/admin_capacity_change` only for successful changes
  
  **API Implementation (atomic check):**
  ```typescript
  // PATCH /api/admin/matches/[id]/capacity
  const inCount = await prisma.match_player_pool.count({
    where: withTenantFilter(tenantId, {
      upcoming_match_id: matchId,
      response_status: 'IN'
    })
  });
  
  if (newCapacity < inCount) {
    return fail(
      `Can't reduce to ${newCapacity} - ${inCount} players already confirmed. Remove ${inCount - newCapacity} players first.`,
      RSVP_ERROR_CODES.CAPACITY_REDUCTION_BLOCKED
    );
  }
  
  // UI NOTE: When showing this error, include a "Remove players" button
  // that opens the player list filtered to confirmed players for easy removal
  
  // Check passed - update capacity
  await prisma.upcoming_matches.update({
    where: { upcoming_match_id: matchId },
    data: { capacity: newCapacity }
  });
  ```
- **RSVP toggled OFF (v4.5.0):**
  - Expire ALL active waitlist offers immediately (set offer_expires_at = now())
  - Preserve all waitlist positions and queue data
  - Block new waitlist claims (API returns ERR_BOOKING_CLOSED)
  - Do NOT notify waitlist players (admin-initiated closure)
  - Log to activity feed: `audit/admin_booking_disabled`
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

**Match Control Centre: 4-Step Architecture (v4.5.0)**

The Match Control Centre maintains its existing 4-step flow. RSVP integrates into Step 1 (Players) only:

```
Step 1: PLAYERS → Step 2: TEAMS → Step 3: RESULT → Step 4: DONE
(RSVP here)      (Auto-balance)    (Unchanged)      (Unchanged)
```

**CRITICAL UI COPY (Prevent Confusion):**

Admins often confuse "Balance" with "Send". Obsessive copy needed:

| Button | Tooltip | Effect |
|--------|---------|--------|
| "Balance Teams" | "Calculate fair teams (players cannot see yet)" | Sets `teams_balanced_at` |
| "Send Teams" | "Publish teams to players (triggers push)" | Sets `teams_sent_at` |

**Warning Banner (required):** If `teams_balanced_at` is set but `teams_sent_at` is null:
```
⚠️ Teams calculated but not sent yet — players cannot see them
[Send Teams Now]
```

**Step 1: Players - Unified Component with Mode Switching**

```typescript
// src/components/admin/matches/PlayersStep.component.tsx
// Single unified component that switches between Manual and RSVP modes

interface PlayersStepProps {
  matchId: number;
  matchState: MatchState;
}

export function PlayersStep({ matchId, matchState }: PlayersStepProps) {
  const { data: match } = useMatch(matchId);
  const rsvpEnabled = match?.booking_enabled ?? false;
  const canToggleRSVP = matchState === 'Draft'; // State guard
  
  return (
    <div>
      {/* Header: Always visible */}
      <PlayersStepHeader 
        matchId={matchId}
        rsvpEnabled={rsvpEnabled}
        canToggle={canToggleRSVP}
        onToggleRSVP={handleToggleRSVP}
      />
      
      {/* Dynamic content based on mode */}
      {rsvpEnabled ? (
        <RSVPModeView matchId={matchId} />
      ) : (
        <ManualModeView matchId={matchId} />
      )}
    </div>
  );
}
```

**Manual Mode (booking_enabled = OFF):**

```typescript
// src/components/admin/matches/ManualModeView.component.tsx
// Identical to current PlayerPoolPane - no changes needed

export function ManualModeView({ matchId }: { matchId: number }) {
  return (
    <>
      <AddPlayerButton matchId={matchId} />
      <PlayerPoolTable matchId={matchId} />
      {/* Standard manual pool management */}
    </>
  );
}
```

**RSVP Mode (booking_enabled = ON):**

```typescript
// src/components/admin/matches/RSVPModeView.component.tsx

export function RSVPModeView({ matchId }: { matchId: number }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'players' | 'activity'>('players');
  
  return (
    <>
      {/* Primary RSVP controls (always visible) */}
      <RSVPStatusPanel matchId={matchId} />
      {/* - Booking link + copy button */}
      {/* - Live counters: IN (15/20), OUT (3), WAITLIST (2) */}
      {/* - Share to WhatsApp button */}
      
      {/* Tab navigation */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="players" label="Players" />
        <Tab value="activity" label="Activity" />
      </Tabs>
      
      {/* Tab content */}
      {activeTab === 'players' ? (
        <>
          <RSVPPlayerList matchId={matchId} />
          {/* - Player cards with status badges */}
          {/* - Source icons (📱 App, 🌐 Web, 👤 Admin, 🎯 Guest) */}
          {/* - Quick actions per player */}
          
          <WaitlistCard matchId={matchId} />
          {/* - Queue positions */}
          {/* - Active offers with countdown */}
          {/* - Manual "Send offers now" button */}
          
          {/* Compact RSVP settings (always visible) */}
          <RSVPSettingsCompact matchId={matchId}>
            {/* - Invite mode: "All at once" | "Tiered" */}
            {/* - Auto-balance when full: checkbox + method dropdown */}
            {/* - Auto-lock when full: checkbox */}
          </RSVPSettingsCompact>
          
          {/* Advanced settings (collapsible) */}
          <CollapsibleSection 
            title="Advanced Settings"
            isOpen={showAdvanced}
            onToggle={() => setShowAdvanced(!showAdvanced)}
          >
            <TierWindowConfig matchId={matchId} />
            {/* - A/B/C open times (only if invite_mode = 'tiered') */}
            
            <RSVPPolicyFlags matchId={matchId} />
            {/* - Include guests in invites */}
            {/* - Block unknown players */}
            {/* - Allow guest self-booking */}
          </CollapsibleSection>
        </>
      ) : (
        <ActivityFeed matchId={matchId} />
        {/* - Reverse-chronological event timeline */}
        {/* - No filters/search (minimal) */}
        {/* - Shows: timestamp, emoji, action, masked player names */}
      )}
    </>
  );
}
```

**New Admin Components:**

```typescript
// src/components/admin/matches/ActivitySlideOut.component.tsx  
// Slide-out panel triggered by 📋 icon in Pool step header
// Shows ALL activity (including admin actions, waitlist offers sent)
// Minimal reverse-chronological timeline (no filters/search)
// Props: events: ActivityEvent[] from GET /api/admin/matches/{id}/activity
// Displays: timestamp (relative), emoji + copy, masked player names
// See Section 10 for activity kind display mapping

// src/components/admin/matches/PlayerTierManager.component.tsx
// Manage player tiers (A/B/C) - only visible if enable_tiered_booking=true
// Integrates with existing player management
// Tooltip: "Tier C = casual/default. All players start here unless assigned A or B."
```

**Admin Activity Slide-Out Panel:**

```
Pool step header:
┌─────────────────────────────────────────────────────────┐
│ Player Pool           16/18              [📋]          │
│                                           ↑             │
│                               Tap to open activity panel│
└─────────────────────────────────────────────────────────┘

Slide-out panel (from right):
┌──────────────────────────────────────┐
│ Match Activity              [✕]     │
├──────────────────────────────────────┤
│ 2m    ✅ Ian marked IN (app)        │
│ 5m    ❌ Bob dropped out            │
│ 8m    🎯 Waitlist offer → Carl      │
│ 10m   👤 Admin added Dave           │
│ 12m   ✅ Alex claimed spot          │
│ 1h    📣 Booking opened             │
│ ...                                 │
└──────────────────────────────────────┘
```

**Admin sees ALL events** (unlike player feed which is filtered):
- Player actions (IN/OUT/waitlist)
- Waitlist offers sent and claimed
- Admin actions (add/remove player, capacity change)
- System events (auto-balance triggered)
- RSVP mode changes

**Toggle Button Behavior:**

```typescript
// Header component shows RSVP toggle
<Button
  onClick={handleToggle}
  disabled={!canToggleRSVP}
  variant={rsvpEnabled ? 'secondary' : 'primary'}
>
  {!canToggleRSVP && <LockIcon className="mr-2" />}
  {rsvpEnabled ? 'Disable RSVP' : 'Enable RSVP'}
</Button>

{!canToggleRSVP && (
  <Tooltip>Can only change RSVP mode in Draft state</Tooltip>
)}
```

**Step 2: Teams Integration**

```typescript
// src/components/admin/matches/TeamsStep.component.tsx

export function TeamsStep({ matchId }: { matchId: number }) {
  const { data: match } = useMatch(matchId);
  const wasAutoBalanced = match?.auto_balanced_at !== null;
  
  return (
    <>
      {wasAutoBalanced && (
        <InfoBanner variant="info">
          ⚖️ Teams were auto-constructed when match reached capacity
          at {formatTime(match.auto_balanced_at)}.
          Review and adjust if needed before confirming.
        </InfoBanner>
      )}
      
      {/* Existing BalanceTeamsPane content */}
      <BalanceTeamsPane matchId={matchId} />
    </>
  );
}
```

**Steps 3-4: No Changes**

Result and Done steps remain unchanged - they are not affected by RSVP mode.

### **8.2 Player Mobile App (v5.0.0)**

**Match RSVP Page with Social Activity Feed:**

```typescript
// src/app/player/upcoming/match/[id]/page.tsx
// Unified RSVP page for all users (app, web, logged-in)
// Uses existing MainLayout.layout.tsx

// src/components/rsvp/RSVPInterface.component.tsx
// One-tap IN/OUT/WAITLIST buttons
// Waitlist offer banner with countdown
// Deep-link handling from WhatsApp
```

**Player UI Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ ⚽ Sunday 8th December               [← Back]          │
├─────────────────────────────────────────────────────────┤
│                    14/18 confirmed                      │
│                                                         │
│ Your status: IN ✓                                      │
│                                                         │
│ [✅ I'm In]  [❌ Can't Make It]                        │
├─────────────────────────────────────────────────────────┤
│ 📋 Teams being finalised – notification at 6pm Sat     │  ← NEW: scheduled mode banner
├─────────────────────────────────────────────────────────┤
│ Activity                                                │
│ ─────────────────────────────────────────               │
│ 2m    Ian is IN ✅                                     │
│ 5m    Bob can't make it ❌                             │
│ 8m    Carl joined the waitlist 📋                      │
│ 12m   Alex claimed a spot! 🎯                          │
│ 1h    Match created                                    │
│ ...                                                    │
└─────────────────────────────────────────────────────────┘
```

**Social Activity Feed Events (Player View):**

| Event | Display Text | Emoji |
|-------|--------------|-------|
| Player marks IN | "{name} is IN" | ✅ |
| Player marks OUT | "{name} can't make it" | ❌ |
| Player joins waitlist | "{name} joined waitlist" | 📋 |
| Player claims offer | "{name} claimed a spot!" | 🎯 |
| Spot opened | "A spot opened up!" | 🔓 |
| Match full | "Match is full!" | 🔒 |
| Teams announced | "Teams are set! Check yours" | 📝 |

**Events NOT shown to players (admin-only):**
- Admin manually adding/removing players
- Waitlist offers being sent (only claims)
- Capacity changes
- RSVP mode toggle

**Implementation:**

```typescript
// src/components/rsvp/PlayerActivityFeed.component.tsx

interface ActivityEvent {
  id: string;
  kind: 'player_in' | 'player_out' | 'waitlist_join' | 'offer_claimed' | 
        'spot_opened' | 'match_full' | 'teams_saved';
  playerName?: string;  // For player actions
  timestamp: Date;
}

const PLAYER_VISIBLE_EVENTS = [
  'player_in', 'player_out', 'waitlist_join', 'offer_claimed',
  'spot_opened', 'match_full', 'teams_saved'
];

export function PlayerActivityFeed({ matchId }: { matchId: number }) {
  const { data: events } = useQuery({
    queryKey: queryKeys.matchActivity(tenantId, matchId),
    queryFn: () => fetchPlayerActivity(matchId),
    refetchInterval: 30_000,  // Poll every 30 seconds
  });
  
  return (
    <div className="divide-y">
      <h3 className="font-semibold text-slate-700 py-2">Activity</h3>
      {events?.map(event => (
        <ActivityRow key={event.id} event={event} />
      ))}
    </div>
  );
}
```

**API Endpoint:**

```typescript
// GET /api/player/matches/[id]/activity
// Returns filtered activity (player-safe events only)
// Excludes admin actions, waitlist offers sent, etc.
```

**Real-Time Updates (Future):**
- MVP: 30-second polling via React Query `refetchInterval`
- Future: Supabase Realtime subscription for instant updates

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

**AUTO_LOCK_AND_BALANCE_PROCESSOR implementation (v5.0.0):**

Uses the combined lock-pool endpoint (December 2025 Match Control Centre update).
Worker makes HTTP call to lock-pool endpoint which handles both locking AND balancing atomically.

**Deduplication:** Prevents rapid-fire auto-lock jobs during dropout/refill churn:

```typescript
const AUTO_LOCK_COOLDOWN_MS = 60_000; // 1 minute cooldown per match
const autoLockTimestamps = new Map<string, number>();

export async function processAutoLockAndBalanceJob(jobId: string, payload: AutoLockJobPayload) {
  const { matchId, method, tenantId, playerIds, state_version } = payload;
  
  // Deduplication: Skip if auto-locked within last minute
  const cooldownKey = `${tenantId}:${matchId}`;
  const lastAutoLock = autoLockTimestamps.get(cooldownKey);
  const now = Date.now();
  
  if (lastAutoLock && (now - lastAutoLock) < AUTO_LOCK_COOLDOWN_MS) {
    console.log(`[AUTO_LOCK] Skipping duplicate job for match ${matchId} (cooldown active)`);
    await updateJobStatus(jobId, 'skipped');
    return;
  }
  
  autoLockTimestamps.set(cooldownKey, now);
  
  // Use combined lock-pool endpoint (handles lock + balance atomically)
  // This is the same endpoint the admin UI uses via LockPoolWithBalanceModal
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/upcoming-matches/${matchId}/lock-pool`,
    {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WORKER_API_KEY}`
      },
      body: JSON.stringify({ 
        playerIds: playerIds.map(id => id.toString()),
        balanceMethod: method, // 'ability' | 'performance' | 'random'
        state_version 
      })
    }
  );
  
  if (!response.ok) throw new Error(`Lock & Balance failed: ${await response.text()}`);
  
  // Log to activity feed
  await prisma.notification_ledger.create({
    data: {
      tenant_id: tenantId,
      upcoming_match_id: matchId,
      player_id: null, // System action (no specific player)
      kind: 'autobalance.balanced',
      batch_key: `autobalance:${matchId}:${Date.now()}`,
      details: { 
        triggered_by: 'capacity_reached', 
        method: method,
        timestamp: new Date().toISOString() 
      }
    }
  });
  
  // Set auto_balanced_at for UI messaging in Teams step
  // NOTE: teams_saved_at stays NULL - admin must click "Save Teams" for players to see
  await prisma.upcoming_matches.update({
    where: { upcoming_match_id: matchId },
    data: { auto_balanced_at: new Date() }
  });
  
  await updateJobStatus(jobId, 'completed');
}
```

**Auto-Pilot Processor (v6.0.0):**

Replaces the old AUTO_LOCK_AND_BALANCE_PROCESSOR. Runs every 5 minutes.

```typescript
// AUTO_PILOT_PROCESSOR
async function processAutoPilotMatches() {
  const matches = await prisma.upcoming_matches.findMany({
    where: {
      auto_pilot_enabled: true,
      is_pool_closed: false,
      state: 'Draft'  // Only process draft matches
    }
  });
  
  for (const match of matches) {
    const inCount = await getInCount(match.id);
    const isFull = inCount >= match.capacity;
    
    // Auto-balance when pool fills
    if (isFull && !match.teams_balanced_at) {
      await balanceTeams(match.id, match.auto_balance_method);
      await prisma.upcoming_matches.update({
        where: { upcoming_match_id: match.id },
        data: { teams_balanced_at: new Date() }
      });
    }
    
    // Auto-send at scheduled time (or immediately if configured)
    // CRITICAL: Re-check auto_pilot_enabled inside transaction
    // Admin may have toggled it OFF since job was scheduled
    if (match.auto_pilot_enabled && match.teams_balanced_at && !match.teams_sent_at && isFull) {
      const shouldSend = match.auto_pilot_send_mode === 'immediate'
        || isWithinSendWindow(match.match_date, match.auto_pilot_send_hours_before);
      
      if (shouldSend) {
        await sendTeamsNotification(match.id);
        await prisma.upcoming_matches.update({
          where: { upcoming_match_id: match.id },
          data: { teams_sent_at: new Date() }
        });
      }
    }
  }
}

// Check if we're within the send window
function isWithinSendWindow(matchDate: Date, hoursBefore: number): boolean {
  const sendTime = new Date(matchDate.getTime() - hoursBefore * 60 * 60 * 1000);
  return new Date() >= sendTime;
}
```

**Auto-pilot Sequence (v6.0.0):**
```
1. Player books final spot → IN count = capacity
2. AUTO_PILOT_PROCESSOR detects full pool (next 5-min run)
3. System balances teams (no state change!)
4. teams_balanced_at = now() (UI shows Teams pane)
5. At scheduled time (or immediately if configured):
   - teams_sent_at = now()
   - "Teams Announced" notification sent
   - Players can now see teams
6. If dropout after teams sent:
   - Waitlist fills spot
   - System re-balances
   - System re-sends "Updated Teams" notification
```

**Key changes from v5.0.0:**
- NO state changes during auto-pilot (stays in Draft)
- NO PoolLocked state used
- UI driven by `teams_balanced_at` timestamp
- Player visibility driven by `teams_sent_at` timestamp
- Re-balancing and re-sending happen automatically on pool changes

**Dropout handling (Auto-pilot enabled):**
- Waitlist auto-promotes to fill vacancy
- System re-balances when pool refills
- If teams already sent: System re-sends updated teams
- NO state bouncing (stays in Draft throughout)

**Other job implementations:**

- **tier_open_notifications:** Cron at tier times, target `is_guest=false`, send push (only if `enable_tiered_booking=true`)
- **dropout_grace_processor:** Configurable grace period (via `superadmin_config.grace_period_minutes`, default 3 min), then trigger waitlist offers
- **waitlist_offer_processor:** Every 5 min, expire offers (graduated TTL from `superadmin_config.waitlist_ttl_*` based on time-to-kickoff), auto-cascade, log to `notification_ledger`
- **notification_batcher:** Teams released (participants only), cancellation (all confirmed+waitlist), respect caps
- **last_call_processor:** Windows configured via `superadmin_config.last_call_hours_before` (default "12,3" = T-12h and T-3h), target unresponded + OUT flexible, exclude muted, track sent times in `last_call_sent_at` JSONB for idempotency

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
audit/admin_booking_disabled → "🔒 RSVP disabled"
autobalance.balanced → "⚖️ Teams auto-balanced"
teams.published → "📝 Teams published"
```

---

## **10.5) Email Templates (v5.0.0)**

**Note:** All email templates are documented in `docs/SPEC_Communications.md` for centralized management.
Email delivery uses Resend (already integrated for auth flows).

**RSVP-Specific Email Templates:**

**Match Invitation (tier_open):**
```
Subject: ⚽ {club_name} - Match on {date_friendly}
From: {club_name} <noreply@caposport.com>

Hi {player_name},

You're invited to play on {date_friendly} at {time}.

{spots_remaining} spots remaining. Tap to confirm:
[I'm In] [Can't Make It]

See you there!
{club_name}

---
Unsubscribe: {unsubscribe_link}
```

**Teams Announced (teams_saved):**
```
Subject: 📋 Teams are set for {date_friendly}
From: {club_name} <noreply@caposport.com>

Hi {player_name},

Teams for {date_friendly} are ready!

You're on Team {team_name}.

View full teams: {match_link}

See you there!
{club_name}

---
Unsubscribe: {unsubscribe_link}
```

**Waitlist Offer (waitlist_offer):**
```
Subject: 🎯 Spot opened for {date_friendly}!
From: {club_name} <noreply@caposport.com>

Hi {player_name},

Someone dropped out! A spot just opened for {date_friendly}.

You have {time_remaining} to claim it (first to claim wins).

[Claim Spot Now]

If you miss this one, you're still #{waitlist_position} on the waitlist.

{club_name}

---
Unsubscribe: {unsubscribe_link}
```

**Last Call (last_call):**
```
Subject: ⚡ We're {n} short for {date_friendly}
From: {club_name} <noreply@caposport.com>

Hi {player_name},

We're {n} players short for {date_friendly}. Can you make it?

[I'm In] [Can't Make It]

Kick-off: {time}

{club_name}

---
Unsubscribe: {unsubscribe_link}
```

**Match Cancelled (cancellation):**
```
Subject: 🛑 Match on {date_friendly} cancelled
From: {club_name} <noreply@caposport.com>

Hi {player_name},

Unfortunately, the match on {date_friendly} has been cancelled.

{cancellation_reason}

We'll be in touch about the next game.

{club_name}

---
Unsubscribe: {unsubscribe_link}
```

**Notification Delivery Logic (v5.0.0):**

```typescript
async function sendNotification(playerId: number, type: string, payload: any) {
  const player = await getPlayer(playerId);
  const pushToken = await getPushToken(playerId);
  const prefs = await getNotificationPrefs(playerId);
  
  // Check if this notification type is enabled
  if (!prefs[type]) return;
  
  // Try push if user has app installed
  if (pushToken) {
    await sendPush(pushToken, payload);
  }
  
  // Send email if:
  // 1. User has no app (email is only channel), OR
  // 2. User explicitly wants email copies
  if (!pushToken || prefs.emailCopies) {
    await sendEmail(player.email, payload);
  }
}
```

| User Type | Push | Email |
|-----------|------|-------|
| Has app (push token registered) | ✅ Primary | Only if "email copies" ON |
| No app (no push token) | ❌ Can't send | ✅ Always send |

**Player Notification Settings UI:**

```
Match Notifications
├── Booking Opens                [ON]
├── Last-Call Reminders          [ON]
├── Team Announcements           [ON]
└── Waitlist Offers              [ON]

Email Preferences
├── 📧 Send email copies         [OFF]
│   "Get emails even when using the app"
│
└── ℹ️ "If you don't have the app, you'll always receive emails."
```

**Unsubscribe Handling:**
- Each email has unique unsubscribe token
- Clicking unsubscribe sets `match_player_pool.muted = true`
- Muted players still get transactional emails (cancellation, teams) but not promotional (tier open, last call)

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

### **Match Lifecycle & Simplified State Machine (v6.0.0 - December 2025)**

**IMPORTANT CHANGE (v6.0.0):** State machine simplified. UI driven by timestamps, not states.

```
OLD States: Draft → PoolLocked → TeamsBalanced → Completed
NEW States: Draft → TeamsBalanced → Completed
```

**UI is now driven by timestamps:**
- `teams_balanced_at` = NULL → Show Pool UI
- `teams_balanced_at` = SET → Show Teams UI
- `state` = TeamsBalanced → Show Result UI
- `state` = Completed → Show Summary UI

**Database States vs UI Steps (v6.0.0):**

| DB State | teams_balanced_at | teams_sent_at | UI Step | Player View |
|----------|-------------------|---------------|---------|-------------|
| Draft | NULL | NULL | Pool (1) | "Match on [date]" |
| Draft | SET | NULL | Teams (2) | "Teams being finalised..." |
| Draft | SET | SET | Teams (2) | Full team lists |
| TeamsBalanced | SET | SET | Done (3) | Full team lists |
| Completed | SET | SET | Done (3) | Result + teams |

**The 3-Step UI Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: POOL (teams_balanced_at = NULL)                    │
├─────────────────────────────────────────────────────────────┤
│ Three modes (booking_enabled set at creation):             │
│                                                             │
│ Mode A: Manual (booking_enabled = FALSE)                   │
│   - Admin adds/removes players                             │
│   - No public booking link                                 │
│                                                             │
│ Mode B: RSVP (booking_enabled = TRUE, auto_pilot = FALSE)  │
│   - Players self-book via link                             │
│   - Admin clicks "Balance Teams" when ready                │
│   - Admin clicks "Send Teams" to notify players            │
│                                                             │
│ Mode C: Auto-pilot (booking_enabled = TRUE, auto_pilot = TRUE) │
│   - System auto-balances when pool fills                   │
│   - System auto-sends at scheduled time (or immediately)   │
│                                                             │
│ "Balance Teams" → sets teams_balanced_at (shows Teams UI)  │
│ "Close Pool" → sets is_pool_closed (escape hatch)          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: TEAMS (teams_balanced_at IS SET, state = Draft)    │
├─────────────────────────────────────────────────────────────┤
│ - Review balanced teams, drag/drop to adjust               │
│ - Re-Balance button to try different method                │
│ - "Send Teams" → sets teams_sent_at (players notified)     │
│ - "Enter Result" → transitions state to TeamsBalanced      │
│                                                             │
│ RSVP/Auto-pilot specifics:                                  │
│   - Pool still fluid (changes allowed unless is_pool_closed)│
│   - If dropout: waitlist fills, system re-balances         │
│   - If re-balance: teams_balanced_at updated               │
│   - If teams change after sent: auto re-send notification  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: DONE (state = TeamsBalanced or Completed)          │
├─────────────────────────────────────────────────────────────┤
│ TeamsBalanced substep:                                     │
│   - No-show checkboxes                                     │
│   - Team swap arrows                                       │
│   - Enter scores, "Save Result"                            │
│                                                             │
│ Completed substep:                                         │
│   - Match archived to history                              │
│   - Stats calculated and aggregated                        │
└─────────────────────────────────────────────────────────────┘
```

**Key Lifecycle Rules (v6.0.0):**

1. **booking_enabled locked at match creation** (can't change after)
2. **auto_pilot_enabled toggleable anytime** (admin can take over or hand off)
3. **UI driven by timestamps** (`teams_balanced_at`, `teams_sent_at`)
4. **State only changes for result entry** (Draft → TeamsBalanced when admin clicks "Enter Result")
5. **Pool always fluid** until `is_pool_closed` or kickoff
6. **Balancing and sending are decoupled** (can happen independently)
7. **No state bouncing** (removed PoolLocked state entirely)

**State vs Timestamp Clarification:**
- `teams_balanced_at` is updated on EVERY balance (initial, re-balance, auto-pilot)
- `teams_sent_at` is updated on EVERY send (initial, re-send)
- `state` column ONLY changes when:
  - Admin clicks "Enter Result" → `Draft` → `TeamsBalanced`
  - Admin clicks "Save Result" → `TeamsBalanced` → `Completed`
- Auto-pilot re-balancing does NOT change state (stays `Draft`)

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

See Section 8.1 for complete component architecture (v4.5.0).

### **Background Job System**

Extend existing worker with RSVP job types. Use existing database connection, error handling, retry patterns.

---

## **12.5) Quick Reference: Where to Find What (v6.0.0)**

| Topic | Section |
|-------|---------|
| Three modes (Manual/RSVP/Auto-pilot) | Section 2 |
| Mode selection rules | Section 2 |
| Auto-pilot configuration | Section 2 |
| Escape hatch (Close Pool) | Section 2 |
| Auto-pilot processor job | Section 9 |
| Atomic waitlist claim | Section 4.3.1 |
| Auto-pilot re-adjustment flow | Section 4.3.2 |
| UI rendering logic | Section 12 (state mapping table) |
| API error codes | Section 4.1 |
| Database schema | Section 3.2 |

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

**State Version Strategy (Mixed Approach):**

RSVP operations use `state_version` for optimistic concurrency control with one critical exception:

```typescript
// Most RSVP operations: Enforce state_version
await tx.upcoming_matches.update({
  where: {
    upcoming_match_id: matchId,
    state_version: currentVersion  // ✅ Enforced
  },
  data: { 
    state: newState,
    state_version: { increment: 1 }
  }
});

// Exception: Match completion (intentionally bypasses state_version)
await tx.upcoming_matches.update({
  where: {
    upcoming_match_id: matchId  // ⚠️ No state_version check
  },
  data: {
    state: 'Completed',
    state_version: { increment: 1 }
  }
});
```

**Rationale for Exception:**
- Match completion was causing orphaned matches (data saved but not marked complete)
- Overly strict concurrency checks caused partial failures
- Since completion is final state (can't be overridden), version conflicts are acceptable
- See `SPEC_match-control-centre.md` "Critical Production Bug Fixes" for full analysis

**Advisory Lock Protection:**

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

**Drop-out grace period** (fixed 3 minutes) cancels if player returns to IN during grace.

**Auto-balance triggers** when IN count reaches capacity (auto-pilot mode) or via admin manual trigger.

**teams_balanced_at persistence:** Once set, `teams_balanced_at` is NEVER cleared (except on match cancellation). If dropout occurs:
- Waitlist fills spot → re-balance → update `teams_balanced_at` to new time
- If waitlist empty and pool is 17/18 → show "17/18 – waiting for 1 more" banner, keep existing teams visible
- **Why:** Clearing causes UI confusion ("Teams announced but now 17 players — which teams are valid?")

**Background jobs** use existing tenant-scoped infrastructure and are idempotent with `batch_key` scoping.

### **Rate Limiting**

- **Admin endpoints:** Require admin auth + tenant validation
- **Public endpoints:** Multi-tenant rate limited (10/min per phone, 50/10s per match)
- **Token security:** Hashed storage, TTL enforcement, auto-expire at kickoff+24h
- **PII protection:** Never log full phone numbers, always mask in UI (`+447******789`)

### **Data Integrity**

**Single-Layer Security Model (Application-Level):**

Tenant consistency triggers prevent cross-tenant data corruption. All queries MUST include `tenant_id` via `withTenantFilter()` helper:

```typescript
// ✅ CORRECT: Explicit tenant filtering (MANDATORY)
const players = await prisma.match_player_pool.findMany({
  where: withTenantFilter(tenantId, {
    response_status: 'WAITLIST'
  })
});

// ❌ SECURITY VULNERABILITY: Missing tenant filter
const players = await prisma.match_player_pool.findMany({
  where: { response_status: 'WAITLIST' }  // Cross-tenant leak!
});
```

**RLS Policy Reality:**
- RLS policies exist but postgres role bypasses them (rolbypassrls = true)
- Application-level `withTenantFilter()` is the ONLY security layer
- Missing filter = security vulnerability
- See `SPEC_multi_tenancy.md` Section Q for architecture decision

**Tenant Consistency Triggers:**
- `enforce_tenant_match_pool()` validates tenant_id matches across related tables
- Prevents accidental cross-tenant data insertion
- Complements explicit filtering for defense-in-depth

### **Error Handling**

Production-grade error messages with PII protection. Phone numbers always masked. Never log raw tokens or full phone numbers.

### **Activity Feed & Audit Trail**

All RSVP events logged to `notification_ledger` with masked player identifiers. Admin sees complete timeline without PII exposure.

---

## **15) Match Day Reality & Payment Stability - ✅ BASE FEATURE IMPLEMENTED (January 2025)**

### **Core Principle: Lock Backwards, Flex Forward**

Once payments are enabled OR match is in result-entry phase:
- ❌ Cannot go back to Draft (prevents payment/RSVP disruption)
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

**2. Backwards Navigation Locking (⏳ FUTURE - Payment Phase):**

**⚠️ NOT YET IMPLEMENTED - This is proposed behavior for when payments are added:**

```sql
-- Add payment lock flag and constraint
ALTER TABLE upcoming_matches
  ADD COLUMN locked_for_payments BOOLEAN DEFAULT FALSE;

-- Prevent returning to Draft when payments locked
ALTER TABLE upcoming_matches
  ADD CONSTRAINT no_draft_unlock_when_payments_locked
  CHECK (NOT (locked_for_payments = true AND state = 'Draft'));
```

**When locked_for_payments = TRUE (v4.5.0 Forward Compatibility):**

1. **Prevents RSVP mode toggle:**
   ```typescript
   // In /api/admin/matches/[id]/toggle-rsvp
   if (match.locked_for_payments) {
     return fail(
       'Cannot change RSVP settings - payments have been processed',
       RSVP_ERROR_CODES.PAYMENTS_LOCKED
     );
   }
   ```

2. **Prevents backwards navigation:**
   - Cannot go back from TeamsBalanced → Draft
   - Cannot clear teams_balanced_at/teams_sent_at once payments processed
   - UI shows 🔒 "Locked for payments" badge

3. **UI Changes:**
   ```typescript
   // Disable unlock buttons once payments are enabled
   const canUnlock = !matchData.locked_for_payments;
   const canToggleRSVP = matchData.state === 'Draft' && !matchData.locked_for_payments;
   
   {canUnlock ? (
     <button onClick={actions.unlockPool}>← Back to Pool</button>
   ) : (
     <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded">
       🔒 Teams locked for payments - use Match Day adjustments for changes
     </div>
   )}
   
   {/* RSVP toggle button */}
   <Button disabled={!canToggleRSVP}>
     {!canToggleRSVP && <LockIcon />}
     {rsvpEnabled ? 'Disable RSVP' : 'Enable RSVP'}
   </Button>
   ```

**Current Reality:**
- `locked_for_payments` column does NOT exist yet
- Backwards navigation (unlock pool/teams) is always available
- RSVP toggle only checked against `state = 'Draft'`
- When RSVP+Payments are implemented together:
  - Payment lock prevents RSVP toggle (financial stability)
  - Payment lock prevents Draft unlock (prevent pool disruption)
  - Match-day adjustments remain flexible (Result step unchanged)

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
- **Works TODAY without RSVP** - admins manually check/uncheck players

**⏳ Phase 2 (When RSVP + Payments Implemented Together):**
- Auto-mark no-shows from RSVP status (if player marked OUT in pool)
- Add `locked_for_payments` column to prevent post-payment disruption
- Disable backwards navigation when locked
- Connect to payment records for financial stability

**Integration Path:**
- Phase 1 provides the foundation (checkbox = player attendance)
- RSVP adds automation (auto-uncheck based on OUT status)
- Payments add locking (prevent changing pool after money collected)

See `SPEC_match-control-centre.md` for complete Phase 1 implementation details.

---

## **16) Technical Requirements**

### **Dependencies**

- Node.js 18+ (existing requirement)
- Firebase project for FCM push notifications
- Capacitor for native app wrapper
- Existing Render worker and Supabase infrastructure

### **New Libraries**

```bash
# Push notifications
npm install firebase-admin @capacitor/push-notifications

# Phone validation (if not already installed)
npm install libphonenumber-js
```

### **16.1 Push Notification Infrastructure (REQUIRED)**

Push notifications are **core to RSVP** - not optional. Players must receive instant notifications for:
- Booking windows opening
- Waitlist offers (time-sensitive!)
- Last-call alerts
- Teams announced

**Architecture:**
```
Your Backend (Render Worker)
    ↓ Firebase Admin SDK
Firebase Cloud Messaging (FCM)
    ↓                    ↓
Android Device      APNs (Apple)
                        ↓
                   iOS Device
```

### **16.2 Firebase Project Setup**

**Step 1: Create Firebase Project**
```
1. Go to console.firebase.google.com
2. Click "Create Project" → Name: "Capo"
3. Disable Google Analytics (not needed)
4. Create project
```

**Step 2: Add iOS App**
```
1. Project Settings → Add App → iOS
2. Bundle ID: com.caposport.capo (match your app)
3. Download GoogleService-Info.plist
4. Add to ios/App/App/GoogleService-Info.plist
```

**Step 3: Add Android App**
```
1. Project Settings → Add App → Android
2. Package name: com.caposport.capo
3. Download google-services.json
4. Add to android/app/google-services.json
```

**Step 4: Create Service Account Key (for backend)**
```
1. Project Settings → Service Accounts
2. Generate New Private Key
3. Download JSON file
4. Store securely (environment variable or secrets manager)
```

### **16.3 iOS APNs Configuration**

**Required for iOS push notifications:**

```
1. Apple Developer Console → Certificates, Identifiers & Profiles
2. Keys → Create New Key
3. Enable "Apple Push Notifications service (APNs)"
4. Download .p8 file (save securely - only downloadable once!)
5. Note the Key ID and Team ID

6. Firebase Console → Project Settings → Cloud Messaging
7. iOS app → APNs Authentication Key
8. Upload .p8 file, enter Key ID and Team ID
```

### **16.4 Capacitor Configuration**

**Install plugin:**
```bash
npm install @capacitor/push-notifications
npx cap sync
```

**iOS: Update `ios/App/App/AppDelegate.swift`:**
```swift
import UIKit
import Capacitor
import FirebaseCore  // Add this
import FirebaseMessaging  // Add this

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

  func application(_ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    FirebaseApp.configure()  // Add this
    return true
  }
  
  // Add these methods for push token handling
  func application(_ application: UIApplication, 
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
    NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
  }
  
  func application(_ application: UIApplication, 
    didFailToRegisterForRemoteNotificationsWithError error: Error) {
    NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
  }
}
```

**Android: Update `android/app/build.gradle`:**
```gradle
apply plugin: 'com.google.gms.google-services'  // Add at bottom
```

**Android: Update `android/build.gradle`:**
```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.3.15'  // Add this
}
```

### **16.5 Frontend Token Registration**

```typescript
// src/lib/pushNotifications.ts
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { apiFetch } from '@/lib/apiConfig';

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications only available on native platforms');
    return;
  }

  // Request permission
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') {
    console.log('Push permission denied');
    return;
  }

  // Register with APNs/FCM
  await PushNotifications.register();

  // Listen for registration success
  PushNotifications.addListener('registration', async (token) => {
    console.log('Push token:', token.value);
    
    // Send token to backend
    await apiFetch('/push/register', {
      method: 'POST',
      body: JSON.stringify({
        token: token.value,
        platform: Capacitor.getPlatform(), // 'ios' or 'android'
      })
    });
  });

  // Listen for push notifications
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
    // Handle in-app notification display
  });

  // Listen for notification taps
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data;
    if (data.matchId) {
      // Navigate to match
      window.location.href = `/player/upcoming/match/${data.matchId}`;
    }
  });
}

// Call on app startup (after auth)
// initPushNotifications();
```

### **16.6 Backend Push Sending**

```typescript
// src/lib/pushService.ts
import admin from 'firebase-admin';

// Initialize once at startup
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(
  token: string, 
  payload: PushPayload
): Promise<boolean> {
  try {
    await admin.messaging().send({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          }
        }
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'rsvp',
        }
      }
    });
    return true;
  } catch (error: any) {
    // Handle invalid tokens (uninstalled app, etc)
    if (error.code === 'messaging/registration-token-not-registered') {
      // Remove invalid token from database
      await removeInvalidToken(token);
    }
    console.error('Push send failed:', error);
    return false;
  }
}

export async function sendPushToPlayers(
  playerIds: number[],
  tenantId: string,
  payload: PushPayload
): Promise<void> {
  // Get all tokens for these players
  const tokens = await prisma.push_tokens.findMany({
    where: withTenantFilter(tenantId, {
      player_id: { in: playerIds }
    }),
    select: { fcm_token: true }
  });

  // Send in batches of 500 (FCM limit)
  const tokenValues = tokens.map(t => t.fcm_token);
  for (let i = 0; i < tokenValues.length; i += 500) {
    const batch = tokenValues.slice(i, i + 500);
    const response = await admin.messaging().sendEachForMulticast({
      tokens: batch,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
    });
    
    // IMPORTANT: Clean up invalid tokens from batch response
    // Prevents wasting resources on uninstalled/expired tokens
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        removeInvalidToken(batch[idx]);  // Fire and forget
      }
    });
  }
}

// Remove invalid tokens immediately when FCM reports them
async function removeInvalidToken(token: string): Promise<void> {
  await prisma.push_tokens.deleteMany({
    where: { fcm_token: token }
  });
}
```

### **16.7 Environment Variables**

Add to `.env` and deployment config:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=capo-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@capo-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### **Infrastructure Summary**

| Component | Provider | Cost |
|-----------|----------|------|
| Push Gateway | Firebase FCM | Free (unlimited) |
| iOS Delivery | APNs via FCM | Free |
| Android Delivery | FCM direct | Free |
| Backend SDK | firebase-admin | Free |
| Token Storage | Supabase (push_tokens table) | Existing |

**Total additional cost: $0**

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

1. Night before, 1 player drops OUT; 3-min grace starts
2. After grace, capacity frees → push waitlist_offer to top-3 with 2hr TTL (or 30min if <3hr to kickoff)
3. First to tap Claim wins; others get "spot filled"
4. If enabled, auto-balance triggers to rebalance teams

### **C) Capacity Adjustment**

1. Match at 20/20, all IN
2. Admin tries to lower capacity to 18
3. System blocks: "Can't reduce to 18 - 20 players already confirmed. Remove 2 players first."
4. Admin removes 2 players manually (chooses who)
5. Admin can now reduce capacity to 18

---

## **19) Future Enhancements**

### **Near-Term (Post-MVP)**

**RSVP-Specific:**
- **Re-balance threshold:** Skip re-balance/re-send if team imbalance change is <10% (reduces notification spam when similar-rated player fills in)
- **Min capacity:** Add `min_capacity` field - "lock at 14, but keep waitlist open until 18". Auto-balance when `IN >= min_capacity`, not just when full.
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

**Key v6.0.0 Architectural Decisions:**

| Decision | Rationale |
|----------|-----------|
| Three modes (Manual/RSVP/Auto-pilot) | Flexibility for different admin styles |
| `booking_enabled` locked at creation | Prevent mid-match disruption |
| `auto_pilot_enabled` toggleable | Admin can take over or hand off anytime |
| Simplified states (no PoolLocked) | Cleaner, timestamp-driven UI |
| Pool always fluid | Changes allowed until kickoff |
| Decoupled balance/send | Balancing ≠ notifying players |

**Implementation:** 5-6 week roadmap. Phased rollout with feature flags. Backward compatible - manual workflow unchanged.

---

**End of RSVP Specification v6.0.0**
