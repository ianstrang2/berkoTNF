# Investigation Results: Complexity Level Migration

**Date:** December 1, 2025  
**Status:** Issues Identified - Fix Available

---

## Summary

**Problem:** Migration appeared incomplete (configs showing count=1 instead of count=2)  
**Root Cause:** Poo Wanderers tenant was never properly seeded with default configs

---

## Findings

### Tenant Status

| Tenant | Configs | Balance Weights | Templates | Status |
|--------|---------|----------------|-----------|--------|
| Berko TNF | 34 ✅ | 15 ✅ | 7 ✅ | Complete |
| Poo Wanderers | 1 ❌ | 0 ❌ | 0 ❌ | **Incomplete** |

### Poo Wanderers Issues

**Only has 1 config:**
```
fantasy_attendance_points (complexity_level='advanced', display_group='Fantasy Points')
```

**Missing:**
- 33 other app_config entries
- All 15 team_balance_weights
- All 7 team_size_templates

### Berko TNF Status

**✅ Fully migrated:**
- 5 standard configs (club_name, team_a_name, team_b_name, days_between_matches, default_team_size)
- 29 advanced configs (fantasy_points, match_report, table_settings, performance)
- All have correct complexity_level
- All have correct display_group

**Display Groups in Berko TNF:**
```
Club & Team Names: 3
Fantasy Points: 11
Match Creation Defaults: 2
Match Report Milestones: 11
Performance Balancing: 4 (legacy name, OK)
Record Table Settings: 3
```

---

## Why Verification Failed

**Query 3 Result Explanation:**

Your verification query showed all configs with count=1 because:
- 33 configs exist only in Berko TNF (count=1)
- 1 config exists in both tenants (fantasy_attendance_points, count=2)
- 0 configs exist only in Poo Wanderers

The query correctly identified that **33 configs don't match the expected count of 2** (for 2 active tenants).

---

## Impact Assessment

### On Current App Functionality

**Berko TNF:** ✅ NO IMPACT
- Fully functional
- All settings work
- New UI will work perfectly

**Poo Wanderers:** ❌ BROKEN
- Missing almost all configs
- Setup pages will be mostly empty
- Balancing won't work (no weights)
- Templates won't work

### On New Setup UI

**Standard Settings (level=standard&section=general):**
- Berko TNF: Will show 3 settings (Club & Team Names)
- Poo Wanderers: Will show 0 settings (broken)

**Standard Settings (level=standard&section=matches):**
- Berko TNF: Will show 2 settings
- Poo Wanderers: Will show 0 settings (broken)

**Advanced Settings:**
- Berko TNF: Will show all 29 settings
- Poo Wanderers: Will show 1 setting (fantasy_attendance_points only)

---

## Fix Strategy

### Option 1: Seed Poo Wanderers (Recommended)

**Execute:** `docs/SQL_FIX_seed_poo_wanderers.md`

**Pros:**
- Both tenants fully functional
- Consistent data across tenants
- Proper baseline for future

**Cons:**
- Requires 4-step SQL execution
- ~2 minutes of work

**Time:** 5 minutes

### Option 2: Delete Poo Wanderers

If Poo Wanderers is just a test tenant:

```sql
-- WARNING: This deletes ALL data for Poo Wanderers
DELETE FROM app_config WHERE tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3';
DELETE FROM team_balance_weights WHERE tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3';
DELETE FROM team_size_templates WHERE tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3';
-- Then optionally:
UPDATE tenants SET is_active = false WHERE tenant_id = '2cd8f68f-6389-4b54-9065-18ec447434e3';
```

**Pros:**
- Quick
- Cleans up incomplete data

**Cons:**
- Loses Poo Wanderers tenant permanently
- Would need to recreate if actually needed

**Time:** 1 minute

### Option 3: Leave As-Is (Not Recommended)

**Pros:**
- No work required

**Cons:**
- Poo Wanderers completely broken
- Confusing for anyone testing
- Verification queries always fail

---

## Recommended Action Plan

1. **Determine if Poo Wanderers is needed:**
   - If YES → Execute Option 1 (seed from defaults)
   - If NO → Execute Option 2 (delete/deactivate)

2. **After fix, re-run verification:**
   ```sql
   -- Should show count=2 for all configs
   SELECT 
     d.config_key,
     d.complexity_level,
     COUNT(c.config_id) as tenant_configs
   FROM app_config_defaults d
   LEFT JOIN app_config c ON c.config_key = d.config_key 
     AND c.complexity_level = d.complexity_level
   GROUP BY d.config_key, d.complexity_level
   HAVING COUNT(c.config_id) != (SELECT COUNT(*) FROM tenants WHERE is_active = true)
   ORDER BY d.config_key;
   ```
   Should return **0 rows** ✅

3. **Test new Setup UI:**
   - Log in as Berko TNF admin
   - Navigate to `/admin/setup`
   - Verify Standard/Advanced tabs work
   - Test saving changes

---

## Questions for User

1. **Is Poo Wanderers a real tenant or test data?**
   - Real → We seed it properly
   - Test → We can delete it

2. **When was Poo Wanderers created?**
   - Helps understand why seeding failed

3. **Does Poo Wanderers have any other data?**
   - Players, matches, etc.
   - If yes, we should definitely seed configs

---

## Technical Notes

### Why Poo Wanderers Was Incomplete

Possible reasons:
1. **Manual tenant creation:** Created via SQL without running seed script
2. **Interrupted seeding:** Seeding started but failed partway
3. **Migration timing:** Created after initial tenant seeding migration
4. **Bug in tenant creation:** Tenant creation endpoint doesn't seed properly

### Preventing Future Issues

**Recommendation:** Add to tenant creation process:
1. Seed all app_config from defaults
2. Seed all team_balance_weights from defaults
3. Seed all team_size_templates from defaults
4. Verify counts match before marking tenant as active

---

## Related Files

- **Fix Script:** `docs/SQL_FIX_seed_poo_wanderers.md`
- **Migration Guide:** `docs/SQL_MIGRATION_complexity_level_Dec2024.md`
- **Debug Queries:** `docs/SQL_DEBUG_complexity_migration.md`

