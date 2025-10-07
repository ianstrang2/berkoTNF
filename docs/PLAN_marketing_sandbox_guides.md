# Marketing + Docs + Sandbox Plan (Capo)

_Last updated: 2025-10-07_

This doc records the **decisions, reasoning, and exact steps** to add a separate **marketing + docs site**, **user onboarding flows**, and a **public view-only demo**, plus how help is shown inside the mobile app.

---

## ✅ Goals

- Marketing/docs deploy **independently** from the app.
- One public set of docs + 30–60s videos (SEO + easy to edit).
- **In-app help** opens in a mobile-friendly **browser modal** (not tabs).
- Public **sandbox** (view-only demo).
  - Single template tenant loaded for all users
  - Read-only (no mutations)
  - No authentication required
  - Fast, simple, scalable

---

## 🧱 Current State

- **App repo:** `/capo` (Next.js + TypeScript)
- **Backend:** Supabase (auth, DB, storage)
- **Hosting:** Vercel (frontend), Supabase/Render (backend jobs/functions)
- **Routes:**  
  - `/players` (web + iOS + Android)  
  - `/admin` (web + iOS + Android)  
  - `/superadmin` (web only)

---

## 🧭 Target Architecture

### Repositories

| Repo | Purpose | Tech | Deploy |
|------|--------|------|--------|
| `capo` | App (`/players`, `/admin`, `/superadmin`, `/demo`) | Next.js + Supabase | **Vercel** → `app.caposport.com` |
| `capo-marketing` | Marketing site + Docs | **Astro + Markdown** | **Vercel** → `caposport.com` |

Each repo deploys separately → no coupling.

### Domains

| Site | Domain | Notes |
|------|--------|-------|
| Marketing | `https://caposport.com` | Home, pricing, **docs** |
| App | `https://app.caposport.com` | Product (players/admin/superadmin) |
| Sandbox | `https://app.caposport.com/demo` | View-only demo |

---

## 👥 User Onboarding Flows

### 1. Admin Creates Club (New Tenant)

**Desktop Flow:**

1. Marketing site → **"Start Your Club"** button
2. Redirects to: `app.caposport.com/signup/admin`
3. Signup form:
   - **Phone + OTP verification** (existing auth system)
   - **Email** (required) - for admin account management
   - **Name** (required) - becomes first player
   - **Club Name** (required) - creates tenant
4. System creates:
   - New tenant (club)
   - Player record (`is_admin=true`, linked to tenant)
   - Auth user (linked to player)
5. Redirects to: `/admin/dashboard`
6. Shows onboarding tip: _"Add players or share your invite link"_

**Mobile Flow:**

1. Marketing site detects mobile user agent
2. **"Start Your Club"** shows interstitial:
   
   > **For the best experience, download our app first**
   > 
   > [Download App] [Continue on Web]

3. If **Download**: → App Store/Play Store → Opens app → Shows club creation flow
4. If **Continue on Web**: → Same web form as desktop

**Technical Notes:**
- Endpoint: `POST /api/admin/create-club`
- Phone verification happens first (existing Supabase auth)
- After auth succeeds, collect email/name/club_name
- Create tenant → player → link to auth user
- Set player.is_admin = true

---

### 2. Player Joins via Invite Link

**Invite Link Format:**
```
https://app.caposport.com/join/[tenant_id]/[token]
```

**Flow:**

1. Player clicks invite link (from SMS, email, etc.)
2. App shows join request form:
   - **Phone + OTP verification** (if not already authed)
   - **Email** (optional) - "For match notifications and updates"
   - Displays: Club name, admin name
3. Submits join request
4. If auto-accept enabled: Immediate access
5. If approval required: "Request sent" → waits for admin approval
6. Once approved: Redirects to `/players/dashboard`

**Email Collection:**
- Optional field in join form
- Stored in `players.email` column
- Label: _"Email (optional) - For match notifications"_
- Helps with password reset and notifications

