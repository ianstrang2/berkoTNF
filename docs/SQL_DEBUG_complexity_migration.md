# Debug: Complexity Level Migration Issues

**Date:** December 1, 2025  
**Issue:** Tenant configs showing count=1 instead of count=2 (for 2 active tenants)

---

## Investigation Queries

### 1. Check Active Tenants
```sql
SELECT tenant_id, name, is_active 
FROM tenants 
WHERE is_active = true;
```

### 2. Check Which Tenant Got Updated
```sql
-- See which tenant has complexity_level set
SELECT 
  t.name as tenant_name,
  c.config_key,
  c.complexity_level,
  c.display_group
FROM app_config c
JOIN tenants t ON c.tenant_id = t.tenant_id
WHERE c.config_key IN ('club_name', 'team_a_name', 'team_b_name', 'days_between_matches', 'default_team_size')
ORDER BY c.config_key, t.name;
```

### 3. Check for Missing Configs
```sql
-- See if one tenant is missing configs entirely
SELECT 
  t.tenant_id,
  t.name,
  COUNT(c.config_id) as config_count
FROM tenants t
LEFT JOIN app_config c ON t.tenant_id = c.tenant_id
WHERE t.is_active = true
GROUP BY t.tenant_id, t.name;
```

### 4. Check complexity_level Distribution
```sql
-- See complexity_level for BOTH tenants
SELECT 
  t.name as tenant_name,
  c.complexity_level,
  COUNT(*) as count
FROM app_config c
JOIN tenants t ON c.tenant_id = t.tenant_id
WHERE t.is_active = true
GROUP BY t.name, c.complexity_level
ORDER BY t.name, c.complexity_level;
```

### 5. Fantasy Points Count Issue
```sql
-- Why 12 instead of 11?
SELECT config_key, display_group, config_group
FROM app_config
WHERE config_group = 'fantasy_points' OR display_group = 'Fantasy Points'
GROUP BY config_key, display_group, config_group
ORDER BY config_key;
```

### 6. Performance Balancing Group
```sql
-- Where did 'Performance Balancing' display_group come from?
SELECT config_key, config_group, display_group
FROM app_config
WHERE display_group = 'Performance Balancing'
GROUP BY config_key, config_group, display_group;
```

### 7. Missing table_settings
```sql
-- Check if table_settings configs exist and have complexity_level
SELECT 
  config_key, 
  config_group, 
  complexity_level, 
  display_group,
  COUNT(*) as tenant_count
FROM app_config
WHERE config_group = 'table_settings'
GROUP BY config_key, config_group, complexity_level, display_group
ORDER BY config_key;
```

---

## Expected Issues

**Problem 1:** Only one tenant got updated
- **Fix:** Re-run Step 2 to ensure BOTH tenants get complexity_level

**Problem 2:** Display groups inconsistent
- Some configs may have old display_group values
- **Fix:** Ensure Step 3 runs for all tenants

**Problem 3:** Fantasy Points count
- Might be counting attendance_points separately
- Or tenant-specific overrides
- Need to verify actual config_keys

---

## Fix Script (Run After Investigation)

```sql
-- Fix: Ensure ALL tenants have complexity_level set
UPDATE app_config 
SET complexity_level = 'standard'
WHERE config_key IN (
  'club_name',
  'team_a_name',
  'team_b_name',
  'days_between_matches',
  'default_team_size'
)
AND complexity_level IS NULL;

-- Fix: Ensure ALL tenants have correct display_group
UPDATE app_config
SET display_group = 'Fantasy Points'
WHERE config_group = 'fantasy_points';

UPDATE app_config
SET display_group = 'Match Report Milestones'
WHERE config_group = 'match_report';

UPDATE app_config
SET display_group = 'Record Table Settings'
WHERE config_group = 'table_settings';

UPDATE app_config
SET display_group = 'Club & Team Names'
WHERE config_key IN ('club_name', 'team_a_name', 'team_b_name');

UPDATE app_config
SET display_group = 'Match Creation Defaults'
WHERE config_key IN ('days_between_matches', 'default_team_size');

-- Fix: Ensure performance settings have correct display_group
UPDATE app_config
SET display_group = 'Performance Settings'
WHERE config_group = 'performance';
```

---

## Re-Verification (After Fix)

```sql
-- Should show count=2 for all configs (2 active tenants)
SELECT 
  d.config_key,
  d.complexity_level as default_level,
  COUNT(c.config_id) as tenant_configs_updated
FROM app_config_defaults d
LEFT JOIN app_config c ON c.config_key = d.config_key AND c.complexity_level = d.complexity_level
GROUP BY d.config_key, d.complexity_level
HAVING COUNT(c.config_id) != (SELECT COUNT(*) FROM tenants WHERE is_active = true)
ORDER BY d.config_key;
-- Should return 0 rows

-- Both tenants should have same counts
SELECT 
  t.name as tenant_name,
  c.complexity_level,
  COUNT(*) as count
FROM app_config c
JOIN tenants t ON c.tenant_id = t.tenant_id
WHERE t.is_active = true
GROUP BY t.name, c.complexity_level
ORDER BY t.name, c.complexity_level;
-- Both tenants should show: standard=5, advanced=29
```

