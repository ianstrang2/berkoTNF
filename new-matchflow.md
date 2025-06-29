# **Unified Match Lifecycle – Specification**

_Last updated: October 26, 2023_

---

## 0. Purpose & Scope

Admins currently juggle two separate screens when running a weekly game:

* **`/admin/matches/next`** – choose players & balance teams.
* **`/admin/matches/results`** – re-enter the same players & final score.

This spec merges those flows into one **Match Control Centre (MCC)** and introduces an explicit **match lifecycle** (Draft → Pool Locked → TeamsBalanced → Completed).  
It covers **React/Next.js, API routes, Prisma models, UI/UX, and migration strategy**.  Actual Supabase migration SQL will be executed manually but is noted here.

---

## 1. Guiding Principles & Reasoning

1. **Single source of truth** – Every upcoming match already lives in `upcoming_matches`. We should evolve that row through states instead of copying data into a second UI.
2. **Progressive disclosure** – Admin should see only the controls needed _right now_.
3. **Mobile-first** – 70 % of admins work on-pitch with a phone in hand; all primary actions are thumb-reachable.
4. **Re-use existing code** – Keep the proven balance algorithm & validation logic; just re-mount them in new panes.

---

## 2. Prisma / DB Changes (to be applied in Supabase)

> **NOTE:** Owner will run the migration manually; Cursor must _not_ execute SQL.

| Change | Rationale |
|--------|-----------|
| Add `upcoming_match_id Int? @unique` to `matches` | Links historical match back to its planning record. |
| Add `state Enum("Draft", "PoolLocked", "TeamsBalanced", "Completed", "Cancelled")` _or_ keep existing booleans but mark in code | Explicit lifecycle clarifies permitted actions. |
| (Optional) unique partial index ensuring ≤ 1 active match if desired | Current design allows many; keep flexible but document policy. |
| Add `state_version Int @default(0)` to `upcoming_matches` | Optimistic concurrency for multi-admin edits. |

_No other tables are modified.  Index names must follow existing conventions (`idx_*`)._

> ⚠️ **Important**: Do **not** run Prisma CLI commands (`prisma migrate`, `db push`, etc.).  
> All database changes must be generated as SQL and saved in `/sql/` using filenames like:  
> `2024-07-01-add-match-lifecycle.sql`.  
> Owner will apply manually via Supabase. You may output SQL scripts in full — just don't execute them automatically.

---

## 3. API / Server Actions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/upcoming-matches/:id/lock-pool` | PATCH | Transition **Draft → PoolLocked**; persists selected player pool. |
| `/api/admin/upcoming-matches/:id/confirm-teams` | PATCH | Transition **PoolLocked → TeamsBalanced**; writes `upcoming_match_players`. |
| `/api/admin/upcoming-matches/:id/complete` | POST  | Accepts score, per-player goals.  1) inserts into `matches` / `player_matches`; 2) updates upcoming row: `state=Completed`. |
| `/api/admin/upcoming-matches/:id/unlock-pool` | PATCH | Reverts **PoolLocked → Draft**; deletes `upcoming_match_players`. |
| `/api/admin/upcoming-matches/:id/unlock-teams` | PATCH | Reverts **TeamsBalanced → PoolLocked**; resets `is_balanced` flag. |
| `/api/admin/upcoming-matches/:id/undo` | PATCH | Reverts **Completed → TeamsBalanced**; deletes associated `matches` record. |

All endpoints verify `state_version` to prevent stampedes.  Expose identical helpers via **React Server Actions** for fast happy-path.

---

## 4. Front-End Architecture (Next 13 App Router)

### 4.1 Routing

```
/app/admin/matches/page.tsx         -> list (upcoming + past)
/app/admin/matches/[id]/page.tsx    -> Match Control Centre
/app/admin/matches/results/page.tsx -> Historic Match Editor (trimmed)
```

### 4.2 Global Match Context

`useMatchState(matchId)` returns `{ state, stateVersion, actions: { lockPool, confirmTeams, ... } }`.  All panes subscribe; `StepperBar` & `GlobalCtaBar` derive their UI from it.

### 4.3 Component Breakdown

---

#### Core Components

The UI is driven by a main page that conditionally renders panes based on the match state.

