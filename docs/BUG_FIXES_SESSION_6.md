# Bug Fixes - Session 6 (Auth Flow Issues)

**Date:** January 8, 2025  
**Status:** ✅ All code fixes complete  
**Testing Required:** Yes (see below)

## Issues Fixed

### 1. ✅ Session Expiry - Users Logged Out Frequently

**Problem:** Users had to log in (and receive SMS) every time they visited the website.

**Root Cause:** Supabase client wasn't configured to persist sessions or auto-refresh tokens.

**Fix Applied:**
- Updated `src/lib/supabaseClient.ts` with proper session persistence configuration
- Added options:
  - `persistSession: true` - Store sessions in localStorage
  - `autoRefreshToken: true` - Automatically refresh expiring tokens
  - `detectSessionInUrl: true` - Handle OAuth redirects properly
  - `flowType: 'pkce'` - More secure auth flow
  - `storage: localStorage` - Explicit localStorage binding

**Additional Configuration Required in Supabase Dashboard:**

Go to **Supabase Dashboard → Authentication → Settings**:

1. **JWT Expiry:**
   - Access Token Expiry: Keep at `3600` seconds (1 hour) - this is auto-refreshed
   - Refresh Token Expiry: Change from `2592000` (30 days) to `31536000` (365 days)
   - This means users stay logged in for a full year unless they explicitly log out

2. **Refresh Token Reuse Interval:**
   - Keep at `10` seconds (this prevents duplicate refresh requests)

**Expected Behavior After Fix:**
- ✅ Users stay logged in for 1 year (unless they clear browser data or log out)
- ✅ Tokens auto-refresh every hour in the background (no user interruption)
- ✅ No SMS cost for returning users (only for initial login)

---

### 2. ✅ App Promo Modal Showing Every Time

**Problem:** App download modal appeared on every login, despite 30-day cooldown being implemented.

**Root Cause:** Logic error - the condition `!dismissed || (now - dismissedAt) > thirtyDays` always triggered on first visit because `!dismissed` was true.

**Fix Applied:**
- Updated `src/components/modals/AppPromoModal.component.tsx`
- Fixed logic to:
  1. Show once on first web login (never dismissed)
  2. After dismissal, wait 30 days before showing again
  3. Never show in Capacitor app

**Expected Behavior After Fix:**
- ✅ Modal shows once after first login on web
- ✅ User can dismiss it
- ✅ Won't show again for 30 days (tracked in localStorage)
- ✅ Never shows in native app

---

### 3. ✅ Reject Modal Unformatted

**Problem:** Reject join request modal appeared without gradient icon styling.

**Root Cause:** Missing CSS for `swal2-icon-custom-gradient` class.

**Fix Applied:**
- Added complete gradient icon styling to `src/app/globals.css`
- Includes styles for all icon types:
  - Warning (red gradient)
  - Error (red gradient)  
  - Success (purple-pink gradient)
  - Question (purple-pink gradient)
  - Info (blue gradient)

**Expected Behavior After Fix:**
- ✅ Reject modal shows red gradient warning icon
- ✅ Matches the consistent Soft-UI design pattern
- ✅ All other modals using `SoftUIConfirmationModal` also have proper icons

---

### 4. ✅ Approve Modal Too Large on Mobile

**Problem:** Approve join request modal was larger than mobile viewport, causing:
- Content cut off below screen
- Zoom/formatting issues after closing
- Poor mobile UX

**Root Cause:** Missing mobile-responsive constraints (`max-height`, `overflow-y`).

**Fix Applied:**
- Updated `src/components/admin/player/PendingJoinRequests.component.tsx`
- Added responsive classes:
  - `max-h-[90vh]` - Modal never exceeds 90% of viewport height
  - `overflow-y-auto` - Scrollable content if needed

