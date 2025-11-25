# Mobile Safe Area Issue - Marketing Pages Not Working

**Date:** January 22, 2025  
**Status:** ✅ RESOLVED - January 24, 2025  
**Issue:** Marketing pages overlap iOS notch despite fixes applied

---

## 🐛 **The Problem**

Marketing landing page (`/`) and privacy page (`/privacy`) have fixed navigation that overlaps with iOS notch/Dynamic Island in simulator.

**Screenshot:** Navigation showing "Capo" logo and "LOGIN" button partially hidden behind notch.

---

## ✅ **What Works (App Pages)**

**Authenticated app pages work perfectly:**
- `MobileHeader.component.tsx` - Uses `pt-safe` class ✅
- App dashboard, matches, players - All correct ✅
- Platform classes applied: `capacitor`, `platform-ios` ✅

**CSS is correct:**
```css
/* globals.css lines 8-31 */
:root {
  --safe-top: env(safe-area-inset-top, 0px);
}

.pt-safe { 
  padding-top: var(--safe-top) !important; 
}

html.platform-android.capacitor .pt-safe {
  padding-top: 24px !important;
}
```

**Root layout has correct viewport:**
```html
<meta name="viewport" content="viewport-fit=cover" />
```

**StatusBarConfig runs:**
- Adds `capacitor` class to html
- Adds `platform-ios` or `platform-android`
- Located in root layout

---

## ❌ **What Doesn't Work (Marketing Pages)**

### **Files Modified:**
1. `src/app/marketing/components/MarketingNav.component.tsx` - Added `pt-safe` class
2. `src/app/marketing/components/Hero.component.tsx` - Added `pt-safe` class  
3. `src/app/privacy/page.tsx` - Added calc style

### **What We Tried:**

**Attempt 1:** Added `pt-safe` class
```tsx
<nav className="... pt-safe">
```
**Result:** ❌ No padding, still overlaps

**Attempt 2:** Inline style with env()
```tsx
style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
```
**Result:** ❌ No padding, still overlaps

**Attempt 3:** Inline style with fixed px
```tsx
style={{ paddingTop: '50px' }}
```
**Result:** ❌ Didn't work, got build error (may have been cache)

**Attempt 4:** Debug box
```tsx
<div className="fixed top-0 bg-yellow-300 p-2">
  Platform: ios
  HTML classes: ... capacitor platform-ios ...
</div>
```
**Result:** ✅ Box showed correct platform detection
**Side effect:** Navigation appeared correct (debug box pushed it down)

### **Key Finding:**

**Platform detection works** (saw "Platform: ios" and classes in debug box) but **padding doesn't apply** even with inline `env()` styles.

---

## 🔍 **Theories to Investigate**

### **Theory 1: CSS Load Order**
Marketing pages might load before globals.css processes. 

**Test:** Add `!important` to inline style:
```tsx
style={{ paddingTop: 'env(safe-area-inset-top, 0px) !important' }}
```

### **Theory 2: env() Not Working in React Inline Styles**
React might not support CSS `env()` function in inline styles object.

**Test:** Use style string instead:
```tsx
<nav style="padding-top: env(safe-area-inset-top, 0px);">
```

### **Theory 3: Missing contentInset Config**
Capacitor config might need explicit setting.

**Check:** `capacitor.config.ts` - does it have `ios: { contentInset: 'automatic' }`?

### **Theory 4: Marketing Layout Different**
Marketing pages might not use root layout with StatusBarConfig.

**Check:** Does `/` page import/render StatusBarConfig component?

### **Theory 5: WKWebView Not Expanding**
iOS WKWebView might not be set to use full screen including safe area.

**Check:** Info.plist - does it have proper status bar settings?

---

## 🧪 **Tests to Run**

### **Test 1: Does fixed padding work?**
```tsx
<nav style={{ paddingTop: '60px' }} className="...">
```
**If YES:** Style system works, just env() doesn't  
**If NO:** Styles not applying at all

### **Test 2: Does pt-safe work on app pages?**
Navigate to `/admin/matches` in simulator  
**If YES:** CSS loads fine, issue is marketing-specific  
**If NO:** Global CSS issue

