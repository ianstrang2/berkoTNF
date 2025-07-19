# BerkoTNF Performance Rating System Specification

**Version:** 2.3  
**Last Updated:** January 2025  
**Status:** Production Implementation

**Latest Changes:**
- Added outlier protection for established players
- Implemented catastrophic rating drop prevention for championship-level performers
- Switched from 90th percentile to qualified maximum scaling (15+ games only)
- Added 100% UI capping to prevent confusing >100% displays
- Fixed small-sample outlier bias completely

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

### Key Metrics Calculated

- **`trend_rating`**: Forward-looking performance rating based on recent form and historical trends
- **`trend_goal_threat`**: Predictive goal-scoring ability (capped at 1.5 goals per weighted game)
- **`defensive_score`**: Defensive contribution metric (0.5 to 0.95 scale)

### Data Sources

- **6-month historical blocks**: Weighted performance data aggregated into rolling 6-month periods
- **Match-level data**: Individual game results, goals, clean sheets, fantasy points
- **Time-decay weighting**: Recent performances weighted more heavily using exponential decay

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
  "fantasy_points": 74.59,        // Time-decay weighted total
  "goals": 8.76,                  // Time-decay weighted total
  "goals_conceded": 0.347,        // Team goals conceded per game
  "games_played": 24,             // Raw game count
  "weights_sum": 17.28,           // Sum of decay weights
  "clean_sheets": 0               // Raw clean sheet count
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

// Use their maximum values as 100% benchmarks
power_rating_100 = Math.max(...qualifiedPlayers.map(s => s.trend_rating))
goal_threat_100 = Math.max(...qualifiedPlayers.map(s => s.trend_goal_threat))  
defensive_100 = Math.max(...qualifiedPlayers.map(s => s.defensive_score))

// Player percentage = MIN(100%, (player_value / qualified_max) × 100)
```

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
protected_rating = 0.3 × negative_rating + 0.7 × positive_previous_rating
```

**Rationale**: Extreme negative swings are often outliers and shouldn't dominate the rating.

### Seasonal Gaps & Low Activity

- **Lookback Extension**: Search up to 18 months for qualifying blocks
- **Graduated Re-entry**: First block after a long gap gets reduced confidence weight
- **Weighted Averaging**: If no large recent blocks exist, use weighted average of all qualifying blocks

### Missing Data Safeguards

- **Null Safety**: All calculations include COALESCE and NULLIF protections
- **Division by Zero**: Weighted sums are checked before division
- **Default Values**: Sensible defaults provided when no data exists

---

## Real-World Example: Pete Hay Case Study

### The Problem

Pete Hay (player_id = 50) had 110 total games across 6 seasons but his rating was severely undervalued due to a recent 3-game slump:

- **Before Fix**: trend_rating = 1.57, trend_goal_threat = 0.0
- **Root Cause**: 3-game block with -3.43 rating and 0 goals was dominating the calculation

### Historical Block Analysis

| Period | Games | Avg Rating | Avg Goals | Status |
|--------|-------|------------|-----------|---------|
| 2022H2 | 13 | 15.08 | 0.83 | Good sample |
| 2023H1 | 24 | 4.32 | 0.51 | Good sample |
| 2023H2 | 18 | 4.44 | 0.85 | Good sample |
| 2024H1 | 13 | 6.41 | 0.47 | Good sample |
| 2024H2 | 18 | -1.37 | 0.35 | Negative period |
| 2025H1 | 21 | **7.49** | **0.44** | Strong recovery |
| 2025H2 | **3** | **-3.43** | **0.00** | **Tiny sample - problematic** |

### Solution Applied

1. **Tier Classification**: Pete → ESTABLISHED (110+ games)
2. **Block Filtering**: 3-game block excluded (< 10 game minimum)
3. **Trend Calculation**: Used 21-game block (7.49 rating, 0.44 goals)
4. **Confidence Weighting**: High confidence in larger sample
5. **Historical Context**: Goal threat calculated from blocks with actual goals

### Results

- **After Fix**: trend_rating = 3.95 (+151%), trend_goal_threat = 0.41 (restored)
- **Validation**: Rating now reflects his true ability across 6 seasons
- **Protection**: Future small samples won't tank his rating

