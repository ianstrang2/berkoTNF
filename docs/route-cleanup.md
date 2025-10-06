# Player Routes Restructuring Plan

**Version**: 1.0  
**Date**: October 5, 2025  
**Goal**: Move all player pages from root paths to `/player/*` for consistent, protected route structure  
**Estimated Time**: 45-60 minutes

---

## Executive Summary

### Current Problem
Player pages live at inconsistent root paths (`/`, `/upcoming`, `/table`, `/records`) which:
- ❌ Are NOT protected by authentication middleware
- ❌ Create confusion about what requires auth vs what's public
- ❌ Prevent logout button from showing (no auth session on unprotected routes)
- ❌ Inconsistent with `/admin/*` and `/superadmin/*` patterns

### Proposed Solution
Move all player pages to `/player/*` structure:
```
BEFORE:                      AFTER:
/                    →      /player  (or /player/dashboard)
/upcoming            →      /player/upcoming
/table               →      /player/table
/table/half          →      /player/table/half
/table/whole         →      /player/table/whole
/table/graph         →      /player/table/graph
/records             →      /player/records
/records/leaderboard →      /player/records/leaderboard
/records/legends     →      /player/records/legends
/records/feats       →      /player/records/feats
/players/[id]        →      /player/profiles/[id]
```

### Benefits
- ✅ All player pages protected by middleware (one pattern: `/player/:path*`)
- ✅ Consistent with admin and superadmin URL patterns
- ✅ Authentication works properly (logout button visible)
- ✅ Clear separation of concerns (player vs admin vs public)
- ✅ Easier to maintain and reason about

---

## Current State Analysis

### Existing Player Pages (Root Level)
```
src/app/
├── page.tsx                    # Main dashboard (UNPROTECTED!)
├── upcoming/
│   ├── page.tsx
│   └── layout.tsx
├── table/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── half/
│   │   └── page.tsx
│   ├── whole/
│   │   └── page.tsx
│   └── graph/
│       └── page.tsx
├── records/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── leaderboard/
│   │   └── page.tsx
│   ├── legends/
│   │   └── page.tsx
│   └── feats/
│       └── page.tsx
└── players/
    ├── [id]/
    │   └── page.tsx
    └── layout.tsx
```

### Navigation Configuration
**File**: `src/contexts/NavigationContext.tsx` (lines 43-89)

Current player sections:
- `dashboard` → No secondary
- `upcoming` → No secondary
- `table` → Secondary: `half`, `whole`
- `records` → Secondary: `leaderboard`, `legends`, `feats`

### Middleware Current Config
**File**: `src/middleware.ts` (lines 98-105)
```typescript
matcher: [
  '/admin/:path*',
  '/superadmin/:path*',
  '/dashboard/:path*',  // ← Not matching actual routes!
  '/stats/:path*',      // ← Not matching actual routes!
]
```

**CRITICAL**: Middleware expects `/dashboard` and `/stats`, but actual pages are at `/`, `/upcoming`, etc.

---

## Migration Plan (Step-by-Step)

### Phase 1: File System Changes (Pages & Layouts)

#### Step 1.1: Create New Directory Structure
```bash
# Create /player directory and subdirectories
mkdir src/app/player
mkdir src/app/player/upcoming
mkdir src/app/player/table
mkdir src/app/player/table/half
mkdir src/app/player/table/whole
mkdir src/app/player/table/graph
mkdir src/app/player/records
mkdir src/app/player/records/leaderboard
mkdir src/app/player/records/legends
mkdir src/app/player/records/feats
mkdir src/app/player/profiles
mkdir src/app/player/profiles/[id]
```

#### Step 1.2: Move Root Dashboard
```
MOVE:  src/app/page.tsx
TO:    src/app/player/page.tsx
```

#### Step 1.3: Move Upcoming Section
```
MOVE:  src/app/upcoming/page.tsx
TO:    src/app/player/upcoming/page.tsx

MOVE:  src/app/upcoming/layout.tsx
TO:    src/app/player/upcoming/layout.tsx
```

#### Step 1.4: Move Table Section
```
MOVE:  src/app/table/page.tsx
TO:    src/app/player/table/page.tsx

MOVE:  src/app/table/layout.tsx
TO:    src/app/player/table/layout.tsx

MOVE:  src/app/table/half/page.tsx
TO:    src/app/player/table/half/page.tsx

MOVE:  src/app/table/whole/page.tsx
TO:    src/app/player/table/whole/page.tsx

MOVE:  src/app/table/graph/page.tsx
TO:    src/app/player/table/graph/page.tsx
```