**Platform Experience:**
- **Web fallback** works but limited (no push notifications)
- **App-first** recommended for full experience
- Show banner: _"📱 Get the app for push notifications"_

---

### 3. User Opens App Without Invite Link (No Club Found)

**Scenario:** User downloads app from Play Store without invite link

**Flow:**

1. Opens app → "Enter your phone number"
2. Completes phone auth successfully ✅
3. System checks: Phone number not found in any `players` table
4. Redirects to: `/auth/no-club` page

**No Club Found Page:**

> **We couldn't find your club**

**Option A: Have an invite link?**
- Text input field (paste invite link)
- [Join] button
- Validates token → Continues to join flow

**Option B: Request your club join Capo**
- Form fields:
  - Club name (text)
  - Admin email (text)
- [Submit] button
- Sends lead notification to team
- Shows: _"Thanks! We'll reach out to them."_

**Technical Implementation:**
- Check in auth middleware after successful phone verification
- Query: `SELECT * FROM players WHERE phone = ?`
- If no results: `redirect('/auth/no-club')`
- Simple edge case page (rarely used but important)

---

### 4. Demo Flow (View-Only)

**Simplified Approach:** Demo loads template tenant in **read-only mode**

**Flow:**

1. Marketing site → **"Try Demo"** button
2. Redirects to: `app.caposport.com/demo`
3. Loads template tenant (id = 1) data
4. All mutations disabled (create/edit/delete buttons hidden or disabled)
5. Shows banner:
   
   > **Demo Mode** - Create account for full access
   > 
   > [Start Your Club]

**No Auth Required:**
- No login needed
- No per-user cloning
- No cleanup cron
- Just static template data

**Implementation Notes:**
- Load tenant_id = 1 (template tenant) data
- Check route: if `/demo`, disable mutations
- Or check: `tenant.demo = true` → read-only mode
- Banner links to `/signup/admin`

**Benefits:**
- Fast (no database writes)
- Simple (no cleanup needed)
- Safe (no user data)
- Scalable (unlimited concurrent users)

---

## 🔄 Domain Migration Steps

**Current state:** `caposport.com` → app (Next.js)  
**Target state:** `caposport.com` → marketing (Astro), `app.caposport.com` → app (Next.js)

### Order of Operations (Minimize Downtime)

Follow these steps **in order** to avoid breaking auth redirects or user sessions:

#### 1. Create Marketing Project in Vercel

```bash
# In new capo-marketing repo
git init
git add .
git commit -m "Initial Astro marketing site"
git push origin main
```

- Go to Vercel → **Add New** → **Project**
- Import `capo-marketing` repo
- Framework preset: **Astro**
- Deploy (will get temporary URL like `capo-marketing.vercel.app`)

#### 2. Add Subdomain to App Project (Non-Breaking)

In Vercel → **capo** app project → **Settings** → **Domains**:

1. Click **Add Domain**
2. Enter: `app.caposport.com`
3. Vercel will show DNS instructions (CNAME or A record)
4. Configure DNS:
   - **If using Vercel DNS:** Automatic, just confirm
   - **If using external DNS (e.g., Namecheap, Cloudflare):**
     - Add CNAME: `app` → `cname.vercel-dns.com`
     - Wait for propagation (1-60 min)
5. Verify `app.caposport.com` serves the app correctly

**At this point:** Both `caposport.com` and `app.caposport.com` point to the app (safe duplication).

#### 3. Update Supabase Auth Configuration

In Supabase Dashboard → **Authentication** → **URL Configuration**:

