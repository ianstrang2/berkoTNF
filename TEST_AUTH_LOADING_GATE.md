# 🧪 Auth Loading Gate - Quick Test Guide

## Quick 5-Minute Test

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Test Fresh Page Load (Critical Test)

**Clear browser cache first:**
- Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or: DevTools → Network → ✓ Disable cache

**Load Dashboard:**
```
http://localhost:3000/player/dashboard
```

**What You Should See:**

✅ **Expected Flow:**
1. Brief loading spinner (100-300ms)
   - Text: "Loading your profile..."
   - Purple spinner animation
2. Dashboard appears with ALL 4 components:
   - ✅ Match Report (top-left)
   - ✅ Current Form (top-right)
   - ✅ Current Standings (bottom-left)
   - ✅ Records & Achievements (bottom-right)

❌ **What Should NOT Happen:**
- Empty components
- "No Data Available" errors
- Components appearing/disappearing
- Flickering content

### 3. Network Tab Check

**Open DevTools → Network → Filter: `/api/`**

**Expected Order:**
```
1. /api/auth/profile          ← Loads FIRST
   (wait 100-300ms)
2. /api/match-report           ← Then all others
3. /api/players
4. /api/personal-bests
5. /api/admin/app-config
... etc
```

**What to Verify:**
- ✅ Auth profile loads before other APIs
- ✅ NO empty/null responses
- ✅ NO duplicate requests to same endpoint

### 4. Repeat Test (Critical!)

**Do 5 fresh page loads:**
1. Hard refresh (Ctrl+Shift+R)
2. Hard refresh (Ctrl+Shift+R)
3. Hard refresh (Ctrl+Shift+R)
4. Hard refresh (Ctrl+Shift+R)
5. Hard refresh (Ctrl+Shift+R)

**Expected: 5 out of 5 successful loads**

Before fix: Would see 2-3 failures (missing components)
After fix: Should see 0 failures (100% success)

---

## Additional Tests (Optional)

### Test Table Page
```
http://localhost:3000/player/table
```
- ✅ Should show loading spinner briefly
- ✅ Should show all table data

### Test Records Page
```
http://localhost:3000/player/records
```
- ✅ Should show loading spinner briefly
- ✅ All 3 tabs work (Leaderboard, Legends, Feats)

### Test Admin Page (if superadmin)
```
http://localhost:3000/admin/matches
```
- ✅ Should show "Loading admin panel..." spinner
- ✅ Should load admin interface correctly

---

## Console Check

**Open DevTools → Console**

**Should See:**
```
[WITH_TENANT_CONTEXT] Setting tenant context for tenant: <tenant_id>
⏱️ [TENANT] getSession took Xms
[TENANT_CONTEXT] ✅ Resolved from players
```

**Should NOT See:**
- ❌ "Failed to fetch" errors
- ❌ React Query errors
- ❌ "No Data Available" console logs
- ❌ Hydration errors

---

## Success Criteria

✅ **PASS:** All components show on EVERY fresh load  
✅ **PASS:** Loading spinner shows briefly (100-300ms)  
✅ **PASS:** No console errors  
✅ **PASS:** Auth loads before other APIs  

❌ **FAIL:** Any components missing  
❌ **FAIL:** "No Data Available" errors  
❌ **FAIL:** Console errors  
❌ **FAIL:** Inconsistent behavior  

---

## Troubleshooting

### If Components Still Missing

1. **Hard refresh doesn't clear cache?**
   - Open Incognito/Private window
   - Try there

2. **Old code still running?**
   ```bash
   # Kill server
   Ctrl+C
   
   # Clear Next.js cache
   rm -rf .next
   
   # Restart
   npm run dev
   ```

3. **Browser caching aggressively?**
   - DevTools → Network → ✓ Disable cache
   - Try different browser

### If Loading Spinner Never Disappears

**Check console for errors:**
- Auth API might be failing
- Network request might be blocked
- Database connection issue

**Verify auth works:**
```
http://localhost:3000/api/auth/profile
```
Should return JSON with tenantId

---

## Expected Timeline

| Time | Event |
|------|-------|
| 0ms | Page loads, layout mounts |
| 0ms | Loading spinner shows |
| 100-300ms | Auth API responds |
| 150-350ms | tenantId available |
| 150-350ms | Layout unblocks |
| 150-350ms | Components mount |
| 150-350ms | Queries fire |
| 300-500ms | Data appears |

**Total time to data: 300-500ms**

Before fix: Same time, but unreliable (50% failure rate)
After fix: Same time, but 100% reliable

---

## Quick Status Check

Run this in your browser console:
```javascript
// Check if auth is loaded
const authProfile = localStorage.getItem('userProfile');
console.log('Auth loaded:', !!authProfile);

// Check React Query cache
// (If you have DevTools installed)
```

---

**Ready to test!** 🚀

Expected result: **100% success rate on fresh page loads**

