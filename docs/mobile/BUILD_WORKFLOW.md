# Capacitor Build Workflow

**Platform:** iOS & Android  
**Framework:** Next.js 14 + Capacitor 7  
**Dev Environment:** Windows PC (Cursor) + MacBook (Xcode for iOS builds)

---

## Overview

This document explains how to build and test the Capo mobile app for iOS and Android using Capacitor. The workflow is optimized for development on Windows with iOS builds on Mac.

---

## Build Modes

### 🔷 Development Mode (Live Reload)

**Purpose:** Test changes in real-time without rebuilding the app.

**How it works:**
- Next.js dev server runs on your PC (`http://localhost:3000`)
- Capacitor loads the web app from your PC's IP address
- Changes to code instantly reflect in the simulator/device

**Commands:**

```bash
# iOS (run on MacBook)
npm run ios:dev
# Opens iOS simulator with live reload enabled

# Android (run on PC)
npm run android:dev
# Opens Android emulator/device with live reload enabled
```

**What happens (Capacitor 7):**
1. Capacitor automatically detects running dev server on `localhost:3000`
2. Launches simulator/emulator connected to your dev server
3. Enables hot module reload (HMR) for instant updates
4. Auto-discovers your machine's IP for device connections

**Note:** Ensure `npm run dev` is running before launching with `--live-reload` flag, or Capacitor will wait for the server to start.

**Requirements:**
- iOS: MacBook must be on the same WiFi network as dev machine
- Android: Can use emulator on same PC (uses `10.0.2.2` alias) or device on same WiFi
- Firewall: Allow port 3000 for incoming connections

---

### 🔶 Production Mode (Release Build)

**Purpose:** Build the final app bundle for App Store/Play Store submission or testing production behavior.

**How it works:**
- Next.js performs static export to `out/` directory
- Capacitor copies static files to native platforms
- App runs entirely offline with embedded web assets

**Commands:**

```bash
# iOS (run on MacBook)
npm run ios:build
# Builds static export, syncs to iOS, opens Xcode

# Android (run on PC)
npm run android:build
# Builds static export, syncs to Android, opens Android Studio
```

**What happens:**
1. Sets `CAPACITOR_BUILD=true` environment variable
2. Runs Prisma generation
3. Builds Next.js with `output: 'export'` (static files to `out/`)
4. Runs `npx cap sync` (copies `out/` to `ios/App/public` and `android/app/src/main/assets/public`)
5. Opens Xcode (iOS) or Android Studio (Android)
6. You manually build/archive the app in the IDE

---

## Step-by-Step Workflows

### 📱 iOS Release Build (Mac)

**Prerequisites:**
- Xcode installed (download from Mac App Store)
- Apple Developer account ($99/year for App Store submission)
- Project transferred to Mac (Git clone or file transfer)

**Steps:**

1. **On Mac:** Clone/pull latest code
   ```bash
   cd ~/BerkoTNF
   git pull origin main
   npm install
   ```

2. **Build for iOS:**
   ```bash
   npm run ios:build
   ```
   This builds static export and opens Xcode automatically.

3. **In Xcode:**
   - Select device/simulator target (top toolbar)
   - For simulator testing: Select "iPhone 15 Pro" or similar
   - For device testing: Connect iPhone via USB, select your device
   - For App Store: Select "Any iOS Device (arm64)"

4. **Build & Run:**
   - **Simulator/Device testing:** Click ▶️ Play button (or Cmd+R)
   - **App Store archive:** Product → Archive

5. **Test deep links:**
   ```bash
   # In simulator/device
   xcrun simctl openurl booted "capo://join/ABC123"
   # OR
   xcrun simctl openurl booted "https://capo.app/join/ABC123"
   ```

---

### 🤖 Android Release Build (PC or Mac)

**Prerequisites:**
- Android Studio installed
- Android SDK configured

**Steps:**

1. **Build for Android:**
   ```bash
   npm run android:build
   ```
   This builds static export and opens Android Studio automatically.

2. **In Android Studio:**
   - Wait for Gradle sync to complete
   - Select device/emulator from toolbar dropdown
   - For emulator: Launch AVD (Pixel 6 recommended)
   - For device: Enable USB debugging, connect via USB

