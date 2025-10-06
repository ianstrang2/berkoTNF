BerkoTNF RSVP & Player Invitation System — Simplified Implementation Specification

Version 4.2.0 • Updated for Auth v5.0 (Phone-Only)

**BUILDING ON COMPLETE MULTI-TENANCY FOUNDATION**

This specification builds on the **fully implemented multi-tenancy infrastructure** and has been streamlined based on real-world usage patterns:
- ✅ **Multi-tenancy COMPLETE**: All 33+ tables tenant-scoped, RLS policies active
- ✅ **Established API patterns**: 70+ routes use standardized tenant filtering
- ✅ **Production-ready infrastructure**: Tenant-aware locks, background jobs, SQL functions
- Current match lifecycle system (Draft → PoolLocked → TeamsBalanced → Completed)
- Established UI patterns and soft-UI styling
- **SIMPLIFIED**: Admin-only ringer management (no self-booking approval flows)
- **ENHANCED**: Auto-balance with optional auto-lock for hands-off management
- **STREAMLINED**: Single unified RSVP flow for all users
- **FOCUSED**: Core RSVP functionality without complex onboarding
- **SECURE**: Token hashing and production reliability built-in

---

**Dependencies:** This specification builds on `SPEC_auth.md` (v5.0 - Phone-Only) for:
- **Phone authentication** for ALL users (players AND admins via Supabase phone provider)
- **Admin = player with privileges** (`players.is_admin` flag - no separate account type)
- **Auto-linking** by phone number (club invite link flow)
- **Session management** and JWT tokens
- **Superadmin** (platform-level, email auth - separate from club users)

All authentication logic is defined in the Auth Specification. This spec focuses on RSVP booking logic only.

**Auth Architecture (v5.0):**
- All club users authenticate via phone/SMS
- Admin status is a boolean flag on player records
- No email auth for club users (simplified from v4.0)
- See `SPEC_auth.md` for complete details

---

## **Human Overview — How It Works (Plain English)**

### **1) What the admin does**

**Create match as usual.** Set capacity (e.g., 20 players for 10v10).

**If they want self-serve bookings:** toggle "Allow self-serve booking" and configure:
- **Invite mode:** "All at once" (everyone can book immediately) or "Tiered" (A/B/C windows)
- **Auto-balance:** When match fills up, automatically balance teams (default ON)
- **Auto-lock:** When match fills up, automatically lock the pool (default OFF)
- **Why separate toggles?** Most admins want teams balanced but prefer to keep the match open for waitlist flow until they manually lock

**Share one link** in WhatsApp: "Book for Sunday's match: [link]"

**Watch real-time updates** in Match Control Centre:
- "Booked 15/20" and "Waitlist 3" counters
- Player list with source badges: 📱 App, 🌐 Web, 👤 Admin, 🎯 Ringer
- **Activity feed** showing reverse-chronological timeline: invites sent, offers issued/claimed, teams balanced
- **Manual controls:** "Auto-balance now" button (Draft state), waitlist management

**Add ringers manually** using existing "Add Player" modal:
- **Ringers = guests/one-off players** who don't self-book or pay online
- **Admin retains full control** - ringers can't use the public booking link
- **No complexity** - same workflow as today, just with RSVP happening around them

**Teams auto-balance when full** (if enabled):
- **Auto-balance triggers:** When confirmed IN count first reaches capacity (strict - not on every IN/OUT toggle)
- **Manual trigger:** Admin can click "Auto-balance now" button in Draft state
- **State behavior:** 
  - `auto_lock_when_full=false` (default): Teams balance and publish, match stays Draft for waitlist flow
  - `auto_lock_when_full=true`: Teams balance and match locks to TeamsBalanced state
- **Manual override:** Admin can disable auto-balance and manage teams manually as today

**When ready:** Lock Pool → Balance Teams → Complete (unchanged workflow).

### **2) What regular players see / do**

**Tap the shared deep link:**
- Opens in native Capacitor app: `capo://match/123`
- **App-only** - native mobile experience only
- **Authenticated users:** Immediately see RSVP interface
- **New users:** SMS verification flow, then RSVP
- Shows match details, current booking status, and simple RSVP buttons

**Three simple actions:**
- **IN** - "I'm coming" (counts toward capacity)
- **OUT** - "Can't make it" (with optional "Might be available later" for last-call notifications)  
- **Join Waitlist** - if match is full (first-come-first-served queue)

**If they're a ringer or unknown player:**
- **Ringers blocked:** "Please ask the organiser to add you for this match."
- **Unknown numbers:** "This number isn't registered with this club. Please ask the organiser to add you."
- **Too early (tiered):** "Too early — Tier C opens at 2pm. The IN button will appear here 👍"

**Real-time updates:**
- See live booking count: "15/20 confirmed, 3 waiting"
- Get push notifications for tier opens, waitlist offers, last-calls
- View teams once they're balanced (if auto-balance enabled)

**Enhanced /player/upcoming overview** shows match cards with:
- 📅 Sunday 15th Jan, 2pm at Berko Astro
- 👥 15/20 confirmed • 3 waiting  
- 🟢 You're IN | ⏸️ Waitlist #2
- **Tap to view teams or change RSVP**

**Waitlist system:**
- Join queue when match is full
- Get offered spots when someone drops out (top 3 get offers simultaneously)
- First to claim wins, others stay on waitlist
- Dynamic offer timing: 4 hours normally, faster near kick-off

**Last-call notifications:**
- **Fixed windows:** T-12h and T-3h if match is short of players (sent only once each)
- **Smart targeting:** Unresponded players + "OUT but flexible" players only
- **Respect preferences:** Excludes muted players and those at notification caps

### **3) Who gets invited when (invite modes)**

**Two invite modes per match:**

**All at once (default):** 
- Anyone with the link can book immediately until capacity is reached
- **Best for:** Casual matches, smaller groups, when timing isn't critical

**Tiered mode:** 
- Time-based booking windows with A/B/C tiers
- **Tier A** players (regulars/committed) can book first
- **Tier B** players (semi-regulars) can book from a later time  
- **Tier C** players (casuals/default) can book from an even later time
- **Best for:** Popular matches, managing demand, rewarding regular attendance
- **Implementation:** When a tier opens, write one `match_invites` row (stage A/B/C) and mark invited players' `invited_at` + `invite_stage`

**Tier assignment logic:**
- **New players default to Tier C** (casual tier)
- **Admins manually promote** committed players to A or B
- **Future enhancement:** Auto-assignment based on attendance history

**Flexible timing:**
- Admins can set B and C to open simultaneously for a two-window flow
- Global defaults (e.g., A→B +24h, A→C +48h) minimize per-match setup

**Who gets notifications:**
- **Regular players:** Get tier-open and last-call pushes based on their tier
- **Ringers:** Excluded from invite/last-call pushes; they do get transactional pushes when participating (teams released, cancellation, waitlist offers)

### **4) How the waitlist & offers work**

**When the match reaches capacity,** players can still join the waitlist.

**If someone drops OUT,** there's a grace period so they can change their mind:
- **5 minutes normally** (people change their minds quickly)
- **2 minutes if <24h to kick-off** (less time for indecision)
- **1 minute if <3h to kick-off** (almost game time)

**After grace expires,** the spot becomes available and the system:
- **Offers to top 3 waitlisted players simultaneously** (by queue order)
- **First to claim wins** - others get "spot filled" and stay on waitlist
- **No favoritism** - pure first-come-first-served

**Offers have smart time limits:**
- **4 hours normally** (plenty of time to see and respond)
- **1 hour if <24h to kick-off** (match is soon)
- **30 minutes if <3h to kick-off** (almost game time)
- **Instant claim if <15min to kick-off** (no hold period, first tap wins)
- **Banner shows:** "Kick-off soon — spots are first-come, first-served."

**Auto-cascade system:**
- When offers expire, automatically offer to next 3 players
- Continues until spot is claimed or waitlist is empty
- Admin can manually trigger offers anytime

### **5) Smart notifications (push only; no SMS/email)**

**Targeted notifications:**
- **Tier-open:** "Booking open for Sunday's match. ✅ IN | ❌ OUT"
- **Waitlist offers:** "Spot just opened! First to claim gets it. Expires in 2h 30m."
- **Last-call:** "We're 3 short for Sunday. Can you make it? ✅ IN | ❌ OUT"
- **Teams released:** "Teams are out for Sunday's match!" (when auto-balance completes)
- **Cancellation:** "Sunday's match has been cancelled" (to all participants)

**Smart targeting:**
- **Regular players only** get automatic invites (tier-open, last-call)
- **Ringers excluded** from auto-notifications (admin controls their participation)
- **Last-call targeting:** Unresponded players + "OUT but flexible" players only

**Spam protection:**
- **Max 3 last-call messages** per player per match
- **6-hour cooldown** between last-call notifications
- **No quiet hours** - notifications send immediately when triggered
- **Batching** for efficiency without delaying important messages

### **6) What the admin sees in Match Control Centre**

**Enhanced booking panel (when RSVP enabled):**

**Quick overview (always visible):**
- **Enable RSVP toggle** with instant link generation
- **Copy link button** for WhatsApp sharing
- **Live counters:** "Booked 15/20" • "Waitlist 3" (with tenant-scoped cache tags)
- **Auto-balance status:** "Teams will balance at 20" or "Manual balancing"

**Main controls:**
- **Invite mode:** "All at once" (everyone immediately) | "Tiered" (A/B/C windows)
- **Auto-balance:** Balance teams when full (default ON, recommended)
- **Auto-lock:** Lock pool when full (default OFF, keeps waitlist flowing)
- **Why these defaults?** Most admins want teams ready but prefer manual control over locking

