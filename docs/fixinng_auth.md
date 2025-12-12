# Fixing Auth for Capacitor iOS Remote WebView

**Created:** December 12, 2025  
**Status:** 📋 Plan (No code changes yet)  
**Author:** Claude (analysis) + Ian (implementation)

---

## Executive Summary

### Current Architecture (As Found in Code)

Your app uses a **remote WebView architecture**:

```
┌────────────────────────────────────────────────────────────────┐
│                        iOS App (Capacitor)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    WKWebView                              │  │
│  │  Loads: https://app.caposport.com/open                   │  │
│  │                                                           │  │
│  │  All UI/JS comes from Vercel (not bundled)               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  Session cookies stored in WKWebView cookie jar                 │
│  localStorage also available (separate storage)                 │
└────────────────────────────────────────────────────────────────┘
                               ↓ HTTPS
┌────────────────────────────────────────────────────────────────┐
│                   Vercel (app.caposport.com)                    │
│  ┌─────────────────┐   ┌─────────────────────────────────────┐ │
│  │   Middleware    │   │         API Routes                   │ │
│  │                 │   │                                      │ │
│  │ Checks cookies  │   │  Also check cookies via             │ │
│  │ Redirects to    │   │  getAuthenticatedUser()             │ │
│  │ /auth/login     │   │                                      │ │
│  └─────────────────┘   └─────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### Key Findings from Code Analysis

1. **Supabase Client Configuration** (`src/lib/supabaseClient.ts`):
   ```typescript
   createBrowserClient(..., {
     auth: {
       persistSession: true,
       storage: window.localStorage,  // ← Tokens in localStorage
     }
   })
   ```
   The **client-side** Supabase SDK stores tokens in `localStorage`.

2. **Middleware** (`src/middleware.ts`):
   - Uses `@supabase/ssr` which reads from **cookies** (not localStorage)
   - Does `NextResponse.redirect('/auth/login')` if no valid session found
   - Runs on `/admin/*`, `/player/*`, `/superadmin/*` routes

3. **Dual Storage Problem**:
   - **Client-side**: Supabase browser client uses `localStorage` for session
   - **Server-side**: Middleware uses cookies via `@supabase/ssr`
   - These can become out of sync, especially when:
     - WKWebView process is killed by iOS
     - Cookies expire but localStorage tokens remain
     - New Vercel deployment changes session handling

4. **The Safari Escape Mechanism**:
   - When middleware can't find valid cookies, it returns HTTP 302 redirect
   - WKWebView sometimes handles 302 redirects incorrectly after background/foreground
   - iOS may open Safari for "navigation failures" in WKWebView
   - This explains the `/auth/login` appearing in Safari

5. **Current Native Handlers**:
   - `DeepLinkHandler`: Fixed (no longer removes all listeners)
   - `AppStateHandler`: Reload logic disabled for diagnostics
   - No session refresh on app resume

---

## Why Current Approach is Suboptimal

### The Core Problem: Server-Side Redirects in Mobile WebView

```
User opens app after background
          ↓
WKWebView loads /player/dashboard
          ↓
Middleware runs (server-side)
          ↓
Cookies missing/expired? (WKWebView cookie jar cleared by iOS)
          ↓
NextResponse.redirect('/auth/login')  ← HTTP 302
          ↓
WKWebView receives 302 response
          ↓
iOS sometimes mishandles this → Opens Safari
```

**This is fundamentally fragile because:**

1. **WKWebView cookie persistence is unreliable**:
   - iOS can clear cookies when memory pressure is high
   - Process termination clears in-memory cookie state
   - Cookies may not persist across app restarts reliably

2. **Server-side redirects can trigger Safari**:
   - HTTP 302 redirects during page load can confuse WKWebView
   - Navigation handling after process restoration is buggy
   - This is a known iOS/WKWebView behavior

3. **Dual storage creates race conditions**:
   - localStorage says "logged in"
   - Cookies say "not logged in"
   - Client renders protected content
   - API calls fail with 401
   - User sees broken state

### Why This Works on Web but Not Mobile

On web browsers:
- Cookies and localStorage are both reliable
- Server redirects are handled correctly
- No process termination issues
- Same session state everywhere

On iOS WKWebView:
- Cookies stored in process-specific cookie jar
- Process termination clears/corrupts cookies
- Server redirects can trigger navigation bugs
- `localStorage` actually persists better than cookies

---

## Recommendation: Hybrid Client-Side Auth (Option 2 with Safety)

### Why Option 2 Over Option 1

**Option 1 (Harden Cookies) Rejected Because:**
- `WKAppBoundDomains` doesn't solve process termination cookie loss
- Cookie-based auth with middleware redirects is fundamentally fragile in WebViews
- Would require constant band-aids and workarounds
- Apple may change WKWebView behavior in future iOS versions

**Option 2 (Client-Side Tokens) Recommended Because:**
- `localStorage` persists more reliably in WKWebView
- Client-side route guards use `router.push()` not HTTP redirects
- No server-side redirects = no Safari escapes
- Supabase already supports this mode
- Simpler mental model: one source of truth for auth

### The Hybrid Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROPOSED ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLIENT-SIDE (WKWebView):                                       │
│  ├── Supabase session → localStorage (already configured)       │
│  ├── Route guards → Check session, router.push() if missing     │
│  └── Token refresh → Supabase SDK handles automatically         │
│                                                                  │
│  SERVER-SIDE (API Routes):                                       │
│  ├── Still use @supabase/ssr for auth checks                    │
│  ├── Cookies still work (Supabase syncs localStorage → cookies) │
│  └── Return 401 JSON on auth failure (no redirects)             │
│                                                                  │
│  MIDDLEWARE:                                                     │
│  └── Made auth-transparent (no redirects)                        │
│      Just passes through, client handles auth                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Insight**: Supabase's `@supabase/ssr` browser client actually DOES sync tokens to cookies automatically. The problem is that cookies can be lost independently, and middleware redirects before the client has a chance to restore the session.

---

## Implementation Plan

### Phase 0: Pre-Migration Diagnostics (Before Any Changes)

**Goal:** Confirm the root cause before making changes.

**Steps:**

1. **Add diagnostic logging to middleware**:
   - File: `src/middleware.ts`
   - Log: Cookie presence, user result, redirect decisions
   - Purpose: Confirm cookies are missing when Safari opens

2. **Add diagnostic logging to AppStateHandler**:
   - File: `src/components/native/AppStateHandler.component.tsx`
   - Log: Session state on resume, cookie state, localStorage state
   - Purpose: See what state exists after background

3. **TestFlight build with logging**:
   - Build and deploy to TestFlight
   - Test: Background for 30+ seconds, then foreground
   - Collect: Console logs via Xcode or Safari Web Inspector
   - Confirm: Cookies missing when Safari escape happens

**Estimated time:** 1-2 hours (build + test cycle)

---

### Phase 1: Remove Middleware Auth Redirects

**Goal:** Stop server-side redirects that trigger Safari escapes.

**Changes:**

1. **Update `src/middleware.ts`**:
   - Remove `NextResponse.redirect('/auth/login')` for unauthenticated users
   - Make middleware "auth-transparent" - it still checks session but doesn't redirect
   - Keep cookie refresh logic (for when cookies ARE present)

   ```typescript
   // BEFORE: Redirects to login
   if (!user) {
     return redirectToLogin(req, pathname, 'player');
   }

   // AFTER: Let request through, client will handle
   if (!user) {
     console.log('[MIDDLEWARE] No user, passing through for client-side handling');
     return response; // No redirect!
   }
   ```

2. **Keep middleware for other purposes**:
   - Still refreshes cookies when session exists
   - Still does admin/superadmin role checks (return 403, not redirect)
   - API routes unchanged (they return JSON errors, not redirects)

**Files changed:**
- `src/middleware.ts` - Remove auth redirect logic

**Risk:** Low - API routes already handle auth independently

---

### Phase 2: Add Client-Side Route Guards

**Goal:** Protect routes client-side without HTTP redirects.

**Changes:**

1. **Create `src/components/auth/AuthGuard.component.tsx`**:
   ```typescript
   'use client';
   
   import { Suspense } from 'react';
   
   interface AuthGuardProps {
     children: React.ReactNode;
     requiredRole?: 'player' | 'admin' | 'superadmin';
     fallback?: React.ReactNode;
   }
   
   // Inner component to avoid hydration issues
   const AuthGuardInner = ({ children, requiredRole, fallback }: AuthGuardProps) => {
     const { profile, loading } = useAuthContext();
     const router = useRouter();
     
     useEffect(() => {
       if (loading) return;
       
       if (!profile.isAuthenticated) {
         // Use router.push, not window.location (stays in WebView)
         router.push('/auth/login');
         return;
       }
       
       if (requiredRole === 'admin' && !profile.isAdmin) {
         router.push('/unauthorized');
         return;
       }
       // ... etc
     }, [loading, profile, requiredRole, router]);
     
     if (loading || !profile.isAuthenticated) {
       return fallback || <LoadingSpinner />;
     }
     
     return <>{children}</>;
   };
   
   // Wrap in Suspense to prevent hydration mismatches (SSR → CSR transition)
   export const AuthGuard = (props: AuthGuardProps) => {
     return (
       <Suspense fallback={props.fallback || <LoadingSpinner />}>
         <AuthGuardInner {...props} />
       </Suspense>
     );
   };
   ```

   **Note:** The Suspense wrapper prevents hydration flicker when server renders one state and client hydrates another.

2. **Add guards to player layout** (`src/app/player/layout.tsx`):
   ```typescript
   export default function PlayerLayout({ children }) {
     return (
       <AuthGuard requiredRole="player">
         <PlayerLayoutContent>{children}</PlayerLayoutContent>
       </AuthGuard>
     );
   }
   ```

3. **Add guards to admin layout** (`src/app/admin/layout.tsx`):
   ```typescript
   export default function AdminLayout({ children }) {
     return (
       <AuthGuard requiredRole="admin">
         <AdminLayoutContent>{children}</AdminLayoutContent>
       </AuthGuard>
     );
   }
   ```

**Files changed:**
- `src/components/auth/AuthGuard.component.tsx` (new)
- `src/app/player/layout.tsx`
- `src/app/admin/layout.tsx`
- `src/app/superadmin/layout.tsx`

**Risk:** Low - This is additive, doesn't break existing flows

---

### Phase 3: Enhance Session Recovery on App Resume

**Goal:** Proactively restore session when app comes to foreground.

**Changes:**

1. **Update `src/components/native/AppStateHandler.component.tsx`**:
   ```typescript
   useEffect(() => {
     if (!Capacitor.isNativePlatform()) return;
     
     App.addListener('appStateChange', async (state) => {
       if (state.isActive) {
         // Coming to foreground
         console.log('[APP_STATE] Resuming, refreshing session...');
         
         // Force Supabase to check/refresh session from localStorage
         const { data, error } = await supabase.auth.getSession();
         
         if (error) {
           console.error('[APP_STATE] Session refresh failed:', error);
         } else if (data.session) {
           console.log('[APP_STATE] Session valid, expires:', data.session.expires_at);
           
           // MANDATORY: Proactive token refresh if close to expiry
           // (Prevents 401s on first API call after long background)
           const expiresAt = new Date(data.session.expires_at * 1000);
           const now = new Date();
           const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000 / 60;
           
           if (minutesUntilExpiry < 30) {
             console.log('[APP_STATE] Session expiring in <30min, refreshing...');
             await supabase.auth.refreshSession();
           }
         } else {
           console.log('[APP_STATE] No session found');
           // AuthGuard will handle redirect to login
         }
       }
     });
   }, []);
   ```

   **Note:** The 30-minute threshold (not 10) is more conservative for mobile where users may background for extended periods.

**Files changed:**
- `src/components/native/AppStateHandler.component.tsx`

**Risk:** Low - This is defensive, adds reliability

---

### Phase 3B: Session Check in DeepLinkHandler

**Goal:** Ensure deep links don't route to protected pages with stale tokens.

**Changes:**

1. **Update `src/components/native/DeepLinkHandler.component.tsx`**:
   ```typescript
   const handleDeepLink = async (data: any) => {
     const url = data.url;
     if (!url) return;
     
     console.log('[DeepLink] Received:', url);
     
     // Before routing, verify session is valid
     const { data: sessionData } = await supabase.auth.getSession();
     
     // Parse path from URL
     let path = '/';
     if (url.startsWith('capo://')) {
       path = url.replace('capo://', '/');
     } else if (url.includes('capo.app') || url.includes('localhost')) {
       const urlObj = new URL(url);
       path = urlObj.pathname + urlObj.search;
     }
     
     // If navigating to protected route without session, go to login
     const isProtectedRoute = path.startsWith('/player') || 
                              path.startsWith('/admin') || 
                              path.startsWith('/superadmin');
     
     if (isProtectedRoute && !sessionData?.session) {
       console.log('[DeepLink] No session, redirecting to login');
       router.push(`/auth/login?returnUrl=${encodeURIComponent(path)}`);
       return;
     }
     
     console.log('[DeepLink] Navigating to:', path);
     router.push(path);
   };
   ```

**Files changed:**
- `src/components/native/DeepLinkHandler.component.tsx`

**Risk:** Low - Prevents redirect loops on stale tokens

---

### Phase 3C: Explicit Logout Cleanup

**Goal:** Ensure logout completely clears all session state.

**Changes:**

1. **Update `src/hooks/useAuth.hook.ts`**:
   ```typescript
   const logout = useCallback(async () => {
     // Explicit scope: 'local' ensures localStorage is cleared
     // (Default behavior, but being explicit is defensive)
     await supabase.auth.signOut({ scope: 'local' });
     localStorage.removeItem('adminAuth');
     localStorage.removeItem('userProfile');
     queryClient.clear();
   }, [queryClient]);
   ```

**Files changed:**
- `src/hooks/useAuth.hook.ts`

**Risk:** None - Defensive improvement only

---

### Phase 4: Update `/open` Entry Point

**Goal:** Make the entry point work correctly with client-side auth.

**Changes:**

1. **Update `src/app/open/page.tsx`**:
   - Already uses `useAuthContext()` for client-side auth check ✅
   - Already uses `router.push()` for navigation ✅
   - No changes needed if AuthGuard handles the rest

2. **Verify the flow**:
   ```
   App launches → /open loads
         ↓
   AuthContext checks session (localStorage)
         ↓
   If authenticated → router.push('/admin/matches' or '/player/dashboard')
   If not → router.push('/auth/login')
         ↓
   All navigation stays in WebView (no HTTP redirects)
   ```

**Files changed:**
- None (already correct)

---

### Phase 5: iOS Configuration Updates (Optional Hardening)

**Goal:** Add iOS-level safeguards for cookie/session handling.

**Changes:**

1. **Consider `WKAppBoundDomains`** (optional):
   - File: `ios/App/App/Info.plist`
   - Purpose: Tells iOS this is a first-party app for the domain
   - Improves cookie handling in WKWebView
   
   ```xml
   <key>WKAppBoundDomains</key>
   <array>
     <string>app.caposport.com</string>
     <string>caposport.com</string>
   </array>
   ```

   **Note:** This is optional and may not be needed if client-side auth works well.

2. **Verify Info.plist settings**:
   - Current `Info.plist` has `NSAllowsArbitraryLoads: true` ⚠️
   - For production, should use the Release plist with HTTPS only
   - Verify Xcode is using correct plist per configuration

**Files changed:**
- `ios/App/App/Info.plist` (optional)

**Risk:** Low - These are additive hardening measures

---

### Phase 6: Testing Plan

#### Local Development Testing (Windows PC)

1. **Run web dev server**: `npm run dev`
2. **Test auth flows in browser**:
   - Login → dashboard
   - Logout → login page
   - Direct URL to protected route → should redirect to login
   - Verify no console errors

#### iOS Simulator Testing (Mac)

1. **Build for simulator**:
   ```bash
   git pull
   npm install
   npx cap sync ios
   npx cap open ios
   # In Xcode: Run on simulator
   ```

2. **Test scenarios**:
   - Fresh launch → should show login
   - Login → should reach dashboard
   - Background for 30 seconds → foreground → should stay logged in
   - Background for 5 minutes → foreground → should stay logged in
   - Force quit app → reopen → should stay logged in (localStorage persists)
   - Click bottom nav rapidly → should never open Safari

3. **Debug with Safari Web Inspector**:
   - Open Safari on Mac
   - Develop menu → Simulator → app.caposport.com
   - Watch console for auth logs
   - Check Application tab → localStorage for Supabase tokens

#### TestFlight Testing

1. **Build for TestFlight**:
   ```bash
   git pull
   npm install
   CAP_SERVER_ENV=prod npx cap sync ios
   npx cap open ios
   # In Xcode: Product → Archive → Distribute App
   ```

2. **Test scenarios**:
   - All scenarios from simulator testing
   - Test on real device (process termination is more aggressive)
   - Leave app in background for 1+ hour
   - Deploy new Vercel build while app is backgrounded
   - Foreground app → should recover gracefully

3. **Collect logs**:
   - Connect device via USB
   - Window → Devices and Simulators
   - View console output

#### Android Emulator Testing (Parity Check)

1. **Build for Android**:
   ```bash
   npm install
   npx cap sync android
   npx cap run android
   ```

2. **Test scenarios** (Android is more forgiving but should verify):
   - Background for 5 minutes → resume → verify no crashes
   - Navigation works correctly (no external browser opens)
   - Deep links work via `adb shell am start -a android.intent.action.VIEW -d "capo://player/dashboard"`
   - Token refresh after long background

3. **Android-specific notes**:
   - WebView process termination is less aggressive than iOS
   - localStorage should persist reliably
   - No Safari-equivalent issue, but watch for unexpected behavior

---

### Phase 7: Deployment & Rollout

1. **Deploy to Vercel first**:
   - Merge changes to main
   - Verify on web (should be unchanged behavior)

2. **Build new TestFlight**:
   - Increment version number
   - Archive and submit
   - Test with existing TestFlight users

3. **Monitor for issues**:
   - Check for crash reports
   - Watch for support requests
   - Verify login success rate

---

## PC → Mac Workflow Notes

### When to Sync iOS

**Sync required after:**
- Any code changes to `src/`
- Changes to `capacitor.config.ts`
- Changes to native handlers

**Command sequence:**
```bash
# On Mac:
git pull
npm install
npx cap sync ios
npx cap open ios
```

### When to Rebuild in Xcode

**Rebuild required after:**
- Changes to `ios/App/App/Info.plist`
- Changes to any native iOS files
- Changes to Capacitor plugins

**Steps:**
1. In Xcode: Product → Clean Build Folder
2. Product → Build
3. Product → Run (or Archive for TestFlight)

---

## Files Changed Summary

| Phase | File | Change Type |
|-------|------|-------------|
| 0 | `src/middleware.ts` | Add logging |
| 0 | `src/components/native/AppStateHandler.component.tsx` | Add logging |
| 1 | `src/middleware.ts` | Remove auth redirects |
| 2 | `src/components/auth/AuthGuard.component.tsx` | New file |
| 2 | `src/app/player/layout.tsx` | Add AuthGuard |
| 2 | `src/app/admin/layout.tsx` | Add AuthGuard |
| 2 | `src/app/superadmin/layout.tsx` | Add AuthGuard |
| 3 | `src/components/native/AppStateHandler.component.tsx` | Add session refresh |
| 3B | `src/components/native/DeepLinkHandler.component.tsx` | Add session check |
| 3C | `src/hooks/useAuth.hook.ts` | Explicit logout cleanup |
| 5 | `ios/App/App/Info.plist` | Optional hardening |

---

## Security Trade-offs (Acknowledged)

**localStorage vs HttpOnly Cookies:**

| Aspect | HttpOnly Cookies | localStorage |
|--------|-----------------|--------------|
| XSS vulnerability | Protected ✅ | Vulnerable ⚠️ |
| Mobile persistence | Unreliable ⚠️ | Reliable ✅ |
| Server redirects | Cause Safari escapes ⚠️ | N/A |

**Why this trade-off is acceptable for Capo:**

1. **Low-risk app**: Sports stats app, not banking/healthcare
2. **Short token expiry**: Supabase default 1hr access tokens
3. **RLS backend security**: Even if token stolen, can only access own tenant data
4. **CSP headers**: Can add Content-Security-Policy on Vercel for XSS mitigation
5. **No cross-tab concern**: Mobile is single-tab by nature

**Optional hardening (post-launch):**
- Add CSP headers in `next.config.mjs` or Vercel config
- Shorten access token expiry in Supabase dashboard
- Add device fingerprinting for suspicious token usage

---

## Rollback Plan

If issues arise:

1. **Revert middleware changes** (restore redirects)
2. **AuthGuard can stay** (it's additive, doesn't break anything)
3. **AppStateHandler logging can stay** (useful for diagnostics)

The changes are incremental and reversible.

---

## Success Criteria

**The fix is successful when:**

1. ✅ App never opens Safari for `/auth/login`
2. ✅ App stays logged in after background/foreground cycles
3. ✅ App stays logged in after force quit and reopen
4. ✅ App recovers gracefully after Vercel deployment while backgrounded
5. ✅ No blank screens on app resume
6. ✅ Bottom navigation always stays in WebView
7. ✅ Web app continues to work normally

---

## Grok's Concerns: Analysis

**Added to plan (valid concerns):**
1. ✅ Token refresh on resume - Made mandatory (was optional), increased threshold to 30min
2. ✅ Hydration mismatch in AuthGuard - Added Suspense wrapper
3. ✅ Deep links with stale tokens - Added Phase 3B session check
4. ✅ Logout cleanup - Added Phase 3C explicit scope
5. ✅ Android parity testing - Added to Phase 6

**Not applicable (verified against codebase):**
1. ❌ Server components fetching protected data - All pages are `'use client'`, fetch via React Query → API routes. No RSC data fetching.
2. ❌ Multi-tab sync - Mobile is single-tab. Web users unaffected by this change.

**Acknowledged but low priority:**
1. ⚠️ XSS in localStorage - Addressed in Security Trade-offs section. Acceptable for this app type.
2. ⚠️ OTP/Email flows - Phone OTP uses client-side `signInWithOtp`, unaffected by these changes.

---

## Questions to Consider Before Implementation

1. **Do you want to add Phase 0 logging first** to confirm the diagnosis?
2. **Are there any routes that MUST have server-side protection** (not just API routes)?
3. **Do you have Safari Web Inspector access** for debugging TestFlight builds?
4. **What's your TestFlight user count?** (Low count = safer to test aggressive changes)

---

**Document Status:** 📋 Plan Only  
**Next Step:** Review this plan, then implement Phase 0 for diagnostics  
**Code Changes Made:** None

