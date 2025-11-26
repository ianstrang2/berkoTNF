# 📱 Capo Mobile App - Vibe Coder Guide

**Purpose:** Human-language guide for common mobile dev tasks  
**Audience:** Future you who forgot the commands  
**Last Updated:** November 26, 2025

---

## 🎯 **Quick Command Reference**

| What I want to do | Command |
|-------------------|---------|
| **Test on web** | `npm run dev` |
| **Test on iOS simulator (dev)** | `npm run dev` → `npm run ios:dev` (on Mac) |
| **Test on iOS simulator (prod)** | `npm run ios:build` (on Mac, loads from Vercel) |
| **Take App Store screenshots** | `npm run ios:build` → Run in Xcode → Cmd+S |
| **Archive for App Store** | `npm run ios:build` → Archive in Xcode |
| **Build for Play Store** | `npm run android:build` |

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

### **2. Test iOS Changes (Pick ONE Method)**

**On PC - make changes and push:**
```bash
git add .
git commit -m "feat: update feature"
git push origin main
```

**On Mac - pull and test:**
```bash
cd ~/Developer/capo
git pull origin main
```

**Now choose ONE of these two methods:**

---

#### **Method A: Terminal Only (Faster, Simpler)**

**For:** Quick testing, live reload, no Xcode needed

```bash
# Terminal 1 - Dev server
npm run dev

# Terminal 2 - iOS simulator
npm run ios:dev
```

**Logs:**
- JS/TS logs: Terminal 2
- Network logs: Safari Web Inspector (Develop → Simulator)
- Native logs: Terminal 2

**When to use:** Daily development, quick testing

---

#### **Method B: Xcode (Full Native Logs)**

**For:** Debugging native issues, seeing detailed Xcode console

```bash
# Terminal 1 - Dev server
npm run dev

# Terminal 2 - Open in Xcode (once)
npx cap sync ios
npx cap open ios

# In Xcode:
# 1. Select simulator at top (iPhone 17 Pro)
# 2. Press ▶️ Run button
# 3. View logs: Cmd+Shift+Y (debug area)
```

**Logs:**
- Everything in Xcode console (JS + native)
- Better stack traces
- More debug info

**When to use:** Debugging crashes, native plugin issues

---

**🚨 DON'T mix methods!** Pick one:
- Use `npm run ios:dev` OR Xcode Run, not both
- Only one can "own" the app at a time

**🎯 Recommendation:** Use Method A (Terminal) for 95% of dev work. It's faster!

---

### **3. Take Screenshots for App Store**

```bash
# On Mac
cd /developer/capo
git pull origin main
npm run ios:build

# Xcode opens automatically
# 1. Select "iPhone 17 Pro Max" (for 6.9" screenshots)
# 2. Press ▶️ Run button
# 3. App loads from https://app.caposport.com
# 4. Navigate to screens, press Cmd+S to save screenshots
```

**Screenshots save to Desktop automatically!**

---

### **4. Submit to App Store (Once)**

```bash
# On Mac
cd /developer/capo
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

### **5. Submit to Play Store (Once)**

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
Your App = Native Webview Loading Your Website

┌─────────────────────────────────────┐
│  Native iOS/Android Shell          │
│  ┌───────────────────────────────┐  │
│  │  Safari/Chrome WebView        │  │
│  │                               │  │
│  │  Loads from:                  │  │
│  │  • Dev: localhost:3000        │  │
│  │  • Prod: app.caposport.com    │  │
│  │                               │  │
│  │  Shows your full Next.js app │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Think of it as:** A native app frame around your website!

**Two modes:**

1. **Dev mode** (`npm run ios:dev`):
   - Webview loads `http://localhost:3000`
   - Live reload (instant updates)
   - Perfect for development
   - Needs dev server running

2. **Prod mode** (`npm run ios:build`):
   - Webview loads `https://app.caposport.com`
   - No local server needed
   - Perfect for screenshots/archiving
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

### **"White screen in dev mode"**

**Fix:**
```bash
# On Mac
# 1. Check Terminal 1: Is `npm run dev` running?
# 2. Kill simulator
# 3. Try again:
npm run ios:dev
```

### **"White screen in prod mode"**

**Fix:**
```bash
# Check if Vercel is working
# Open in browser: https://app.caposport.com
# If browser works but simulator doesn't:
npx cap sync ios
npm run ios:build
# Try again in Xcode
```

### **"Can't connect to localhost in dev mode"**

**Fix:**
1. Check Terminal 1: Is `npm run dev` running?
2. Wait for "Ready on http://localhost:3000"
3. Then run Terminal 2: `npm run ios:dev`
4. Still broken? Restart dev server and try again

### **"API calls fail"**

**Dev mode:** Check localhost:3000 is running
**Prod mode:** Check https://app.caposport.com works in browser

**Already fixed in your app** (218 API migrations done!)

### **"Archive fails validation"**

**Check:**
1. Did you pull latest from Git?
2. Is Vercel deployment working?
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

# iOS testing - dev mode (Mac)
# Terminal 1:
npm run dev
# Terminal 2:
npm run ios:dev

# iOS testing - prod mode (Mac)
git pull && npm run ios:build
# Then: Run in Xcode

# iOS screenshots (Mac)
git pull && npm run ios:build
# Then: Run in Xcode → Cmd+S on each screen

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

**Essential (Read These):**
- `MOBILE_APP_STATUS.md` - What's done/not done
- `MOBILE_USER_GUIDE.md` - This file (commands)
- `MOBILE_SPEC.md` - Architecture

**Reference (When Needed):**
- `ios/PRE_PRODUCTION_CHECKLIST.md` - Pre-submission steps
- `MOBILE_SECURITY_AUDIT.md` - Security audit
- `ios/ATS_FIX_APPLIED.md` - Info.plist fix details
- `mobile/BUILD_WORKFLOW.md` - Build process details

---

## 🧠 **Mental Model: Dev vs Prod**

**Dev Mode** (for development):
- Run: Terminal 1: `npm run dev` + Terminal 2: `npm run ios:dev`
- Loads: From your local dev server (localhost:3000)
- Speed: Instant updates (live reload)
- Network: Needs localhost connection
- Use for: Development, testing, iteration

**Prod Mode** (for screenshots/submission):
- Run: `npm run ios:build` (no server needed!)
- Loads: From your live Vercel deployment (app.caposport.com)
- Speed: Fast (loads from production)
- Network: Needs internet
- Use for: Screenshots, App Store submission, TestFlight

**Rule of thumb:** 
- Coding/testing → Dev mode (with localhost)
- Screenshots/archiving → Prod mode (with Vercel)

**Key insight:** In prod mode, you don't need to build anything locally! The app just loads your live website. 🎯

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

## 🚨 **Important: Architecture (Webview Wrapper)**

**How it works:**
- Mobile app = Native shell with a webview
- Webview loads your website (like Safari, but in an app)
- No static export, no complex builds
- Just point the webview at the right URL

**Two URLs:**
- Dev: `http://localhost:3000` (your local dev server)
- Prod: `https://app.caposport.com` (your Vercel deployment)

**What you do:**
- Nothing! Scripts handle this automatically.
- `npm run ios:dev` → loads localhost
- `npm run ios:build` → loads Vercel

**Benefits:**
- ✅ Simple architecture (no export drama)
- ✅ All features work (API routes, Prisma, etc.)
- ✅ Easy debugging (Safari Web Inspector)
- ✅ Fast iteration (change code, reload)

**Trade-off:**
- ❌ Needs internet to use app (that's fine - football app needs connection anyway!)

See `docs/MOBILE_SPEC.md` for technical details.

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

