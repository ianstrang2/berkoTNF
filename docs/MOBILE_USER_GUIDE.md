# 📱 Capo Mobile App - Vibe Coder Guide

**Purpose:** Human-language guide for common mobile dev tasks  
**Audience:** Future you who forgot the commands  
**Last Updated:** January 22, 2025

---

## 🎯 **Quick Command Reference**

| What I want to do | Command |
|-------------------|---------|
| **Test on web** | `npm run dev` |
| **Test on iOS simulator** | `npm run dev` → `npm run ios:dev` (on Mac) |
| **Test on Android emulator** | `npm run dev` → `npm run android:dev` |
| **Build for App Store** | `npm run ios:build` (on Mac) |
| **Build for Play Store** | `npm run android:build` |
| **Just rebuild static files** | `npm run build:mobile` |

---

## 🧭 **Big Picture: PC + Mac Setup**

### **Your Machines:**

**🖥️ PC (Windows - Main Dev):**
- Where you write code (Cursor)
- Run web app (`npm run dev`)
- Test Android (optional)
- Push to Git

**💻 Mac (iOS Build Machine):**
- Pull from Git
- Run iOS simulator
- Build for App Store
- That's it!

**Both use same Git repo** - develop on PC, pull on Mac!

---

## 🚀 **Common Workflows**

### **1. Normal Web Development (Daily)**

```bash
# On PC
npm run dev
# Opens http://localhost:3000
# Make changes, test, commit
```

**Nothing mobile-specific!** Your normal workflow.

---

### **2. Test iOS Changes (When Needed)**

```bash
# On PC - make changes and push
git add .
git commit -m "feat: update feature"
git push origin main

# On Mac - pull and test
cd ~/Developer/capo
git pull origin main

# Terminal 1
npm run dev

# Terminal 2
npm run ios:dev
```

**What this does:**
- Launches iOS simulator
- Connects to your dev server at `localhost:3000`
- Live reload - changes appear instantly
- Same as web dev but in simulator!

**🎯 Pro tip:** Keep Terminal 1 running, only restart Terminal 2 when needed.

---

### **3. Submit to App Store (Once)**

```bash
# On Mac
git pull origin main
npm run ios:build

# Xcode opens automatically
# 1. Select "Any iOS Device (arm64)"
# 2. Product → Archive
# 3. Distribute App → App Store Connect
# 4. Upload
```

**First time:** Takes 10-20 minutes  
**Updates:** Takes 5-10 minutes

**Apple reviews in 1-5 days** (you wait, nothing to do)

---

### **4. Submit to Play Store (Once)**

```bash
# On PC
npm run android:build

# Android Studio opens
# Build → Generate Signed Bundle
# Follow wizard
# Upload to Play Console
```

**Google reviews in hours to 1 day** (much faster than Apple!)

---

## 🧩 **How Capacitor Works (Simple Explanation)**

```
Your App = Web App in Native Wrapper

┌─────────────────────────────────────┐
│  Capacitor (iOS/Android Shell)      │
│  ┌───────────────────────────────┐  │
│  │  Your Web App (Next.js UI)   │  │
│  │  - All your React components │  │
│  │  - Tailwind CSS styling      │  │
│  │  - Your forms, dashboards    │  │
│  └───────────────────────────────┘  │
│               ↕                      │
│  API calls to: app.caposport.com    │
└─────────────────────────────────────┘
```

**Two modes:**

1. **Dev mode** (`npm run ios:dev`):
   - Loads from `http://localhost:3000`
   - Live reload (instant updates)
   - Perfect for development

2. **Prod mode** (`npm run ios:build`):
   - UI bundled in app (`out/` folder)
   - Calls remote API (`https://app.caposport.com`)
   - Fast, offline-capable
   - App Store ready

---

## 📱 **Testing on Real Devices**

### **iOS (Physical iPhone):**

**Option A: TestFlight (Recommended)**
1. Submit to TestFlight (see workflow above)
2. Install TestFlight app from App Store
3. Get invite email
4. Install your app
5. Test on real device!

**Option B: Direct from Xcode**
1. Connect iPhone via USB to Mac
2. In Xcode: Select your iPhone as target
3. Press ⌘R (Run)
4. May need to trust computer on iPhone

---

### **Android (Physical Phone):**

**Option A: Internal Testing (Recommended)**
1. Submit to Play Console Internal Testing
2. Add your email as tester
3. Get invite link
4. Install on phone

**Option B: Direct via USB**
1. Enable Developer Mode on Android phone
2. Enable USB Debugging
3. Connect via USB to PC
4. `npm run android:dev`
5. Select your device

---

## 🎨 **Version Numbers (Before Each Release)**

### **Bump Version Before Submitting:**

**iOS:**
```bash
# Edit on Mac
nano ios/App/App/Info.plist

# Find and update:
<key>CFBundleShortVersionString</key>
<string>1.0</string>  <!-- Change to 1.1, 1.2, etc. -->

<key>CFBundleVersion</key>
<string>1</string>  <!-- Increment: 1, 2, 3, etc. -->
```

**Android:**
```bash
# Edit on PC
nano android/app/build.gradle

# Find and update:
versionName "1.0"  // Change to "1.1", "1.2", etc.
versionCode 1      // Increment: 1, 2, 3, etc.
```

**🎯 Pro tip:** Do this before EACH submission to stores!

---

## 🧪 **Testing Deep Links**

### **Test Custom Scheme (Works in Simulator):**

```bash
# On Mac, with simulator running
xcrun simctl openurl booted "capo://player/dashboard"

# Should open your app to dashboard
```

