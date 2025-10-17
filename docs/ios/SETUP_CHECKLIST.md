# iOS Setup Checklist

**Date:** October 14, 2025  
**Status:** Configuration complete, ready for iOS platform addition  
**Next Step:** Transfer project to MacBook and run setup commands

---

## ✅ What's Already Done

- [x] Updated `capacitor.config.ts` for proper dev/prod modes
- [x] Configured `next.config.mjs` for static export
- [x] Added npm scripts for iOS build workflow
- [x] Created `src/lib/apiConfig.ts` helper for mobile API calls
- [x] Created comprehensive build workflow documentation
- [x] Prepared iOS Info.plist configuration
- [x] Prepared universal links configuration

## 🏗️ Architecture Overview

**Your app uses a hybrid architecture (industry standard):**

| Component | Location | Description |
|-----------|----------|-------------|
| **UI (React/Next.js)** | Bundled in app (`out/`) | Static files, instant load, works offline |
| **API Routes** | Deployed to Vercel | `https://app.caposport.com/api/*` |
| **Database (Supabase)** | Cloud | Accessed only by API routes |
| **Auth (Supabase)** | Cloud | Cookies work cross-origin via `apiConfig.ts` |

**This is how Netflix, Notion, Airbnb mobile apps work!**

---

## 📋 iOS Setup Steps (Run on MacBook)

### Step 1: Transfer Project to Mac

**Option A: Git Clone**
```bash
# On MacBook
cd ~/Projects
git clone <your-repo-url> BerkoTNF
cd BerkoTNF
npm install
```

**Option B: Direct Transfer**
- Copy project folder to Mac via USB/network share
- Run `npm install` on Mac

---

### Step 2: Add iOS Platform

```bash
npx cap add ios
```

**What this creates:**
- `ios/` directory with Xcode project
- `ios/App/App/Info.plist` - Main config file
- `ios/App/App/Assets.xcassets/` - App icons and splash screens
- Native iOS project structure

---

### Step 3: Configure Deep Links

**Edit:** `ios/App/App/Info.plist`

**Add this content** (inside the main `<dict>` element):

Copy the entire content from: `docs/ios/info_plist_config.xml`

**What it configures:**
- Custom scheme: `capo://`
- Universal links: `https://capo.app/join/*`
- App Transport Security (for dev server)

---

### Step 4: First Build Test

**⚠️ IMPORTANT: Production builds require deployed API**

Production mobile builds call `https://app.caposport.com/api/*` (not local API).

**Options:**

**Option A: Test with Live Reload (Recommended for development)**
```bash
# Ensure dev server is running first
npm run dev

# Then in another terminal, launch iOS with live reload
npm run ios:dev

# Capacitor 7 automatically detects dev server at localhost:3000
```

**Option B: Test Production Build (Requires deployed API)**
```bash
# This builds static export and opens Xcode
npm run ios:build
```

**In Xcode:**
1. Select target: iPhone 15 Pro Simulator (or any iPhone simulator)
2. Click ▶️ Play button (or press Cmd+R)
3. Wait for build to complete
4. App should launch in simulator

**Expected result:** 
- ✅ App loads successfully, shows home page
- ✅ **With live reload:** Full functionality (local API)
- ⚠️ **Production build:** UI works, but API calls require deployed production API

---

### Step 5: Test Deep Links

**In Terminal (while simulator is running):**

```bash
# Test custom scheme
xcrun simctl openurl booted "capo://join/ABC123?token=test"

# Test universal link
xcrun simctl openurl booted "https://capo.app/join/ABC123?token=test"
```

**Expected result:**
- App comes to foreground
- Navigates to join flow with club code ABC123
- DeepLinkHandler logs appear in Xcode console

---

### Step 6: Configure Signing (For Device/App Store)

**In Xcode:**
1. Click project name in left sidebar (top item)
2. Select **Signing & Capabilities** tab
3. Check **"Automatically manage signing"**
4. Select your Apple Developer team from dropdown
5. Xcode will generate provisioning profile