**Add new URLs first (don't remove old ones yet):**

✅ **Site URL:** `https://app.caposport.com`

✅ **Redirect URLs** (add these to existing list):
- `https://app.caposport.com/auth/callback` - OAuth callback
- `https://app.caposport.com/auth/confirm` - Email confirmation
- `https://app.caposport.com/auth/reset-password` - Password reset
- `https://app.caposport.com/**` - Wildcard for all routes

**Keep old URLs temporarily (for rollback safety):**
- `https://caposport.com/auth/callback`
- `https://caposport.com/auth/confirm`
- `https://caposport.com/**`

**Additional Supabase Settings to Check:**

In Supabase Dashboard → **Authentication** → **Providers**:
- If using OAuth (Google, GitHub, etc.), no changes needed - providers redirect to Site URL
- Verify "Enable email confirmations" points to correct domain

In Supabase Dashboard → **Settings** → **API**:
- ✅ CORS: Add `https://app.caposport.com` to allowed origins
- ✅ Keep `https://caposport.com` temporarily

**Update Environment Variables:**

In Vercel → **capo** app project → **Settings** → **Environment Variables**:
- `NEXT_PUBLIC_SITE_URL=https://app.caposport.com`
- `NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co` (unchanged)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...` (unchanged)

After updating env vars, **redeploy** the app to pick up changes.

#### 4. Test App on Subdomain

**Before proceeding, test thoroughly:**
- ✅ `https://app.caposport.com` loads
- ✅ Login/signup works
- ✅ Auth redirects work (check `/auth/callback`)
- ✅ Session persists across pages
- ✅ API routes work (`/api/*`)

#### 5. Assign caposport.com to Marketing Project

In Vercel → **capo-marketing** project → **Settings** → **Domains**:

1. Click **Add Domain**
2. Enter: `caposport.com`
3. Vercel will detect it's assigned to another project
4. Click **Transfer Domain** or **Remove from other project**
5. Confirm transfer

**DNS:** If using Vercel DNS, this is automatic. If external DNS:
- Update root domain A records to point to marketing project's IP
- Or use CNAME with `@` → `cname.vercel-dns.com` (if DNS provider supports CNAME flattening)

#### 6. Verify Marketing Site Live

- ✅ `https://caposport.com` loads marketing site
- ✅ `https://caposport.com/docs/*` loads documentation
- ✅ `https://app.caposport.com` still works (app)

#### 7. Clean Up Old Redirect URLs (After 48h)

After confirming everything works for 48 hours:

**In Supabase → URL Configuration:**
- Remove `https://caposport.com/auth/callback`
- Remove `https://caposport.com/**`
- Keep only `app.caposport.com` URLs

**In Vercel app project:**
- Optionally remove any old `caposport.com` references (should be auto-removed after domain transfer)

### DNS Configuration Reference

| Record Type | Name | Value | Notes |
|------------|------|-------|-------|
| CNAME | `app` | `cname.vercel-dns.com` | App subdomain |
| A (or CNAME) | `@` | Vercel marketing IP | Root domain (marketing) |

**If using Cloudflare:**
- Disable proxy (orange cloud → gray cloud) during setup
- Re-enable after DNS propagates
- Ensure SSL mode is "Full" or "Full (Strict)"

### Rollback Plan

If issues occur after step 5:

1. **Immediately:** Reassign `caposport.com` back to app project in Vercel
2. Revert Supabase Site URL to `https://caposport.com`
3. Redeploy app with old env vars
4. Debug issue, then retry migration

### Estimated Downtime

**If followed in order:** 0-5 minutes (DNS propagation only)  
**If done out of order:** Could break auth for 30-60 minutes

---

## 🪐 Marketing Site (Astro)

- **Framework:** Astro (static-first, Markdown/MDX)
- **Docs location:** `/src/content/docs`
- **Video embeds:** YouTube (unlisted) or Loom
- **Deploy:** Vercel (own project)

### Setup (once)
```bash
npm create astro@latest capo-marketing
cd capo-marketing
npm install
npm run dev  # http://localhost:4321

Deploy
Push to GitHub as capo-marketing.
Import in Vercel → framework = Astro → deploy.
Attach domain caposport.com in Vercel.

Folder Overview
/capo-marketing
  /src
    /pages/index.astro
    /layouts/BaseLayout.astro
    /content/docs/getting-started.md
  astro.config.mjs
  package.json

📘 Docs Content Rules (AI-ready)

Keep pages task-based (“How to X”), short, and scannable.
Each video must have text steps or a brief summary on the same page.
Host videos on YouTube (unlisted) (free). Embed via iframe.
SEO: frontmatter title + description. Prefer /docs/kebab-case-slug.

Example doc
---
title: Create Your First Match
description: 30s video + steps
---

# Create Your First Match

<iframe
  width="560"
  height="315"
  src="https://www.youtube.com/embed/YOUR_ID"
  title="Create Your First Match"
  frameborder="0"
  allowfullscreen
></iframe>

## Steps
1. Go to **Matches** → **New Match**.
2. Pick template, date, and team size.
3. Click **Create**. Done.

Tip: Try it in the [sandbox](https://app.caposport.com/demo).

🎥 Video Hosting Notes

Cost: YouTube unlisted = free.
Pair every video with text; AI assistants index the text, not the video.
If you ever need privacy, switch to youtube-nocookie.com or store files in Supabase Storage.

❓ In-App Help (Mobile + Web)
Decision: Use an in-app browser modal to open the public Astro docs from inside the app.
Mobile (Capacitor / native wrapper)
import { Browser } from '@capacitor/browser';
// Example: open Admin “General Settings” help
await Browser.open({ url: 'https://caposport.com/docs/admin-general-settings' });
Presents a native sheet with a close button.
Keeps users “in the app” with a clear back/close.

Web fallback (same code path works)
Opening the URL navigates in the same window or a modal/iframe if you choose.

Optional: Inline micro-help
For 15–45s clips, open a small app modal and embed the YouTube iframe directly.

### Call-to-Action Strategy

**Primary CTA: "Start Your Club"**

- **Desktop:** Direct link to `app.caposport.com/signup/admin`
  - Clean, instant onboarding
  - No interstitial needed
- **Mobile:** Platform detection → App download interstitial
  - Shows: _"For the best experience, download our app first"_
  - Options: [Download App] or [Continue on Web]
  - Download → App Store/Play Store → Opens to club creation
  - Continue → Web form (same as desktop)

**Secondary CTA: "Try Demo"**

- **Both platforms:** Direct link to `app.caposport.com/demo`
- No auth required
- View-only experience
- Quick exploration of features

**Helper Link: "Have an invite code?"**

- Link to: `app.caposport.com/join/[tenant]/[token]`
- Requires token parameter in URL
- Small, contextual link in footer or below primary CTA

### Platform Detection Implementation

**Marketing Site (Astro):**

```javascript
---
// In Astro component frontmatter
const userAgent = Astro.request.headers.get('user-agent') || '';
const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
---

<!-- In template -->
{isMobile ? (
  <a href="#" class="cta-button" onclick="showAppDownloadModal()">
    Start Your Club
  </a>
) : (
  <a href="https://app.caposport.com/signup/admin" class="cta-button">
    Start Your Club
  </a>
)}
```

**App Site (Next.js) - Detect Native vs Web:**

```typescript
'use client';
import { Capacitor } from '@capacitor/core';

const isNativeApp = Capacitor.isNativePlatform();

// Show/hide download banners
{!isNativeApp && (
  <div className="app-download-banner">
    📱 Download our app for push notifications
    <a href="https://apps.apple.com/...">App Store</a>
    <a href="https://play.google.com/...">Play Store</a>
  </div>
)}
```

**In-App Download Banners:**

Show banners on web interface to encourage app downloads:

- **Location:** `/admin/dashboard`, `/players/matches`
- **Message:** _"📱 Get the app for a better experience"_
- **Includes:** App Store + Play Store badges
- **Smart:** Deep link to app if already installed (Universal Links)
- **Hide:** Don't show banner if already in Capacitor app

**Deep Linking:**

If user has app installed and clicks web link:
- iOS: Universal Links automatically open app
- Android: App Links open app
- Fallback: Opens in web browser

---

🧪 Public Sandbox (View-Only Demo)

**Simplified Approach:** Demo loads template tenant in **read-only mode**. No per-user cloning, no cleanup needed.

### Implementation

**Route:** `app.caposport.com/demo`

**Behavior:**
- Loads template tenant (id = 1) data
- No authentication required
- All mutations disabled (create/edit/delete buttons hidden or disabled)
- Shows banner: _"Demo Mode - Create account for full access"_ with [Start Your Club] CTA

**Code Pattern:**

```typescript
// In demo route or component
const DEMO_TENANT_ID = 1;

// Load data
const players = await prisma.players.findMany({
  where: { tenant_id: DEMO_TENANT_ID }
});

// Disable mutations
const isDemo = pathname === '/demo' || tenant?.demo === true;

{!isDemo && (
  <button onClick={handleCreate}>Create Match</button>
)}
```

### Template Tenant Setup

Run this once in **Supabase SQL Editor**:

```sql
-- Create or update template tenant
INSERT INTO tenants (id, name, created_at, demo)
VALUES (1, '🎯 TEMPLATE - Demo Data (DO NOT DELETE)', now(), true)
ON CONFLICT (id) DO UPDATE SET demo = true, name = '🎯 TEMPLATE - Demo Data (DO NOT DELETE)';

-- Add sample players
INSERT INTO players (tenant_id, first_name, last_name, email, overall_rating)
VALUES 
  (1, 'John', 'Striker', 'demo+player1@caposport.com', 85),
  (1, 'Sarah', 'Midfielder', 'demo+player2@caposport.com', 78),
  (1, 'Mike', 'Defender', 'demo+player3@caposport.com', 82),
  (1, 'Emma', 'Goalkeeper', 'demo+player4@caposport.com', 90),
  (1, 'David', 'Winger', 'demo+player5@caposport.com', 75),
  (1, 'Alex', 'Forward', 'demo+player6@caposport.com', 88),
  (1, 'Chris', 'Midfielder', 'demo+player7@caposport.com', 72),
  (1, 'Jordan', 'Defender', 'demo+player8@caposport.com', 80)
ON CONFLICT DO NOTHING;

-- Add sample matches
INSERT INTO matches (tenant_id, match_date, venue, team_size, status)
VALUES 
  (1, now() + interval '3 days', 'Demo Field', 5, 'scheduled'),
  (1, now() - interval '7 days', 'Demo Field', 5, 'completed')
ON CONFLICT DO NOTHING;

-- Verify template tenant
SELECT 
  t.id, 
  t.name, 
  COUNT(DISTINCT p.id) as player_count,
  COUNT(DISTINCT m.id) as match_count
FROM tenants t
LEFT JOIN players p ON p.tenant_id = t.id
LEFT JOIN matches m ON m.tenant_id = t.id
WHERE t.id = 1
GROUP BY t.id, t.name;
```

### Benefits

- ✅ **Fast:** No database writes, instant page loads
- ✅ **Simple:** No cleanup cron, no session management
- ✅ **Safe:** No user data created
- ✅ **Scalable:** Unlimited concurrent users viewing same data
- ✅ **Maintainable:** Update template data anytime to showcase new features

⚙️ Deployment Flow
capo (app) → Vercel → app.caposport.com
capo-marketing (Astro) → Vercel → caposport.com
Supabase stays as is (auth + DB + scheduled functions).

---

## 📱 Mobile App Configuration

After migrating to `app.caposport.com`, update mobile app configs:

### Capacitor Configuration

Update `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.caposport.com',
  appName: 'Capo',
  webDir: 'out',
  server: {
    url: 'https://app.caposport.com', // ← Update this
    cleartext: false,
    androidScheme: 'https'
  },
  plugins: {
    Browser: {
      // For opening help docs
    }
  }
};