### **Test Universal Links (Needs Real Device):**

Send yourself a text message with:
```
https://capo.app/join/berkotnf/abc123
```

Tap it on your iPhone → should open app (not Safari)

---

## 🆘 **Common Problems**

### **"White screen on iOS"**

**Fix:**
```bash
# On Mac
npm run build:mobile  # Rebuild static files
npx cap sync ios      # Copy to iOS project
npm run ios:dev       # Relaunch
```

### **"Can't connect to localhost in dev mode"**

**Fix:**
1. Check Terminal 1: Is `npm run dev` running?
2. Check Terminal 2: Did you run `npm run ios:dev`?
3. Still broken? Close simulator, try again

### **"API calls fail in production build"**

**Probably:**
- API not deployed: Check https://app.caposport.com/api/players works
- CORS issue: API needs to allow `capacitor://localhost` origin

**Already fixed in your app** (218 API migrations done!)

### **"Archive fails validation"**

**Check:**
1. Did you pull latest from Git? (should have Info-Release.plist now)
2. Is scheme set to "Release"? (should be automatic)
3. Any errors in Xcode? Read carefully!

---

## 📋 **Pre-Submission Quick Checklist**

**iOS:**
- [ ] `git pull` on Mac (get latest code)
- [ ] Version numbers bumped in Info.plist
- [ ] `npm run ios:build` → Archive in Xcode
- [ ] Validate passes (no errors)
- [ ] Upload to App Store Connect

**Android:**
- [ ] Version numbers bumped in build.gradle
- [ ] `npm run android:build`
- [ ] Generate Signed Bundle
- [ ] Upload to Play Console

**Both:**
- [ ] Test on real device via TestFlight/Internal Testing
- [ ] No crashes
- [ ] All features work
- [ ] Ready for public release!

---

## 🎯 **One-Liners You'll Use**

```bash
# Daily dev (PC)
npm run dev

# iOS testing (Mac)
git pull && npm run ios:dev

# iOS release (Mac)
git pull && npm run ios:build
# Then: Product → Archive in Xcode

# Android release (PC)
npm run android:build
# Then: Generate Signed Bundle in Android Studio
```

---

## 📚 **When You Need More Details**

**All docs in `/docs` folder:**

**Status & Checklist:**
- `MOBILE_APP_STATUS.md` - What's done/not done
- `ios/PRE_PRODUCTION_CHECKLIST.md` - Step-by-step submission

**Technical Setup:**
- `MOBILE_SPEC.md` - How everything is configured
- `mobile/BUILD_WORKFLOW.md` - Deep dive on build process

**Specific Issues:**
- `MOBILE_SECURITY_AUDIT.md` - HTTP/HTTPS analysis
- `ios/ATS_FIX_APPLIED.md` - Info.plist security fix

**Quick References:**
- `mobile/CAPACITOR_7_CHANGES.md` - CLI syntax changes
- `ios/SETUP_CHECKLIST.md` - First-time Mac setup
- `MOBILE_DOCS_INDEX.md` - Master index (finding anything)

---

## 🧠 **Mental Model: Dev vs Prod**

**Dev Mode** (what you use 95% of the time):
- Run: `npm run ios:dev` or `npm run android:dev`
- Loads: From your local dev server
- Speed: Instant updates (live reload)
- Network: Needs WiFi to dev machine
- Use for: Development, testing, iteration

**Prod Mode** (what users get):
- Build: `npm run ios:build` creates archive
- Loads: Static files bundled in app
- Speed: Fast (no network needed for UI)
- Network: Only for API calls
- Use for: App Store submission, TestFlight

**Rule of thumb:** If you're coding, use dev mode. If you're submitting, use prod mode.

---

## 🎉 **Success Indicators**

**You know it's working when:**
- ✅ iOS simulator shows your app (not white screen)
- ✅ Changes in code appear in simulator (live reload)
- ✅ Login works (phone OTP)
- ✅ Dashboard loads with data
- ✅ No console errors about failed API calls

**You're ready to submit when:**
- ✅ All of above ✅
- ✅ Tested on real device
- ✅ No crashes during 10-minute usage
- ✅ Version numbers updated
- ✅ Screenshots taken
- ✅ Privacy policy live

---

## 🚨 **Important: ATS Security (Already Fixed!)**

**What it was:**
- Info.plist had `NSAllowsArbitraryLoads = true`
- Needed for dev mode
- Apple rejects for App Store

**What we did:**
- ✅ Created Info-Debug.plist (dev builds, localhost only)
- ✅ Created Info-Release.plist (App Store builds, no HTTP)
- ✅ Xcode automatically uses correct one
- ✅ **No manual steps required!**

**What you do:**
- Nothing! Just `git pull` on Mac and it works.

See `docs/ios/ATS_FIX_APPLIED.md` for details.

---

## 🔗 **Quick Links**

**For Future You (all in `/docs`):**
- Lost? Start with `MOBILE_DOCS_INDEX.md`
- Status? Check `MOBILE_APP_STATUS.md`
- Submitting? Read `ios/PRE_PRODUCTION_CHECKLIST.md`
- Debugging? Check `mobile/BUILD_WORKFLOW.md` → Troubleshooting

**Apple:**
- [App Store Connect](https://appstoreconnect.apple.com)
- [TestFlight](https://developer.apple.com/testflight/)

**Google:**
- [Play Console](https://play.google.com/console)

---

**Remember:** You're a vibe coder. When in doubt, `git pull && npm run ios:dev` and see what happens! 🚀

