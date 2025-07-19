Thank you for providing the context! It seems there was a slight mix-up—my previous message included a draft update to the .md file based on our discussion, but I’ll ensure the full revised specification is presented here as a complete .md document, incorporating all responses to Cursor’s questions and aligning with the latest decisions. Since it’s 02:34 PM BST on July 19, 2025, I’ll finalize this promptly and ensure it’s ready for you to save and use with Cursor.

Revised Specification: docs\update_balance_by_performance.md
Save the following content to C:\Users\Ian\BerkoTNF\docs\update_balance_by_performance.md:

Update Balance by Performance Algorithm Specification
Version: 1.3

Date: 2025-07-19

Author: System Documentation (with input from Ian Strang)

1.0 Overview
This document specifies an updated version of the Balance by Performance algorithm for the BerkoTNF football stats app. The update replaces the previous Bayesian approach with a hybrid trend-based model using 6-month performance blocks, refined with 180-day half-life decay and a long-term baseline to ensure fairness. It enhances team balancing and player profile displays for accurate prediction and usability. The goal is to create perfectly balanced teams, predict player and team performance based on past trends, and provide an intuitive user experience, leveraging the existing aggregated_half_season_stats table with a JSONB extension for historical data.

2.0 Core Principles
6-Month Block Analysis: Performance data is segmented into 6-month periods (Jan 1–Jun 30, Jul 1–Dec 31) to track trends over time, stored in aggregated_half_season_stats with a historical_blocks JSONB column.
Hybrid Trend-Based Scoring: Combines 180-day half-life decay within blocks with a long-term raw average baseline to predict performance, accounting for improvement, deterioration, or flukes.
Balanced Metrics: Integrates trend-adjusted power rating, goal threat, and defensive solidity into a composite score for team balancing.
Fair Distribution: Uses a modified snake draft and optimized hill-climbing to ensure balanced teams in terms of goal threat, defensive solidity, and fantasy points.
3.0 Algorithm Phases
Phase 1: Data Segmentation and Trend Calculation
Process:
Segment match data into 6-month blocks based on match_date and store raw and decayed sums in aggregated_half_season_stats.
For each player, calculate block-specific raw sums of fantasy_points, goals_scored, and goals_conceded using calculate_match_fantasy_points, then apply 180-day half-life decay (weight = POWER(2, -(age_days / 180))) to derive weighted sums.
For single-block players (e.g., new players), use current block decayed averages as the baseline.
For multi-block players (e.g., 2nd block onward, up to 24+ blocks for 12 years):
Compute decayed trend-adjusted values for each metric.
Blend 70% decayed trend + 30% long-term raw average if the decayed value exceeds the average by >20%, using raw averages over all blocks for the baseline.
Define consistent trends as >10% variation in percentage change, using percentage change; inconsistent trends (≤10% variation) use a 60/40 weighted average of the last two blocks’ decayed values.
Example: For blocks with decayed averages [2.1, 2.5, 2.8] goals/game, variation = ((2.8 - 2.5) / 2.5 + (2.5 - 2.1) / 2.1) / 2 = 15.5% > 10% (consistent), trend = +12%, long-term raw average = (2.1 + 2.5 + 2.8) / 3 = 2.47, difference = (2.8 - 2.47) / 2.47 = 13.4% < 20% → Use 2.8 (capped at 1.5).
Metrics:
Trend Rating: Decayed average fantasy_points per game, adjusted by the hybrid trend.
Trend Goal Threat: Decayed average goals per game, capped at 1.5.
Defensive Score: MIN(0.95, 1 / (1 + (team_goals_conceded_rate / NULLIF(league_avg_gc, 0.1)))) * (1 + clean_sheets / games_played), where team_goals_conceded_rate is the decayed average, capped between 0.5 and 1.0.
Phase 2: League Average Calculation
Compute league averages for trend_rating, trend_goal_threat, and defensive_score within the current 6-month period using decayed data from aggregated_half_season_stats, precomputed and stored in aggregated_player_power_ratings to optimize performance.
Phase 3: Composite Score Calculation
Formula:
score = trend_rating + 0.6 * (trend_goal_threat - league_avg_goal_threat) + 0.4 * (defensive_score - league_avg_defensive_score)
Caps: trend_goal_threat ≤ 1.5, defensive_score between 0.5 and 1.0.
Purpose: Balances overall ability, attacking potential, and defensive contribution.
Phase 4: Modified Snake Draft Distribution
Sort players by composite score in descending order.
Use the 4-position cycle (1st, 4th, 5th, 8th to Team A; 2nd, 3rd, 6th, 7th to Team B) for initial team assignments.
Calculate initial team score gap.
Phase 5: Hill-Climbing Optimization
Perform up to 3000 iterations of random player swaps.
Accept swaps only if they reduce the absolute difference between team score totals.
Terminate when the gap falls below 0.5, reaches 3000 iterations, or no improvement is found for 500 iterations.
Validate: If team totals differ by >5%, add 500 more iterations.
Phase 6: Balance Percentage and Final Assignment
Formula: balancePercent = 100 - (ABS(totalA - totalB) / ((totalA + totalB) / 2) * 100), capped at 100%.
Return optimized teams with balance percentage.
4.0 Algorithm Characteristics
Strengths:
Hybrid model balances recency (via decay) with historical stability (via long-term average), adapting to performance evolution.
Capped metrics reduce outlier and fluke impact.
Tighter optimization ensures balanced teams.
Limitations:
Lacks position data, relying on team-level defense stats derived from team_scores, mitigated by clean_sheets weighting.
Trend accuracy depends on sufficient block data across years.
JSONB storage may increase query complexity slightly but is optimized with precomputed averages.
Use Cases:
Matches prioritizing overall balance over positional tactics.
Predictive team assignments based on past 6-month trends.
5.0 Data Dependencies
Tables:
player_matches: Player-team assignments, goals scored, match IDs.
matches: Match dates, team scores.
players: Player IDs.
aggregated_half_season_stats: Extended with historical_blocks JSONB to store all 6-month period aggregates, including current and historical data.
aggregated_season_stats: Existing 12-month aggregates.
aggregated_player_power_ratings: Updated with hybrid trend-adjusted metrics and precomputed league averages.
Functions: calculate_match_fantasy_points for fantasy point calculation, date helpers for period boundaries.
6.0 Performance Metrics Definitions
Trend Rating: Decayed average fantasy_points per game, adjusted by the hybrid trend, reflecting overall ability.
Trend Goal Threat: Decayed average goals per game, capped at 1.5, for attacking potential.
Defensive Score: MIN(0.95, 1 / (1 + (team_goals_conceded_rate / NULLIF(league_avg_gc, 0.1)))) * (1 + clean_sheets / games_played), where team_goals_conceded_rate is the decayed average, capped between 0.5 and 1.0, for team defense contribution with individual weighting.
7.0 Player Profile Display
Metrics:
Power Rating: Hybrid trend-adjusted rating, 0–100% percentile.
Goal Threat: Capped trend_goal_threat, 0–100% percentile.
Defensive Solidity: defensive_score, 0–100% percentile.
Visualization: Sliders with sparklines showing the last 3–6 half-seasons’ trends from historical_blocks; tooltips with exact values and ranks.
Example: Power Rating 45%, Goal Threat 35%, Defensive Solidity 60%, with trend indicators.
8.0 Implementation Notes
Extend aggregated_half_season_stats to include a historical_blocks JSONB column (default []) to store all historical 6-month periods as {start_date, end_date, fantasy_points, goals, goals_conceded, games_played, weights_sum} objects, with precomputed decayed values.
Update update_half_and_full_season_stats.sql to:
Calculate the current half-season, updating the main record.
Loop over all historical half-season periods, computing decayed aggregates (using 180-day half-life decay post-raw aggregation) and appending to historical_blocks with ON CONFLICT (player_id) DO UPDATE.
Derive hybrid trend-adjusted metrics and update aggregated_player_power_ratings, precomputing league averages.
Retain aggregated_season_stats logic.
Modify app logic to use hybrid trend-adjusted metrics from aggregated_player_power_ratings and historical_blocks for balancing and profiles.
Update the half-season screen to use the current record from aggregated_half_season_stats (no date filter needed).
Historical half-season data will populate on the next edge function run after deployment, leveraging full recalculation on match edits.
Validate with sample data (e.g., a 9v9 match edit) to ensure fairness and prediction accuracy.
9.0 Responses to Implementation Challenges
🚨 Critical Schema Conflict
Issue: The player_id UNIQUE constraint in aggregated_half_season_stats prevents multiple 6-month records.
Resolution: Adopt Option C (JSON Storage), adding a historical_blocks JSONB column to store historical data, preserving the current record’s uniqueness and avoiding a breaking change. A Prisma migration will add this column.
🔄 Current Usage Conflicts
Issue: Existing queries assume a single current half-season record.
Resolution: The JSONB approach keeps the current record intact, requiring no query modifications for the half-season screen. Update other uses (e.g., balancing logic) to access historical_blocks via a new API query for trends, ensuring compatibility.
⚠️ Technical Implementation Issues
Defensive Score Data Gap:
Issue: No per-player goals_conceded; relies on team_scores, giving identical ratings.
Resolution: Accept team-level defensive_score as an approximation, derived from team_scores in matches. Weight it by clean_sheets / games_played to add individual differentiation, addressing the concern about uniform scores (e.g., 3 goals / 9 players = 0.33, boosted by clean sheets).
Time Decay Weighting Mismatch:
Issue: calculate_match_fantasy_points lacks decay; aggregated tables use raw sums.
Resolution: Apply 180-day half-life decay post-aggregation within each block, using a weighting function (POWER(2, -(age_days / 180))) to adjust raw sums, aligning with the hybrid model. Store decayed values in historical_blocks for efficiency.
Trend Calculation Logic Gaps:
Clarifications:
Consistent vs. Inconsistent: Define >10% variation in percentage change as consistent (use percentage change), ≤10% as inconsistent (use 60/40 weighted average of decayed values).
60/40 Weighting: Weight the latest block at 60%, the prior at 40%.
70/30 Blending: Apply if the decayed trend exceeds the long-term raw average by >20%, using 70% decayed trend + 30% average.
🤔 Clarification Needed
Schema Design Decision:
Choice: Option C (JSON Storage) is confirmed, avoiding breaking changes and new tables, with a migration to add historical_blocks.
Defensive Metrics Strategy:
Choice: Accept team-level defensive_score with clean_sheets weighting for now, planning to enhance with individual stats later if data becomes available.
Current UI Compatibility:
Choice: No query updates needed for the half-season screen; trend data is handled via historical_blocks.
10.0 Validation Strategy
Compare trend predictions with actual performance over the next 6-month period using historical match data.
Measure team balance improvement (e.g., gap < 0.5) against the current Bayesian algorithm with a 9v9 test match.
Gather user feedback on profile displays and balancing fairness post-implementation.
11.0 Additional Technical Details
1. Goals Conceded Per Player
Methodology: Derive team_goals_conceded_rate by dividing total team_scores (from matches) by the number of players (e.g., 9), yielding a per-player rate (e.g., 3 / 9 = 0.33). Weight by clean_sheets / games_played to differentiate players on the same team.
Example: If Team A concedes 3 goals and a player has 2 clean sheets in 6 games, defensive_score = (1 / (1 + 0.33 / league_avg_gc)) * (1 + 2 / 6) ≈ 0.75 * 1.33 = 1.0 (capped at 0.95).
2. JSONB Structure
Structure:
json



