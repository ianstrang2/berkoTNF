# BerkoTNF - Balance by Performance Algorithm Specification

**Version:** 1.0  
**Date:** 2024-12-19  
**Author:** System Documentation  

---

## 1.0 Overview

This document provides a definitive, forensic-level specification for the **Balance by Performance** team balancing algorithm. Its purpose is to serve as the single source of truth for all current and future implementations, ensuring the logic is preserved perfectly.

The algorithm's primary goal is to create balanced teams based on three key performance metrics: **power rating**, **goal threat**, and **defensive shield**. It uses a sophisticated composite scoring system combined with modified snake draft methodology and hill-climbing optimization to achieve optimal team balance.

## 2.0 Core Principles

1.  **Three-Metric Composite Scoring:** The algorithm combines power rating, goal threat, and defensive shield into a single balanced performance score.
2.  **Weighted Performance Formula:** Attack capabilities (goal threat) are weighted at 60% while defensive capabilities (defensive shield) are weighted at 40%.
3.  **Modified Snake Draft with Optimization:** Initial team distribution uses a specialized snake draft pattern, followed by hill-climbing optimization.
4.  **League-Relative Scoring:** Goal threat and defensive shield are calculated relative to league averages for the current player pool.

---

## 3.0 Algorithm Phases

The balancing process is executed in five distinct phases.

### **Phase 1: Authoritative Data Gathering**

This phase collects all necessary data from the database at the moment of execution to ensure data freshness.

1.  **Fetch Player Performance Data:** Query the `aggregated_player_power_ratings` table using the provided `playerIds` to retrieve:
    - `rating` (power rating)
    - `goal_threat` (attacking effectiveness)
    - `defensive_shield` (defensive effectiveness)
    - `variance` (confidence in rating)
2.  **Handle Missing Data:** Apply default values for any missing performance data:
    - Default rating: 5.35 (league prior mean)
    - Default variance: 0.10
    - Missing goal threat/defensive shield: Use calculated league averages

**Data Sources:**
- All three metrics are calculated and stored via the `update_half_and_full_season_stats.sql` function
- Values are derived from historical match performance data

### **Phase 2: League Average Calculation**

This phase establishes the baseline for relative performance scoring.

1.  **Goal Threat Average:** Calculate the mean goal threat from all fetched players with non-null values.
2.  **Defensive Shield Average:** Calculate the mean defensive shield from all fetched players with non-null values.
3.  **Baseline Establishment:** These averages serve as the reference point for relative performance calculations.

**Key Implementation Details:**
- Only players with non-null values contribute to averages
- If no valid data exists, averages default to 0
- Averages are recalculated for each balancing operation to reflect current player pool

### **Phase 3: Composite Score Calculation**

This phase creates a single performance score combining all three metrics using a weighted formula.

**Composite Score Formula:**
```
score = rating + ALPHA × (goal_threat - league_avg_goal_threat) + BETA × (defensive_shield - league_avg_defensive_shield)
```

**Where:**
- `ALPHA = 0.6` (Attack weight - 60%)
- `BETA = 0.4` (Defense weight - 40%)

**Rationale:**
- Power rating provides the baseline player ability
- Goal threat differential shows attacking capability relative to peers
- Defensive shield differential shows defensive capability relative to peers
- 60/40 weighting slightly favors attacking ability over defensive ability

### **Phase 4: Modified Snake Draft Distribution**

This phase uses a specialized snake draft pattern to create initial team assignments based on composite scores.

1.  **Sort by Composite Score:** Players are sorted in descending order by their calculated composite scores.
2.  **Modified Snake Draft Pattern:** Unlike traditional alternating assignment, this uses a 4-position cycle:
    - **Positions 0, 3 (1st, 4th, 5th, 8th, ...):** Assign to Team A
    - **Positions 1, 2 (2nd, 3rd, 6th, 7th, ...):** Assign to Team B
3.  **Initial Balance Assessment:** Calculate the initial team score gap using the sum of composite scores.

**Modified Snake Draft Example (8v8 match):**
```
Draft Order by Composite Score:
1st(8.2) → Team A    5th(7.1) → Team A    9th(6.2) → Team A    13th(5.3) → Team A
2nd(8.0) → Team B    6th(6.9) → Team B    10th(6.0) → Team B   14th(5.1) → Team B
3rd(7.8) → Team B    7th(6.7) → Team B    11th(5.8) → Team B   15th(4.9) → Team B
4th(7.5) → Team A    8th(6.5) → Team A    12th(5.6) → Team A   16th(4.7) → Team A

Team A: 1st, 4th, 5th, 8th, 9th, 12th, 13th, 16th
Team B: 2nd, 3rd, 6th, 7th, 10th, 11th, 14th, 15th
```

**Rationale:**
- This pattern provides better initial balance than simple alternating assignment
- Prevents one team from getting consecutive top picks

### **Phase 5: Hill-Climbing Optimization**

This phase applies iterative improvement to achieve optimal team balance.

1.  **Gap Assessment:** Calculate the absolute difference between team composite score totals.
2.  **Optimization Loop:** Perform up to 2000 iterations of random player swaps:
    - Select random player from each team
    - Calculate potential new gap if players were swapped
    - Accept swap only if it improves balance (reduces gap)
