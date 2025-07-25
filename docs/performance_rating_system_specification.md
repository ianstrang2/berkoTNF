# Performance Rating System Specification v5.4.3

## Overview
The Performance Rating System provides player performance metrics for both team balancing and player statistics display. It uses historical data to calculate trends and provides both raw metrics for team balancing and percentile-based displays for player profiles.

## Core Metrics

### Power Rating
- Based on fantasy points per game
- Raw values used for team balancing
- Percentiles calculated per-period for historical display
- Trend analysis for current form

### Goal Threat
- Goals per game ratio
- No artificial cap (removed 1.5 limit)
- Raw values used for team balancing
- Percentiles calculated per-period for historical display
- Trend analysis for current form

### Attendance Rate
- Games played vs available games
- Calculated as percentage per period
- Uses same trend analysis as other metrics

## Period Qualification
- Dynamic games threshold based on player history
- Minimum games = 25% of player's average games per period
- Hard minimum of 3 games, maximum of 6 games
- Example: If player averages 20 games per period, they need 5 games to qualify

## Trend Analysis
- Uses proper statistical regression (REGR_SLOPE)
- Calculated on raw values, not percentiles
- Projects forward ~6 months (one period)
- Latest value + (slope × projection period)
- Trends used for both display and team balancing

## Data Storage

### Historical Blocks
```typescript
interface PeriodBlock {
  start_date: string;
  end_date: string;
  games_played: number;
  power_rating: number;
  goal_threat: number;
  participation: number;
  power_rating_percentile: number;
  goal_threat_percentile: number;
  participation_percentile: number;
  total_fantasy_points: number;
  total_goals: number;
}
```

### Current Trends
```typescript
interface PlayerTrends {
  trend_rating: number;
  trend_goal_threat: number;
  trend_participation: number;
  power_rating_percentile: number;
  goal_threat_percentile: number;
}
```

## Percentile Calculation
- Calculated separately for each 6-month period
- Uses PERCENT_RANK for true relative percentiles that reflect actual league standings
- Formula: `ROUND((PERCENT_RANK() OVER (PARTITION BY period ORDER BY metric ASC) * 100)::numeric, 1)`
- Defaults to 50 when all values in a period are equal
- Only calculated after raw values are finalized
- Never used in trend calculations
- **Fixed Issue**: Previously used `width_bucket()` which gave bucket positions rather than true percentile rankings

## Edge Cases

### New Players
- Track raw stats immediately
- Use raw data for team balancing
- Don't show ratings until qualification threshold met
- Clear qualification status display

### Missing Periods
- Handle gaps in participation
- Use available periods for trends
- Clear status indication

## Validation Tools
- Admin data view at `/admin/data`
- Shows raw values and percentiles for all periods
- Allows comparison of historical data vs current trends
- Helps validate calculation correctness

## Implementation Notes
- All calculations performed in database
- Single SQL function handles all updates
- No temporary tables - pure CTE pipeline
- Proper error handling for edge cases
- Cache invalidation on updates

### Execution Dependencies
- **Critical**: `update_power_ratings()` must run AFTER `update_half_and_full_season_stats()`
- **Reason**: Basic stats function deletes/rebuilds `aggregated_half_season_stats`, removing `historical_blocks`
- **Current Solution**: Execution order enforced in `trigger-stats-update` API route
- **Future**: Architectural separation needed for robust data ownership

## Recent Fixes (v5.1)

### SQL Function Corrections
- **Fixed Window Function Issue**: Separated regression calculation (`w_agg`) from latest value retrieval (`w_first`) to ensure proper statistical calculations
- **Fixed CTE Execution**: Added reference to `upsert_trends` CTE in final INSERT to ensure trend calculations execute
- **Deterministic Results**: Added explicit ORDER BY to `trend_final` CTE for consistent results

### API Improvements  
- **Added Historical Blocks**: Updated `/api/playerprofile` endpoint to include `historical_blocks` in response for debugging tools
- **Debugging Support**: Enhanced admin data view at `/admin/data` to properly display raw values and percentiles

### Validation Status
- ✅ 54/79 players now have valid trend ratings (68% success rate)
- ✅ 55/55 players with match history have populated historical blocks (100% success rate)
- ✅ Admin debugging page functional for data validation

## Ringer Data Strategy (v5.4)

### Problem: Inconsistent Ringer Handling
- **Profile 404s**: Ringers with substantial match history (Jude McKay: 18 matches) couldn't access player profiles
- **Debug Tool Gaps**: Admin debugging page excluded ringers, preventing power rating validation
- **Data Fragmentation**: Ringers had power ratings but missing profile/historical data
- **Team Balancing**: Some ringers (Jude: 18 matches, Finn: 7 matches) have enough data for meaningful balance calculations