#### Step 1.5: Move Records Section
```
MOVE:  src/app/records/page.tsx
TO:    src/app/player/records/page.tsx

MOVE:  src/app/records/layout.tsx
TO:    src/app/player/records/layout.tsx

MOVE:  src/app/records/leaderboard/page.tsx
TO:    src/app/player/records/leaderboard/page.tsx

MOVE:  src/app/records/legends/page.tsx
TO:    src/app/player/records/legends/page.tsx

MOVE:  src/app/records/feats/page.tsx
TO:    src/app/player/records/feats/page.tsx
```

#### Step 1.6: Move Player Profiles
```
MOVE:  src/app/players/[id]/page.tsx
TO:    src/app/player/profiles/[id]/page.tsx

MOVE:  src/app/players/layout.tsx
TO:    src/app/player/profiles/layout.tsx
```

#### Step 1.7: Create Root Redirect
```
CREATE: src/app/page.tsx (NEW - replaces old one after move)

Content:
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/player');
}
```

#### Step 1.8: Delete Old Empty Directories
```
DELETE: src/app/upcoming/    (after moving files)
DELETE: src/app/table/       (after moving files)
DELETE: src/app/records/     (after moving files)
DELETE: src/app/players/     (after moving files)
```

---

### Phase 2: Navigation Configuration Updates

#### Step 2.1: Update Navigation Config
**File**: `src/contexts/NavigationContext.tsx` (lines 43-89)

```typescript
// BEFORE:
const NAVIGATION_CONFIG = {
  dashboard: {
    label: 'Dashboard',
    icon: 'dashboard',
    secondary: null
  },
  upcoming: { ... },
  table: { ... },
  records: { ... },
  // ...
}

// AFTER:
const NAVIGATION_CONFIG = {
  player: {
    label: 'Player',
    icon: 'user',
    secondary: {
      dashboard: { label: 'Dashboard' },
      upcoming: { label: 'Upcoming' },
      table: { label: 'Table', tertiary: ['half', 'whole', 'graph'] },
      records: { label: 'Records', tertiary: ['leaderboard', 'legends', 'feats'] }
    }
  },
  admin: { ... }, // Unchanged
  superadmin: { ... } // Unchanged
}
```

**OR** (Better - keep bottom nav simple):
```typescript
// Keep player sections as primary navigation (current UX)
const NAVIGATION_CONFIG = {
  dashboard: {
    label: 'Dashboard',
    icon: 'dashboard',
    href: '/player',  // Update href
    secondary: null
  },
  upcoming: {
    label: 'Upcoming', 
    icon: 'calendar',
    href: '/player/upcoming',  // Update href
    secondary: null
  },
  table: {
    label: 'Table',
    icon: 'table',
    href: '/player/table',  // Update href
    secondary: {
      half: { label: 'Half', href: '/player/table/half' },
      whole: { label: 'Whole', href: '/player/table/whole' }
    }
  },
  records: {
    label: 'Records',
    icon: 'trophy',
    href: '/player/records',  // Update href
    secondary: {
      leaderboard: { label: 'Leaderboard', href: '/player/records/leaderboard' },
      legends: { label: 'Legends', href: '/player/records/legends' },
      feats: { label: 'Feats', href: '/player/records/feats' }
    }
  },
  admin: { ... }, // Unchanged
  superadmin: { ... } // Unchanged
}
```

**Recommendation**: Second approach - keeps existing UX intact, just updates URLs.

#### Step 2.2: Update URL Detection Logic
**File**: `src/contexts/NavigationContext.tsx` (lines 148-200)

