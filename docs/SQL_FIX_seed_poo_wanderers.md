# Fix: Seed Poo Wanderers Tenant

**Date:** December 1, 2025  
**Issue:** Poo Wanderers tenant is incomplete (only 1 config)  
**Solution:** Seed from defaults, then apply complexity_level migration

---

## Step 1: Seed app_config from Defaults

```sql
-- Insert all missing configs for Poo Wanderers from defaults
INSERT INTO app_config (
  config_key,
  config_value,
  config_description,
  config_group,
  display_name,
  display_group,
  sort_order,
  complexity_level,
  tenant_id,
  created_at,
  updated_at
)
SELECT 
  d.config_key,
  d.config_value,
  d.config_description,
  d.config_group,
  NULL as display_name, -- Will be set later
  NULL as display_group, -- Will be set later
  NULL as sort_order, -- Will be set later
  d.complexity_level,
  '2cd8f68f-6389-4b54-9065-18ec447434e3'::uuid as tenant_id,
  now() as created_at,
  now() as updated_at
FROM app_config_defaults d
WHERE NOT EXISTS (
  SELECT 1 FROM app_config c 
  WHERE c.config_key = d.config_key 
  AND c.tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3'
);
```

## Step 2: Copy display_name, display_group, sort_order from Berko TNF

```sql
-- Copy metadata from Berko TNF to Poo Wanderers
UPDATE app_config target
SET 
  display_name = source.display_name,
  display_group = source.display_group,
  sort_order = source.sort_order
FROM app_config source
WHERE target.config_key = source.config_key
  AND target.tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3'
  AND source.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND (
    target.display_name IS NULL 
    OR target.display_group IS NULL 
    OR target.sort_order IS NULL
  );
```

## Step 3: Seed team_balance_weights from Defaults

```sql
-- IMPORTANT: Fix sequence FIRST before inserting
SELECT setval('team_balance_weights_weight_id_seq', 
  (SELECT COALESCE(MAX(weight_id), 0) FROM team_balance_weights));

-- Now insert balance weights for Poo Wanderers (weight_id will auto-generate)
INSERT INTO team_balance_weights (
  position_group,
  attribute,
  weight,
  tenant_id,
  created_at,
  updated_at
)
SELECT 
  d.position_group,
  d.attribute,
  d.weight,
  '2cd8f68f-6389-4b54-9065-18ec447434e3'::uuid as tenant_id,
  now() as created_at,
  now() as updated_at
FROM team_balance_weights_defaults d
WHERE NOT EXISTS (
  SELECT 1 FROM team_balance_weights w
  WHERE w.position_group = d.position_group
    AND w.attribute = d.attribute
    AND w.tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3'
);
```

## Step 4: Seed team_size_templates from Defaults

```sql
-- IMPORTANT: Fix sequence FIRST before inserting
SELECT setval('team_size_templates_template_id_seq', 
  (SELECT COALESCE(MAX(template_id), 0) FROM team_size_templates));

-- Now insert team templates for Poo Wanderers
INSERT INTO team_size_templates (
  team_size,
  name,
  defenders,
  midfielders,
  attackers,
  tenant_id,
  created_at,
  updated_at
)
SELECT 
  d.team_size,
  d.name,
  d.defenders_per_team,
  d.midfielders_per_team,
  d.attackers_per_team,
  '2cd8f68f-6389-4b54-9065-18ec447434e3'::uuid as tenant_id,
  now() as created_at,
  now() as updated_at
FROM team_size_templates_defaults d
WHERE NOT EXISTS (
  SELECT 1 FROM team_size_templates t
  WHERE t.team_size = d.team_size
    AND t.tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3'
);
```

## Step 5: Verify Seeding

```sql
-- Should now show 34 configs for both tenants
SELECT 
  t.name,
  COUNT(c.config_id) as config_count
FROM tenants t
LEFT JOIN app_config c ON t.tenant_id = c.tenant_id
WHERE t.is_active = true
GROUP BY t.name;
-- Expected: Berko TNF = 34, Poo Wanderers = 34

-- Should show 15 weights for both tenants
SELECT 
  t.name,
  COUNT(w.weight_id) as weight_count
FROM tenants t
LEFT JOIN team_balance_weights w ON t.tenant_id = w.tenant_id
WHERE t.is_active = true
GROUP BY t.name;
-- Expected: Berko TNF = 15, Poo Wanderers = 15

-- Should show 7 templates for both tenants
SELECT 
  t.name,
  COUNT(ts.template_id) as template_count
FROM tenants t
LEFT JOIN team_size_templates ts ON t.tenant_id = ts.tenant_id
WHERE t.is_active = true
GROUP BY t.name;
-- Expected: Berko TNF = 7, Poo Wanderers = 7

-- Verify complexity_level distribution
SELECT 
  t.name as tenant_name,
  c.complexity_level,
  COUNT(*) as count
FROM app_config c
JOIN tenants t ON c.tenant_id = t.tenant_id
WHERE t.is_active = true
GROUP BY t.name, c.complexity_level
ORDER BY t.name, c.complexity_level;
-- Expected for BOTH tenants: standard=5, advanced=29
```

---

## Notes

**Why was Poo Wanderers incomplete?**
- Likely created as a test tenant manually
- Tenant creation process should seed defaults automatically
- This is a data consistency issue, not a migration issue

**After this fix:**
- Both tenants will have identical configs (except values)
- complexity_level will be properly set for all configs
- All verification queries should pass

