# Mobile Navigation Fix - December 2025

**Issue:** Internal navigation opening Safari/Chrome instead of staying in iOS/Android webview  
**Root Cause:** Using `window.location` and `<a href>` for internal navigation  
**Fix:** Use `router.push()` for all internal navigation  
**Status:** ✅ Fixed (Dec 4, 2025)

---

## The Problem

When users tapped internal links in the iOS/Android app:
- Role switching (Admin ↔ Player) opened Safari
- Settings link opened Safari
- Login redirects opened Safari
- Any `<a href="/internal">` or `window.location.href = '/internal'` triggered external browser

**User Impact:**
- Broken app experience
- Confusion ("Why am I in Safari?")
- Lost context/state

---

## Root Cause

**iOS/Android webview behavior:** 
- `window.location.*` = "Navigate to new page" = Opens default browser
- `<a href>` without `target` = Same as above
- `router.push()` = "Update route in SPA" = Stays in webview ✅

**Why we had this:**
- Code written for web-first (where all patterns work)
- Mixed patterns across codebase
- No mobile-specific navigation guidelines

---

## Files Fixed (9 total)

| File | Lines Changed | Issue |
|------|---------------|-------|
| `MobileHeader.component.tsx` | 4 instances | `<a href>` → `router.push()` |
| `ProfileDropdown.component.tsx` | 1 instance | `window.location.replace()` → `router.push()` |
| `SuperadminHeader.component.tsx` | 5 instances | `window.location.href` → `router.push()` |
| `auth/login/page.tsx` | 3 instances | `window.location.href` → `router.push()` |
| `auth/superadmin-login/page.tsx` | 1 instance | `window.location.href` → `router.push()` |
| `signup/admin/page.tsx` | 1 instance | `window.location.href` → `router.push()` |

**Additional Fix:**
- Settings link now only shows in player view (was showing in admin view)

---

## The Pattern

### ❌ WRONG (Opens External Browser)

```typescript
// These ALL open Safari/Chrome on mobile:
window.location.href = '/admin/matches';
window.location.replace('/player/dashboard');
<a href="/admin/matches">Admin</a>
<Link href="/admin/matches">Admin</Link> // If not using Next.js Link properly
```

### ✅ CORRECT (Stays in App)

```typescript
import { useRouter } from 'next/navigation';

const router = useRouter();

// Internal navigation - stays in webview
router.push('/admin/matches');
router.push('/player/dashboard');

// For buttons/links
<button onClick={() => router.push('/admin/matches')}>Admin</button>
```

### ✅ EXCEPTIONS (When `window.location` is OK)

```typescript
// Logout - full reload after clearing auth
window.location.href = '/';

// External links
<a href="https://twitter.com" target="_blank">Twitter</a>
<a href="https://play.google.com/store/apps/...">Download</a>

// Deep links
window.location.href = 'capo://dashboard';
```

---

## Documentation Updated

1. **`.cursor/rules/code-generation.mdc`** - Added "Mobile Navigation Pattern" section
2. **`docs/README.md`** - Added navigation to "Key Mobile Patterns"
3. **`docs/SPEC_RSVP.md`** - Fixed example code (push notifications)

---

## How to Avoid This in Future

### For New Code

**Always use `router.push()` for internal navigation:**

```typescript
// ✅ Component pattern
import { useRouter } from 'next/navigation';

export function MyComponent() {
  const router = useRouter();
  
  return (
    <button onClick={() => router.push('/somewhere')}>
      Go Somewhere
    </button>
  );
}
```

**Never use:**
- `window.location.*` for internal routes
- `<a href="/internal">` for internal routes
- Hard reloads unless absolutely necessary (logout, etc.)

### Code Review Checklist

- [ ] All internal navigation uses `router.push()`
- [ ] No `window.location` except for logout/external links
- [ ] No `<a href>` for internal routes
- [ ] Test on iOS simulator/device before merging

---

## Testing

**Before fix:**
1. Open iOS app
2. Tap "View as Player" → Opens Safari ❌
3. Tap "Settings" → Opens Safari ❌

**After fix:**
1. Open iOS app
2. Tap "View as Player" → Stays in app ✅
3. Tap "Settings" (in player view only) → Stays in app ✅
4. Login → Redirects to dashboard in app ✅

---

## Related Issues

This fix also revealed:
- Settings link was showing in admin view (now player-only)
- Inconsistent navigation patterns across components
- Need for mobile-specific coding guidelines

---

**Last Updated:** December 4, 2025  
**Next Review:** When adding new navigation features

