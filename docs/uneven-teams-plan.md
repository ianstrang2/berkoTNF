Final Specification for Enabling Uneven Teams in Capo App (v1.9.1 - Production Polish)
Version: 1.9.1

Date: January 2025

Author: User Feedback + LLM Technical Review + Production Polish + Cursor Implementation

**CHANGELOG v1.9.2 - DRAG-AND-DROP FIXES (January 2025):**
- **Deferrable constraints**: Replaced partial index with proper deferrable UNIQUE constraint
- **Atomic swap endpoint**: New `/api/admin/upcoming-match-players/swap` for conflict-free operations
- **Slot numbering optimization**: Reverted to 1-N numbering for both teams with atomic backend handling
- **Conflict detection enhancement**: Frontend properly detects all swap scenarios (team-to-team, pool-to-team)
- **Transaction integrity**: Single database transaction handles both player moves atomically
- **Error diagnosis improvement**: Enhanced logging and debugging for constraint violations
- **Production reliability**: Comprehensive testing of drag-and-drop operations for all team configurations

**CHANGELOG v1.9.1 - PRODUCTION POLISH:**
- **Concurrency safety**: Proper 409 handling for stale state_version conflicts in lock-pool
- **Data integrity**: Duplicate player ID validation and database slot uniqueness constraints
- **Algorithm consistency**: All balancers (including Ability) accept size parameters for uniformity
- **Fisher-Yates shuffle**: Proper random distribution algorithm replaces poor 0.5-Math.random() method
- **Template edge cases**: Explicit 4v4 handling and improved bounds checking for all team sizes
- **API consistency**: Uniform return shapes across all balancing algorithms
- **UX improvements**: Modal ESC/backdrop close, idempotent actions, consistent error handling
- **Constants centralization**: Single source of truth for MIN_PLAYERS/MAX_PLAYERS/MIN_TEAM limits
- **Input validation**: Lock-pool verifies state_version type and player existence checks
- **DnD capacity guards**: Manual team assignment enforces actual_size_a/b capacity limits
- **Confirm-teams validation**: Team count and slot range verification before TeamsBalanced
- **Seeded randomization**: Optional deterministic shuffle for reproducible testing
- **Copy consistency**: Centralized "Performance/Random only" text prevents drift
- **Prisma uniqueness**: Player composite key constraint for DnD updates
- **Friendly error handling**: Duplicate slot detection before DB constraint violations
- **Availability filtering**: Optional OUT player rejection in lock-pool
- **Chart display constants**: MIN_CHART_PLAYERS threshold for design consistency
- **Concurrency symmetry**: All state transitions use updateMany with state_version checks
- **Type safety**: Team enum and consistent number types for IDs throughout APIs
- **Database portability**: Documented Postgres 12+ requirement for partial indexes
- **Property testing**: Comprehensive test coverage for split logic and template derivation
- **Runtime validation**: Zod schemas for API boundary protection and data transformation
- **Strict TypeScript**: Enhanced compiler options prevent entire classes of runtime errors
- **Centralized domain types**: Common enums prevent drift across UI/API/algorithms

**CHANGELOG v1.9 - TECHNICAL IMPLEMENTATION:**
- **Database schema**: Added `actual_size_a` and `actual_size_b` columns for precise team size tracking
- **Unified split logic**: Centralized `splitSizesFromPool()` utility prevents inconsistencies across algorithms
- **Algorithm updates**: Performance and Random methods now handle uneven teams with explicit size parameters
- **Template derivation**: Deterministic `deriveTemplate()` function scales formations for any team size
- **Transactional API**: Lock-pool operation atomically validates, persists sizes, and updates state
- **State lifecycle**: Clear rules for when actual sizes are set/cleared during state transitions
- **UI state management**: Frontend uses actual sizes as source of truth, not planning `team_size`

**CHANGELOG v1.8 - OPTIMIZED UI FLOW:**
- **Merged blocked modal**: Single "8 players (4v4) is the minimum" modal with "Got It" button for <8 players
- **Hard cap at 22**: Universal 22-player limit (11v11 max) with "Maximum players reached" hint, allows excess over team_size * 2 with auto-adjustment
- **No modals for allowed cases**: Direct lock for >=8 players (even/uneven/4v4) with auto-split handling
- **Balance Modal optimization**: Grayed Ability option in existing modal with subtitle, no toast messages for restrictions
- **Simplified hints**: Essential hints only in existing UI space, removed clutter messages
- **Removed status notes**: Deleted info boxes from BalanceTeamsPane and CompleteMatchForm
- **Apple-style UX**: "Just works" clean UI with minimal friction, reusing existing patterns

**CHANGELOG v1.6 - STRICT 4v4 MINIMUM:**
- **Strict 8-player minimum**: Block any pool <8 players (no 3v4, 3v3, etc.)
- **4v4 simplification**: Exactly 8 players treated as simplified case (all midfielders, Performance/Random only)
- **Ability balancing restriction**: Disabled for ANY uneven team (4v4, 4v5, 5v6, etc.) to preserve existing algorithm
- **Enhanced blocking**: No proceed option for <8 players, only "Add Players" or "Cancel"
- **Team minimum enforcement**: Both teams must have >=4 players in any split
- **Clear 4v4 vs 5v5+ distinction**: 8 players = simplified, 9+ players = full positional treatment
- **Updated modal messaging**: Clear guidance for blocked vs allowed scenarios with balancing restrictions

Purpose: Enable **flexible team management** with optimized UI flow. Universal 22-player hard cap (11v11 max) allowing excess over team_size * 2 with auto-adjustment, direct lock for viable matches (>=8 players), and streamlined guidance through existing UI patterns. **Ability balancing is disabled for ALL uneven teams** to preserve the existing algorithm, with clear visual indicators in the existing Balance Modal.

## Key Design Principles

**Apple-Style "Just Works"**: Minimal friction UI with direct actions for viable scenarios, single modal for blocked cases.

**Hard Cap with Excess Allowance**: Universal 22-player limit (11v11 max) with "Maximum players reached" hint, allows excess over team_size * 2 with auto-adjustment (floor/ceil split, scaled formations).

**Direct Lock Flow**: No confirmation modals for viable matches (>=8 players) - direct lock with auto-split handling.

**Ability Balancing Restriction**: Disabled for ANY uneven team (including 4v4 simplified matches and uneven splits like 4v5, 5v6) with visual indicators in existing Balance Modal structure.

**Reuse Existing Patterns**: Leverage existing hint area, SoftUIConfirmationModal, Balance Modal radio buttons, and UI styling without adding new elements.

**Essential Hints Only**: Simplified messaging in existing UI space, removing clutter and redundant guidance.

**Mobile-First Touch Targets**: 48px minimum button sizes, full-screen modals, optimized for thumb navigation.

## Implementation Changes

**Phase 0: Database Schema Updates**

Add actual team size tracking and data integrity constraints:

```sql
-- Prisma migration or direct SQL
ALTER TABLE upcoming_matches ADD COLUMN actual_size_a INTEGER;
ALTER TABLE upcoming_matches ADD COLUMN actual_size_b INTEGER;

-- Add deferrable slot uniqueness constraint for atomic drag-and-drop operations
-- IMPORTANT: Must be a constraint (not index) to support DEFERRABLE
-- This allows temporary unique violations within a transaction
ALTER TABLE upcoming_match_players
ADD CONSTRAINT uniq_match_team_slot
UNIQUE (upcoming_match_id, team, slot_number)
DEFERRABLE INITIALLY DEFERRED;

-- Add Prisma composite unique constraint for DnD updates
-- This enables where: { upcoming_match_id_player_id: { upcoming_match_id, player_id } }
ALTER TABLE upcoming_match_players 
ADD CONSTRAINT upcoming_match_id_player_id_unique 
UNIQUE (upcoming_match_id, player_id);

-- Database Requirements: PostgreSQL 12+
-- NOTE: DEFERRABLE constraints require PostgreSQL
-- The constraint allows temporary unique violations within a single transaction
-- enabling atomic player swaps without intermediate constraint violations

-- For Unassigned players: slot_number = NULL, which doesn't violate uniqueness
-- (PostgreSQL treats multiple NULLs as distinct for unique constraints)

-- Production deployment: This constraint is NOT deferrable by default
-- so it can be added safely without affecting existing operations
```