3. **Build & Run:**
   - **Testing:** Click ▶️ Run button (or Shift+F10)
   - **Release APK:** Build → Build Bundle(s) / APK(s) → Build APK(s)
   - **Release AAB (Play Store):** Build → Generate Signed Bundle / APK

4. **Test deep links:**
   ```bash
   # In emulator/device
   adb shell am start -a android.intent.action.VIEW -d "capo://join/ABC123"
   # OR
   adb shell am start -a android.intent.action.VIEW -d "https://capo.app/join/ABC123"
   ```

---

## Configuration Files

### `capacitor.config.ts`

```typescript
const config: CapacitorConfig = {
  appId: 'com.caposport.capo',
  appName: 'Capo',
  webDir: 'out', // ✅ Points to Next.js static export directory
  
  // ❌ NO server config here!
  // Dev mode uses --livereload flag (injects server config automatically)
  // Prod mode uses static files from out/
};
```

**Key points:**
- `webDir: 'out'` - Required for Next.js static export
- No `server` object - Prevents loading dev server in production
- Deep link config is in platform-specific files (Info.plist, AndroidManifest.xml)

---

### `next.config.mjs`

```javascript
const nextConfig = {
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,
  images: {
    unoptimized: process.env.CAPACITOR_BUILD === 'true' ? true : false,
  },
  // ... other config
};
```

**Key points:**
- `output: 'export'` - Enables static export mode (only when `CAPACITOR_BUILD=true`)
- `images.unoptimized: true` - Required for static export (Next.js image optimization requires server)
- Web builds (`npm run build`) still use server mode
- Mobile builds (`npm run build:mobile`) use static export

---

### `package.json` Scripts

```json
{
  "scripts": {
    "dev": "next dev",                     // Standard Next.js dev server
    "build": "prisma generate && next build", // Web production build
    
    "build:mobile": "CAPACITOR_BUILD=true npm run build && npx cap sync",
    "ios:dev": "npx cap run ios --livereload --external",
    "ios:build": "npm run build:mobile && npx cap open ios",
    "android:dev": "npx cap run android --livereload --external",
    "android:build": "npm run build:mobile && npx cap open android"
  }
}
```

---

## Deep Link Testing

### Test URLs

**Custom Scheme (always works):**
```
capo://join/ABC123?token=xyz
```

**Universal Links (requires domain verification):**
```
https://capo.app/join/ABC123?token=xyz
```

### Testing Commands

**iOS Simulator:**
```bash
xcrun simctl openurl booted "capo://join/ABC123"
```

**Android Emulator/Device:**
```bash
adb shell am start -a android.intent.action.VIEW -d "capo://join/ABC123"
```

### Verification

Deep links are handled by `DeepLinkHandler.component.tsx`:
- Listens for `appUrlOpen` events from `@capacitor/app`
- Parses URL and navigates using Next.js router
- Supports `capo://`, `https://capo.app`, and localhost URLs

---

## Troubleshooting

### White Screen on iOS/Android

**Symptom:** App shows blank white screen

**Causes:**
1. **Dev server config still active** - Check `capacitor.config.ts` has NO `server` object
2. **Static files not built** - Run `npm run build:mobile` before opening Xcode/Android Studio
3. **Wrong webDir** - Must be `webDir: 'out'` (not `public` or `.next`)
4. **Files not synced** - Run `npx cap sync` to copy `out/` to native platforms

**Fix:**
```bash
# Clean and rebuild
rm -rf out/ .next/
npm run build:mobile
```

---

### Live Reload Not Working

**Symptom:** Changes don't appear in simulator/emulator

**Causes:**
1. **Firewall blocking port 3000** - Allow incoming connections on port 3000
2. **Wrong IP address** - Mac/device not on same WiFi network as dev machine
3. **Dev server not running** - Ensure `npm run dev` is running

**Fix:**
```bash
# Kill any stale processes
lsof -ti:3000 | xargs kill -9

# Start dev server FIRST
npm run dev

# Then launch mobile app (in new terminal)
npm run ios:dev

# Capacitor 7 automatically detects the dev server
# No manual IP configuration needed!
```

---

### API Architecture Explanation

**How API calls work in mobile vs web:**

