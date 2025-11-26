# Performance Rating System Specification

**Version:** 6.0.0 (EWMA)  
**Last Updated:** November 26, 2025  
**Status:** ✅ Production Complete (January 2025)

---

## Overview

Player performance metrics for team balancing and statistics display using **Exponentially Weighted Moving Average (EWMA)** methodology.

**Key Features:**
- EWMA calculations for smooth recency weighting
- Bayesian shrinkage for new players
- Percentile rankings across league
- Three core metrics: Power Rating, Goal Threat, Participation

**Data Source:** `aggregated_performance_ratings` table  
**Calculation:** `update_power_ratings()` SQL function  
**Update Frequency:** After every match completion

---

## Core Metrics

### Power Rating

**Method:** Exponentially weighted fantasy points per weighted game

**Formula:**
```
power_rating = (Σ fantasy_points × weight) / (Σ games × weight)
where weight = e^(-λt), λ = ln(2) / half_life
```

**Configuration:**
- Half-life: 730 days (2 years) - configurable via `app_config`
- Bayesian prior: 5-game weight at league average (5.35)
- Usage: Raw values for balancing, percentiles for display

### Goal Threat

**Method:** Exponentially weighted goals per weighted game

**Formula:**
```
goal_threat = (Σ goals × weight) / (Σ games × weight)
```

**Configuration:**
- Same EWMA methodology as power rating
- Bayesian shrinkage applied consistently
- Usage: Raw values for balancing, percentiles for display

### Participation Rate

**Method:** Weighted games played / weighted games available × 100

**Calculation:**
```
participation = (weighted_games_played / weighted_games_available) × 100
```

**Availability:** Counted from player's first match date forward

---

## Qualification System

**Threshold:** 5 weighted games (configurable in `app_config`)

**Display Logic:**
- Qualified players: Show actual percentile rankings
- Unqualified players: Default to 50th percentile
- Guest players: Use EWMA if qualified, defaults otherwise

**Team Balancing:**
- Uses ALL players (qualified + unqualified)
- Unqualified players: Bayesian defaults (shrunk toward league average)
- Universal coverage via Bayesian shrinkage

---

## Percentile Calculation

**Method:** `PERCENT_RANK()` for true rank-based percentiles

**Formula:**
```sql
ROUND((PERCENT_RANK() OVER (ORDER BY metric ASC) * 100)::numeric, 1)
```

**Interpretation:**
- 90th percentile = Better than 90% of qualified players
- 50th percentile = League median
- Calculated across ALL qualified players in tenant

**Edge Cases:**
- All values equal → 50th percentile for everyone
- Unqualified players → Not included in percentile calc
- Single qualified player → 50th percentile by default

---

## Data Storage

### aggregated_performance_ratings table

```typescript
interface PerformanceRating {
  player_id: number;
  tenant_id: string;
  power_rating: number;          // EWMA power rating
  goal_threat: number;           // EWMA goal threat
  participation: number;         // Participation rate
  weighted_played: number;       // Weighted games played
  weighted_available: number;    // Weighted games available
  is_qualified: boolean;         // >= 5 weighted games
  power_percentile: number;      // Rank-based percentile
  goal_percentile: number;
  participation_percentile: number;
  first_match_date: Date;
  updated_at: Date;
}
```

---

## Implementation

### SQL Function

**File:** `sql/update_power_ratings.sql`

**Function:** `update_power_ratings(target_tenant_id UUID)`

**Process:**
1. Calculate EWMA for each metric per player
2. Apply Bayesian shrinkage for new players
3. Calculate percentile rankings (qualified players only)
4. Upsert to `aggregated_performance_ratings` table

**Execution:** Called by background job system after match completion

### Validation Tools

**Admin UI:** `/admin/info` page

**Features:**
- View all player ratings
- EWMA values with percentiles
- Qualification status
- System metadata (weighted games, half-life)

**Purpose:** Validate EWMA calculation correctness

---

## Key Design Decisions

### Decision 1: EWMA vs Period-Based (January 2025)

**Previous:** 6-month period blocks with manual weighting  
**Current:** Continuous EWMA with 2-year half-life

**Benefits:**
- Smooth recency weighting (no period boundaries)
- Simple calculation (single exponential formula)
- Industry-standard approach
- Better reflects current form

### Decision 2: PERCENT_RANK vs width_bucket

**Previous:** `width_bucket()` divided range into buckets  
**Current:** `PERCENT_RANK()` for true rank-based standings

**Example:**
- 7th place out of 28 players
- width_bucket: 47th percentile (wrong!)
- PERCENT_RANK: 78th percentile (correct!)

**Impact:** Percentiles now accurately reflect league standings

### Decision 3: Guest Inclusion Strategy

**Problem:** Guests with match history had 404 profiles  
**Solution:** Include guests in data layer, filter in presentation

**Data Layer (SQL):** Generate ratings for ALL non-retired players  
**Presentation Layer (UI):** Filter guests from public leaderboards

**Benefits:**
- Admin tools work for all players
- Team balancing uses guest data
- Competition integrity maintained

---

## Guest Handling

**Data Generation:**
- ✅ Include in `update_power_ratings()`
- ✅ Include in `update_aggregated_player_profile_stats()`
- ✅ Include in `update_aggregated_all_time_stats()`

**Display:**
- ✅ Show in admin debugging tools
- ✅ Show in player profiles
- ✅ Use in team balancing
- ❌ Exclude from public leaderboards
- ❌ Exclude from season races
- ❌ Exclude from awards/honours

---

## Edge Cases

### New Players (< 5 games)

- Track stats immediately
- Apply Bayesian shrinkage (pulled toward league average)
- Don't show percentiles until qualified
- Use in team balancing with defaults

### Missing Data

- EWMA handles gaps gracefully
- Uses available data only
- Clear "unqualified" indication

### Execution Order

**Known Issue:** `update_half_and_full_season_stats()` deletes data that power ratings needs

**Workaround:** Run `update_power_ratings()` LAST in job queue

**Future:** Separate basic stats from complex analytics data

---

**Document Status:** ✅ Production Complete  
**Last Updated:** November 26, 2025  
**Version:** 6.0.0

**For team balancing usage:** See `SPEC_balance_by_performance_algorithm.md`  
**For SQL function:** See `sql/update_power_ratings.sql`
