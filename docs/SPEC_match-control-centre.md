# Match Control Centre Specification

**Version:** 2.0  
**Last Updated:** December 2, 2025  
**Status:** ✅ Production Complete (includes Explicit Save Model - December 2025)

---

## Overview

The **Match Control Centre (MCC)** unifies match planning, team balancing, and result entry into a single cohesive workflow. Admins manage the entire match lifecycle through one interface using a **3-step process**:

```
Step 1: Pool → Step 2: Teams → Step 3: Done
```

**Key Features:**
- 3-step streamlined workflow
- Lock & Balance in single action
- Explicit save model (teams not visible to players until saved)
- Advanced team balancing (3 algorithms)
- Mobile-first design (on-pitch optimized)
- Drag & drop player assignment
- Real-time team analysis (Tornado Charts)
- Uneven teams support
- No-show tracking with uneven team warnings

---

## Match Lifecycle States

### Database States

The database uses 4 states for persistence:

```
Draft → PoolLocked → TeamsBalanced → Completed
```

### UI Steps Mapping

| DB State | UI Step | Status Display | Player View |
|----------|---------|----------------|-------------|
| Draft | Pool (1) | BUILDING | "Match on [date]" |
| PoolLocked (teams_saved_at=NULL) | Teams (2) | ARRANGING | "Teams being finalised..." |
| PoolLocked (teams_saved_at set) | Teams (2) | TEAMS SET | Full team lists |
| TeamsBalanced | Done (3) | RESULT | Full team lists |
| Completed | Done (3) | COMPLETE | Result + teams |

### State Transitions

**Lock & Balance** (`Draft → PoolLocked`):
- Admin clicks "Lock & Balance" button
- Modal opens to choose balance method (Ability/Performance/Random)
- Validates player count (8-22 players)
- Creates team assignments via chosen algorithm
- Sets `state = 'PoolLocked'`, `is_balanced = true`
- `teams_saved_at` remains NULL (draft state)

**Save Teams** (within `PoolLocked`):
- Admin reviews teams, makes adjustments
- Clicks "Save Teams" (first time) or "Save Changes" (subsequent)
- Sets `teams_saved_at = NOW()`
- Teams now visible to players
- Future: Triggers notifications

**Enter Result** (`PoolLocked → TeamsBalanced`):
- Admin clicks "Enter Result" (only visible when teams saved)
- Shows result entry form
- Sets `state = 'TeamsBalanced'`

**Complete Match** (`TeamsBalanced → Completed`):
- Admin enters scores for each player
- Creates `matches` record with scores
- Creates `player_matches` records with stats
- Triggers background stats update
- Sets `state = 'Completed'`, `is_completed = true`

**Undo Completion** (`Completed → TeamsBalanced`):
- Soft-deletes `matches` record
- Soft-deletes `player_matches` records
- Sets `state = 'TeamsBalanced'`, `is_completed = false`

**Unlock Pool** (any state → `Draft`):
- Admin can unlock pool from menu
- Returns to Draft state for pool changes
- Preserves player pool but resets team assignments

---

## Database Schema

### upcoming_matches

**Core fields:**
```typescript
upcoming_match_id: number       // PK
tenant_id: string               // Multi-tenancy
match_date: DateTime
team_size: number               // Default team size (e.g., 8)
actual_size_a: number | null    // Team A size (for uneven, e.g., 7)
actual_size_b: number | null    // Team B size (for uneven, e.g., 9)
state: 'Draft' | 'PoolLocked' | 'TeamsBalanced' | 'Completed'
state_version: number           // Optimistic locking
is_balanced: boolean
is_active: boolean
is_completed: boolean
teams_saved_at: DateTime | null // NULL = draft, timestamp = teams visible to players
team_a_name: string             // "Orange"
team_b_name: string             // "Green"
location: string | null
notes: string | null
```

### upcoming_match_players

**Team assignments:**
   ```typescript
upcoming_player_id: number      // PK
upcoming_match_id: number       // FK
player_id: number               // FK
team: 'A' | 'B' | 'Unassigned'
slot_number: number | null      // Position assignment
```