export default config;
```

### iOS Configuration

Update `ios/App/App/Info.plist`:

```xml
<!-- Add custom URL scheme for deep linking -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>capo</string>
    </array>
  </dict>
</array>

<!-- Allow external links (for help docs) -->
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>https</string>
</array>
```

Update Universal Links in `ios/App/App.entitlements`:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:app.caposport.com</string>
</array>
```

**Host Apple App Site Association** at `https://app.caposport.com/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.caposport.com",
        "paths": ["/auth/*", "/demo"]
      }
    ]
  }
}
```

### Android Configuration

Update `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Add intent filter for deep links -->
<activity android:name=".MainActivity">
  <!-- Existing config... -->
  
  <!-- Add this intent filter -->
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data 
      android:scheme="https"
      android:host="app.caposport.com" />
  </intent-filter>
</activity>
```

**Host Digital Asset Links** at `https://app.caposport.com/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.caposport.com",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_FINGERPRINT"
    ]
  }
}]
```

### Testing Mobile Auth After Domain Change

**iOS Testing:**
1. Build and deploy to TestFlight or simulator
2. Open app → Try login
3. Check auth redirect works: `app.caposport.com/auth/callback` → app
4. Verify session persists after app backgrounding
5. Test help button opens `caposport.com/docs/*` in Capacitor Browser

