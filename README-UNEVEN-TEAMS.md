# Uneven Teams Feature Implementation

## Overview

This implementation adds support for uneven team sizes (e.g., 4v5, 5v6) to the StatKick app while maintaining the existing balanced team functionality.

## Key Features

✅ **Flexible Team Sizes**: Supports any team size from 4v4 to 11v11 (8-22 players total)  
✅ **Smart Validation**: Blocks impossible configurations (< 8 players) with clear messaging  
✅ **Algorithm Protection**: Ability balancing disabled for uneven teams to preserve existing algorithm  
✅ **Direct Lock Flow**: No confirmation modals for viable matches (≥8 players)  
✅ **Capacity Enforcement**: Prevents overfilling teams during manual assignment  
✅ **Concurrency Safety**: All state transitions use proper version checking  

## Database Changes

### New Columns
- `upcoming_matches.actual_size_a` - Actual size of team A when locked
- `upcoming_matches.actual_size_b` - Actual size of team B when locked

### New Constraints
- Unique index on `(upcoming_match_id, team, slot_number)` for teams A/B
- Composite unique on `(upcoming_match_id, player_id)`

### Migration Required
```sql
-- Run the SQL migration file:
-- sql/2025-01-16-uneven-teams.sql
```

## ID Convention

**Frontend ↔ Database ID Transformation**:
- **Database/APIs**: Use `player_id: number` (numeric IDs for performance)
- **Frontend Domain**: Use `id: string` (string IDs for consistency with React keys)
- **Transform Layer**: `src/lib/transform/player.transform.ts` handles conversions

## State Lifecycle

```
Draft → PoolLocked: Set actual_size_a and actual_size_b
PoolLocked → Draft: Clear both sizes to NULL  
PoolLocked → TeamsBalanced: Keep both values
TeamsBalanced → PoolLocked: Keep both values
```

## Algorithm Support Matrix

| Team Configuration | Ability | Performance | Random |
|-------------------|---------|-------------|---------|
| 4v4 (8 players) | ❌ Disabled | ✅ Available | ✅ Available |
| Uneven (4v5, 5v6, etc.) | ❌ Disabled | ✅ Available | ✅ Available |
| Even 5v5+ (10, 12, 14+ players) | ✅ Available | ✅ Available | ✅ Available |

## UI Flow Examples

**8 players**: Direct lock → "Lock 4v4 (all midfielders, Performance/Random only)"  
**9 players**: Direct lock → "Lock 4v5"  
**6 players**: Blocked → Modal "8 players (4v4) is the minimum"  
**23 players**: Button disabled → "Maximum players reached"  

## Code Changes

### New Files Created
- `src/utils/teamSplit.util.ts` - Team splitting logic and constants
- `src/utils/teamFormation.util.ts` - Formation derivation for any team size  
- `src/types/player.types.ts` - Canonical player types
- `src/types/common.types.ts` - Shared domain types
- `src/lib/transform/player.transform.ts` - ID transformation layer
- `src/components/admin/matches/SingleBlockedModal.component.tsx` - Blocked state modal

### Modified Files
- Lock pool API: Enhanced validation, size setting, concurrency safety
- Balance APIs: Added size parameters, ability restrictions, uniform return shapes
- Random balance: Fisher-Yates shuffle, size support, seeded randomization
- DnD API: Team capacity validation, slot range checking
- Confirm teams API: Comprehensive validation before state transition
- Main match page: Dynamic hints, direct lock flow, blocked modal
- GlobalCtaBar: Added hint display support

## Rollback Plan

If needed, rollback by:
1. Running the DOWN migration in `sql/2025-01-16-uneven-teams.sql`
2. Reverting the modified API files
3. Removing the new utility files

The changes are designed to be surgical and won't affect existing balanced team functionality.

## Testing Notes

- Test with various pool sizes: 6, 8, 9, 11, 19, 22, 23 players
- Verify ability balancing is disabled for 4v4 and uneven teams
- Test concurrency by opening match in multiple tabs
- Verify DnD capacity limits work correctly
- Check that existing even team balancing still works unchanged