{
  "historical_blocks": [
    {
      "start_date": "2024-01-01",
      "end_date": "2024-06-30",
      "fantasy_points": 98.5,
      "goals": 6.2,
      "goals_conceded": 9.8,
      "games_played": 6,
      "weights_sum": 4.2
    }
  ]
}
Decision: Store decayed values (precomputed with 180-day decay) to optimize real-time queries, avoiding on-demand calculation.
3. Performance & Query Complexity
Approach: Precompute league averages in the edge function and store in aggregated_player_power_ratings to avoid slow JSONB queries. Index player_id in aggregated_half_season_stats for JSONB access efficiency.
Assessment: With ~30 players and 24 blocks (~108KB), performance is acceptable; monitor and optimize if data grows beyond 10 years (~1MB).
4. Historical Data Migration
Strategy: The edge function will rebuild all historical blocks on each run, leveraging full recalculation on match edits (feasible with ~700 matches). No separate migration is needed.
5. Defensive Score Formula Safety
Safeguards: Use NULLIF(league_avg_gc, 0.1) to prevent division by zero, and cap at 0.95 for 0 goals_conceded_rate to avoid perfection, weighted by clean_sheets.
6. Trend Calculation Examples
Example: [2.1, 2.5, 2.8] goals/game → Variation = 15.5% > 10% (consistent), trend = +12%, raw average = 2.47, difference = 13.4% < 20% → Use 2.8 (capped at 1.5).
7. Data Volume Concerns
Assessment: ~1MB over 10 years is manageable; plan annual performance reviews to adjust indexing or denormalization if needed.
Rationale for Changes
Schema: JSONB resolves the UNIQUE constraint, supporting historical trends without breaking changes.
Hybrid Model: Decay with a long-term baseline ensures balance, addressing fluke concerns with a 20% threshold.
Implementation: Edge function recalculation populates data efficiently.