**Player lists with smart badges:**
- **📱 App / 🌐 Web:** Self-RSVP'd regular players
- **👤 Admin:** Admin-added players (regulars and ringers)
- **🎯 Ringer:** Optional badge when `is_ringer=true` for quick identification

**Smart removal system:**
- **Admin-added players:** Simple "❌" remove (admin added, admin removes)
- **Self-RSVP'd players:** "⚠️" confirmation ("Removing will free 1 spot. Waitlist: 3 players.")
- **Future paid players:** "💳" strong warning about refunds and payment processing

**Advanced tools (collapsible):**
- **Activity Feed:** Real-time timeline (📣 invites, 🎯 offers, ✅ claims, ⚖️ auto-balance, 👤 admin actions)
- **Manual triggers:** "Auto-balance now" (Draft only) | "Send new waitlist offers" | "Release spot now" 
- **Waitlist dashboard:** Active offers with countdown timers, offer history with Claimed/Expired status
- **Share templates:** Pre-filled WhatsApp messages for manual sharing

**Unchanged workflow:**
- **Lock Pool → Balance Teams → Complete** works exactly as today
- **Auto-balance just speeds it up** - teams appear automatically when full
- **Admin can still override** everything manually

### **7) Ringers explained - Why they're different**

**What's a ringer in RSVP context?**
- **Guest players** the admin brings occasionally (friends, subs, one-offs)
- **Don't self-book or pay online** - admin handles their participation directly
- **Don't get automatic notifications** - admin decides when to include them
- **Same as today's workflow** - admin adds them via "Add Player" modal when needed

**Why keep ringers separate from RSVP?**
- **Admin control:** Some players shouldn't have direct booking access
- **Payment simplicity:** Ringers often pay cash or are comped by admin
- **Notification control:** Avoid spamming occasional players with regular match invites
- **Flexibility:** Admin can promote ringers to regulars anytime

**How ringers work with RSVP:**
- **Admin adds them manually** to any match (same as today)
- **They appear in player lists** with 👤 Admin badge (and optional 🎯 Ringer badge)
- **They count toward capacity** once added
- **They don't receive invite/last-call pushes** (unless admin enables `include_ringers_in_invites=true`)
- **They DO get transactional pushes** when participating (teams released, cancellation, waitlist offers)
- **They can't use the public booking link** (blocked with message: "Please ask the organiser to add you for this match.")

**Promoting ringers to regulars:**
- **Admin decision:** Open player profile → toggle `is_ringer=false`
- **Instant upgrade:** Player becomes Tier C regular
- **New capabilities:** Can self-RSVP, will get notifications, can (future) pay online
- **No data loss:** All match history and stats preserved

**Global policy controls:**
- `include_ringers_in_invites = false` (default) - ringers don't get invite/last-call pushes
- `enable_ringer_self_book = false` (default) - ringers can't use public links
- **Admin can enable either** if they want more ringer autonomy
- **Important:** No visible UI control for "Include ringers in invites" - keep it config-only

**The key insight:** Ringers represent **admin-managed participation** vs. **self-service participation** for regulars.

---

0) Scope & Goals

Add in/out (RSVP) functionality to keep matches full with minimal admin effort and no paid messaging.

In scope

**Core RSVP System:**
- Two match modes: Manual only (default) | Self-serve booking (optional toggle)
- Invitations & responses (IN / OUT / WAITLIST) with tier open windows (A | B | C)
- Waitlist with top-3 simultaneous offers and offer TTL
- Native push notifications via Capacitor (FCM/APNs)
- Unified RSVP experience: `/player/upcoming/match/[id]?token=...` for all users
- Optional calendar .ics files for reminders

**Enhanced Admin Features:**
- Comprehensive audit trail and activity feed with source tracking
- Auto-balance system with optional auto-lock for hands-off management
- Enhanced player removal warnings based on source (admin vs self-RSVP)
- Real-time RSVP activity monitoring
- Admin-only ringer management (no self-booking approval flows)

**Technical Infrastructure:**
- DB schema, APIs, background jobs (Render worker), RLS, and UI
- Production reliability: concurrency protection, rate limiting, security
- App installation tracking (passive monitoring only)

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

**Enhanced Capacity Management:** If admin lowers capacity below current IN count, demote the most-recent IN players (by `invited_at`/`updated_at`) to WAITLIST (LIFO), log to `notification_ledger`, send polite notification. Expire/supersede any active offers to prevent over-issue. All capacity changes use `withTenantMatchLock` for race safety.

2) Modes (per match)

Manual only (default)
No public link. Admin adds players as today.

Self-serve booking
Toggle Allow self-serve booking → app generates a public booking link + editable share text.
Optional tier open times (A→B→C). Admin can still add players manually at any time.

3) Database Schema Changes

**✅ MULTI-TENANCY FOUNDATION COMPLETE:**
- ✅ `players` table: Already exists with tenant_id, unique constraints, RLS policies
- ✅ `upcoming_matches` table: Already exists with tenant_id, match lifecycle states  
- ✅ `match_player_pool` table: Already exists with tenant_id, basic RSVP functionality
- ✅ `background_job_status` table: Already exists with tenant_id for job processing
- ✅ `tenants` table: Complete with UUID keys, metadata, settings
- ✅ All 33+ tables have tenant_id fields with proper foreign key constraints

**RSVP-SPECIFIC ADDITIONS NEEDED:**

3.1 Players Table (Add RSVP Fields Only)
```sql
-- ✅ Multi-tenancy already complete: tenant_id, constraints, indexes, RLS policies
-- Current: players(player_id, tenant_id, name, is_ringer, ...) ✅ ALREADY EXISTS

-- ADD: RSVP-specific fields only
ALTER TABLE players
  ADD COLUMN phone TEXT,                                  -- E.164 format, UK-only initially
  ADD COLUMN tier TEXT NOT NULL DEFAULT 'C' CHECK (tier IN ('A','B','C')),
  ADD COLUMN last_verified_at TIMESTAMPTZ;               -- SMS verification timestamp

-- UK-specific phone validation (initially)
ALTER TABLE players
  ADD CONSTRAINT valid_uk_phone 
  CHECK (phone IS NULL OR phone ~ '^\+44[1-9]\d{9}$');

-- ✅ Multi-tenant phone uniqueness (builds on existing tenant infrastructure)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_players_tenant_phone 
  ON players (tenant_id, phone) WHERE phone IS NOT NULL;

-- ✅ Performance indexes (tenant_id already leads in existing indexes)
CREATE INDEX IF NOT EXISTS idx_players_tenant_phone ON players(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_players_tenant_tier ON players(tenant_id, tier);
```

**Phone Normalization:** All phone input must be normalized to E.164 format before storage to prevent duplicates

**Normalization Examples:**
- `07123456789` → `+447123456789` (UK mobile)
- `+44 7123 456789` → `+447123456789` (remove spaces)

**Phone Normalization:** All phone inputs use E.164 normalization utilities defined in Auth Specification.

```typescript
// Use auth spec utility (don't duplicate)
import { normalizeToE164, isValidUKPhone } from '@/utils/phone.util';

const normalizedPhone = normalizeToE164(userInput); // Handles UK formats
```

**See:** Auth Specification Appendix for `phone.util.ts` implementation.

**Note:** `is_ringer` field already exists - will be used for guest/one-off players

### 3.5 Player Authentication (See Auth Spec)

Player authentication is handled by Supabase phone provider as defined in `SPEC_auth.md`.

**Authentication Flow (Club Invite Link - Implemented ✅):**
1. Admin shares club invite link in WhatsApp: `https://capo.app/join/berkotnf/abc123`
2. Player taps link → **App-first landing page** (Phase 5):
   - **Mobile browser**: Shows app download CTA with benefits + web fallback option
   - **Desktop browser**: Shows QR code to scan with phone
   - **Already in app**: Skips landing, goes straight to verification
3. Player enters phone number → receives SMS code → verifies
4. Player enters name (14 char max) for admin identification
5. Supabase creates `auth.users` record and session
6. **Auto-linking** via phone number match:
   - System normalizes phone numbers (both incoming and database)
   - Finds matching player by phone in `players.phone` field
   - If match: Auto-links `players.auth_user_id` to session.user.id
   - If no match: Creates `player_join_requests` entry for admin approval
7. Player redirected to dashboard (auto-linked) or pending approval page
8. For RSVP deep links: `capo://match/123` - authenticated players proceed directly to RSVP
9. **Deep links configured**: Custom scheme (`capo://`) + universal links (`https://capo.app`)

**RSVP API Integration:**
All RSVP endpoints verify authentication via Supabase session:
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) return unauthorized();

// Session includes player phone and tenant context
const playerPhone = session.user.phone;
const tenantId = session.user.app_metadata?.tenant_id;
```

**See:** Auth Specification Section E (Authentication Flows) for complete implementation.

### 3.6 Admin-Players Access (See Auth Spec)

**Simplified Model (v5.0):** Admin = player with `is_admin` flag set to true.

**Integration with RSVP:**
- All admins are players (single account, single phone auth)
- `players.is_admin = true` grants admin dashboard access
- Same user can access both player features (RSVP, stats) and admin features (match management)
- Navigation determined by URL path, not separate role switching
- Admins can RSVP to matches like any other player

**Database Schema:**
- No separate admin accounts or linking
- Single `players` table with `is_admin` boolean flag
- Admin promotion via toggle in player edit modal

**See:** Auth Specification v5.0 for phone-only architecture details.

3.2 Upcoming Matches (Add RSVP Features Only)
```sql
-- ✅ Multi-tenancy already complete: tenant_id, constraints, indexes, RLS policies
-- Current: upcoming_matches(upcoming_match_id, tenant_id, match_date, team_size, state, ...) ✅ ALREADY EXISTS

