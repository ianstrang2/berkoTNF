# Player Profile Stats Refactor: Teammate Stats Split

## Problem Statement

The current `update_aggregated_player_profile_stats.sql` function is experiencing timeout issues when called via PostgREST RPC due to the 8-second limit. Analysis shows that **Step 8: Teammate data calculation** is the slowest component, involving expensive JOINs across player_matches with teammate correlation analysis.

The function currently processes:
- Step 1-7: Player individual stats (relatively fast)
- **Step 8: Teammate chemistry calculations (slow, expensive)**
- Final step: Data combination and insertion

## Proposed Solution

Split the teammate stats calculation into its own dedicated table and function to:

1. **Reduce main function execution time** below the 8-second PostgREST limit
2. **Enable independent caching** of teammate data with its own refresh cycle
3. **Improve maintainability** by separating concerns
4. **Allow parallel processing** of stats updates in the future

## Technical Implementation Plan

### 1. Database Schema Changes

#### 1.1 New Table: `aggregated_player_teammate_stats`
```sql
CREATE TABLE public.aggregated_player_teammate_stats (
    player_id INTEGER PRIMARY KEY,
    teammate_chemistry_all JSONB DEFAULT '[]'::jsonb,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

-- Note: PRIMARY KEY on player_id automatically creates an index, no additional index needed
```

#### 1.2 Modify Existing Table: `aggregated_player_profile_stats`
```sql
-- Remove teammate_chemistry_all column from existing table
ALTER TABLE public.aggregated_player_profile_stats 
DROP COLUMN IF EXISTS teammate_chemistry_all;
```

### 2. SQL Function Changes

#### 2.1 Create New Function: `update_aggregated_player_teammate_stats.sql`
- Extract Step 8 logic from current function
- Maintain identical teammate calculation logic (lines 281-322 from backup)
- Add proper cache_metadata entry with key `player_teammate_stats`
- Follow same logging and timing patterns as other update functions

#### 2.2 Modify Existing Function: `update_aggregated_player_profile_stats.sql`
- Remove Step 8 (teammate calculation)
- Remove `teammate_chemistry_all` from INSERT statement
- Update final INSERT to exclude teammate column (line 336 in backup)
- Maintain all other functionality unchanged

### 3. Edge Function Integration

#### 3.1 New Edge Function: `call-update-player-teammate-stats`
```typescript
// Structure identical to existing edge functions
const FUNCTION_NAME = "call-update-player-teammate-stats";
const TARGET_RPC = "update_aggregated_player_teammate_stats";
```

#### 3.2 Integration Points
- **Admin Stats Update**: Add to `FUNCTIONS_TO_CALL` in `/api/admin/trigger-stats-update/route.ts`
- **Post-Match Updates**: Include in match completion triggers
- **Cron Jobs**: Add to scheduled updates
- **Deploy Script**: Add to `deploy_all.ps1` SQL deployment order

### 4. Frontend API Changes

#### 4.1 Player Profile API Route Updates
Current: `/api/playerprofile/route.ts` queries only `aggregated_player_profile_stats`

**Option A: SQL JOIN Approach**
```sql
SELECT p.*, t.teammate_chemistry_all
FROM aggregated_player_profile_stats p
LEFT JOIN aggregated_player_teammate_stats t USING (player_id)
WHERE p.player_id = ?
```

**Option B: Dual Query Approach**
```typescript
const [profile, teammateStats] = await Promise.all([
  prisma.aggregated_player_profile_stats.findUnique({...}),
  prisma.aggregated_player_teammate_stats.findUnique({...})
]);
```

**Recommendation**: Use Option A (SQL JOIN) for atomic consistency and performance.

#### 4.2 Cache Integration
- Add new cache key `player_teammate_stats` to cache system
- Update cache invalidation logic in admin triggers
- **Note**: Admin UI automatically displays all `cache_metadata` entries, so no custom UI work required

### 5. Deployment Script Updates

#### 5.1 SQL Deployment Order
Add to `deploy_all.ps1` after dependencies:
```powershell
$sqlDeploymentOrder = @(
    "helpers.sql",
    "update_aggregated_all_time_stats.sql",
    "update_aggregated_hall_of_fame.sql",
    # ... existing functions ...
    "update_aggregated_player_profile_stats.sql",
    "update_aggregated_player_teammate_stats.sql",  # NEW
    # ... rest of functions ...
)
```

