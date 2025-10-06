# Ringer → Guest Rename Analysis

## Executive Summary

Renaming "ringer" to "Guest" throughout your application is **feasible but significant**. Based on a comprehensive codebase analysis, here's what you're looking at:

### Scope Summary
- **Database field name**: `is_ringer` (recommend keeping as-is)
- **UI references**: ~15 files need updates
- **Documentation**: 2 major spec documents
- **SQL functions**: 7 files with comments/filters
- **API endpoints**: 2 endpoints reference "ringer"

### Recommendation
**Do a UI-only rename** - update all user-facing text from "ringer" to "Guest" but keep the database field name `is_ringer` unchanged. This is a common pattern (e.g., `isAdmin` in DB, shown as "Administrator" in UI).

---

## Detailed Breakdown

### 1. Database Schema (RECOMMEND: Keep unchanged)

**Current field**: `is_ringer` (boolean)

**Found in**:
- `prisma/schema.prisma` - players table
- `prisma/schema.prisma` - match_player_pool table

**Why keep it**:
- Changing column names requires database migration
- Risk of breaking existing SQL queries
- Historical data references
- Would need to update Prisma schema and regenerate types
- Zero user-facing benefit (users never see column names)

**SQL files that filter by `is_ringer`** (7 files):
- `sql/update_aggregated_player_teammate_stats.sql`
- `sql/update_aggregated_match_report_cache.sql`
- `sql/update_half_and_full_season_stats.sql`
- `sql/update_aggregated_player_profile_stats.sql`
- `sql/update_aggregated_all_time_stats.sql`
- `sql/update_aggregated_recent_performance.sql`
- `sql/update_power_ratings.sql`

**Note**: These are aggregation functions that filter out ringers from stats. The queries work fine - only comments might mention "ringer" but that's acceptable for internal code.

---

### 2. UI Components (ACTION REQUIRED: 7 files)

#### Primary Files to Update:

1. **`src/components/admin/player/PlayerFormModal.component.tsx`**
   - Line 9: Description: `'Occasional players not shown in any stats'` → `'Guest players not shown in stats'`
   - Line 290: Label: `"Ringer"` → `"Guest"`
   - Line 310: Tooltip attribute: `"Ringer"` → `"Guest"`
   - Property names: Keep `isRinger` as-is (internal consistency)

2. **`src/components/admin/player/PlayerManager.component.tsx`**
   - Line 382: Table header tooltip: `"Ringer status"` → `"Guest status"`
   - Line 472: Tooltip text: `'Ringer - guest player'` → `'Guest player'`
   - Code comments can stay as-is (internal documentation)

3. **`src/app/superadmin/tenant-metrics/page.tsx`**
   - Line 27: Interface property can stay as `ringers: number;`
   - Line 282: Display text: `"Ringers"` → `"Guests"`
   - Line 345: Table header: `"Ringer"` → `"Guest"`
   - Line 411: Display text: `'(Ringer)'` → `'(Guest)'`

4. **`src/app/superadmin/tenant-metrics/route.ts`**
   - Line 136: Object key can stay as `ringers: ringers`
   - Comments can stay as-is (internal)

5. **`src/app/admin/info/page.tsx`**
   - Line 783: Column label: `'Ringer'` → `'Guest'`
   - Line 985: Section heading: `"Ringers To Add To Stats?"` → `"Guests To Add To Stats?"`

6. **`src/hooks/usePlayerData.hook.ts`**
   - Line 47: API endpoint constant: `ADD_RINGER` can stay as-is
   - URL path: `/api/admin/add-ringer` can stay as-is (internal endpoint)

7. **`src/constants/team-algorithm.constants.ts`**
   - Line 38: Constant name: `DEFAULT_RINGER_FORM` can stay as-is
   - Line 56: Endpoint constant: `ADD_RINGER` can stay as-is

---

### 3. Documentation (ACTION REQUIRED: 2 files)