-- ADD: RSVP-specific fields only
ALTER TABLE upcoming_matches
  ADD COLUMN booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN invite_token_hash TEXT,                      -- hashed token for security
  ADD COLUMN invite_token_created_at TIMESTAMPTZ NULL,    -- token creation time
  ADD COLUMN a_open_at TIMESTAMPTZ NULL,                  -- Tier A open time
  ADD COLUMN b_open_at TIMESTAMPTZ NULL,                  -- Tier B open time
  ADD COLUMN c_open_at TIMESTAMPTZ NULL,                  -- Tier C open time
  ADD COLUMN match_timezone TEXT NOT NULL DEFAULT 'Europe/London',  -- for display only
  ADD COLUMN capacity INT NULL,                           -- explicit capacity (if NULL, fallback to team_size*2)
  -- Auto-balance and auto-lock system
  ADD COLUMN auto_balance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN auto_balance_method TEXT NOT NULL DEFAULT 'performance'
    CHECK (auto_balance_method IN ('ability','performance','random')),
  ADD COLUMN auto_lock_when_full BOOLEAN NOT NULL DEFAULT FALSE,
  -- Fixed last-call tracking (simplifies idempotency)
  ADD COLUMN last_call_12_sent_at TIMESTAMPTZ NULL,       -- T-12h last-call timestamp
  ADD COLUMN last_call_3_sent_at TIMESTAMPTZ NULL;        -- T-3h last-call timestamp

-- ✅ Multi-tenant token uniqueness (builds on existing tenant infrastructure)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_upcoming_matches_tenant_token_hash
  ON upcoming_matches(tenant_id, invite_token_hash)
  WHERE invite_token_hash IS NOT NULL;

-- ✅ Performance indexes (tenant_id already leads in existing indexes)
CREATE INDEX IF NOT EXISTS idx_upcoming_matches_tenant_tier_opens
  ON upcoming_matches(tenant_id, a_open_at, b_open_at, c_open_at);
```

3.3 Match Player Pool (Extend Existing Table)
**CURRENT:** Already has `response_status` field with values 'IN', 'OUT', 'MAYBE', 'PENDING'

**RESPONSE STATUS SEMANTICS:**
- **IN**: Confirmed attendance (counts toward capacity)
- **OUT**: Cannot attend  
- **MAYBE**: Soft interest (excluded from capacity counts, kept for backward compatibility)
- **WAITLIST**: Wants to attend but match is full
- **PENDING**: No response yet (excluded from capacity counts, displays as "No response yet" - not "awaiting approval")

**CAPACITY CALCULATION:** Capacity counts IN only. MAYBE, PENDING, and WAITLIST are excluded.

```sql
-- ✅ Multi-tenancy already complete: tenant_id, constraints, indexes, RLS policies
-- Current: match_player_pool(id, tenant_id, upcoming_match_id, player_id, response_status, ...) ✅ ALREADY EXISTS

-- ADD: RSVP-specific fields only
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

-- ✅ Multi-tenant unique constraints already exist (unique_match_player_per_tenant)
-- ✅ Performance indexes already exist with tenant_id leading

-- ADD: RSVP-specific indexes only
CREATE INDEX IF NOT EXISTS idx_mpp_tenant_match_waitpos
  ON match_player_pool(tenant_id, upcoming_match_id, waitlist_position);
CREATE INDEX IF NOT EXISTS idx_mpp_tenant_match_offer_exp
  ON match_player_pool(tenant_id, upcoming_match_id, offer_expires_at);

-- Optimized waitlist query index (tenant-scoped)
CREATE INDEX IF NOT EXISTS idx_mpp_tenant_waitlist_active
  ON match_player_pool (tenant_id, upcoming_match_id, waitlist_position)
  WHERE response_status='WAITLIST' AND offer_expires_at IS NULL;

-- Waitlist position integrity (prevents duplicate positions per tenant)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mpp_tenant_waitpos_per_match
  ON match_player_pool (tenant_id, upcoming_match_id, waitlist_position)
  WHERE response_status = 'WAITLIST' AND waitlist_position IS NOT NULL;

-- Integrity constraint for offer expiry
ALTER TABLE match_player_pool
  ADD CONSTRAINT offer_expiry_only_for_waitlist
  CHECK (offer_expires_at IS NULL OR response_status='WAITLIST');
```

3.4 New Tables (Following BerkoTNF Conventions)

**Invitation Waves (Audit Trail) - Multi-Tenant**
```sql
CREATE TABLE IF NOT EXISTS match_invites (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,             -- Multi-tenant isolation
  upcoming_match_id INT NOT NULL REFERENCES upcoming_matches(upcoming_match_id) ON DELETE CASCADE,
  stage TEXT NOT NULL,                  -- 'A','B','C' or custom
  created_by INT NOT NULL,              -- admin user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_count INTEGER NULL
);
CREATE INDEX IF NOT EXISTS idx_match_invites_tenant_match
  ON match_invites(tenant_id, upcoming_match_id);
```

**Enhanced Notification Ledger (Push Audit + Activity Feed) - Multi-Tenant**
```sql
CREATE TABLE IF NOT EXISTS notification_ledger (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,             -- Multi-tenant isolation
  upcoming_match_id INT NOT NULL REFERENCES upcoming_matches(upcoming_match_id) ON DELETE CASCADE,
  player_id INT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  kind TEXT NOT NULL
    CHECK (kind IN (
      -- Push notifications
      'invite','dropout','waitlist_offer','last_call','cancellation',
      -- Admin action audit (prefixed for separation, never log PII)
      'audit/admin_add_player','audit/admin_remove_player','audit/admin_capacity_change',
      'audit/admin_override_grace','audit/admin_manual_offer',
      -- NEW: Enhanced activity tracking
      'waitlist_offer_claimed','autobalance.balanced','teams.published'
    )),
  batch_key TEXT NULL,                  -- window key to coalesce pushes
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Additional context for audit events (no PII)
  actor_name TEXT NULL,                 -- "Admin" or player display name (masked phone)
  source TEXT NULL,                     -- 'app'|'web'|'admin'
  details TEXT NULL                     -- Additional context (no sensitive data)
);
-- Multi-tenant optimized indexes (tenant_id first for hot paths)
CREATE INDEX IF NOT EXISTS idx_notif_ledger_tenant_match_player
  ON notification_ledger(tenant_id, upcoming_match_id, player_id);
