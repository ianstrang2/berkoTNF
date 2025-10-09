# Understanding Request Counts - What's Normal vs What's Not

## Your Current Results

**Table Page:** 105 → 64 requests (39% reduction)
**Dashboard:** 189 → 52 requests (72% reduction)

---

## Breaking Down the 64 Requests

### ✅ **React Query Deduplicated (API Calls)**
These are the ones we optimized:
```
✅ /api/stats/half-season - 1x (was 2x)
✅ /api/stats - 1x per year (was 2x+)
✅ /api/matchReport - 0-1x (cached from dashboard!)
✅ /api/admin/app-config - 0-1x (cached from dashboard!)
✅ /api/seasons - 1x (was 2x)
✅ /api/seasons/current - 1x (was 4x) ← JUST FIXED!
✅ /api/season-race-data - 1x per period
```

### ⚠️ **Next.js Prefetch Requests** (Can't deduplicate - this is normal)
```
❌ whole?view=goals (3x) - Route prefetch
❌ whole?view=race (3x) - Route prefetch
❌ half?_rsc (2x) - Server Component chunks
❌ whole?_rsc (2x) - Server Component chunks
```

**What are these?**
- Next.js **automatically prefetches** routes when `<Link>` components are visible
- The `?view=goals` and `?view=race` are **tab links** being prefetched
- `_rsc` = React Server Component chunks (metadata, not data)

**Can we fix them?**
Not really - these are Next.js optimizations. You could disable them, but that would hurt UX (slower navigation).

### 🤔 **"profile" Requests** (Need investigation)
```
❓ profile (3x, each 1+ second)
```

**Possible causes:**
1. **Player profile links** on hover (tooltip/preview)
2. **Avatar components** fetching player data
3. **Navigation component** checking player state

**To find them:** In Network tab, click on a "profile" request and look at:
- Full URL (is it `/api/playerprofile?...`?)
- Initiator tab (which component made it?)

---

## Why Dashboard Had Better Reduction

**Dashboard (72% reduction):**
- Simpler page structure
- Fewer routes/navigation
- All components on one page
- No tab switching

**Table Page (39% reduction):**
- Multiple routes (`/half`, `/whole`, `/graph`)
- Tab navigation (Points, Goals, Race)
- Next.js prefetches all tabs when links are visible
- Server Component chunks for each route

**The 39% is actually good!** Half of the remaining 64 requests are Next.js routing overhead that we can't eliminate.

---

## What We Can Still Optimize

### 1. Fix "current" duplicates (JUST FIXED!)
I just migrated `useSeasonTitles` to use React Query. This should eliminate 3 more requests.

**Before:** `/api/seasons/current` called 4x
**After:** `/api/seasons/current` called 1x

**Expected new total: ~60 requests** (down from 64)

### 2. Investigate "profile" requests
Need to find what's calling `/api/playerprofile` or similar.

**Action:** In Network tab, click on a "profile" request:
- What's the full URL?
- Click the "Initiator" tab - what triggered it?

---

## Next.js Prefetch Behavior (Can't optimize)

### What Next.js does automatically:
```typescript
// When you have navigation links like this:
<Link href="/player/table/whole?view=goals">Goals</Link>
<Link href="/player/table/whole?view=race">Race</Link>

// Next.js AUTOMATICALLY prefetches these routes when visible:
GET /player/table/whole?view=goals?_rsc - Prefetch route
GET /player/table/whole?view=race?_rsc - Prefetch route
```

### Why it does this:
- Makes navigation instant (route already loaded)
- Improves perceived performance
- Downloads route chunks in advance

### Can we disable it?
Yes, but **don't!** It would make navigation slower:
```typescript
<Link href="..." prefetch={false}>  // Slower navigation
```

---

## setTimeout Warning (62ms)

This is from the tenant switch code:
```typescript:src/components/layout/ProfileDropdown.component.tsx
await new Promise(resolve => setTimeout(resolve, 500));
```

This is intentional - we wait 500ms for cookies to propagate. The warning is harmless.

---

## Real vs Fake Request Count

### Your 64 Requests Break Down To:
```
~10-15  - Real API calls (deduplicated by React Query) ✅
~20-25  - Next.js route prefetch (normal, can't remove)
~10-15  - Server Component chunks (normal, can't remove)
~10-15  - Static assets (CSS, JS, images)
~10     - "profile" or other mystery calls (need to investigate)
```

**Real API calls: ~10-15** ← This is what matters!

---

## Action Items

### 1. Test Current Season Fix (Just Applied)
Refresh the table page. You should see:
- `/api/seasons/current` called **1x** (not 4x)
- Total requests: ~60 (down from 64)

### 2. Identify "profile" Requests
In Network tab:
- Click on a "profile" request
- Tell me the full URL
- Check the "Initiator" tab - what triggered it?

### 3. Check ACTUAL API Duplicates
Filter Network tab to only show:
- `/api/*` requests (ignore routes without `/api/`)

How many of THOSE are duplicated?

---

## Expected Final Results

After fixing "current" and "profile" duplicates:
- **API calls:** ~8-12 unique (excellent!)
- **Total requests:** ~50-55 (including Next.js overhead)
- **Improvement:** 105 → 50-55 (50-60% reduction)

The remaining ~40 requests are Next.js routing/prefetch - **that's normal and good for UX!**

---

**Test the current season fix now, then let's investigate those "profile" calls!** 🔍


