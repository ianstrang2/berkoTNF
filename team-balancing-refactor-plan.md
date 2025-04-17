# Team Balancing Algorithm Refactoring Plan

## Overview

This document outlines the plan for refactoring the team balancing algorithm to:

1. **Treat teamwork and resilience as position-specific attributes** rather than global team attributes
2. **Replace the randomized iterative approach** with a deterministic brute-force algorithm that explores all possible role-based team combinations

## Current Implementation Analysis

### Database Structure
- `team_balance_weights` and `team_balance_weights_defaults` include a separate `team` position group
- Weights for teamwork and resilience are stored in this `team` group, not in position groups

### Algorithm Components
- **Position Assignment**: Players are sorted by position-specific attributes, then distributed alternately
- **Balance Calculation**: 
  - `calculateTeamStats`: Computes position-specific stats and separate team-wide stats
  - `calculateBalanceScore`: Calculates weighted differences for each position group, plus special handling for teamwork/resilience
- **Optimization Process**: 
  - 8,400 random iterations
  - Final defender-swapping optimization

### Affected Code Files

#### Backend Balance Logic
- `src/app/api/admin/balance-planned-match/route.ts` (main algorithm implementation)
- `src/services/TeamBalanceService.ts` (client-side balance calculations)

#### Frontend Components
- `src/components/admin/balance-settings/BalanceWeightsEditor.tsx` (weights UI)
- `src/components/admin/balance-settings/PositionGroupEditor.tsx` (position group handling)
- `src/components/team/TornadoChart.component.tsx` (balance visualization)
- `src/components/team/ComparativeStats.component.tsx` (stats display)

## Detailed Changes Required

### 1. Database Changes (Client Will Handle)
- Remove `position_group = 'team'` rows from tables
- Add teamwork and resilience attributes to each position group
- Ensure weights total 1.0 within each position group

<!-- 
IMPORTANT: When executing in Supabase SQL Editor, copy and paste ONLY the SQL code below, 
not including the markdown section headers or this comment.
-->

```sql
-- First, find the current maximum weight_id to avoid duplicate key errors
DO $$
DECLARE
  max_weight_id integer;
  counter integer := 0;
  position_groups text[] := ARRAY['defense', 'midfield', 'attack'];
  attributes text[] := ARRAY['teamwork', 'resilience'];
  pg text;
  attr text;
BEGIN
  -- Get the current maximum weight_id
  SELECT COALESCE(MAX(weight_id), 0) INTO max_weight_id FROM team_balance_weights;
  
  -- Loop through position groups and attributes
  FOREACH pg IN ARRAY position_groups LOOP
    FOREACH attr IN ARRAY attributes LOOP
      -- Check if this combination already exists
      IF NOT EXISTS (
        SELECT 1 FROM team_balance_weights 
        WHERE position_group = pg AND attribute = attr
      ) THEN
        counter := counter + 1;
        -- Insert with a new ID
        INSERT INTO team_balance_weights (weight_id, position_group, attribute, weight)
        VALUES (max_weight_id + counter, pg, attr, 0.10);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Step 2: Scale down existing weights in each position group to make room for the new attributes
-- This ensures the remaining attributes take up 80% of the total weight
UPDATE team_balance_weights
SET weight = weight * 0.8
WHERE attribute NOT IN ('teamwork', 'resilience')
  AND position_group IN ('defense', 'midfield', 'attack');

-- Step 3: Normalize weights within each position group to ensure they sum to 1.0
DO $$
DECLARE
  position_groups text[] := ARRAY['defense', 'midfield', 'attack'];
  pg text;
  total_weight numeric;
  scaling_factor numeric;
BEGIN
  FOREACH pg IN ARRAY position_groups LOOP
    -- Calculate total weight for this position group
    SELECT SUM(weight) INTO total_weight FROM team_balance_weights WHERE position_group = pg;
    
    -- Calculate scaling factor to make weights sum to 1.0
    scaling_factor := 1.0 / total_weight;
    
    -- Scale all weights for this position group
    UPDATE team_balance_weights
    SET weight = weight * scaling_factor
    WHERE position_group = pg;
  END LOOP;
END $$;

-- Step 4: Remove the team position group
DELETE FROM team_balance_weights WHERE position_group = 'team';

-- Step 5: Repeat the same process for defaults table
-- For team_balance_weights_defaults, the primary key is (position_group, attribute)
-- No need to generate IDs, just insert directly

-- Add teamwork and resilience to each position group in defaults table
INSERT INTO team_balance_weights_defaults (position_group, attribute, weight)
SELECT 
  pg, 
  attr, 
  0.10
FROM 
  (SELECT unnest(ARRAY['defense', 'midfield', 'attack']) AS pg) position_groups
CROSS JOIN
  (SELECT unnest(ARRAY['teamwork', 'resilience']) AS attr) attributes
WHERE 
  NOT EXISTS (
    SELECT 1 FROM team_balance_weights_defaults
    WHERE position_group = pg AND attribute = attr
  );

-- Scale down existing default weights
UPDATE team_balance_weights_defaults
SET weight = weight * 0.8
WHERE attribute NOT IN ('teamwork', 'resilience')
  AND position_group IN ('defense', 'midfield', 'attack');

-- Normalize default weights
DO $$
DECLARE
  position_groups text[] := ARRAY['defense', 'midfield', 'attack'];
  pg text;
  total_weight numeric;
  scaling_factor numeric;
BEGIN
  FOREACH pg IN ARRAY position_groups LOOP
    -- Calculate total weight for this position group
    SELECT SUM(weight) INTO total_weight FROM team_balance_weights_defaults WHERE position_group = pg;
    
    -- Calculate scaling factor to make weights sum to 1.0
    scaling_factor := 1.0 / total_weight;
    
    -- Scale all weights for this position group
    UPDATE team_balance_weights_defaults
    SET weight = weight * scaling_factor
    WHERE position_group = pg;
  END LOOP;
END $$;

-- Remove the team position group from defaults
DELETE FROM team_balance_weights_defaults WHERE position_group = 'team';
```

