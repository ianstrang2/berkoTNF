# Auth Final Polish - Implementation Plan

**Date**: October 2, 2025  
**Priority**: Complete before RSVP launch  
**Estimated Time**: 1 hour  
**Status**: Ready to build

---

## Tasks Remaining

### 1. Move Admin Toggle to Edit Modal (10 mins)

**Current**: Admin toggle is a column in player table (cluttered, disabled for unclaimed players)

**New**: Move to edit player modal as a toggle field

**Location in Modal**:
```
Player Name: [____________]
Phone: [_____________]
Ringer [toggle] Retired [toggle] 👑 Admin [toggle]
Club: [________▼]
────────────────
Player Ratings...
```

**Changes**:
- Remove "Admin" column from player table (`PlayerManager.component.tsx`)
- Add admin toggle to `PlayerFormModal.component.tsx`
- Add to `PlayerFormData` type (already has `isAdmin`)
- Update API to save `is_admin` field (already handles it)
- Only show toggle if `authUserId` exists (can't make unclaimed player admin)

**Benefits**:
- Cleaner table (one less column)
- Makes sense contextually (edit player settings)
- Prevents accidental clicks

---

### 2. Add Reject Confirmation Modal (15 mins)

**Current**: Just browser `confirm()` dialog

**New**: Soft-UI styled modal matching your delete/reset modals

**Design** (based on your "Delete Season" modal):
```tsx
<Modal>
  <Icon /> {/* Purple gradient rounded square */}
  <h3>Reject Join Request?</h3>
  
  <div className="info-box"> {/* Light gray background */}
    <p>Player: John Smith (if name provided) or Unknown</p>
    <p>Phone: +447949251277</p>
  </div>
  
  <div className="buttons">
    <button className="gray-gradient">Cancel</button>
    <button className="purple-gradient">Reject</button>
  </div>
</Modal>
```

**Features**:
- Shows player name (if provided in join request)
- Shows phone number
- Purple gradient for destructive action (matches your pattern)
- Can cancel if fat-finger

---

### 3. Add Name to Join Request Flow (20 mins)

**Current**: Unknown player verifies phone → Creates join request with ONLY phone number → Admin has no idea who they are

**New**: After phone verification, ask for name BEFORE creating join request

**Flow** (`/join/[tenant]/[token]/page.tsx`):
```
Step 1: Enter phone
Step 2: Enter SMS code
Step 3: [NEW] "What's your name?" 
        [John Smith_______]
        "This helps the admin identify you"
        [Continue]
Step 4: Create join request OR auto-link
```

**Database**: `player_join_requests.display_name` column (already exists!)

**Update** `/api/join/link-player` to save `display_name` when creating request

**Admin sees**: "John Smith (+447949251277)" instead of just phone number

**Benefits**:
- Admin knows who's requesting
- Can make informed approve/reject decision
- Better UX for both sides

---

### 4. App-First Landing Page (20 mins)

**File**: Update `/join/[tenant]/[token]/page.tsx`

**Current**: Auto-redirects to phone verification

**New**: Platform-aware landing page

**Mobile** (phone browser):
```tsx
<div className="landing">
  <Logo />
  <h1>Join BerkoTNF</h1>
  
  <Benefits>
    Get instant match alerts:
    ✓ Match invitations
    ✓ RSVP reminders  
    ✓ Waitlist notifications
    ✓ Last-call alerts
  </Benefits>
  
  <PrimaryCTA onClick={tryDeepLink}>
    Download the Capo App
  </PrimaryCTA>
  
  <SecondaryLink href="/join-web/...">
    Continue on web →
    <Warning>⚠️ No RSVP notifications</Warning>
  </SecondaryLink>
  
  <MicroCopy>
    Players who don't install the app risk missing match invites.
  </MicroCopy>
</div>
```

**Desktop**:
```tsx
<div className="landing">
  <Logo />
  <h1>Join BerkoTNF</h1>
  
  <p>Scan with your phone to install the app:</p>
  
  <QRCode value={joinUrl} size={200} />
  
  <p className="muted">Or visit on your phone:</p>
  <code>capo.app/join/berkotnf/abc123</code>
</div>
```

**New route**: `/join-web/[tenant]/[token]` - Direct to phone verification (web fallback)

---

### 5. Deep Link Configuration (15 mins)

**Capacitor Config** (`capacitor.config.ts`):
```typescript
{
  plugins: {
    App: {
      appUrlOpen: {
        customScheme: 'capo',
      },
    },
  },
}
```

**Android Manifest** (`android/app/src/main/AndroidManifest.xml`):
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  
  <data android:scheme="capo" android:host="join" />
  <data android:scheme="https" android:host="capo.app" android:pathPrefix="/join" />
</intent-filter>
```

**App Listener** (in main layout or app component):
```typescript
import { App } from '@capacitor/app';

App.addListener('appUrlOpen', (data: any) => {
  const url = data.url; // "capo://join/berkotnf/abc123"
  // Navigate to appropriate screen
  window.location.href = url.replace('capo://', 'http://localhost:3000/');
});
```

---

## Implementation Order

**Build in this sequence**:

1. **Move admin toggle to modal** (easy, low risk)
2. **Add name to join request** (simple field addition)
3. **Add reject modal** (styling practice for landing page)
4. **App-first landing page** (main UI work)
5. **Deep links** (configuration)

**Total**: ~80 minutes (careful, tested work)

---

## Success Criteria

**When complete**:
- ✅ Player table has no admin column (moved to modal)
- ✅ Reject shows soft-UI modal with player info
- ✅ Join requests include player name
- ✅ Mobile invite links show app download screen
- ✅ Desktop invite links show QR code
- ✅ Deep links open app if installed
- ✅ Admin has pre-filled WhatsApp message

**Result**: Complete, polished onboarding ready for RSVP launch! 🚀