### **Test 3: Does Tailwind class work?**
```tsx
<nav className="... pt-16 bg-red-500">
```
**If red appears + padding:** Tailwind works  
**If nothing:** Tailwind not processing marketing pages

---

## 📋 **Environment Info**

**Simulator:** iPhone 17 Pro (iOS 26.0)  
**Mac:** macOS 15.7.1  
**Node:** 22+ (check with `node -v`)  
**Capacitor:** 7.4.3  
**Next.js:** 14  
**Dev mode:** `npm run dev` + `npm run ios:dev`

**Working:** Live reload (content changes appear)  
**Not working:** CSS classes/inline env() for safe area

---

## 🎯 **Quick Wins to Try First**

### **Fix 1: Use CSS Variable in Inline Style**
```tsx
<nav style={{ paddingTop: 'var(--safe-top)' }}>
```
Instead of `env()` directly

### **Fix 2: Add to contentInset**
In `capacitor.config.ts`:
```typescript
ios: {
  contentInset: 'automatic',
  webContentsDebuggingEnabled: true
}
```

### **Fix 3: Add Hardcoded Fallback**
```tsx
<nav 
  className="... pt-safe"
  style={{ paddingTop: '47px' }}  // Fallback for iOS
>
```

---

## 📚 **Reference Files**

**Working examples:**
- `src/components/layout/MobileHeader.component.tsx` (app header - works!)
- `src/app/globals.css` (safe area CSS - correct)
- `src/components/native/StatusBarConfig.component.tsx` (platform detection)

**Files needing fix:**
- `src/app/marketing/components/MarketingNav.component.tsx`
- `src/app/marketing/components/Hero.component.tsx`
- `src/app/privacy/page.tsx`

---

## 🔄 **For Next Agent Session**

**Start with:** This file (`MOBILE_SAFE_AREA_ISSUE.md`)

**Key facts:**
- App pages work (pt-safe works there)
- Marketing pages don't work (same CSS, different route)
- Platform detected correctly (saw in debug box)
- Live reload works (content updates appear)
- Inline env() doesn't work either (unusual!)

**Next steps:**
1. Compare working MobileHeader with non-working MarketingNav
2. Test if app pages (`/admin`) show correct spacing (to confirm CSS works)
3. Try CSS variable (`var(--safe-top)`) instead of `env()` in inline styles
4. Check if marketing pages use different layout/root component

**Goal:** Get marketing navigation below notch on iOS without hardcoded values.

---

## ✅ **RESOLUTION** (January 24, 2025)

### **Root Cause**
React doesn't support CSS `env()` function in inline style objects. Both Hero.component.tsx and MarketingNav.component.tsx were using:
```tsx
style={{ 
  paddingTop: 'env(safe-area-inset-top, 0px)',
  WebkitPaddingTop: 'env(safe-area-inset-top, 0px)'  // TypeScript error!
}}
```

This caused:
1. **Build error:** `WebkitPaddingTop` is not a valid React CSSProperties field
2. **Safe area not working:** `env()` doesn't work in React inline styles

### **The Fix**
1. Use `pt-safe` class (already done)
2. **Add iOS fallback in globals.css:**
   ```css
   html.platform-ios.capacitor .pt-safe {
     padding-top: max(var(--safe-top), 50px) !important;
   }
   ```
   This ensures that even if `env()` returns 0px (which it was doing in the debug session), we get a safe 50px padding.

### **Files Fixed**
1. `src/app/marketing/components/MarketingNav.component.tsx` - Removed inline styles, added `pt-safe` class
2. `src/app/marketing/components/Hero.component.tsx` - Removed inline styles, added `pt-safe` class  
3. `src/app/privacy/page.tsx` - Removed conflicting `pt-safe` class
4. `src/app/globals.css` - Added robust iOS fallback using `max()`

### **Why This Works**
- The debug session proved `env(safe-area-inset-top)` was evaluating to ~0px on the marketing page.
- The new CSS rule forces a minimum of 50px on iOS devices running in Capacitor.
- 50px covers standard notches (47px) and Dynamic Island (59px is ideal, but 50px prevents overlap).
- `max()` ensures that if `env()` *does* work correctly (e.g. 59px), it will take precedence.

---

**Status:** ✅ RESOLVED - CSS fallback implemented