### 2. Backend Code Changes

#### Update Team Stats Calculation
In `src/app/api/admin/balance-planned-match/route.ts`:

```typescript
// Update the calculateTeamStats function to include teamwork and resilience in each position group
const calculateTeamStats = (team: Player[]): TeamStats => {
  // Existing position identification logic...
  
  return {
    defense: {
      stamina_pace: safeAverage(defenders, 'stamina_pace'),
      control: safeAverage(defenders, 'control'),
      goalscoring: safeAverage(defenders, 'goalscoring'),
      // Add these attributes to the defense group
      teamwork: safeAverage(defenders, 'teamwork'),
      resilience: safeAverage(defenders, 'resilience')
    },
    midfield: {
      control: safeAverage(midfielders, 'control'),
      stamina_pace: safeAverage(midfielders, 'stamina_pace'),
      goalscoring: safeAverage(midfielders, 'goalscoring'),
      // Add these attributes to the midfield group
      teamwork: safeAverage(midfielders, 'teamwork'),
      resilience: safeAverage(midfielders, 'resilience')
    },
    attack: {
      goalscoring: safeAverage(attackers, 'goalscoring'),
      stamina_pace: safeAverage(attackers, 'stamina_pace'),
      control: safeAverage(attackers, 'control'),
      // Add these attributes to the attack group
      teamwork: safeAverage(attackers, 'teamwork'),
      resilience: safeAverage(attackers, 'resilience')
    }
    // REMOVE these global attributes:
    // resilience: safeAverage([...defenders, ...midfielders, ...attackers], 'resilience'),
    // teamwork: safeAverage([...defenders, ...midfielders, ...attackers], 'teamwork')
  };
};
```

#### Update Balance Score Calculation
```typescript
// Update calculateBalanceScore to remove special handling for team-wide attributes
const calculateBalanceScore = (teamA: Player[], teamB: Player[], weights: any[] = []): number => {
  const statsA = calculateTeamStats(teamA);
  const statsB = calculateTeamStats(teamB);
  
  // Group weights by position group (no more 'team' group)
  const weightsByGroup: Record<string, Record<string, number>> = {};
  weights.forEach(w => {
    if (!weightsByGroup[w.position_group]) {
      weightsByGroup[w.position_group] = {};
    }
    weightsByGroup[w.position_group][w.attribute] = Number(w.weight);
  });
  
  // Default weight if a specific weight is not found
  const defaultWeight = 1.0;
  
  // Function to calculate weighted difference between two stats
  const calculateDifference = (statsA: any, statsB: any, positionGroup: string): number => {
    // Existing difference calculation logic...
  };
  
  // Calculate differences for each position group
  const defenseDiff = calculateDifference(statsA.defense, statsB.defense, 'defense');
  const midfieldDiff = calculateDifference(statsA.midfield, statsB.midfield, 'midfield');
  const attackDiff = calculateDifference(statsA.attack, statsB.attack, 'attack');
  
  // REMOVE these lines:
  // const resilienceDiff = Math.abs(statsA.resilience - statsB.resilience) * 
  //   ((weightsByGroup.team?.resilience) || defaultWeight);
  // const teamworkDiff = Math.abs(statsA.teamwork - statsB.teamwork) * 
  //   ((weightsByGroup.team?.teamwork) || defaultWeight);
  
  // Total score - add all differences (lower is better)
  // return defenseDiff + midfieldDiff + attackDiff + resilienceDiff + teamworkDiff;
  return defenseDiff + midfieldDiff + attackDiff;
};
```

