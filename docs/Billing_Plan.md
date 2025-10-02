Future Billing — Design (decoupled from tiers, snapshot on IN)
Goals

Start teams mid-season without billing; turn billing on later without refactors.

Keep tier (A/B/—) for booking priority only. Do not tie tier to price.

When a player becomes IN, snapshot the price/labels onto the booking row so later changes don’t rewrite history.

Support rolling billing (e.g., charge only when pitch invoices arrive).

No payment gateway at first; just statuses + exports. Stripe can be added later.
Data model (additive; safe to add now)

These fields exist but are unused until the billing flag is turned on.
ALTER TABLE upcoming_matches
  ADD COLUMN base_fee_cents INTEGER NULL,
  ADD COLUMN currency TEXT NULL;

On player bookings (match_player_pool)
ALTER TABLE match_player_pool
  ADD COLUMN tier_snapshot TEXT CHECK (tier_snapshot IN ('A','B')) NULL,
  ADD COLUMN price_cents_snapshot INTEGER NULL,
  ADD COLUMN bill_status TEXT CHECK (bill_status IN ('PENDING','WAIVED','COLLECTED')) NULL;

Optional: adjustments (for rolling invoices / corrections)
CREATE TABLE IF NOT EXISTS billing_adjustments (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT NOT NULL,
  upcoming_match_id BIGINT NULL,     -- link to a match or leave NULL for period adjustments
  amount_cents INTEGER NOT NULL,     -- positive=credit, negative=debit
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ba_player ON billing_adjustments(player_id);
CREATE INDEX IF NOT EXISTS idx_ba_match  ON billing_adjustments(upcoming_match_id);

Feature flags & start date

enable_match_billing in app_config (string 'true'/'false').

Optional config: billing_start_date (ISO string) to only bill matches on/after that date.

Price resolver (decoupled from tier)

When a player flips to IN (and billing is enabled + date condition passes), compute price:

Precedence (first match wins):

Match override: upcoming_matches.base_fee_cents (if set)

Player price group (optional, later): e.g., players.price_group = 'member'|'guest'

Look up price_list (if you add it later):
price_list(price_group, amount_cents, valid_from, valid_to)

Default price from app config (e.g., default_match_fee_cents)

Then snapshot:

tier_snapshot = players.tier (purely informational for reports)

price_cents_snapshot = resolved price

bill_status = 'PENDING'

Tier is not used to set the price. It only controls booking priority.

Status flow & rules

On IN: set bill_status='PENDING', snapshot price.

OUT within 5-minute grace: void the pending charge (clear or ignore snapshot).

OUT after grace (pre-kick-off): follow policy (initially: no charge; configurable later).

No-show (post kick-off): optional fee later (policy controlled).

After match → “Complete”: admin can Mark collected, Mark waived, or Export CSV to reconcile external payments.

All policy knobs (late-out rule, no-show) can be added later without schema changes; they only affect how we set/clear bill_status and price_cents_snapshot (or create an adjustment).

Rolling / periodic billing (when pitch invoices arrive)

Admins may prefer to bill when the invoice lands rather than per match immediately.

Two supported patterns:

Per-match settlement

Enter the pitch cost on the match (optional).

Button: “Split equally across IN players” → auto-computes price_cents_snapshot for those with NULL.

Bulk Mark collected once reconciled offline.

Periodic adjustments

Create one or more billing_adjustments (e.g., -£180 split across 12 players = -£1500 cents per player).

Use running balance per player:
balance = SUM(adjustments) + SUM(collected charges) + … (your chosen sign convention)

Export CSV to settle externally; mark adjustments as “settled” via an optional field if you want.

You can start with per-match only and add periodic adjustments later for clubs that prefer rolling reconciliation.

Admin UI (when billing goes live)

Match → Billing tab

Grid of all IN players with price_cents_snapshot (editable if unset), bill_status, and Mark collected / waived actions.

“Split pitch cost” helper: enter total, compute per-player amount (rounding shown).

Export CSV.

Player → Billing summary (optional later)

Running balance (adjustments + charges).

History table.

While the flag is off, hide the Billing tab entirely.

Stripe (future)

When you want online payments:

Add a payments table (Stripe PaymentIntent id, amount, status, player_id, upcoming_match_id).

The “Mark collected” button becomes “Request payment” → creates PaymentIntent per player; webhook updates bill_status='COLLECTED' on success.

The snapshot model and resolver don’t change.

Policies (configurable later; defaults now)

Late OUT fee: default none (no charge).

No-show fee: default none.

Rounding: round per-player pitch split to nearest 5p if needed.

Currency: default GBP; per-match currency optional.

Start date: only bill matches with kickoff >= billing_start_date (if set).

Example timelines

A. Mid-season onboarding (billing off)

Weeks 1–3: run RSVP only; snapshots remain NULL.

Week 4: admin enables billing and sets billing_start_date = next Monday.

From next Monday: new IN bookings snapshot price and show in the Billing tab.

B. Rolling invoice

Month end: pitch provider invoice arrives.

Admin opens each match → enters pitch cost → one click “Split equally” → bulk “Mark collected” as money is received (bank transfers, cash).

Edge cases

Tier change after booking: snapshots keep the original tier/price for that booking; future bookings use the new tier.

Manual add: creates an IN row; if billing is on, snapshot price immediately.

Admin comp: set bill_status='WAIVED' (or use a positive credit in billing_adjustments).

Multi-currency: keep currency on the match; snapshots inherit it.

Minimal implementation order

Add nullable fields (match base_fee_cents, pool tier_snapshot/price_cents_snapshot/bill_status).

Feature flag enable_match_billing='false'.

(Later) Billing tab UI + simple resolver (match override → default).

(Optional later) Adjustments table + running balance.

(Future) Stripe integration.

TL;DR

Tier is for priority, not pricing.

Billing is decoupled and snapshot on IN when enabled.

Rolling or per-match billing both work with the same model.

You can turn billing on mid-season with zero refactor.