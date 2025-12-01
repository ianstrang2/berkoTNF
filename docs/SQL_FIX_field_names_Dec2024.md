# Fix: Shorten Field Names & Reorder

**Date:** December 1, 2025  
**Purpose:** Optimize field names for mobile & fix sort order

---

## Step 1: Shorten Field Names

```sql
-- Rename Fantasy Points fields (remove 'Fantasy' and 'Points')
UPDATE app_config
SET display_name = CASE config_key
  WHEN 'fantasy_win_points' THEN 'Win'
  WHEN 'fantasy_draw_points' THEN 'Draw'
  WHEN 'fantasy_loss_points' THEN 'Loss'
  WHEN 'fantasy_clean_sheet_win_points' THEN 'Clean Sheet Win'
  WHEN 'fantasy_clean_sheet_draw_points' THEN 'Clean Sheet Draw'
  WHEN 'fantasy_heavy_win_points' THEN 'Heavy Win'
  WHEN 'fantasy_heavy_loss_points' THEN 'Heavy Loss'
  WHEN 'fantasy_heavy_clean_sheet_win_points' THEN 'Heavy Clean Sheet Win'
  WHEN 'fantasy_goals_scored_points' THEN 'Goal Scored'
  WHEN 'fantasy_attendance_points' THEN 'Attendance'
  WHEN 'fantasy_heavy_win_threshold' THEN 'Heavy Win Threshold'
  ELSE display_name
END
WHERE config_group = 'fantasy_points';

-- Do the same for defaults
UPDATE app_config_defaults
SET display_name = CASE config_key
  WHEN 'fantasy_win_points' THEN 'Win'
  WHEN 'fantasy_draw_points' THEN 'Draw'
  WHEN 'fantasy_loss_points' THEN 'Loss'
  WHEN 'fantasy_clean_sheet_win_points' THEN 'Clean Sheet Win'
  WHEN 'fantasy_clean_sheet_draw_points' THEN 'Clean Sheet Draw'
  WHEN 'fantasy_heavy_win_points' THEN 'Heavy Win'
  WHEN 'fantasy_heavy_loss_points' THEN 'Heavy Loss'
  WHEN 'fantasy_heavy_clean_sheet_win_points' THEN 'Heavy Clean Sheet Win'
  WHEN 'fantasy_goals_scored_points' THEN 'Goal Scored'
  WHEN 'fantasy_attendance_points' THEN 'Attendance'
  WHEN 'fantasy_heavy_win_threshold' THEN 'Heavy Win Threshold'
  ELSE NULL -- defaults didn't have display_name initially, but good to set if schema allows
END
WHERE config_group = 'fantasy_points';
```

## Step 2: Fix Sort Order (Heavy Win Threshold last)

```sql
-- Move Heavy Win Threshold to end (order 12)
-- Reorder others logically:
-- 1. Win
-- 2. Draw
-- 3. Loss
-- 4. Heavy Win
-- 5. Heavy Loss
-- 6. Clean Sheet Win
-- 7. Clean Sheet Draw
-- 8. Heavy Clean Sheet Win
-- 9. Goal Scored
-- 10. Attendance
-- 11. Heavy Win Threshold

UPDATE app_config
SET sort_order = CASE config_key
  WHEN 'fantasy_win_points' THEN 1
  WHEN 'fantasy_draw_points' THEN 2
  WHEN 'fantasy_loss_points' THEN 3
  WHEN 'fantasy_heavy_win_points' THEN 4
  WHEN 'fantasy_heavy_loss_points' THEN 5
  WHEN 'fantasy_clean_sheet_win_points' THEN 6
  WHEN 'fantasy_clean_sheet_draw_points' THEN 7
  WHEN 'fantasy_heavy_clean_sheet_win_points' THEN 8
  WHEN 'fantasy_goals_scored_points' THEN 9
  WHEN 'fantasy_attendance_points' THEN 10
  WHEN 'fantasy_heavy_win_threshold' THEN 11
END
WHERE config_group = 'fantasy_points';
```

## Step 3: Shorten Other Sections (Optional)

```sql
-- Streaks & Milestones
UPDATE app_config
SET display_name = CASE config_key
  WHEN 'game_milestone_threshold' THEN 'Game Count'
  WHEN 'goal_milestone_threshold' THEN 'Goal Count'
  WHEN 'goal_streak_threshold' THEN 'Goal Streak'
  WHEN 'win_streak_threshold' THEN 'Win Streak'
  WHEN 'loss_streak_threshold' THEN 'Loss Streak'
  WHEN 'unbeaten_streak_threshold' THEN 'Unbeaten Streak'
  WHEN 'winless_streak_threshold' THEN 'Winless Streak'
  ELSE display_name
END
WHERE display_group = 'Streaks & Milestones';

-- Records Tables
UPDATE app_config
SET display_name = CASE config_key
  WHEN 'match_duration_minutes' THEN 'Match Duration'
  WHEN 'games_required_for_hof' THEN 'HOF Games Required'
  WHEN 'hall_of_fame_limit' THEN 'HOF Max Holders'
  ELSE display_name
END
WHERE display_group = 'Records Tables';
```