### match_player_pool

**Player availability (future RSVP):**
   ```typescript
id: number
upcoming_match_id: number
player_id: number
response_status: 'IN' | 'OUT' | 'MAYBE'
response_timestamp: DateTime
```

---

## API Routes

### Match CRUD

**`GET /api/admin/upcoming-matches`**
- Fetch all matches or specific match by ID
- Returns match with players, pool, and metadata

**`POST /api/admin/upcoming-matches`**
- Create new match
- Body: `{ match_date, team_size, actual_size_a?, actual_size_b? }`
- Returns: Created match with ID

**`PUT /api/admin/upcoming-matches`**
- Edit match metadata (date, team size, names)
- Body: `{ upcoming_match_id, match_date?, team_size?, ... }`

**`DELETE /api/admin/upcoming-matches`**
- Delete match
- Validates: Can only delete Draft or PoolLocked states
- Cascades: Deletes players and pool entries

### State Transitions

**`PATCH /api/admin/upcoming-matches/[id]/lock-pool`**
- Transition: Draft → PoolLocked
- **Now includes balancing** in single action
- Body: `{ playerIds: number[], balanceMethod?: 'ability' | 'performance' | 'random' }`
- Creates team assignments immediately
- Sets `is_balanced = true`
- `teams_saved_at` remains NULL

**`POST /api/admin/upcoming-matches/[id]/save-teams`**
- Saves current team assignments as "official"
- Sets `teams_saved_at = NOW()`
- Body: `{ state_version, teamAssignments: [{ player_id, team, slot_number }] }`
- Players can now see teams

**`POST /api/admin/upcoming-matches/[id]/complete`**
- Transition: TeamsBalanced → Completed
- Creates match results
- Triggers stats update job
- Body: `{ team_a_score, team_b_score, playerStats: [...] }`

**`PATCH /api/admin/upcoming-matches/[id]/undo`**
- Transition: Completed → TeamsBalanced
- Soft-deletes match and player_matches
- Body: None

### Team Management

**`PUT /api/admin/upcoming-match-players`**
- Update player team assignment
- Body: `{ upcoming_player_id, team: 'A' | 'B', slot_number? }`

**`POST /api/admin/upcoming-match-players/swap`**
- Swap two players between teams
- Body: `{ player1_id, player2_id, upcoming_match_id }`

**`POST /api/admin/balance-teams`**
- Re-balance teams using selected algorithm
- Body: `{ upcoming_match_id, algorithm: 'ability' | 'performance' | 'random' }`
- Returns: Balanced teams with scores

---

## Team Balancing Algorithms

### 1. Balance by Ability (Position-Based)

**Method:** Position-aware brute force

**Process:**
1. Sort players into position pools (defenders, midfielders, attackers)
2. Generate all team combinations
3. Calculate weighted balance score per position
4. Return most balanced combination

**Restrictions:**
- Disabled for uneven teams (algorithm requires equal sizes)
- Disabled for 4v4 simplified teams (not enough positions)

**Tornado Chart:** Shows ability-based balance analysis

**See:** `SPEC_balance_by_rating_algorithm.md` for complete spec

### 2. Balance by Performance (EWMA-Based)

**Method:** Multi-objective optimization with power ratings

**Process:**
1. Fetch EWMA power ratings and goal threat
2. Modified snake draft distribution
3. Hill-climbing optimization (2000 iterations)
4. Minimize combined loss across metrics

**Best for:** All team sizes, performance-based fairness

**Tornado Chart:** Shows performance-based balance analysis

**See:** `SPEC_balance_by_performance_algorithm.md` for complete spec

### 3. Random Assignment

**Method:** Shuffle and distribute

**Process:**
1. Shuffle player array randomly
2. Assign alternating to Team A and Team B
3. No optimization

**Best for:** Quick distribution, casual matches

**Tornado Chart:** None (no meaningful analysis for random)

---

## Uneven Teams Feature (January 2025)

**Status:** ✅ Implemented

### Problem Solved

**Before:** Only even teams (8v8, 9v9, etc.)  
**After:** Support any combination (7v9, 8v10, etc.)