CREATE INDEX IF NOT EXISTS idx_notif_ledger_tenant_kind
  ON notification_ledger(tenant_id, kind, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_ledger_tenant_audit
  ON notification_ledger(tenant_id, upcoming_match_id, kind, sent_at DESC)
  WHERE kind LIKE 'audit/%';
```

**Native Push Tokens (Capacitor App) - Multi-Tenant**
```sql
CREATE TABLE IF NOT EXISTS push_tokens (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,             -- Multi-tenant isolation
  player_id INT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android')),
  fcm_token TEXT NOT NULL,              -- FCM for Android, APNs via FCM for iOS
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, player_id, device_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_tenant_player
  ON push_tokens(tenant_id, player_id);
```

**REMOVED: Profile Claiming & Club Onboarding System**
```sql
-- These tables are NOT needed in the simplified version:
-- join_requests (removed - no approval flow)
-- claim_tokens (removed - no profile claiming)
-- 
-- Ringers are added directly by admin using existing "Add Player" modal
```

**Enhanced Performance Indexes (Multi-Tenant)**
```sql
-- Critical performance indexes for common queries (tenant-scoped)
CREATE INDEX IF NOT EXISTS idx_mpp_tenant_match_player
  ON match_player_pool(tenant_id, upcoming_match_id, player_id);
-- REMOVED: idx_mpp_pending_expiry (no longer needed since PENDING holds are removed)
```

**Multi-Tenant Data Integrity (FK + Tenant Consistency)**
```sql
-- Tenant consistency enforcement for match_player_pool
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

-- Similar triggers needed for other cross-table references
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
-- NEW: Auto-balance defaults (simplified)
('default_auto_balance_enabled', 'true', 'Enable auto-balance by default for new matches', 'match_settings', 'Default Auto-Balance', 'Match Creation Defaults', 14),
('default_auto_balance_method', 'performance', 'Default auto-balance method', 'match_settings', 'Default Balance Method', 'Match Creation Defaults', 15),
('default_auto_lock_when_full', 'false', 'Auto-lock matches when full', 'match_settings', 'Default Auto-Lock', 'Match Creation Defaults', 16),
-- Global RSVP policies (simplified - no growth mode)
('enable_ringer_self_book', 'false', 'Allow ringers to book via public links', 'rsvp_policies', 'Allow Ringers to Book', 'RSVP Policies', 1),
('include_ringers_in_invites', 'false', 'Include ringers in automatic invitations', 'rsvp_policies', 'Include Ringers in Invites', 'RSVP Policies', 2),
('block_unknown_players', 'true', 'Block unknown phone numbers from booking', 'rsvp_policies', 'Block Unknown Players', 'RSVP Policies', 3),
-- Advanced RSVP settings (technical settings)
('rsvp_burst_guard_enabled', 'true', 'Enable write-burst protection for leaked links', 'rsvp_advanced', 'Burst Protection', 'RSVP Advanced', 1),
-- NEW: Per-tenant phone normalization
('default_phone_country', 'GB', 'Default country for phone normalization', 'rsvp_advanced', 'Default Phone Country', 'RSVP Advanced', 2)
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

4.1 API Response Format (Use Existing Patterns)
```typescript
// ✅ Existing API patterns already established across 70+ routes
// All RSVP endpoints will follow the same established patterns:

// Standard response format (already used throughout codebase)
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

4.3 Cache Integration (Multi-Tenant Cache Tags)
```typescript
// src/lib/cache/constants.ts - ADD TO EXISTING
export const CACHE_TAGS = {
  // ... existing tags
  RSVP_MATCH: (tenantId: string, mid: number) => `RSVP_MATCH:${tenantId}:${mid}`,
  PLAYER_POOL: (tenantId: string, mid: number) => `PLAYER_POOL:${tenantId}:${mid}`,
};

// src/lib/cache.ts
import { revalidateTag } from 'next/cache';
export async function revalidateRsvp(tenantId: string, matchId: number) {
  await Promise.allSettled([
    revalidateTag(CACHE_TAGS.UPCOMING_MATCH),
    revalidateTag(CACHE_TAGS.RSVP_MATCH(tenantId, matchId)),
    revalidateTag(CACHE_TAGS.PLAYER_POOL(tenantId, matchId)),
  ]);
}
```

4.4 Transaction Patterns (Use Existing Multi-Tenant Advisory Locks)
```typescript
// ✅ Multi-tenant advisory locks already implemented in src/lib/tenantLocks.ts
import { withTenantMatchLock } from '@/lib/tenantLocks';

// Use existing tenant-aware locks for all RSVP operations
export async function processRSVPResponse<T>(
  tenantId: string, 
  matchId: number, 
  operation: (tx: typeof prisma) => Promise<T>
) {
  return withTenantMatchLock(tenantId, matchId, operation);
}

// ✅ Current implementation already handles:
// - Tenant-scoped advisory locks
// - Hash-based lock keys for tenant isolation
// - Automatic transaction management
// - Proper lock cleanup
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
// src/middleware/rate.ts - Multi-tenant rate limiting
const buckets = new Map<string, { n: number; t: number }>();

export function burstGuard(tenantId: string, matchId: number, limit = 50, windowMs = 10_000) {
  const key = `tenant:${tenantId}:match:${matchId}`;
  const now = Date.now();
  const b = buckets.get(key) ?? { n: 0, t: now };
  if (now - b.t > windowMs) { b.n = 0; b.t = now; }
  b.n++; buckets.set(key, b);
  return b.n <= limit;
}

export function phoneRateLimit(tenantId: string, matchId: number, phone: string, limit = 10, windowMs = 60_000) {
  const key = `tenant:${tenantId}:match:${matchId}:phone:${phone}`;
  const now = Date.now();
  const b = buckets.get(key) ?? { n: 0, t: now };
  if (now - b.t > windowMs) { b.n = 0; b.t = now; }
  b.n++; buckets.set(key, b);
  return b.n <= limit;
}
```

4.7 Deep Link & Security

**Native Deep Link:** `capo://match/123`

**Invite Token Security:** `invite_token` is a 32+ byte URL-safe random value in URL; store `invite_token_hash` server-side; compare hash on request. Rotate on demand; auto-expire after match date.

**Multi-Tenant Rate Limits:**
- **Respond rate limit:** `tenant:{tenantId}:match:{matchId}:phone:{E164}` (10/min)
- **Burst protection:** `tenant:{tenantId}:match:{matchId}` (50 writes/10s, feature-flagged)
- **Token validation:** `tenant:{tenantId}:token:{tokenHash}` (50/hour per IP)
- **Token TTL:** Auto-expire at kickoff+24h; rotation invalidates old hash

4.3 RLS (Multi-Tenant Row Level Security)

**Enable RLS on all tables:**
```sql
-- Enable RLS and set tenant context
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies (example for players table)
CREATE POLICY tenant_isolation_players ON players
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Set tenant context at session start:
-- SELECT set_config('app.tenant_id', $1, false); -- where $1 = tenantId
```

**Access Control:**
- **Admins:** Full CRUD on RSVP for matches within their tenant
- **Players:** SELECT limited match info; SELECT/UPDATE only their own match_player_pool row within tenant
- **App booking:** Session provides phone and tenantId context, all writes tenant-scoped

4.8 SQL Deployment Convention

**All complex RSVP business logic must live in version-controlled SQL files.**

### What Belongs in `/sql/`

**Complex SQL functions with business logic:**
- Multi-table aggregations and joins
- State machine transitions with side effects
- Performance-critical bulk operations
- Complex eligibility/filtering logic

**File naming:** Use `rsvp_` prefix for all RSVP service functions
- Example: `rsvp_process_waitlist_cascade.sql`
- Example: `rsvp_calculate_notification_targets.sql`

**Deployment:** Via `deploy_all.ps1` PowerShell script which handles:
- SQL function deployment in dependency order
- Edge Function deployment via Supabase CLI
- Both local and production environments

### RSVP SQL Functions Required

Create these functions in `/sql/` (deployed via script):

1. **`rsvp_process_waitlist_cascade.sql`**
   - Expire unclaimed offers based on dynamic TTL
   - Auto-cascade to next 3 waitlist players
   - Complex eligibility rules (muted, caps, cooldowns)
   - Called by background worker every 5 minutes

2. **`rsvp_calculate_notification_targets.sql`**
   - Filter eligible players for notifications
   - Respect muted flags, per-player caps, cooldowns
   - Tier-based targeting logic
   - Returns player IDs for notification batching

3. **`rsvp_adjust_match_capacity.sql`**
   - LIFO demotion when capacity decreases
   - Atomic multi-row updates
   - Notification triggers for demoted players

### What Lives in Application Code

**Simple operations that don't need SQL functions:**
- Token generation/validation (bcrypt hashing)
- Rate limiting (in-memory or Redis)
- Simple CRUD (create invitation, update status)
- Phone normalization
- Session management

### Integration with Background Jobs

Background jobs call these SQL functions:
```typescript
// worker/src/jobs/waitlist-processor.ts
await prisma.$executeRaw`SELECT rsvp_process_waitlist_cascade(${tenantId}, ${matchId})`;
```

### Why This Pattern

**Benefits:**
- Cursor can maintain SQL logic alongside application code
- Version control tracks all business logic changes
- No hidden SQL functions in database
- Performance-critical operations stay in database layer
- Consistent with existing stats aggregation pattern

**Deployment Script Integration:**
```powershell
$sqlDeploymentOrder = @(
    "helpers.sql",
    # ... existing stats functions ...
    
    # RSVP service functions
    "rsvp_process_waitlist_cascade.sql",
    "rsvp_calculate_notification_targets.sql",
    "rsvp_adjust_match_capacity.sql"
)
```

5) API Surface (Following BerkoTNF Patterns)

**INTEGRATION WITH EXISTING APIs:**
- Extend existing `/api/admin/upcoming-matches` endpoints
- Use existing `/api/admin/match-player-pool` for RSVP data
- Follow established Prisma patterns and error handling
- Integrate with existing background job system

**AUTHENTICATION & RATE LIMITING (Multi-Tenant):**
- **Admin endpoints**: Require admin authentication + tenant scope validation
- **Public endpoints**: Multi-tenant rate limited for security
  - `/api/booking/respond`: `tenant:{tenantId}:match:{matchId}:phone:{E164}` (10/min)
  - **Burst protection**: `tenant:{tenantId}:match:{matchId}` (50 writes/10s)
- **Token security**: 
  - Raw token in URL, hashed storage in DB, tenant-scoped uniqueness
  - Auto-expire at kickoff+24h; rotation invalidates old hash
- **PII protection**: Never log full phone numbers, always mask in UI (+447******789)
- **Tenant isolation**: All Prisma queries must scope by `tenant_id`

5.1 Match RSVP Management (Admin)

**Enhanced admin endpoints with tenant scoping:**

```typescript
// GET /api/admin/upcoming-matches?matchId={id}&includeRsvp=true
// Returns match with RSVP data, invite mode, tier windows, booking status
// All queries scoped by tenant_id from admin session

// PATCH /api/admin/upcoming-matches/[id]/enable-booking
// Enables RSVP for a match, generates fresh invite_token (new token each time toggled ON)
{
  "inviteMode": "all" | "tiered",
  "tierWindows": {
    "a_open_at": "2024-01-15T10:00:00Z",      // Tier A
    "b_open_at": "2024-01-15T12:00:00Z",      // Tier B
    "c_open_at": "2024-01-15T14:00:00Z"       // Tier C
  },
  "autoBalance": {
    "enabled": true,
    "method": "performance" | "ability" | "random",
    "autoLockWhenFull": false
  }
}
// API enforces monotonicity (A ≤ B ≤ C), past time clamping, kick-off limits
// Auto-balance triggers only when capacity first reached or manual trigger

// POST /api/admin/invites/[matchId]/send
// Send tier-based invitations (tiered mode only)
{ "stages": ["A", "B", "C"], "targetCount": 20 }

// NEW: Activity feed
// GET /api/admin/matches/[id]/activity
// Returns last 200 events from notification_ledger, ORDER BY sent_at DESC, tenant-scoped
// Implementation:
// - Require admin auth + validate tenant access to match
// - Query: WHERE tenant_id = $1 AND upcoming_match_id = $2 ORDER BY sent_at DESC LIMIT 200
// - Response: { success: true, data: ActivityEvent[] }
// - Never include raw phone numbers or tokens in response

// NEW: Manual auto-balance trigger
// POST /api/admin/matches/[id]/autobalance
// Manually trigger auto-balance job (same logic as automatic trigger)
// Implementation:
// - Require admin auth + validate tenant access to match
// - Only allow if match.state = 'Draft' and match.auto_balance_enabled = true
// - Enqueue AUTO_BALANCE_PROCESSOR with tenant context
// - Response: { success: true, data: { jobId: string } } or error

// NEW: Waitlist management
// POST /api/admin/waitlist/reissue
{ "matchId": 123 }
// Immediately triggers waitlist offer logic (respects caps/muted)

// NEW: Grace period override
// POST /api/admin/dropout/process-now  
{ "matchId": 123, "playerId": 456 }
// Skip remaining grace period, finalize dropout, trigger offers
```

**SIMPLIFIED: No Complex Onboarding APIs**

```typescript
// These endpoints are NOT needed in the simplified version:
// - No profile claiming system
// - No join request approval flows  
// - No guest pass or smart invite mechanics
//
// Instead: Ringers are added directly by admin using existing "Add Player" modal
// If admin wants someone to self-serve later, they toggle is_ringer=false
```

5.2 App-Only Booking Interface

**Core RSVP endpoints (app-authenticated via Supabase):**

```typescript
// POST /api/booking/respond
// Uses Supabase session from auth spec
export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  // Session includes phone from Supabase phone provider
  const playerPhone = session.user.phone;
  const tenantId = session.user.app_metadata?.tenant_id;
  
  if (!playerPhone || !tenantId) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  }
  
  const { matchId, action, outFlexible } = await request.json();
  
  // Process RSVP with authenticated player context
  await processRSVP(tenantId, matchId, playerPhone, action, outFlexible);
  
  // Response includes:
  // - Updated match status
  // - Player's current RSVP status
  // - Waitlist position (if applicable)
}

// POST /api/booking/waitlist/claim
// Uses requirePlayerAccess helper from auth spec
export async function POST(request: NextRequest) {
  const { user, player, tenantId } = await requirePlayerAccess(request);
  const { matchId } = await request.json();
  
  // Use withTenantMatchLock for race safety
  await withTenantMatchLock(tenantId, matchId, async (tx) => {
    // SELECT ... FOR UPDATE to prevent double-claims
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
    
    if (!offer) {
      throw new Error('No valid offer found');
    }
    
    // Claim the spot
    await claimWaitlistSpot(tx, tenantId, matchId, player.phone);
  });
}

// GET /api/booking/match/[id]/status
// Returns current match status for authenticated player
export async function GET(request: NextRequest) {
  const { user, player, tenantId } = await requirePlayerAccess(request);
  
  // Returns:
  // - Match capacity and current count
  // - Player's RSVP status
  // - Waitlist position and offer status
}
```

**Note:** All API routes use Supabase session helpers from auth spec (`requirePlayerAccess`, `requireAuth`).

5.3 Background Job Integration (Simplified)

**Extend existing background job system:**

```typescript
// Use existing /api/admin/enqueue-stats-job endpoint
// Add new job types to existing worker:

// Simplified background jobs run on existing Render worker:
// - tier_open_notifications
// - dropout_grace_processor  
// - waitlist_offer_processor
// - notification_batcher
// - auto_balance_processor (NEW: triggers automatic team balancing when capacity reached)
// 
// REMOVED:
// - pending_hold_processor (no longer needed)
// - join_request_notifier (no longer needed)
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

5.5 Calendar Integration (Minimal ICS Implementation)

```typescript
// GET /api/calendar/match/[id].ics?token={token}
// Generate minimal .ics calendar file for match reminders
// After tenant+token validation, return minimal ICS (UTC, no alarms)

// Implementation:
export function toIcs(dtUtc: Date): string {
  return dtUtc.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Response:
// Content-Type: text/calendar
// Content-Disposition: attachment; filename="match-${id}.ics"
// Body: Minimal VEVENT with DTSTART, DTEND, SUMMARY, LOCATION
```

6) Notifications (Enhanced Push System)
6.1 Triggers

**Player Notifications:**
- Tier open → push to that tier: "Booking open. ✅ IN | ❌ OUT"
- Waitlist offer (after 5-min grace) → push top-3 with TTL
- Last-call (near kickoff if short) → push likely responders
- Cancellation → push to confirmed + waitlist
- **NEW**: Teams released (auto-balance) → push to participants only: "Teams released for Sunday's match!"

**Admin Notifications:**
- **FUTURE**: Payment failed → push to admins: "Payment failed for confirmed booking"

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
// - Player lists with status badges (IN/OUT/WAITLIST)
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
// Activity kinds with display mapping:
//   invite → "📣 Tier opened / invite sent"
//   waitlist_offer → "🎯 Waitlist offer issued"  
//   waitlist_offer_claimed → "✅ Offer claimed by {player}"
//   last_call → "⚡ Last-call sent"
//   cancellation → "🛑 Match cancelled notice sent"
//   audit/admin_add_player → "👤 Admin added {player}"
//   audit/admin_remove_player → "➖ Admin removed {player}"
//   audit/admin_capacity_change → "📏 Capacity changed {old}→{new}"
//   autobalance.balanced → "⚖️ Teams auto-balanced"
//   teams.published → "📝 Teams published"

// src/components/admin/matches/PlayerTierManager.component.tsx
// Manage player tiers (A/B/C)
// Integrates with existing player management
// Include tooltip: "Tier C = casual/default. All players start here unless assigned A or B."
```

8.2 Capacitor Mobile App

**New Mobile Components:**

```typescript
// UPDATED: Unified RSVP components
// src/app/player/upcoming/match/[id]/page.tsx
// Unified RSVP page for all users (app, web, logged-in)
// Uses existing MainLayout.layout.tsx

// src/components/rsvp/RSVPInterface.component.tsx
// One-tap IN/OUT/WAITLIST buttons
// Waitlist offer banner with countdown
// Deep-link handling from WhatsApp/SMS
// Context-aware: phone entry for web users, skip for app users

// src/components/rsvp/CalendarIntegration.component.tsx
// Add to calendar functionality
// Optional .ics file generation
```

8.3 Public Web Landing

**Minimal Web Interface:**

```typescript
// App-only RSVP interface
// All users use native Capacitor app: capo://match/123
// - Authenticated users: Immediate RSVP access
// - New users: SMS verification flow first
// - Ringer users: Admin adds them manually (no self-booking)
```

9) Background Jobs (Enhanced Render Worker Integration)

**✅ EXTEND EXISTING MULTI-TENANT BACKGROUND JOB SYSTEM:**
- ✅ Use existing `background_job_status` table (already has tenant_id)
- ✅ Integrate with current Render worker infrastructure (already tenant-aware)
- ✅ Follow established job patterns and error handling (already tenant-scoped)
- ✅ All 11 existing SQL functions already accept target_tenant_id parameters
- Add new RSVP job types to existing worker
- **NEW**: RSVP-specific reliability with concurrency protection and idempotency

**Simplified Job Types:**

```typescript
// worker/src/jobs/rsvp-jobs.ts
// Extends existing job processing system

export const RSVP_JOB_TYPES = {
  TIER_OPEN_NOTIFICATIONS: 'tier_open_notifications',
  DROPOUT_GRACE_PROCESSOR: 'dropout_grace_processor', 
  WAITLIST_OFFER_PROCESSOR: 'waitlist_offer_processor',
  NOTIFICATION_BATCHER: 'notification_batcher',
  AUTO_BALANCE_PROCESSOR: 'auto_balance_processor'
} as const;

// REMOVED: 
// - PENDING_HOLD_PROCESSOR (no pending holds)
// - JOIN_REQUEST_NOTIFIER (no approval flows)
```

**Tenant Context Pattern (Critical for All Jobs):**

```typescript
// All job processors MUST set tenant context before any database operations
async function processJob(job: JobData) {
  const { tenant_id } = job.payload;
  
  if (!tenant_id) {
    throw new Error('Job missing required tenant_id in payload');
  }
  
  // Set RLS context for all subsequent queries
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant_id}, false)`;
  
  // Now process job with tenant-scoped queries
  await processAutoBalance(job.matchId);
}

