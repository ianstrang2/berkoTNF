# **3→2 Metric System Implementation Roadmap**

## **Phase 2A: Documentation Updates**

### **2.1 Update Performance Rating System Specification**

**File**: `docs/SPEC_performance_rating_system.md`

**Changes Required**:
```markdown
### Key Metrics Calculated (UPDATED)
- **`trend_rating`**: Forward-looking performance rating (Power Rating)
- **`trend_goal_threat`**: Predictive goal-scoring ability (Goal Threat)
- ~~**`defensive_score`**: Defensive contribution metric~~ [REMOVED - v3.0]

### Multi-Tiered Architecture (SIMPLIFIED)
- Remove all defensive-specific tier behaviors
- Update examples to show only 2 metrics
- Remove defensive confidence weighting logic

### Historical Blocks Framework (UPDATED)
```json
{
  "start_date": "2024-01-01",
  "end_date": "2024-06-30", 
  "fantasy_points": 74.59,        // For Power Rating
  "goals": 8.76,                  // For Goal Threat
  // REMOVED: "goals_conceded": 0.347,
  // REMOVED: "clean_sheets": 0
  "games_played": 24,
  "weights_sum": 17.28
}
```

### User Interface Percentage Scaling (UPDATED)
- Remove all defensive_score scaling logic
- Update examples to show 2-metric display
- Remove defensive clustering discussion
```

### **2.2 Update Balance Algorithm Specification**

**File**: `docs/SPEC_balance_by_performance_algorithm.md`

**Major Changes**:
```markdown
### 3.0 Algorithm Phases (UPDATED)

#### Phase 1: Data Gathering
- Remove defensive_shield from fetch queries
- Update default handling to remove defensive defaults

#### Phase 3: Multi-Objective Balance Calculation (NEW)
**Multi-Objective Formula**:
```typescript
// Calculate gaps for both metrics
power_gap = |teamA_power_total - teamB_power_total|
goal_gap = |teamA_goal_total - teamB_goal_total|

// Normalize by standard deviation for equal weighting
power_std = standardDeviation(all_player_power_ratings)
goal_std = standardDeviation(all_player_goal_threats)

// Combined loss function
combined_loss = power_gap / power_std + goal_gap / goal_std

// Alternative weighted approach
weighted_loss = 0.6 * (power_gap / power_std) + 0.4 * (goal_gap / goal_std)
```

#### Phase 4: Modified Snake Draft (UPDATED)
- Sort by Power Rating only (not composite score)
- Same 4-position cycle pattern

#### Phase 5: Multi-Objective Hill-Climbing (NEW)
- Minimize combined_loss instead of single gap
- Accept swaps only if combined_loss reduces
- Termination: combined_loss < 1.0 OR max iterations

### 5.0 Data Dependencies (UPDATED)
**Required Fields**:
- `aggregated_player_power_ratings.trend_rating` (Power Rating)
- `aggregated_player_power_ratings.trend_goal_threat` (Goal Threat)
- ~~REMOVED: defensive_shield~~

**Algorithm Constants**:
- ~~REMOVED: ALPHA, BETA weights~~
- `POWER_WEIGHT = 0.6` (if using weighted approach)
- `GOAL_WEIGHT = 0.4` (if using weighted approach)
```

## **Phase 2B: SQL Function Updates**

### **2.3 Update Main Calculation Function**

**File**: `sql/update_half_and_full_season_stats.sql`

**Key Changes**:

