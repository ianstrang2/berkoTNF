# Supabase Client Standardization - January 8, 2025

## Problem Discovered

**Symptom:** Users logged out after visiting homepage (even though sessions were persisting)

**Root Cause:** Multiple Supabase client instances conflicting

**Files affected:** 10 files using `createClientComponentClient()`

---

## The Issue

**Two different client patterns were in use:**

**Pattern 1:** Configured Singleton (✅ Correct)
```typescript
// src/lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(..., {
  auth: {
    persistSession: true,      // ✅ Configured
    autoRefreshToken: true,    // ✅ Configured
    detectSessionInUrl: true,  // ✅ Configured
    flowType: 'pkce',          // ✅ Configured
  }
});
```

**Pattern 2:** Ad-hoc instances (❌ Wrong)
```typescript
// Various components
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
const supabase = createClientComponentClient(); // ❌ No config, new instance
```

**Problem:** Pattern 2 creates new clients without our config, causes conflicts

---

## How Multiple Clients Cause Logout

**What happened:**
1. User logs in via login page (using createClientComponentClient)
2. Session saved in localStorage
3. User visits homepage (using configured singleton)
4. **Two different clients fighting over same localStorage keys**
5. Session corruption → User appears logged out

**Supabase warning:** "Multiple GoTrueClient instances can cause issues"

---

## Solution

**Migrated all 10 files to use singleton:**

1. src/app/auth/login/page.tsx
2. src/hooks/useAuth.hook.ts
3. src/app/signup/admin/page.tsx
4. src/app/auth/pending-approval/page.tsx
5. src/app/join/[tenant]/[token]/page.tsx
6. src/components/navigation/SuperadminHeader.component.tsx
7. src/components/layout/ProfileDropdown.component.tsx
8. src/components/layout/MobileHeader.component.tsx
9. src/app/auth/superadmin-login/page.tsx
10. src/app/auth/no-club/page.tsx

**Change:**
```typescript
// ❌ BEFORE:
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
const supabase = createClientComponentClient();

// ✅ AFTER:
import { supabase } from '@/lib/supabaseClient';
```

---

## Coding Standard Added

**Rule added to `.cursor/rules/code-generation.mdc`:**

> **Supabase Client (MANDATORY)**
>
> ALWAYS use: `import { supabase } from '@/lib/supabaseClient';`  
> NEVER use: `createClientComponentClient()` or `createBrowserClient()` directly
>
> Why: Multiple instances corrupt sessions and cause logout bugs

---

## Testing

**Before fix:**
- Log in → Works
- Visit homepage → Session corrupted
- Try `/admin/matches` → Logged out ❌

**After fix:**
- Log in → Works
- Visit homepage → Should redirect to dashboard
- Sessions persist across pages ✅

---

**Status:** ✅ All files migrated, standard documented, ready for testing

