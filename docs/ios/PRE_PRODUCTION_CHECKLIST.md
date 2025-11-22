# iOS Pre-Production Checklist

**⚠️ CRITICAL: Complete these steps BEFORE submitting to App Store**

Date Created: October 17, 2025  
**Last Updated: January 22, 2025**  
Purpose: Ensure iOS app meets Apple's requirements and security standards

---

## 📊 **CURRENT STATUS (January 22, 2025)**

### ✅ **COMPLETE (95% Done!)**
- [x] App icons (40+ sizes, iOS + Android, all in Git)
- [x] Splash screens (iOS + Android, all orientations)
- [x] API migration (218 uses of `apiFetch()` across 62 files)
- [x] Privacy policy (live at `/privacy`, UK GDPR compliant)
- [x] Deep link configuration (custom scheme + universal links)
- [x] Auth tested on iOS simulator
- [x] Mobile header platform-adaptive (iOS/Android/Web)

### ⏳ **TODO (5% - About 2.5 hours)**
- [ ] Take screenshots (1 hour - iOS simulator)
- [ ] Apple Developer account ($99 + 24h activation wait)
- [ ] App Store Connect listing (30 min)
- [x] ~~Remove `NSAppTransportSecurity`~~ ✅ **AUTOMATED** (configuration-specific plists)
- [ ] Build archive & upload (30 min)

### 🎯 **Next Steps**
1. Take screenshots on Mac using iOS simulator
2. Sign up for Apple Developer account
3. Wait 24 hours for activation
4. Set up App Store Connect listing
5. Remove NSAppTransportSecurity (breaks dev mode - do last!)
6. Archive & submit to TestFlight

**After TestFlight approval:** Implement RSVP with real push notification testing!

---

## 🚨 Security Critical (App Store Will Reject)

### 1. App Transport Security (ATS) - ✅ FIXED AUTOMATICALLY

**✅ AUTOMATED FIX APPLIED:** Configuration-specific Info.plist files (see `docs/ios/ATS_FIX_APPLIED.md`)

**What was done:**
- ✅ Created `Info-Debug.plist` (localhost exception only - safe)
- ✅ Created `Info-Release.plist` (no ATS exceptions - App Store compliant)
- ✅ Updated Xcode project to use correct plist per build configuration
- ✅ All changes in Git (pull on Mac and it works!)

**How it works:**

**Debug builds** (simulator, development):
```xml
<!-- Info-Debug.plist: Only allows localhost HTTP -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSExceptionDomains</key>
  <dict>
    <key>localhost</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <true/>
    </dict>
  </dict>
</dict>
```

**Release builds** (App Store archive):
```xml
<!-- Info-Release.plist: No NSAppTransportSecurity section at all -->
<!-- Full ATS protection, Apple-approved -->
```

**Workflow:**
```bash
# On Mac after git pull
npm run ios:dev      # Uses Info-Debug.plist, localhost works ✅
npm run ios:build    # Uses Info-Release.plist, ATS compliant ✅

# In Xcode:
# Archive → Uses Info-Release.plist automatically ✅
# No manual editing required! ✅
```

**Security improvement:**
- ✅ Debug: Safer (localhost only, not arbitrary HTTP)
- ✅ Release: Compliant (full ATS, no exceptions)
- ✅ No manual ritual (baked into build config)
- ✅ Git-tracked (works on any Mac after pull)

**Verification:**
```bash
# Verify Debug config
grep "Debug.*INFOPLIST_FILE" ios/App/App.xcodeproj/project.pbxproj
# Should show: INFOPLIST_FILE = App/Info-Debug.plist;

# Verify Release config  
grep "Release.*INFOPLIST_FILE" ios/App/App.xcodeproj/project.pbxproj
# Should show: INFOPLIST_FILE = App/Info-Release.plist;
```

**✅ Security Audit Complete:** See `docs/MOBILE_SECURITY_AUDIT.md` for full HTTP/HTTPS analysis.

---

## 🔒 Security & Privacy

### 2. Remove Debug Logging

**Search for:** `console.log`, `console.warn`, `console.error`

**Files to check:**
```bash
# Find all console statements
grep -r "console\." src/ --include="*.ts" --include="*.tsx"
```

**Why:** 
- Debug logs can expose sensitive data
- Affects performance
- Unprofessional in production

**What to do:**
- Remove debug logs
- Or wrap in environment checks: `if (process.env.NODE_ENV === 'development')`

