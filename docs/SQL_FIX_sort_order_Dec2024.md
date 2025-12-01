# Fix: Sort Order for Stats Section

**Date:** December 1, 2025  
**Purpose:** Put Records Tables at bottom of Stats section

---

## Update Sort Order

```sql
-- Streaks & Milestones should be first (sort_order 1-10)
-- Badges should be second (sort_order 11-20)
-- Records Tables should be last (sort_order 21-30)

-- Update Streaks & Milestones configs
UPDATE app_config
SET sort_order = CASE config_key
  WHEN 'game_milestone_threshold' THEN 1
  WHEN 'goal_milestone_threshold' THEN 2
  WHEN 'goal_streak_threshold' THEN 3
  WHEN 'win_streak_threshold' THEN 4
  WHEN 'loss_streak_threshold' THEN 5
  WHEN 'unbeaten_streak_threshold' THEN 6
  WHEN 'winless_streak_threshold' THEN 7
END
WHERE config_key IN (
  'game_milestone_threshold',
  'goal_milestone_threshold',
  'goal_streak_threshold',
  'win_streak_threshold',
  'loss_streak_threshold',
  'unbeaten_streak_threshold',
  'winless_streak_threshold'
);

-- Update Badges configs
UPDATE app_config
SET sort_order = CASE config_key
  WHEN 'show_on_fire' THEN 11
  WHEN 'show_grim_reaper' THEN 12
  WHEN 'on_fire_grim_reaper_window_days' THEN 13
  WHEN 'on_fire_grim_reaper_min_games' THEN 14
END
WHERE config_key IN (
  'show_on_fire',
  'show_grim_reaper',
  'on_fire_grim_reaper_window_days',
  'on_fire_grim_reaper_min_games'
);

-- Update Records Tables configs (put at bottom)
UPDATE app_config
SET sort_order = CASE config_key
  WHEN 'match_duration_minutes' THEN 21
  WHEN 'games_required_for_hof' THEN 22
  WHEN 'hall_of_fame_limit' THEN 23
END
WHERE config_key IN (
  'match_duration_minutes',
  'games_required_for_hof',
  'hall_of_fame_limit'
);
```

