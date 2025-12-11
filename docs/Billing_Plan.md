# Payments Specification

**Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Draft – to be implemented *after RSVP*  
**Dependencies:**  
- RSVP system (sessions, attendance, teams)  
- Seasons (for stats/story only)  
- Stripe Connect **Standard**  
- Existing auth / player model  

---

## Overview

Add integrated payments for casual football groups with:

- **Per-game fees** – players pay for individual sessions  
- **Season passes** – players prepay for a block/season  
- **Tiers** – different price levels within a season/pass (e.g. core vs subs, student, keeper, etc.)

**Key principles:**

1. **Stripe-first, Capo-never-holds-money**  
   - Use Stripe Connect **Standard**; clubs/organisers are merchants of record.  
   - Stripe handles KYC, payouts, refunds, chargebacks.  
   - Capo only orchestrates charges and records “who has paid”.

2. **Decouple seasons from payments**  
   - Seasons = stats, streaks, narrative.  
   - Payments = per-session charges + passes.  
   - Passes may *reference* seasons for admin UX, but logic is “does this pass cover this session?”, not “this season implies payment”.

3. **Apple-esque UX**  
   - One clear "Payments" section for organisers.  
   - Simple wording: “Turn on payments”, “Set match fee”, “Create season pass”, “Request payments”.  
   - Never show Stripe jargon (Connect, application_fee_amount, etc.) to admins.

4. **Low admin overhead**  
   - Payments flow from RSVP → “who actually played” → “who owes money”.  
   - Help organisers avoid spreadsheets and cash.  
   - Manual overrides always possible (mark as paid / write-off / cash).

---

## Table of Contents