#### Update Client-Side Balance Service
In `src/services/TeamBalanceService.ts`, update:
- `calculateTeamStats` to include teamwork/resilience in each position group
- `calculateComparativeStats` to handle the updated structure

### 3. Implement Brute-Force Algorithm

Replace the current 8,400-iteration loop with:

```typescript
// Helper to generate all unique combinations of k elements from a set of n
function combinations(array: any[], k: number): any[][] {
  if (k === 0) return [[]];
  if (array.length === 0) return [];
  
  const [first, ...rest] = array;
  const combsWithFirst = combinations(rest, k-1).map(comb => [first, ...comb]);
  const combsWithoutFirst = combinations(rest, k);
  
  return [...combsWithFirst, ...combsWithoutFirst];
}

// Main algorithm logic
// Find optimal team balance using brute force
let bestSlots: { player_id: number, team: string, slot_number: number }[] = [];
let bestScore = Infinity;

// Prepare players for each position group - all players are used, no leftovers
const defenderPlayers = playerScores
  .sort((a, b) => (b.player.defender || 3) - (a.player.defender || 3))
  .slice(0, defendersPerTeam * 2);

const remainingPlayers = playerScores.filter(p => 
  !defenderPlayers.some(d => d.player.player_id === p.player.player_id)
);

const attackerPlayers = remainingPlayers
  .sort((a, b) => (b.player.goalscoring || 3) - (a.player.goalscoring || 3))
  .slice(0, attackersPerTeam * 2);

const midfielderPlayers = remainingPlayers
  .filter(p => !attackerPlayers.some(a => a.player.player_id === p.player.player_id))
  .sort((a, b) => (b.player.control || 3) - (a.player.control || 3))
  .slice(0, midfieldersPerTeam * 2);

// Note: The algorithm assumes exact player counts for each position
// There are no unassigned/leftover players in our balancing flow

// Generate all possible combinations for each position group
const defenderCombinations = combinations(defenderPlayers, defendersPerTeam);
const attackerCombinations = combinations(attackerPlayers, attackersPerTeam);
const midfielderCombinations = combinations(midfielderPlayers, midfieldersPerTeam);

console.log(`Evaluating ${defenderCombinations.length} × ${attackerCombinations.length} × ${midfielderCombinations.length} = ${
  defenderCombinations.length * attackerCombinations.length * midfielderCombinations.length
} total team combinations`);

// Optional optimization: We could skip mirror combinations to reduce computation by ~50%
// For example, if we've evaluated Team A = [1,2,3] and Team B = [4,5,6], 
// we don't need to evaluate Team A = [4,5,6] and Team B = [1,2,3]

// Simplified progress indication - process is fast enough (~1,050 combinations) that detailed tracking isn't critical
// Just set a simple loading state at the start and clear it when done
setIsLoading(true);
  
// Evaluate all combinations
for (const teamADefenders of defenderCombinations) {
  const teamBDefenders = defenderPlayers.filter(p => 
    !teamADefenders.some(d => d.player.player_id === p.player.player_id)
  );
  
  for (const teamAAttackers of attackerCombinations) {
    const teamBAttackers = attackerPlayers.filter(p => 
      !teamAAttackers.some(a => a.player.player_id === p.player.player_id)
    );
    
    for (const teamAMidfielders of midfielderCombinations) {
      const teamBMidfielders = midfielderPlayers.filter(p => 
        !teamAMidfielders.some(m => m.player.player_id === p.player.player_id)
      );
      
      // Create team assignments for this combination
      const slotAssignments: { player_id: number, team: string, slot_number: number }[] = [];
      
      // Assign defenders
      teamADefenders.forEach((player, index) => {
        slotAssignments.push({
          player_id: player.player.player_id,
          team: 'A',
          slot_number: index + 1 // Team A: slots 1, 2, 3, etc.
        });
      });
      
      teamBDefenders.forEach((player, index) => {
        slotAssignments.push({
          player_id: player.player.player_id,
          team: 'B',
          slot_number: match.team_size + index + 1 // Team B: slots (team_size+1), etc.
        });
      });
      
      // Assign attackers
      const teamAAttackerBaseSlot = defendersPerTeam + midfieldersPerTeam + 1;
      const teamBAttackerBaseSlot = match.team_size + defendersPerTeam + midfieldersPerTeam + 1;
      
      teamAAttackers.forEach((player, index) => {
        slotAssignments.push({
          player_id: player.player.player_id,
          team: 'A',
          slot_number: teamAAttackerBaseSlot + index
        });
      });
      
      teamBAttackers.forEach((player, index) => {
        slotAssignments.push({
          player_id: player.player.player_id,
          team: 'B',
          slot_number: teamBAttackerBaseSlot + index
        });
      });
      
      // Assign midfielders
      const teamAMidfielderBaseSlot = defendersPerTeam + 1;
      const teamBMidfielderBaseSlot = match.team_size + defendersPerTeam + 1;
      
      teamAMidfielders.forEach((player, index) => {
        slotAssignments.push({
          player_id: player.player.player_id,
          team: 'A',
          slot_number: teamAMidfielderBaseSlot + index
        });
      });
      
      teamBMidfielders.forEach((player, index) => {
        slotAssignments.push({
          player_id: player.player.player_id,
          team: 'B',
          slot_number: teamBMidfielderBaseSlot + index
        });
      });
      
      // Evaluate this assignment
      const teamAPlayers = slotAssignments
        .filter(a => a.team === 'A')
        .map(a => {
          const player = players.find(p => p.player_id === a.player_id);
          return { ...player, slot_number: a.slot_number } as Player;
        });
      
      const teamBPlayers = slotAssignments
        .filter(a => a.team === 'B')
        .map(a => {
          const player = players.find(p => p.player_id === a.player_id);
          return { ...player, slot_number: a.slot_number } as Player;
        });
      
      const score = calculateBalanceScore(teamAPlayers, teamBPlayers, balanceWeights);
      
      // Update best score and slots if this is better
      if (score < bestScore) {
        bestScore = score;
        bestSlots = [...slotAssignments];
        
        console.log(`New best score ${score.toFixed(4)} found`);
        console.log(`Team A: ${teamAPlayers.length} players, Team B: ${teamBPlayers.length} players`);
      }
    }
  }
}

// Clear loading state when done
setIsLoading(false);
```