**State Lifecycle Rules:**
- **Draft → PoolLocked**: Set both `actual_size_a` and `actual_size_b` from split calculation
- **PoolLocked → Draft**: Set both to `NULL` (clear actual sizes)
- **PoolLocked → TeamsBalanced**: Keep both values (still need for balancing)
- **TeamsBalanced → PoolLocked**: Keep both values (preserve split)

**Data Invariants:**
- When `state = 'PoolLocked'` OR `state = 'TeamsBalanced'`: both columns are NOT NULL
- `actual_size_a + actual_size_b = poolSize`
- `actual_size_a >= 4` AND `actual_size_b >= 4`
- `8 <= (actual_size_a + actual_size_b) <= 22`

**Phase 0a: Shared Utilities with Constants**

Create centralized split logic and constants to prevent inconsistencies:

```typescript
// src/utils/teamSplit.util.ts
// Single source of truth for all limits
export const MIN_PLAYERS = 8;
export const MAX_PLAYERS = 22;
export const MIN_TEAM = 4;
export const MIN_CHART_PLAYERS = 10; // Minimum for TornadoChart display

export function splitSizesFromPool(poolSize: number): { a: number; b: number } {
  return { 
    a: Math.floor(poolSize / 2), 
    b: Math.ceil(poolSize / 2) 
  };
}

// Unified CTA enablement logic using constants
export function getPoolValidation(poolSize: number) {
  const disabled = poolSize > MAX_PLAYERS;  // only hard-cap disables button
  const blocked = poolSize < MIN_PLAYERS;   // handled by the single modal
  return { disabled, blocked };
}
```

**Phase 1: Always-Enabled Lock Pool Button with Hard Cap**

`src/app/admin/matches/[id]/page.tsx`:
```typescript
// FIND:
disabled = playerPoolIds.length !== matchData.teamSize * 2;

// REPLACE WITH:
import { getPoolValidation } from '@/utils/teamSplit.util';
const { disabled } = getPoolValidation(playerPoolIds.length);
```

`src/components/admin/matches/PlayerPoolPane.component.tsx`:
```typescript
// FIND (assumed):
disabled = playerPoolIds.length >= matchData.teamSize * 2;

// REPLACE WITH:
import { getPoolValidation } from '@/utils/teamSplit.util';
const { disabled } = getPoolValidation(playerPoolIds.length);
```

**Phase 2: Simplified Dynamic Button Hints**

Update hint calculation with essential messaging only:
```typescript
// src/app/admin/matches/[id]/page.tsx - modify existing useMemo around line 114
import { splitSizesFromPool, getPoolValidation, COPY_CONSTANTS } from '@/utils/teamSplit.util';

const { currentStep, primaryLabel, primaryAction, primaryDisabled, buttonHint } = useMemo(() => {
  // ... existing logic ...
  
  if (matchData.state === 'Draft') {
    const poolSize = playerPoolIds.length;
    const targetSize = matchData.teamSize * 2;
    const { a: sizeA, b: sizeB } = splitSizesFromPool(poolSize);
    const { disabled, blocked } = getPoolValidation(poolSize);
    
    let hint = '';
    if (poolSize === 0) {
      hint = 'Add players to begin';
    } else if (blocked) {
      const needed = 8 - poolSize;
      hint = `Need ${needed} more for 4v4 minimum`;
    } else if (poolSize === 8) {
      hint = `Lock 4v4 (all midfielders, ${COPY_CONSTANTS.PERFORMANCE_RANDOM_ONLY})`;
    } else if (disabled) {
      hint = 'Maximum players reached. Remove some?';
    } else if (poolSize === targetSize) {
      hint = `Perfect for ${matchData.teamSize}v${matchData.teamSize}`;
    } else {
      hint = `Lock ${sizeA}v${sizeB}`;
    }
    
    return { 
      // ... existing values ...
      primaryDisabled: disabled,
      buttonHint: hint 
    };
  }
  
  return { /* ... existing logic ... */, buttonHint: '' };
}, [matchData, playerPoolIds, actions]);
```

**Phase 3: Single Blocked Modal System**

Add minimal modal state and direct lock logic:
```typescript
// src/app/admin/matches/[id]/page.tsx
import { getPoolValidation } from '@/utils/teamSplit.util';

// Add single modal state
const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);

// Modify primary action for direct lock or single block modal
action = () => {
  const poolSize = playerPoolIds.length;
  const { blocked } = getPoolValidation(poolSize);
  
  // Single blocking condition: < 8 players
  if (blocked) {
    setIsBlockedModalOpen(true);
    return;
  }
  
  // Direct lock for all viable scenarios (>=8 players)
  actions.lockPool({ playerIds: playerPoolIds.map(id => Number(id)) });
};

// Add single blocked modal component
<SingleBlockedModal 
  isOpen={isBlockedModalOpen}
  onClose={() => setIsBlockedModalOpen(false)}
  poolSize={playerPoolIds.length}
/>
```

**Phase 4: Single Blocked Modal Component**

Create minimal blocked modal:
```typescript
// src/components/admin/matches/SingleBlockedModal.component.tsx
interface SingleBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolSize: number;
}

const SingleBlockedModal = ({ isOpen, onClose, poolSize }: SingleBlockedModalProps) => {
  return (
    <SoftUIConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      title="Too Few Players"
      message="8 players (4v4) is the minimum."
      confirmText="Got It"
      cancelText={undefined}
      icon="warning"
      onConfirm={onClose}
      onCancel={undefined}
    />
  );
};
```

**Phase 5: Transactional Lock Pool API**