3.  **Termination Conditions:**
    - Gap falls below threshold (1.0)
    - Maximum iterations reached (2000)
    - No improvement found

**Hill-Climbing Parameters:**
- `MAX_HILL_CLIMB_ITERATIONS = 2000`
- `GAP_THRESHOLD = 1.0`
- **Selection:** Random player selection from each team
- **Acceptance:** Only improvements are accepted (greedy approach)

### **Phase 6: Balance Percentage Calculation & Final Assignment**

This phase calculates the final balance quality and saves the optimized teams.

1.  **Balance Percentage Formula:**
    ```typescript
    gap = Math.abs(totalA - totalB)
    meanAB = (totalA + totalB) / 2
    balancePercent = Math.max(0, Math.min(100, 100 - (gap / meanAB) * 100))
    ```

2.  **Final Team Assignment:** Return the optimized team compositions with balance percentage.

**Balance Percentage Interpretation:**
- **100%:** Perfect balance (identical team totals)
- **95-99%:** Excellent balance
- **90-94%:** Good balance
- **80-89%:** Acceptable balance
- **<80%:** Poor balance (may need manual adjustment)

---

## 4.0 Algorithm Characteristics

### **Strengths:**
- **Multi-Dimensional Balance:** Considers attacking, defensive, and overall performance capabilities
- **Adaptive Scoring:** Uses league-relative metrics that adjust to current player pool
- **Optimization-Enhanced:** Hill-climbing ensures better balance than draft alone
- **Quantifiable Results:** Provides precise balance percentage for quality assessment
- **Robust Handling:** Gracefully handles missing data with intelligent defaults

### **Limitations:**
- **Position Agnostic:** Does not consider player positions or tactical roles
- **Computational Intensity:** Hill-climbing optimization requires more processing than simple drafts
- **Fixed Weighting:** 60/40 attack/defense weighting cannot be adjusted dynamically
- **Random Optimization:** Hill-climbing uses random swaps which may not find global optimum

### **Use Cases:**
- Matches where overall performance balance is prioritized over positional balance
- Situations where you want quantified balance assessment
- Games where attacking vs defensive capabilities matter more than specific positions
- When you need reproducible, data-driven team assignments

---

## 5.0 Data Dependencies

### **Required Database Tables:**
- `aggregated_player_power_ratings`: Source of all three performance metrics

### **Required Fields:**
- `aggregated_player_power_ratings.rating`: Base power rating (Decimal)
- `aggregated_player_power_ratings.goal_threat`: Attacking effectiveness (Decimal)
- `aggregated_player_power_ratings.defensive_shield`: Defensive effectiveness (Decimal)
- `aggregated_player_power_ratings.variance`: Rating confidence (Decimal)

### **Algorithm Constants:**
- `ALPHA = 0.6`: Attack weighting factor
- `BETA = 0.4`: Defense weighting factor  
- `DEFAULT_RATING = 5.35`: League prior mean for missing ratings
- `DEFAULT_VARIANCE = 0.10`: Default confidence for missing data
- `MAX_HILL_CLIMB_ITERATIONS = 2000`: Optimization iteration limit
- `GAP_THRESHOLD = 1.0`: Acceptable balance gap for early termination

### **Data Generation:**
All performance metrics are calculated by the `update_half_and_full_season_stats.sql` function:
- **Rating:** Fantasy points-based with Bayesian smoothing
- **Goal Threat:** Weighted goals per game
- **Defensive Shield:** Inverse of goals conceded relative to league average

---

## 6.0 Mathematical Foundation

### **Performance Metrics Definitions:**

**Power Rating (rating):**
- Base performance metric combining goals, assists, and other fantasy point contributors
- Uses Bayesian updating with league prior (5.35) to handle small sample sizes
- Higher values indicate better overall performance

**Goal Threat (goal_threat):**
- Measures attacking effectiveness: `weighted_goals / total_weight_games`
- Represents expected goals per game weighted by match importance
- Used relative to league average to normalize across different scoring environments

**Defensive Shield (defensive_shield):**
- Measures defensive effectiveness: `1 - (player_goals_conceded / league_average_goals_conceded)`
- Values closer to 1 indicate stronger defensive performance
- Calculated relative to league average to account for different defensive contexts

### **Composite Score Rationale:**
The weighted formula balances individual excellence (rating) with specialized capabilities (goal threat and defensive shield):

```
score = baseline_ability + attack_differential + defense_differential
      = rating + 0.6×(goal_threat - avg) + 0.4×(defensive_shield - avg)
```

This ensures teams are balanced not just on overall ability, but also on attacking and defensive specializations.

---

## 7.0 Error Handling

The algorithm includes specific error handling for common failure scenarios:

1.  **Missing Performance Data:** Uses intelligent defaults (league averages, prior means)
2.  **Database Query Failures:** Throws descriptive error messages
3.  **Empty Team Prevention:** Validates team arrays before optimization
4.  **Division by Zero:** Protects balance percentage calculations with zero checks

---

_End of Specification._ 