Update `setNavigationFromUrl` function:
```typescript
const setNavigationFromUrl = (pathname: string) => {
  // ... existing superadmin and admin logic unchanged ...
  
  // Player sections - UPDATE THESE CHECKS
  if (pathname === '/player' || pathname === '/player/dashboard') {
    setPrimarySection('dashboard');
    setSecondarySection(undefined);
    setIsAdminMode(false);
  } else if (pathname.startsWith('/player/upcoming')) {
    setPrimarySection('upcoming');
    setSecondarySection(undefined);
    setIsAdminMode(false);
  } else if (pathname.startsWith('/player/table')) {
    setPrimarySection('table');
    // Parse secondary section
    if (pathname.includes('/half')) setSecondarySection('half');
    else if (pathname.includes('/whole')) setSecondarySection('whole');
    else if (pathname.includes('/graph')) setSecondarySection('graph');
    setIsAdminMode(false);
  } else if (pathname.startsWith('/player/records')) {
    setPrimarySection('records');
    // Parse secondary section
    if (pathname.includes('/leaderboard')) setSecondarySection('leaderboard');
    else if (pathname.includes('/legends')) setSecondarySection('legends');
    else if (pathname.includes('/feats')) setSecondarySection('feats');
    setIsAdminMode(false);
  }
  // ... rest unchanged ...
};
```

---

### Phase 3: Component Updates (Navigation Links)

#### Step 3.1: Update BottomNavigation.component.tsx
**File**: `src/components/navigation/BottomNavigation.component.tsx` (lines 162-191)

```typescript
// BEFORE:
return [
  {
    section: 'dashboard' as const,
    href: '/',
    icon: getIcon('dashboard'),
    label: 'Dashboard',
    isActive: isActive('dashboard')
  },
  {
    section: 'upcoming' as const,
    href: '/upcoming',
    icon: getIcon('calendar'),
    label: 'Upcoming',
    isActive: isActive('upcoming')
  },
  {
    section: 'table' as const,
    href: '/table',
    icon: getIcon('table'),
    label: 'Table',
    isActive: isActive('table')
  },
  {
    section: 'records' as const,
    href: '/records/leaderboard',
    icon: getIcon('trophy'),
    label: 'Records',
    isActive: isActive('records')
  }
];

// AFTER:
return [
  {
    section: 'dashboard' as const,
    href: '/player',  // Changed
    icon: getIcon('dashboard'),
    label: 'Dashboard',
    isActive: isActive('dashboard')
  },
  {
    section: 'upcoming' as const,
    href: '/player/upcoming',  // Changed
    icon: getIcon('calendar'),
    label: 'Upcoming',
    isActive: isActive('upcoming')
  },
  {
    section: 'table' as const,
    href: '/player/table',  // Changed
    icon: getIcon('table'),
    label: 'Table',
    isActive: isActive('table')
  },
  {
    section: 'records' as const,
    href: '/player/records/leaderboard',  // Changed
    icon: getIcon('trophy'),
    label: 'Records',
    isActive: isActive('records')
  }
];
```

#### Step 3.2: Update DesktopSidebar.component.tsx
**File**: `src/components/navigation/DesktopSidebar.component.tsx` (lines ~95-126)

Similar changes - update all player hrefs to use `/player` prefix.

#### Step 3.3: Update ProfileDropdown.component.tsx
**File**: `src/components/layout/ProfileDropdown.component.tsx`

```typescript
// Line 52: Update player view redirect
if (view === 'player') {
  window.location.href = '/player';  // Changed from '/'
}
```

#### Step 3.4: Update MobileHeader.component.tsx
**File**: `src/components/layout/MobileHeader.component.tsx`

```typescript
// Line 75: Update player view link
<a href="/player" className="...">  // Changed from href="/"
  <span>View as Player</span>
</a>
```

#### Step 3.5: Update SuperadminHeader.component.tsx
**File**: `src/components/navigation/SuperadminHeader.component.tsx`

```typescript
// Line 153: Update player view redirect
window.location.href = '/player';  // Changed from '/'
```

#### Step 3.6: Search and Replace All Player Profile Links
**Pattern to find**: `href="/players/${id}"`  
**Replace with**: `href="/player/profiles/${id}"`

**Files likely affected**:
- All components in `/components/dashboard/`
- All components in `/components/tables/`
- All components in `/components/records/`
- Any leaderboard/stats display components

#### Step 3.7: Update NavigationSubTabs Component
**File**: `src/components/navigation/NavigationSubTabs.component.tsx`

Update any hardcoded `/table/` or `/records/` paths to `/player/table/` and `/player/records/`.

---

### Phase 4: Middleware Updates

#### Step 4.1: Update Middleware Matcher
**File**: `src/middleware.ts` (lines 98-105)