**Android Testing:**
1. Build and install APK/AAB
2. Same testing flow as iOS
3. Verify WebView cookies persist correctly

**Common Mobile Issues:**
- **Session lost:** Ensure Capacitor server config includes `cleartext: false`
- **Redirect fails:** Check AndroidManifest.xml and Info.plist URL schemes
- **Help links don't open:** Verify `@capacitor/browser` plugin installed

```bash
# If missing, install browser plugin
npm install @capacitor/browser
npx cap sync
```

---

🎯 Branding
Only brand colors/logo/typography need to match. No shared UI package.
Optional: copy a simple theme.json with color tokens between repos.

🔒 Headers & Embeds (important)
If you embed YouTube in app modals, ensure CSP allows it.
In app (Next.js) headers: allow frame-src https://www.youtube.com https://www.youtube-nocookie.com.
If you ever iframe the docs inside the app, set Content-Security-Policy frame-ancestors to include app.caposport.com on the marketing site (Astro). Using the in-app browser avoids this.

🔍 SEO

### Meta Tags (Marketing Pages)
- **Title:** 50-60 chars, include key benefit
- **Description:** 150-160 chars, include CTA
- **OG Image:** 1200x630px, showcase app UI or key feature

Example frontmatter:
```yaml
---
title: "Capo - Team Balancing for Pickup Soccer"
description: "Automatically balance teams based on skill ratings. Try our free demo sandbox."
ogImage: "/og-image.png"
---
```

