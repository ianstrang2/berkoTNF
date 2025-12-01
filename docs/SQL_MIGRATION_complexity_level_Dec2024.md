# SQL Migration: Add complexity_level Column

**Date:** December 1, 2025  
**Purpose:** Add complexity level to app_config tables for Standard/Advanced filtering

---

## Step 1: Add Column to app_config_defaults

```sql
-- Add complexity_level column to defaults table
ALTER TABLE app_config_defaults 
ADD COLUMN complexity_level VARCHAR(20) DEFAULT 'advanced' 
CHECK (complexity_level IN ('standard', 'advanced'));

-- Update existing records to appropriate complexity levels
-- STANDARD settings (only 4 settings)
UPDATE app_config_defaults 
SET complexity_level = 'standard'
WHERE config_key IN (
  'club_name',
  'team_a_name',
  'team_b_name',
  'days_between_matches',
  'default_team_size'
);

-- All others remain 'advanced' (default)
```

## Step 2: Add Column to app_config (tenant-specific)

```sql
-- Add complexity_level column to tenant config table
ALTER TABLE app_config 
ADD COLUMN complexity_level VARCHAR(20) DEFAULT 'advanced'
CHECK (complexity_level IN ('standard', 'advanced'));

-- Update existing tenant records to match defaults
UPDATE app_config 
SET complexity_level = 'standard'
WHERE config_key IN (
  'club_name',
  'team_a_name',
  'team_b_name',
  'days_between_matches',
  'default_team_size'
);
```

## Step 3: Add display_group for Advanced sections

```sql
-- NOTE: app_config_defaults does NOT have display_group column
-- Only update app_config (tenant-specific table)

-- Update display_group to organize Advanced settings better
UPDATE app_config
SET display_group = 'Fantasy Points'
WHERE config_group = 'fantasy_points';

-- Match Report Milestones
UPDATE app_config
SET display_group = 'Match Report Milestones'
WHERE config_group = 'match_report';

-- Record Table Settings
UPDATE app_config
SET display_group = 'Record Table Settings'
WHERE config_group = 'table_settings';

-- Standard - Club & Team Names
UPDATE app_config
SET display_group = 'Club & Team Names'
WHERE config_key IN ('club_name', 'team_a_name', 'team_b_name');

-- Standard - Match Creation Defaults
UPDATE app_config
SET display_group = 'Match Creation Defaults'
WHERE config_key IN ('days_between_matches', 'default_team_size');
```

## Step 4: Verify Migration

```sql
-- Check standard settings in defaults (should be 5 rows)
SELECT config_key, complexity_level, config_group
FROM app_config_defaults
WHERE complexity_level = 'standard'
ORDER BY config_key;

-- Check advanced settings (should be 29 rows)
SELECT config_group, COUNT(*) as count
FROM app_config_defaults
WHERE complexity_level = 'advanced'
GROUP BY config_group;

-- Verify tenant data matches defaults
SELECT 
  d.config_key,
  d.complexity_level as default_level,
  COUNT(c.config_id) as tenant_configs_updated
FROM app_config_defaults d
LEFT JOIN app_config c ON c.config_key = d.config_key AND c.complexity_level = d.complexity_level
GROUP BY d.config_key, d.complexity_level
HAVING COUNT(c.config_id) != (SELECT COUNT(*) FROM tenants WHERE is_active = true);
-- Should return 0 rows (meaning all tenants updated correctly)

-- Verify display_group is set in app_config (tenant table)
SELECT DISTINCT display_group, COUNT(*) as count
FROM app_config
WHERE display_group IS NOT NULL
GROUP BY display_group
ORDER BY display_group;
-- Should show: Club & Team Names, Fantasy Points, Match Creation Defaults, Match Report Milestones, Record Table Settings
```

## Rollback (if needed)

```sql
-- Remove columns
ALTER TABLE app_config_defaults DROP COLUMN IF EXISTS complexity_level;
ALTER TABLE app_config DROP COLUMN IF EXISTS complexity_level;
```

---

## Expected Results

**Standard Settings (5):**
- Club & Team Names (3): club_name, team_a_name, team_b_name
- Match Creation Defaults (2): days_between_matches, default_team_size

**Advanced Settings (29):**
- Fantasy Points (11): All fantasy_* settings
- Match Report Milestones (11): All match_report settings
- Record Table Settings (3): table_settings
- Performance (4): All performance_* settings

