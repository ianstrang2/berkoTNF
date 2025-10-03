# App-First Onboarding Implementation Plan

**Date**: October 2, 2025  
**Priority**: CRITICAL - Required before RSVP launch  
**Estimated Time**: 45 minutes  
**Status**: Ready to build

---

## Why App-First is Critical

### RSVP Push Notifications Require App

**RSVP features that ONLY work in app**:
- 📱 Match invitation alerts ("Booking open for Sunday")
- ⏰ RSVP reminders ("Haven't RSVP'd yet")
- 🎯 Waitlist offers ("Spot just opened! Claim it now")
- 📢 Last-call notifications ("We're 3 short for Sunday")

**Problem if players use web only**:
- They miss all notifications
- Defeats the entire purpose of RSVP system
- Admin has to manually chase people

**Solution**: Encourage app installation at onboarding (invite link)

---

## Implementation Tasks

### 1. App-First Landing Page (~20 mins)

**File**: `src/app/join/[tenant]/[token]/page.tsx`

**Replace current** (auto-redirects to phone verification)  
**With**: Platform-aware choice screen

**Mobile Browser**:
```tsx
<div className="landing-page">
  <img src="/img/logo.png" className="logo" />
  <h1>Join BerkoTNF</h1>
  
  <div className="benefits">
    <h2>Get instant match alerts:</h2>
    <ul>
      <li>✓ Match invitations</li>
      <li>✓ RSVP reminders</li>
      <li>✓ Waitlist notifications</li>
      <li>✓ Last-call alerts</li>
    </ul>
  </div>
  
  <button className="primary-cta" onClick={openAppOrStore}>
    Download the Capo App
  </button>
  
  <a href={`/join-web/${tenant}/${token}`} className="muted-link">
    Continue on web →
    <span className="warning">⚠️ No RSVP notifications</span>
  </a>
  
  <p className="micro-copy">
    Players who don't install the app risk missing match invites.
  </p>
</div>
```

**Desktop Browser**:
```tsx
<div className="landing-page">
  <img src="/img/logo.png" className="logo" />
  <h1>Join BerkoTNF</h1>
  
  <p>Scan with your phone to install the app:</p>
  
  <QRCode value={`https://capo.app/join/${tenant}/${token}`} />
  
  <p className="muted">Or visit on your phone:</p>
  <code>capo.app/join/{tenant}/{token}</code>
</div>
```

**Platform Detection**:
```typescript
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad/i.test(navigator.userAgent);
```

---

### 2. Pre-filled WhatsApp Message (~10 mins)

**File**: `src/components/admin/player/ClubInviteLinkButton.component.tsx`

**Update modal** to show pre-filled message:

```tsx
const whatsappMessage = `Join BerkoTNF on Capo ⚽

All match invites and RSVPs happen in the Capo app.
Download to get notifications and secure your spot:

👉 ${inviteUrl}`;

<Modal>
  <h3>Club Invite Link</h3>
  
  <Tabs>
    <Tab>Pre-filled Message</Tab>
    <Tab>Link Only</Tab>
  </Tabs>
  
  {activeTab === 'message' && (
    <div>
      <p>Copy and paste into WhatsApp:</p>
      <textarea value={whatsappMessage} readOnly rows={6} />
      <button onClick={() => copyToClipboard(whatsappMessage)}>
        📋 Copy Message
      </button>
    </div>
  )}
  
  {activeTab === 'link' && (
    <div>
      <input value={inviteUrl} readOnly />
      <button onClick={() => copyToClipboard(inviteUrl)}>
        🔗 Copy Link
      </button>
    </div>
  )}
</Modal>
```

---

### 3. Deep Link Configuration (~15 mins)

**File**: `capacitor.config.ts`

```typescript
const config: CapacitorConfig = {
  appId: 'com.caposport.capo',
  appName: 'Capo',
  webDir: 'public',
  server: {
    url: 'http://10.0.2.2:3000',
    cleartext: true,
  },
  plugins: {
    App: {
      appUrlOpen: {
        // Deep link schemes
        customScheme: 'capo',
      },
    },
  },
};
```

**File**: `android/app/src/main/AndroidManifest.xml`

```xml
<activity android:name=".MainActivity">
  <!-- Existing intent filters -->
  
  <!-- Deep link intent filter -->
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    
    <!-- capo://join/tenant/token -->
    <data android:scheme="capo" android:host="join" />
    
    <!-- https://capo.app/join/tenant/token -->
    <data android:scheme="https" android:host="capo.app" android:pathPrefix="/join" />
  </intent-filter>
</activity>
```

**File**: `src/app/layout.tsx` or dedicated handler

```typescript
import { App } from '@capacitor/app';

// Listen for deep links
App.addListener('appUrlOpen', (data: any) => {
  // data.url = "capo://join/berkotnf/abc123" or "https://capo.app/join/..."
  const url = new URL(data.url);
  const slug = url.hostname || url.pathname.split('/')[1];
  
  // Navigate within app
  window.location.href = data.url.replace('capo://', 'http://localhost:3000/');
});
```

---

## Implementation Checklist

### Landing Page
- [ ] Detect mobile vs desktop
- [ ] Mobile: Show app download CTA + web fallback
- [ ] Desktop: Show QR code
- [ ] Style with soft-UI (purple/pink gradient buttons)
- [ ] "Try to open app" logic (deep link, then fallback)

### Invite Message
- [ ] Add tabs to invite link modal ("Message" / "Link Only")
- [ ] Pre-filled WhatsApp message with context
- [ ] Copy button for full message
- [ ] Copy button for link only

### Deep Links
- [ ] Update capacitor.config.ts with custom scheme
- [ ] Update AndroidManifest.xml with intent filters
- [ ] Add App listener for deep link handling
- [ ] Test: capo://join/berkotnf/abc123 opens app
- [ ] Test: Web fallback if app not installed

### Testing
- [ ] Click invite link on Android: Opens app (if installed)
- [ ] Click invite link on Android: Shows download page (if not installed)
- [ ] Click invite link on desktop: Shows QR code
- [ ] Pre-filled message copies correctly
- [ ] Deep link navigates to correct screen in app

---

## App Store Buttons

**Android**:
```tsx
<a href="https://play.google.com/store/apps/details?id=com.caposport.capo">
  <img src="/play-store-badge.png" alt="Get it on Google Play" />
</a>
```

**iOS** (future):
```tsx
<a href="https://apps.apple.com/app/capo/id123456">
  <img src="/app-store-badge.png" alt="Download on App Store" />
</a>
```

**For now** (testing): Link to APK or TestFlight

---

## Success Criteria

**Onboarding flow works when**:
1. ✅ Admin shares pre-filled message in WhatsApp
2. ✅ Player taps link on phone → Prompted to download app
3. ✅ Player downloads → App opens with invite link → Phone verify → Auto-linked!
4. ✅ Desktop users see QR code (can't install on desktop)
5. ✅ Web fallback exists but clearly marked as inferior

**Result**: Maximum app adoption for RSVP notification coverage

---

**Ready to build!** This is critical infrastructure for RSVP launch.

