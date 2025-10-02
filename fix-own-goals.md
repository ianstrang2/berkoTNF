# Fix Own Goals Persistence Issue

## Problem Statement

When re-editing a completed match, the own goals that were previously entered are lost because they're not persisted to the database. The system currently only saves:
- Final team scores (`matches.team_a_score`, `matches.team_b_score`)
- Individual player goals (`player_matches.goals`)

But **own goals are calculated in the UI and never saved**, causing confusion when re-editing matches.

## Root Cause Analysis

### Current Flow (Broken)
1. **Match Completion**: User enters individual player goals + own goals in UI
2. **Database Save**: Only saves final team scores and individual player goals
3. **Re-editing**: Attempts to reverse-engineer own goals by: `team_score - sum(player_goals)`
4. **Problem**: This "calculated" own goal value may not match what was originally entered

### Example Scenario
- **Original Entry**: Team A = 3 player goals + 2 own goals = 5 total
- **Database Saves**: `team_a_score = 5`, individual `player_matches.goals`
- **Re-editing Calculates**: `own_goals = 5 - 3 = 2` ✅ (happens to work)
- **Issue**: If user needs to correct the breakdown (e.g., actually 4 player + 1 own), they can't because the "true" own goals weren't saved

## Solution Overview

### 1. Database Schema Changes
Add own goals fields to the `matches` table to persist the actual values entered by users.

### 2. API Changes  
Modify the match completion API to accept and save own goals separately.

### 3. UI Changes
Update the re-editing logic to load actual own goals instead of calculating them.

### 4. Data Migration
Backfill existing matches by calculating own goals from score differences.

---

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Add Own Goals Fields to `matches` Table

**SQL to Execute in Supabase:**

```sql
-- Add own goals columns to matches table
ALTER TABLE matches 
ADD COLUMN team_a_own_goals INTEGER DEFAULT 0,
ADD COLUMN team_b_own_goals INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN matches.team_a_own_goals IS 'Own goals scored by Team A (added to their total score)';
COMMENT ON COLUMN matches.team_b_own_goals IS 'Own goals scored by Team B (added to their total score)';

-- Add constraints to ensure non-negative values
ALTER TABLE matches 
ADD CONSTRAINT check_team_a_own_goals_non_negative CHECK (team_a_own_goals >= 0),
ADD CONSTRAINT check_team_b_own_goals_non_negative CHECK (team_b_own_goals >= 0);
```

#### 1.2 Update Prisma Schema

**File**: `prisma/schema.prisma`

```prisma
model matches {
  match_id                  Int                        @id @default(autoincrement())
  match_date                DateTime                   @db.Date
  team_a_score              Int
  team_b_score              Int
  team_a_own_goals          Int?                       @default(0)  // NEW
  team_b_own_goals          Int?                       @default(0)  // NEW
  created_at                DateTime?                  @default(now()) @db.Timestamp(6)
  upcoming_match_id         Int?
  // ... existing relations
}
```

### Phase 2: Data Migration for Existing Matches

#### 2.1 Calculate Own Goals for Historical Matches

**SQL to Execute in Supabase:**

```sql
-- Update existing matches with calculated own goals
-- This calculates own goals as the difference between team score and sum of player goals

WITH match_calculations AS (
  SELECT 
    m.match_id,
    m.team_a_score,
    m.team_b_score,
    
    -- Calculate sum of player goals for each team
    COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) as team_a_player_goals,
    COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) as team_b_player_goals,
    
    -- Calculate own goals (team score minus player goals, minimum 0)
    GREATEST(0, m.team_a_score - COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0)) as calculated_team_a_own_goals,
    GREATEST(0, m.team_b_score - COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0)) as calculated_team_b_own_goals
    
  FROM matches m
  LEFT JOIN player_matches pm ON m.match_id = pm.match_id
  WHERE m.team_a_own_goals IS NULL OR m.team_b_own_goals IS NULL  -- Only update rows that haven't been set
  GROUP BY m.match_id, m.team_a_score, m.team_b_score
)
UPDATE matches 
SET 
  team_a_own_goals = mc.calculated_team_a_own_goals,
  team_b_own_goals = mc.calculated_team_b_own_goals
FROM match_calculations mc
WHERE matches.match_id = mc.match_id;

-- Verification query to check the results
SELECT 
  match_id,
  match_date,
  team_a_score,
  team_b_score,
  team_a_own_goals,
  team_b_own_goals,
  (team_a_score - team_a_own_goals) as team_a_player_goals_should_be,
  (team_b_score - team_b_own_goals) as team_b_player_goals_should_be
FROM matches 
ORDER BY match_date DESC 
LIMIT 20;
```