### Sitemap
- Astro auto-generates sitemap at `/sitemap.xml`
- Include all docs and marketing pages
- Exclude `/demo` and dynamic routes

### robots.txt
```
User-agent: *
Allow: /
Allow: /docs/
Disallow: /demo
```

| Service            | Purpose             | Expected Cost       |
| ------------------ | ------------------- | ------------------- |
| Astro              | Static site builder | Free                |
| Vercel (marketing) | Hosting             | Free–$20/mo         |
| Vercel (app)       | Hosting             | Free–$20/mo         |
| Supabase           | Auth + DB           | Free–$25/mo typical |
| Render (optional)  | API functions       | Free–$10/mo         |
| YouTube            | Video hosting       | Free (unlisted)     |

---

## ✅ Execution Checklist

Follow this **linear order** to implement the marketing site, sandbox, and domain migration:

### Phase 1: Database Setup (Do First)

- [ ] **Run schema migration** in Supabase SQL Editor:
  - Add `demo` and `expires_at` columns to `users` and `tenants` tables
  - Create indexes for cleanup queries
  - Mark template tenant with clear name
- [ ] **Create and populate template tenant** with seed data:
  - 5+ sample players with realistic names/ratings
  - 1-2 sample matches
  - Verify template tenant ID = 1
  - Test query returns correct player/match count

### Phase 2: Marketing Site (Independent of App)