- `StepperBar` → `/components/admin/matches/StepperBar.component.tsx`
- `GlobalCtaBar` → `/components/admin/matches/GlobalCtaBar.component.tsx`
- `PlayerPoolPane` → `/components/admin/matches/PlayerPoolPane.component.tsx`
- `BalanceTeamsPane` → `/components/admin/matches/BalanceTeamsPane.component.tsx`
- `CompleteMatchForm` → `/components/admin/matches/CompleteMatchForm.component.tsx`
  - *Note: This component is used for both the `TeamsBalanced` state (for data entry) and the `Completed` state (in a read-only capacity).*

> Use `.component.tsx` suffix as per naming convention. Do not place logic in `/app` routes — pages should only import and render the appropriate component.

---

### 4.4 UI Style Constraints

All new UI must conform to the existing design system:

- Use current `Button`, `Modal`, `Dialog`, and `Toast` components — no new custom variants.
- Match existing Tailwind class names for spacing, font sizes, border radius, and gradients (e.g. `rounded-xl`, `bg-gradient-to-r from-orange-400`).
- CTA buttons must look and behave exactly like the existing "Build Teams" or "Add Match" buttons.
- Validation and alerts use the existing `useToast()` pattern with consistent colors 
- Modals should follow existing animation and layering conventions.
- Do not introduce new color tokens, drop shadows, or typography styles unless explicitly approved.

> Purpose: all additions should feel native to the current admin UI and blend seamlessly with existing pages.

---

## 5. UI / Interaction Flow

### 5.1 Stepper & CTA table

| Lifecycle State | Stepper Highlight | Primary CTA (Global) | Notes |
|-----------------|-------------------|-------------|-------|
| Draft           | Pool              | Lock Pool   | disabled until `selected = size×2` |
| PoolLocked      | Teams             | Confirm Teams | disabled until `isBalanced === true` |
| TeamsBalanced   | Complete          | Save Result  | validates + calls `/complete` |
| Completed       | Done              | (disabled) Completed | — |

A secondary menu (⋮) offers **Unlock Pool**, **Unlock Teams**, and **Undo Completion** conditional on state.

### 5.2 Lean Results Input

Team lists rendered with shared `PlayerRow`:

```
+ Add scorer              // opens bottom sheet filter by team
Jim  –  − 2 +   🗑         // counter buttons
```

Totals auto-sync with big score inputs at top; red highlight if mismatch.

---

## 6. Mobile UX

* **Global CTA is sticky:** On screens `< 768px`, the primary action button bar is 56px tall and fixes to the bottom of the viewport (`bottom-16` to clear main nav).
* Tablet landscape (768 – 1023 px): stepper beneath header; controller opens with slide-in drawer for extra width.
* Swipe left/right on team cards to switch A⇄B in Balance pane.  
* Pull-to-refresh in Player Pool.  
* Goal counter buttons 48×48 px for tap accuracy.  
* `window.navigator.share` after completion to push lineup & score to WhatsApp.

### Solution

1. **CTA Height** – 56 px tall bar rendered with `bottom-16` so it docks just above the nav for **< 768 px** views.
   ```html
   <div class="fixed inset-x-0 bottom-16 z-40 ..."> ...CTA... </div>
   ```
2. **Safe Area** – Keep `<div class="pb-safe">` wrapper inside nav as is; CTA honours it automatically.

---

## 7. Edge-Cases & Concurrency

1. Multiple admins: each API call passes `state_version`; server rejects if mismatch → client shows toast _"Page is stale, refresh."_
2. Multiple active matches: allowed; list view labels each _Active_.  User chooses which to open.
3. Undo Complete: available until a subsequent match is created; sets state back to TeamsBalanced and deletes `matches` row (soft-delete flag recommended but out-of-scope).

---

## 8. Phased Delivery Plan

1. **Sprint 1 – DB & Services**  
    • Add `upcoming_match_id`, `state`, `state_version`.  
    • Implement `/complete` service + unit tests.
> Generate raw SQL migration script(s) and save to `/sql/2024-07-01-add-match-lifecycle.sql`.
2. **Sprint 2 – Routing & Context**  
    • New list page & dynamic `[id]` route.  
    • `useMatchState` hook stubs.
3. **Sprint 3 – Player Pool & Balance Refactor**  
    • Move logic from `NewTeamAlgorithm.component` into panes.  
    • Introduce Stepper & single CTA.
4. **Sprint 4 – Live & Finish**  
    • Build `LiveMatchPane`, `CompleteMatchForm`, wire to service.
5. **Sprint 5 – Polish & Mobile Gestures**  
    • Swipe, share, concurrency toasts, QA.

---

## 9. Open Questions / Clarifications Needed