1. [Payment Models](#1-payment-models)  
2. [Concepts & Terminology](#2-concepts--terminology)  
3. [Stripe Connect Integration](#3-stripe-connect-integration)  
4. [Admin Payments UX](#4-admin-payments-ux)  
5. [Player Payments UX](#5-player-payments-ux)  
6. [Integration with RSVP & Seasons](#6-integration-with-rsvp--seasons)  
7. [Emails & Notifications](#7-emails--notifications)  
8. [Database Schema](#8-database-schema)  
9. [API Routes](#9-api-routes)  
10. [Stripe Webhooks](#10-stripe-webhooks)  
11. [Edge Cases & Rules](#11-edge-cases--rules)  
12. [Implementation Order](#12-implementation-order)  
13. [Acceptance Criteria](#13-acceptance-criteria)  

---

## 1. Payment Models

### 1.1 Per-Game Payments (Pay-Per-Play)

- Enabled **per session** (game).  
- Organiser sets a **match fee** (e.g. £6).  
- Players who attend that session owe that amount (unless covered by a pass).  
- Capo skims a configurable fee (e.g. £0.50) via Stripe application fees.

Usage:

- Typical weekly 5/6/7-a-side where players pay per game.
- Works with RSVP: only those that actually played are charged/requested.

---

### 1.2 Season Passes

- One-time payment that covers multiple sessions.  
- Each pass defines **what it covers**, e.g.:

  - All Wednesday games between `start_date` and `end_date`.  
  - Up to N sessions in a date range.  
  - Only sessions tagged with a certain label (e.g. “League Nights”).

- For simplicity in v1:
  - **Required fields**: name, price, currency, valid_from, valid_to.  
  - **Optional fields**: max_sessions (null = unlimited), notes, linked_season_id (for admin grouping only).

---

### 1.3 Tiers

- Passes can be tiered, e.g:

  - “Full Season” – £100  
  - “Half Season (subs)” – £60  
  - “Keeper” – £30  

- Implementation: tiers are just **different passes** in the same group, optionally grouped as "Season X passes".

- Per-game fees and passes can coexist:
  - Pass holders: owed £0 for covered sessions.  
  - Non-pass: charged per game.

---

## 2. Concepts & Terminology

**Group** – Casual footy group / squad (Capo’s existing unit).  
**Session** – Single football event (RSVP unit: date + time + pitch + players).  
**Attendance** – Final list of players who actually played (driven by RSVP + any post-editing).  
**Payment Obligation** – A record that player X owes £Y for session S (unless covered).  
**Pass** – A pre-paid product giving rights over a range of sessions.  
**Payment Account** – Stripe Connect Standard account linked to a group/organiser.

---

## 3. Stripe Connect Integration

### 3.1 Model Choice

- Use **Stripe Connect – Standard accounts**.
- Organisers connect their existing Stripe account (or create one).
- Payouts go directly from Stripe to organiser.
- Capo uses application fees to skim its share.

### 3.2 Onboarding Flow (Admin)

1. Admin opens **Admin → Payments**.  
2. Sees “Connect Stripe to accept match fees”.  
3. Clicks **“Set up payments”** → Redirect to Stripe onboarding (hosted).  
4. Stripe gathers all KYC, bank details, etc.  
5. On success, Stripe redirects back with `account_id`.  
6. Capo stores the Stripe account id in `group_payment_accounts`.

**UX copy (example):**

> “We use Stripe to handle payments securely. Your bank details never touch Capo — they go straight to Stripe.”

### 3.3 How charges flow

- For each player payment (game fee or pass purchase), Capo creates a **Checkout Session** with:
  - `amount = total_amount`  
  - `application_fee_amount = capo_fee`  
  - `stripe_account = group_stripe_account_id`  

So:
- Club receives `amount - Stripe fee - capo_fee`.  
- Capo receives `application_fee` to its own Stripe platform account.  
- Capo **never** manually holds or moves money.

---

## 4. Admin Payments UX

### 4.1 Admin Payments Section

**Route:** `/admin/setup?level=standard&section=payments` (similar to voting)

Sections:

1. **Stripe Connection**  
2. **Per-Game Payments Defaults**  
3. **Season Passes / Tiers**  
4. **Messaging & Emails**

---

### 4.2 Stripe Connection UI

Card:

- State 1: Not connected  
  - “Accept match payments with Stripe”  
  - Button: **Connect Stripe**

- State 2: Connected  
  - Show: “Connected as: [Stripe account email / name]” (if available)  
  - Buttons:
    - “View payouts in Stripe” (link to Stripe dashboard)  
    - “Disconnect” (danger, with warning)

---

### 4.3 Per-Game Payments Defaults

Fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `payments_enabled` | boolean | false | Master toggle |
| `default_match_fee` | number | 5.00 | Pre-filled when enabling per-game for a session |
| `currency` | string | `GBP` | Limited to GBP for v1 |
| `capo_fee_per_player` | number | 0.50 | Platform skim; configurable in env, read-only here |
| `allow_cash` | boolean | true | If true, admin can mark players as “paid cash” |
| `auto_request_payments` | boolean | false | If true, automatically create obligations after each session ends |
| `payment_due_hours` | number | 48 | Soft due date displayed in UI/emails |

UI hints:

- Copy: “Players will see a safe Stripe checkout page. You’ll receive money directly from Stripe – we just track who has paid.”
- Show simple example: “If match fee is £5 and Capo fee is £0.50, players pay £5.50, you receive ~£4.80 after Stripe fees.”

---

### 4.4 Season Pass / Tier Management

**Admin route:** `/admin/payments/passes`

List + “Create Pass” modal.

Pass fields:

| Field | Required | Description |
|-------|----------|-------------|
| Name | ✅ | e.g. “Spring 2026 Full Pass” |
| Price | ✅ | e.g. £100 |
| Currency | ✅ | GBP only v1 |
| Valid From | ✅ | Date |
| Valid To | ✅ | Date |
| Max Sessions | ❌ | Int or null for unlimited |
| Applies To | ✅ | Filter: “All sessions”, “Sessions in Season X”, or “Sessions with tag Y” |
| Tier Label | ❌ | e.g. “Core”, “Sub”, “Keeper” |
| Description | ❌ | Admin-facing notes |

**Logic for “Applies To”:**

- Internally, store rules as simple filters:
  - `season_id` (optional)  
  - `session_tags[]` (optional)  
  - `day_of_week[]` or `session_type` (optional)  

(Keep v1 simple: Season OR Tag, not full rule builder.)

Admin can see:
- Number of passes sold  
- Revenue (approx, from Stripe data if available or just count * price)  
- Which players hold each pass.

---

### 4.5 Per-Session Payment Controls

In **Session Control / Match Detail** (where RSVP/teams live):

Add a **Payments** panel:

- Toggle: **“Turn on payments for this session”**
  - When ON:
    - Show “Match fee: [£X editable]” (default from config).  
    - Show “Who will be charged?” – label: “Players marked as having played in this session, excluding those with valid passes.”
- Buttons:
  - “Generate payment requests” (if not auto).  
  - “View payment status” → opens list of players + status.

Once payment requests are generated:
- UI shows each player row with:
  - Name  
  - Covered by: “Season Pass”, “N/A”  
  - Amount owed  
  - Status: Pending / Paid / Cash / Written off  
  - “Mark as paid cash” button (if allow_cash).

---

## 5. Player Payments UX

### 5.1 Paying Per Game

Flow:

1. Player receives:
   - in-app banner: “You owe £5.50 for last game.”  
   - optional email with “Pay now” link.
2. Tapping “Pay now” opens Stripe Checkout.
3. After payment:
   - Player redirected back to app with success state.  
   - Status set to `paid`.  
   - Stripe sends receipt directly to player’s email.

In app, Payment tab per session:

- “Match fee: £5.50”  
- “Status: Paid / Pending / Covered by [Pass Name] / Cash”  
- If pending: “Pay now” button.

---

### 5.2 Buying a Season Pass

Flow:

1. Player sees “Season Pass available” banner in:
   - Home screen  
   - Season overview  
   - Payments tab

2. Tap **“Buy Season Pass”**:
   - Show list of available passes (name, price, description, validity).
   - Tap a pass → Stripe Checkout.

3. After successful purchase:
   - Record `player_pass` record.  
   - Player sees “Active passes” list in their account/payments screen.  
   - Next time payments are requested for a covered session, the player is auto-marked as “Pass covers this”.

---

### 5.3 Handling Non-Tech Players

- No login-with-email requirement to pay: use magic login or deep link with secure token if possible.
- URLs in WhatsApp: “Tap to pay your £5.50 for Wednesday’s game”.
- Keep the UI to 1 screen before redirecting to Stripe.

---

## 6. Integration with RSVP & Seasons

### 6.1 From RSVP to Payment Obligations

Assume RSVP spec provides per-session:

- `session_id`
- List of players w/ status: `going`, `not_going`, `bench`, etc.
- Final “played” marker (from match completion step).

**Rule:**

- Payment obligations are generated only for players marked as **“played”**.
- If a player RSVP’d “going” but didn’t play (e.g. injured), admin can toggle them off before creating obligations.

Flow:

1. Session completed.  
2. Admin confirms attendance list.  
3. Admin toggles “Turn on payments” and clicks “Generate payment requests” (or auto if configured).  
4. For each player who played:
   - Check active passes covering that session.  
   - If covered → create a “covered” record (no payment needed).  
   - If not covered → create payment obligation with `amount_owed = match_fee + capo_fee`.

---

### 6.2 Seasons & Stats

- Payments do *not* depend on `season_id`.  
- Passes can reference a season for admin grouping (“2025 Spring Season Pass”), but logic remains:

  > “Does this pass’s date/filters cover this session?”

- Seasons remain primary for:
  - streaks  
  - stats  
  - awards  
  - leaderboards  

Admin can optionally see:

- “Total collected this season” by summing obligations marked `paid` for sessions within season date range.

---

## 7. Emails & Notifications

### 7.1 Email Types

1. **Payment Request Email** (per session)
   - Subject: “Your match fee for [Group Name] – [Date]”
   - Content:
     - Match details (date, time)
     - Amount owed
     - “Pay now” button (link to Checkout)
     - Note that receipts come from Stripe

2. **Payment Reminder Email** (optional)
   - Sent X hours before `payment_due` (e.g. 24 hours).
   - Only to players still `pending`.

3. **Pass Purchase Confirmation** (optional from Capo, Stripe will send receipt)
   - “You’ve bought [Pass Name] for [Group Name]. It covers matches until [date].”

4. **Admin Summary Email**
   - After payment requests generated:
     - “You’ve requested £Y from N players for [Session].”
   - Optional weekly summary:
     - “This week you collected £X (estimate).”

### 7.2 In-App / Push Notifications (future)

- Banner on home: “You have unpaid match fees.”  
- Notification: “Last game: pay your £5.50 now.”

(Implementation can be delayed; emails + in-app banners are enough for v1.)

---

## 8. Database Schema

### 8.1 Stripe Accounts

```sql
CREATE TABLE group_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,         -- acct_xxx
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMPTZ,
  UNIQUE(group_id)
);
8.2 Payment Settings
sql
Copy code
CREATE TABLE group_payment_settings (
  group_id UUID PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  payments_enabled BOOLEAN NOT NULL DEFAULT false,
  default_match_fee_cents INTEGER NOT NULL DEFAULT 500,
  currency TEXT NOT NULL DEFAULT 'GBP',
  allow_cash BOOLEAN NOT NULL DEFAULT true,
  auto_request_payments BOOLEAN NOT NULL DEFAULT false,
  payment_due_hours INTEGER NOT NULL DEFAULT 48,
  capo_fee_cents INTEGER NOT NULL DEFAULT 50,  -- platform fee per player
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
8.3 Pass Definitions
sql
Copy code
CREATE TABLE passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  max_sessions INTEGER,  -- NULL = unlimited
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  tag_filter TEXT,       -- e.g. 'league' or null
  tier_label TEXT,       -- e.g. 'Core', 'Sub'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
8.4 Player Passes (Purchases)
sql
Copy code
CREATE TABLE player_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id UUID NOT NULL REFERENCES passes(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT, -- for tracking, optional
  sessions_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pass_id, player_id)
);
8.5 Session Payment Config
sql
Copy code
CREATE TABLE session_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  is_payments_enabled BOOLEAN NOT NULL DEFAULT false,
  match_fee_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  payment_requests_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);
8.6 Payment Obligations (Per Player Per Session)
sql
Copy code
CREATE TYPE payment_status AS ENUM ('pending','paid','cash','covered','written_off','failed');

CREATE TABLE session_payment_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  capo_fee_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,  -- ISO 4217: Store at payment time (never derive from tenant)
  status payment_status NOT NULL DEFAULT 'pending',
  covered_by_pass_id UUID REFERENCES player_passes(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, player_id)
);
8.7 Optional: Payment Activity Log
sql
Copy code
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES players(player_id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  type TEXT NOT NULL,  -- e.g. 'request_created','paid','cash','written_off','webhook_update'
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
9. API Routes
9.1 Admin - Payments Setup
text
Copy code
GET    /api/admin/payments/settings           - Get group payment settings
POST   /api/admin/payments/settings           - Update payment settings

POST   /api/admin/payments/connect-stripe     - Start connect flow (returns redirect URL)
POST   /api/admin/payments/disconnect-stripe  - Disconnect account
9.2 Admin - Pass Management
text
Copy code
GET    /api/admin/payments/passes             - List passes
POST   /api/admin/payments/passes             - Create pass
PUT    /api/admin/payments/passes/[id]        - Update pass
DELETE /api/admin/payments/passes/[id]        - Archive / deactivate pass
GET    /api/admin/payments/passes/[id]/holders - List players with this pass
9.3 Session Payments
text
Copy code
GET    /api/admin/sessions/[sessionId]/payments
POST   /api/admin/sessions/[sessionId]/payments/config    - Enable/disable + set fee
POST   /api/admin/sessions/[sessionId]/payments/request   - Generate obligations
POST   /api/admin/sessions/[sessionId]/payments/[playerId]/cash
POST   /api/admin/sessions/[sessionId]/payments/[playerId]/write-off
Rules:

/request:

Validates Stripe connection.

Uses attendance list from RSVP.

Creates / updates session_payment_obligations records.

9.4 Player-facing Payment Actions
text
Copy code
GET    /api/me/payments/summary                 - List outstanding + recent payments
POST   /api/me/payments/sessions/[sessionId]/checkout   - Create Checkout session
GET    /api/me/passes                           - List active / past passes
POST   /api/me/passes/[passId]/checkout         - Create Checkout for a pass purchase
Returns checkout_url and embeds redirect back URL.

Frontend redirects to Stripe.

10. Stripe Webhooks
Endpoint: /api/webhooks/stripe

Handle:

checkout.session.completed

Get session_payment_obligations or player_passes by checkout_session_id.

Mark obligations paid, set paid_at.

Increment sessions_used if relevant.

Record in payment_events.

payment_intent.payment_failed

Mark obligation failed (if relevant).

Optionally trigger email “Payment failed, try again.”

account.updated

For connect accounts, optionally update group_payment_accounts state (e.g. disabled, restricted).

Idempotency:

Use event.id for a processed-events table so each event is handled once.

11. Edge Cases & Rules
11.1 Player Has Multiple Passes
Use first valid pass that covers the session (e.g. earliest expiry).

Decrement max_sessions via sessions_used.

If all passes exhausted or not applicable → player owes per-game fee.

11.2 Player Joins Late
If auto_request_payments is on and obligations already created:

Admin can regenerate obligations OR add one manually for the new player.

11.3 Player Quits Group Mid-Season
Existing passes remain in history; they just won't join sessions.

Capo does not handle refunds (Stripe does).

Admin handles refunds directly in Stripe if needed.

11.4 Cash Payments
Admin marks status = 'cash', no Stripe involved.

Cash payments are treated as paid for stats.

11.5 Disconnection from Stripe
If Stripe account disconnected:

Payments UI shows “Connect Stripe to continue accepting match fees.”

Payment buttons disabled unless allow_cash is true (in which case, record only, no online payment).

11.6 Currency
v1: Hard-code to GBP only.

Store currency in fields for future multi-currency support.

12. Implementation Order
Phase 0 – Prep
Add DB tables: group_payment_accounts, group_payment_settings.

Add admin Payments section (UI only, no Stripe yet).

Phase 1 – Stripe Connect & Settings
Implement connect / disconnect Stripe flows.

Implement group payment settings read/write.

Hide everything else behind payments_enabled.

Phase 2 – Per-Game Payments
Add session_payments and session_payment_obligations.

Integrate into Session control UI:

Turn on payments.

Set fee.

Generate obligations.

Show payment status list.

Implement checkout.session creation for per-game charges.

Implement Stripe webhook handler for obligations.

Phase 3 – Passes
Add passes + player_passes tables.

Admin UI for creating passes.

Player UI to buy pass.

Logic for “covered by pass” when generating obligations.

Phase 4 – Emails & Polish
Add payment request emails.

Add reminders (optional).

Add in-app summary & “You owe X” banners.

Add small analytics around total collected.

13. Acceptance Criteria
Admin
 Can connect Stripe account from Admin → Payments.

 Can set default match fee and enable per-game payments.

 Can create at least one pass product with validity and price.

 Can enable payments for a session, generate obligations, and view per-player status.

 Can mark obligations as “cash” or “written off”.

Player
 Sees outstanding fees (per session) in app.

 Can tap “Pay now” and complete Stripe Checkout.

 Sees updated status “Paid” after returning to app.

 Can see active passes and what they cover.

 Can buy a pass, and future sessions are covered automatically.

System / Stripe
 Stripe Connect account is required before any online payment.

 All online payments go through Stripe Checkout with application fees.

 Capo never stores card/bank details.

 Webhooks update payment status correctly, idempotently.

 Pass coverage logic correctly exempts players from per-game fees.

 Sessions without payments enabled behave exactly as today (no regressions).