// Example: Enqueueing a job with tenant context
const jobPayload = {
  tenant_id: tenantId,        // REQUIRED for all jobs
  job_type: 'auto_balance',
  match_id: matchId,
  triggered_by: 'capacity_reached'
};

await prisma.background_job_status.create({
  data: {
    tenant_id: tenantId,      // REQUIRED in job record
    job_payload: jobPayload,
    status: 'queued'
  }
});
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
// - Enhanced logging: 
//   - When issuing offers: notification_ledger(kind='waitlist_offer', batch_key='offer:<tenantId>:<matchId>:<runId>', details='positions:[p1,p2,p3]')
//   - On claim: notification_ledger(kind='waitlist_offer_claimed', batch_key='offer:<tenantId>:<matchId>:<runId>', player_id=<claimantId>)
// - All targeting queries include AND muted=false

// notification_batcher
// - Teams released: Send only to participants + waitlist (not entire roster)
// - Cancellation: Send to ALL confirmed + waitlist players (including ringers) - always immediate
// - Respect notification caps (max 3 dropout/last-call per player per match)
// - All targeting queries include AND muted=false
// - Worker prunes tokens on permanent errors (invalid/expired FCM tokens)
// - Log token removal to notification_ledger (kind='push_token_removed') for observability
// - Emit: notification_ledger(kind='teams.published') when teams are published