### Solution: Data Layer vs Presentation Layer Strategy
**Data Layer (SQL Functions)**: Generate data for all non-retired players (including ringers)
- ✅ `update_half_and_full_season_stats.sql`: Include ringers (`WHERE p.is_retired = false`)
- ✅ `update_aggregated_player_profile_stats.sql`: Include ringers (`WHERE p.is_retired = false`)
- ✅ `update_aggregated_all_time_stats.sql`: Include ringers (`WHERE p.is_retired = false`)
- ❌ **Keep exclusions**: `aggregated_season_race_data`, `aggregated_season_honours_and_records`, `aggregated_hall_of_fame` (competition integrity)

**Presentation Layer (Frontend)**: Filter display based on context
- **Include Ringers**: Admin tools, debugging pages, player profiles, team balancing
- **Exclude Ringers**: Public leaderboards, season races, awards/honors, records

### Benefits
- **🔧 Robust Debugging**: Admin tools work for all players with data
- **🚫 Eliminated 404s**: Player profiles accessible for all players
- **⚖️ Flexible Display**: Same data, context-appropriate views
- **🏆 Competition Integrity**: Awards/races remain fair for regular players
- **📊 Complete Analysis**: Backend has full dataset for team balancing

### API Improvements
- **Trends API**: Enhanced to handle missing `historical_blocks` gracefully for ringers
- **Admin Players API**: Added retirement filter to exclude retired players from debugging dropdown
- **Debug Page**: Enhanced with special ringer display showing current trend values in card format
- **Team Balancing**: Ringers contribute meaningful calculated values (Jude: trend_rating=3, trend_goal_threat=1.85) instead of zeros

### Critical Fix: Ringer Data Anomalies (v5.4.1)
- **Root Cause**: Including ringers in percentile calculations caused data anomalies that disrupted window functions
- **Symptom**: All players (including regular players) had empty `historical_blocks = []`
- **Solution**: Hybrid approach - include ringers in basic stats calculation but exclude from historical blocks generation
- **Result**: Regular players get full data, ringers get real trend values but empty historical blocks (preventing 404s)

### Admin Interface Improvements (v5.4.2)
- **Retired Player Filter**: Updated `/api/admin/players` to exclude retired players from debugging dropdown (`WHERE is_retired = false`)
- **Ringer Trend Calculation**: Modified power ratings function to include ringers in trend calculation but exclude from historical blocks
- **Hybrid Approach**: Ringers get real calculated trend values (for team balancing) but empty historical blocks (to avoid percentile issues)
- **Enhanced Ringer Display**: Added special debugging view for ringers showing current trend values in card format
- **Validated Results**: Jude McKay (ringer) now shows trend_rating=3, trend_goal_threat=1.85, power_rating_percentile=34, goal_threat_percentile=100

### Final Implementation Status (v5.4.4)
- ✅ **Regular Players**: Full historical blocks + trend data with accurate percentile rankings
- ✅ **Ringers**: Real trend values displayed in special card layout with amber warning indicator
- ✅ **Retired Players**: Completely excluded from debugging interface
- ✅ **Team Balancing**: Ringers now contribute meaningful data instead of zeros
- ✅ **Data Integrity**: Historical blocks remain stable through proper execution order
- ✅ **Percentile Accuracy**: True rank-based percentiles using PERCENT_RANK() instead of width_bucket()
- ⚠️ **Known Issue**: Fragile execution order dependency between update functions (architectural fix needed)

## Critical Fixes (v5.4.4)

### Percentile Calculation Accuracy Fix
- **Issue**: `width_bucket()` approach gave bucket positions, not actual league percentile rankings
- **Symptom**: Players with excellent performance (e.g., 7th out of 28) showed middle percentiles (47th)
- **Root Cause**: `width_bucket()` divides value range into buckets, doesn't reflect rank-based standings
- **Fix**: Replaced with `PERCENT_RANK()` for true rank-based percentiles
- **Formula**: `ROUND((PERCENT_RANK() OVER (ORDER BY metric ASC) * 100)::numeric, 1)`
- **Result**: 7th place out of 28 players now correctly shows ~78th percentile instead of 47th
- **Impact**: Both historical period percentiles AND trend percentiles now accurately reflect league standings

