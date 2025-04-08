# Berkhamsted Thursday Night Football Database Architecture

This document outlines the structure and relationships of database triggers, functions, and tables for the Berkhamsted Thursday Night Football application.

## Database Tables

### Core Tables
- **matches**: Stores the core match information (date, scores)
- **players**: Stores player information (name, retired status, ringer status)
- **player_matches**: Junction table connecting players to matches with additional data (team, goals, result)

### Aggregated/Cache Tables
- **aggregated_match_report**: Caches the latest match report data
- **aggregated_all_time_stats**: Contains all-time player statistics
- **aggregated_half_season_stats**: Contains half-season player statistics
- **aggregated_season_stats**: Contains full-season player statistics
- **cache_metadata**: Tracks when different caches were last updated

## Trigger Architecture

The database uses a system of triggers to automatically update aggregated data whenever core data changes:

### Triggers on `player_matches` Table

| Trigger Name | Function | Triggered When | Purpose |
|--------------|----------|---------------|---------|
| `player_match_report_cache_trigger` | `update_match_report_cache()` | After INSERT/UPDATE/DELETE | Updates the match report cache |
| `update_honour_roll_player_trigger` | `update_season_honours()` | After INSERT/UPDATE/DELETE | Updates season honors/awards |
| `update_recent_performance_player_trigger` | `trigger_update_recent_performance()` | After INSERT/UPDATE/DELETE | Updates recent performance stats |
| `update_all_time_stats_player_trigger` | `trigger_update_all_time_stats()` | After INSERT/UPDATE/DELETE | Updates all-time player statistics |

### Triggers on `matches` Table

| Trigger Name | Function | Triggered When | Purpose |
|--------------|----------|---------------|---------|
| `match_update_trigger` | `handle_match_update()` | After INSERT/UPDATE/DELETE | Updates half-season and season stats |
| `update_honour_roll_trigger` | `update_season_honours()` | After INSERT/UPDATE/DELETE | Updates season honors (same as player trigger) |
| `update_recent_performance_trigger` | `trigger_update_recent_performance()` | After INSERT/UPDATE/DELETE | Updates recent performance (same as player trigger) |

## Function Chain and Dependencies

Each trigger calls a primary function, which may call additional functions:

1. **Match Report Chain**:
   ```
   player_match_report_cache_trigger
   └── update_match_report_cache()
       ├── fix_all_streaks()
       ├── fix_all_milestones()
       └── calculate_leaders_for_match()
   ```

2. **Season Honours Chain**:
   ```
   update_honour_roll_player_trigger / update_honour_roll_trigger
   └── update_season_honours()
       └── populate_honour_roll_data()
   ```

3. **Recent Performance Chain**:
   ```
   update_recent_performance_player_trigger / update_recent_performance_trigger
   └── trigger_update_recent_performance()
       └── populate_recent_performance()
   ```

4. **All-Time Stats Chain**:
   ```
   update_all_time_stats_player_trigger
   └── trigger_update_all_time_stats()
       └── populate_all_time_stats()
   ```

5. **Match Update Chain**:
   ```
   match_update_trigger
   └── handle_match_update()
       └── Updates half-season and season stats directly
   ```

## Key Functions

### `update_match_report_cache()`
- Triggered after player_matches changes
- Rebuilds the aggregated_match_report table for the latest match
- Calculates team scores, player lists, and scorers
- Calls other functions to calculate streaks, milestones, and leaders

### `fix_all_milestones()`
- Identifies players who reached game/goal milestones (multiples of threshold)
- Only includes players who played in the latest match
- Excludes ringers

### `populate_all_time_stats()`
- Rebuilds the aggregated_all_time_stats table
- Includes games played, wins, draws, losses, goals, etc.
- Calculates win percentages and other statistics

### `handle_match_update()`
- Updates half-season and season stats
- Recalculates fantasy points based on match outcomes
- Processes seasons beginning from the earliest recorded match

## Data Flow

1. When a match is added/edited/deleted:
   - Both match and player_matches triggers fire
   - All cache tables are updated

2. When only player_matches are updated:
   - Only player_matches triggers fire
   - All relevant cache tables are updated

## Best Practices

1. **Separation of Concerns**:
   - Each trigger has a specific responsibility
   - Functions are designed to handle one type of aggregation

2. **Wrapper Functions**:
   - Simple trigger functions that call main processing functions
   - Allows main functions to be called directly if needed

3. **Consistency**:
   - Same trigger pattern used across all tables
   - All wrapper functions follow the same structure

4. **Redundancy**:
   - Key updates are triggered from both matches and player_matches tables
   - Ensures data consistency even if only one table is updated 