// auto_balance_processor (NEW - STRICT TRIGGERS)
// - Triggered when match first reaches capacity (confirmed IN count >= match.capacity) OR manual admin trigger
// - Use withTenantMatchLock(tenantId, matchId) for concurrency protection
// - Idempotency: check if already processed (is_balanced=true)
// - Only process if auto_balance_enabled=true and match.state='Draft'
// - State handling:
//   - If auto_lock_when_full=false (default): Keep state='Draft', just balance and publish teams
//   - If auto_lock_when_full=true: Lock → Balance → state='TeamsBalanced'
// - Flow: balanceTeams → publishTeams → sendTeamsReleasedNotification
// - Job deduplication via match state version + tenant scoping
// - Uses explicit match.capacity field (not team_size*2 inference)
// - Tenant context: Set app.tenant_id for RLS compliance
// - Emit: notification_ledger(kind='autobalance.balanced') on success
// - Emit: notification_ledger(kind='teams.published') when teams become visible

// last_call_processor (NEW - FIXED WINDOWS)
// - Runs every 5-10 minutes via cron
// - Find matches with kickoff within [12h±5m] and last_call_12_sent_at IS NULL
// - Find matches with kickoff within [3h±5m] and last_call_3_sent_at IS NULL
// - Compute shortfall (capacity - IN_count). If shortfall > 0:
//   - Target: unresponded + OUT with out_flexible=true
//   - Exclude: muted=true, per-player cap/cooldown from notification_ledger
// - Send push via notifier; write notification_ledger(kind='last_call', batch_key='t12'|'t3')
// - Set last_call_12_sent_at or last_call_3_sent_at timestamp for idempotency
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

12) Transactions & Concurrency (Multi-Tenant & Race-Safe)

**✅ All booking/claim operations** use existing `withTenantMatchLock(tenantId, matchId)` pattern.

**✅ Tenant scoping:** Follow established pattern - every RSVP query includes `tenant_id` in WHERE clauses and sets RLS context. Public routes derive `tenantId` from `(upcoming_match_id, invite_token_hash)` and use existing `prisma.$executeRaw\`SELECT set_config('app.tenant_id', ${tenantId}, false)\`` pattern.

**Phone normalization:** Server-side E.164 normalization runs on all public booking endpoints; reject invalid; never log full numbers (mask as +447******789).

**Waitlist claim/IN/OUT transitions** use `SELECT ... FOR UPDATE` on pool rows to prevent double-claims.

**Offer TTL calculation** must clamp to kickoff−15m; <15m switches to instant claim (no hold). Minimum 5min applies only when not in instant mode. **Token TTL:** Links expire at kickoff+24h with friendly "link expired" copy.

**Drop-out grace period** (5m/2m/1m) cancels if player returns to IN during grace.

**Auto-balance triggers** when IN count first reaches capacity (not on every IN/OUT toggle) or via admin manual trigger. Uses existing tenant-aware advisory locks.

**Ringer blocking:** Public booking respects `enable_ringer_self_book=false`; ringers can't IN/WAITLIST, show friendly block message.

**✅ Background jobs** use existing tenant-scoped infrastructure and are idempotent with batch_key scoping.

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

Unknown number (global block_unknown_players=true - DEFAULT):
"This number isn't registered with this club. Please ask the organiser to add you."

Unknown number (global block_unknown_players=false - OPTIONAL):
"Enter your name to join the list:"
[Show name input: max 14 characters, real-time validation]
**Note:** Default is `block_unknown_players=true`; the unknown-player UI appears only when this is disabled.

Name validation errors:
"Use 14 characters or fewer" | "That name's already taken — try another"

Shared phone blocked:
"This number is already linked to another player. Ask the organiser to help."

Offer expired/capacity unavailable:
"This offer has expired — check the waitlist for your current place."

Too early (tiered mode):
"Too early — Tier {tierLabel} opens at {time}. The IN button will appear here 👍"

Rate limited:
"Too many attempts. Please wait a moment and try again."

Public page banner when <15min to kick-off:
"Kick-off soon — spots are first-come, first-served." (instant claim mode)

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

20) Enhanced Implementation Roadmap & Deliverables

**PHASE 1: Database & Core Backend (Week 1-2)**
- [ ] **Simplified database migrations** (extend existing tables, remove PENDING complexity)
- [ ] Update Prisma schema with new fields and relationships
- [ ] **Production reliability fixes**: indexes, constraints, concurrency protection
- [ ] Extend existing API endpoints for RSVP functionality
- [ ] **SIMPLIFIED**: Core booking API (IN/OUT/WAITLIST only)
- [ ] Feature flag integration with existing app_config system
- [ ] Token hashing security implementation

**PHASE 2: Background Jobs & Notifications (Week 2-3)**  
- [ ] Extend existing Render worker with RSVP job types
- [ ] **NEW**: Auto-balance processor with optional auto-lock
- [ ] Implement push notification system (FCM integration)
- [ ] Add enhanced notification ledger with audit trail
- [ ] Tier-based invitation processing
- [ ] Waitlist management and grace periods

**PHASE 3: Admin Interface (Week 3-4)**
- [ ] **Enhanced RSVPBookingPane** with source badges and removal warnings
- [ ] **SIMPLIFIED**: Auto-balance and auto-lock toggles in match creation
- [ ] **Enhanced**: RSVP Activity Feed with comprehensive event logging
- [ ] **SIMPLIFIED**: Use existing "Add Player" modal for ringers
- [ ] Integration with existing useMatchState hook

**PHASE 4: Unified RSVP Interface (Week 4-5)**
- [ ] **Enhanced `/player/upcoming` overview** with RSVP status cards
- [ ] **Unified RSVP experience**: `/player/upcoming/match/[id]?token=...` for all users
- [ ] Phone number capture and validation with E.164 normalization
- [ ] **Production**: Rate limiting, burst protection, and security
- [ ] Ringer access control (friendly blocking messages)

**PHASE 5: Polish & Testing (Week 5-6)**
- [ ] **Enhanced**: App installation tracking (passive monitoring)
- [ ] Calendar integration (.ics files)
- [ ] Ringer management UI polish (badges, quick actions)
- [ ] Name uniqueness handling (per-club or UI disambiguation)

**PHASE 6: Testing & Production Readiness (Week 6-7)**
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
- [ ] **End-to-End RSVP Flows (Simplified):**
  - [ ] Invite mode switching (All at once ↔ Tiered)
  - [ ] Tier window configuration and validation
  - [ ] Auto-balance and auto-lock behavior testing
  - [ ] Dynamic waitlist TTL behavior (4h/1h/30min based on time to kickoff)
  - [ ] Dynamic grace periods (5min/2min/1min based on time to kickoff)
  - [ ] Auto-cascade waitlist offers on expiry
  - [ ] Manual override buttons (Send new waitlist offers, Release spot now)
  - [ ] Adaptive last-call notifications (T-12h/T-3h)
  - [ ] Capacity management (increase/decrease with proper notifications)
  - [ ] Ringer access control (blocked with friendly message)
  - [ ] Ringer notification exclusion (skip ringers unless flag enabled)
  - [ ] Phone-based identity (one phone = one player, no duplicates)
  - [ ] Unknown player blocking (block_unknown_players=true by default)
  - [ ] OUT with flexibility option ("can sub late")
  - [ ] Instant claim mode (<15min to kick-off, no hold period)
  - [ ] Live polling updates (15s refresh for non-push users)
  - [ ] Token hashing security (no raw tokens stored)
  - [ ] Burst protection (50 writes/10s per match)
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

**SIMPLIFIED TECHNICAL REQUIREMENTS:**
- Node.js 18+ (existing requirement met)
- Firebase project for FCM push notifications  
- App Store / Google Play developer accounts (optional - for native app)
- Existing Render worker and Supabase infrastructure
- Phone validation library for E.164 normalization

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
**DECISION:** Native Capacitor app only (no web RSVP)
**RATIONALE:** Mobile-first experience with SMS authentication, push notifications built-in
**BENEFIT:** Better UX, simplified architecture, no public route complexity

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

---

## **21) Production Reliability & Security Enhancements**

### **21.1 Concurrency Protection**
```typescript
// All critical operations use tenant-aware advisory locks
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

### **21.2 Rate Limiting & Security**
```typescript
// API endpoint protection
// - Admin endpoints: Require admin auth
// - Public endpoints: Rate limited by phone/IP/token
// - Token security: Hashed storage, TTL enforcement
// - PII protection: Never log full phone numbers

// Multi-tenant rate limit implementation
const rateLimits = {
  bookingRespond: 'tenant:{tenantId}:match:{matchId}:phone:{E164} (10/min)',
  burstProtection: 'tenant:{tenantId}:match:{matchId} (50 writes/10s)',
  tokenValidation: 'tenant:{tenantId}:token:{tokenHash} (50/hour per IP)'
};

// Production: Back with Redis when REDIS_URL is set
// Development: In-memory Map (as implemented above)
const useRedis = !!process.env.REDIS_URL;
```

### **21.3 Data Integrity (Simplified)**
```sql
-- Critical performance indexes
CREATE INDEX IF NOT EXISTS idx_mpp_match_player
  ON match_player_pool(upcoming_match_id, player_id);

-- Unique token hashing
CREATE UNIQUE INDEX IF NOT EXISTS idx_upcoming_matches_invite_token_hash
  ON upcoming_matches(invite_token_hash);

-- Phone uniqueness (adjust based on tenant architecture)
-- Single-tenant: Global unique constraint (as shown in schema section)
-- Multi-tenant: Per-club unique constraint (see schema section for alternative)
```

### **21.4 Activity Feed & Audit Trail**
```typescript
// Simplified event tracking with PII protection
type ActivityEvent = 
  | 'player.marked_in' | 'player.marked_out' | 'player.marked_waitlist'
  | 'admin.add_player' | 'admin.remove_player' 
  | 'capacity.changed' | 'tier.opened'
  | 'offer.issued' | 'offer.claimed' | 'offer.expired'
  | 'autobalance.balanced' | 'teams.published';

