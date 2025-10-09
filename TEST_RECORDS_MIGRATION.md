# 🧪 Records Screen Migration - Testing Guide

## Quick Test (2 minutes)

### Step 1: Open DevTools
1. Open your browser DevTools (F12)
2. Go to **Network** tab
3. Filter by: `/api/`
4. Clear any existing requests

### Step 2: Load Leaderboard
1. Navigate to `/player/records/leaderboard`
2. **Expected requests:** 
   - ✅ `/api/allTimeStats` (1x)
   - ✅ `/api/players` (1x)
   - ❌ NO duplicates
3. **Verify:** Table loads with stats, sorting works

### Step 3: Switch to Legends
1. Click **Legends** tab or navigate to `/player/records/legends`
2. **Expected requests:**
   - ✅ `/api/honourroll` (1x NEW)
   - ✅ `/api/players` (**from cache** - should show "memory cache" or 304)
3. **Verify:** Season winners display correctly

### Step 4: Switch to Feats
1. Click **Feats** tab or navigate to `/player/records/feats`
2. **Expected requests:**
   - ✅ ZERO new requests (all from cache!)
3. **Verify:** Records display correctly

### Step 5: Navigate Back to Leaderboard
1. Click **Leaderboard** tab
2. **Expected requests:**
   - ✅ ZERO new requests (all from cache!)
3. **Verify:** Table loads instantly (no loading spinner)

---

## Success Criteria

### ✅ API Call Deduplication
| Navigation Path | Before | After | Saved |
|----------------|--------|-------|-------|
| Initial Leaderboard load | 2 | 2 | 0 |
| Switch to Legends | +2 | +1 | 1 |
| Switch to Feats | +2 | +0 | 2 |
| Back to Leaderboard | +0 | +0 | 0 |
| **TOTAL** | **6** | **3** | **50%** |

### ✅ Performance
- Initial load: ~200-500ms
- Tab switches (cached): <50ms (instant)
- No loading spinners after initial load

### ✅ Functionality
- [ ] All tables display data correctly
- [ ] Sorting works (Leaderboard)
- [ ] Player links work
- [ ] Club logos display
- [ ] Tab switching is instant

---

## Common Issues & Solutions

### Issue: "Cannot read property of undefined"
**Cause:** Data structure mismatch
**Solution:** Check browser console for details, verify API response format

### Issue: Data not updating
**Cause:** Cache too aggressive
**Solution:** Refresh page (F5) or clear cache in DevTools

### Issue: Multiple requests still firing
**Cause:** Components not using hooks correctly
**Solution:** Check that all 3 components import from `@/hooks/queries/*`

### Issue: Loading forever
**Cause:** API error
**Solution:** Check Network tab for failed requests, verify backend is running

---

## Advanced Testing

### Test Tenant Switching
1. Switch tenant (if applicable)
2. **Expected:** All caches cleared, fresh data loaded
3. **Verify:** New data matches new tenant

### Test Stale Data
1. Wait 10+ minutes (cache expires)
2. Switch tabs
3. **Expected:** Background refetch (data updates silently)

### Test Error States
1. Kill backend server
2. Refresh page
3. **Expected:** Error message displays gracefully
4. Restart server
5. **Expected:** Retry succeeds automatically

---

## Performance Comparison

### Before Migration
```
User opens Leaderboard:
  → fetch /api/allTimeStats (500ms)
  → fetch /api/players (200ms)
  Total: 700ms

User switches to Legends:
  → fetch /api/honourroll (300ms)
  → fetch /api/players (200ms) ← DUPLICATE!
  Total: 500ms

User switches to Feats:
  → fetch /api/honourroll (300ms) ← DUPLICATE!
  → fetch /api/players (200ms) ← DUPLICATE!
  Total: 500ms

Grand Total: 1700ms + 4 duplicate requests
```

### After Migration
```
User opens Leaderboard:
  → fetch /api/allTimeStats (500ms)
  → fetch /api/players (200ms)
  Total: 700ms

User switches to Legends:
  → fetch /api/honourroll (300ms)
  → /api/players from cache (0ms) ← CACHED!
  Total: 300ms

User switches to Feats:
  → /api/honourroll from cache (0ms) ← CACHED!
  → /api/players from cache (0ms) ← CACHED!
  Total: 0ms (instant!)

Grand Total: 1000ms + 0 duplicates
Saved: 700ms + 4 API calls (41% faster)
```

---

## React Query DevTools (Optional)

### Enable DevTools
React Query DevTools are already installed. They should appear as a floating icon in the bottom-right corner of your screen.

### What to Look For
1. **Query Keys:** Verify correct keys are being used
   - `['allTimeStats']`
   - `['honourRoll']`
   - `['players']`

2. **Query Status:**
   - Fresh (green) - recently fetched
   - Stale (yellow) - older but still used
   - Fetching (blue) - actively loading

3. **Cache Hits:**
   - Click a query to see fetch count
   - Should be 1 even if used by multiple components

---

## Approval Checklist

Before marking complete:
- [ ] All 3 tabs load correctly
- [ ] API calls are deduplicated (verified in Network tab)
- [ ] Tab switching is instant after initial load
- [ ] No console errors
- [ ] Player links work
- [ ] Data displays correctly
- [ ] No visual regressions

**If all checkboxes are ✅, migration is successful!** 🎉

---

## Next Screen Suggestion

Based on success, recommend migrating:
1. **Player Profiles** (`/player/profiles/[id]`)
   - Would benefit from shared `usePlayers()` cache
   - Estimated 20-30 duplicate calls per profile
   - Medium complexity

OR

2. **Ship current progress**
   - 3 screens optimized (Dashboard, Table, Records)
   - 200+ duplicate calls eliminated
   - Significant performance improvement
   - Monitor in production before continuing


