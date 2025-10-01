# Layout Persistence Optimization

**Created**: October 1, 2025  
**Priority**: Medium (UX improvement, not critical)  
**Estimated Time**: 15-20 minutes  

---

## Problem

Currently, navigating between pages causes the sidebar to **flash white** briefly. This happens because each page wraps itself in `<MainLayout>`, causing the entire layout to unmount and remount on every navigation.

**Example**: 
- Navigate from `/admin/matches` to `/admin/players`
- `MainLayout` unmounts (sidebar disappears)
- New page loads
- `MainLayout` remounts (sidebar reappears)
- Brief white flash visible

---

## Root Cause

**Current Structure** (each page):
```tsx
// src/app/admin/matches/page.tsx
import MainLayout from '@/components/layout/MainLayout.layout';

export default function MatchesPage() {
  return (
    <MainLayout>
      {/* Page content */}
    </MainLayout>
  );
}
```

**Issue**: Each page creates its own `MainLayout` instance. On navigation, the old layout is destroyed and a new one is created.

---

## Solution: Persistent Layouts with App Router

Use Next.js App Router's `layout.tsx` pattern to make layouts **persistent across navigation**.

### Step 1: Create Layout Files

**`src/app/admin/layout.tsx`**:
```tsx
import MainLayout from '@/components/layout/MainLayout.layout';
import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
```

**`src/app/superadmin/layout.tsx`**:
```tsx
import MainLayout from '@/components/layout/MainLayout.layout';
import { ReactNode } from 'react';

export default function SuperadminLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
```

**`src/app/(player)/layout.tsx`** (for player routes):
```tsx
import MainLayout from '@/components/layout/MainLayout.layout';
import { ReactNode } from 'react';

export default function PlayerLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
```

Note: If using route groups `(player)`, you'll need to move player pages into `/app/(player)/dashboard`, `/app/(player)/upcoming`, etc.

### Step 2: Remove MainLayout from Individual Pages

**Before**:
```tsx
// src/app/admin/matches/page.tsx
import MainLayout from '@/components/layout/MainLayout.layout';

export default function MatchesPage() {
  return (
    <MainLayout>
      <MatchListPageContent />
    </MainLayout>
  );
}
```

**After**:
```tsx
// src/app/admin/matches/page.tsx
export default function MatchesPage() {
  return <MatchListPageContent />;
}
```

### Step 3: Update All Affected Pages

**Admin Pages** (remove `<MainLayout>` wrapper):
- `/app/admin/page.tsx`
- `/app/admin/matches/page.tsx`
- `/app/admin/matches/[id]/page.tsx`
- `/app/admin/players/page.tsx`
- `/app/admin/players/add-edit/page.tsx`
- `/app/admin/seasons/page.tsx`
- `/app/admin/setup/page.tsx`
- `/app/admin/info/page.tsx` (if still keeping this)

**Superadmin Pages** (remove `<MainLayout>` wrapper):
- `/app/superadmin/tenants/page.tsx`
- `/app/superadmin/info/page.tsx`

**Player Pages** (find and update):
- All pages under `/app/dashboard`, `/app/upcoming`, `/app/table`, `/app/records`, `/app/stats`

---

## Expected Behavior After Fix

**Before**:
- Navigate between pages → sidebar flashes white → content loads
- Slower perceived performance
- Layout remounts on every navigation

**After**:
- Navigate between pages → sidebar stays stable → content smoothly transitions
- Faster perceived performance
- Layout persists, only page content changes

---

## Additional Optimizations (Optional)

### 1. Preload Navigation Links
In the sidebar, preload links on hover:
```tsx
<Link href="/admin/matches" prefetch={true}>
  Matches
</Link>
```

### 2. Loading States
Add loading UI for page transitions:
```tsx
// src/app/admin/loading.tsx
export default function AdminLoading() {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent" />
    </div>
  );
}
```

---

## Testing Checklist

After implementing:
- [ ] Navigate between admin pages - sidebar stays stable
- [ ] Navigate between superadmin pages - sidebar stays stable
- [ ] Navigate between player pages - sidebar stays stable
- [ ] No white flashing
- [ ] Smooth page transitions
- [ ] All pages still render correctly

---

## Files to Modify

**Create** (3 new files):
- `src/app/admin/layout.tsx`
- `src/app/superadmin/layout.tsx`
- `src/app/(player)/layout.tsx` (or individual player route layouts)

**Modify** (~15-20 pages):
- Remove `<MainLayout>` wrapper from all page components
- Remove `MainLayout` import from those pages

---

## Notes

- This is a **Next.js App Router best practice** (layouts persist across navigation)
- **Not auth-specific** - this optimization applies regardless of auth system
- Should have been done from the start, but easy to fix now
- **Low risk** - if done incorrectly, pages just won't render (easy to debug)

---

## When to Do This

**Recommended**: After Phase 1 testing is complete and before moving to Capacitor setup. This ensures the web UI is polished before adding mobile complexity.

**Estimated Time**: 15-20 minutes

**Priority**: Medium (UX improvement, not blocking)

