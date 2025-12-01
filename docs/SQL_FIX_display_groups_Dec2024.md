# Fix: Update Display Groups & Reorganize Sections

**Date:** December 1, 2025  
**Purpose:** Fix section names and reorganize configs

---

## Step 1: Split match_settings into separate groups

```sql
-- Move club/team names to their own config_group
UPDATE app_config
SET config_group = 'club_team_names'
WHERE config_key IN ('club_name', 'team_a_name', 'team_b_name');

UPDATE app_config_defaults
SET config_group = 'club_team_names'
WHERE config_key IN ('club_name', 'team_a_name', 'team_b_name');
```

## Step 2: Rename "Match Report Milestones" to "Streaks & Milestones"

```sql
UPDATE app_config
SET display_group = 'Streaks & Milestones'
WHERE display_group = 'Match Report Milestones';
```

## Step 3: Create new "Badges" section for On Fire/Grim Reaper

```sql
-- Move 4 badge-related configs to new display_group
UPDATE app_config
SET display_group = 'Badges'
WHERE config_key IN (
  'show_on_fire',
  'show_grim_reaper',
  'on_fire_grim_reaper_window_days',
  'on_fire_grim_reaper_min_games'
);
```

## Step 4: Rename "Record Table Settings" to "Records Tables"

```sql
UPDATE app_config
SET display_group = 'Records Tables'
WHERE display_group = 'Record Table Settings';
```

## Step 5: Verify Changes

```sql
-- Check all display_groups
SELECT DISTINCT display_group, COUNT(*) as count
FROM app_config
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
GROUP BY display_group
ORDER BY display_group;

-- Expected:
-- Badges: 4
-- Club & Team Names: 3
-- Fantasy Points: 11
-- Match Creation Defaults: 2
-- Performance Balancing: 4
-- Records Tables: 3
-- Streaks & Milestones: 7 (was 11, now 4 moved to Badges)
```

## Step 6: Run for Both Tenants

```sql
-- Apply same changes to Poo Wanderers
UPDATE app_config
SET config_group = 'club_team_names'
WHERE config_key IN ('club_name', 'team_a_name', 'team_b_name')
  AND tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3';

UPDATE app_config
SET display_group = 'Streaks & Milestones'
WHERE display_group = 'Match Report Milestones'
  AND tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3';

UPDATE app_config
SET display_group = 'Badges'
WHERE config_key IN (
  'show_on_fire',
  'show_grim_reaper',
  'on_fire_grim_reaper_window_days',
  'on_fire_grim_reaper_min_games'
)
AND tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3';

UPDATE app_config
SET display_group = 'Records Tables'
WHERE display_group = 'Record Table Settings'
  AND tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3';
```