**Requirements:**
- Apple Developer account ($99/year)
- Logged into Xcode with Apple ID (Xcode → Settings → Accounts)

---

## 🧪 Testing Scenarios

### Scenario 1: Simulator Build (No Apple Developer Account Required)

```bash
npm run ios:build
# In Xcode: Select simulator → Click ▶️
```

✅ **Pass:** App launches in simulator  
✅ **Pass:** Can navigate around app  
✅ **Pass:** Deep links work via `xcrun simctl openurl`

---

### Scenario 2: Physical Device Testing (Requires Apple Developer Account)

```bash
npm run ios:build
# In Xcode: 
# - Connect iPhone via USB
# - Select your device from target dropdown
# - Click ▶️ (may need to trust computer on device)
```

✅ **Pass:** App installs on device  
✅ **Pass:** Universal links work (tap link in Messages/Safari)  
✅ **Pass:** Phone authentication works

---

### Scenario 3: Live Reload Development

```bash
# Start dev server first
npm run dev

# In another terminal, launch with live reload
npm run ios:dev

# Capacitor 7 auto-detects dev server - no IP config needed!
```

✅ **Pass:** Simulator connects to dev server  
✅ **Pass:** Changes to code appear instantly in simulator  
✅ **Pass:** No rebuild required for code changes

**Note:** Capacitor 7 automatically discovers `localhost:3000`. For physical devices on the same network, it will use your machine's local IP automatically.

---

## 🚨 Common Issues & Fixes

### Issue 1: "No Provisioning Profile Found"

**Symptom:** Xcode shows error about provisioning profile

**Fix:**
1. Xcode → Settings → Accounts
2. Add your Apple ID if not already added
3. Select account → Download Manual Profiles
4. Back to project → Signing & Capabilities
5. Select your team again

---

### Issue 2: White Screen on Launch

**Symptom:** App launches but shows blank white screen

**Cause:** Static files not built or synced

**Fix:**
```bash
# Clean and rebuild
rm -rf out/ .next/ ios/App/public/
npm run build:mobile
npx cap open ios
# Rebuild in Xcode
```

---

### Issue 3: Deep Links Not Working

**Symptom:** Links don't open app or navigate incorrectly

**Check:**
1. Info.plist has URL schemes configured
2. DeepLinkHandler component is in app layout
3. App is running (not terminated)

**Test:**
```bash
# Enable verbose logging
xcrun simctl openurl booted "capo://join/TEST123"
# Check Xcode console for [DeepLink] logs
```

---

### Issue 4: API Calls Fail (401/403)

**Symptom:** Authentication fails, "No tenant" errors

**Cause:** Cookies not persisted or wrong environment

**Check:**
1. Supabase URL is correct (`app.caposport.com` not `localhost`)
2. Cookies are enabled (Capacitor handles this automatically)
3. CORS configured on server for `capacitor://localhost`

---

### Issue 5: Build Fails with "Command PhaseScriptExecution failed"

**Symptom:** Xcode build fails during "Copy Web Assets" phase

**Cause:** `out/` directory doesn't exist or is empty

**Fix:**
```bash
# Build static export first
npm run build:mobile

# Then open Xcode
npx cap open ios
```

---

## 📱 App Store Submission Prep

### ⚠️ CRITICAL: Pre-Production Checklist

**Before submitting to App Store, complete ALL items in:**

📄 **[docs/ios/PRE_PRODUCTION_CHECKLIST.md](./PRE_PRODUCTION_CHECKLIST.md)**

**Key items (App Store WILL reject if missing):**