**Expected Behavior After Fix:**
- ✅ Modal fits on any mobile screen size
- ✅ Content scrolls if needed (doesn't overflow)
- ✅ No zoom issues after closing
- ✅ Maintains proper formatting

---

### 5. ✅ Error When Approving Join Request

**Problem:** Clicking "Approve" on join request threw an error (unable to send email notification).

**Root Cause:** Database query didn't select the `email` field from `player_join_requests` table, causing:
- `joinRequest.email` to be undefined
- Email notification to fail
- Approval to potentially fail (depending on error handling)

**Fix Applied:**
- Updated `src/app/api/admin/join-requests/approve/route.ts`
- Added explicit `select` clause to include all needed fields:
  - `id`, `tenant_id`, `phone_number`, `display_name`, `email`, `auth_user_id`, `status`
- Improved email notification error handling (approval succeeds even if email fails)
- Removed unsafe type cast `(joinRequest as any).email`

**Expected Behavior After Fix:**
- ✅ Approval succeeds every time
- ✅ Email notification sent if player provided email
- ✅ Graceful fallback if email not available (logs message, approval still works)
- ✅ No errors in console

---

## Testing Checklist

### Test 1: Session Persistence

**Prerequisites:**
- ✅ Code changes deployed
- ✅ Supabase dashboard settings updated (Refresh Token Expiry = 365 days)
- ✅ Server restarted (for new Supabase client config)

**Steps:**
1. Open site in **incognito/private window** (fresh session)
2. Log in with phone + OTP
3. Navigate around the site (admin pages, players page, etc.)
4. **Close browser completely** (not just tab)
5. Wait 5 minutes
6. Open browser again, go to site
7. ✅ **Expected:** Still logged in, no redirect to login page

**If it asks you to log in again:**
- ❌ Session persistence not working
- Check: Did you restart the server after code changes?
- Check: Did you update Supabase dashboard settings?

---

### Test 2: App Promo Modal

**Prerequisites:**
- Code changes deployed
- Clear browser localStorage: `localStorage.removeItem('appPromoModalDismissed')`

**Steps:**
1. Open site in web browser (not Capacitor app)
2. Log in
3. ✅ **Expected:** Modal appears after 1 second delay
4. Click "Continue on Web"
5. ✅ **Expected:** Modal closes
6. Refresh page
7. ✅ **Expected:** Modal does NOT appear again
8. Wait 1 minute, refresh again
9. ✅ **Expected:** Modal still does NOT appear (30-day cooldown active)

**To test 30-day cooldown:**
- In browser console: `localStorage.setItem('appPromoModalDismissed', Date.now() - (31 * 24 * 60 * 60 * 1000))`
- Refresh page
- ✅ **Expected:** Modal appears again (dismissed >30 days ago)

---

### Test 3: Reject Modal Styling

**Prerequisites:**
- Code changes deployed
- At least one pending join request exists

**Steps:**
1. Go to Admin → Players
2. Find "Pending Join Requests" section
3. Click "Reject" button
4. ✅ **Expected:** Modal appears with:
   - Red gradient warning icon (circular, gradient background)
   - Player name and phone displayed
   - "Reject" and "Cancel" buttons (consistent styling)
   - Rounded corners, soft shadow

**If icon is not showing or looks broken:**
- ❌ CSS not loaded
- Check: Did you deploy the updated `globals.css`?
- Check: Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

---

### Test 4: Approve Modal Mobile Responsiveness

**Prerequisites:**
- Code changes deployed
- Test on actual mobile device OR browser DevTools mobile emulation

**Steps:**
1. Open site on mobile device (or Chrome DevTools → Toggle Device Toolbar)
2. Log in as admin
3. Go to Admin → Players
4. Find "Pending Join Requests"
5. Click "Approve" button
6. ✅ **Expected:** Modal appears fully on screen:
   - All content visible
   - Can scroll if needed
   - Buttons accessible
   - No content cut off below viewport
7. Fill in player name
8. Click "Confirm"
9. ✅ **Expected:** Modal closes cleanly
10. Check page layout
11. ✅ **Expected:** No zoom issues, page looks normal

---

### Test 5: Approve Join Request (End-to-End)

**Prerequisites:**
- Code changes deployed
- Database migration complete: `ALTER TABLE player_join_requests ADD COLUMN IF NOT EXISTS email TEXT;`
- `npx prisma generate` run
- Environment variables set:
  - `RESEND_API_KEY=re_KPwHnrDW_NBRhtqQqG7UgmzNQ8xCLSrum`
  - `EMAIL_FROM=onboarding@resend.dev`
  - `NEXT_PUBLIC_SITE_URL=https://app.caposport.com`
- Server restarted

**Steps:**

**5A: Join Request with Email**
1. Create join request (use `/auth/login` with new phone)
2. Enter phone, verify OTP
3. Fill join form with:
   - Club code: `YOUR_CLUB_CODE`
   - Name: `Test Player`
   - Email: `your.real.email@example.com` (use real email you can check)
4. Submit
5. ✅ **Expected:** "Waiting for approval" page shown

**5B: Admin Approval**
6. Log in as admin
7. Go to Admin → Players
8. Find "Pending Join Requests" section
9. Find "Test Player" request
10. Click "Approve"
11. ✅ **Expected:** Modal appears (properly formatted, fits screen)
12. Keep "Create New Player" selected
13. Name should be pre-filled: "Test Player"
14. Click "Confirm"
15. ✅ **Expected:**
    - Modal shows "Processing..."
    - Then closes
    - Success message: "Player approved successfully!"
    - Request disappears from pending list
    - Player appears in main players list

**5C: Email Notification**
16. Check email inbox (the one you provided in step 3)
17. ✅ **Expected:** Email received with:
    - Subject: "You've been approved to join [Club Name]"
    - Body: Welcome message with login link
    - From: `onboarding@resend.dev`

**If email not received:**
- Check server logs for `[APPROVAL]` messages
- Check Resend dashboard for send status
- Verify environment variables are set correctly
- Check if email field was actually stored in join request

**5D: Player Login After Approval**
18. Log out
19. Log in with approved player's phone number
20. ✅ **Expected:**
    - Phone + OTP flow
    - Redirects directly to dashboard (no join form)
    - Player sees their stats, matches, etc.

---

## Database Migration Needed

Run this SQL in Supabase SQL Editor:

```sql
-- Add email column to player_join_requests (if not already done)
ALTER TABLE player_join_requests ADD COLUMN IF NOT EXISTS email TEXT;

-- Verify column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'player_join_requests' 
AND column_name = 'email';
```

Then regenerate Prisma types:

```bash
npx prisma generate
```

---

## Environment Variables Check

Ensure these are set in your production environment (Vercel, Netlify, etc.):

```bash
# Email notifications (Resend)
RESEND_API_KEY=re_KPwHnrDW_NBRhtqQqG7UgmzNQ8xCLSrum
EMAIL_FROM=onboarding@resend.dev

# Site URL (for email links)
NEXT_PUBLIC_SITE_URL=https://app.caposport.com

# Supabase (should already be set)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Files Modified (5 Total)

1. **`src/lib/supabaseClient.ts`** - Session persistence configuration
2. **`src/components/modals/AppPromoModal.component.tsx`** - Fixed cooldown logic
3. **`src/app/globals.css`** - Added gradient icon CSS
4. **`src/components/admin/player/PendingJoinRequests.component.tsx`** - Mobile modal fix
5. **`src/app/api/admin/join-requests/approve/route.ts`** - Email field selection fix

---

## Next Steps

1. **Deploy code changes** ✅
2. **Update Supabase dashboard settings** (Refresh Token Expiry = 365 days)
3. **Run database migration** (add email column if not done)
4. **Run `npx prisma generate`**
5. **Verify environment variables** are set
6. **Restart server** (important for Supabase client config changes)
7. **Test all 5 scenarios** above
8. **Monitor for 24 hours** - check if users are staying logged in

---

## Success Criteria

- ✅ Users stay logged in for at least 1 day (ideally 1 year)
- ✅ App promo modal only shows once per 30 days
- ✅ Reject modal has proper gradient icon
- ✅ Approve modal fits on mobile screens
- ✅ Approving join requests works without errors
- ✅ Email notifications sent successfully (if email provided)
- ✅ No console errors during approval flow

---

## Known Limitations & Future Improvements

### Session Persistence (Issue #1)

**Current Solution:**
- 1-year refresh token (very long-lived session)
- Auto-refresh every hour (transparent to user)

**Edge Cases:**
- Users who clear browser data will need to log in again (expected)
- Private/Incognito mode doesn't persist sessions (expected)
- Users who disable localStorage won't stay logged in (rare)

**Future Enhancement (if needed):**
- "Remember Me" checkbox (explicit opt-in for long sessions)
- Push notifications for session expiry (mobile app)
- Biometric re-auth instead of SMS (Phase 8 in SPEC_auth.md)

### Email Notifications (Issue #5)

**Current Solution:**
- Email sent if player provided email during join request
- Graceful fallback: approval succeeds even if email fails
- Console logs for debugging

**Future Enhancement (Phase 3 - documented in code):**
- SMS notification fallback if no email
- WhatsApp notification (if user connected WhatsApp)
- In-app notification system
- Notification preferences per player

---

## If Issues Persist

### Session Still Expiring

1. Check browser console for errors
2. Check if `localStorage` has `sb-` keys (Supabase session data)
3. Verify Supabase dashboard settings were actually saved
4. Try in different browser (test if browser-specific issue)
5. Check Supabase logs for auth errors

### App Promo Modal Still Appearing

1. Clear localStorage: `localStorage.clear()` in console
2. Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
3. Check console for errors
4. Verify code was deployed (check file timestamps)

### Modal Styling Issues

1. Hard refresh browser (force CSS reload)
2. Check browser DevTools → Network tab → CSS loaded correctly
3. Check console for CSS errors
4. Try in incognito mode (rule out cache issues)

### Approval Errors

1. Check server logs for detailed error messages
2. Verify database migration was successful
3. Check Prisma schema is up-to-date (`npx prisma generate`)
4. Test with and without email in join request
5. Check Resend dashboard for email delivery status

---

## Documentation References

- **Session Management:** `docs/SPEC_auth.md` Section B (lines 588-621)
- **Modal Standards:** `docs/SPEC_auth.md` Phase 5 (lines 84-91)
- **Email Notifications:** `docs/SPEC_auth.md` Phase 6.6 (lines 4074-4134)
- **Multi-Tenancy Security:** `docs/MULTI_TENANCY_SECURITY_AUDIT.md`

---

**Status:** All code fixes complete. Ready for deployment and testing.