### 4. Frontend UI Changes

#### Update Balance Weights Editor
In `src/components/admin/balance-settings/BalanceWeightsEditor.tsx`:

- Remove "Team-wide Factors" section completely
- Add teamwork and resilience sliders to each position group
- Update validation to ensure weights still sum to 1.0 within each group

#### Update PositionGroupEditor
In `src/components/admin/balance-settings/PositionGroupEditor.tsx`:

- Add teamwork and resilience to the attribute list for each position group
- Update validation logic to include these attributes in the total

#### Update TornadoChart / Visualizations
In `src/components/team/TornadoChart.component.tsx` and related components:

- Update to display teamwork/resilience within each position group
- Remove any separate sections for team-wide attributes

## Testing Strategy

### Unit Tests
1. Test the `combinations()` function with known inputs/outputs
2. Test the updated `calculateTeamStats` and `calculateBalanceScore` functions

### Integration Tests
1. Test the full balance algorithm with various team sizes and player counts
2. Verify the algorithm produces consistent results with identical inputs (deterministic)

### UI Tests
1. Verify that balance settings UI correctly shows the new structure
2. Confirm that validation still properly enforces weights summing to 1.0

### Manual Testing Checklist
- [ ] Test the balance algorithm with various team sizes (5v5, 6v6, etc.)
- [ ] Verify that teams are balanced correctly with the new attribute distribution
- [ ] Confirm the algorithm is fast enough even without optimization
- [ ] Test edge cases (e.g., players with missing attribute data)
- [ ] Verify that weights can be set and saved correctly in the admin UI
- [ ] Confirm visualizations display correctly with the new data structure

## Rollout Plan

### Phase 1: Database Changes
- Update the database schema (client will handle)
- Migrate existing data to the new structure

### Phase 2: Backend Implementation
- Implement the changes to the balance algorithm
- Test thoroughly in a development environment

### Phase 3: Frontend Updates
- Update UI components to reflect the new structure
- Test the full flow from UI to API to database

### Phase 4: Deployment
- Deploy all changes as a single unit to minimize integration issues
- Monitor closely for any unexpected behavior

## Fallback Strategy

1. Keep a copy of the current implementation as `legacy-balance-planned-match`
2. Add a feature flag to switch between algorithms if needed
3. Ensure database changes are backward compatible
4. Have a rollback plan ready if issues are discovered after deployment

## Conclusion

This refactoring will significantly improve the team balancing algorithm by:
1. Making it deterministic (same inputs → same outputs)
2. Providing more nuanced position-specific attribute weighting
3. Exploring all possible team combinations for optimal balance

The changes are substantial but localized to specific components, making the refactoring manageable with proper testing and validation. 