- [ ] **Create Astro repo** `capo-marketing`:
  - Run `npm create astro@latest capo-marketing`
  - Add layouts (`BaseLayout.astro`)
  - Configure Astro for docs (markdown/MDX)
- [ ] **Push to GitHub** as new repo
- [ ] **Deploy to Vercel**:
  - Import `capo-marketing` repo
  - Framework preset: Astro
  - Note temporary URL (`capo-marketing.vercel.app`)
- [ ] **Write 5 starter docs** (with placeholder text, videos come later):
  - `getting-started.md`
  - `try-sandbox.md`
  - `admin-basics.md`
  - `player-basics.md`
  - `faq.md`
- [ ] **Configure SEO**:
  - Add meta tags to layout (title, description, OG image)
  - Create `robots.txt` (allow docs, disallow demo)
  - Verify sitemap auto-generated at `/sitemap.xml`

### Phase 3: Domain Migration (Critical Order)

- [ ] **Add subdomain to app** (Vercel → capo app → Domains):
  - Add `app.caposport.com`
  - Configure DNS (CNAME: `app` → `cname.vercel-dns.com`)
  - Wait for propagation and verify it loads
- [ ] **Update Supabase auth config**:
  - Change Site URL to `https://app.caposport.com`
  - Add new redirect URLs (keep old ones temporarily)
  - Add `https://app.caposport.com` to CORS origins
- [ ] **Update app environment variables** (Vercel → app → Settings → Env Vars):
  - Set `NEXT_PUBLIC_SITE_URL=https://app.caposport.com`
  - Redeploy app
- [ ] **Test app on subdomain thoroughly**:
  - ✅ App loads at `app.caposport.com`
  - ✅ Login/signup works
  - ✅ Auth redirects work
  - ✅ Session persists
  - ✅ API routes work
- [ ] **Assign root domain to marketing** (Vercel → marketing project → Domains):
  - Add `caposport.com`
  - Transfer from app project
  - Verify DNS propagates
- [ ] **Verify both domains work**:
  - ✅ `caposport.com` → marketing site
  - ✅ `caposport.com/docs/*` → documentation
  - ✅ `app.caposport.com` → app (still works)
- [ ] **Clean up after 48 hours**:
  - Remove old `caposport.com` redirect URLs from Supabase
  - Remove old domain from Vercel app project (if not auto-removed)

### Phase 4: Mobile App Config

- [ ] **Update Capacitor config** (`capacitor.config.ts`):
  - Change server URL to `https://app.caposport.com`
  - Ensure `cleartext: false` and `androidScheme: 'https'`
- [ ] **Update iOS config** (`Info.plist`, `App.entitlements`):
  - Add URL schemes and Universal Links
  - Create `.well-known/apple-app-site-association` file
- [ ] **Update Android config** (`AndroidManifest.xml`):
  - Add intent filter for `app.caposport.com`
  - Create `.well-known/assetlinks.json` file
- [ ] **Test mobile auth**:
  - Build and deploy to TestFlight/simulator (iOS)
  - Build and install APK (Android)
  - ✅ Login works and redirects correctly
  - ✅ Session persists after backgrounding
  - ✅ Help buttons open docs in Capacitor Browser

### Phase 5: Demo (View-Only)

- [ ] **Create demo route** (`/demo`):
  - Load template tenant (id = 1) data
  - Disable all mutations (hide/disable create/edit/delete buttons)
  - No authentication required
- [ ] **Add demo banner**:
  - Shows: "Demo Mode - Create account for full access"
  - [Start Your Club] CTA links to `/signup/admin`
- [ ] **Test demo**:
  - ✅ Loads template data correctly
  - ✅ All create/edit/delete actions disabled
  - ✅ Banner shows with working CTA
  - ✅ No errors in console

### Phase 5.5: Club Creation & No Club Handling

- [ ] **Create admin signup page** (`/signup/admin`):
  - Platform detection (show app download prompt on mobile)
  - Phone + OTP verification (existing Supabase auth)
  - Form fields: Email (required), Name (required), Club Name (required)
  - Show onboarding tip after creation
