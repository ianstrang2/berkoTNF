# **3→2 Metric System Validation Plan**

## **1. Defensive Metric Correlation Analysis**

### **Hypothesis Testing**
- **H0**: Defensive scores correlate with match outcomes
- **H1**: Defensive scores have weak/no correlation with team performance

### **Queries to Run**
```sql
-- Test correlation between defensive_score and team wins
WITH player_defensive AS (
  SELECT 
    pm.player_id,
    apr.defensive_score,
    COUNT(CASE WHEN pm.result = 'W' THEN 1 END) as wins,
    COUNT(*) as total_games,
    COUNT(CASE WHEN pm.result = 'W' THEN 1 END)::float / COUNT(*) as win_rate
  FROM player_matches pm
  JOIN aggregated_player_power_ratings apr ON pm.player_id = apr.player_id
  WHERE pm.match_date >= '2024-01-01'  -- Recent data only
  GROUP BY pm.player_id, apr.defensive_score
  HAVING COUNT(*) >= 10  -- Minimum sample size
)
SELECT 
  CORR(defensive_score, win_rate) as defensive_win_correlation,
  CORR(defensive_score, total_games) as defensive_games_correlation
FROM player_defensive;

-- Compare defensive vs power rating correlation
WITH correlations AS (
  SELECT 
    pm.player_id,
    apr.trend_rating,
    apr.defensive_score,
    COUNT(CASE WHEN pm.result = 'W' THEN 1 END)::float / COUNT(*) as win_rate
  FROM player_matches pm
  JOIN aggregated_player_power_ratings apr ON pm.player_id = apr.player_id
  WHERE pm.match_date >= '2024-01-01'
  GROUP BY pm.player_id, apr.trend_rating, apr.defensive_score
  HAVING COUNT(*) >= 10
)
SELECT 
  CORR(trend_rating, win_rate) as power_rating_correlation,
  CORR(defensive_score, win_rate) as defensive_correlation,
  CORR(trend_rating, win_rate) - CORR(defensive_score, win_rate) as correlation_difference
FROM correlations;
```

## **2. Historical Balance Effectiveness Analysis**

### **Backtest 2-Metric vs 3-Metric Balancing**

**Test Method**:
1. Get historical match player pools (last 20 matches)
2. Run both algorithms on same data
3. Compare theoretical balance scores
4. Analyze actual match results for validation

```sql
-- Get recent match player pools for testing
SELECT 
  m.match_id,
  m.match_date,
  array_agg(pm.player_id) as player_pool,
  array_agg(pm.team) as team_assignments
FROM matches m
JOIN player_matches pm ON m.match_id = pm.match_id
WHERE m.match_date >= '2024-06-01'  -- Last 6 months
GROUP BY m.match_id, m.match_date
ORDER BY m.match_date DESC
LIMIT 20;
```

### **Balance Quality Metrics**
```typescript
interface BalanceTest {
  matchId: number;
  current3MetricBalance: number;
  proposed2MetricBalance: {
    powerRatingGap: number;
    goalThreatGap: number;
    combinedScore: number;
  };
  actualOutcome: {
    goalDifference: number;
    wasCompetitive: boolean; // |goal_diff| <= 2
  };
}
```

## **3. Multi-Objective Hill Climbing Simulation**

### **Test Both Approaches**

**Current Composite Method**:
```typescript
score = power_rating + 0.6 * (goal_threat - avg_goal_threat)
gap = |teamA_score - teamB_score|
```

**Proposed Multi-Objective Method**:
```typescript
power_gap = |teamA_power - teamB_power|
goal_gap = |teamA_goals - teamB_goals|
combined_loss = power_gap / power_std + goal_gap / goal_std
```

**Alternative Weighted Version**:
```typescript
combined_loss = 0.6 * (power_gap / power_std) + 0.4 * (goal_gap / goal_std)
```

### **Simulation Test Script**
```typescript
// Test with sample data from recent matches
const testBalancing = async (playerPool: Player[]) => {
  const compositeResult = balanceByComposite(playerPool);
  const multiObjectiveEqual = balanceByMultiObjective(playerPool, { powerWeight: 0.5, goalWeight: 0.5 });
  const multiObjectiveWeighted = balanceByMultiObjective(playerPool, { powerWeight: 0.6, goalWeight: 0.4 });
  
  return {
    composite: calculateBalanceMetrics(compositeResult),
    multiEqual: calculateBalanceMetrics(multiObjectiveEqual),
    multiWeighted: calculateBalanceMetrics(multiObjectiveWeighted)
  };
};
```

## **4. Tier System Value Analysis**

### **Test Tier vs No-Tier Performance**
```sql
-- Compare rating stability with/without tier protections
WITH tier_analysis AS (
  SELECT 
    player_id,
    games_played,
    CASE 
      WHEN games_played <= 30 THEN 'NEW'
      WHEN games_played <= 75 THEN 'DEVELOPING' 
      ELSE 'ESTABLISHED'
    END as tier,
    trend_rating,
    LAG(trend_rating) OVER (PARTITION BY player_id ORDER BY updated_at) as prev_rating
  FROM aggregated_player_power_ratings
  WHERE updated_at >= '2024-01-01'
)
SELECT 
  tier,
  COUNT(*) as updates,
  AVG(ABS(trend_rating - prev_rating)) as avg_rating_change,
  STDDEV(ABS(trend_rating - prev_rating)) as rating_volatility,
  COUNT(CASE WHEN ABS(trend_rating - prev_rating) > 2.0 THEN 1 END) as extreme_changes
FROM tier_analysis
WHERE prev_rating IS NOT NULL
GROUP BY tier;
```

## **5. Expected Validation Results**

### **Defensive Metric Validation**
- **Expected**: Correlation < 0.2 with match outcomes
- **Threshold**: If correlation < 0.3, proceed with removal
- **Power Rating Comparison**: Should show significantly higher correlation

### **Balance Effectiveness**
- **Expected**: Multi-objective produces similar or better balance
- **Threshold**: ≥90% of matches show equal/better competitive outcomes
- **Metric**: Competitive match rate (goal difference ≤2)

### **Tier System Value**
- **Expected**: ESTABLISHED players show lower volatility than others
- **Threshold**: If tier differences < 20%, consider simplification
- **Focus**: Validate that protection mechanisms actually help

## **6. Decision Matrix**

| Validation Test | Go/No-Go Threshold | Action if Failed |
|-----------------|-------------------|-------------------|
| Defensive Correlation | < 0.3 correlation | Proceed with removal |
| Balance Effectiveness | ≥90% equal/better | Proceed with multi-objective |
| Multi-Objective Performance | Better in ≥60% of tests | Use multi-objective |
| Tier System Value | ≥20% volatility reduction | Keep tier system |

## **7. Test Implementation Timeline**

1. **Week 1**: Run correlation and historical balance analysis
2. **Week 2**: Implement and test multi-objective algorithms
3. **Week 3**: Validate tier system effectiveness
4. **Week 4**: Final validation and go/no-go decision

**Success Criteria**: All major validations pass thresholds before proceeding to implementation. 