---

## Technical Implementation

### Database Schema

#### Core Tables
- `aggregated_half_season_stats`: Current season stats with historical_blocks JSONB
- `aggregated_player_power_ratings`: Calculated trend metrics and league averages
- `player_matches`: Raw match-level performance data
- `matches`: Match metadata and team scores

#### Key Functions
- `update_half_and_full_season_stats()`: Main calculation engine
- `calculate_match_fantasy_points()`: Standardized match scoring
- `get_current_half_season_start_date()` / `get_current_half_season_end_date()`: Date helpers

### Calculation Flow

```sql
FOR each player:
  1. Get years where player has matches
  2. Create 6-month blocks for those years only
  3. Apply time-decay weighting within blocks
  4. Classify player tier based on total games
  5. Select qualifying blocks based on tier requirements
  6. Calculate base trend metrics
  7. Apply confidence weighting and blending
  8. Enforce tier-specific minimums and caps
  9. Handle edge cases (zero goals, negative ratings, etc.)
  10. Store final metrics
```

### Performance Considerations

- **Batch Processing**: All players processed in single transaction
- **Efficient Queries**: CTEs and window functions for block selection
- **Minimal I/O**: JSONB storage for historical blocks reduces table joins
- **Cache Invalidation**: Automatic cache metadata updates

---

## Validation & Testing

### Test Cases

#### New Player Scenarios
- **Single 3-game block**: Should get reasonable starting rating
- **Mixed small blocks**: Should blend appropriately with league averages
- **Rapid improvement**: Should be responsive to genuine skill development

#### Developing Player Scenarios  
- **6-game minimum**: Should exclude smaller samples
- **Moderate swings**: Should balance stability with responsiveness
- **Skill plateau**: Should reflect consistent performance

#### Established Player Scenarios
- **10-game minimum**: Should protect against small sample bias
- **Temporary slumps**: Should not dramatically alter long-term rating
- **Genuine decline**: Should eventually reflect real skill changes
- **Seasonal gaps**: Should handle breaks gracefully

### Edge Case Testing
- **Zero goals across multiple blocks**: Historical average restoration
- **All negative ratings**: Minimum floor protection  
- **Missing historical data**: Graceful degradation to available data
- **Extreme outliers**: Confidence weighting and blending protection

### Performance Validation
- **Pete Hay Case**: ✅ 1.57 → 3.95 rating improvement
- **New Player Fairness**: ✅ Appropriate starting ratings
- **System Stability**: ✅ No extreme swings from small samples
- **Computational Efficiency**: ✅ Single-transaction processing

---

## Maintenance & Evolution

### Monitoring Metrics
- Distribution of ratings by tier
- Frequency of edge case triggers
- Performance calculation time
- Rating stability over time

### Future Enhancements
- **Seasonal Adjustment**: Account for league-wide performance changes
- **Position-Specific Metrics**: Differentiate expectations by playing position  
- **Opponent Strength**: Incorporate difficulty of opposition
- **Match Context**: Weight important matches more heavily

### Configuration Parameters
All key thresholds stored in `app_config` table for easy adjustment:
- Tier boundaries (30, 75 games)
- Minimum block sizes (3, 6, 10 games)
- Confidence blending ratios
- Maximum percentage change limits

---

## Conclusion

The BerkoTNF Performance Rating System represents a significant advancement in fair, adaptive player rating calculation. By implementing a multi-tiered approach with confidence weighting, the system successfully:

- **Protects experienced players** from small sample bias
- **Supports new players** with appropriate starting ratings  
- **Maintains responsiveness** for genuine skill changes
- **Handles edge cases** gracefully and transparently

The Pete Hay case study demonstrates the system's effectiveness in correcting rating injustices while maintaining computational efficiency and logical transparency. This specification serves as the definitive source of truth for understanding, maintaining, and evolving the rating system.

---

*For technical implementation details, see `sql/update_half_and_full_season_stats.sql`*  
*For algorithm testing, see test cases in `/tests/performance_rating_tests.sql`* 