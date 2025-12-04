# Marketing & Analytics Specification

**Version:** 1.1.0  
**Last Updated:** December 4, 2025  
**Status:** ✅ Active

---

## Domain Architecture (CRITICAL)

**Marketing and App are on SEPARATE domains for auth cookie isolation.**

### Domain Split

| Domain | Purpose | Auth State | Pages |
|--------|---------|------------|-------|
| `caposport.com` | Marketing | **None** - "dumb" pages | `/`, `/privacy` |
| `app.caposport.com` | Main App | **Full auth** - cookies here | `/admin/*`, `/player/*`, `/auth/*`, `/join/*`, etc. |

### Why Two Domains?

**Auth cookies are domain-specific.** If a user logs in at `app.caposport.com`, their session cookie is only valid there. Marketing pages at `caposport.com` cannot see that cookie.

**Benefits:**
- Clear separation of concerns
- Marketing pages load fast (no auth checks)
- Mobile apps always use `app.caposport.com` (consistent)
- No session confusion when switching between domains

### Implementation

**Marketing pages are "dumb":**
- NO `useAuthContext()` or Supabase auth checks
- All login/app links point to `https://app.caposport.com/...`
- Button labels: "Open App" (not "Login" - user might already be logged in)

**App pages are "smart":**
- Full auth checking via `useAuthContext()` or middleware
- If logged in → show dashboard
- If not logged in → show login form

### Redirects (next.config.mjs)

App routes accessed from root domain are automatically redirected:

```
caposport.com/admin/*     → app.caposport.com/admin/*
caposport.com/player/*    → app.caposport.com/player/*
caposport.com/auth/*      → app.caposport.com/auth/*
caposport.com/join/*      → app.caposport.com/join/*
caposport.com/signup/*    → app.caposport.com/signup/*
caposport.com/api/*       → app.caposport.com/api/*
```

### Supabase Configuration Required

**Dashboard → Authentication → URL Configuration:**
- **Site URL:** `https://app.caposport.com`
- **Redirect URLs:** `https://app.caposport.com/**`

---

## Mobile-Safe Layout Pattern (MANDATORY)

**All marketing pages MUST respect iOS notch/Android status bar.**

### Implementation

**Navigation Component:**
```tsx
<nav className="fixed top-0 left-0 right-0 z-50 pt-safe ...">
  {/* Navigation content */}
</nav>
```

**Hero/First Section:**
```tsx
<section className="relative min-h-screen pt-safe ...">
  {/* Content */}
</section>
```

**Content Pages (Privacy, Terms, etc.):**
```tsx
<div className="px-4 py-16" style={{ paddingTop: 'calc(var(--safe-top, 0px) + 80px)' }}>
  {/* Page content */}
</div>
```

**CSS Classes Available (globals.css):**
- `.pt-safe` - Padding top (iOS notch height, Android 24px, Web 0px)
- `.pb-safe` - Padding bottom (iOS home indicator)

**How it works:**
- **iOS:** Adds ~47px-59px (Dynamic Island)
  - *Note: Uses `max(env(), 50px)` fallback if env() returns 0px*
- **Android:** Adds 24px for status bar  
- **Web:** Adds 0px (no notch)
- **Automatic** - no platform detection needed!

---

## Plausible Analytics Integration

**ONLY track public marketing pages, NOT the authenticated app.**

### Pages to Track

**Marketing pages** (track with Plausible):
- `/` - Homepage/landing page
- Future: `/pricing`, `/about`, `/contact`, etc.

**Authenticated app** (do NOT track):
- `/admin/*` - Admin dashboard
- `/player/*` - Player dashboard
- `/superadmin/*` - Superadmin panel
- `/auth/*` - Authentication pages
- `/signup/*` - Signup flow (post-conversion)

### Implementation

```tsx
import PlausibleScript from '@/components/analytics/PlausibleScript.component';

export default function MarketingPage() {
  return (
    <div>
      <PlausibleScript />
      {/* rest of page */}
    </div>
  );
}
```

**Component:** `src/components/analytics/PlausibleScript.component.tsx`
- Automatically checks pathname
- Only loads on marketing pages
- No cookies, privacy-friendly by design

---

## Attribution Tracking

**Capture first-touch attribution for new admin signups.**

### What We Track

- `referrer` - Where visitor came from (e.g., "https://twitter.com" or "direct")
- `utm_source` - Marketing source (e.g., "twitter", "facebook")
- `utm_medium` - Marketing medium (e.g., "social", "cpc")
- `utm_campaign` - Campaign name (e.g., "launch-week")
- `landing_page` - First page visited (e.g., "/")
- `first_visit` - Timestamp of first visit

### Implementation

**1. Marketing Page Capture:**
```tsx
import { useAttribution } from '@/hooks/useAttribution.hook';

export default function MarketingPage() {
  useAttribution(); // Captures on first visit
  return <div>...</div>;
}
```

- Automatically captures attribution on first visit
- Stores in `localStorage` (key: `capo_attribution`)
- First-touch model: won't overwrite existing attribution

**2. Signup Persistence:**
- Read attribution from localStorage during admin signup
- Send to `/api/admin/create-club` endpoint
- Stored in `tenants.settings` JSON field as `{ attribution: {...} }`
- Clear localStorage after successful signup (prevents stale data)

### Files

- `src/lib/attribution.ts` - Core attribution utilities
- `src/hooks/useAttribution.hook.ts` - React hook for capturing attribution
- `src/components/analytics/PlausibleScript.component.tsx` - Plausible script loader

### Querying Attribution Data

```sql
SELECT 
  name,
  settings->>'attribution' as attribution_data
FROM tenants
WHERE settings->>'attribution' IS NOT NULL;
```

---

## SEO Target Keywords

**Primary SEO phrases Capo aims to rank for:**

These should be used naturally across meta tags, headings, and supporting technical SEO content.

**Target Keywords:**
- 5-a-side football app
- 5-a-side organiser app
- football team management app
- football team organiser app
- app to organise casual football
- casual football app
- football stats app for casual players
- 5-a-side stats tracker
- football team picker app
- collect football match payments

**Current Implementation:**
- Meta keywords: `src/app/layout.tsx` (line 24)
- Page title: "Capo — The 5-a-side football app for organising casual football"
- Meta description: "Capo is the 5-a-side football app that organises your casual football game..."
- App Store keywords: See `TESTFLIGHT_FAQ.md` for app store submission copy

---

**Note:** This is a simple first-touch attribution model suitable for small-scale marketing. For advanced analytics, consider integrating with PostHog or Mixpanel.

