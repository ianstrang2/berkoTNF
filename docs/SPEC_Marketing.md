# Marketing & Analytics Specification

**Version:** 1.0.0  
**Last Updated:** January 8, 2025  
**Status:** ✅ Active

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

**Note:** This is a simple first-touch attribution model suitable for small-scale marketing. For advanced analytics, consider integrating with PostHog or Mixpanel.