#### 2.2 Data Quality Verification

**SQL to Execute in Supabase:**

```sql
-- Check for any data inconsistencies after migration
SELECT 
  m.match_id,
  m.match_date,
  m.team_a_score,
  m.team_b_score,
  m.team_a_own_goals,
  m.team_b_own_goals,
  
  -- Calculate player goals from player_matches
  COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) as actual_team_a_player_goals,
  COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) as actual_team_b_player_goals,
  
  -- Verify: team_score should equal player_goals + own_goals
  (m.team_a_score = COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) + m.team_a_own_goals) as team_a_total_correct,
  (m.team_b_score = COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) + m.team_b_own_goals) as team_b_total_correct
  
FROM matches m
LEFT JOIN player_matches pm ON m.match_id = pm.match_id
GROUP BY m.match_id, m.match_date, m.team_a_score, m.team_b_score, m.team_a_own_goals, m.team_b_own_goals
HAVING 
  (m.team_a_score != COALESCE(SUM(CASE WHEN pm.team = 'A' THEN pm.goals ELSE 0 END), 0) + m.team_a_own_goals) OR
  (m.team_b_score != COALESCE(SUM(CASE WHEN pm.team = 'B' THEN pm.goals ELSE 0 END), 0) + m.team_b_own_goals)
ORDER BY m.match_date DESC;
```

### Phase 3: API Updates

#### 3.1 Update Match Completion API

**File**: `src/app/api/admin/upcoming-matches/[id]/complete/route.ts`

**Changes**:
1. Accept own goals in request payload
2. Save own goals to database
3. Verify score calculation integrity

```typescript
// Update request interface
interface CompletionPayload {
  state_version: number;
  score: { team_a: number; team_b: number };
  own_goals: { team_a: number; team_b: number };  // NEW
  player_stats: { player_id: number; goals: number }[];
}

// Update database creation
const newMatch = await tx.matches.create({
  data: {
    match_date: upcomingMatch.match_date,
    team_a_score: score.team_a,
    team_b_score: score.team_b,
    team_a_own_goals: own_goals.team_a,  // NEW
    team_b_own_goals: own_goals.team_b,  // NEW
    upcoming_match_id: matchId,
  },
});
```

#### 3.2 Update History API

**File**: `src/app/api/matches/history/route.ts`

**Changes**:
1. Include own goals in response data

```typescript
// Update the SELECT query to include own goals
include: {
  player_matches: true,
  // Ensure own goals are included in the response
}
```

#### 3.3 Undo Match Behavior

**Important**: When a match is "undone" (transitioned from Completed → TeamsBalanced), the historical `matches` record is **deleted entirely**. This means:

- ✅ **Own goals automatically removed** - `team_a_own_goals` and `team_b_own_goals` are deleted with the matches row
- ✅ **No extra cleanup required** - Database foreign key relationships handle cleanup  
- ✅ **Correct behavior** - Undo means "this match never happened", so own goals should disappear

**No additional code changes needed** for undo functionality - the existing undo API already handles this correctly by deleting the entire matches record.

### Phase 4: UI Component Updates

#### 4.1 Update CompleteMatchForm Component

**File**: `src/components/admin/matches/CompleteMatchForm.component.tsx`

**Changes**:

1. **Update submission payload** to include own goals:
```typescript
const payload = {
  score: { team_a: finalTeamAScore, team_b: finalTeamBScore },
  own_goals: { team_a: ownGoalsA, team_b: ownGoalsB },  // NEW
  player_stats: player_stats,
};
```

2. **Update historical data loading** to use actual own goals:
```typescript
// Load actual own goals instead of calculating
setOwnGoalsA(historicalMatch.team_a_own_goals || 0);
setOwnGoalsB(historicalMatch.team_b_own_goals || 0);

// Remove the calculation logic that was causing the issue
```