`src/app/api/admin/upcoming-matches/[id]/lock-pool/route.ts`:
```typescript
import { splitSizesFromPool, getPoolValidation } from '@/utils/teamSplit.util';

// REPLACE entire validation and transaction logic:
const poolSize = playerIds.length;
const { a: sizeA, b: sizeB } = splitSizesFromPool(poolSize);
const { disabled, blocked } = getPoolValidation(poolSize);

// Enhanced input validation with full guardrails
if (typeof state_version !== 'number') {
  return NextResponse.json({ 
    success: false, 
    error: 'Missing or invalid state_version'
  }, { status: 400 });
}

// Critical: Validate unique player IDs to prevent data corruption
if (new Set(playerIds).size !== playerIds.length) {
  return NextResponse.json({
    success: false,
    error: 'Duplicate player IDs detected'
  }, { status: 400 });
}

// Verify all player IDs exist and optionally check availability status
const existingPlayers = await prisma.players.findMany({
  where: { player_id: { in: playerIds } },
  select: { player_id: true }
});
if (existingPlayers.length !== playerIds.length) {
  return NextResponse.json({ 
    success: false, 
    error: 'Unknown or invalid player IDs detected'
  }, { status: 400 });
}

// Optional: Reject players marked as OUT to avoid operator mistakes
// Uncomment if you want to enforce availability checking
/*
const playerAvailability = await prisma.match_player_pool.findMany({
  where: { 
    upcoming_match_id: matchId,
    player_id: { in: playerIds },
    response_status: 'OUT'
  },
  select: { player_id: true }
});
if (playerAvailability.length > 0) {
  return NextResponse.json({ 
    success: false, 
    error: `${playerAvailability.length} players are marked as OUT and cannot be selected`
  }, { status: 400 });
}
*/

// Validation checks using constants
if (disabled) {
  return NextResponse.json({ 
    success: false, 
    error: `Too many players (max ${MAX_PLAYERS} for 11v11). Got ${poolSize}.`
  }, { status: 400 });
}

if (blocked) {
  return NextResponse.json({ 
    success: false, 
    error: `Too few for 4v4 minimum (need ${MIN_PLAYERS}+ players). Got ${poolSize}.`
  }, { status: 400 });
}

// Both teams must have at least MIN_TEAM players (defensive check)
if (sizeA < MIN_TEAM || sizeB < MIN_TEAM) {
  return NextResponse.json({ 
    success: false, 
    error: `Teams too small (${sizeA}v${sizeB}). Both teams need ${MIN_TEAM}+ players.`
  }, { status: 400 });
}

const updatedMatch = await prisma.$transaction(async (tx) => {
  // 1. Clear existing player pool
  await tx.upcoming_match_players.deleteMany({
    where: { upcoming_match_id: matchId },
  });

  // 2. Create new player pool
  await tx.upcoming_match_players.createMany({
    data: playerIds.map((playerId: number) => ({
      upcoming_match_id: matchId,
      player_id: playerId,
      team: 'Unassigned',
    })),
  });

  // 3. Update match state with actual team sizes and proper concurrency handling
  const updateResult = await tx.upcoming_matches.updateMany({
    where: { 
      upcoming_match_id: matchId,
      state_version: state_version // Concurrency check
    },
    data: {
      state: 'PoolLocked',
      actual_size_a: sizeA,      // NEW: Persist actual team sizes
      actual_size_b: sizeB,      // NEW: Source of truth for downstream
      state_version: {
        increment: 1,
      },
    },
  });

  // Critical: Handle concurrency conflicts properly
  if (updateResult.count === 0) {
    throw new Error('CONCURRENCY_CONFLICT');
  }

  // Return the updated match
  return await tx.upcoming_matches.findUnique({
    where: { upcoming_match_id: matchId }
  });
});

const isSimplified = poolSize === 8; // Exactly 4v4
const isUneven = sizeA !== sizeB; // Any uneven split

return NextResponse.json({ 
  success: true, 
  data: updatedMatch,
  splitInfo: { sizeA, sizeB, isUneven, isSimplified }
});

} catch (error: any) {
  // Handle concurrency conflicts with proper 409 status
  if (error.message === 'CONCURRENCY_CONFLICT') {
    return NextResponse.json({ 
      success: false, 
      error: 'Match was updated by another user. Please refresh and try again.'
    }, { status: 409 });
  }
  
  console.error('Error locking pool:', error);
  return NextResponse.json({ 
    success: false, 
    error: 'An unexpected error occurred.' 
  }, { status: 500 });
}
```

**Phase 6: Updated Balance Teams API with Algorithm Support**