| Environment | UI Source | API Source | How It Works |
|-------------|-----------|------------|--------------|
| **Web Dev** | `localhost:3000` | `localhost:3000/api` | Same origin, relative paths |
| **Web Prod** | Vercel | Vercel `/api` | Same origin, relative paths |
| **Mobile Dev** | Dev server (live reload) | `localhost:3000/api` | Connected via WiFi IP |
| **Mobile Prod** | Bundled in app (`out/`) | `https://app.caposport.com/api` | HTTPS to production |

**Key Point:** Mobile production builds call your deployed API, not embedded routes.

**Implementation:** Use `src/lib/apiConfig.ts` helper in all API calls:

```typescript
import { apiFetch } from '@/lib/apiConfig';

// ✅ Automatically uses correct URL for environment
const response = await apiFetch('/players');

// ❌ Don't hardcode (won't work in mobile)
const response = await fetch('/api/players');
```

**The helper automatically returns:**
- **Mobile app:** `https://app.caposport.com/api/players`
- **Web app:** `/api/players`
- **Local dev:** `http://localhost:3000/api/players`

---

## iOS-Specific Setup (First Time Only)

### Add iOS Platform

**On Mac:**
```bash
npx cap add ios
```

Creates `ios/` directory with Xcode project.

---

### Configure Deep Links (Info.plist)

The `Info.plist` file is located at `ios/App/App/Info.plist`. Add these entries:

```xml
<!-- Custom URL Scheme (capo://) -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.caposport.capo</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>capo</string>
    </array>
  </dict>
</array>

<!-- Universal Links (https://capo.app/join) -->
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:capo.app</string>
  <string>applinks:www.capo.app</string>
</array>
```

---

### Universal Links Setup

**Requirements:**
1. Domain verification file at `https://capo.app/.well-known/apple-app-site-association`
2. JSON file format:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.caposport.capo",
        "paths": ["/join/*"]
      }
    ]
  }
}
```

3. Replace `TEAMID` with your Apple Developer Team ID (found in Xcode → Signing & Capabilities)

---

### Xcode Signing (Required for Device/App Store)

1. Open Xcode project: `npm run ios:build`
2. Click project name (top left)
3. Select "Signing & Capabilities" tab
4. Check "Automatically manage signing"
5. Select your Apple Developer team
6. Xcode will generate provisioning profile

---

## Android-Specific Setup (Already Configured)

Your Android setup is already complete:
- ✅ `android/` platform exists
- ✅ Deep links configured in `AndroidManifest.xml`
- ✅ Custom scheme: `capo://join`
- ✅ Universal links: `https://capo.app/join`

No additional setup needed!

---

## App Store Submission Checklist

### iOS App Store

- [ ] Create app in App Store Connect (developer.apple.com)
- [ ] Configure app metadata (name, description, screenshots, privacy policy)
- [ ] Build and archive in Xcode (Product → Archive)
- [ ] Upload to App Store Connect (Xcode Organizer → Distribute App)
- [ ] Submit for review (expect 1-3 days)
- [ ] Configure universal links domain verification

### Google Play Store

- [ ] Create app in Google Play Console (play.google.com/console)
- [ ] Configure app metadata (name, description, screenshots, privacy policy)
- [ ] Generate signed release AAB (Android Studio → Build → Generate Signed Bundle)
- [ ] Upload AAB to Play Console (Production track)
- [ ] Submit for review (expect 1-7 days)
- [ ] Configure Digital Asset Links for universal links

---

## Quick Reference

| Task | Command | Platform |
|------|---------|----------|
| Dev server (Next.js) | `npm run dev` | All |
| iOS live reload | `npm run ios:dev` | Mac |
| iOS production build | `npm run ios:build` | Mac |
| Android live reload | `npm run android:dev` | PC/Mac |
| Android production build | `npm run android:build` | PC/Mac |
| Build static export | `npm run build:mobile` | PC/Mac |
| Sync files to native | `npx cap sync` | PC/Mac |
| Open Xcode | `npx cap open ios` | Mac |
| Open Android Studio | `npx cap open android` | PC/Mac |

---

## Support

For Capacitor-specific issues:
- Docs: https://capacitorjs.com/docs
- Discord: https://discord.gg/UPYHgtK

For Next.js static export issues:
- Docs: https://nextjs.org/docs/app/building-your-application/deploying/static-exports

