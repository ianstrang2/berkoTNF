# Performance Rating System Refactoring Plan

## Overview
Complete rewrite of the performance rating system focusing on proper statistical analysis, dynamic rules, and efficient data storage. This is not an evolution of the old system, but a clean implementation of a simpler, more statistically valid approach.

## Key Decisions

### Period Qualification
- Dynamic games threshold based on player history
- Minimum games = 25% of player's average games per period
- Hard minimum of 3 games, maximum of 6 games
- Example: If player averages 20 games per period, they need 5 games to qualify

### Trend Analysis
- Using proper statistical regression (REGR_SLOPE) instead of weighted averages
- Removed arbitrary 70/30 weighting
- Trend calculated on raw data, not percentiles
- Projection window: ~6 months (15778463 seconds)

### Metrics
1. Power Rating
   - Based on fantasy points per game
   - Raw values used for team balancing
   - Percentiles for display only

2. Goal Threat
   - Goals per game ratio
   - No artificial cap (removed 1.5 limit)
   - Raw values for team balancing
   - Percentiles for display only

3. Participation
   - Games played vs available games
   - Calculated as percentage
   - Uses same trend analysis as other metrics

### Display vs Balancing
- Raw values used for team balancing
- Percentiles calculated AFTER trend analysis
- Historical blocks store both raw and percentile data
- Percentiles are period-specific (comparing players within same period)

### Data Structure
- No temporary tables needed
- All calculations done in memory with CTEs
- Maintains compatibility with existing frontend
- Historical blocks stored as JSONB for flexibility

## Implementation Details

### SQL Function Flow
1. Calculate raw period stats
   ```sql
   - Group matches into 6-month periods
   - Calculate games played, fantasy points, goals
   ```

2. Calculate rates
   ```sql
   - Power rating = fantasy_points / games_played
   - Goal threat = goals / games_played
   - Participation = (games_played / total_games) * 100
   ```

3. Calculate trends
   ```sql
   - Use REGR_SLOPE for proper trend analysis
   - Project forward ~6 months
   - Based on raw values, not percentiles
   ```

4. Calculate percentiles
   ```sql
   - Period-specific percentiles for historical blocks
   - Overall percentiles for current trends
   - Using width_bucket for 1-99 range
   ```

5. Update tables
   ```sql
   - aggregated_player_power_ratings for current trends
   - aggregated_half_season_stats for historical blocks
   ```

### Frontend Impact
- No changes needed to frontend components
- Maintains existing data structure:
  ```typescript
  interface TrendData {
    power_rating_percentile: number;
    goal_threat_percentile: number;
    participation_percentile: number;
    sparkline_data: Array<{
      period: string;
      power_rating: number;
      goal_threat: number;
      participation: number;
      // ... other fields
    }>;
  }
  ```

## Migration Plan
1. ✅ Backup current SQL function
2. ⬜ Deploy new function
3. ⬜ Verify data structure matches frontend expectations
4. ⬜ Monitor trend calculations for reasonableness
5. ⬜ Validate team balancing still works correctly

## Future Considerations
- Consider IQR-based outlier detection for goal threat
- Monitor if 25% qualifying threshold needs adjustment
- Consider dynamic period counts based on player history
- May need to adjust trend projection window based on usage

## Testing Checklist
- [ ] Verify period boundaries are correct
- [ ] Check qualifying period calculations
- [ ] Validate trend calculations
- [ ] Compare percentile distributions
- [ ] Test with new players (< 2 periods)
- [ ] Test with long-history players
- [ ] Verify sparkline data format
- [ ] Check team balancing results 