1. **Own Goals** – do we need to record them separately? Affects validation.
2. **Partial Line-ups** – are 7-a-side or other sizes common enough to support variable team size in Live pane?
3. **Notification strategy** – any email/push on completion, or manual share is enough for now?
4. **Stats recalculation trigger** – existing `/api/admin/trigger-stats-update` is synchronous; consider background job.

> _Please answer the above to finalise the spec._

---

## 10. Legacy Data Strategy

> **Q:** *"What about the 550+ historical matches that have no planning record?"*

These remain perfectly valid rows in `matches` **with `upcoming_match_id = NULL`**.  No migration is required because:

1.  The FK is optional.  Existing rows stay untouched.
2.  The Historic Match Editor continues to allow edit/delete of any `matches` row (linked or not).
3.  If, for reporting reasons, you later want a 1-to-1 link, we can write a one-off script to create dummy `upcoming_matches` ("Legacy Import") but it's not functionally necessary.

---

## 10-bis. Legacy Back-Fill Plan (Single-Screen Future)

Because you are the sole user today, we can afford a one-time script to retrofit the 550 + historical matches so that they **all** align with the new lifecycle and we can delete the legacy Results screen entirely.

### Steps
1. **SQL Script (manual)**  
   ```sql
   -- 1. Create a dummy upcoming row per legacy match
   INSERT INTO upcoming_matches (
       match_date, team_size, is_completed, is_active, is_balanced, state
   )
   SELECT match_date, 9, true, false, true, 'Completed'
   FROM matches
   WHERE upcoming_match_id IS NULL;

   -- 2. Link the matches row to its new planning id
   UPDATE matches m
   SET upcoming_match_id = u.upcoming_match_id
   FROM upcoming_matches u
   WHERE m.upcoming_match_id IS NULL
     AND m.match_date = u.match_date;
   ```
   *We match on date; if two matches share a date you'll manually reconcile.*
2. **Mark State** – Dummy rows go straight to `state='Completed'` so MCC opens in read-only ResultsSummaryPane.
3. **Remove Historic Editor** once verified.

_No further code changes required; MCC becomes the single truth for every match._

---

## 11. Mobile CTA vs Existing Bottom Nav

Your current `BottomNavigation.component` is a **fixed** 64-px bar (`h-16`) with z-index 50.

### Solution

1. **CTA Height** – 56 px tall bar rendered with `bottom-16` so it docks **just above** the nav:  
   ```html
   <div class="fixed inset-x-0 bottom-16 z-40 ..."> ...CTA... </div>
   ```
2. **Safe Area** – Keep `<div class="pb-safe">` wrapper inside nav as is; CTA honours it automatically.
3. **Animation** – CTA slides in/out via `translateY` to avoid overlap.
4. **Desktop** – CTA sits in the right column of `MatchControlLayout` (no conflict).

> Net: bottom nav untouched; CTA feels like a floating action bar.

---

## 12. Own Goals & Auto-Score Options

### Current Flow
Admin types **Team Score** + per-player goals.  App warns if totals differ but allows save.

### Proposed Enhancements

| Option | Effort | UX | Data Impact |
|--------|--------|----|------------|
| **A – Live Totals (Recommended)** | ★★☆☆ | Score inputs become *read-only* labels showing real-time sum of player goals.  If admin needs override, a small ✎ icon toggles them editable. | No own-goal tracking; behaviour identical to now but confusion removed. |
| **B – Own Goal Toggle** | ★★★☆ | Keep auto totals as above.  Each scorer row gets a ⚽ → 🗲 toggle "Own Goal".  Tally adds goal to *opponent* total. | Requires new boolean `own_goal` in `player_matches`. |
| **C – Mixed (Status Quo)** | – | Keep both score inputs + warning dialog. | No change. |

**Recommendation** – ship Option A first (zero schema change) for clarity, then evaluate if explicit own-goal data is worth Option B down the road.

Implementation note: scoreboard in `CompleteMatchForm` increments a local `teamScores` state.

---

## 12-bis. Robust Own-Goal Model

### Data Design
| Field | Table | Type | Notes |
|-------|-------|------|-------|
| `own_goals_a` | matches | Int? | Goals Team A gained via opponent OG. |
| `own_goals_b` | matches | Int? | Goals Team B gained via opponent OG. |

*No new rows in `player_matches`; player stats stay pristine.*

### Validation Logic
`team_a_score` must equal:
```
Σ goals by Team A players  +  own_goals_b  -- (because B scores into own net)
```
and vice-versa.