// All events: {actor, source, before→after?, timestamp, matchId}
// Phone numbers always masked: +447******789
```

### **21.5 Error Handling & Copy**
```typescript
// Enhanced security error messages (multi-tenant aware)
const SECURITY_COPY = {
  phoneConflict: "This number is already linked to another player. Ask the organiser to help.",
  tokenExpired: "This link has expired. Ask the organiser for a new one.",
  rateLimited: "Too many attempts. Please wait a moment and try again.",
  unknownBlocked: "This number isn't registered with this club. Please ask the organiser to add you.",
  ringerBlocked: "Please ask the organiser to add you for this match.",
  tooEarly: "Too early — Tier {tierLabel} opens at {time}. The IN button will appear here 👍",
  offerExpired: "This offer has expired — check the waitlist for your current place.",
  kickoffSoon: "Kick-off soon — spots are first-come, first-served."
};
```

---

## **22) Future Problems Documentation**

**NEW FILE:** `docs/FUTURE_PROBLEMS.md`

```markdown
# Future Technical Debt & Scaling Challenges

## Multi-League Identity
**Problem**: Player in multiple Capo leagues with same phone number
**Current**: Each instance separate (works fine for new product)
**Future Solution**: Cross-instance identity service when needed
**Priority**: Low (unlikely scenario initially)

## Payment Authorization Timing
**Problem**: How long can we hold payment auth for confirmed bookings?
**Current**: Payment auth on confirmation only (no pending holds)
**Constraint**: Stripe auth holds expire after 7 days (plenty of time)
**Future**: May need immediate auth for high-demand matches

## Profile Name Conflicts
**Problem**: Multiple players with same display name
**Current**: 14-char limit forces unique-ish names
**Future**: May need surname initials or numbers (John S., John M.)

## Bulk Operations
**Problem**: Admin managing 100+ player leagues
**Current**: One-by-one approval workflow
**Future**: Bulk approval tools, CSV import/export

## Cross-Platform Notifications
**Problem**: Ensuring all admins get critical notifications
**Current**: Push to mobile app only
**Future**: Email fallback, SMS backup, web notifications
```

---

## **23) Technical Requirements & Dependencies**

### **23.1 New Dependencies**
- **Firebase Admin SDK**: For push notifications (FCM)
- **Phone validation library**: For E.164 normalization
- **Rate limiting middleware**: For API protection

### **23.2 Infrastructure Requirements**
- **Firebase project**: FCM push notification setup
- **App Store/Google Play**: For mobile app distribution
- **Webhook endpoints**: For real-time admin notifications
- **Background job scaling**: Enhanced worker capacity

### **23.3 Security Requirements**
- **Token hashing**: Never store raw tokens in database
- **PII masking**: Phone numbers always masked in logs/UI
- **Rate limiting**: Per-IP, per-phone, per-token limits
- **Admin authentication**: All admin endpoints protected

---

## **24) Multi-Tenant Database Migration Summary**

### **24.1 Fields to Remove**
```sql
-- Remove PENDING-related fields from match_player_pool
ALTER TABLE match_player_pool
  DROP COLUMN IF EXISTS pending_expires_at,
  DROP COLUMN IF EXISTS payment_intent_id,
  DROP COLUMN IF EXISTS payment_status;

-- Remove tables that are no longer needed
DROP TABLE IF EXISTS join_requests CASCADE;
DROP TABLE IF EXISTS claim_tokens CASCADE;

-- Remove old single-tenant indexes
DROP INDEX IF EXISTS idx_players_phone_unique;
DROP INDEX IF EXISTS idx_upcoming_matches_invite_token_hash;
```

### **24.2 Multi-Tenant Fields to Add**
```sql
-- Add tenant_id to all tables (backfill strategy)
-- Step 1: Add as nullable
ALTER TABLE players ADD COLUMN tenant_id UUID;
ALTER TABLE upcoming_matches ADD COLUMN tenant_id UUID;
ALTER TABLE match_player_pool ADD COLUMN tenant_id UUID;
ALTER TABLE background_job_status ADD COLUMN tenant_id UUID;

-- Step 2: Backfill existing rows with a default tenant_id
-- UPDATE players SET tenant_id = 'your-default-tenant-uuid' WHERE tenant_id IS NULL;
-- (Repeat for all tables)

-- Step 3: Set NOT NULL after backfill
ALTER TABLE players ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE upcoming_matches ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE match_player_pool ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE background_job_status ALTER COLUMN tenant_id SET NOT NULL;

-- Add RSVP fields to upcoming_matches
ALTER TABLE upcoming_matches
  ADD COLUMN booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN invite_token_hash TEXT,
  ADD COLUMN invite_token_created_at TIMESTAMPTZ NULL,
  ADD COLUMN a_open_at TIMESTAMPTZ NULL,
  ADD COLUMN b_open_at TIMESTAMPTZ NULL,
  ADD COLUMN c_open_at TIMESTAMPTZ NULL,
  ADD COLUMN match_timezone TEXT NOT NULL DEFAULT 'Europe/London',
  ADD COLUMN capacity INT NULL,
  ADD COLUMN auto_balance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN auto_balance_method TEXT NOT NULL DEFAULT 'performance',
  ADD COLUMN auto_lock_when_full BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN last_call_12_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN last_call_3_sent_at TIMESTAMPTZ NULL;

-- Add RSVP fields to match_player_pool
ALTER TABLE match_player_pool
  ADD COLUMN invited_at TIMESTAMPTZ NULL,
  ADD COLUMN invite_stage TEXT NULL,
  ADD COLUMN reminder_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN muted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN out_flexible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN waitlist_position INTEGER NULL,
  ADD COLUMN offer_expires_at TIMESTAMPTZ NULL,
  ADD COLUMN source TEXT NULL;

-- Add phone and tier to players
ALTER TABLE players
  ADD COLUMN phone TEXT,
  ADD COLUMN tier TEXT NOT NULL DEFAULT 'C' CHECK (tier IN ('A','B','C'));
