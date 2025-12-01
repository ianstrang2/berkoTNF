# Admin Setup Redesign - Quick Start Guide

**Date:** December 1, 2025  
**Status:** Ready for Testing

---

## TL;DR

**What Changed:**
- Setup navigation split into **Standard** (5 settings) and **Advanced** (29+ settings)
- Compact mobile-first UI (~60% less vertical space)
- Auto-save with button flash pattern
- Info popovers instead of inline descriptions
- Collapsible cards

---

## Before You Start: Run SQL Migration

⚠️ **CRITICAL:** Execute SQL migration BEFORE testing

1. Open Supabase SQL Editor
2. Copy/paste SQL from `docs/SQL_MIGRATION_complexity_level_Dec2024.md`
3. Execute each step (1-4) in order
4. Verify with Step 4 queries

**Time:** ~2 minutes

---

## Quick Test

1. **Navigate:** Go to `/admin/setup`
2. **Standard Tab:** Should see "General" and "Matches" sub-tabs
3. **Edit:** Change any value - floating save button appears
4. **Save:** Click Save - green flash "Saved ✓"
5. **Advanced Tab:** See "Points", "Stats", "Balancing", "Templates"
6. **Balancing:** See pill selector for Rating/Performance

---

## URLs

### Standard
```
/admin/setup?level=standard&section=general   (default)
/admin/setup?level=standard&section=matches
```

### Advanced
```
/admin/setup?level=advanced&section=points
/admin/setup?level=advanced&section=stats
/admin/setup?level=advanced&section=balancing&view=rating
/admin/setup?level=advanced&section=templates
```

---

## What Got Built

### 8 New Files
1. `InfoPopover.component.tsx` - Soft UI info icons
2. `CompactAppConfig.component.tsx` - New compact config editor
3. `StandardSettings.component.tsx` - Wrapper for standard settings
4. `AdvancedSettings.component.tsx` - Wrapper for advanced settings
5. `SQL_MIGRATION_complexity_level_Dec2024.md` - Database migration
6. `IMPLEMENTATION_SUMMARY_Admin_Setup_Redesign.md` - Full details
7. `QUICK_START_Admin_Setup.md` - This file

### 6 Modified Files
1. `prisma/schema.prisma` - Added complexity_level
2. `app/api/admin/app-config/route.ts` - Supports ?complexity=standard
3. `NavigationTabs.component.tsx` - Standard/Advanced tabs
4. `NavigationSubTabs.component.tsx` - Tertiary nav
5. `AppSetup.component.tsx` - Router
6. `admin/setup/page.tsx` - Query params

---

## If Something Breaks

1. **SQL not run?** Check console for "complexity_level" column errors
2. **Navigation broken?** Clear browser cache, hard refresh
3. **Save not working?** Check Network tab for API errors
4. **Rollback?** See `IMPLEMENTATION_SUMMARY` for rollback SQL

---

## More Info

- **Full Details:** `docs/IMPLEMENTATION_SUMMARY_Admin_Setup_Redesign.md`
- **SQL Migration:** `docs/SQL_MIGRATION_complexity_level_Dec2024.md`