---

### 3. Verify Privacy Policy

**Required before submission:**
- Privacy policy URL must be live
- Must explain data collection
- Must explain how you use Supabase/third-party services

**Where to add:**
- App Store Connect → App Information → Privacy Policy URL

**Example URL:** `https://capo.app/privacy`

---

### 4. Add Privacy Descriptions to Info.plist

**If your app uses these features, you MUST add descriptions:**

```xml
<!-- Camera (if you add photo features later) -->
<key>NSCameraUsageDescription</key>
<string>Capo needs camera access to upload profile photos.</string>

<!-- Photo Library (if you add photo features later) -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Capo needs photo access to select profile photos.</string>

<!-- Location (if you add location features later) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Capo uses your location to find nearby matches.</string>
```

**Note:** Only add these if you actually use the features. Don't add unnecessary permissions.

---

## 🎨 App Store Assets

### 5. App Icons (Required)

**What you need:** Icons in all required sizes

**Sizes required:**
- 1024x1024 (App Store)
- 180x180 (iPhone @3x)
- 120x120 (iPhone @2x)
- 87x87 (iPhone Notification @3x)
- 80x80 (iPad @2x)
- 76x76 (iPad)
- 60x60 (iPhone Notification @2x)
- 58x58 (Settings @2x)
- 40x40 (Spotlight)
- 20x20 (Notification)

**Where to add:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