```typescript
// BEFORE:
export const config = {
  matcher: [
    '/admin/:path*',
    '/superadmin/:path*',
    '/dashboard/:path*',  // ← Doesn't match actual routes
    '/stats/:path*',      // ← Doesn't match actual routes
  ],
};

// AFTER:
export const config = {
  matcher: [
    '/admin/:path*',
    '/superadmin/:path*',
    '/player/:path*',     // ← Matches all player routes
  ],
};
```

**Critical**: This one change protects ALL player pages with authentication!

#### Step 4.2: Update Authentication Redirect Logic
**File**: `src/middleware.ts` (lines 76-84)

```typescript
// Player routes - require player profile (phone auth OR admin with linked player)
if (pathname.startsWith('/player')) {  // Changed from '/dashboard' || '/stats'
  if (!session) {
    return redirectToLogin(req, pathname, 'player');
  }
  
  // Player access validated in API routes
  // (Can be direct player account OR admin with linked player_id)
}
```

---

### Phase 5: API Route Updates (If Any)

**Search for any API routes that reference player page paths:**

```bash
# Search pattern
grep -r "redirect.*\(/\|/upcoming\|/table\|/records\)" src/app/api/
```

**Likely candidates:**
- `/api/auth/login` - might redirect to dashboard after login
- `/api/auth/player/claim-profile` - might redirect after claiming
- `/api/join/link-player` - might redirect after linking

**Update any redirects to use new paths:**
- `redirect('/')` → `redirect('/player')`
- `redirect('/upcoming')` → `redirect('/player/upcoming')`

---

### Phase 6: Component Link Audits

#### Step 6.1: Components with Player Profile Links
**Files to check** (use grep to find `href="/players/`):
- `src/components/dashboard/*.tsx`
- `src/components/tables/*.tsx`
- `src/components/records/*.tsx`

**Change**: `/players/${id}` → `/player/profiles/${id}`

#### Step 6.2: Components with Navigation Links
**Check for hardcoded hrefs**:
```bash
# Find all hardcoded navigation links
grep -r "href=\"/\(upcoming\|table\|records\)" src/components/
```

Update to use `/player/*` prefix.

#### Step 6.3: Components with Router Pushes
```bash
# Find programmatic navigation
grep -r "router\.push\|window\.location\.href" src/components/ | grep -v "/admin\|/superadmin"
```

Update any player route redirects.

---

### Phase 7: External Configuration

#### Step 7.1: Vercel Configuration
**File**: `vercel.json`

**Current config**: No player-specific routes  
**Action**: ✅ **No changes needed** - Vercel auto-routes based on file structure

#### Step 7.2: Supabase Configuration
**Check**: Authentication redirect URLs

**In Supabase Dashboard** → Authentication → URL Configuration:
- Check "Site URL" - should be `https://caposport.com`
- Check "Redirect URLs" - look for any references to old paths:
  - ❌ `https://caposport.com/` → ✅ `https://caposport.com/player`
  - ❌ `https://caposport.com/upcoming` → ✅ `https://caposport.com/player/upcoming`

**Most likely**: No changes needed unless you configured specific redirects.

#### Step 7.3: Render Worker Configuration
**File**: `worker/src/lib/cache.ts` and job processors

**Check for**: Any references to player page URLs in cache invalidation or job completion redirects.

**Search pattern**:
```bash
grep -r "caposport\.com/\(upcoming\|table\|records\)" worker/src/
```

**Most likely**: ✅ **No changes needed** - worker doesn't redirect to player pages.

#### Step 7.4: Capacitor Deep Links
**File**: `capacitor.config.ts` and `AndroidManifest.xml`

**Check for**: Any deep link URL patterns that reference old player routes.

**Current patterns** (from SPEC_auth):
- `capo://` custom scheme
- `https://capo.app/join/*` universal links

**Most likely**: ✅ **No changes needed** - deep links are for `/join/*` only.

---

### Phase 8: Testing Checklist

#### Functionality Tests
- [ ] **Dashboard**: `/player` loads correctly
- [ ] **Navigation**: Bottom nav links work on mobile
- [ ] **Navigation**: Sidebar links work on desktop
- [ ] **Upcoming**: `/player/upcoming` loads
- [ ] **Table tabs**: `/player/table`, `/player/table/half`, `/player/table/whole` all work
- [ ] **Table graph**: `/player/table/graph` loads
- [ ] **Records tabs**: `/player/records/leaderboard`, `/player/records/legends`, `/player/records/feats` work
- [ ] **Player profiles**: `/player/profiles/[id]` loads individual player pages
- [ ] **Root redirect**: Visiting `/` redirects to `/player`
- [ ] **Old URLs**: Visiting `/upcoming`, `/table`, `/records` show 404 (expected)