#### 5.2 Edge Function Deployment
Add to edge function list:
```powershell
$edgeFunctionNames = @(
    # ... existing functions ...
    "call-update-player-profile-stats",
    "call-update-player-teammate-stats",  # NEW
    # ... rest of functions ...
)
```

## File Changes Summary

### New Files to Create
1. `sql/update_aggregated_player_teammate_stats.sql` - New teammate stats function
2. `supabase/functions/call-update-player-teammate-stats/index.ts` - New edge function

### Files to Modify
1. `sql/update_aggregated_player_profile_stats.sql` - Remove Step 8, update INSERT
2. `src/app/api/playerprofile/route.ts` - Add teammate data JOIN/query
3. `src/app/api/admin/trigger-stats-update/route.ts` - Add new function to call list
4. `deploy_all.ps1` - Add new SQL and edge function to deployment
5. `prisma/schema.prisma` - Add new table model, remove teammate column from existing

### Database Migration Required
```sql
-- 1. Create new table
CREATE TABLE public.aggregated_player_teammate_stats (...);

-- 2. Migrate existing data with fresh timestamp
INSERT INTO public.aggregated_player_teammate_stats (player_id, teammate_chemistry_all, last_updated)
SELECT player_id, teammate_chemistry_all, NOW()
FROM public.aggregated_player_profile_stats 
WHERE teammate_chemistry_all IS NOT NULL;

-- 3. Remove old column
ALTER TABLE public.aggregated_player_profile_stats DROP COLUMN teammate_chemistry_all;
```

## Risk Analysis

### Potential Issues
1. **Data Sync Issues**: Teammate stats and profile stats could become out of sync
   - **Mitigation**: Implement consistent update triggers and monitoring

2. **Join Performance**: Frontend queries now require JOIN operation
   - **Mitigation**: Proper indexing on player_id columns

3. **Stale Teammate Data**: Teammate stats might lag behind profile stats
   - **Mitigation**: Run teammate updates immediately after profile updates

4. **Cache Complexity**: Two cache keys instead of one
   - **Mitigation**: Update cache invalidation logic to handle both keys

### Rollback Plan
- Backup file already exists: `sql/backup-for-ian`
- Can restore original function and re-add teammate column if needed
- Edge functions can be removed via Supabase CLI

## Validation Steps

### Pre-Implementation
1. ✅ Backup exists and is confirmed complete
2. ✅ Current SQL structure analyzed and Step 8 identified
3. ✅ Frontend usage patterns documented
4. ✅ Edge function patterns reviewed for consistency

### Post-Implementation
1. Verify new table creation and data migration
2. Test new SQL function execution time (should be <2 seconds)
3. Test original function execution time (should be <6 seconds)
4. Verify frontend player profile pages load correctly
5. Test admin stats update includes both functions
6. Verify cache metadata shows both keys
7. Test deployment script includes all components

## Performance Expectations

### Before Refactor
- Single function: ~10-15 seconds (times out at 8s PostgREST limit)
- Step 8 (teammate): ~6-8 seconds of total time

### After Refactor
- Profile stats function: ~4-6 seconds (safe margin below 8s limit)
- Teammate stats function: ~3-5 seconds (separate execution)
- Total time: Similar, but no timeout issues
- Can run in parallel: Potential 40-50% time savings

## Dependencies and Integration Points

### Current Integration Points Confirmed
1. **Admin Page**: `/admin/info` - manual stats triggers
2. **Match Completion**: Post-match automatic updates
3. **Cron Jobs**: Scheduled background updates via Vercel cron
4. **Background Jobs**: New system for queued processing
5. **Cache System**: Metadata tracking and invalidation
6. **Player Profiles**: Frontend consumption of teammate data

### New Integration Requirements
1. Add teammate function to all existing trigger points
2. Update cache invalidation to handle new key
3. **Admin UI**: No changes needed - automatically displays new `player_teammate_stats` cache entry
4. Ensure deployment script handles both SQL and edge function

## Conclusion

This refactor addresses the immediate timeout issue while maintaining all existing functionality. The separation of concerns improves maintainability and sets up the foundation for future parallel processing optimizations.

The backup file provides a safety net, and the implementation can be done incrementally with thorough testing at each step.

**Next Step**: Review this plan and confirm approach before proceeding with implementation.