### Implementation

**Database Changes:**
```sql
-- Added to upcoming_matches
actual_size_a INT    -- Team A size (e.g., 7)
actual_size_b INT    -- Team B size (e.g., 9)
```

**UI Changes:**
- Toggle: "Even Teams" vs "Uneven Teams"
- When uneven: Show two separate size inputs
- Validation: `actual_size_a + actual_size_b = total players`

**Algorithm Support:**
- **Ability balancing:** Disabled for uneven teams (maintains algorithm integrity)
- **Performance balancing:** Fully supported
- **Random assignment:** Fully supported

**Team Assignment Logic:**
```typescript
const actualSizeA = matchData.actual_size_a || matchData.team_size;
const actualSizeB = matchData.actual_size_b || matchData.team_size;

// Validate all slots filled
const teamAPlayers = players.filter(p => p.team === 'A');
const teamBPlayers = players.filter(p => p.team === 'B');

const allSlotsFilled = teamAPlayers.length === actualSizeA 
                    && teamBPlayers.length === actualSizeB;
```

---

## UI Components

### Match List Page (`/admin/matches`)

**Features:**
- List of all upcoming matches
- Create new match button
- Quick view of match state and player count
- Edit/delete actions

### Match Control Centre (`/admin/matches/[id]`)

**Layout (Mobile):**
```
┌─────────────────────────────────┐
│ Date: 04-Dec-25    ①②③         │  ← Header with compact stepper
├─────────────────────────────────┤
│ [TEAMS SET]                     │  ← Status badge (subtle, transparent)
├─────────────────────────────────┤
│ Step Content (full height):     │
│ - Draft: PlayerPoolPane         │
│ - PoolLocked: BalanceTeamsPane  │
│ - TeamsBalanced: CompleteMatch  │
├─────────────────────────────────┤
│ [Primary CTA Button]            │  ← Fixed to bottom on mobile
└─────────────────────────────────┘
```

**State-Driven Rendering:**
```typescript
{matchData.state === 'Draft' && <PlayerPoolPane />}
{matchData.state === 'PoolLocked' && <BalanceTeamsPane />}
{matchData.state === 'TeamsBalanced' && <CompleteMatchForm />}
{matchData.state === 'Completed' && <CompletionSummary />}
```

### Stepper Bar

**Desktop:** Full labels (Pool → Teams → Done)
**Mobile:** Compact circles (①②③) aligned with date

**Styling:** Neutral grey (non-distracting)
- Active: Dark grey outline with dark grey number
- Completed: Light grey outline with grey checkmark
- Pending: Light grey outline with grey number

### Step 1: PlayerPoolPane

**Purpose:** Select players for match

**UI Elements:**
- Header: "Player Pool: 04-Dec-25" with player count (e.g., "8/16")
- Search input: "Add players (X available)"
- Search results: 4-5 visible players
- Selected players: Compact pills (same height as search results)
- Primary CTA: "Lock & Balance"

**Lock & Balance Modal:**
- Radio buttons for balance method
- Shows pool size and projected team split
- Ability option disabled if uneven or 4v4
- Purple-pink gradient on selected option

### Step 2: BalanceTeamsPane (Set Teams)

**Purpose:** Review and finalize team assignments

**UI Elements:**
- Header: "Set Teams" with Re-Balance and Copy/Discard buttons
- Two team columns with drag & drop
- Position dividers (purple lines between DEF/MID/ATT)
- Tornado Chart (only for Ability/Performance, never Random)
- Balance score display

**Button States:**
| teams_saved_at | hasUnsavedChanges | Buttons Shown |
|----------------|-------------------|---------------|
| NULL | false | Re-Balance |
| NULL | true | Re-Balance, Discard (gradient) |
| set | false | Re-Balance, Copy |
| set | true | Re-Balance, Discard (gradient) |

**Primary CTA:**
- First save: "Save Teams" → Green flash "✓ Saved!" (1.5s)
- After save, no changes: "Enter Result"
- After save, with changes: "Save Changes" → Green flash

### Step 3: CompleteMatchForm

**Purpose:** Enter match results

