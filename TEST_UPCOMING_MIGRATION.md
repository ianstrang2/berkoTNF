# Testing Guide: Upcoming Matches Migration

## Quick Test (2 minutes)

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Open Network Tab
- Open DevTools → Network tab
- Filter: `/api/`
- Clear network log

### 3. Navigate to Upcoming Matches
```
http://localhost:3000/player/upcoming
```

### 4. Check Initial Requests
**Expected (3 requests):**
✅ `/api/upcoming` - List of matches
✅ `/api/admin/app-config?group=match_settings` - Team names
✅ `/api/latest-player-status` - On fire/grim reaper status

**Before Migration (7+ requests):**
❌ `/api/upcoming` - List
❌ `/api/admin/app-config` - Card 1
❌ `/api/admin/app-config` - Card 2 (duplicate!)
❌ `/api/admin/app-config` - Card 3 (duplicate!)
❌ `/api/latest-player-status` - Card 1
❌ `/api/latest-player-status` - Card 2 (duplicate!)
❌ `/api/latest-player-status` - Card 3 (duplicate!)

### 5. Expand a Match Card
- Click the expand button on any match
- Check network tab

**Expected (+1 request ONLY if not previously expanded):**
✅ `/api/upcoming?matchId=X` - Match details with players

**Note:** Expanding the same card again = 0 requests (cached!)

### 6. Navigate Away and Back
- Go to Dashboard
- Return to Upcoming Matches
- Check network tab

**Expected (0-3 requests):**
- If within 5 minutes = 0 requests (served from cache) ✅
- If after 5 minutes = 3 requests (stale-while-revalidate) ✅

## Visual Checks

### Match Cards Display
- [ ] Match date displays correctly
- [ ] Player count displays
- [ ] Status badge displays (POOL LOCKED / TEAMS BALANCED)
- [ ] Expand/collapse button works

### Expanded Card Content
- [ ] Player pool displays (if only POOL LOCKED)
- [ ] Teams display (if TEAMS BALANCED)
- [ ] Team names display correctly (Orange/Green or custom)
- [ ] Fire emoji shows for "on fire" player
- [ ] Skull emoji shows for "grim reaper" player

### Loading States
- [ ] Initial load shows spinner
- [ ] Expanding card shows "Loading match details..."
- [ ] No "flash of empty state" when using cache

## Console Checks

### Expected Logs
```
[WITH_TENANT_CONTEXT] Setting tenant context for tenant: <tenant_id>
```

### NO Error Messages
- No "Failed to fetch" errors
- No React Query errors
- No TypeScript errors
- No hydration errors

## Cache Verification

### Using React Query DevTools (Optional)
If you have DevTools installed:

1. Open React Query DevTools panel
2. Check these queries exist:
   - `['upcoming', '<tenant_id>']`
   - `['appConfig', '<tenant_id>', 'match_settings']`
   - `['latestPlayerStatus', '<tenant_id>']`
   - `['upcomingMatchDetails', '<tenant_id>', <matchId>]` (when expanded)

3. Verify status:
   - Fresh: Green dot
   - Stale: Yellow dot
   - Fetching: Spinner

## Performance Benchmarks

### Before Migration
- Initial load: ~7 API calls
- 3 match cards: 7 requests total
- Expand 3 cards: +3 requests = 10 total
- Navigate back: Another 7 requests = 17 total

### After Migration
- Initial load: 3 API calls
- 3 match cards: 3 requests total (shared cache!)
- Expand 3 cards: +3 requests = 6 total
- Navigate back within 5min: 0 requests (cache!) = 6 total

**Reduction: 17 → 6 requests (65% reduction with navigation)**

## Troubleshooting

### If You See Duplicate Requests
1. Check browser cache is disabled in DevTools
2. Verify you're not in incognito mode with extensions disabled
3. Check React Query DevTools for query status

### If No Data Loads
1. Check console for auth errors
2. Verify `tenantId` is set in auth profile
3. Check API routes return success: `{ success: true, data: [...] }`

### If Cards Don't Expand
1. Check Network tab for 404 on match details
2. Verify `matchId` is being passed correctly
3. Check `useUpcomingMatchDetails` hook is receiving non-null `matchId`

## Success Criteria ✅

- [ ] Initial load: Only 3 API requests
- [ ] Config/status shared across all cards
- [ ] Expanding card fetches details once
- [ ] Re-expanding same card uses cache
- [ ] Navigate back within 5min uses cache
- [ ] No console errors
- [ ] TypeScript compilation passes
- [ ] All visual elements display correctly

---

**Status:** Ready for testing  
**Expected Duration:** 2-5 minutes  
**Risk Level:** Low (all changes are additive, no breaking changes)