#### Authentication Tests
- [ ] **Logout button appears**: ProfileDropdown visible when authenticated
- [ ] **Middleware protection**: Unauthenticated users redirected to login
- [ ] **Session persistence**: Hard refresh keeps you logged in
- [ ] **Role switching**: Admin-players can switch between admin/player views

#### Navigation Tests
- [ ] **Active states**: Current page highlighted in nav
- [ ] **Secondary tabs**: Table and Records subtabs appear correctly
- [ ] **Breadcrumbs**: Any breadcrumb components show correct paths
- [ ] **Back/forward**: Browser back button works

#### Link Tests
- [ ] **Player profile links**: Clicking player names from leaderboards goes to correct profile
- [ ] **Internal navigation**: All Link components updated
- [ ] **Router pushes**: Any programmatic navigation works

---

### Phase 9: Deployment Strategy

#### Step 9.1: Pre-Deployment
1. **Create feature branch**: `git checkout -b feature/player-route-cleanup`
2. **Make all changes** following phases 1-6
3. **Test locally**: Run `npm run dev` and verify all routes work
4. **Check for broken links**: Use browser console, check for 404s
5. **Test authentication**: Clear cookies, test login flow, verify logout button

#### Step 9.2: Deployment
1. **Commit changes**: 
   ```bash
   git add .
   git commit -m "feat: Move player pages to /player/* for consistent route structure"
   ```
2. **Push to branch**: `git push origin feature/player-route-cleanup`
3. **Create PR**: Review changes in GitHub
4. **Deploy to preview**: Vercel auto-creates preview deployment
5. **Test preview thoroughly**: Use preview URL to test all functionality
6. **Merge to main**: After testing passes

#### Step 9.3: Post-Deployment
1. **Clear browser cache**: All users should clear localStorage and cookies
2. **Announce change**: If you have active users, notify them to re-login
3. **Monitor errors**: Check Vercel logs for 404s or auth issues
4. **Update any bookmarks**: Internal team bookmarks to player pages

---

### Phase 10: Rollback Plan

#### If Issues Arise
1. **Quick rollback**: Revert git commit and redeploy
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Vercel instant rollback**: In Vercel dashboard → Deployments → Previous deployment → "Promote to Production"

3. **Manual fixes**: If only specific routes broken, can create redirects in `next.config.mjs`:
   ```javascript
   async redirects() {
     return [
       {
         source: '/player/:path*',
         destination: '/:path*',
         permanent: false
       }
     ]
   }
   ```

---

## Detailed File-by-File Changes

### Critical Files Requiring Manual Inspection

#### 1. Navigation Components (High Priority)
- `src/contexts/NavigationContext.tsx` - URL detection logic
- `src/components/navigation/BottomNavigation.component.tsx` - Bottom nav hrefs
- `src/components/navigation/DesktopSidebar.component.tsx` - Sidebar hrefs
- `src/components/navigation/NavigationSubTabs.component.tsx` - Secondary tab hrefs

#### 2. Layout Components (High Priority)
- `src/components/layout/ProfileDropdown.component.tsx` - View switching
- `src/components/layout/MobileHeader.component.tsx` - View switching
- `src/components/navigation/SuperadminHeader.component.tsx` - Player view redirect

#### 3. Dashboard Components (Medium Priority)
**Pattern**: Find any `<Link href="/players/${id}">` and update

Likely affected:
- `src/components/dashboard/PersonalBests.component.tsx`
- `src/components/dashboard/Milestones.component.tsx`
- `src/components/dashboard/MatchReport.component.tsx`

#### 4. Table Components (Medium Priority)
- `src/components/tables/CurrentHalfSeason.component.tsx` - Player profile links
- `src/components/tables/OverallSeasonPerformance.component.tsx` - Player profile links
- `src/components/tables/SeasonRaceGraph.component.tsx` - Player profile links

#### 5. Records Components (Medium Priority)
- `src/components/records/LeaderboardStats.component.tsx` - Player profile links
- `src/components/records/Legends.component.tsx` - Player profile links
- `src/components/records/Feats.component.tsx` - Player profile links