**UI Elements:**
- Sticky score bar (Orange vs Green totals)
- Uneven team warning (if playing counts differ, including no-shows)
- "Tap score above to switch teams" hint
- Single team card view (tap-to-toggle)
- Compact player rows with:
  - Played checkbox (purple-pink gradient)
  - Team swap button (arrow)
  - Player name
  - Goal +/- buttons (purple-pink gradient SVG)
- Own Goal row per team

**Primary CTA:** "Save Result"

---

## Mobile Optimization

### GlobalCtaBar (Mobile-Fixed Pattern)

**Desktop:** Inline button at bottom of content  
**Mobile:** Fixed to bottom of screen (always visible)

**Success Flash:**
- Shows green gradient with "✓ Saved!" for 1.5 seconds
- Auto-resets to normal state

**Why:** On mobile, primary action always accessible (no scrolling to find button)

### Touch-Friendly Interactions

**Drag & Drop:**
- Large touch targets (48px minimum)
- Visual feedback on drag
- Works on desktop mouse + mobile touch
- `touch-none` CSS prevents scroll conflicts

**Buttons:**
- Minimum 44px height (Apple HIG)
- Clear labels
- Loading states prevent double-tap

---

## Player Visibility Logic

**Key Concept:** Players only see teams when `teams_saved_at` is set.

### `/player/upcoming` View

```typescript
const formatStateDisplay = (state: string, teamsSavedAt?: string) => {
  switch (state) {
    case 'Draft':
      return 'BUILDING';
    case 'PoolLocked':
      return teamsSavedAt ? 'TEAMS SET' : 'BUILDING';
    case 'TeamsBalanced':
      return 'READY';
    case 'Completed':
      return 'COMPLETE';
  }
};

// Show teams only if saved
if (match.state === 'PoolLocked' && !match.teams_saved_at) {
  return <div>Teams being finalised...</div>;
}
```

---

## Error Handling

### Validation Errors

**Player Count:**
```typescript
if (playerIds.length < 8 || playerIds.length > 22) {
  throw new Error('Need between 8 and 22 players');
}
```

**Balance Method Restrictions:**
```typescript
if (balanceMethod === 'ability' && (isUneven || isSimplified)) {
  throw new Error('Ability balancing not available for uneven/4v4 teams');
}
```

### Concurrency Control

**Optimistic Locking:**
```typescript
await prisma.upcoming_matches.update({
  where: {
    upcoming_match_id: matchId,
    state_version: currentVersion  // Must match
  },
  data: {
    state: 'PoolLocked',
    state_version: { increment: 1 }
  }
});
```

**If version mismatch:** Return 409 Conflict error

---

## No-Show Handling

**Result Entry Screen:**
- Players can be marked as "No Show"
- No-shows excluded from goal entry
- Uneven team warning appears if playing counts differ

```typescript
const playingA = teamA.filter(p => !noShowPlayers.has(p.id)).length;
const playingB = teamB.filter(p => !noShowPlayers.has(p.id)).length;

if (playingA !== playingB) {
  // Show warning: "⚠️ Uneven: X vs Y"
}
```

---

## Related Specifications

- **Team Balancing (Ability):** `SPEC_balance_by_rating_algorithm.md`
- **Team Balancing (Performance):** `SPEC_balance_by_performance_algorithm.md`
- **Match Report Dashboard:** `SPEC_match-report.md`
- **Background Jobs:** `SPEC_background_jobs.md`
- **Multi-Tenancy:** `SPEC_multi_tenancy.md`
- **Flow Diagrams:** `MERMAID_Match_Control.md`

---

## Future Enhancements

**Not Yet Implemented:**
- [ ] RSVP integration (auto-pool, auto-balance, auto-save)
- [ ] Player notifications on team save
- [ ] Match templates (save common configurations)
- [ ] Bulk match creation
- [ ] Advanced balance constraints (keep pairs together/apart)
- [ ] Match reminders

**See:** `SPEC_RSVP.md` for RSVP implementation plan

---

**Document Status:** ✅ Production Complete  
**Last Updated:** December 2, 2025  
**Version:** 2.0
