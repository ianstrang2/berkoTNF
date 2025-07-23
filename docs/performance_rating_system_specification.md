# Performance Rating System Specification v5.0

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
- Uses width_bucket for 1-99 range
- Defaults to 50 when all values in a period are equal
- Only calculated after raw values are finalized
- Never used in trend calculations

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