- [ ] **Create admin signup API** (`/api/admin/create-club`):
  - Accepts: phone (from auth session), email, name, club_name
  - Creates tenant record
  - Creates player record (is_admin=true, linked to tenant)
  - Links player to auth.user via auth_user_id
  - Returns success + redirect to /admin/dashboard
- [ ] **Create "no club found" page** (`/auth/no-club`):
  - Shows when auth succeeds but no player record found
  - **Option A:** Paste invite link input field + [Join] button
  - **Option B:** Lead form (club name + admin email) + [Submit] button
  - Shows confirmation after lead form submission
- [ ] **Add email to join request form**:
  - Update `/join/[tenant]/[token]` page
  - Add optional email field with label: _"Email (optional) - For match notifications"_
  - Store in players.email column
  - Update API route to accept email parameter
- [ ] **Add platform detection to marketing site**:
  - Detect mobile user agent in Astro pages
  - Show app download interstitial for "Start Your Club" on mobile
  - Desktop: Direct link to web form
  - Mobile modal options: [Download App] or [Continue on Web]
- [ ] **Add "download app" banners** to web interface:
  - Create banner component (shows App Store + Play Store badges)
  - Add to `/admin/dashboard` and `/players` pages
  - Hide if already in Capacitor app (check `Capacitor.isNativePlatform()`)
  - Message: _"📱 Get the app for a better experience"_
- [ ] **Test admin signup flow**:
  - ✅ Desktop: Can create club via web form
  - ✅ Mobile web: Shows app download prompt
  - ✅ Mobile app: Can create club in-app
  - ✅ Creates tenant + admin player correctly
  - ✅ Auth user linked to player record
  - ✅ Redirects to /admin/dashboard after signup
  - ✅ Can immediately add players and share invite link
- [ ] **Test no club flow**:
  - ✅ Auth with phone not in any players table
  - ✅ Redirects to /auth/no-club page
  - ✅ Can paste invite link and continue to join
  - ✅ Lead form submits successfully
  - ✅ Shows "Thanks, we'll reach out" confirmation

### Phase 6: Help System

- [ ] **Install Capacitor Browser plugin**:
  - `npm install @capacitor/browser`
  - `npx cap sync`
- [ ] **Wire help buttons** in app to open docs:
  - Admin settings → `caposport.com/docs/admin-basics`
  - Player invites → `caposport.com/docs/player-basics`
  - Match creation → `caposport.com/docs/create-match`
  - Use `Browser.open({ url: '...' })`
- [ ] **Test help system**:
  - ✅ Help buttons open correct doc pages
  - ✅ Pages load in Capacitor Browser modal (mobile)
  - ✅ Close button works and returns to app

### Phase 7: Documentation Content (Final Polish)

- [ ] **Record 30-60s videos** for each doc:
  - Getting Started
  - Sandbox walkthrough
  - Admin basics
  - Player basics
  - Create your first match
- [ ] **Upload videos to YouTube** (unlisted):
  - Note video IDs
  - Add to unlisted playlist for organization
- [ ] **Embed videos in docs**:
  - Add iframe embed code
  - Write text steps below each video
  - Add "Try it in sandbox" CTAs
- [ ] **Final SEO check**:
  - All pages have title + description
  - OG images render correctly
  - Sitemap includes all docs
  - Test on mobile devices

---

## 🤖 Notes for Cursor / LLM

- Preferred doc slug format: `kebab-case`, lives under `/src/content/docs/`
- Every doc should have frontmatter `title` + `description`
- When asked to add help links, use Capacitor `Browser.open({ url: 'https://caposport.com/docs/...' })`
- When asked to add new videos, embed YouTube and add a text steps section under the video
- When cloning template tenant, use `INSERT ... SELECT` for speed
- Demo cleanup should cascade deletes (foreign keys) to avoid orphaned records