```sql
-- REMOVE from historical blocks creation
-- OLD:
v_block_data := jsonb_build_object(
    'start_date', v_start_date,
    'end_date', v_end_date,
    'fantasy_points', COALESCE(v_fantasy_sum, 0),
    'goals', COALESCE(v_goals_sum, 0),
    'goals_conceded', COALESCE(v_goals_conceded_weighted, 0), -- REMOVE THIS
    'games_played', COALESCE(v_games_played, 0),
    'weights_sum', COALESCE(v_weights_sum, 0),
    'clean_sheets', COALESCE(v_clean_sheets, 0) -- REMOVE THIS
);

-- NEW:
v_block_data := jsonb_build_object(
    'start_date', v_start_date,
    'end_date', v_end_date,
    'fantasy_points', COALESCE(v_fantasy_sum, 0),
    'goals', COALESCE(v_goals_sum, 0),
    'games_played', COALESCE(v_games_played, 0),
    'weights_sum', COALESCE(v_weights_sum, 0)
);

-- REMOVE entire defensive score calculation section
-- Lines ~477-481 in current file

-- UPDATE aggregated_player_power_ratings insert
INSERT INTO aggregated_player_power_ratings (
    player_id, rating, variance, effective_games, goal_threat,
    trend_rating, trend_goal_threat  -- REMOVE: defensive_shield, defensive_score
) VALUES (
    v_player_id, 
    COALESCE(v_trend_rating, 5.35), 
    0.10,
    COALESCE(v_raw_games, 0), 
    COALESCE(v_trend_goal_threat, 0),
    COALESCE(v_trend_rating, 5.35),
    COALESCE(v_trend_goal_threat, 0)  -- REMOVE: defensive values
) ON CONFLICT (player_id) DO UPDATE SET
    trend_rating = EXCLUDED.trend_rating,
    trend_goal_threat = EXCLUDED.trend_goal_threat,
    rating = EXCLUDED.rating,
    goal_threat = EXCLUDED.goal_threat,  -- REMOVE: defensive_shield, defensive_score
    updated_at = NOW();

-- UPDATE league averages calculation
SELECT 
    AVG(trend_goal_threat), 
    COUNT(*)  -- REMOVE: AVG(defensive_score)
INTO v_league_avg_goal_threat, v_count_players  -- REMOVE: v_league_avg_defensive_score
FROM aggregated_player_power_ratings 
WHERE trend_rating IS NOT NULL;

-- UPDATE final record updates
UPDATE aggregated_player_power_ratings 
SET 
    league_avg_goal_threat = v_league_avg_goal_threat
    -- REMOVE: league_avg_defensive_score = v_league_avg_defensive_score
WHERE TRUE;
```

## **Phase 3: Database Schema Migration**

### **3.1 Database Schema Changes**

**Migration Script**: `migrations/remove_defensive_metrics.sql`

```sql
-- Migration: Remove defensive metrics from aggregated_player_power_ratings
-- WARNING: This is a destructive operation. Backup data first.

-- Step 1: Backup defensive data (optional)
CREATE TABLE defensive_metrics_backup AS 
SELECT player_id, defensive_shield, defensive_score, league_avg_defensive_score, updated_at
FROM aggregated_player_power_ratings;

-- Step 2: Remove defensive columns
ALTER TABLE aggregated_player_power_ratings 
DROP COLUMN IF EXISTS defensive_shield,
DROP COLUMN IF EXISTS defensive_score,
DROP COLUMN IF EXISTS league_avg_defensive_score;

-- Step 3: Clean up historical_blocks JSONB (remove defensive data)
UPDATE aggregated_half_season_stats 
SET historical_blocks = (
    SELECT jsonb_agg(
        jsonb_build_object(
            'start_date', (block->>'start_date'),
            'end_date', (block->>'end_date'),
            'fantasy_points', (block->>'fantasy_points')::numeric,
            'goals', (block->>'goals')::numeric,
            'games_played', (block->>'games_played')::int,
            'weights_sum', (block->>'weights_sum')::numeric
        )
    )
    FROM jsonb_array_elements(historical_blocks) AS block
)
WHERE historical_blocks IS NOT NULL AND historical_blocks != '[]'::jsonb;

-- Step 4: Update Prisma schema
-- File: prisma/schema.prisma
-- Remove these fields from aggregated_player_power_ratings model:
-- - defensive_shield  Decimal? @db.Decimal
-- - defensive_score   Decimal? @db.Decimal

-- Step 5: Regenerate Prisma client
-- Run: npx prisma generate
```

### **3.2 API Endpoint Updates**

**Files to Update**:
- `src/app/api/player/trends/[playerId]/route.ts`
- `src/app/api/playerprofile/route.ts`
- Any other endpoints that reference defensive metrics