- [ ] **Remove `NSAppTransportSecurity` from Info.plist** (allows insecure HTTP - dev only!)
- [ ] Remove debug logging (search for `console.log` in production builds)
- [ ] Add app icons (all required sizes in Assets.xcassets)
- [ ] Add privacy policy URL (live and accessible)
- [ ] Test on multiple iOS versions (iOS 15, 16, 17+)
- [ ] Test on multiple device sizes (iPhone SE, iPhone 15 Pro Max, iPad)
- [ ] Test deep links on physical device (universal links don't work in simulator)
- [ ] Test offline mode (airplane mode)

**See full checklist for 18 detailed pre-production steps.**

---

### Create App Store Connect Listing

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+ New App**
3. Fill in app details:
   - **Name:** Capo
   - **Bundle ID:** com.caposport.capo (must match Xcode)
   - **SKU:** capo-ios-app (or any unique identifier)
4. Add metadata:
   - Description
   - Screenshots (required: 6.7" iPhone, 5.5" iPhone)
   - Privacy policy URL (required)
   - Support URL (required)
5. Configure pricing (Free or Paid)

---

### Archive and Upload

**In Xcode:**

1. Select **"Any iOS Device (arm64)"** as target
2. **Product** → **Clean Build Folder** (Cmd+Shift+K)
3. **Product** → **Archive** (Cmd+Shift+B)
4. Wait for archive to complete (5-10 minutes)
5. Xcode Organizer window opens
6. Select archive → Click **Distribute App**
7. Select **App Store Connect** → Next
8. Select **Upload** → Next
9. Wait for validation and upload
10. Check App Store Connect → TestFlight (15-30 min processing)

---

### TestFlight Beta Testing

**After upload completes:**

1. Go to App Store Connect → TestFlight
2. Wait for "Processing" to complete (~15 min)
3. Add internal testers (up to 100, no review required)
4. Add external testers (unlimited, requires Apple review)
5. Share invite link or send via email
6. Testers install TestFlight app → accept invite → test app

---

### Submit for Review

**When ready for public release:**

1. App Store Connect → App → **Prepare for Submission**
2. Select TestFlight build
3. Add review notes (test account credentials if needed)
4. Submit for review
5. Wait 1-3 days for Apple review
6. Fix any rejections and resubmit
7. Upon approval → **Release** (manual or automatic)

---

## 📊 Review Checklist

Apple's common rejection reasons:

- [ ] App crashes on launch
- [ ] Deep links don't work
- [ ] Login/signup broken
- [ ] Missing privacy policy
- [ ] Using private APIs
- [ ] Placeholder content visible
- [ ] Poor performance (slow, memory leaks)
- [ ] Missing iPad support (if declared as universal app)
- [ ] Permissions not explained (camera, location, etc.)
- [ ] In-app purchases not using Apple's system

---

## 🎯 Success Criteria

**iOS setup is complete when:**

✅ App builds successfully in Xcode  
✅ App runs in simulator without errors  
✅ Deep links work (both capo:// and https://)  
✅ Authentication flow works end-to-end  
✅ App installs on physical device  
✅ Universal links work on device (not just simulator)  
✅ App passes basic functionality tests  
✅ Ready for TestFlight/App Store submission

---

## 📚 Resources

**Documentation:**
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Apple Universal Links](https://developer.apple.com/ios/universal-links/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

**Tools:**
- [Xcode](https://apps.apple.com/us/app/xcode/id497799835) (Mac App Store)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Apple Developer Portal](https://developer.apple.com/account)

**Support:**
- Capacitor Discord: https://discord.gg/UPYHgtK
- iOS Dev Forums: https://developer.apple.com/forums/

---

## 🚀 Next Steps

1. **Transfer project to MacBook**
2. **Run:** `npx cap add ios`
3. **Configure Info.plist** (copy from `docs/ios/info_plist_config.xml`)
4. **Test build:** `npm run ios:build`
5. **Test deep links** (see Step 5 above)
6. **Install on device** (requires Apple Developer account)
7. **Begin TestFlight beta testing**

---

**Questions?** Check `docs/mobile/BUILD_WORKFLOW.md` for detailed troubleshooting.