`src/app/api/admin/balance-teams/route.ts`:
```typescript
import { splitSizesFromPool } from '@/utils/teamSplit.util';

export async function POST(request: Request) {
  try {
    const { matchId, playerIds, method } = await request.json();
    
    // Get match info including actual team sizes
    const match = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: parseInt(matchId) },
      select: { 
        actual_size_a: true, 
        actual_size_b: true, 
        team_size: true,
        state: true 
      }
    });
    
    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }
    
    // Use actual sizes as source of truth if available, otherwise calculate
    let sizeA, sizeB;
    if (match.actual_size_a && match.actual_size_b) {
      sizeA = match.actual_size_a;
      sizeB = match.actual_size_b;
    } else {
      const sizes = splitSizesFromPool(playerIds.length);
      sizeA = sizes.a;
      sizeB = sizes.b;
    }
    
    const isUneven = sizeA !== sizeB;
    const isSimplified = (sizeA + sizeB) === 8;
    
    // Block Ability balancing for ANY uneven team (4v4 or larger splits like 4v5, 5v6)
    if (method === 'ability' && (isUneven || isSimplified)) {
      return NextResponse.json({
        success: false,
        error: 'Ability balancing not supported for uneven teams. Use Performance or Random.',
      }, { status: 400 });
    }
    
    // Route to appropriate balancing algorithm with size information and concurrency control
    // NOTE: All algorithms now accept sizes and state_version for consistency
    const { state_version } = await request.json();
    
    if (method === 'ability') {
      // IMPORTANT: Ensure balanceByRating signature is updated to accept sizes and state_version
      // export async function balanceByRating(matchId: number, playerIds: number[], sizes: { a: number; b: number }, state_version?: number)
      const result = await balanceByRating(parseInt(matchId, 10), playerIds.map(Number), { a: sizeA, b: sizeB }, state_version);
      return NextResponse.json(result);
    } else if (method === 'performance') {
      const result = await balanceByPerformance(parseInt(matchId, 10), playerIds.map(Number), { a: sizeA, b: sizeB }, state_version);
      return NextResponse.json(result);
    } else if (method === 'random') {
      // Wrap helper result for HTTP consistency
      const result = await randomBalance(parseInt(matchId, 10), playerIds.map(Number), { a: sizeA, b: sizeB }, undefined, state_version);
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid balance method' }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('Error in balance teams:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

**Phase 6a: Update Performance Algorithm**

`src/app/api/admin/balance-teams/balanceByPerformance.ts`:
```typescript
export async function balanceByPerformance(
  matchId: number, 
  playerIds: number[], 
  sizes: { a: number; b: number },
  state_version?: number // For concurrency control
) {
  const matchIdInt = matchId;
  const playerIdsInt = playerIds;

  // Enhanced validation with proper bounds checking using constants
  const poolSize = playerIdsInt.length;
  if (poolSize < MIN_PLAYERS || poolSize > MAX_PLAYERS) {
    throw new Error(`Invalid player count. Expected ${MIN_PLAYERS}-${MAX_PLAYERS}, got ${poolSize}.`);
  }
  
  if (sizes.a + sizes.b !== poolSize) {
    throw new Error(`Size mismatch. Expected ${sizes.a}+${sizes.b}=${sizes.a + sizes.b}, got ${poolSize}.`);
  }
  
  // ... existing performance algorithm logic ...
  
  // Convert to assignment format using actual team sizes
  const assignments = [
    ...result.teamA.slice(0, sizes.a).map((playerId, i) => ({ 
      player_id: playerId, 
      team: 'A', 
      slot_number: i + 1 
    })),
    ...result.teamB.slice(0, sizes.b).map((playerId, i) => ({ 
      player_id: playerId, 
      team: 'B', 
      slot_number: i + 1 
    })),
  ];
  
  // Atomically update assignments with concurrency control
  await prisma.$transaction(async (tx) => {
    // Clear and recreate assignments
    await tx.upcoming_match_players.deleteMany({
      where: { upcoming_match_id: matchIdInt }
    });
    
    await tx.upcoming_match_players.createMany({
      data: assignments
    });
    
    // Update match state with concurrency check
    if (state_version !== undefined) {
      const updateResult = await tx.upcoming_matches.updateMany({
        where: { 
          upcoming_match_id: matchIdInt,
          state_version: state_version
        },
        data: { 
          is_balanced: true,
          state_version: { increment: 1 }
        }
      });
      
      if (updateResult.count === 0) {
        throw new Error('CONCURRENCY_CONFLICT');
      }
    } else {
      // Fallback for cases without state_version
      await tx.upcoming_matches.update({
        where: { upcoming_match_id: matchIdInt },
        data: { is_balanced: true }
      });
    }
  });
  
  // Ensure consistent return format matching Random/Ability
  return {
    success: true,
    data: {
      assignments,
      is_balanced: true,
      balanceType: 'performance'
    }
  };
}
```

**Phase 6b: Update Random Algorithm with Seeded Fisher-Yates**

`src/app/api/admin/random-balance-match/route.ts`:
```typescript
// Seeded random number generator for reproducible testing
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle with optional seeding
function shuffle(ids: number[], seedStr?: string): number[] {
  const rnd = seedStr 
    ? mulberry32([...seedStr].reduce((a, c) => a + c.charCodeAt(0), 0))
    : Math.random;
  
  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function randomBalance(
  matchId: number, // Keep numeric end-to-end
  playerIds: number[], 
  sizes: { a: number; b: number },
  seed?: string, // Optional for reproducible testing
  state_version?: number // For concurrency control
) {
  const matchIdInt = matchId;
  
  // Enhanced validation with proper bounds checking using constants
  const poolSize = playerIds.length;
  if (poolSize < MIN_PLAYERS || poolSize > MAX_PLAYERS) {
    throw new Error(`Invalid player count. Expected ${MIN_PLAYERS}-${MAX_PLAYERS}, got ${poolSize}.`);
  }
  
  if (sizes.a + sizes.b !== poolSize) {
    throw new Error(`Size mismatch. Expected ${sizes.a}+${sizes.b}=${sizes.a + sizes.b}, got ${poolSize}.`);
  }
  
  // Proper Fisher-Yates shuffle with optional seeding
  const shuffledIds = shuffle(playerIds, seed);
  
  // Split using actual sizes
  const teamA = shuffledIds.slice(0, sizes.a);
  const teamB = shuffledIds.slice(sizes.a, sizes.a + sizes.b);
  
  // Create slot assignments using actual sizes
  const assignments = [
    ...teamA.map((playerId, i) => ({
      upcoming_match_id: matchIdInt,
      player_id: playerId,
      team: 'A',
      slot_number: i + 1 // Slots 1 to sizes.a
    })),
    ...teamB.map((playerId, i) => ({
      upcoming_match_id: matchIdInt,
      player_id: playerId,
      team: 'B',
      slot_number: i + 1 // Slots 1 to sizes.b
    })),
  ];
  
  // Atomically update assignments with concurrency control
  await prisma.$transaction(async (tx) => {
    // Clear and recreate assignments
    await tx.upcoming_match_players.deleteMany({
      where: { upcoming_match_id: matchIdInt }
    });
    
    await tx.upcoming_match_players.createMany({
      data: assignments
    });
    
    // Update match state with concurrency check
    if (state_version !== undefined) {
      const updateResult = await tx.upcoming_matches.updateMany({
        where: { 
          upcoming_match_id: matchIdInt,
          state_version: state_version
        },
        data: { 
          is_balanced: true,
          state_version: { increment: 1 }
        }
      });
      
      if (updateResult.count === 0) {
        throw new Error('CONCURRENCY_CONFLICT');
      }
    } else {
      // Fallback for cases without state_version
      await tx.upcoming_matches.update({
        where: { upcoming_match_id: matchIdInt },
        data: { is_balanced: true }
      });
    }
  });
  
  // Ensure consistent return format (wrapped by route handler)
  return {
    success: true,
    data: {
      assignments,
      is_balanced: true,
      balanceType: 'random'
    }
  };
}

// Route handler wraps helper result for HTTP consistency
export async function POST(request: Request) {
  try {
    const { matchId, playerIds, sizes, seed, state_version } = await request.json();
    
    // Type conversion at route boundary
    const matchIdNum = parseInt(matchId, 10);
    const playerIdsNum = playerIds.map((id: string) => parseInt(id, 10));
    
    const result = await randomBalance(matchIdNum, playerIdsNum, sizes, seed, state_version);
    return NextResponse.json(result);
  } catch (error: any) {
    // Handle concurrency conflicts
    if (error.message === 'CONCURRENCY_CONFLICT') {
      return NextResponse.json({ 
        success: false, 
        error: 'Match was updated by another user. Please refresh and try again.' 
      }, { status: 409 });
    }
    
    console.error('Error in random balance:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
```

**Phase 7: Template Derivation System**

Create deterministic formation scaling:

```typescript
// src/utils/teamFormation.util.ts
type Formation = { def: number; mid: number; att: number };

interface TeamSizeTemplate {
  team_size: number;
  defenders: number;
  midfielders: number;
  attackers: number;
}

export function deriveTemplate(teamSize: number): Formation {
  // Explicit 4v4 handling to prevent accidental template calls
  if (teamSize === 4) return { def: 0, mid: 4, att: 0 };
  
  // Get nearest base template (from database or hardcoded)
  const baseTemplate = getNearestTemplate(teamSize);
  const total = baseTemplate.def + baseTemplate.mid + baseTemplate.att;
  
  if (total === teamSize) return baseTemplate;

  const weights = [
    { k: 'def', v: baseTemplate.def },
    { k: 'mid', v: baseTemplate.mid },
    { k: 'att', v: baseTemplate.att },
  ].sort((a, b) => b.v - a.v); // largest first

  let result: Formation = { ...baseTemplate };
  
  // Scale up: add to largest positions first (favoring MID, then DEF)
  while ((result.def + result.mid + result.att) < teamSize) {
    const pick = weights[0].k === 'mid' ? 'mid' : weights[0].k;
    result[pick as keyof Formation]++;
    // Re-sort based on current result values (not stale v)
    weights.sort((a, b) => (result[b.k as keyof Formation] - result[a.k as keyof Formation]));
  }
  
  // Scale down: remove from smallest positions (favoring ATT first)
  while ((result.def + result.mid + result.att) > teamSize) {
    const order = ['att', 'def', 'mid'];
    for (const k of order) {
      if (result[k as keyof Formation] > 1) { 
        result[k as keyof Formation]--; 
        break; 
      }
    }
  }
  
  return result;
}

function getNearestTemplate(teamSize: number): Formation {
  // Enhanced base templates with proper bounds
  if (teamSize <= 6) return { def: 2, mid: teamSize - 3, att: 1 };
  if (teamSize <= 8) return { def: 2, mid: teamSize - 4, att: 2 };
  if (teamSize === 9) return { def: 3, mid: 4, att: 2 };
  if (teamSize === 10) return { def: 4, mid: 3, att: 3 }; // 4-3-3 style
  if (teamSize >= 11) return { def: 4, mid: 4, att: 3 }; // 4-4-3 style (explicitly capped at 11)
  return { def: 3, mid: 3, att: 2 }; // fallback
}

// Unit test guardrails for common team sizes
// deriveTemplate(5) → { def: 2, mid: 2, att: 1 } (2-2-1)
// deriveTemplate(7) → { def: 2, mid: 3, att: 2 } (2-3-2)
// deriveTemplate(10) → { def: 4, mid: 3, att: 3 } (4-3-3)
// deriveTemplate(11) → { def: 4, mid: 4, att: 3 } (4-4-3)
```

**Phase 7a: BalanceTeamsPane Updates**

`src/components/admin/matches/BalanceTeamsPane.component.tsx`:
```typescript
// Import constants for consistency
import { MIN_CHART_PLAYERS } from '@/utils/teamSplit.util';

// Add team state detection using actual sizes from match data
const totalPlayers = teamA.length + teamB.length;
const isSimplified = totalPlayers === 8; // Exactly 4v4
const isUneven = teamA.length !== teamB.length; // Any uneven split

// Get actual team sizes from match data (source of truth)
const actualSizeA = matchData?.actual_size_a || Math.floor(totalPlayers / 2);
const actualSizeB = matchData?.actual_size_b || Math.ceil(totalPlayers / 2);

// TornadoChart display rules using constant with defensive guard
const shouldShowTornadoChart = !isSimplified && !isUneven && totalPlayers >= MIN_CHART_PLAYERS && teamStatsData && balanceWeights;

// Defensive UI guard: never render chart for uneven or small teams
if (isUneven || totalPlayers < MIN_CHART_PLAYERS) {
  // Chart component should not be rendered at all
  shouldShowTornadoChart = false;
}

// Use actual sizes for slot rendering
const renderTeamColumn = (teamName: 'A' | 'B') => {
  const teamSize = teamName === 'A' ? actualSizeA : actualSizeB;
  const slots = Array.from({ length: teamSize }, (_, i) => i + 1);
  
  if (isSimplified) {
    // Flat list for 4v4 matches - all midfielders
    return (
      <div className="space-y-1">
        <h3 className="font-bold text-slate-700 text-lg text-center mb-3">
          {teamName === 'A' ? 'Orange' : 'Green'} (All Midfielders)
        </h3>
        {slots.map((slotIndex) => renderTeamSlot(teamName, slotIndex))}
      </div>
    );
  }
  
  // Generate formation template for this team size
  const formation = deriveTemplate(teamSize);
  
  // ... positioned rendering using derived formation
};

// REMOVE status note completely (no UI boxes for 4v4 or uneven teams)
```

**Phase 8: UI State Management Updates**

Update frontend to use actual sizes as source of truth:

```typescript
// src/hooks/useMatchState.hook.ts
interface MatchData {
  state: 'Draft' | 'PoolLocked' | 'TeamsBalanced' | 'Completed' | 'Cancelled';
  stateVersion: number;
  teamSize: number;        // Planning tool only
  actualSizeA?: number;    // NEW: Source of truth for team A size
  actualSizeB?: number;    // NEW: Source of truth for team B size
  players: PlayerInPool[];
  isBalanced: boolean;
  updatedAt: string;
  matchDate: string;
  teamAName?: string;
  teamBName?: string;
}

// Update fetchMatchState to include actual sizes
const transformedData: MatchData = {
  state: result.data.state,
  stateVersion: result.data.state_version,
  teamSize: result.data.team_size,
  actualSizeA: result.data.actual_size_a,  // NEW
  actualSizeB: result.data.actual_size_b,  // NEW
  players: result.data.players || [],
  isBalanced: result.data.is_balanced,
  updatedAt: result.data.updated_at,
  matchDate: result.data.match_date,
  teamAName: result.data.team_a_name || 'Orange',
  teamBName: result.data.team_b_name || 'Green',
};
```

**Phase 7b: Manual DnD Capacity Guards**

Add team capacity enforcement to prevent UI overfilling:

```typescript
// src/app/api/admin/upcoming-match-players/route.ts (PUT handler)
export async function PUT(request: Request) {
  try {
    const { player_id, team, slot_number, upcoming_match_id } = await request.json();
    
    // Get match capacity limits
    const match = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id },
      select: { actual_size_a: true, actual_size_b: true }
    });
    
    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }
    
    // Enforce capacity limits for team assignments
    if (team === 'A' || team === 'B') {
      const capacity = team === 'A' ? match.actual_size_a : match.actual_size_b;
      
      if (!capacity) {
        return NextResponse.json({ 
          success: false, 
          error: 'Team sizes not set. Lock pool first.' 
        }, { status: 400 });
      }
      
      // Check current team count (excluding this player if reassigning)
      const currentCount = await prisma.upcoming_match_players.count({
        where: {
          upcoming_match_id,
          team,
          player_id: { not: player_id } // Exclude current player
        }
      });
      
      if (currentCount >= capacity) {
        return NextResponse.json({
          success: false,
          error: `Team ${team} at capacity (${capacity} players)`
        }, { status: 400 });
      }
      
      // Validate slot number range
      if (slot_number && slot_number > capacity) {
        return NextResponse.json({
          success: false,
          error: `Slot ${slot_number} exceeds team capacity (${capacity})`
        }, { status: 400 });
      }
    }
    
    // Optional: Preflight check for friendlier error message
    if (team !== 'Unassigned' && slot_number) {
      const existingSlot = await prisma.upcoming_match_players.findFirst({
        where: {
          upcoming_match_id,
          team,
          slot_number,
          player_id: { not: player_id } // Exclude current player
        }
      });
      
      if (existingSlot) {
        return NextResponse.json({
          success: false,
          error: `Slot ${slot_number} is already taken by another player`
        }, { status: 409 });
      }
    }
    
    // Perform the update
    const updatedPlayer = await prisma.upcoming_match_players.update({
      where: { 
        upcoming_match_id_player_id: { 
          upcoming_match_id, 
          player_id 
        } 
      },
      data: { team, slot_number }
    });
    
    return NextResponse.json({ success: true, data: updatedPlayer });
    
  } catch (error: any) {
    // Handle Prisma unique constraint violations gracefully
    if (error.code === 'P2002') {
      return NextResponse.json({
        success: false,
        error: 'Slot already taken by another player'
      }, { status: 409 });
    }
    
    console.error('Error updating player assignment:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
```

**Phase 7c: Confirm Teams Validation**

Add comprehensive validation before TeamsBalanced transition:

```typescript
// src/app/api/admin/upcoming-matches/[id]/confirm-teams/route.ts
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const matchId = parseInt(params.id, 10);
    const { state_version } = await request.json();
    
    // Get match with team assignments
    const match = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: matchId },
      include: {
        players: {
          where: { team: { in: ['A', 'B'] } },
          select: { team: true, slot_number: true }
        }
      }
    });
    
    if (!match || !match.actual_size_a || !match.actual_size_b) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match not found or team sizes not set' 
      }, { status: 404 });
    }
    
    // Count players per team
    const teamACounts = match.players.filter(p => p.team === 'A').length;
    const teamBCounts = match.players.filter(p => p.team === 'B').length;
    
    // Enforce exact team counts
    if (teamACounts !== match.actual_size_a) {
      return NextResponse.json({
        success: false,
        error: `Team A has ${teamACounts} players, expected ${match.actual_size_a}`
      }, { status: 400 });
    }
    
    if (teamBCounts !== match.actual_size_b) {
      return NextResponse.json({
        success: false,
        error: `Team B has ${teamBCounts} players, expected ${match.actual_size_b}`
      }, { status: 400 });
    }
    
    // Enhanced slot validation with friendly error messages
    const teamASlots = match.players.filter(p => p.team === 'A').map(p => p.slot_number);
    const teamBSlots = match.players.filter(p => p.team === 'B').map(p => p.slot_number);
    
    // Filter out null slots and check for duplicates before DB constraint violations
    const aSlots = teamASlots.filter(s => s != null);
    const bSlots = teamBSlots.filter(s => s != null);
    const hasDupA = new Set(aSlots).size !== aSlots.length;
    const hasDupB = new Set(bSlots).size !== bSlots.length;
    
    if (hasDupA || hasDupB) {
      return NextResponse.json({
        success: false,
        error: 'Duplicate slot numbers detected'
      }, { status: 400 });
    }
    
    // Ensure all players have slots assigned
    if (aSlots.length !== match.actual_size_a || bSlots.length !== match.actual_size_b) {
      return NextResponse.json({
        success: false,
        error: 'All players on teams A/B must have a slot assigned'
      }, { status: 400 });
    }
    
    // Check slot ranges
    const invalidA = aSlots.some(slot => slot > match.actual_size_a || slot < 1);
    const invalidB = bSlots.some(slot => slot > match.actual_size_b || slot < 1);
    
    if (invalidA || invalidB) {
      return NextResponse.json({
        success: false,
        error: 'Some slots exceed team capacity or are invalid'
      }, { status: 400 });
    }
    
    // Update match state with concurrency check
    const updateResult = await prisma.upcoming_matches.updateMany({
      where: { 
        upcoming_match_id: matchId,
        state: 'PoolLocked', // State guard: only allow transition from PoolLocked
        state_version: state_version 
      },
      data: {
        state: 'TeamsBalanced',
        state_version: { increment: 1 }
      }
    });
    
    if (updateResult.count === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match was updated by another user. Please refresh and try again.' 
      }, { status: 409 });
    }
    
    const updatedMatch = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: matchId }
    });
    
    return NextResponse.json({ success: true, data: updatedMatch });
    
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        success: false, 
        error: 'Match was updated by another user. Please refresh and try again.' 
      }, { status: 409 });
    }
    
    // Handle Prisma unique constraint violations gracefully
    if (error.code === 'P2002') {
      return NextResponse.json({
        success: false,
        error: 'Slot conflict detected. Please refresh and try again.'
      }, { status: 409 });
    }
    
    console.error('Error confirming teams:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
```

**Phase 8: Copy Consistency Constants**

Centralize text to prevent copy drift:

```typescript
// src/utils/teamSplit.util.ts (add to existing file)
// Type safety for team assignments
export type Team = 'Unassigned' | 'A' | 'B';

export const COPY_CONSTANTS = {
  ABILITY_RESTRICTION: 'Not available for 4v4/uneven teams. Use Performance or Random.',
  PERFORMANCE_RANDOM_ONLY: 'Performance/Random only'
} as const;

export const TEAM_LABELS = {
  A: 'Orange',
  B: 'Green'
} as const;

// Error message guidelines:
// - Server messages: concise and actionable (for API responses)
// - UI-friendly text: lives in COPY_CONSTANTS (for user display)
// This prevents backend strings drifting into the UI
```

**Phase 8a: Enhanced Balance Options Modal with UX Improvements**

`src/components/admin/matches/BalanceOptionsModal.component.tsx`:
```typescript
// Enhanced balance options with visual Ability restriction and improved UX
interface BalanceOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (method: 'ability' | 'performance' | 'random') => void;
  isLoading: boolean;
  isUneven?: boolean;
  isSimplified?: boolean;
}

const BalanceOptionsModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading, 
  isUneven = false, 
  isSimplified = false 
}: BalanceOptionsModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Enhanced UX: Prevent double-clicks and handle ESC/backdrop
  const handleConfirm = useCallback(async (method: 'ability' | 'performance' | 'random') => {
    if (isProcessing || isLoading) return; // Idempotent action
    
    setIsProcessing(true);
    try {
      await onConfirm(method);
    } finally {
      setIsProcessing(false);
    }
  }, [onConfirm, isProcessing, isLoading]);

  // Handle ESC key and backdrop clicks
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isProcessing]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onClose();
    }
  }, [onClose, isProcessing]);

  const balanceOptions = [
    { 
      value: 'ability', 
      label: 'Ability: Use player ratings to create balanced teams',
      description: 'Advanced algorithm using positional ratings',
      disabled: isSimplified || isUneven,
      disabledReason: COPY_CONSTANTS.ABILITY_RESTRICTION
    },
    { 
      value: 'performance', 
      label: 'Performance: Balance based on recent match performance',
      description: 'Uses historical performance data',
      disabled: false
    },
    { 
      value: 'random', 
      label: 'Random: Randomly distribute players',
      description: 'Good for casual play and uneven numbers',
      disabled: false
    },
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
      onClick={handleBackdropClick}
    >
    <SoftUIConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Balancing Method"
      message={`Select how to balance teams${isUneven ? ' (uneven teams detected)' : ''}:`}
      customContent={
        <div className="space-y-3">
          {balanceOptions.map((option) => (
            <button
              key={option.value}
                onClick={() => !option.disabled && handleConfirm(option.value as any)}
                disabled={option.disabled || isLoading || isProcessing}
              className={`w-full p-4 text-left rounded-lg border transition-all ${
                option.disabled
                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-gray-200 hover:border-purple-400 hover:bg-purple-50 cursor-pointer'
              }`}
            >
              <div className="font-medium">{option.label}</div>
              {option.disabled && <div className="text-sm text-gray-600 mt-1">{option.disabledReason}</div>}
              {!option.disabled && <div className="text-sm text-gray-600 mt-1">{option.description}</div>}
            </button>
          ))}
        </div>
      }
      confirmText={undefined}
      cancelText="Cancel"
      onCancel={onClose}
        isConfirming={isProcessing}
    />
    </div>
  );
};
```



**Phase 9: State Transition API Updates**

Update unlock operations to handle actual sizes properly:

```typescript
// src/app/api/admin/upcoming-matches/[id]/unlock-pool/route.ts
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const matchId = parseInt(params.id, 10);
    const { state_version } = await request.json();
    
    const updateResult = await prisma.upcoming_matches.updateMany({
      where: { 
        upcoming_match_id: matchId,
        state: 'PoolLocked', // State guard: only allow unlocking from PoolLocked
        state_version: state_version
      },
      data: {
        state: 'Draft',
        actual_size_a: null,     // Clear actual sizes when returning to Draft
        actual_size_b: null,     // Clear actual sizes when returning to Draft
        is_balanced: false,
        state_version: { increment: 1 },
      },
    });
    
    if (updateResult.count === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match was updated by another user. Please refresh and try again.' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error unlocking pool:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// src/app/api/admin/upcoming-matches/[id]/unlock-teams/route.ts
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const matchId = parseInt(params.id, 10);
    const { state_version } = await request.json();
    
    const updateResult = await prisma.upcoming_matches.updateMany({
      where: { 
        upcoming_match_id: matchId,
        state: 'TeamsBalanced', // State guard: only allow unlocking from TeamsBalanced
        state_version: state_version
      },
      data: {
        state: 'PoolLocked',
        // Keep actual_size_a and actual_size_b (preserve split info)
        is_balanced: false,
        state_version: { increment: 1 },
      },
    });
    
    if (updateResult.count === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match was updated by another user. Please refresh and try again.' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error unlocking teams:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
```

**Phase 9a: Atomic Player Swap Endpoint (Final DnD Solution)**

`src/app/api/admin/upcoming-match-players/swap/route.ts`:
```typescript
// POST: Swap two players atomically in a single transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { upcoming_match_id, playerA, playerB } = body;

    // Validation
    if (!upcoming_match_id || !playerA || !playerB) {
      return NextResponse.json(
        { success: false, error: 'Match ID and both players are required' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Optional: Lock the match for concurrent swap protection
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${upcoming_match_id})`;

      // Lock the two player rows to prevent concurrent modifications
      const players = await tx.$queryRaw<Array<{
        upcoming_player_id: number;
        player_id: number;
        team: string;
        slot_number: number | null;
      }>>`
        SELECT upcoming_player_id, player_id, team, slot_number
        FROM upcoming_match_players
        WHERE upcoming_match_id = ${upcoming_match_id}
          AND player_id IN (${playerA.player_id}, ${playerB.player_id})
        FOR UPDATE
      `;

      if (players.length !== 2) {
        throw new Error('One or both players not found in this match');
      }

      const playerARecord = players.find(p => p.player_id === playerA.player_id);
      const playerBRecord = players.find(p => p.player_id === playerB.player_id);

      // Perform the atomic swap
      // With DEFERRABLE constraint, we can create temporary conflicts
      await tx.upcoming_match_players.update({
        where: { upcoming_player_id: playerARecord.upcoming_player_id },
        data: {
          team: playerA.team,
          slot_number: playerA.team === 'Unassigned' ? null : playerA.slot_number,
        },
      });

      await tx.upcoming_match_players.update({
        where: { upcoming_player_id: playerBRecord.upcoming_player_id },
        data: {
          team: playerB.team,
          slot_number: playerB.team === 'Unassigned' ? null : playerB.slot_number,
        },
      });

      // Mark match as unbalanced
      await tx.upcoming_matches.update({
        where: { upcoming_match_id: upcoming_match_id },
        data: { is_balanced: false }
      });

      return { 
        playerA: { ...playerARecord, team: playerA.team, slot_number: playerA.slot_number },
        playerB: { ...playerBRecord, team: playerB.team, slot_number: playerB.slot_number }
      };
    });

    return NextResponse.json({ 
      success: true, 
      data: result,
      message: 'Players swapped successfully'
    });

  } catch (error: any) {
    console.error('Error swapping players:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Frontend Integration for Conflict-Free Drag and Drop**

`src/components/admin/matches/BalanceTeamsPane.component.tsx`:
```typescript
const updatePlayerAssignment = async (player: PlayerInPool, targetTeam: Team, targetSlot?: number) => {
  // Check for conflicts (any player already in target slot)
  const conflictPlayer = originalPlayers.find(p => 
    p.team === targetTeam && p.slot_number === targetSlot && p.id !== player.id
  ) || null;
  
  // Get dragged player's current position
  const draggedPlayer = originalPlayers.find(p => p.id === player.id);
  const originalPlayerTeam = draggedPlayer?.team;
  const originalPlayerSlot = draggedPlayer?.slot_number;

  // Optimistic UI update
  setPlayers(/* ... immediate state change ... */);

  try {
    if (conflictPlayer) {
      // Use atomic swap endpoint for any conflicts
      const response = await fetch('/api/admin/upcoming-match-players/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upcoming_match_id: parseInt(matchId, 10),
          playerA: {
            player_id: parseInt(player.id, 10),
            team: targetTeam,
            slot_number: targetTeam !== 'Unassigned' ? targetSlot : null,
          },
          playerB: {
            player_id: parseInt(conflictPlayer.id, 10),
            team: originalPlayerTeam || 'Unassigned',
            slot_number: (originalPlayerTeam && originalPlayerTeam !== 'Unassigned') ? originalPlayerSlot : null,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status} for player swap`);
      }
    } else {
      // Single player move (no conflict) - use existing PUT endpoint
      const response = await fetch('/api/admin/upcoming-match-players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upcoming_match_id: parseInt(matchId, 10),
          player_id: parseInt(player.id, 10),
          team: targetTeam,
          slot_number: targetTeam !== 'Unassigned' ? targetSlot : null,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status} for player move`);
      }
    }
    
    await markAsUnbalanced();
    onTeamModified?.();
  } catch (error) {
    console.error("Failed to update player assignment:", error);
    setPlayers(originalPlayers); // Rollback on failure
  }
};
```

**Benefits of the Atomic Swap Solution:**
- ✅ **Zero Constraint Violations**: Deferrable constraint allows temporary conflicts within transaction
- ✅ **Single Database Transaction**: Both player moves committed atomically
- ✅ **Conflict Detection**: Frontend properly identifies all swap scenarios
- ✅ **Optimistic UI**: Immediate visual feedback with rollback on failure
- ✅ **Performance**: Advisory locks prevent concurrent swap conflicts
- ✅ **Reliability**: Comprehensive error handling and logging

**Phase 9b: Enhanced Single Blocked Modal**

`src/components/admin/matches/SingleBlockedModal.component.tsx`:
```typescript
interface SingleBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolSize: number;
}

const SingleBlockedModal = ({ isOpen, onClose, poolSize }: SingleBlockedModalProps) => {
  // Enhanced UX: Handle ESC key and prevent double-actions
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <SoftUIConfirmationModal
        isOpen={isOpen}
        onClose={onClose}
        title="Too Few Players"
        message="8 players (4v4) is the minimum."
        confirmText="Got It"
        cancelText={undefined}
        icon="warning"
        onConfirm={onClose}
        onCancel={undefined}
      />
    </div>
  );
};
```

**Phase 9b: Streamlined CompleteMatchForm Updates**

`src/components/admin/matches/CompleteMatchForm.component.tsx`:
```typescript
// Remove all 4v4 notes and warnings - keep form clean
const handleSubmit = async (formData: any) => {
  const matchData = {
    ...formData,
    // Remove match_note addition
  };
  
  // ... existing submission logic
};

// REMOVE all 4v4 warning UI completely
```

## Benefits of This Optimized Approach

✅ **Apple-Style UX**: "Just works" direct lock for viable scenarios, minimal friction
✅ **Universal Hard Cap**: 22-player limit (11v11 max) with clear button graying
✅ **Single Modal**: One blocking modal for <8 players with "Got It" action
✅ **Algorithm Protection**: Ability balancing visually disabled with clear tooltips
✅ **Clean UI**: Removed status notes and warnings, centralized guidance in hints
✅ **Existing Patterns**: Reuses hint area, SoftUIConfirmationModal, button styling
✅ **Mobile Optimized**: 48px touch targets, full-screen modals, thumb-friendly
✅ **Backward Compatible**: Even teams work exactly as before with all balancing options

## Scenario Examples

**Minimum Viable (8 players)**:
- Hint: "Lock 4v4 (all midfielders, Performance/Random only)"
- Action: Direct lock on button click, no modal
- Result: 4v4 flat teams, Ability grayed in Balance Modal

**Perfect Small Match (10 players, 5v5)**:
- Hint: "Perfect for 5v5"
- Action: Direct lock on button click, no modal
- Result: Normal 5v5 with positions, all balancing options

**Uneven Match (9 players, 4v5)**:
- Hint: "Lock 4v5"
- Action: Direct lock on button click, no modal
- Result: 4v5 with scaled positions, Ability grayed in Balance Modal

**Excess Match (19 players for team_size=9)**:
- Hint: "Lock 9v10"
- Action: Direct lock on button click, no modal (excess over 18 allowed)
- Result: 9v10 with auto-adjustment, Ability grayed in Balance Modal

**Perfect Large Match (18 players, 9v9)**:
- Hint: "Perfect for 9v9"
- Action: Direct lock on button click, no modal
- Result: Normal 9v9 with full positions, all balancing options

**Insufficient Pool (6 players)**:
- Hint: "Need 2 more for 4v4 minimum"
- Action: Modal with "8 players (4v4) is the minimum" and "Got It" button
- Blocked: Returns to Draft state, no proceed option

**Over Capacity (23 players)**:
- Hint: "Maximum players reached"
- Action: "Lock Pool" button grayed out (disabled)
- Blocked: Must remove players to continue

## Balancing Algorithm Matrix

| Team Configuration | Ability | Performance | Random |
|-------------------|---------|-------------|---------|
| 4v4 (8 players) | ❌ Grayed with tooltip | ✅ Available | ✅ Available |
| Uneven (4v5, 5v6, etc.) | ❌ Grayed with tooltip | ✅ Available | ✅ Available |
| Even 5v5+ (10, 12, 14+ players) | ✅ Available | ✅ Available | ✅ Available |

## Enhanced Testing Strategy

**Database & State Tests:**
- **Schema validation**: `actual_size_a` and `actual_size_b` persist correctly during state transitions
- **Slot uniqueness**: Database constraint prevents double-assignments per team/slot
- **State lifecycle**: Sizes set on lock-pool, cleared on unlock-pool, preserved on unlock-teams
- **Data invariants**: `actual_size_a + actual_size_b = poolSize`, both ≥ 4, sum 8-22

**Algorithm & Data Integrity Tests:**
- **splitSizesFromPool()**: 8→4/4, 9→4/5, 10→5/5, 11→5/6, deterministic results
- **deriveTemplate()**: Snapshots for n=4..11: 4→(0/4/0), 9→(3/4/2), 10→(4/3/3), 11→(4/4/3)
- **Fisher-Yates shuffle**: Proper random distribution vs poor 0.5-Math.random() baseline
- **Duplicate player validation**: API rejects duplicate IDs with 400 status
- **Performance/Random**: Handle uneven sizes correctly with slot ranges 1..sizeA, 1..sizeB

**API Concurrency & Error Handling:**
- **409 conflict path**: Stale state_version → 409; UI shows "updated elsewhere" message
- **Boundary validation**: poolSize < 8 → 400, poolSize > 22 → 400, sizes.a + sizes.b ≠ poolSize → 400
- **API consistency**: All balancers return uniform {success, data} shape
- **Even non-default sizes**: team_size=9 but pool=10 → 5v5; Ability runs with {a:5,b:5}; TornadoChart shows

**UI Integration & UX Tests:**
- **Hard cap**: 22+ players gray "Lock Pool" button with "Maximum players reached" hint
- **Direct lock**: 8+ players proceed immediately without modals
- **Single modal**: <8 players show unified blocking modal with "Got It" + ESC/backdrop close
- **Balance Modal**: Ability option grayed with subtitle for 4v4/uneven teams, idempotent actions
- **TornadoChart**: Show for even ≥MIN_CHART_PLAYERS, hide for 4v4 and uneven teams
- **Target size hints**: poolSize === targetSize and poolSize >= 8 shows "perfect" hint correctly

**Property Tests for Core Logic:**
- **splitSizesFromPool**: For n∈[8..22], assert a+b=n, a≥4, b≥4, and Math.abs(a-b)≤1
  ```typescript
  // Micro assertion for split logic
  for (let n = 8; n <= 22; n++) {
    const { a, b } = splitSizesFromPool(n);
    expect(a + b).toBe(n);
    expect(a).toBeGreaterThanOrEqual(4);
    expect(b).toBeGreaterThanOrEqual(4);
    expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
  }
  ```
- **deriveTemplate snapshots**: Lock expected formations for sizes 4-11:
  ```typescript
  expect(deriveTemplate(4)).toEqual({ def: 0, mid: 4, att: 0 });
  expect(deriveTemplate(5)).toEqual({ def: 2, mid: 2, att: 1 });
  expect(deriveTemplate(7)).toEqual({ def: 2, mid: 3, att: 2 });
  expect(deriveTemplate(9)).toEqual({ def: 3, mid: 4, att: 2 });
  expect(deriveTemplate(10)).toEqual({ def: 4, mid: 3, att: 3 });
  expect(deriveTemplate(11)).toEqual({ def: 4, mid: 4, att: 3 });
  
  // Micro invariant checks for all templates
  for (let size = 4; size <= 11; size++) {
    const { def, mid, att } = deriveTemplate(size);
    expect(def + mid + att).toBe(size); // Total equals team size
    expect(def).toBeGreaterThanOrEqual(0); // All buckets non-negative
    expect(mid).toBeGreaterThanOrEqual(0);
    expect(att).toBeGreaterThanOrEqual(0);
  }
  ```
- **Seeded random stability**: Pass seed:'test123', assert stable partitioning and exact sizes

**Boundary Condition Tests:**
- **Player counts**: 6 (modal), 8 (direct), 9 (4v5), 11 (5v6), 19 (9v10), 21 (10v11), 23 (grayed)
- **API status codes**: 400 for validation, 409 for concurrency, 500 for unexpected errors
- **Team formation**: Each team size generates valid formation with correct slot counts
- **Random seeding**: Optional seed parameter produces reproducible test results

## **Phase 10: Production Hardening (Optional but Recommended)**

**Phase 10a: Runtime Validation with Zod**

Add runtime schema validation for API boundaries:

```typescript
// src/lib/transform/player.transform.ts
import { z } from 'zod';

export const DbPlayer = z.object({
  player_id: z.number(),
  name: z.string(),
  is_ringer: z.boolean(),
  is_retired: z.boolean(),
  goalscoring: z.number(),
  defending: z.number(),
  stamina_pace: z.number(),
  control: z.number(),
  teamwork: z.number(),
  resilience: z.number(),
  club_id: z.number().nullable().optional(),
  club_name: z.string().nullable().optional(),
  club_filename: z.string().nullable().optional(),
});

export const PlayerProfile = z.object({
  id: z.string(),
  name: z.string(),
  isRinger: z.boolean(),
  isRetired: z.boolean(),
  goalscoring: z.number(),
  defending: z.number(),
  staminaPace: z.number(),
  control: z.number(),
  teamwork: z.number(),
  resilience: z.number(),
  club: z
    .object({ id: z.string(), name: z.string(), filename: z.string() })
    .nullable()
    .optional(),
});

export function toPlayerProfile(row: unknown): PlayerProfile {
  const dbRow = DbPlayer.parse(row); // Runtime validation
  return PlayerProfile.parse({
    id: String(dbRow.player_id),
    name: dbRow.name,
    isRinger: dbRow.is_ringer,
    isRetired: dbRow.is_retired,
    goalscoring: dbRow.goalscoring,
    defending: dbRow.defending,
    staminaPace: dbRow.stamina_pace,
    control: dbRow.control,
    teamwork: dbRow.teamwork,
    resilience: dbRow.resilience,
    club: dbRow.club_id
      ? { 
          id: String(dbRow.club_id), 
          name: dbRow.club_name ?? '', 
          filename: dbRow.club_filename ?? '' 
        }
      : null,
  });
}
```

**Phase 10b: Enhanced TypeScript Configuration**

Update `tsconfig.json` for stricter type checking:

```json
{
  "compilerOptions": {
    // ... existing options ...
    "exactOptionalPropertyTypes": true,     // Prevents { name: undefined } satisfying { name?: string }
    "noUncheckedIndexedAccess": true,       // Forces array bounds checking
    "useUnknownInCatchVariables": true,     // catch (e: unknown) instead of any
    "noPropertyAccessFromIndexSignature": true  // Prevents typos in dynamic access
  }
}
```

**Phase 10c: Centralized Domain Types**

```typescript
// src/types/common.types.ts
export type Team = 'Unassigned' | 'A' | 'B';
export type ResponseStatus = 'IN' | 'OUT' | 'MAYBE' | 'PENDING';
export type MatchState = 'Draft' | 'PoolLocked' | 'TeamsBalanced' | 'Completed' | 'Cancelled';

// src/types/index.ts (barrel export)
export type { Team, ResponseStatus, MatchState } from './common.types';
export type { PlayerProfile, PlayerInPool, PlayerWithStats } from './player.types';
export { toPlayerProfile, toPlayerProfiles } from '../lib/transform/player.transform';
```

**Phase 10d: Enhanced ESLint Configuration**

```javascript
// .eslintrc.cjs
rules: {
  '@typescript-eslint/naming-convention': [
    'error',
    { selector: 'property', format: ['camelCase'], leadingUnderscore: 'allow' },
    { selector: 'property', modifiers: ['requiresQuotes'], format: null },
    { 
      selector: 'property', 
      filter: { regex: '^[a-z]+(_[a-z0-9]+)+$', match: true }, 
      format: null, // Allow snake_case in transforms and API routes
      files: ['src/lib/transform/**', 'src/app/api/**'] 
    }
  ]
}
```

**Benefits of Production Hardening:**
- ✅ **Runtime Safety**: Zod catches malformed data before it crashes the app
- ✅ **Compile-Time Safety**: Stricter TypeScript prevents common runtime errors  
- ✅ **Maintenance**: Centralized types prevent drift across codebase
- ✅ **Developer Experience**: Clear errors instead of mysterious failures
- ✅ **Future-Proofing**: Easy to refactor when you know all type usage

## **API/Domain ID Convention**

**Rule**: APIs use `number` IDs; UI/domain models use `string` IDs (transform at boundary).

- **API Routes**: Accept and return numeric IDs (`player_id: 123`, `match_id: 456`)
- **Database Layer**: Native numeric IDs for performance and foreign key constraints  
- **Frontend Domain**: String IDs for consistency with component keys and browser APIs
- **Transformation**: Convert at API boundary using `parseInt()` inbound, `String()` outbound
- **Benefits**: Database performance + UI consistency + clear separation of concerns

This approach delivers a streamlined "Apple-style" experience with minimal UI friction while maintaining all functional requirements and algorithm protection.