```

### **24.3 Multi-Tenant Constraints & Indexes**
```sql
-- Multi-tenant unique constraints (add CONCURRENTLY for large tables)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_players_tenant_phone 
  ON players (tenant_id, phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_upcoming_matches_tenant_token_hash
  ON upcoming_matches(tenant_id, invite_token_hash) WHERE invite_token_hash IS NOT NULL;
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_mpp_tenant_waitpos_per_match
  ON match_player_pool (tenant_id, upcoming_match_id, waitlist_position)
  WHERE response_status = 'WAITLIST' AND waitlist_position IS NOT NULL;

-- Multi-tenant performance indexes (tenant_id first)
CREATE INDEX IF NOT EXISTS idx_players_tenant_phone ON players(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_mpp_tenant_match_status
  ON match_player_pool(tenant_id, upcoming_match_id, response_status);
CREATE INDEX IF NOT EXISTS idx_notif_ledger_tenant_kind
  ON notification_ledger(tenant_id, kind, sent_at DESC);

-- Data integrity constraints
ALTER TABLE players ADD CONSTRAINT valid_e164_phone 
  CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{7,14}$');
ALTER TABLE match_player_pool ADD CONSTRAINT offer_expiry_only_for_waitlist
  CHECK (offer_expires_at IS NULL OR response_status='WAITLIST');
```

### **24.4 Row Level Security Setup**
```sql
-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policies
CREATE POLICY tenant_isolation_players ON players
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_upcoming_matches ON upcoming_matches
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
-- (Repeat for all tables)

-- Worker/service account RLS handling
-- Option 1: BYPASS RLS for worker accounts
-- Option 2: SET app.tenant_id per job run (recommended)
-- Workers should set tenant context: SELECT set_config('app.tenant_id', $1, false);
```

### **24.5 Prisma Schema Multi-Tenant Updates**
```prisma
// Mirror multi-tenant constraints in Prisma schema
model players {
  player_id   Int     @id @default(autoincrement())
  tenant_id   String  @db.Uuid
  phone       String?
  tier        String  @default("C")
  is_ringer   Boolean @default(false)
  // ... existing fields
  
  @@unique([tenant_id, phone], map: "uniq_players_tenant_phone", where: { phone: { not: null } })
  @@index([tenant_id, phone], map: "idx_players_tenant_phone")
  @@index([tenant_id, tier], map: "idx_players_tenant_tier")
  @@index([tenant_id, is_ringer], map: "idx_players_tenant_ringer")
}

model upcoming_matches {
  upcoming_match_id        Int      @id @default(autoincrement())
  tenant_id               String   @db.Uuid
  invite_token_hash       String?
  capacity                Int?
  auto_balance_enabled    Boolean  @default(true)
  auto_lock_when_full     Boolean  @default(false)
  // ... existing fields
  
  @@unique([tenant_id, invite_token_hash], map: "uniq_upcoming_matches_tenant_token_hash", where: { invite_token_hash: { not: null } })
  @@index([tenant_id, a_open_at, b_open_at, c_open_at], map: "idx_upcoming_matches_tenant_tier_opens")
}

model match_player_pool {
  id                 Int      @id @default(autoincrement())
  tenant_id         String   @db.Uuid
  upcoming_match_id Int
  player_id         Int
  response_status   String   @default("PENDING")
  waitlist_position Int?
  source            String?  // 'app'|'web'|'admin'
  // ... other RSVP fields
  
  @@unique([tenant_id, upcoming_match_id, player_id], map: "uniq_mpp_tenant_player_match")
  @@unique([tenant_id, upcoming_match_id, waitlist_position], map: "uniq_mpp_tenant_waitpos_per_match", where: { response_status: "WAITLIST", waitlist_position: { not: null } })
  @@index([tenant_id, upcoming_match_id, response_status], map: "idx_mpp_tenant_match_status")
}
```

---

## **25) Complete Endpoint Summary & Acceptance Criteria**

### **25.1 New API Endpoints Added**

```typescript
// Admin endpoints (tenant-scoped)
GET  /api/admin/matches/[id]/activity          // Activity feed (last 200 events)
POST /api/admin/matches/[id]/autobalance      // Manual auto-balance trigger
POST /api/admin/waitlist/reissue              // Manual waitlist offer trigger  
POST /api/admin/dropout/process-now           // Grace period override

// Public endpoints (tenant-derived from token)
GET  /api/booking/match/[id]?token={token}    // Match details for RSVP
POST /api/booking/respond                     // Enhanced RSVP with full security
POST /api/booking/waitlist/claim              // Claim waitlist offer
GET  /api/booking/match/[id]/live             // Live status updates (15s polling)
GET  /api/calendar/match/[id].ics?token={token} // Minimal ICS calendar file

// Push notification endpoints
POST /api/push/register                       // Register FCM token
DELETE /api/push/register                     // Unregister FCM token
POST /api/push/send                           // Internal push sending
POST /api/push/test                           // Admin test notifications
```

### **25.2 Enhanced Background Jobs**

```typescript
// Updated job types with tenant scoping
export const RSVP_JOB_TYPES = {
  TIER_OPEN_NOTIFICATIONS: 'tier_open_notifications',
  DROPOUT_GRACE_PROCESSOR: 'dropout_grace_processor', 
  WAITLIST_OFFER_PROCESSOR: 'waitlist_offer_processor',
  NOTIFICATION_BATCHER: 'notification_batcher',
  AUTO_BALANCE_PROCESSOR: 'auto_balance_processor',
  LAST_CALL_PROCESSOR: 'last_call_processor'  // NEW: Fixed T-12h/T-3h windows
} as const;
```

### **25.3 UI Components Added**

```typescript
// Match Control Centre enhancements
<ActivityFeed events={activityEvents} />              // Below RSVP pane
<Button onClick={triggerAutoBalance}>Auto-balance now</Button>  // Visible in Draft

// Activity feed displays (no filters, lean UI)
interface ActivityEvent {
  timestamp: Date;
  kind: string;
  actorName: string;   // Masked phone for players
  source: 'app' | 'web' | 'admin';
  details?: string;
}
```

### **25.4 Acceptance Criteria**

**✅ Auto-Balance Behavior:**
- [ ] Reaching capacity triggers auto-balance job exactly once (idempotent under concurrency)
- [ ] Manual "Auto-balance now" button works in Draft state
- [ ] Does NOT re-balance on every IN/OUT toggle (only first capacity reach or manual)
- [ ] Emits `autobalance.balanced` and `teams.published` to activity feed

**✅ Activity Feed:**
- [ ] Shows recent events in reverse chronological order
- [ ] Includes: invite, last_call (t12/t3), waitlist_offer, waitlist_offer_claimed, admin add/remove, capacity changes
- [ ] No filters/search (lean UI)
- [ ] Pulls from notification_ledger with tenant scoping

**✅ Fixed Last-Call Windows:**
- [ ] T-12h last-call fires only once (uses `last_call_12_sent_at` timestamp)
- [ ] T-3h last-call fires only once (uses `last_call_3_sent_at` timestamp)  
- [ ] Respects `muted=false`, caps/cooldowns
- [ ] Logs `last_call` per batch to notification_ledger

**✅ Waitlist Offer Logging:**
- [ ] Offer issuance logged with batch_key and position details
- [ ] Claim logged with batch_key and claimant player_id
- [ ] Activity feed reflects both issued and claimed events

**✅ Multi-Tenant Security:**
- [ ] All Prisma queries include tenant_id scoping
- [ ] Public endpoints derive tenantId from token, don't trust client
- [ ] Rate limiting uses tenant-scoped keys
- [ ] Phone normalization runs server-side with E.164 validation
- [ ] PII masking in all logs and UI

**✅ Lightweight Focused Tests:**
- [ ] **Idempotent auto-balance:** Double-trigger protection works
- [ ] **Last-call single-fire:** T-12h/T-3h timestamps prevent duplicates
- [ ] **Offer issuance → claim:** Both events appear in activity feed
- [ ] **Ringer block enforcement:** Public endpoints reject with friendly message
- [ ] **Token TTL enforcement:** Expired tokens rejected with friendly copy
- [ ] **Tenant isolation:** Two tenants with same phone/match IDs don't collide
- [ ] **Advisory lock isolation:** Tenant-aware locks prevent cross-tenant blocking

**✅ ICS Calendar:**
- [ ] Returns valid single-event .ics file
- [ ] Minimal implementation (UTC, no alarms)
- [ ] Proper Content-Type and filename headers

**✅ Ringer & Access Control:**
- [ ] Public booking respects ringer blocking with friendly message
- [ ] Unknown player blocking with club-specific copy
- [ ] Token TTL enforcement with friendly expiry message

## **26) Production Testing Checklist**

### **26.1 Multi-Tenant Isolation Tests**
- [ ] **Tenant data isolation:** Two tenants with identical phone numbers don't collide
- [ ] **Token uniqueness:** Same token hash across tenants works independently  
- [ ] **Rate limiting:** Tenant-scoped rate limits don't affect other tenants
- [ ] **RLS policies:** Users can only access their tenant's data

### **26.2 Capacity & Waitlist Correctness**
- [ ] **Capacity downshift:** When capacity drops, most-recent IN players move to WAITLIST (LIFO)
- [ ] **Concurrent claims:** Multiple waitlist offers, first to claim wins, others see "spot filled"
- [ ] **Grace period cancellation:** Player returns to IN during grace, waitlist offers cancelled
- [ ] **Offer TTL clamping:** Offers expire at kickoff−15m, switch to instant claim <15m

### **26.3 Auto-Balance Idempotency**
- [ ] **Capacity threshold:** Auto-balance triggers when IN count >= capacity
- [ ] **NO re-balance on changes:** Does NOT re-balance on every IN/OUT toggle (strict trigger only)
- [ ] **Auto-lock behavior:** Only locks if `auto_lock_when_full=true` (default false)
- [ ] **Concurrent protection:** `withMatchLock` prevents double-processing

### **26.4 Ringer Access Control**
- [ ] **Ringer blocking:** `is_ringer=true` + `enable_ringer_self_book=false` blocks with friendly message
- [ ] **Admin addition:** Ringers show 👤 Admin badge, count toward capacity
- [ ] **Notification exclusion:** Ringers don't get invite/last-call pushes (default)
- [ ] **Transactional pushes:** Ringers DO get teams released, cancellation when participating

### **26.5 Token Security & Rotation**
- [ ] **Hash comparison:** Raw token in URL, hash stored in DB, secure comparison
- [ ] **Token rotation:** Disabling/re-enabling RSVP invalidates old links
- [ ] **TTL enforcement:** Tokens auto-expire at kickoff+24h
- [ ] **Multi-tenant uniqueness:** Token hashes unique per tenant

---

---

## **27) Final Implementation Summary**

### **27.1 Complete Feature Set**
This **production-ready multi-tenant specification** delivers:

✅ **Multi-Tenant SaaS Architecture** with proper data isolation, RLS, and tenant-aware advisory locks  
✅ **Streamlined RSVP System** with unified `/player/upcoming/match/[id]?token=...` experience  
✅ **Strict Auto-Balance Triggers** (capacity reached OR manual) with optional auto-lock  
✅ **Admin-Only Ringer Management** using existing "Add Player" modal  
✅ **Real-Time Activity Feed** with comprehensive event tracking and emoji display  
✅ **Fixed Last-Call Windows** (T-12h/T-3h) with timestamp-based idempotency  
✅ **Enhanced Waitlist System** with offer logging and batch tracking  
✅ **Production Security** with token hashing, rate limiting, and tenant isolation  
✅ **WhatsApp-Simple Workflow** without complex approval flows  

### **27.2 Database Changes Summary**
- **6 tables enhanced** with tenant_id and RSVP fields
- **3 new tables** (match_invites, notification_ledger, push_tokens)
- **20+ new indexes** optimized for multi-tenant queries
- **FK integrity triggers** preventing cross-tenant data corruption
- **RLS policies** for complete tenant isolation

### **27.3 API Surface Complete**
- **10 new endpoints** (5 admin, 5 public)
- **6 enhanced background jobs** with tenant scoping
- **Complete security** (token derivation, rate limiting, PII protection)
- **Backward compatibility** maintained throughout

### **27.4 UI Components Added**
- **ActivityFeed.component.tsx** (minimal, no filters)
- **Auto-balance button** in Match Control Centre
- **Enhanced removal modals** with waitlist context
- **Source badges** (📱 App, 🌐 Web, 👤 Admin, 🎯 Ringer)

### **27.5 Production Readiness**
- **Multi-tenant advisory locks** prevent cross-tenant collisions
- **Safe backfill strategy** for zero-downtime migration
- **Redis-backed rate limiting** for production scale
- **Comprehensive testing criteria** for all critical paths
- **Complete error handling** with friendly user messages

The phased approach allows for incremental development and testing, with each phase building on the previous one while maintaining backward compatibility and focusing on core RSVP functionality with enterprise-grade multi-tenancy and production reliability.