**Changes**:
```typescript
// REMOVE from fetch queries
.select('trend_rating,trend_goal_threat,defensive_score,league_avg_goal_threat,league_avg_defensive_score')

// NEW
.select('trend_rating,trend_goal_threat,league_avg_goal_threat')

// REMOVE from response objects
powerRatings: {
  rating: Number(powerRatings.rating),
  goal_threat: Number(powerRatings.goal_threat || 0),
  // REMOVE: defensive_shield: Number(powerRatings.defensive_shield || 0),
}

// UPDATE league normalization (remove defensive)
const leagueNormalization = {
  powerRating: { min: ..., max: ..., average: ... },
  goalThreat: { min: ..., max: ..., average: ... },
  // REMOVE: defensiveShield: { ... }
};
```

## **Phase 4: Balancing Algorithm Updates**

### **4.1 Update Balance Service**

**File**: `src/services/TeamBalance.service.ts`

```typescript
interface BalanceMetrics {
  powerRating: number;
  goalThreat: number;
  // REMOVE: defensiveShield: number;
}

// NEW: Multi-objective balance calculation
function calculateMultiObjectiveBalance(
  teamA: BalanceMetrics[],
  teamB: BalanceMetrics[],
  playerPool: BalanceMetrics[],
  useWeighting: boolean = false
): number {
  // Calculate team totals
  const teamAPower = teamA.reduce((sum, p) => sum + p.powerRating, 0);
  const teamBPower = teamB.reduce((sum, p) => sum + p.powerRating, 0);
  const teamAGoals = teamA.reduce((sum, p) => sum + p.goalThreat, 0);
  const teamBGoals = teamB.reduce((sum, p) => sum + p.goalThreat, 0);

  // Calculate standard deviations for normalization
  const powerStd = calculateStandardDeviation(playerPool.map(p => p.powerRating));
  const goalStd = calculateStandardDeviation(playerPool.map(p => p.goalThreat));

  // Calculate normalized gaps
  const powerGap = Math.abs(teamAPower - teamBPower) / powerStd;
  const goalGap = Math.abs(teamAGoals - teamBGoals) / goalStd;

  // Return combined loss
  if (useWeighting) {
    return 0.6 * powerGap + 0.4 * goalGap;
  } else {
    return powerGap + goalGap;
  }
}

// UPDATE: Hill climbing optimization
function optimizeTeamsMultiObjective(
  initialTeamA: Player[],
  initialTeamB: Player[],
  playerMetrics: Map<number, BalanceMetrics>,
  playerPool: BalanceMetrics[]
): { teamA: Player[], teamB: Player[], balanceScore: number } {
  let bestTeamA = [...initialTeamA];
  let bestTeamB = [...initialTeamB];
  let bestLoss = calculateMultiObjectiveBalance(
    bestTeamA.map(p => playerMetrics.get(p.id)!),
    bestTeamB.map(p => playerMetrics.get(p.id)!),
    playerPool
  );

  const MAX_ITERATIONS = 2000;
  const TARGET_LOSS = 1.0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Try random swap
    const randomA = Math.floor(Math.random() * bestTeamA.length);
    const randomB = Math.floor(Math.random() * bestTeamB.length);

    // Create test teams with swap
    const testTeamA = [...bestTeamA];
    const testTeamB = [...bestTeamB];
    [testTeamA[randomA], testTeamB[randomB]] = [testTeamB[randomB], testTeamA[randomA]];

    // Calculate new loss
    const testLoss = calculateMultiObjectiveBalance(
      testTeamA.map(p => playerMetrics.get(p.id)!),
      testTeamB.map(p => playerMetrics.get(p.id)!),
      playerPool
    );

    // Accept if improvement
    if (testLoss < bestLoss) {
      bestTeamA = testTeamA;
      bestTeamB = testTeamB;
      bestLoss = testLoss;

      // Early termination if good enough
      if (bestLoss < TARGET_LOSS) {
        break;
      }
    }
  }

  return {
    teamA: bestTeamA,
    teamB: bestTeamB,
    balanceScore: Math.max(0, Math.min(100, 100 - (bestLoss / 2) * 100)) // Convert to percentage
  };
}
```