### UI Flow
* In **CompleteMatchForm** each team block gets an "Own Goals" spinner ( − / + ).
* A ⚽️🔥 button increments it when unclear who scored.
* Score labels remain auto-calculated; admin can override if still off.

### Reporting Impact
* Match report shows "⚽ OG" rows under scorers.  
* Player leaderboards unchanged.

_Optional future: if OG is known, admin can still log it under that player; rules above still hold._

---

## 13. Variable & Uneven Team Sizes

### Requirements Recap
* Admins pick arbitrary team size at match creation.
* On match day a player may no-show → uneven sides.

### Design
1. **Flexible Slot Count**  
   * When match is **Draft**, admin selects `team_size` (eg 7-a-side).  
   * This sets max slots per team for Balance pane.  
2. **Optional Slots**  
   * Validation only requires **≥ MIN_PLAYERS (3?)** per team, **not exactly `team_size`**.  
   * Empty slots render as translucent dashed boxes labelled "Empty".
3. **Uneven Sanity Check**  
   * If team counts differ by > 1, show orange warning "Uneven sides – proceed?" but allow.
4. **Stats Integrity**  
   * `player_matches` are inserted only for actual players, so uneven totals do not skew averages.

_(Alternative "DNA player" placeholder was rejected – unnecessary extra rows & logic.)_

---

## 13-bis. Balancing With Uneven Numbers

**Updated per discussion** – Preserve current deterministic algorithms **unchanged**.  They stay available **only** when the player pool contains exactly `team_size × 2` players (current validation already enforces this).

### New Capability – Quick Transfer Button

| Feature | Description |
|---------|-------------|
| **Transfer** (uses existing *random* method) | A separate button (outside the balance modal) that, at any time, distributes the currently-selected pool randomly across the two team columns, filling top-down.  Slots beyond actual head-count remain empty. |

*Purpose*: lets an admin with uneven numbers get a starting layout without invoking the complex balance algorithms. They can then drag & drop to finalise.

### UI Placement
* Appears next to **Clear** / **Create Player** buttons inside the Player-Pool card.  Same button styling (`variant="secondary"` with gradient only on hover) to match current palette.
* Tooltip on hover/tap: "Quickly transfer pool to teams (random order)."

### Behaviour Rules
1. **Deterministic Buttons** (Ability, Performance) remain greyed-out when player count ≠ even full teams (exactly as now).
2. **Transfer** always enabled once ≥1 player is in pool.
3. No coloured banners added—status feedback continues via existing toast/snackbar system to keep UI look consistent.

### Code Impact
* Remove `'random'` option from balance-modal radio; `handleBalanceTeams('random')` is now called by `handleTransfer()`.
* Implement small helper:
  ```ts
  const handleTransfer = () => handleBalanceTeams('random');
  ```
* No changes to underlying algorithm files.

---

*All new DB columns are already captured in Section 2 and will be added to manual migration list.*

---

## 14. Stats Re-calculation Background Job

Right now `/api/admin/trigger-stats-update` runs synchronously after save.  It works but blocks the HTTP response if dataset grows.

### Proposed Path (Optional, later)
* Convert the endpoint into a **Supabase Edge Function**.  
* Use `supabase.tasks.schedule()` (or cron-cloud) to enqueue job; return 202 immediately.  
* A `cache_metadata` table row marks last success; UI can `swr` refresh when ready.

_No action needed for MVP; keep current flow unless you observe slowness._

---

## 15. Open Questions – Updated

| # | Question | Current Answer |
|---|----------|----------------|
| 1 | Own Goals? | Use **Option A Live Totals** now; reconsider explicit flag later. |
| 2 | Partial / uneven line-ups? | Allow empty slots; validation >=3 per team; warn if sides differ by >1. |
| 3 | Notifications? | Defer; out-of-scope. |
| 4 | Stats job async? | Optional future optimisation; keep synchronous for now. |

_No outstanding blockers._

---

## 16. Lifecycle State Machine (Authoritative)

| Current State | Permitted UI Pane | Primary CTA (from §5) | Secondary Actions | Endpoint Called | Next State |
|---------------|------------------|-----------------------|-------------------|-----------------|------------|
| **Draft** | PlayerPoolPane | Lock Pool | • Edit match metadata<br>• Clear pool | `PATCH /lock-pool` | PoolLocked |
| **PoolLocked** | BalanceTeamsPane | Confirm Teams | • Unlock Pool (revert)<br>• Transfer<br>• Clear teams | `PATCH /confirm-teams` | TeamsBalanced |
| **TeamsBalanced** | CompleteMatchForm | Save Result | • Re-balance<br>• Unlock Teams (revert to PoolLocked)<br>• Cancel Match | `POST /complete` | Completed |
| **Completed** | CompleteMatchForm (Read-only) | (disabled) | • Undo Complete | `PATCH /upcoming-matches/:id/undo` | TeamsBalanced |
| **Cancelled** | – | – | • Delete planning row | `DELETE /upcoming-matches/:id` | – |