### Function Execution Order Dependency
- **Issue**: `update_half_and_full_season_stats()` deletes all `aggregated_half_season_stats` data, including `historical_blocks` populated by `update_power_ratings()`
- **Symptom**: Players showing as "ringers" with empty historical data after stats updates
- **Root Cause**: `DELETE FROM aggregated_half_season_stats WHERE TRUE;` removes complex analytics data
- **Temporary Fix**: Moved `call-update-power-ratings` to run LAST in execution order
- **Location**: `src/app/api/admin/trigger-stats-update/route.ts` - reordered `FUNCTIONS_TO_CALL` array
- **Future**: Requires architectural separation of basic stats vs complex analytics data

## Critical Fixes (v5.2)

### Goal Threat Calculation Bug
- **Issue**: Function was counting "games with goals" instead of "total goals scored"
- **Root Cause**: `COUNT(*) FILTER (WHERE COALESCE(pm.goals,0) > 0)` in data collection
- **Fix**: Changed to `SUM(COALESCE(pm.goals,0))` to get actual goal totals
- **Impact**: Top scorers like Pete Hay now show correct percentiles (90th+ instead of 65th)

### Trend Calculation Regression Bug  
- **Issue**: Trends were mathematically impossible (Pete Hay: 1.273 recent → 0.693 trend)
- **Root Cause**: Using epoch timestamps as X-variable in `REGR_SLOPE` caused:
  - Massive numbers (billions) leading to precision loss
  - Uneven weighting of periods due to time gaps
  - Wrong projection multiplier (15,778,463 seconds ≈ 6 months)
- **Fix**: Sequential period indexing approach
  - Added `period_seq` CTE with `ROW_NUMBER() OVER (ORDER BY period_end ASC)` 
  - Changed regression to use period sequence (1, 2, 3...) as X-variable
  - Set projection multiplier to 1 (one period ahead)
  - Separated trend pipeline from historical blocks pipeline

### Mathematical Foundation
- **Regression Formula**: `latest_value + slope × 1` where slope uses period sequence
- **Benefits**: 
  - Even weighting of all qualified periods regardless of time gaps
  - Avoids floating-point precision issues with large numbers
  - Intuitive "per-period" trend units
  - Realistic projections close to recent performance

### Updated Validation Status  
- ✅ Goal threat calculations now accurate (Pete Hay: 1.423 trend vs 1.273 recent)
- ✅ Trend projections mathematically sound across all metrics
- ✅ Historical blocks and trends work independently
- ✅ Top performers show appropriate percentiles (90th+ for league leaders)

## Trend Capping Enhancement (v5.3)

### The Problem: Uncapped Linear Regression
- **Linear extrapolation risks**: Small samples can produce unrealistic projections
- **Example**: Tarik's 42.5 power rating could spike to 60+ with one more strong period
- **Negative values**: James Shuker's -0.135 power rating is impossible (points can't be negative)
- **Percentile distortion**: Extreme outliers skew rankings, making stable players feel undervalued

### The Solution: Historical Bounds Capping
```sql
-- Global min/max across all qualified periods
historical_dist AS (
    SELECT 
        MIN(power_rating) AS min_power,
        MAX(power_rating) AS max_power,
        MIN(goal_threat) AS min_threat,
        MAX(goal_threat) AS max_threat,
        MIN(participation) AS min_part,
        MAX(participation) AS max_part
    FROM period_rates
    WHERE power_rating IS NOT NULL
),

-- Apply caps post-regression
trend_final AS (
    SELECT DISTINCT ON (tc.player_id)
        tc.player_id,
        GREATEST(hd.min_power, LEAST(hd.max_power, tc.latest_rating + tc.rating_slope * 1)) AS trend_rating,
        GREATEST(hd.min_threat, LEAST(hd.max_threat, tc.latest_threat + tc.threat_slope * 1)) AS trend_goal_threat,
        GREATEST(hd.min_part, LEAST(hd.max_part, tc.latest_part + tc.part_slope * 1)) AS trend_participation
    FROM trend_core tc
    CROSS JOIN historical_dist hd
    ORDER BY tc.player_id
)
```

### Benefits
- **Realistic projections**: Trends anchored to empirically observed league performance
- **Robust percentiles**: Eliminates extreme outlier inflation
- **User trust**: Projections feel grounded in historical feasibility
- **Industry standard**: Similar to ESPN fantasy, MLB PECOTA, NFL projections

### Mathematical Foundation
- **Formula**: `capped_trend = GREATEST(historical_min, LEAST(historical_max, uncapped_trend))`
- **Global bounds**: Uses league-wide min/max across all players and periods
- **Preserves regression**: Caps applied post-calculation, maintaining slope accuracy
- **Edge case handling**: Single-period players default to latest value (already bounded)