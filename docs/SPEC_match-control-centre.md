# Match Control Centre Specification

**Version:** 1.0  
**Last Updated:** November 26, 2025  
**Status:** ✅ Production Complete (includes Uneven Teams - January 2025)

---

## Overview

The **Match Control Centre (MCC)** unifies match planning, team balancing, and result entry into a single cohesive workflow. Admins manage the entire match lifecycle through one interface that evolves from Draft → PoolLocked → TeamsBalanced → Completed.

**Key Features:**
- Complete match lifecycle management
- Advanced team balancing (3 algorithms)
- Mobile-first design (on-pitch optimized)
- Drag & drop player assignment
- Real-time team analysis
- Uneven teams support (January 2025)

---

## Match Lifecycle States

**State machine:**
```
Draft → PoolLocked → TeamsBalanced → Completed
  ↓           ↓             ↓            ↓
Unlock    Unlock        Undo          (Final)
```

### State Definitions

**Draft:**
- Purpose: Select players for match
- Action: Add/remove players from pool
- Requirement: Exactly `teamSize * 2` players (or custom for uneven)
- Next: Lock Pool → PoolLocked

**PoolLocked:**
- Purpose: Assign players to teams
- Action: Auto-balance or manual assignment
- Requirement: All slots filled (based on `actualSizeA` + `actualSizeB`)
- Next: Confirm Teams → TeamsBalanced

**TeamsBalanced:**
- Purpose: Play match and enter results
- Action: Enter team scores
- Requirement: Valid scores (≥ 0)
- Next: Complete Match → Completed

**Completed:**
- Purpose: Match finished, stats calculated
- Action: Undo if needed
- Undo: Removes match results, returns to TeamsBalanced

### State Transitions

**Lock Pool** (`Draft → PoolLocked`):
- Validates exactly `teamSize * 2` players selected (or custom for uneven)
- Updates `state = 'PoolLocked'`
- Increments `state_version` (optimistic locking)

**Confirm Teams** (`PoolLocked → TeamsBalanced`):
- Validates all team slots filled
- Updates `state = 'TeamsBalanced'`
- Sets `is_balanced = true`

**Complete Match** (`TeamsBalanced → Completed`):
- Creates `matches` record with scores
- Creates `player_matches` records with stats
- Triggers background stats update
- Updates `state = 'Completed'`, `is_completed = true`

**Undo Completion** (`Completed → TeamsBalanced`):
- Soft-deletes `matches` record
- Soft-deletes `player_matches` records
- Updates `state = 'TeamsBalanced'`, `is_completed = false`

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
- Validates: Player count matches requirements
- Body: `{ playerIds: number[] }`

**`PATCH /api/admin/upcoming-matches/[id]/confirm-teams`**
- Transition: PoolLocked → TeamsBalanced
- Validates: All slots filled
- Body: None (uses current assignments)

**`POST /api/admin/upcoming-matches/[id]/complete`**
- Transition: TeamsBalanced → Completed
- Creates match results
- Triggers stats update job
- Body: `{ team_a_score, team_b_score }`

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

**`POST /api/admin/upcoming-match-players/clear`**
- Clear all team assignments
- Body: `{ upcoming_match_id }`

**`POST /api/admin/balance-teams`**
- Auto-balance teams using selected algorithm
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

**Best for:** Even teams (8v8, 9v9) where positions matter

**See:** `SPEC_balance_by_rating_algorithm.md` for complete spec

### 2. Balance by Performance (EWMA-Based)

**Method:** Multi-objective optimization with power ratings

**Process:**
1. Fetch EWMA power ratings and goal threat
2. Modified snake draft distribution
3. Hill-climbing optimization (2000 iterations)
4. Minimize combined loss across metrics

**Best for:** All team sizes, performance-based fairness

**See:** `SPEC_balance_by_performance_algorithm.md` for complete spec

### 3. Random Assignment

**Method:** Shuffle and distribute

**Process:**
1. Shuffle player array randomly
2. Assign alternating to Team A and Team B
3. No optimization

**Best for:** Quick distribution, uneven teams

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