**Rules**
1. Transitions not listed above are forbidden; server returns `409`.
2. Undo Complete is always available from the `Completed` state.
3. Cancelled matches are not included in public stats; rows remain for audit.

UI components derive button enable/disable strictly from this table via `useMatchState().can(action)` helper to avoid drift.

### 16.1 Back-Navigation Policy

| Backward Transition | Allowed When | Data Impact | UI Trigger | Endpoint |
|---------------------|--------------|-------------|------------|----------|
| PoolLocked → Draft | No teams confirmed yet **OR** admin explicitly "Unlock Pool" | • Deletes `upcoming_match_players` rows<br>• Sets `state='Draft'`, `is_balanced=false` | "Unlock Pool" button (3-dot menu) | `PATCH /unlock-pool` |
| TeamsBalanced → PoolLocked | • Match **not yet completed** | • Sets `state='PoolLocked'`, `is_balanced=false` | "Unlock Teams" button | `PATCH /unlock-teams` |
| Completed → TeamsBalanced | • Always, from `Completed` state | • Deletes `matches` & `player_matches` rows so they can be re-created | "Undo Completion" button (3-dot menu or toast) | `PATCH /upcoming-matches/:id/undo` |

_Going backward beyond Draft is impossible; you can instead cancel & create a fresh match._

Safeguards:
* If a goal event exists (`player_matches` not empty) you can't unlock to Draft; you must go via TeamsBalanced or delete the match.
* API rejects dangerous reversions with clear 4xx + message (see §19).

---

## 17. Dynamic Roster Management After Balancing

### 17.1 Player Drop-Out
* In **TeamsBalanced** (or later) long-press a player row → "Mark Absent".
* Row turns grey; slot counts as empty; deterministic balance buttons disable.
* Admin may:
  1. Drag a bench player into the slot.
  2. Press **Transfer** to random-fill remaining slots.
* Stats: absent players never create `player_matches` rows.

### 17.2 Late Arrival / New Player
* **Add Player** button appears in `CompleteMatchForm` → opens PlayerPool bottom sheet filtered to _Not in match_.
* Selecting a player adds them to a new **Bench** area (below Team B). Drag onto a team slot to field them.

### 17.3 Quick Swap
* Drag one player over another to swap instantly (already supported by `handleDrop`).

Backend impact: `upcoming_match_players` is updated in-place; `state_version` increments each change.

---

## 18. Post-Completion Edits & Audit Trail

### 18.1 Re-open vs Quick Edit
* **Within 48 h** admin sees "Edit Result" button in ResultsSummaryPane.
  * Opens CompleteMatchForm in modal _without_ reverting state – simply issues `PUT /matches/:id` and recalculates stats.
* **After 48 h** state revert (Completed → TeamsBalanced) is required (see 16.1).

### 18.2 Audit Log
* New table `match_edits` (match_id, editor_id, edited_at, diff JSON).
* Every `PUT /matches/:id` inserts a row before update.

### 18.3 Stats Re-calc
* Same trigger `/trigger-stats-update` fires after every edit.
* Edge Function queue still optional.

---

## 19. Friendly Error & Notification Copy

| Scenario | Old Message | New UX-Friendly Copy | CTA |
|----------|-------------|----------------------|-----|
| Concurrent save conflict (`409`) | "Page is stale, refresh" | "Another admin updated this match a moment ago. Tap **Reload** to see their changes, then try again." | **Reload** button in toast |
| Network failure (`fetch` throws) | "Failed" | "Can't connect right now. Your changes are kept locally – retry when you're back online." | **Retry** + **Dismiss** |
| Validation error (goals ≠ score) | JS alert | Inline red text: "Team A's goals add to 5 but score is 4. Fix the number or adjust player goals." | Focus first offending field |
| Forbidden transition | "409" | "You can't unlock teams once a match is complete. Re-open the match from Results if you need bigger changes." | OK |

Patterns:
* All errors surfaced via `useToast()` with consistent colour (red-600) and icon (⚠️).
* Retryable errors include auto-retry when connection restores (`navigator.onLine`).

---

_End of document_ 