**Tool recommendation:** Use [Icon Generator](https://www.appicon.co/) or Xcode Asset Catalog

---

### 6. App Screenshots (Required)

**Required sizes:**
- 6.7" iPhone (1290 x 2796) - iPhone 15 Pro Max
- 5.5" iPhone (1242 x 2208) - iPhone 8 Plus

**How many:** 3-10 screenshots per size

**Tips:**
- Show key features (dashboard, match view, stats)
- Use iOS simulator screenshots
- Clean, professional UI
- No debug text or placeholder content

---

### 7. Splash Screens (Optional but Recommended)

**What:** Loading screen shown while app initializes

**Where to add:** `ios/App/App/Assets.xcassets/Splash.imageset/`

**Recommendation:** Simple logo + brand colors, not complex UI

---

## 🧪 Testing Requirements

### 8. Test on Multiple iOS Versions

**Minimum to test:**
- iOS 15.0 (oldest supported by Capacitor 7)
- iOS 16.x (previous major version)
- iOS 17.x (current major version)

**How to test:**
```bash
# In Xcode, select different simulators
# Device → Add Additional Simulators → Download runtimes
```

---

### 9. Test on Multiple Device Sizes

**Required tests:**
- iPhone SE (small screen)
- iPhone 15 Pro (standard)
- iPhone 15 Pro Max (large screen)
- iPad (if you support tablets)

**What to check:**
- No UI clipping
- Readable text sizes
- Buttons not cut off
- Safe area handling works

---

### 10. Test Deep Links on Physical Device

**⚠️ Universal links ONLY work on real devices, not simulator**

**Test both:**
```bash
# Custom scheme (works in simulator too)
capo://join/ABC123

# Universal link (device only)
https://capo.app/join/ABC123
```

**How to test:**
- Send link via Messages to your iPhone
- Tap the link
- Verify app opens to correct page

---

### 11. Test Offline Mode

**Steps:**
1. Enable Airplane Mode on device
2. Open app
3. Verify graceful error handling
4. No crashes
5. Clear messaging about network needed

---

### 12. Test Memory & Performance

**In Xcode:**
1. Run app on device
2. Debug → Memory Report
3. Navigate through all screens
4. Check for memory leaks
5. Verify smooth 60fps scrolling

**Red flags:**
- Memory usage grows continuously
- App slows down after several minutes
- Crashes after extended use

---

## 📱 App Store Connect Setup

### 13. Create App Store Connect Listing

**Required fields:**
- App name: "Capo"
- Subtitle (optional): "Football Stats & Match Management"
- Bundle ID: `com.caposport.capo` (must match Xcode)
- Privacy Policy URL: `https://capo.app/privacy`
- Support URL: `https://capo.app/support`
- Marketing URL (optional): `https://capo.app`
- Description (4000 char max)
- Keywords (100 char max)
- Promotional text (170 char max)

---

### 14. Age Rating Questionnaire

**Complete the questionnaire in App Store Connect**

For Capo (sports app):
- No violence, sexual content, drugs, gambling, horror
- Likely rating: **4+** (suitable for all ages)

---

### 15. Review Notes (Optional but Helpful)

**Add for App Reviewer in App Store Connect:**

```
Test Account for Review:
- Phone: +1 555-0100 (or your test number)
- Verification Code: Will be sent to this number

How to Test:
1. Sign up with test phone number
2. Enter verification code
3. Join a test league with code: TEST123
4. Browse dashboard and stats

Note: This is a multi-tenant app. Each league is isolated.
```

**Why:** Helps reviewers understand your app, reduces rejection risk

---

## 🚀 Final Pre-Submission Steps

### 16. Clean Build & Archive

```bash
# On Mac, clean everything
cd ios
rm -rf App/App/public/ App/Pods/ App/build/
cd ..

# Rebuild static export
npm run build:mobile

# Sync to iOS
npx cap sync ios

# Open Xcode
npx cap open ios

# In Xcode:
# 1. Product → Clean Build Folder (Cmd+Shift+K)
# 2. Select "Any iOS Device (arm64)" as target
# 3. Product → Archive (Cmd+Shift+B)
```

---

### 17. Validate Archive

**In Xcode Organizer (after archive completes):**

1. Select your archive
2. Click **Validate App**
3. Select distribution method
4. Wait for validation (~5 min)
5. Fix any errors/warnings
6. Re-archive if needed

**Common warnings (safe to ignore):**
- Missing Marketing Icon (just upload 1024x1024 later)
- Missing compliance info (answer in App Store Connect)

---

### 18. Upload to App Store Connect

**After successful validation:**

1. Click **Distribute App**
2. Select **App Store Connect**
3. Select **Upload**
4. Wait for upload (~10-20 min)
5. Check App Store Connect → TestFlight (processing ~15-30 min)

---

## ✅ Final Checklist Before Submission

**Copy this checklist and verify each item:**

### Security & Configuration
- [ ] Removed `NSAppTransportSecurity` from Info.plist
- [ ] Removed all `console.log` debug statements
- [ ] Privacy policy URL is live and accessible
- [ ] Added privacy descriptions for any used features

### Assets
- [ ] Added app icon (all required sizes)
- [ ] Created app screenshots (6.7" and 5.5" iPhones)
- [ ] Added splash screen (optional)

### Testing
- [ ] Tested on iOS 15, 16, and 17
- [ ] Tested on small (SE), standard, and large (Pro Max) devices
- [ ] Tested deep links on physical device
- [ ] Tested offline mode (graceful error handling)
- [ ] Checked for memory leaks
- [ ] No crashes during 10+ minute usage session

### App Store Connect
- [ ] Created app listing
- [ ] Added all required metadata (name, description, keywords)
- [ ] Uploaded screenshots
- [ ] Added privacy policy URL
- [ ] Completed age rating questionnaire
- [ ] Added review notes with test account

### Build & Upload
- [ ] Clean build successful
- [ ] Archive created successfully
- [ ] Validation passed (no critical errors)
- [ ] Uploaded to App Store Connect
- [ ] TestFlight processing completed

### Final Verification
- [ ] Installed from TestFlight on physical device
- [ ] All features work as expected
- [ ] Deep links work (both types)
- [ ] Authentication flow works
- [ ] No placeholder content visible
- [ ] Performance is smooth

---

## 📞 What If You Get Rejected?

**Common rejection reasons:**

1. **2.1 - App Completeness**
   - Fix: Remove placeholder content, ensure all features work

2. **4.0 - Design**
   - Fix: Improve UI consistency, fix layout issues

3. **5.1.1 - Privacy**
   - Fix: Add/update privacy policy, explain data usage

4. **Guideline 2.3 - Performance**
   - Fix: Fix crashes, optimize performance, reduce memory usage

**After fixing:**
1. Make changes
2. Create new archive
3. Upload to App Store Connect
4. Resubmit for review
5. Add resolution notes in App Store Connect

---

## 🎯 Success!

**When approved:**
1. Release will appear in App Store Connect
2. Choose **Release** (manual or automatic)
3. App goes live within 24 hours
4. Celebrate! 🎉

**Post-launch:**
- Monitor crash reports (Xcode Organizer → Crashes)
- Respond to user reviews
- Plan updates (bug fixes, new features)

---

## 📚 Quick Reference Links

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [TestFlight Guide](https://developer.apple.com/testflight/)

---

**Last Updated:** October 17, 2025  
**Next Review:** Before first App Store submission