#### Major Documentation Updates:

1. **`docs/SPEC_in_out_functionality_plan.md`** (148 references to "ringer")
   - This is your comprehensive RSVP spec
   - All user-facing explanations of "ringer" → "Guest"
   - Section titles like "Ringers explained" → "Guests explained"
   - Keep technical references in context (e.g., `is_ringer=true`)

2. **`docs/SPEC_RSVP.md`** (40 references to "ringer")
   - Similar to above - update all conceptual explanations
   - Technical field names can stay as-is

**Key Documentation Points to Update**:
- "What's a ringer?" → "What's a guest?"
- "Ringers = guests/one-off players" → "Guest players"
- "🎯 Ringer badge" → "🎯 Guest badge" (or change emoji)
- "include_ringers_in_invites" → Keep as-is (config key)
- "enable_ringer_self_book" → Keep as-is (config key)

---

### 4. API Endpoints (RECOMMEND: Keep unchanged)

Current endpoints:
- `/api/admin/add-ringer` - functional endpoint name

**Why keep it**:
- Breaking change for any external integrations
- Would need to maintain both old/new endpoints for backward compatibility
- Zero user-facing impact (users don't see API URLs)
- If you do change: Add redirect from old → new for 6 months

---

### 5. Configuration Keys (RECOMMEND: Keep unchanged)

Database config keys:
- `enable_ringer_self_book`
- `include_ringers_in_invites`

**Why keep them**:
- Users never see these config keys
- Changing them requires database migration
- Risk of breaking existing configurations
- Would need data migration script

---

### 6. Type Definitions (RECOMMEND: Keep unchanged)

TypeScript interfaces use `isRinger` property throughout:
- `src/types/player.types.ts`
- Various component prop interfaces

**Why keep them**:
- Internal consistency (matches database field)
- Would require updating 50+ files
- No user-facing benefit
- Common pattern (e.g., `isAdmin` → shown as "Administrator")

---

## Recommended Implementation Plan

### Phase 1: User-Facing Text Only (Low Risk, High Impact)

Update only the text that users actually see:

1. **UI Labels & Tooltips** (1-2 hours)
   - PlayerFormModal: "Ringer" → "Guest"
   - PlayerManager: Table headers and tooltips
   - Admin Info page: Column label
   - SuperAdmin metrics: Display text

2. **Documentation** (2-3 hours)
   - Update SPEC files for clarity
   - Keep technical field references as-is

3. **Testing** (1 hour)
   - Verify all forms still work
   - Check player creation/editing
   - Ensure stats aggregation still works

**Total Effort**: ~4-6 hours
**Risk Level**: Low
**User Impact**: High (clearer terminology)

---

### Phase 2: Deep Rename (Optional - Not Recommended)

If you decide to rename everything including database fields:

1. **Database Migration**
   - Rename `players.is_ringer` → `is_guest`
   - Rename `match_player_pool.is_ringer` → `is_guest`
   - Update all 7 SQL aggregation functions
   - Test all stats calculations

2. **Prisma Schema Update**
   - Update schema.prisma
   - Regenerate Prisma client
   - Update all TypeScript types

3. **Codebase Updates**
   - Refactor 50+ files with `isRinger` references
   - Update API endpoints (with backward compatibility)
   - Update config keys (with migration)
   - Update all documentation

4. **Testing**
   - Full regression testing
   - Stats verification
   - Match management testing
   - RSVP flow testing

**Total Effort**: ~3-4 days
**Risk Level**: High
**User Impact**: Same as Phase 1 (users don't see internal names)

---

## Files That Need Changes (Phase 1 Only)

### Must Change (User-Facing):
1. `src/components/admin/player/PlayerFormModal.component.tsx` - Form label and tooltip
2. `src/components/admin/player/PlayerManager.component.tsx` - Table header tooltip
3. `src/app/superadmin/tenant-metrics/page.tsx` - Display text and table headers
4. `src/app/admin/info/page.tsx` - Column label + section heading ("Ringers To Add To Stats?")
5. `docs/SPEC_in_out_functionality_plan.md` - All user-facing explanations
6. `docs/SPEC_RSVP.md` - All user-facing explanations

### Optional (Internal Documentation):
7. `src/app/api/admin/info-data/route.ts` - Comment on line 75: "Filters for players marked as ringers..." → "...as guests..."
8. SQL function comments (purely cosmetic)
9. Other code comments mentioning "ringer"

---

## Decision Matrix

| Aspect | Keep as "ringer" | UI rename to "Guest" | Full rename to "guest" |
|--------|-----------------|---------------------|----------------------|
| User clarity | ❌ Confusing term | ✅ Clear | ✅ Clear |
| Dev effort | ✅ Zero | ⚡ 4-6 hours | 🔥 3-4 days |
| Risk level | ✅ None | ✅ Low | ⚠️ High |
| Code consistency | ✅ Perfect | ⚠️ UI vs code mismatch | ✅ Perfect |
| Database stability | ✅ Safe | ✅ Safe | ❌ Migration required |
| **Recommendation** | - | **✅ BEST OPTION** | - |

---

## Additional Considerations (Thanks to peer review!)

### API Response Objects

**Question**: Does the API return `isRinger` in JSON responses that external systems consume?

**Answer**: ✅ **You're safe!**

- Your APIs return `isRinger` (camelCase) in JSON responses
- The transform layer converts `is_ringer` (DB) → `isRinger` (API response)
- See `src/lib/transform/player.transform.ts` line 41: `isRinger: dbPlayer.is_ringer ?? false`
- **Only consumed by your own frontend** - no external systems or third-party integrations
- Your mobile app (if any) also uses the same frontend codebase via Capacitor

**Impact**: Zero. The property name `isRinger` in JSON responses stays the same. Only UI labels change.

**Example Response (no change needed)**:
```json
{
  "id": "123",
  "name": "John Smith",
  "isRinger": true,  // ← Property name stays as-is
  // Frontend will just display "Guest: Yes" instead of "Ringer: Yes"
}
```

---

### Search/Filter Logic

**Question**: Can users filter or search by "ringer" anywhere in the UI?

**Answer**: ✅ **No explicit filter dropdowns - only sorting**

**Found**:
1. **PlayerManager Component** - Sort by ringer status (column header click)
   - Sort key is internal: `'ringer'` (lowercase, code-only)
   - Column header shows: `🎯` emoji with tooltip "Ringer status"
   - **Update needed**: Tooltip text only

2. **No Filter Dropdowns** - Unlike "Show Retired" checkbox, there's no "Show Guests" filter
   - Users can't hide/show guests
   - They're always visible in the player list

3. **Backend Filters** (admin/info-data route)
   - Line 77: Logic to identify "Regular players who might be guests"
   - **Not user-facing** - internal stats calculation
   - Comment says: "Filters for players marked as ringers..."
   - **Update needed**: Comment only (optional)

**Impact**: Minimal. Just update the column tooltip in PlayerManager.

---

## Conclusion

**Go with Phase 1: UI-only rename**

This gives you all the user-facing benefits with minimal risk and effort. Having `is_ringer` in your database but showing "Guest" in the UI is a completely normal pattern - just like you might have `is_admin` but display "Administrator" or `created_at` but show "Date Created".

Users will never know or care that the database field is called `is_ringer` - they'll only see the friendly "Guest" label throughout the application.

**API Safety**: ✅ JSON property names stay the same (`isRinger`)  
**Filter/Search**: ✅ No user-facing filter dropdowns to update  
**External Dependencies**: ✅ None - all internal

---

## Next Steps

If you want to proceed with Phase 1, I can:
1. Update all 4 UI component files for you
2. Update both documentation files
3. Create a simple checklist to verify everything works

Just let me know!