**Layout:**
```
┌─────────────────────────────────┐
│ StepperBar (4 steps)            │
├─────────────────────────────────┤
│ Match Metadata (date, size)     │
├─────────────────────────────────┤
│ Current Step Content:           │
│ - Draft: PlayerPoolPane         │
│ - PoolLocked: BalanceTeamsPane  │
│ - TeamsBalanced: ResultPane     │
│ - Completed: CompletionPane     │
├─────────────────────────────────┤
│ GlobalCtaBar (mobile-fixed)     │
└─────────────────────────────────┘
```

**State-Driven Rendering:**
```typescript
{matchData.state === 'Draft' && <PlayerPoolPane />}
{matchData.state === 'PoolLocked' && <BalanceTeamsPane />}
{matchData.state === 'TeamsBalanced' && <ResultPane />}
{matchData.state === 'Completed' && <CompletionPane />}
```

### PlayerPoolPane

**Purpose:** Select which players will participate

**UI:**
- List of available players (checkboxes)
- Selected count display
- Validation: Must select exactly `teamSize * 2`
- Primary action: "Lock Pool"

### BalanceTeamsPane

**Purpose:** Assign players to teams

**UI:**
- Two team columns (Team A, Team B)
- Drag & drop player assignment
- Balance algorithm selector
- TornadoChart team analysis
- Balance score display
- Primary action: "Confirm Teams"

**Key Pattern:**
```typescript
// Confirm enabled when all slots filled (not when balanced)
const allSlotsFilled = teamA.length === actualSizeA 
                    && teamB.length === actualSizeB;

<button disabled={!allSlotsFilled}>
  Confirm Teams
</button>
```

### ResultPane

**Purpose:** Enter match results

**UI:**
- Team score inputs
- Submit button
- Match summary
- Primary action: "Complete Match"

### CompletionPane

**Purpose:** Show completed match

**UI:**
- Final scores
- Stats update status
- Undo button (if needed)
- Link to match report

---

## Mobile Optimization

### GlobalCtaBar (Mobile-Fixed Pattern)

**Desktop:** Inline button at bottom of content  
**Mobile:** Fixed to bottom of screen (always visible)

```css
/* Mobile: Fixed positioning */
.max-md:fixed
.max-md:bottom-0
.max-md:left-0
.max-md:right-0
.max-md:z-30
.max-md:p-4
.max-md:bg-white
.max-md:shadow-soft-xl-top

/* Desktop: Inline positioning */
.md:relative
.md:mt-6
```

**Why:** On mobile, primary action always accessible (no scrolling to find button)

### Touch-Friendly Interactions

**Drag & Drop:**
- Large touch targets (48px minimum)
- Visual feedback on drag
- Drop zones clearly indicated
- Works on desktop mouse + mobile touch

**Buttons:**
- Minimum 44px height (Apple HIG)
- Clear labels (no icon-only on mobile)
- Loading states prevent double-tap

---

## Configuration Management

### Team Names

**Storage:** `app_config` table
```typescript
config_key: 'team_a_name' | 'team_b_name'
config_value: 'Orange' | 'Green' | custom
```

**UI:** Editable in match settings

### Balance Weights

**Storage:** `team_balance_weights` table
```typescript
position_group: 'defense' | 'midfield' | 'attack'
attribute: 'goalscoring' | 'defending' | ...
weight: Decimal  // 0.00-1.00
```

**UI:** Sliders in `/admin/setup/balance` page

**See:** `SPEC_balance_by_rating_algorithm.md` for details

### Team Templates

**Storage:** `team_size_templates` table
```typescript
team_size: 8     // Total team size
defenders: 2     // Formation
midfielders: 4
attackers: 2
```

**UI:** Dropdown in match creation

---

## Error Handling

### Validation Errors

**Player Count Mismatch:**
```typescript
if (playerIds.length !== teamSize * 2) {
  throw new Error(`Need exactly ${teamSize * 2} players`);
}
```

**Slots Not Filled:**
```typescript
if (teamAPlayers.length !== actualSizeA || teamBPlayers.length !== actualSizeB) {
  throw new Error('All team slots must be filled');
}
```

### Concurrency Control

