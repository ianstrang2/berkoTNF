# Mobile API Integration Guide

**Purpose:** Update API calls to work in mobile production builds  
**Status:** Optional (only needed for `npm run ios:build` / `android:build`)  
**Estimated Time:** 2-4 hours

---

## 🎯 Quick Start

### The Problem

Mobile **production builds** bundle static UI but call remote APIs:

- ❌ `fetch('/api/players')` → Fails (no embedded API in mobile app)
- ✅ `apiFetch('/players')` → Works (calls `https://app.caposport.com/api/players`)

### The Solution

```typescript
// Before (works in web and dev mode only)
const response = await fetch('/api/players');

// After (works everywhere - web, mobile dev, mobile prod)
import { apiFetch } from '@/lib/apiConfig';
const response = await apiFetch('/players');
```

**When to migrate:** Before production mobile builds. Dev mode (`npm run ios:dev`) works without this!

---

## 📚 API Reference

### `apiFetch(path, options?)`

Drop-in replacement for `fetch()` with automatic mobile configuration.

```typescript
import { apiFetch } from '@/lib/apiConfig';

// GET request
const response = await apiFetch('/players');
const data = await response.json();

// POST request
const response = await apiFetch('/admin/players', {
  method: 'POST',
  body: JSON.stringify({ name: 'John Doe' })
});

// DELETE request
const response = await apiFetch(`/admin/matches/${id}`, {
  method: 'DELETE'
});
```

**Auto-configuration:**
- ✅ Adds `Content-Type: application/json` header
- ✅ Adds `credentials: 'include'` in mobile (for cookies)
- ✅ Prepends correct API base URL for environment

---

### `getApiUrl(path)`

Get the full API URL for a given path (useful for manual fetch).

```typescript
import { getApiUrl } from '@/lib/apiConfig';

const url = getApiUrl('/players');
// Returns:
// - Mobile: 'https://app.caposport.com/api/players'
// - Web: '/api/players'
```

---

### `isNativeApp()`

Check if running in Capacitor mobile app.

```typescript
import { isNativeApp } from '@/lib/apiConfig';

if (isNativeApp()) {
  console.log('Running in iOS/Android app');
} else {
  console.log('Running in browser');
}
```

---

### `getPlatform()`

Get current platform identifier.

```typescript
import { getPlatform } from '@/lib/apiConfig';

const platform = getPlatform();
// Returns: 'ios' | 'android' | 'web'

if (platform === 'ios') {
  // iOS-specific behavior
}
```

---

## 🔄 Migration Patterns

### Pattern 1: React Query Hooks

**Before:**
```typescript
// src/hooks/queries/usePlayers.hook.ts
import { useQuery } from '@tanstack/react-query';

async function fetchPlayers(tenantId: string | null) {
  const response = await fetch('/api/players', { 
    credentials: 'include' 
  });
  
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const result = await response.json();
  return result.data || [];
}

export function usePlayers() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['players', profile.tenantId],
    queryFn: () => fetchPlayers(profile.tenantId),
  });
}
```

**After:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiConfig'; // ✅ Add this

async function fetchPlayers(tenantId: string | null) {
  const response = await apiFetch('/players'); // ✅ Use apiFetch, remove /api prefix
  
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const result = await response.json();
  return result.data || [];
}