3. **Add validation** to ensure score integrity:
```typescript
const validateScoreIntegrity = () => {
  const teamACalculated = teamAPlayerGoals + ownGoalsA;
  const teamBCalculated = teamBPlayerGoals + ownGoalsB;
  
  if (teamACalculated !== finalTeamAScore || teamBCalculated !== finalTeamBScore) {
    throw new Error('Score calculation mismatch detected');
  }
};
```

#### 4.2 Update useMatchState Hook

**File**: `src/hooks/useMatchState.hook.ts`

**Changes**:
1. Update the complete match action to pass own goals
2. Handle new API response format

### Phase 5: Legacy System Update

#### 5.1 Legacy Match Editor Status

**✅ NO ACTION REQUIRED** - The legacy match editor has been **completely removed** as part of the `clean-legacy-matches.md` migration. All 685+ historical matches have been migrated to the new unified system.

**What this means:**
- All matches now use the unified Match Control Centre
- No separate legacy editing interface exists
- Historical matches work identically to new matches
- Own goals fix applies to all matches uniformly

---

## Testing Strategy

### 1. New Match Flow Testing
1. Create a new match through the unified flow
2. Complete with various own goals combinations
3. Re-edit to verify own goals are preserved correctly
4. Test edge cases (0 own goals, high own goals)

### 2. Legacy Data Validation
1. Run the data quality verification SQL
2. Spot-check 10-20 historical matches manually
3. Verify that calculated own goals make sense
4. Test re-editing of migrated historical matches

### 3. Score Integrity Testing
1. Verify that `team_score = player_goals + own_goals` for all matches
2. Test boundary conditions (all own goals, no own goals)
3. Test the validation logic in the UI

---

## Rollback Plan

If issues are discovered after deployment:

### 1. Database Rollback
```sql
-- Remove own goals columns if needed
ALTER TABLE matches 
DROP COLUMN IF EXISTS team_a_own_goals,
DROP COLUMN IF EXISTS team_b_own_goals;
```

### 2. API Rollback
- Revert the API changes to not require own goals
- Update UI to fall back to calculation method

### 3. Data Recovery
- The original score data is preserved
- Own goals can be recalculated using the migration SQL

---

## Success Criteria

### ✅ **Database Schema**
- [ ] Own goals columns added to `matches` table
- [ ] Prisma schema updated and regenerated
- [ ] Constraints added for data integrity

### ✅ **Data Migration**
- [ ] All existing matches have own goals calculated and populated
- [ ] Data quality verification passes (team_score = player_goals + own_goals)
- [ ] No data inconsistencies found

### ✅ **API Updates**
- [ ] Match completion API accepts and saves own goals
- [ ] History API returns own goals data
- [ ] Error handling for invalid own goals values

### ✅ **UI Updates**
- [ ] CompleteMatchForm saves actual own goals
- [ ] Re-editing loads actual own goals (not calculated)
- [ ] Score validation prevents data inconsistencies
- [ ] Historical matches display correctly after migration

### ✅ **Testing**
- [ ] New matches complete and re-edit correctly
- [ ] Historical matches re-edit correctly after migration
- [ ] Score integrity maintained across all scenarios
- [ ] Edge cases handled properly (0 own goals, high own goals)

---

## Estimated Timeline

- **Phase 1 (Database)**: 30 minutes
- **Phase 2 (Migration)**: 1 hour (including verification)
- **Phase 3 (API)**: 2 hours

- **Phase 4 (UI)**: 3 hours
- **Phase 5 (Testing)**: 2 hours

**Total**: ~8-9 hours of development time

---

## Questions for Clarification

1. **Should we validate that own_goals + player_goals = team_score?** ✅ Yes, add validation
2. **What should happen if historical data has inconsistencies?** Propose: Log warnings but allow the migration to proceed
3. **Should the legacy match editor also be updated?** Propose: Yes, for consistency
4. **Any specific testing scenarios you want to ensure work?** Please specify high-value test cases

This plan ensures that own goals are properly persisted and maintained across the entire match lifecycle, solving the re-editing issue while preserving all existing data. 