---

## Grep Commands for Finding All References

Use these to find every file that needs updating:

```bash
# Find all player profile links
grep -r "href=\"/players/" src/ --include="*.tsx" --include="*.ts"

# Find all root dashboard links
grep -r "href=\"/\"" src/ --include="*.tsx" --include="*.ts" | grep -v "href=\"/admin\|href=\"/superadmin\|href=\"/api"

# Find all upcoming links
grep -r "href=\"/upcoming" src/ --include="*.tsx" --include="*.ts"

# Find all table links
grep -r "href=\"/table" src/ --include="*.tsx" --include="*.ts"

# Find all records links
grep -r "href=\"/records" src/ --include="*.tsx" --include="*.ts"

# Find programmatic navigation
grep -r "router\.push\|window\.location\.href" src/ --include="*.tsx" --include="*.ts" | grep -v "/admin\|/superadmin"

# Find redirect() calls in API routes
grep -r "redirect\(" src/app/api/ --include="*.ts"
```

---

## Verification Script

Create a test script to verify all routes work:

```typescript
// scripts/verify-routes.ts
const PLAYER_ROUTES = [
  '/player',
  '/player/upcoming',
  '/player/table',
  '/player/table/half',
  '/player/table/whole',
  '/player/table/graph',
  '/player/records',
  '/player/records/leaderboard',
  '/player/records/legends',
  '/player/records/feats',
  '/player/profiles/1', // Test with actual player ID
];

async function verifyRoutes() {
  for (const route of PLAYER_ROUTES) {
    const response = await fetch(`https://caposport.com${route}`);
    console.log(`${route}: ${response.status} ${response.status === 200 || response.status === 302 ? '✅' : '❌'}`);
  }
}

verifyRoutes();
```

---

## Summary of Changes

### Files to Move (17 files)
- 1 root dashboard page
- 2 upcoming files (page + layout)
- 5 table files (page, layout, 3 subpages)
- 5 records files (page, layout, 3 subpages)
- 2 player profile files (page + layout)
- 1 root redirect (new)
- 1 table graph page

### Files to Update (Estimated 15-25 files)
- 5 navigation components (context + 4 nav components)
- 3 layout components (headers, dropdowns)
- ~10-15 display components (dashboard, tables, records with player links)
- 1 middleware file
- Potentially 2-5 API routes (if they redirect to player pages)

### External Configs to Check (Likely NO changes)
- ✅ Vercel: Auto-routes based on files
- ⚠️ Supabase: Check redirect URLs (unlikely to need changes)
- ✅ Render: Worker doesn't reference player routes
- ✅ Capacitor: Deep links only for `/join/*`

---

## Risk Assessment

### Low Risk
- File moves (Next.js handles automatically)
- Navigation link updates (compile-time checked by TypeScript)
- Middleware matcher (simple pattern change)

### Medium Risk
- Finding all hardcoded hrefs (use grep to be thorough)
- Player profile links scattered across components
- Programmatic navigation (`router.push`, `location.href`)

### High Risk (Mitigation)
- **User confusion if bookmarks break**: Add temporary redirects in `next.config.mjs`
- **SEO impact if pages were indexed**: Add 301 redirects (unlikely - auth required)
- **Missing a component**: Thorough grep + manual testing

---

## Time Estimates

- **Phase 1** (File moves): 10 minutes
- **Phase 2** (Navigation config): 10 minutes  
- **Phase 3** (Component links): 20 minutes
- **Phase 4** (Middleware): 2 minutes
- **Phase 5** (API routes): 5 minutes
- **Testing**: 15 minutes
- **Total**: 60 minutes

---

## Success Criteria

✅ All player pages accessible at `/player/*`  
✅ Root `/` redirects to `/player`  
✅ Middleware protects all player routes  
✅ Logout button visible when authenticated  
✅ Navigation works on mobile and desktop  
✅ Player profile links work  
✅ No 404 errors in browser console  
✅ Authentication flow works end-to-end  

---

## Notes

- This is a **pure refactoring** - no feature changes
- All existing functionality preserved
- URL structure becomes consistent with admin/superadmin
- Makes future auth work easier (all protected routes follow same pattern)
- Fixes the immediate issue (logout button) as a side effect

**Recommendation**: Execute this refactoring BEFORE implementing RSVP features - cleaner foundation.