export function usePlayers() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['players', profile.tenantId],
    queryFn: () => fetchPlayers(profile.tenantId),
  });
}
```

**Changes:**
1. ✅ Import `apiFetch` from `@/lib/apiConfig`
2. ✅ Change `fetch('/api/players', ...)` to `apiFetch('/players')`
3. ✅ Remove `credentials: 'include'` (handled automatically)

---

### Pattern 2: Form Submissions

**Before:**
```typescript
const handleSubmit = async (data: PlayerFormData) => {
  const response = await fetch('/api/admin/players', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to create player');
  return response.json();
};
```

**After:**
```typescript
import { apiFetch } from '@/lib/apiConfig'; // ✅ Add import

const handleSubmit = async (data: PlayerFormData) => {
  const response = await apiFetch('/admin/players', { // ✅ Use apiFetch
    method: 'POST',
    body: JSON.stringify(data),
    // ✅ Content-Type and credentials handled automatically
  });

  if (!response.ok) throw new Error('Failed to create player');
  return response.json();
};
```

---

### Pattern 3: Mutation Hooks

**Before:**
```typescript
import { useMutation } from '@tanstack/react-query';

export function useDeleteMatch() {
  return useMutation({
    mutationFn: async (matchId: number) => {
      const response = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to delete match');
      return response.json();
    },
  });
}
```

**After:**
```typescript
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiConfig'; // ✅ Add import

export function useDeleteMatch() {
  return useMutation({
    mutationFn: async (matchId: number) => {
      const response = await apiFetch(`/admin/matches/${matchId}`, { // ✅ Use apiFetch
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete match');
      return response.json();
    },
  });
}
```

---

### Pattern 4: Service Classes

**Before:**
```typescript
// src/services/MatchService.ts
export class MatchService {
  static async complete(matchId: number, data: CompleteMatchData) {
    const response = await fetch(
      `/api/admin/upcoming-matches/${matchId}/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to complete match');
    }

    return response.json();
  }
}
```

**After:**
```typescript
import { apiFetch } from '@/lib/apiConfig'; // ✅ Add import

export class MatchService {
  static async complete(matchId: number, data: CompleteMatchData) {
    const response = await apiFetch( // ✅ Use apiFetch
      `/admin/upcoming-matches/${matchId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to complete match');
    }

    return response.json();
  }
}
```

---

### Pattern 5: Platform-Specific Features

**Hide download banner in native app:**
```typescript
import { isNativeApp } from '@/lib/apiConfig';

export function AppDownloadBanner() {
  // Don't show banner if already in mobile app
  if (isNativeApp()) {
    return null;
  }

  return (
    <div className="banner">
      <p>Get the mobile app for the best experience!</p>
      <button>Download for iOS</button>
      <button>Download for Android</button>
    </div>
  );
}
```

**Use native share on mobile:**
```typescript
import { getPlatform } from '@/lib/apiConfig';
import { Share } from '@capacitor/share';

export function ShareButton({ url, text }: ShareButtonProps) {
  const platform = getPlatform();

  const handleShare = async () => {
    if (platform === 'ios' || platform === 'android') {
      // Use native share
      await Share.share({ title: 'Capo', text, url });
    } else {
      // Use Web Share API or copy to clipboard
      if (navigator.share) {
        await navigator.share({ title: 'Capo', text, url });
      } else {
        navigator.clipboard.writeText(url);
        alert('Link copied!');
      }
    }
  };

  return <button onClick={handleShare}>Share</button>;
}
```

---

## 🔍 Finding Code to Update

### Search Commands

```bash
# Find all fetch() calls to /api/*
grep -r "fetch('/api" src/ --include="*.ts" --include="*.tsx"

# Find all fetch() calls with /api in template strings
grep -r 'fetch(`/api' src/ --include="*.ts" --include="*.tsx"

# Count total files to update
grep -r "fetch('/api\|fetch(\`/api" src/ --include="*.ts" --include="*.tsx" -l | wc -l
```

### Files Likely to Need Updates

**High Priority:**
- `src/hooks/queries/*.ts` - All React Query hooks
- `src/hooks/mutations/*.ts` - All mutation hooks  
- `src/services/*.ts` - Service layer functions
- `src/hooks/useAuth.hook.ts` - Authentication calls

**Medium Priority:**
- `src/components/admin/**/*.tsx` - Admin components
- `src/components/forms/**/*.tsx` - Form handlers
- `src/components/dashboard/**/*.tsx` - Dashboard widgets

**Low Priority:**
- `src/app/**/page.tsx` - Server components (if any client-side fetches)

---

## ⚠️ Important Notes

### 1. Path Format

```typescript
// ✅ Correct - all work:
apiFetch('/players')        // Leading slash
apiFetch('players')         // No leading slash
apiFetch('/admin/players')  // Nested paths

// ❌ Wrong - don't include /api prefix:
apiFetch('/api/players')    // Prefix added automatically!
```

### 2. CORS Configuration (Production Only)

Your production API must allow `capacitor://localhost` origin:

```typescript
// In your Next.js middleware
const allowedOrigins = [
  'capacitor://localhost',        // iOS/Android mobile app
  'ionic://localhost',            // Alternative Capacitor origin
  'https://app.caposport.com',   // Production web
  'http://localhost:3000'        // Development
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const response = NextResponse.next();
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  return response;
}
```

### 3. Cookie Configuration (Production Only)

Cookies must have `SameSite=None; Secure` for cross-origin auth:

```typescript
// In your auth API routes
res.setHeader('Set-Cookie', [
  `session=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800`
]);
```

**Note:** Supabase handles this automatically if configured correctly.

---

## ✅ Testing Checklist

### Local Development
- [ ] `npm run dev` - Web app works
- [ ] `npm run ios:dev` - iOS simulator with live reload works
- [ ] `npm run android:dev` - Android emulator with live reload works
- [ ] API calls succeed in all environments

### Production Build
- [ ] Deploy API to production (Vercel)
- [ ] Configure CORS for `capacitor://localhost`
- [ ] Run `npm run ios:build` on Mac
- [ ] Test iOS simulator with production build
- [ ] Verify API calls hit production server (check Network tab)
- [ ] Test authentication flow end-to-end

### Device Testing
- [ ] Install on physical iOS device
- [ ] Install on physical Android device
- [ ] Test offline behavior (UI should work, API calls fail gracefully)

---

## 🚀 Migration Workflow

### 1. Find All API Calls
```bash
grep -r "fetch('/api" src/ --include="*.ts" --include="*.tsx" -l > api-migration-list.txt
cat api-migration-list.txt
```

### 2. Update Files One by One
- Open each file
- Add `import { apiFetch } from '@/lib/apiConfig';`
- Replace `fetch('/api/...', ...)` with `apiFetch('/...', ...)`
- Remove `credentials: 'include'` and `Content-Type` header if present
- Test locally

### 3. Test Locally
```bash
npm run dev          # Test web
npm run ios:dev      # Test iOS (Mac)
npm run android:dev  # Test Android (PC/Mac)
```

### 4. Deploy API
```bash
git push origin main  # Vercel auto-deploys
```

### 5. Build Mobile Apps
```bash
# iOS (on Mac)
npm run ios:build

# Android (on PC/Mac)
npm run android:build
```

---

## 🆘 Troubleshooting

### "Failed to fetch" errors in mobile

**Cause:** Production API not deployed or CORS not configured

**Fix:**
1. Ensure API deployed at `https://app.caposport.com`
2. Add CORS headers for `capacitor://localhost`
3. Check browser console for specific error

---

### "Unauthorized" or auth errors

**Cause:** Cookies not working cross-origin

**Fix:**
1. Ensure cookies have `SameSite=None; Secure`
2. Check `credentials: 'include'` is used (automatic with `apiFetch()`)
3. Verify CORS allows credentials

---

### Works in dev, fails in production build

**Cause:** Production build calls remote API, dev uses local

**Debug:**
```typescript
import { getApiBaseUrl, getPlatform } from '@/lib/apiConfig';

console.log('Platform:', getPlatform());
console.log('API Base:', getApiBaseUrl());
// Verify correct URL is being used
```

---

## 📊 Progress Tracking

**Total API routes:** ~80+ routes in `src/app/api/`  
**Migration status:** ⏳ Not started  
**Priority:** High (required for mobile production builds)  
**Estimated effort:** 2-4 hours (mostly find-and-replace)

---

## 📚 Resources

- **Capacitor HTTP Plugin:** https://capacitorjs.com/docs/apis/http
- **Fetch API:** https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- **CORS Guide:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

**Questions?** Check `docs/CAPACITOR_BUILD_WORKFLOW.md` for overall architecture or `docs/IOS_SETUP_CHECKLIST.md` for iOS-specific setup.