**Optimistic Locking:**
```typescript
// Check state_version to prevent race conditions
await prisma.upcoming_matches.update({
  where: {
    upcoming_match_id: matchId,
    state_version: currentVersion  // Must match
  },
  data: {
    state: 'PoolLocked',
    state_version: currentVersion + 1
  }
});
```

**If version mismatch:** Return 409 Conflict error

### User Experience

**Loading States:**
- Buttons show "Processing..." during API calls
- Spinner for long operations (balancing teams)
- Success/error toasts after actions

**Optimistic Updates:**
- UI updates immediately
- Rollback if API call fails
- Clear error messages

---

## Key Implementation Notes

### Match Completion Triggers Stats Update

**When match completed:**
```typescript
// Trigger background job (non-blocking)
await fetch('/api/admin/enqueue-stats-job', {
  method: 'POST',
  body: JSON.stringify({
    triggeredBy: 'post-match',
    matchId: matchData.id,
    tenantId: tenantId
  })
});
```

**Stats updated (30-60 seconds):**
- Half season and full season stats
- All-time stats
- Hall of fame
- Recent performance
- Season honours
- Match report cache
- Personal bests
- Player profile stats
- Season race data
- Power ratings

**See:** `SPEC_background_jobs.md` for complete job system

### Uneven Teams Validation

**Total Players Requirement:**
```typescript
// Even teams: team_size * 2
// Uneven teams: actual_size_a + actual_size_b

const requiredPlayers = actual_size_a 
  ? actual_size_a + actual_size_b 
  : team_size * 2;

if (playerIds.length !== requiredPlayers) {
  throw new Error(`Need exactly ${requiredPlayers} players`);
}
```

**Algorithm Restrictions:**
- **Ability balancing:** Disabled for uneven teams (algorithm integrity)
- **Performance balancing:** Fully supported (works any size)
- **Random assignment:** Fully supported

### Drag & Drop Implementation

**Library:** `react-beautiful-dnd`

**Pattern:**
```typescript
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="team-a">
    {(provided) => (
      <div ref={provided.innerRef} {...provided.droppableProps}>
        {teamA.map((player, index) => (
          <Draggable key={player.id} draggableId={player.id} index={index}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                {player.name}
              </div>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

**Mobile Support:** Touch-friendly with visual feedback

---

## Performance Considerations

### Query Optimization

**Fetch match with relations:**
```typescript
const match = await prisma.upcoming_matches.findUnique({
  where: { upcoming_match_id: matchId },
  include: {
    upcoming_match_players: {
      include: { players: true }
    },
    match_player_pool: {
      include: { players: true }
    }
  }
});
```

**Tenant filtering:** All queries use `withTenantFilter(tenantId)`

### Balance Algorithm Performance

**Ability (Brute Force):**
- Time: O(n!) for combinations
- Practical limit: 18 players max
- Duration: 1-3 seconds for 8v8

**Performance (Hill Climbing):**
- Time: O(n × iterations) ≈ 2000 iterations
- No practical limit
- Duration: 100-500ms for any size

**Random:**
- Time: O(n)
- Instant (< 10ms)

---

## Related Specifications

- **Team Balancing (Ability):** `SPEC_balance_by_rating_algorithm.md`
- **Team Balancing (Performance):** `SPEC_balance_by_performance_algorithm.md`
- **Match Report Dashboard:** `SPEC_match-report.md`
- **Background Jobs:** `SPEC_background_jobs.md`
- **Multi-Tenancy:** `SPEC_multi_tenancy.md`

---

## Future Enhancements

**Not Yet Implemented:**
- [ ] Match templates (save common configurations)
- [ ] Bulk match creation (create 10 weeks at once)
- [ ] Player position preferences
- [ ] Advanced balance constraints (keep pairs together/apart)
- [ ] Match reminders/notifications
- [ ] Weather integration
- [ ] Pitch availability calendar

**See:** `FUTURE_PROBLEMS.md` for additional roadmap items

---

**Document Status:** ✅ Production Complete  
**Last Updated:** November 26, 2025  
**Version:** 1.0

**For detailed component implementation:** See original (if needed)  
**For balance algorithm math:** See `SPEC_balance_by_performance_algorithm.md` and `SPEC_balance_by_rating_algorithm.md`
