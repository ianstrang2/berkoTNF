# Mobile API Call Migration Guide

**Purpose:** Update your codebase to use `apiConfig.ts` helper for mobile compatibility

**Why:** Mobile production builds call remote API (`https://app.caposport.com`), not embedded routes

---

## 🎯 Quick Start

### Before (won't work in mobile production)
```typescript
const response = await fetch('/api/players');
```

### After (works everywhere)
```typescript
import { apiFetch } from '@/lib/apiConfig';

const response = await apiFetch('/players');
```

---

## 📚 API Reference

### `apiFetch(path, options?)`

Drop-in replacement for `fetch()` that automatically uses correct API URL.

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

// With credentials (automatic in mobile)
const response = await apiFetch('/auth/profile');
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
// - Dev: 'http://localhost:3000/api/players'

const response = await fetch(url, { 
  credentials: 'include' 
});
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

### Pattern 1: Simple fetch() calls

**Before:**
```typescript
const response = await fetch('/api/players');
```

**After:**
```typescript
import { apiFetch } from '@/lib/apiConfig';

const response = await apiFetch('/players');
```

---

### Pattern 2: fetch() with options

**Before:**
```typescript
const response = await fetch('/api/admin/players', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

**After:**
```typescript
import { apiFetch } from '@/lib/apiConfig';

const response = await apiFetch('/admin/players', {
  method: 'POST',
  body: JSON.stringify(data)
  // Content-Type header added automatically
});
```

---

### Pattern 3: React Query hooks

**Before:**
```typescript
export function usePlayers() {
  return useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const response = await fetch('/api/players');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });
}
```

**After:**
```typescript
import { apiFetch } from '@/lib/apiConfig';

export function usePlayers() {
  return useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const response = await apiFetch('/players');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });
}
```

---

### Pattern 4: Service functions

**Before:**
```typescript
// src/services/PlayerService.ts
export class PlayerService {
  static async getAll() {
    const response = await fetch('/api/players');
    return response.json();
  }
}
```

**After:**
```typescript
import { apiFetch } from '@/lib/apiConfig';

export class PlayerService {
  static async getAll() {
    const response = await apiFetch('/players');
    return response.json();
  }
}
```

---

## 🔍 Finding Code to Update

### Search for patterns to update:

```bash
# Find all fetch() calls to /api/*
grep -r "fetch('/api" src/

# Find all fetch() calls with /api in template strings
grep -r 'fetch(`/api' src/

# Find all fetch() calls (review manually)
grep -r "fetch(" src/ | grep -v "apiFetch"
```

---

## ⚠️ Important Notes

### 1. Path format

```typescript
// ✅ All of these work:
apiFetch('/players')      // Leading slash
apiFetch('players')       // No leading slash
apiFetch('/admin/players') // Nested paths

// ❌ Don't include /api prefix:
apiFetch('/api/players')  // Wrong! Prefix added automatically
```

---

### 2. Credentials/cookies

Mobile apps need `credentials: 'include'` for cookies. This is handled automatically by `apiFetch()`.

```typescript
// ✅ Automatic (recommended)
const response = await apiFetch('/auth/profile');

// ✅ Manual (if you need custom fetch)
const response = await fetch(getApiUrl('/auth/profile'), {
  credentials: Capacitor.isNativePlatform() ? 'include' : 'same-origin'
});
```

---

### 3. CORS configuration

Your production API server must allow `capacitor://localhost` origin:

```typescript
// In your Vercel/Next.js middleware or API routes
const allowedOrigins = [
  'capacitor://localhost',           // iOS/Android mobile app
  'ionic://localhost',               // Alternative Capacitor origin
  'https://app.caposport.com',      // Production web
  'http://localhost:3000'           // Development
];

// Example middleware
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

---

### 4. Cookie configuration

For cross-origin auth to work, cookies must have `SameSite=None; Secure`:

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
- [ ] Test poor network conditions

---

## 🚀 Deployment Workflow

### 1. Update Code
```bash
# Find and update all fetch() calls
grep -r "fetch('/api" src/ --include="*.ts" --include="*.tsx"
# Replace with apiFetch() as shown above
```

### 2. Test Locally
```bash
# Start dev server
npm run dev

# Test in mobile simulators
npm run ios:dev     # Mac
npm run android:dev # PC/Mac
```

### 3. Deploy API
```bash
# Deploy to Vercel (or your hosting provider)
git push origin main
# Vercel auto-deploys on push
```

### 4. Build Mobile Apps
```bash
# iOS (on Mac)
npm run ios:build
# Build/archive in Xcode

# Android (on PC/Mac)
npm run android:build
# Build AAB in Android Studio
```

---

## 📊 Progress Tracking

**Total API routes in your app:** ~80+ routes in `src/app/api/`

**Migration status:** ⏳ Not started (use grep commands above to find calls to update)

**Priority:** High (required for mobile production builds to work)

**Estimated effort:** 2-4 hours (mostly find-and-replace)

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

## 📚 Resources

- **Capacitor HTTP Plugin:** https://capacitorjs.com/docs/apis/http
- **Fetch API:** https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- **CORS Guide:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

**Questions?** Check `docs/CAPACITOR_BUILD_WORKFLOW.md` for overall architecture.