### **4.2 Update Team API Routes**

**Files**: All balance-related API routes
- `src/app/api/admin/balance-teams/`
- `src/app/api/admin/balance-by-past-performance/`
- Any other balancing endpoints

**Changes**:
- Remove defensive_shield from all queries
- Update balance calculation calls
- Update response objects to exclude defensive metrics

## **Phase 5: Frontend Display Updates**

### **5.1 Update Player Profile Component**

**File**: `src/components/player/PlayerProfile.component.tsx`

```typescript
// UPDATE interface
interface PowerRatings {
  rating: number;
  goal_threat: number;
  // REMOVE: defensive_shield: number;
  updated_at: string;
}

// UPDATE display section - remove defensive shield
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Power Rating */}
  <PowerSlider
    label="Power Rating"
    value={powerPercentage}
    percentage={`${powerPercentage}% better than league`}
    trend={powerTrend}
    sparklineData={powerSparkline}
  />
  
  {/* Goal Threat */}
  <PowerSlider
    label="Goal Threat"
    value={goalPercentage}
    percentage={`${goalPercentage}%`}
    trend={goalTrend}
    sparklineData={goalSparkline}
  />
  
  {/* REMOVE: Defensive Shield component */}
</div>
```

### **5.2 Update Trends API Component**

**File**: `src/app/api/player/trends/[playerId]/route.ts`

```typescript
// UPDATE response structure
return NextResponse.json({
  success: true,
  data: {
    current: {
      powerRating: Number(powerRatings.trend_rating),
      goalThreat: Number(powerRatings.trend_goal_threat),
      // REMOVE: defensiveScore
    },
    percentages: {
      powerRating: Math.min(100, powerPercentage),
      goalThreat: Math.min(100, goalPercentage),
      // REMOVE: defensiveScore
    },
    historical: processedBlocks,
    lastUpdated: powerRatings.updated_at
  }
});
```

## **Phase 6: Testing & Validation**

### **6.1 Unit Tests**
```typescript
// Test multi-objective balance calculation
describe('Multi-Objective Balance', () => {
  test('equal weighting produces expected results', () => {
    const result = calculateMultiObjectiveBalance(teamA, teamB, playerPool, false);
    expect(result).toBeLessThan(previousCompositeResult);
  });

  test('weighted approach maintains 60/40 priority', () => {
    const result = calculateMultiObjectiveBalance(teamA, teamB, playerPool, true);
    // Validate that power rating gaps affect result more than goal gaps
  });
});
```

### **6.2 Integration Tests**
- Test full balancing flow with 2 metrics
- Validate API responses exclude defensive data
- Test frontend renders correctly with 2 metrics
- Verify database migration completed successfully

## **Phase 7: Deployment Strategy**

### **7.1 Deployment Sequence**
1. **Database Migration**: Run schema changes during maintenance window
2. **Backend Deployment**: Deploy updated SQL functions and API endpoints
3. **Frontend Deployment**: Deploy updated UI components
4. **Cache Invalidation**: Clear all cached rating data
5. **Validation**: Run post-deployment health checks

### **7.2 Rollback Plan**
- Keep defensive_metrics_backup table for 30 days
- Maintain previous version of balance algorithm as fallback
- Monitor balance quality metrics for 2 weeks post-deployment

## **Phase 8: Monitoring & Optimization**

### **8.1 Success Metrics**
- **Balance Quality**: Average goal difference per match
- **Competitive Rate**: Percentage of matches with ≤2 goal difference
- **Algorithm Performance**: Hill-climbing iteration counts and convergence
- **User Satisfaction**: Player feedback on balance perception

### **8.2 Future Optimizations**
- A/B test equal vs weighted multi-objective approaches
- Monitor tier system effectiveness with 2-metric data
- Consider position-based weightings if needed
- Evaluate algorithm performance vs computational cost

**Estimated Timeline**: 4-6 weeks from validation completion to full deployment. 