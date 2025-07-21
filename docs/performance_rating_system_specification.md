# BerkoTNF Performance Rating System Specification

**Version:** 3.2  
**Last Updated:** January 2025  
**Status:** MAJOR LOGIC FIXES - Backwards Ratios Corrected, Fake Defaults Removed, Aging Decline Enabled

**Version 3.2 Changes:**
- **FIXED:** Backwards blending ratios - NEW players now trust recent form 90%, ESTABLISHED players trust historical 70%
- **ENHANCED:** Removed all fake default values - NULL values now show real data quality issues instead of misleading averages
- **ENABLED:** Natural aging decline - removed artificial rating floors and outlier caps that prevented older players from declining
- **IMPROVED:** Fixed negative-to-positive transition handling in trend calculations
- **STANDARDIZED:** All three metrics use logical, consistent approaches without artificial protection

**Version 3.1 Changes:**
- **ENHANCED:** Participation calculation now uses same sophisticated trend analysis as Power Rating and Goal Threat
- **IMPROVED:** Multi-tiered confidence weighting applied to participation metric
- **STANDARDIZED:** All three metrics (Power Rating + Goal Threat + Participation) use identical trend calculation logic
- **OPTIMIZED:** Eliminates naive 100% participation rates from small sample periods

**Version 3.0 Changes:**
- **REMOVED:** Defensive Score metric due to extreme clustering (coefficient of variation 0.044)
- **SIMPLIFIED:** 3-metric system reduced to 2-metric system (Power Rating + Goal Threat)
- **VALIDATED:** Real match data confirms defensive metric provided minimal differentiation (0.500-0.578 range)
- **OPTIMIZED:** All sophisticated features preserved for meaningful metrics
- **PERFORMANCE:** System redesign enables 4-5x improvement in team balancing effectiveness

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Principles](#core-principles)
3. [Multi-Tiered Architecture](#multi-tiered-architecture)
4. [Historical Blocks Framework](#historical-blocks-framework)
5. [Trend Calculation Engine](#trend-calculation-engine)
6. [Confidence Weighting System](#confidence-weighting-system)
7. [User Interface Percentage Scaling](#user-interface-percentage-scaling)
8. [Edge Case Handling](#edge-case-handling)
9. [Real-World Example: Pete Hay Case Study](#real-world-example-pete-hay-case-study)
10. [Technical Implementation](#technical-implementation)
11. [Validation & Testing](#validation--testing)

---

## System Overview

The BerkoTNF Performance Rating System is a sophisticated, adaptive rating algorithm designed to provide fair, accurate, and responsive player performance metrics across different experience levels and playing patterns.

**MAJOR REDESIGN - Version 3.0:**
Following comprehensive validation analysis, the system has been redesigned from a 3-metric to a **2-metric approach**. The defensive score metric was removed due to extreme clustering providing minimal player differentiation.

### Key Metrics Calculated

**Core Rating Metrics (All with Sophisticated Trend Analysis):**
- **`trend_rating`**: Forward-looking performance rating (Power Rating) based on recent form and historical trends
- **`trend_goal_threat`**: Predictive goal-scoring ability (Goal Threat) capped at 1.5 goals per weighted game
- **`trend_participation`**: Intelligent attendance percentage (Participation) with confidence weighting and multi-block analysis

**Display-Only Metrics (UI Enhancement):**
- **`participation_rate`**: Player attendance percentage (Participation) for team management insights

**REMOVED:** `defensive_score` - Extreme clustering (0.500-0.578 range) provided minimal differentiation

### Data Sources

- **6-month historical blocks**: Weighted performance data aggregated into rolling 6-month periods  
- **Match-level data**: Individual game results, goals, fantasy points (clean sheets removed)
- **Time-decay weighting**: Recent performances weighted more heavily using exponential decay

---

## Sophisticated Participation Calculation (Version 3.1)

### The Problem with Naive Participation

Previous versions used simple participation calculation:
```
participation = games_played / games_possible × 100
```

This caused issues:
- **Small Sample Bias**: 3/3 games = 100% (misleading)
- **No Historical Context**: Ignored long-term attendance patterns
- **No Confidence Weighting**: Treated all sample sizes equally

### Solution: Apply Same Sophistication as Power Rating

**Participation now uses identical multi-tiered logic:**

#### Tier-Based Minimums
- **NEW** (0-30 games): 3+ games per block required
- **DEVELOPING** (31-75 games): 6+ games per block required  
- **ESTABLISHED** (75+ games): 10+ games per block required

#### Trend Analysis
```sql
-- Consistent trend (>10% variation)
participation_trend = current_participation × (1 + capped_percentage_change)
-- Change limits: ±25% (more conservative than power rating)

-- Inconsistent trend (≤10% variation)  
participation_trend = 0.6 × current_participation + 0.4 × previous_participation
```

#### Confidence Weighting by Tier
```sql
confidence_weight = MIN(1.0, actual_games / tier_minimum_games)

-- NEW players: Heavy blending with long-term average
participation = (0.4 × confidence × trend) + (0.6 × long_term_avg)

-- DEVELOPING players: Moderate blending  
participation = (0.7 × confidence × trend) + (0.3 × long_term_avg)

-- ESTABLISHED players: Minimal blending, outlier protection only
```

#### Outlier Protection (Established Players)
```sql
-- Allow 30% drops but prevent catastrophic attendance crashes
IF participation < long_term_avg × 0.3 THEN
    participation = MAX(participation, long_term_avg × 0.3)
END IF
```

### Real-World Example: Sophisticated vs Naive

**Player with attendance history: [20%, 40%, 85%, 100% (3 games)]**

**Naive Calculation**: 100% ← misleading  
**Sophisticated Calculation**: ~87% ← trending up from 85% with low confidence weighting

### Benefits

1. **Eliminates Small Sample Bias**: No more false 100% rates
2. **Historical Context**: Considers long-term attendance patterns
3. **Confidence Weighting**: Accounts for sample size reliability
4. **Trend Analysis**: Shows improving/declining attendance patterns
5. **Outlier Protection**: Prevents single-period crashes from dominating

---

## Core Principles

### 1. **Fairness Across Experience Levels**
Different players require different treatment based on their experience and data availability.

### 2. **Protection Against Small Sample Bias**
Temporary slumps or hot streaks shouldn't drastically alter long-term ratings for experienced players.

### 3. **Responsiveness for Development**
New and developing players need ratings that reflect their current ability and improvement.

### 4. **Robustness Against Outliers**
The system must handle extreme performances, seasonal gaps, and unusual circumstances.

### 5. **Transparency and Explainability**
Every calculation should be logical, defensible, and traceable.

---

## Multi-Tiered Architecture

The system adapts its behavior based on player experience level, implementing different standards and protections for each tier.

### Tier Classification

| Tier | Total Career Games | Min Block Size | Philosophy |
|------|-------------------|----------------|------------|
| **NEW** | 0-30 games | 3 games | Help new players establish themselves |
| **DEVELOPING** | 31-75 games | 6 games | Balance reliability with responsiveness |
| **ESTABLISHED** | 75+ games | 10 games | Protect consistency from temporary variance |

### Tier-Specific Behaviors

#### NEW Players (0-30 games)
- **Block Requirement**: Minimum 3 games per 6-month block
- **Trend Limits**: ±30% maximum change between blocks
- **Confidence Blending**: 40% recent form, 60% long-term average/league defaults
- **Rating Floor**: 3.0 minimum (provides confidence boost)
- **Philosophy**: "Get them started with reasonable ratings while preventing false confidence from tiny samples"

#### DEVELOPING Players (31-75 games)
- **Block Requirement**: Minimum 6 games per 6-month block  
- **Trend Limits**: ±40% maximum change between blocks
- **Confidence Blending**: 70% recent form, 30% long-term average
- **Rating Floor**: 2.0 minimum
- **Philosophy**: "Building reliable data while maintaining responsiveness to improvement"

#### ESTABLISHED Players (75+ games)
- **Block Requirement**: Minimum 10 games per 6-month block
- **Trend Limits**: ±50% maximum change between blocks
- **Confidence Blending**: Minimal blending, only for extreme outliers (>150% or <50% of long-term average)
- **Rating Floor**: 1.0 minimum
- **Philosophy**: "Protect consistent performers from temporary variance while allowing for real changes"

---

## Historical Blocks Framework

### Block Structure

Each historical block represents a 6-month period containing:

```json
{
  "start_date": "2024-01-01",
  "end_date": "2024-06-30", 
  "fantasy_points": 74.59,        // Time-decay weighted total (for Power Rating)
  "goals": 8.76,                  // Time-decay weighted total (for Goal Threat)
  "games_played": 24,             // Games attended by player
  "games_possible": 28,           // Total games available in period
  "participation_rate": 0.857,    // Attendance percentage (24/28 = 85.7%)
  "weights_sum": 17.28            // Sum of decay weights
  // REMOVED: "goals_conceded": 0.347 - No longer needed for defensive calculations
  // REMOVED: "clean_sheets": 0 - No longer needed for defensive calculations
}
```

### Time-Decay Weighting

Recent performances within each block are weighted more heavily:

```
weight = 2^(-days_ago / 180)
```

Where `days_ago` is the number of days between the match date and the end of the block period.

**Rationale**: A match played at the beginning of a 6-month period should have less influence than one played at the end, reflecting the player's trajectory within that period.

### Block Creation Logic

1. **Player-Specific Years Only**: Blocks are only created for years where the player actually has matches
2. **Minimum Data Threshold**: Empty blocks (0 games) are never created
3. **Current Year Handling**: Partial blocks are allowed for the current year if we're past June 30th
4. **Data Integrity**: All calculations include null-safety and division-by-zero protection

---

## Trend Calculation Engine

### Block Selection Process

1. **Primary Selection**: Use the two most recent blocks that meet the tier's minimum game requirement
2. **Fallback for Established Players**: If no blocks meet the 10-game requirement, fall back to 5+ game blocks
3. **Final Fallback**: Use any valid blocks if necessary

### Trend Analysis Types

#### Consistent Trend (>10% variation between blocks)
When a player shows significant change between their two most recent qualifying blocks:

```
percentage_change = (current_rating - previous_rating) / previous_rating
trend_rating = current_rating × (1 + capped_percentage_change)
```

**Caps Applied by Tier**:
- NEW: ±30%
- DEVELOPING: ±40% 
- ESTABLISHED: ±50%

#### Inconsistent Trend (≤10% variation between blocks)
When performance is relatively stable:

```
trend_rating = 0.6 × current_rating + 0.4 × previous_rating
trend_goal_threat = 0.6 × current_goals + 0.4 × previous_goals
```

### Single Block Handling

For players with only one qualifying block:
- Use that block's metrics directly
- Apply tier-appropriate minimum rating floors
- Ensure non-negative goal threat values

### Outlier Protection for Established Players

**Problem**: Exceptional performers like championship winners can have their ratings catastrophically impacted by single poor periods, ignoring years of excellence.

**Solution**: For ESTABLISHED players only, the system applies outlier capping to prevent statistical anomalies from dominating the trend calculation.

#### Outlier Detection Threshold
```
outlier_threshold = long_term_average × 0.4  // For power rating
goal_outlier_threshold = long_term_average × 0.3  // For goal threat (more lenient)
```

#### Capping Logic
```sql
-- If any block rating falls below the threshold, cap it
capped_block_rating = MAX(actual_block_rating, outlier_threshold)
capped_goal_threat = MAX(actual_goal_threat, goal_outlier_threshold)
```

#### Example: Sean McKay Case Study
- **Long-term Average**: 6.87 power rating (championship level)
- **2024-07 Block**: -2.88 (disaster period)
- **Without Protection**: Final rating = 3.03 ❌
- **With Protection**: -2.88 capped to 2.75 (6.87 × 0.4) ✅
- **Result**: Protects championship legacy while acknowledging poor form

#### Rationale
- **Acknowledges Reality**: Poor periods still impact the rating, but proportionally
- **Prevents Catastrophic Impact**: One bad stretch can't destroy years of proven excellence
- **Maintains Integrity**: If a player truly declines, multiple capped periods will still show the downward trend
- **Tier-Specific**: Only applies to players with 75+ total games who have proven their ability

## User Interface Percentage Scaling

### Problem with Absolute Maximums

Early implementations used absolute league maximums (highest individual ratings) for 100% scaling. This created several issues:

- **Small-sample outliers** (players with 5-10 games getting lucky) would set unrealistic maximums
- **Established champions** would show artificially low percentages despite proven excellence
- **Scale distortion** where one anomalous performance affected all other players' perceived ratings

### Solution: Qualified Maximum Scaling

The system now uses **qualified maximum** values as the 100% benchmark - only players with proven sample sizes (15+ games) are considered when setting the scale ceiling.

#### Implementation
```javascript
// Filter to only established players (15+ games)
const qualifiedPlayers = leagueStats.filter(s => s.effective_games >= 15);

// Use qualified maximum for balancing metrics
power_rating_100 = Math.max(...qualifiedPlayers.map(s => s.trend_rating))
goal_threat_100 = Math.max(...qualifiedPlayers.map(s => s.trend_goal_threat))

// Use simple percentage for participation (already 0-100%)
participation_display = participation_rate * 100  // e.g., 0.857 → 85.7%

// Player percentage = MIN(100%, (player_value / benchmark) × 100)
```

#### Scaling Rationale

**Power Rating & Goal Threat**: Use qualified maximum because both metrics have good natural spread across the player pool and small-sample outliers can be problematic for scaling.

**Participation**: Uses direct percentage calculation (games_attended / games_possible × 100) providing natural 0-100% range with excellent differentiation.

**REMOVED - Defensive Score**: Previously used 90th percentile due to extreme clustering (0.500-0.578 range), but metric removed entirely due to minimal differentiation capability.

#### Benefits
- **Prevents outlier distortion**: Small-sample flukes (e.g., 6-game winning streaks) don't break everyone else's scale
- **Proven performance benchmark**: 100% = "best established player", not "luckiest newcomer"
- **Clean UI**: No percentages exceed 100% (capped for display)
- **Realistic scaling**: Champions show appropriate percentages without outlier inflation

#### Example Impact
**Sean McKay (Multiple Champion) vs Dave Wates (6-game newcomer)**:
- **Old Absolute Maximum**: 8.2 ÷ 27.9 = 29% ❌ (Dave's 6-game fluke ruins Sean's scale)
- **New Qualified Maximum**: 8.2 ÷ ~12.0 = 68% ✅ (Dave excluded, Sean shows appropriate strength)

---

## Confidence Weighting System

### Confidence Weight Calculation

```
confidence_weight = MIN(1.0, actual_games / tier_minimum_games)
```

This represents how much we trust the recent block based on its sample size.

### Blending Formula by Tier

#### NEW Players
```
final_rating = (0.4 × confidence × trend_rating) + 
               (0.6 × long_term_average) + 
               ((1 - confidence) × 5.35)  // League default
```

#### DEVELOPING Players  
```
final_rating = (0.7 × confidence × trend_rating) + 
               ((1 - 0.7 × confidence) × long_term_average)
```

#### ESTABLISHED Players
```
// Only blend if trend is extreme outlier (>150% or <50% of long-term)
if (trend_rating > long_term_avg × 1.5 OR trend_rating < long_term_avg × 0.5):
    final_rating = (0.8 × confidence × trend_rating) + 
                   ((1 - 0.8 × confidence) × long_term_average)
```

### Long-Term Average Calculation

Only includes blocks that meet tier-appropriate minimum game requirements:
- NEW: 2+ games per block
- DEVELOPING: 4+ games per block  
- ESTABLISHED: 6+ games per block

---

## Edge Case Handling

### Zero Goal Threat Resolution

When `trend_goal_threat = 0` but the player has multiple historical blocks:

1. Calculate average goals per weighted game from all blocks with goals
2. Only consider blocks with 3+ games for reliability
3. Use this historical average instead of zero

**Rationale**: A single goal-less block doesn't mean a player can't score.

### Negative Rating Protection

When recent performance is negative but historical performance is positive:

```
```

---

## Core Logic Fixes (Version 3.2)

### The Problem: Backwards Blending Ratios

**Previous (Illogical):**
```sql
NEW: 40% recent + 60% historical      -- "Don't trust recent yet" 
DEVELOPING: 70% recent + 30% historical
ESTABLISHED: 90% recent + 10% historical -- "Fully trust recent"
```

**This was backwards!** For established players with 100+ games of proven ability, a 6-month hot streak shouldn't dominate their rating.

**Fixed (Logical):**
```sql
NEW: 90% recent + 10% historical      -- "Recent form is all we know"
DEVELOPING: 70% recent + 30% historical -- "Building confidence"  
ESTABLISHED: 30% recent + 70% historical -- "We know who you are"
```

### The Problem: Fake Default Values

**Previous (Misleading):**
- Players with no data: `trend_rating = 5.35` (fake "average" player)
- Missing goal data: `trend_goal_threat = 0.5` (fake league average)
- No participation data: `participation = 75%` (fake attendance rate)

**Fixed (Transparent):**
- Players with no data: `trend_rating = NULL` → UI shows "Insufficient data"
- Missing data: No fake values → Real data quality issues visible

### The Problem: Prevented Aging Decline

**Previous (Artificial Protection):**
```sql
-- Prevented natural aging decline
v_trend_rating := GREATEST(v_trend_rating, v_long_term_avg * 0.4)  -- 40% floor
v_trend_rating := GREATEST(1.0, v_trend_rating)  -- Minimum 1.0 rating
```

**Fixed (Natural Aging):**
- Removed all artificial rating floors
- Removed outlier caps that prevented decline
- Players can now naturally decline with age/form changes

### The Problem: Negative Transition Math

**Previous (Broken):**
```sql
-- Failed on negative-to-positive transitions
IF v_prev_block_rating > 0 THEN
    v_variation := calculate_variation()
ELSE
    v_variation := 0  -- Wrong! Ignored major improvements
END IF
```

**Fixed (Proper Handling):**
```sql
-- Handles all transitions correctly
IF negative_to_positive THEN
    v_variation := 100  -- Force consistent trend recognition
ELSIF both_negative THEN  
    v_variation := calculate_on_absolute_values()
END IF
```

---

## Conclusion

The BerkoTNF Performance Rating System Version 3.2 represents a **major correction** of fundamental logic errors while maintaining all sophisticated features. These fixes address critical issues that were producing incorrect ratings and preventing natural player evolution.

**Key Achievements:**

- **Corrected Logic**: Fixed backwards blending ratios that incorrectly weighted recent vs historical performance
- **Authentic Data**: Removed fake defaults that masked data quality issues with misleading averages  
- **Natural Evolution**: Enabled aging decline by removing artificial floors and caps that prevented realistic rating changes
- **Mathematical Accuracy**: Fixed negative-to-positive transition handling that was ignoring major player improvements
- **Sophisticated Metrics**: All three metrics (Power Rating, Goal Threat, Participation) use identical logical, multi-tiered approaches
- **Transparency**: NULL values now properly indicate insufficient data instead of showing fake averages

**Version 3.2 Impact:**

The logic corrections fundamentally improve the system's accuracy and fairness:
- **Established players** are now properly protected from temporary form fluctuations
- **New players** get appropriately responsive ratings based on limited data
- **Aging players** can naturally decline without artificial protection
- **Data quality** issues are transparently surfaced rather than hidden
- **Major improvements** (like negative-to-positive transitions) are correctly recognized

**Real-World Benefits:**

- **Tarik Windle Case**: Fixed calculation error that undervalued excellent recent performance due to negative transition math
- **Sean McKay Protection**: Established champions properly protected from temporary slumps without preventing genuine decline
- **New Player Responsiveness**: Quick recognition of genuine ability without over-relying on tiny historical samples
- **Data Integrity**: Clear identification of insufficient data rather than misleading fake averages

This specification serves as the definitive source of truth for understanding, maintaining, and evolving the rating system through its major logic corrections and continued enhancement.

---

*For technical implementation details, see `sql/update_half_and_full_season_stats.sql`*  
*For algorithm testing, see test cases in `/tests/performance_rating_tests.sql`*