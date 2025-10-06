# BerkoTNF Authentication Implementation Specification

Version 5.0.0 • Phone-Only Authentication (Simplified)

**PHONE/SMS AUTHENTICATION FOR ALL USERS**

## Executive Summary

### Why Authentication Now

The BerkoTNF platform requires authentication to support:
- **Multi-Tenant Architecture**: Secure tenant isolation with role-based access control
- **Admin Management**: Club administrators manage matches, players, and settings
- **Mobile App Access**: Players and admins access features through native Capacitor app
- **App-Only Architecture**: Moving from public web pages to authenticated app experience

### Target Architecture (v5.0 - Simplified)

**Single Authentication System**: Supabase Phone Provider for ALL users

**One Authentication Flow**:
- **Everyone**: Phone + SMS OTP (players AND admins)
- **Admin = Player with privileges**: Admins are flagged players (`players.is_admin = true`)
- **Promotion-based**: Existing players promoted to admin (no separate invitation)

**Access Levels**:
- **Players**: View stats, RSVP to matches, track performance (mobile app + web)
- **Admins**: Same as players PLUS club management capabilities (web dashboard + mobile app)
- **Superadmin**: Platform-level tenant management (phone auth + superadmin flag)

**Key Simplification**: Admin is a permission flag, not a separate account type

### Key Design Principles

1. **One Auth System**: All users authenticate via Supabase Phone Provider only
2. **Admin = Privileged Player**: Admins are players with `is_admin` flag set
3. **Unified Sessions**: Same JWT token works across web and mobile  
4. **Promotion-Based**: Players promoted to admin (no separate invitation system)
5. **Platform-Native**: Leverage Supabase's built-in session management, token refresh, and security

### Implementation Phases

**Phase 1-3**: Dual auth system (email + phone) ✅ **COMPLETE** (October 1-2, 2025)
**Phase 4**: Phone-only migration ✅ **COMPLETE** (October 2, 2025)
- Simplified to single auth system
- Added promotion workflow
- Removed email auth complexity
**Phase 5**: App-first onboarding + Modal standardization ✅ **COMPLETE** (October 3, 2025)
- Deep link configuration (capo:// scheme + universal links)
- App-first landing page (mobile + desktop)
- Pre-filled invite messages  
- Modal UI standardization (gradient icons, consistent buttons)
**Phase 6**: iOS platform ⏸️ **BLOCKED** (Waiting for MacBook hardware)
**Phase 7**: Advanced security (2FA, biometric, enhanced audit) 📋 **FUTURE**

### Architectural Decision: Phone-Only (October 2, 2025)

**Decision**: Migrate from dual auth (email + phone) to phone-only authentication.

**Rationale**:
1. **User reality**: 95% of admins also play → why separate them?
2. **Simplicity**: One auth system vs two (easier to maintain)
3. **Sports app pattern**: Matches Spond, TeamSnap, etc. (industry standard)
4. **No linking complexity**: Admin is just a flag, not a separate account
5. **Casual football**: Weekly kickabout, not enterprise club management

**Trade-off accepted**: Desktop admins need phone for SMS on first login (then stays logged in for weeks).

**See**: `docs/AUTH_PHONE_ONLY_MIGRATION_PLAN.md` for detailed migration steps.

### Phase 5 Completed Work (October 3, 2025)

**All Phase 5 features implemented and tested:**

**1. Modal Standardization** ✅:
- Standardized all 8 modals to consistent Soft-UI styling
- Gradient icons: 48px (purple/pink for questions (?), red for warnings/deletes (!))
- Button order: Action (left), Cancel/Close (right)
- Button sizing: `px-4 py-2 font-medium` across all modals
- Removed gray shading from info boxes
- Files updated: SoftUIConfirmationModal, PendingJoinRequests, ClubInviteLink, PlayerForm, SeasonForm, SeasonDelete, globals.css

**2. App-First Landing Page** ✅:
- Platform detection (mobile vs desktop)
- Mobile view: App download CTA with benefits list + web fallback warning
- Desktop view: Scannable QR code (using qrcode.react library)
- Updated copy emphasizing fantasy points, leaderboards, RSVP features
- Deep link attempt with Play Store fallback
- Auto-skip landing if already in Capacitor app

**3. Deep Link Configuration** ✅:
- AndroidManifest.xml: Intent filters for `capo://` custom scheme
- AndroidManifest.xml: Universal links for `https://capo.app/join`
- DeepLinkHandler component for in-app navigation
- Integrated into root layout
- Supports both custom scheme and universal links

**Total Implementation Time**: ~2 hours (modal standardization took longer due to comprehensive audit)

### What's NOT Implemented

**iOS Platform** ⏸️ **BLOCKED**:
- iOS Capacitor platform setup
- iOS deep link configuration (Info.plist)
- iOS build and testing
- App Store submission
- **Blocker**: Requires MacBook hardware

**Future Enhancements** (Post-RSVP):
- 2FA for admin accounts
- Biometric auth (fingerprint/Face ID)
- Enhanced audit logging dashboard
- Session analytics

**Authentication system is production-ready for Android + Web!**

---

## B. Authentication Technology Stack

### Supabase Auth Integration (Unified System)

**Why Supabase Auth for Everyone**:
- **Multi-provider support**: Email (admins) + Phone/SMS (players) in one system
- **Multi-tenant ready**: Row Level Security (RLS) with tenant isolation
- **JWT tokens**: Standard OAuth2 flows with automatic refresh
- **Built-in security**: Password hashing, token management, session handling
- **Mobile SDK support**: Native Capacitor integration for mobile app
- **Existing infrastructure**: Already using Supabase for database

### Authentication Providers

**Email Provider** (Admin web signup):
```typescript
// Admin accepts invitation and creates account
const { data, error } = await supabase.auth.signUp({
  email: 'admin@club.com',
  password: 'secure_password',
  options: {
    data: {
      display_name: 'John Smith'
    }
  }
});

// Creates record in auth.users with email
// Admin profile created explicitly in API route after invitation validation
```

**Phone Provider** (Player mobile signup):
```typescript
// Player downloads app, signs up with phone
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+447123456789',
  options: {
    channel: 'sms'
  }
});

// Sends SMS with 6-digit code
// On verification, creates record in auth.users with phone
// Player links to existing profile via /api/auth/player/claim-profile
```

### JWT Token Structure (Simplified)

**Standard Supabase Token Payload**:
```typescript
interface AuthToken {
  // Supabase standard fields
  sub: string;           // user_id (UUID from auth.users.id)
  email?: string;        // Present for email-based signup
  phone?: string;        // Present for phone-based signup
  role: string;          // 'authenticated'
  
  // Custom app_metadata (set via API routes during signup)
  app_metadata: {
    tenant_id?: string;         // Admin's tenant (null for superadmin)
    user_role?: 'admin' | 'superadmin';  // Only set if admin_profile exists
    player_id?: number;         // If linked to a player record
  };
  
  // Standard JWT fields
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}
```

**Token Management**:
- **Validation**: Supabase handles JWT validation automatically
- **Refresh**: Automatic token refresh via Supabase client (no custom logic needed)
- **RLS Integration**: `auth.uid()` available in all database policies
- **Session Sync**: Supabase handles multi-tab/multi-device session synchronization

### Authentication Flows by User Type

#### 1. Admin (Web Dashboard)
**Platform**: Web browser (desktop/tablet)  
**Method**: Email + password  
**Flow**: Standard Supabase email signup → admin_profiles record created → redirect to /admin

#### 2. Player (Mobile App)
**Platform**: iOS/Android via Capacitor  
**Method**: Phone + SMS OTP  
**Flow**: Supabase phone signup → verify OTP → link or create player record → redirect to /dashboard

#### 3. Admin-Player (Mobile App with Role Switching)
**Platform**: iOS/Android via Capacitor  
**Method**: Email + password (same credentials as web)  
**Flow**: Supabase email login → detect admin_profile → check for linked player_id → show role switcher if linked

**Example: Admin opens mobile app**
```typescript
// Admin enters email/password on mobile (same as web)
const { data: session } = await supabase.auth.signInWithPassword({
  email: 'admin@club.com',
  password: 'same_password_as_web'
});

// Backend checks: is this user an admin with a linked player profile?
const adminProfile = await prisma.admin_profiles.findUnique({
  where: { user_id: session.user.id },
  include: { player: true }
});

// Response includes role-switching capability
{
  "isAdmin": true,
  "hasPlayerProfile": adminProfile.player_id !== null,
  "canSwitchRoles": adminProfile.player_id !== null,
  "defaultRole": "admin" // Can switch to "player" view
}
```

### Session Management

**Unified Sessions Across Platforms**:
- Same JWT token works on web and mobile
- Supabase client handles automatic refresh (no custom logic)
- Sessions persist across app restarts
- No custom BroadcastChannel needed (Supabase syncs sessions automatically)

**Session Duration**:
- Access token: 1 hour (auto-refreshed)
- Refresh token: 30 days
- Mobile app: Biometric re-authentication for sensitive operations (future)

### Provider Configuration

**Supabase Auth Settings Required**:
```typescript
// In Supabase Dashboard → Authentication → Providers

// Email Provider
{
  enabled: true,
  confirmEmail: true,  // Require email verification for admins
  securePasswordChange: true
}

// Phone Provider  
{
  enabled: true,
  provider: 'twilio',  // Or messagebird
  smsOtpLength: 6,
  smsOtpExpiry: 300    // 5 minutes
}
```

### Multi-Platform Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Auth                          │
│  ┌────────────────┐              ┌────────────────┐         │
│  │ Email Provider │              │ Phone Provider │         │
│  │ (Admins)       │              │ (Players)      │         │
│  └────────────────┘              └────────────────┘         │
│           │                               │                 │
│           └───────────┬───────────────────┘                 │
│                       │                                     │
│                 ┌─────▼──────┐                             │
│                 │ auth.users │                             │
│                 │  (Unified) │                             │
│                 └─────┬──────┘                             │
└───────────────────────┼─────────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
   ┌─────▼──────┐              ┌──────▼──────┐
   │   admin_   │              │   players   │
   │  profiles  │──────────────│             │
   │            │  player_id   │ auth_user_id│
   └────────────┘   (FK)       └─────────────┘
   
Admin Web:     Email/password → admin_profiles created
Player Mobile: Phone/OTP → players.auth_user_id linked
Admin Mobile:  Email/password → role switcher if player_id linked
```

### No Over-Engineering

**What We're NOT Building**:
- ❌ Custom SMS verification system (use Supabase phone provider)
- ❌ Custom JWT refresh logic (Supabase handles this)
- ❌ BroadcastChannel for session sync (Supabase does this natively)
- ❌ Claims versioning system (unnecessary for MVP)
- ❌ Edge Functions for token management (Supabase built-in is sufficient)

**What We ARE Building**:
- ✅ API routes for secure profile creation and linking (server-side validation)
- ✅ Middleware for route protection (admin vs player routes)
- ✅ Role switching UI for admin-players
- ✅ Invitation system for new admins
- ✅ Profile claiming for existing players

---

## C. Database Schema Changes

### ✅ Multi-Tenancy Foundation Already Complete

**Existing Multi-Tenant Infrastructure**:
- ✅ `tenants` table with UUID primary keys and metadata
- ✅ All 33+ tables have `tenant_id` fields with proper foreign key constraints
- ✅ Tenant-scoped unique constraints (e.g., `unique_player_name_per_tenant`)
- ✅ RLS policies active on all tables for database-level security
- ✅ Optimized indexes with `tenant_id` leading for performance

### Supabase Auth Integration (Unified for All Users)

**Existing Supabase Tables** (Managed by Supabase):
- `auth.users`: All authenticated users (admins via email, players via phone)
- `auth.sessions`: Active sessions for all users
- `auth.refresh_tokens`: JWT token management

### Schema Changes Required

#### 1. Admin Profiles Table (Simplified)
```sql
-- Extends Supabase auth.users with admin-specific data
CREATE TABLE admin_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_role TEXT NOT NULL CHECK (user_role IN ('admin', 'superadmin')),
    
    -- Profile information
    display_name TEXT NOT NULL,
    
    -- Optional link to player profile (enables role switching on mobile)
    player_id INT REFERENCES players(player_id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    
    -- Role-specific constraints
    CONSTRAINT superadmin_no_tenant CHECK (
        (user_role = 'superadmin' AND tenant_id IS NULL) OR 
        (user_role = 'admin' AND tenant_id IS NOT NULL)
    ),
    
    -- Ensure player belongs to same tenant (if linked)
    CONSTRAINT admin_player_same_tenant CHECK (
        player_id IS NULL OR 
        (SELECT tenant_id FROM players WHERE player_id = admin_profiles.player_id) = admin_profiles.tenant_id
    )
);

-- Indexes
CREATE INDEX idx_admin_profiles_tenant_role ON admin_profiles(tenant_id, user_role);
CREATE INDEX idx_admin_profiles_player_id ON admin_profiles(player_id) WHERE player_id IS NOT NULL;
CREATE UNIQUE INDEX idx_admin_profiles_unique_player ON admin_profiles(tenant_id, player_id) WHERE player_id IS NOT NULL;
```

#### 2. Players Table Update (Link to Supabase Auth)
```sql
-- Add auth user link to existing players table
ALTER TABLE players
  ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for quick lookup when player logs in
CREATE UNIQUE INDEX idx_players_auth_user ON players(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Index for phone-based lookup during profile claiming
CREATE INDEX idx_players_phone ON players(tenant_id, phone) WHERE phone IS NOT NULL;
```

**Migration Note**: Existing players without `auth_user_id` can claim their profile by verifying their phone number in the mobile app.

#### 3. Admin Invitations Table (Unchanged - Already Secure)
```sql
-- Manage admin user invitations with bcrypt hashed tokens
CREATE TABLE admin_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    invited_role TEXT NOT NULL CHECK (invited_role IN ('admin', 'superadmin')),
    
    -- Optional: link invitation to existing player
    player_id INT REFERENCES players(player_id) ON DELETE SET NULL,
    
    -- Hashed invitation token (NEVER store raw tokens)
    invitation_token_hash TEXT NOT NULL UNIQUE, -- bcrypt hash of actual token
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    accepted_by UUID REFERENCES auth.users(id),
    accepted_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(tenant_id, email, status) DEFERRABLE -- Only one pending invitation per email per tenant
);

-- Indexes
CREATE INDEX idx_admin_invitations_token_hash ON admin_invitations(invitation_token_hash);
CREATE INDEX idx_admin_invitations_tenant_status ON admin_invitations(tenant_id, status);
```

#### 4. Session Activity Log (Simplified)
```sql
-- Track authentication events for essential security monitoring
CREATE TABLE auth_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE SET NULL,
    
    -- Activity details
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'login', 'logout', 'password_reset', 'email_change', 
        'phone_verification', 'profile_claimed', 'role_switched',
        '2fa_enabled', '2fa_disabled', 'invitation_sent', 'tenant_switched'
    )),
    
    -- Context (anonymized for privacy)
    ip_address_hash TEXT, -- SHA256 hash of IP for privacy
    user_agent_hash TEXT, -- SHA256 hash of user agent
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    
    -- Simplified metadata (no PII)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for essential observability
CREATE INDEX idx_auth_activity_user ON auth_activity_log(user_id, created_at DESC);
CREATE INDEX idx_auth_activity_tenant ON auth_activity_log(tenant_id, created_at DESC);
CREATE INDEX idx_auth_activity_type_success ON auth_activity_log(activity_type, success, created_at DESC);
```

### Database Triggers

**Note**: Admin profiles and player linking are handled explicitly in API routes, not via database triggers. This prevents authorization bypass via manipulated client metadata.

- Admin profiles created in `/api/auth/admin/accept-invitation` after invitation validation
- Player auth linking handled in `/api/auth/player/claim-profile` with server-side tenant validation

---

## D. Role-Based Access Control

### Role Definitions

#### 1. Admins
**Access**:
- All admin functionality within their tenant
- Match management, player management, RSVP configuration
- Club settings and configuration
- Activity monitoring and logs

**Restrictions**:
- Cannot access other tenants' data
- Cannot manage tenant settings
- Cannot create or delete tenants
- Cannot promote/demote other admins

**Authentication**: Email + password + optional TOTP 2FA

#### 2. Superadmin
**Access**:
- All admin functionality across all tenants
- Tenant management (create, edit, disable)
- Cross-tenant analytics and reporting
- Platform-wide configuration
- Admin user management

**Special Capabilities**:
- **Tenant switching**: Dropdown to switch between clubs
- **Admin impersonation**: Can act as admin for any tenant
- **Platform oversight**: System logs and metrics

**Restrictions**:
- Cannot directly access individual player accounts (separate auth flow)
- Audit trail for all superadmin actions

**Authentication**: Email + password + mandatory TOTP 2FA (Phase 3)

### Navigation Mapping

#### Admin Navigation
```typescript
// Requires admin authentication + tenant scope
const ADMIN_ROUTES = [
  '/admin/matches',       // Match management
  '/admin/players',       // Player management  
  '/admin/seasons',       // Season management
  '/admin/settings'       // Club settings
];
```

#### Superadmin Navigation
```typescript
// Requires superadmin authentication
const SUPERADMIN_ROUTES = [
  '/superadmin/tenants',     // Tenant management
  '/superadmin/analytics',   // Cross-tenant analytics
  '/superadmin/system',      // System configuration  
  '/superadmin/info'         // Multi-tenant diagnostics (moved from /admin/info)
];

// Tenant selector for switching between clubs
const SUPERADMIN_TENANT_SELECTOR = '/superadmin/select-tenant';
```

**Context-Aware Navigation:**
Superadmin operates in two distinct contexts:

1. **Platform Context** (default):
   - Navigation: Tenants, Analytics, System, Info
   - No tenant selected
   - Manages platform-level concerns

2. **Tenant Context** (after selecting a club):
   - Navigation: Matches, Players, Seasons, Settings (same as regular admin)
   - Tenant-scoped operations
   - "Back to Platform" button visible in header

#### Player Navigation (Mobile App)
```typescript
// Requires player authentication (phone/OTP via Supabase)
const PLAYER_ROUTES = [
  '/player/dashboard',    // Personal stats and upcoming matches
  '/player/upcoming',     // RSVP to matches
  '/player/table',        // League standings
  '/player/records',      // All-time records
  '/player/profiles'      // Player profiles
];
```

**Superadmin Context Switching:**
- Superadmin default view shows platform navigation (Tenants, Analytics, System, Info)
- When switching to a specific tenant via dropdown, superadmin sees regular admin navigation
- "Back to Platform" button returns to superadmin context
- Info page (`/superadmin/info`) remains accessible only in platform context

**Implementation Enhancement:**
- Superadmin has 3-way view selector in header dropdown:
  - **Platform View**: Manage tenants, system settings (`/superadmin/*`)
  - **Admin View (Tenant X)**: Manage club as admin (`/admin/*` with tenant context)
  - **Player View (Tenant X)**: View club as player (`/player/*` with tenant context)
- Allows testing all three user perspectives without separate accounts
- View selection persists in session (tenant_id in app_metadata)

---

## E. Authentication Flows

**All authentication flows use Supabase Auth** - admins via email provider, players via phone provider, unified JWT tokens.

### 1. Admin Web Signup Flow

#### Email + Password Registration (Via Invitation Only)
```typescript
// Admins can only sign up via invitation (not open registration)
// See "Admin Invitation Flow" below for the complete process

// After receiving invitation email, admin:
// 1. Clicks invitation link
// 2. Verifies invitation token
// 3. Creates Supabase account
// 4. Admin profile explicitly created in API route (not via trigger)
// 5. Redirected to /admin dashboard
```

#### Admin Login (Returning User)
```typescript
// Admin uses Supabase standard login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@club.com',
  password: 'secure_password'
});

// Supabase handles:
// - Password verification
// - JWT token generation
// - Session creation
// - Automatic token refresh
```

#### Admin Invitation Flow (Simplified)
```typescript
// 1. Existing admin invites new admin
POST /api/admin/users/invite
{
  "email": "newadmin@club.com",
  "player_id": 123,  // Optional: link to existing player for role switching
  "role": "admin"
}

// 2. Validate player_id belongs to tenant (if provided)
if (player_id) {
  const player = await prisma.players.findUnique({
    where: { player_id: player_id }
  });
  
  if (!player || player.tenant_id !== tenantId) {
    throw new Error('Invalid player_id for this tenant');
  }
  
  // Check if player already linked to an admin
  const existingAdmin = await prisma.admin_profiles.findFirst({
    where: { player_id: player_id }
  });
  
  if (existingAdmin) {
    throw new Error('This player is already linked to an admin account');
  }
}

// 3. Generate secure token, store bcrypt hash (NEVER store raw)
const invitationToken = crypto.randomUUID();
const hashedToken = await bcrypt.hash(invitationToken, 12);

// 4. Store invitation with optional player link
await prisma.admin_invitations.create({
  data: {
    tenant_id: tenantId,
    email: email,
    invited_by: currentUser.id,
    invited_role: role,
    player_id: player_id || null,
    invitation_token_hash: hashedToken,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
});

// 5. Send invitation email
await sendInvitationEmail(email, invitationToken, {
  role,
  tenantId,
  linkedPlayerId: player_id,
  linkedPlayerName: player?.name
});

// 6. New admin accepts invitation
// - Clicks link in email → /auth/accept-invitation?token=xxx
// - Token verified with bcrypt.compare
// - Admin creates Supabase account (signUp with email/password)
// - API route explicitly creates admin_profiles record (see Section H)
```

### 2. Player Mobile Signup Flow

#### Club Invite Link System (Implemented ✅)

**Admin shares club invite link** (one permanent link per club):
```
https://capo.app/join/berkotnf/abc123...
```

**Player Flow**:
1. Player taps link (shared in WhatsApp group)
2. Opens `/join/{tenant_slug}/{invite_token}` in app or browser
3. System validates invite token and shows: "Join BerkoTNF"
4. Player enters phone number
5. Receives SMS with 6-digit OTP code
6. Verifies code
7. **Auto-linking**:
   - If phone number matches existing player → Auto-linked, redirect to dashboard
   - If phone number unknown → Create join request, pending admin approval

**Database Tables**:
- `club_invite_tokens` - One active token per tenant
- `player_join_requests` - Pending approvals for unknown phone numbers
- `players.phone` - Used for auto-linking phone to player profile

**Implementation**:
- `/api/admin/club-invite` - Generate/get invite link
- `/api/join/validate-token` - Validate invite code
- `/api/join/link-player` - Auto-link by phone or create join request
- `/api/admin/join-requests` - Admin approval endpoints
- Admin UI shows pending requests at top of Players page

#### Phone + SMS OTP Registration
```typescript
// 1. Player opens mobile app, selects club (tenant)
// 2. Player enters phone number and requests OTP
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+447123456789',
  options: {
    channel: 'sms'
  }
});

// 3. Supabase sends SMS with 6-digit code
// 4. Player enters verification code
const { data: session, error: verifyError } = await supabase.auth.verifyOtp({
  phone: '+447123456789',
  token: '123456',
  type: 'sms'
});

// 5. Supabase creates auth.users record with phone
// 6. App calls profile claiming endpoint with server-side validation
const claimResponse = await fetch('/api/auth/player/claim-profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '+447123456789',
    tenant_id: selectedTenantId,
    verification_code: '123456'
  })
});

// 7. API route links or creates player record (server-side only)
// 8. Player redirected to /dashboard
```

#### Profile Linking (Auto-Linking Only)
```typescript
// PHONE-ONLY MODEL (v5.0): Automatic phone matching - no manual selection

// The /api/join/link-player endpoint handles all linking:
// 1. Normalizes incoming phone: 07949251277 → +447949251277
// 2. Normalizes all player.phone values in database
// 3. Finds match by normalized phone comparison
// 4. If match found: Auto-link players.auth_user_id to session.user.id
// 5. If no match: Create player_join_requests entry for admin approval
// 6. Redirects to dashboard (auto-linked) or pending approval page

// PRIMARY FLOW: Club invite links (auto-linking)
// FALLBACK: Direct login at /auth/login (for existing players only)
// REMOVED: Manual "claim profile" dropdown (was a relic, served no purpose)

// Admin promotion: Toggle players.is_admin flag (no separate auth needed)
```

#### App-First Onboarding (Critical for RSVP)

**Why App-First Matters**:
- RSVP push notifications ONLY work in Capacitor app (not web)
- Match alerts, waitlist offers, last-calls require app installation
- Players who use web-only miss all notifications (defeats RSVP purpose)

**Invite Link Landing Page** (`/join/[tenant]/[token]`):

**Mobile Browser Detection**:
```
┌─────────────────────────────────┐
│  [Capo Logo]                    │
│  Join BerkoTNF                  │
│                                 │
│  Get instant match alerts:       │
│  ✓ Match invitations            │
│  ✓ RSVP reminders               │
│  ✓ Waitlist notifications       │
│  ✓ Last-call alerts             │
│                                 │
│  [Download the Capo App]        │  ← Primary CTA (purple/pink gradient)
│                                 │
│  Continue on web →              │  ← Muted link
│  (⚠️ No RSVP notifications)      │
│                                 │
│  Micro-copy: "Players who don't │
│  install miss match invites"    │
└─────────────────────────────────┘
```

**Desktop Browser**:
```
┌─────────────────────────────────┐
│  [Capo Logo]                    │
│  Join BerkoTNF                  │
│                                 │
│  Scan with your phone:          │
│                                 │
│  [QR Code]                      │
│                                 │
│  Or visit on your phone:        │
│  capo.app/join/berkotnf/abc123  │
└─────────────────────────────────┘
```

**Pre-filled WhatsApp Message** (Admin Invite Modal):
```
Join BerkoTNF on Capo ⚽

All match invites and RSVPs happen in the Capo app.
Download to get notifications and secure your spot:

👉 https://capo.app/join/berkotnf/abc123
```

**Deep Link Configuration**:
- Scheme: `capo://`
- Universal link: `https://capo.app/join/*` → Opens app if installed
- Fallback: Web page with download CTA
- Platform: Android (iOS when MacBook available)

**Implementation Files**:
- `capacitor.config.ts` - Deep link scheme configuration
- `AndroidManifest.xml` - Intent filters for deep links
- `/join/[tenant]/[token]/page.tsx` - App-first landing with platform detection
- `ClubInviteLinkButton.component.tsx` - Pre-filled message with copy button
```

### 3. Admin Mobile Login Flow (Role Switching Enabled)

#### Email + Password on Mobile
```typescript
// Admin opens mobile app (same credentials as web)
const { data: session, error } = await supabase.auth.signInWithPassword({
  email: 'admin@club.com',
  password: 'same_password_as_web'
});

// Backend API checks if user is admin with linked player
GET /api/auth/session
Response:
{
  "user": {
    "id": "auth-user-uuid",
    "email": "admin@club.com"
  },
  "profile": {
    "isAdmin": true,
    "adminRole": "admin",
    "tenantId": "tenant-uuid",
    "linkedPlayerId": 123,  // null if no player link
    "canSwitchRoles": true  // true if linkedPlayerId exists
  }
}

// If canSwitchRoles = true, app shows role switcher UI
// See Section E2 for role switching implementation
```

### 4. Superadmin Tenant Switching (Simplified)

#### Switch Active Tenant Context
```typescript
// Superadmin selects different tenant from dropdown
POST /api/auth/superadmin/switch-tenant
{
  "tenantId": "new-tenant-uuid"
}

// Backend updates session metadata
await prisma.admin_profiles.update({
  where: { user_id: user.id },
  data: { 
    updated_at: new Date()
  }
});

// Update app_metadata in Supabase (for RLS policies)
await supabase.auth.admin.updateUserById(user.id, {
  app_metadata: {
    ...user.app_metadata,
    tenant_id: tenantId
  }
});

// Client refreshes session to get updated JWT
await supabase.auth.refreshSession();

// Response
{
  "success": true,
  "tenantId": "new-tenant-uuid",
  "requiresRefresh": true // Client should reload to apply new context
}

// Note: Supabase handles session sync across tabs automatically
// No BroadcastChannel or custom logic needed
```

---

## E2. Role Switching for Admin-Players

### Overview

Admins who are also players can access both admin functionality and their own player profile. This is enabled by linking `admin_profiles.player_id` to `players.player_id`.

**Key Points**:
- Admins authenticate with email/password (same on web and mobile)
- Players authenticate with phone/SMS OTP (mobile only)
- If an admin has `player_id` set, they can switch to "Player View" on mobile
- No separate login required - just a UI role switch

### Database Linking (Already in Section C)

**Admin-to-Player Link**:
```sql
-- admin_profiles.player_id → players.player_id (nullable FK)
-- Set during admin invitation or via admin settings
```

**Player-to-Auth Link**:
```sql
-- players.auth_user_id → auth.users.id (nullable FK)  
-- Set when player verifies phone via Supabase OTP
```

### Session Structure

**After Login** (Supabase session + app-specific metadata):
```typescript
interface AppSession {
  // Standard Supabase session
  user: {
    id: string;              // auth.users.id (UUID)
    email?: string;          // If email-based auth
    phone?: string;          // If phone-based auth
    app_metadata: {
      tenant_id?: string;
      user_role?: 'admin' | 'superadmin';
      player_id?: number;
    }
  };
  
  // App-specific context (from API call)
  profile: {
    isAdmin: boolean;        // true if admin_profiles record exists
    linkedPlayerId?: number; // admin_profiles.player_id (if set)
    canSwitchRoles: boolean; // true if linkedPlayerId exists
  };
  
  // Current UI state (stored in local storage)
  currentRole: 'player' | 'admin';  // Defaults based on platform
}
```

### Role Switching Flow

#### Detecting Role-Switching Capability
```typescript
// On app launch, check user's profile
GET /api/auth/profile

// Backend implementation
export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  // Check if user has admin profile
  const adminProfile = await prisma.admin_profiles.findUnique({
    where: { user_id: session.user.id },
    select: { 
      user_role: true, 
      tenant_id: true, 
      player_id: true 
    }
  });
  
  // Check if user has player profile (via auth_user_id)
  const playerProfile = await prisma.players.findUnique({
    where: { auth_user_id: session.user.id },
    select: { 
      player_id: true, 
      name: true 
    }
  });
  
  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      phone: session.user.phone
    },
    profile: {
      isAdmin: !!adminProfile,
      adminRole: adminProfile?.user_role,
      tenantId: adminProfile?.tenant_id,
      linkedPlayerId: adminProfile?.player_id || playerProfile?.player_id,
      canSwitchRoles: !!(adminProfile?.player_id) // Only if admin explicitly linked
    }
  });
}
```

#### Switching Roles
```typescript
// POST /api/auth/switch-role
// Requires: Active Supabase session
{
  "role": "admin" | "player"
}

// Backend validation
export async function POST(request: NextRequest) {
  const { role } = await request.json();
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  // Verify user can access requested role
  if (role === 'admin') {
    const adminProfile = await prisma.admin_profiles.findUnique({
      where: { user_id: session.user.id }
    });
    
    if (!adminProfile) {
      return NextResponse.json({ 
        error: 'User does not have admin access' 
      }, { status: 403 });
    }
  }
  
  if (role === 'player') {
    const adminProfile = await prisma.admin_profiles.findUnique({
      where: { user_id: session.user.id },
      select: { player_id: true }
    });
    
    if (!adminProfile?.player_id) {
      return NextResponse.json({ 
        error: 'Admin account not linked to player profile' 
      }, { status: 403 });
    }
  }
  
  // Log role switch
  await logAuthActivity({
    user_id: session.user.id,
    tenant_id: session.user.app_metadata?.tenant_id,
    activity_type: 'role_switched',
    success: true,
    metadata: { new_role: role }
  });
  
  // Return success - client updates localStorage
  return NextResponse.json({
    success: true,
    currentRole: role,
    navigation: role === 'player' ? PLAYER_NAV : ADMIN_NAV
  });
}
```

### Mobile App UI

**Profile Menu** (accessed via top-right user button):
```typescript
'use client';
import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';

export default function ProfileMenu() {
  const { session, profile } = useSupabase();
  const [currentRole, setCurrentRole] = useState<'player' | 'admin'>(
    // Default based on platform
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') 
      ? 'admin' 
      : 'player'
  );
  
  const switchRole = async (newRole: 'player' | 'admin') => {
    const response = await fetch('/api/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    
    if (response.ok) {
      setCurrentRole(newRole);
      localStorage.setItem('preferredRole', newRole);
      
      // Navigate to appropriate home
      window.location.href = newRole === 'player' ? '/dashboard' : '/admin/matches';
    }
  };
  
  return (
    <div className="profile-menu">
      <div className="profile-header">
        <Avatar src={session.user.user_metadata?.avatar_url} />
        <Name>{profile.displayName}</Name>
        {session.user.email && <Email>{session.user.email}</Email>}
        {session.user.phone && <Phone>{formatPhone(session.user.phone)}</Phone>}
      </div>
      
      {/* Role switcher - only if admin has linked player profile */}
      {profile.canSwitchRoles && (
        <div className="role-switcher">
          <button 
            className={currentRole === 'player' ? 'active' : ''}
            onClick={() => switchRole('player')}
          >
            Player View
          </button>
          <button 
            className={currentRole === 'admin' ? 'active' : ''}
            onClick={() => switchRole('admin')}
          >
            Admin View
          </button>
        </div>
      )}
      
      {/* Role-specific menu items */}
      {currentRole === 'player' ? (
        <>
          <MenuItem href="/stats">My Stats</MenuItem>
          <MenuItem href="/settings">Settings</MenuItem>
        </>
      ) : (
        <>
          <MenuItem href="/admin/reports">Reports</MenuItem>
          <MenuItem href="/admin/settings">Club Settings</MenuItem>
        </>
      )}
      
      <MenuItem onClick={() => supabase.auth.signOut()}>Log Out</MenuItem>
    </div>
  );
}
```

**Bottom Navigation Changes:**
```typescript
// Player View Navigation (default for phone auth users)
const PLAYER_NAV = [
  { label: 'Dashboard', path: '/player/dashboard', icon: 'home' },
  { label: 'Upcoming', path: '/player/upcoming', icon: 'calendar' },
  { label: 'Table', path: '/player/table', icon: 'bar-chart' },
  { label: 'Records', path: '/player/records', icon: 'target' }
];

// Admin View Navigation (default for email auth users)
const ADMIN_NAV = [
  { label: 'Matches', path: '/admin/matches', icon: 'calendar' },
  { label: 'Players', path: '/admin/players', icon: 'users' },
  { label: 'Seasons', path: '/admin/seasons', icon: 'trophy' },
  { label: 'Settings', path: '/admin/settings', icon: 'settings' }
];

// Navigation switches based on currentRole (from localStorage)
const currentRole = localStorage.getItem('preferredRole') || 
  (session.user.email ? 'admin' : 'player');

<BottomNav items={currentRole === 'player' ? PLAYER_NAV : ADMIN_NAV} />
```

### Linking Admin to Player Profile

**Option 1: During Admin Invitation**
```typescript
// Existing admin invites new admin and links to player
POST /api/admin/users/invite
{
  "email": "newadmin@club.com",
  "player_id": 123,  // Link to existing player
  "role": "admin"
}

// When invitation is accepted:
// 1. Supabase creates auth.users with email
// 2. admin_profiles created with player_id = 123
// 3. Admin can now switch to player view on mobile
```

**Option 2: Via Admin Settings**
```typescript
// Admin links their account to existing player after signup
POST /api/admin/profile/link-player
{
  "player_id": 123
}

// Backend validation
const player = await prisma.players.findUnique({
  where: { player_id: player_id }
});

if (!player || player.tenant_id !== admin.tenant_id) {
  throw new Error('Invalid player_id');
}

// Check not already linked
const existingLink = await prisma.admin_profiles.findFirst({
  where: { player_id: player_id }
});

if (existingLink) {
  throw new Error('Player already linked to another admin');
}

// Update admin profile
await prisma.admin_profiles.update({
  where: { user_id: admin.user_id },
  data: { player_id: player_id }
});
```

### Route Protection Based on Role

```typescript
// Middleware checks Supabase session and current role preference
export async function middleware(req: NextRequest) {
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;
  
  // Admin routes require admin_profile
  if (pathname.startsWith('/admin/')) {
    if (!session) {
      return redirectToLogin(req);
    }
    
    // Check if user has admin_profile
    const adminProfile = await prisma.admin_profiles.findUnique({
      where: { user_id: session.user.id }
    });
    
    if (!adminProfile) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
  }
  
  // Player routes require auth (either player via phone OR admin with linked player)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/stats')) {
    if (!session) {
      return redirectToLogin(req);
    }
    
    // Verify user has player access
    const hasPlayerAccess = await checkPlayerAccess(session.user.id);
    
    if (!hasPlayerAccess) {
      return NextResponse.json(
        { error: 'Player profile required' },
        { status: 403 }
      );
    }
  }
  
  return NextResponse.next();
}
```

### Testing Requirements

**Role Switching:**
- [ ] Admin with linked player can switch to player view
- [ ] Player view shows correct player data (admin's own stats)
- [ ] Admin can switch back to admin view
- [ ] Non-admin users don't see role switcher
- [ ] Admin without linked player cannot access player view
- [ ] Role preference persists across app restarts (localStorage)

**Profile Linking:**
- [ ] Admin invitation can include player_id for linking
- [ ] Admin can link to player via settings after signup
- [ ] One player can only link to one admin per tenant
- [ ] Cannot link to player from different tenant
- [ ] Unlinking player removes role-switching capability

**Navigation:**
- [ ] Bottom nav updates when role switches
- [ ] Deep links respect current role context
- [ ] Back/forward navigation works correctly
- [ ] Role preference syncs between web and mobile (via Supabase session)

**Security:**
- [ ] Admin routes blocked when in player view (UI-level, not auth-level)
- [ ] Player data access validated against session.user.id
- [ ] Role switches logged to auth_activity_log
- [ ] Supabase session sync works across devices

---

## F. Middleware & Route Protection

### Authentication Middleware (Unified for All Routes)

**File**: `src/middleware.ts`
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;
  
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  
  // Admin routes - require admin_profile
  if (pathname.startsWith('/admin/')) {
    if (!session) {
      return redirectToLogin(req, pathname);
    }
    
    // Check for admin_profile (requires database query in API route)
    // Middleware just checks session exists; role validation in API routes
    const userRole = session.user.app_metadata?.user_role;
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }
  
  // Superadmin routes - require superadmin role
  if (pathname.startsWith('/superadmin/')) {
    if (!session || session.user.app_metadata?.user_role !== 'superadmin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }
  
  // Player routes - require player profile (phone auth OR admin with linked player)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/stats')) {
    if (!session) {
      return redirectToLogin(req, pathname, 'player');
    }
    
    // Player access validated in API routes (check auth_user_id or admin.player_id)
  }
  
  return res;
}

function redirectToLogin(req: NextRequest, returnUrl: string, type: 'admin' | 'player' = 'admin') {
  const loginUrl = new URL(type === 'admin' ? '/auth/login' : '/auth/player-login', req.url);
  loginUrl.searchParams.set('returnUrl', returnUrl);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/superadmin/:path*', '/dashboard/:path*', '/stats/:path*'],
};
```

### API Route Protection Helpers

**File**: `src/lib/auth/apiAuth.ts`
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function requireAuth(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    throw new Error('Authentication required');
  }
  
  return {
    user: session.user,
    session,
    supabase
  };
}

export async function requireAdminRole(
  request: NextRequest, 
  allowedRoles: ('admin' | 'superadmin')[] = ['admin', 'superadmin']
) {
  const { user, supabase } = await requireAuth(request);
  
  // Query admin_profiles to verify role
  const adminProfile = await prisma.admin_profiles.findUnique({
    where: { user_id: user.id },
    select: { 
      user_role: true, 
      tenant_id: true,
      player_id: true
    }
  });
  
  if (!adminProfile) {
    throw new Error('Admin access required');
  }
  
  if (!allowedRoles.includes(adminProfile.user_role)) {
    throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
  }
  
  return {
    user,
    userRole: adminProfile.user_role,
    tenantId: adminProfile.tenant_id,
    linkedPlayerId: adminProfile.player_id,
    supabase
  };
}

export async function requirePlayerAccess(request: NextRequest) {
  const { user, supabase } = await requireAuth(request);
  
  // Check if user has player profile (either direct or via admin link)
  const player = await prisma.players.findFirst({
    where: {
      OR: [
        { auth_user_id: user.id }, // Direct player account
        { 
          player_id: {
            in: (await prisma.admin_profiles.findMany({
              where: { user_id: user.id },
              select: { player_id: true }
            })).map(ap => ap.player_id).filter(Boolean)
          }
        } // Admin with linked player
      ]
    }
  });
  
  if (!player) {
    throw new Error('Player profile required');
  }
  
  return {
    user,
    player,
    tenantId: player.tenant_id,
    supabase
  };
}

export async function requireTenantAccess(
  request: NextRequest,
  requiredTenantId?: string
) {
  const { user, userRole, tenantId } = await requireAdminRole(request);
  
  // Superadmin can access any tenant
  if (userRole === 'superadmin') {
    return { user, tenantId: requiredTenantId || tenantId };
  }
  
  // Admin must match tenant
  if (requiredTenantId && tenantId !== requiredTenantId) {
    throw new Error('Access denied for this tenant');
  }
  
  return { user, tenantId };
}
```

### RLS Policies Integration

**✅ RLS Infrastructure Already Complete** - All tables have comprehensive tenant isolation policies.

**Unified RLS Policies** (Admin + Player Access):
```sql
-- Players table: admins can manage, players can view own profile
CREATE POLICY players_admin_access ON players
  FOR ALL TO authenticated
  USING (
    -- Admin access: can view/edit all players in their tenant
    EXISTS (
      SELECT 1 FROM admin_profiles ap 
      WHERE ap.user_id = auth.uid() 
      AND (ap.tenant_id = players.tenant_id OR ap.user_role = 'superadmin')
    )
    OR
    -- Player access: can view own profile only
    auth_user_id = auth.uid()
  );

-- Matches table: admins can manage, players can view
CREATE POLICY matches_access ON upcoming_matches
  FOR SELECT TO authenticated
  USING (
    -- Admin can view all matches in tenant
    EXISTS (
      SELECT 1 FROM admin_profiles ap 
      WHERE ap.user_id = auth.uid() 
      AND (ap.tenant_id = upcoming_matches.tenant_id OR ap.user_role = 'superadmin')
    )
    OR
    -- Player can view matches in their tenant
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.auth_user_id = auth.uid()
      AND p.tenant_id = upcoming_matches.tenant_id
    )
  );

-- Admin-only modification policy for matches
CREATE POLICY matches_admin_modify ON upcoming_matches
  FOR INSERT, UPDATE, DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap 
      WHERE ap.user_id = auth.uid() 
      AND (ap.tenant_id = upcoming_matches.tenant_id OR ap.user_role = 'superadmin')
    )
  );
```

---

## G. Role & Platform UI Reference

### Comprehensive Role/Platform Matrix

This section documents exactly what each user type sees on each platform, serving as a definitive reference for UI implementation and future development.

#### Platform Definitions

**Desktop Web**: Browser on computer (laptop/desktop)
**Mobile Web**: Browser on phone (testing/fallback)
**Capacitor App**: Native Android/iOS app

---

### Role 1: Player (Phone Auth)

**Access**: Player pages only (`/player/dashboard`, `/player/upcoming`, `/player/table`, `/player/records`)

| Platform | Primary Nav | Header | Menu Icon | Menu Contents |
|----------|-------------|--------|-----------|---------------|
| **Desktop Web** | Sidebar (4 items) | Capo logo + Profile icon | 👤 Person | • Logout |
| **Mobile Web** | Bottom tabs (4 items) | Capo logo + Profile icon | 👤 Person | • Logout |
| **Capacitor** | Bottom tabs (4 items) | Centered Menu button | 👤 Menu | • Logout |

**Rationale**:
- **Desktop/Mobile Web**: Profile icon in top-right (standard UX)
- **Capacitor**: Centered menu button (better for thumb reach)
- **Logout everywhere**: Simple, consistent, useful for testing and edge cases
- **Navigation**: Dashboard, Upcoming, Table, Records (consistent everywhere)

---

### Role 2: Admin (Email Auth, No Player Link)

**Access**: Admin pages only (`/admin/matches`, `/admin/players`, `/admin/seasons`, `/admin/setup`)

| Platform | Primary Nav | Header | Menu Icon | Menu Contents |
|----------|-------------|--------|-----------|---------------|
| **Desktop Web** | Sidebar (4 items) | Capo logo + Profile icon | 👤 Person | • Logout |
| **Mobile Web** | Bottom tabs (4 items) | Capo logo + Profile icon | 👤 Person | • Logout |
| **Capacitor** | Bottom tabs (4 items) | Centered Menu button | ⋮ Menu | • Logout |

**Rationale**:
- **Desktop/Mobile Web**: Profile icon in top-right
- **Capacitor**: Centered menu (thumb-friendly)
- **Logout everywhere**: Consistent, useful for testing
- **Navigation**: Matches, Players, Seasons, Setup (consistent everywhere)

---

### Role 3: Admin-Player (Email Auth WITH Player Link)

**Access**: Both admin AND player pages

| Platform | View | Primary Nav | Header | Menu Icon | Menu Contents |
|----------|------|-------------|--------|-----------|---------------|
| **Desktop** | Player | Sidebar (4 player items) | Capo logo + Profile icon | 👤 Person | • ⚙️ Switch to Admin View<br>• Logout |
| **Desktop** | Admin | Sidebar (4 admin items) | Capo logo + Profile icon | 👤 Person | • 👤 Switch to Player View<br>• Logout |
| **Mobile Web** | Player | Bottom tabs (4 player) | Capo logo + Profile icon | 👤 Person | • ⚙️ Switch to Admin View<br>• Logout |
| **Mobile Web** | Admin | Bottom tabs (4 admin) | Capo logo + Profile icon | 👤 Person | • 👤 Switch to Player View<br>• Logout |
| **Capacitor** | Player | Bottom tabs (4 player) | Centered Menu button | 👤 Menu | • ⚙️ Switch to Admin View<br>• 🚪 Logout |
| **Capacitor** | Admin | Bottom tabs (4 admin) | Centered Menu button | ⋮ Menu | • 👤 Switch to Player View<br>• 🚪 Logout |

**Rationale**:
- **Desktop/Mobile Web**: Profile icon in top-right
- **Capacitor**: Centered menu (thumb-friendly on touch screens)
- **Consistent pattern**: One icon, contextual menu across all platforms
- **View switching**: Accessible via menu, doesn't crowd header
- **Logout**: Available everywhere for testing and edge cases
- **Navigation**: Changes based on current view (player vs admin sections)

---

### Role 4: Superadmin (Platform Management)

**Access**: All pages via view switching (`/superadmin/*`, `/admin/*`, `/`)

| Platform | Context | Primary Nav | Header | Menu Icon | Menu Contents |
|----------|---------|-------------|--------|-----------|---------------|
| **Desktop** | Platform | Sidebar (Tenants, System, Info) | Capo logo + Profile icon | 👤 Person | • 🏢 Platform View (current)<br>• ⚙️ View as Admin (Club)<br>• 👤 View as Player (Club)<br>• ───────<br>• 🚪 Logout |
| **Desktop** | Admin View | Sidebar (4 admin items) | Capo logo + Profile icon | 👤 Person | • 🏢 Back to Platform<br>• 👤 View as Player (Club)<br>• ───────<br>• 🚪 Logout |
| **Desktop** | Player View | Sidebar (4 player items) | Capo logo + Profile icon | 👤 Person | • 🏢 Back to Platform<br>• ⚙️ View as Admin (Club)<br>• ───────<br>• 🚪 Logout |
| **Mobile Web** | ❌ | N/A | N/A | N/A | **Not supported** - Desktop only |
| **Capacitor** | ❌ | N/A | N/A | N/A | **Not supported** - Desktop only |

**Rationale**:
- **Desktop only**: Platform management needs full screen, keyboard, complex UI
- **Menu-based view switching**: Quick jump between Platform/Admin/Player views
- **Tenant selection**: Menu shows current club's views; to switch clubs, use Platform view
- **Scalability**: With 50+ clubs, menu shows: "Platform View", "Current Club Views", "Switch to Different Club..." which goes to /superadmin/tenants page with search

**Superadmin Scalability Path**:
- **1-5 clubs**: All clubs in dropdown menu (current implementation)
- **6-20 clubs**: Recent/favorite clubs in menu + "All Clubs..." option
- **20+ clubs**: Menu shows only: "Platform", "Current Club", "Switch Club..." → goes to tenant search page

---

### Header Profile Icon Behavior Summary

**Desktop/Mobile Web**:
- **Icon**: Person icon (👤) in top-right
- **Click**: Opens dropdown menu
- **Menu content**: Role-specific actions (view switching, logout)
- **Visual state**: Highlight if menu open

**Capacitor App**:
- **All authenticated users**: Centered menu button (person icon for players, hamburger for admins)
- **Menu contents**: Context-aware (view switching for admin-players, logout for everyone)
- **Superadmins**: Not supported (desktop only)

**Why Different**:
- **Desktop**: Top-right (standard desktop UX, plenty of space)
- **Mobile Web**: Top-right (same as desktop)
- **Capacitor**: Centered (thumb-friendly on touch screens, single consistent location)

**Logout Decision**: Available on all platforms for all roles. Useful for testing, edge cases, and security. Minimal UI cost.

---

### Navigation Persistence Rules

**Bottom Nav / Sidebar** (Primary navigation):
- **Always shows 4 items** (never changes count)
- **Items change based on view**:
  - Player view: Dashboard, Upcoming, Table, Records
  - Admin view: Matches, Players, Seasons, Setup
  - Superadmin Platform: Tenants, System, Info, (4th TBD)
- **Active state**: Based on current URL
- **Persists across sessions**: User returns to same view

**Header Menu** (Secondary actions):
- **Context-aware**: Different options based on role + location
- **Non-intrusive**: Only one icon, menu on demand
- **Scalable**: Can add items without crowding
- **Platform-specific**: Desktop vs Capacitor differences

---

### Implementation Guidelines

**When adding new features, ask**:
1. Is this a primary destination (add to nav) or action (add to menu)?
2. Does it apply to all roles or specific ones?
3. Is it used often (prominent) or rarely (hide in menu)?
4. Does it work on all platforms or platform-specific?

**Examples**:
- **Invite Link**: Admin only, rare use → Menu item or Players page button
- **RSVP**: Player primary feature → Could be nav item OR part of Upcoming
- **Settings**: Rarely used → Menu item, not nav
- **Logout**: Security feature → Menu item, not prominent

---

## H. UI/UX Implementation

### Authentication Pages

#### Login Page (Admin-Only)
**File**: `src/app/auth/login/page.tsx`
```typescript
'use client';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      alert(error.message);
    } else {
      router.push('/admin');
    }
    setLoading(false);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Sign In
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
          <div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Email address"
            />
          </div>
          
          <div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Password"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

#### Superadmin Tenant Selector (Simplified)
**File**: `src/components/superadmin/TenantSelector.component.tsx`
```typescript
'use client';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

interface Tenant {
  tenant_id: string;
  name: string;
  is_active: boolean;
}

export default function TenantSelector() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  useEffect(() => {
    fetchTenants();
    getCurrentTenant();
  }, []);
  
  const getCurrentTenant = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.app_metadata?.tenant_id) {
      setSelectedTenant(session.user.app_metadata.tenant_id);
    }
  };
  
  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/superadmin/tenants');
      const data = await response.json();
      
      if (data.success) {
        setTenants(data.data);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const switchTenant = async (tenantId: string) => {
    setSwitching(true);
    
    try {
      const response = await fetch('/api/auth/superadmin/switch-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh session to get updated app_metadata
        await supabase.auth.refreshSession();
        
        // Reload to apply new tenant context
        window.location.reload();
      }
    } catch (error) {
      console.error('Error switching tenant:', error);
    } finally {
      setSwitching(false);
    }
  };
  
  if (loading) return <div>Loading tenants...</div>;
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Select Tenant</h3>
      
      <div className="space-y-2">
        {tenants.map(tenant => (
          <button
            key={tenant.tenant_id}
            onClick={() => switchTenant(tenant.tenant_id)}
            disabled={switching}
            className={`w-full text-left p-3 rounded-md border ${
              selectedTenant === tenant.tenant_id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="font-medium">{tenant.name}</div>
            {!tenant.is_active && (
              <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                Inactive
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Note**: Supabase handles session synchronization across tabs automatically. When app_metadata is updated and refreshSession() is called, all tabs receive the updated session via Supabase's built-in sync mechanism.

---

## H. API Endpoints

### Authentication API Routes

**All routes use standard Supabase Auth** - no custom token management or Edge Functions needed.

#### Admin Login
```typescript
// POST /api/auth/admin/login
// Note: Can also use Supabase client directly (supabase.auth.signInWithPassword)
export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  
  const supabase = createRouteHandlerClient({ cookies });
  
  // Supabase handles password verification and session creation
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 401 });
  }
  
  // Verify user has admin_profile
  const adminProfile = await prisma.admin_profiles.findUnique({
    where: { user_id: data.user.id }
  });
  
  if (!adminProfile) {
    await supabase.auth.signOut();
    return NextResponse.json({ 
      success: false, 
      error: 'Not an admin account' 
    }, { status: 403 });
  }
  
  // Update last login timestamp
  await prisma.admin_profiles.update({
    where: { user_id: data.user.id },
    data: { last_login_at: new Date() }
  });
  
  // Log login activity
  await logAuthActivity({
    user_id: data.user.id,
    tenant_id: adminProfile.tenant_id,
    activity_type: 'login',
    success: true
  });
  
  return NextResponse.json({ 
    success: true,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: adminProfile.user_role,
      tenantId: adminProfile.tenant_id
    }
  });
}
```

#### Player Phone Verification (Handled by Supabase)
```typescript
// Players use Supabase auth.signInWithOtp directly from mobile app
// No custom API route needed - Supabase handles SMS sending and verification

// Example client-side code (mobile app):
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+447123456789',
  options: {
    channel: 'sms',
    data: { tenant_id: selectedTenantId }
  }
});

// Then verify:
const { data: session } = await supabase.auth.verifyOtp({
  phone: '+447123456789',
  token: userEnteredCode,
  type: 'sms'
});

// Then call claim-profile endpoint to link (see Player Profile Claiming below)
```

#### Admin Invitation (Simplified)
```typescript
// POST /api/admin/users/invite
export async function POST(request: NextRequest) {
  const { email, player_id, role } = await request.json();
  
  const { user, tenantId } = await requireAdminRole(request, ['admin', 'superadmin']);
  
  // Validate player_id belongs to tenant (if provided)
  if (player_id) {
    const player = await prisma.players.findUnique({
      where: { player_id: player_id }
    });
    
    if (!player || player.tenant_id !== tenantId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid player_id for this tenant' 
      }, { status: 400 });
    }
    
    // Check if player already linked to an admin
    const existingAdmin = await prisma.admin_profiles.findFirst({
      where: { player_id: player_id }
    });
    
    if (existingAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'This player is already linked to an admin account' 
      }, { status: 409 });
    }
  }
  
  // Generate secure invitation token (NEVER store raw)
  const invitationToken = crypto.randomUUID();
  const hashedToken = await bcrypt.hash(invitationToken, 12);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Store invitation with optional player link
  await prisma.admin_invitations.create({
    data: {
      tenant_id: tenantId,
      email,
      invited_by: user.id,
      invited_role: role,
      player_id: player_id || null,
      invitation_token_hash: hashedToken,
      expires_at: expiresAt
    }
  });
  
  // Send invitation email
  await sendInvitationEmail(email, invitationToken, {
    role,
    tenantId,
    linkedPlayerId: player_id
  });
  
  // Log invitation activity
  await logAuthActivity({
    user_id: user.id,
    tenant_id: tenantId,
    activity_type: 'invitation_sent',
    success: true, 
    metadata: { invited_email: email, invited_role: role }
  });
  
  return NextResponse.json({
    success: true, 
    message: 'Invitation sent successfully' 
  });
}
```

#### Accept Admin Invitation
```typescript
// POST /api/auth/admin/accept-invitation
export async function POST(request: NextRequest) {
  const { token, email, password, displayName } = await request.json();
  
  // Verify invitation token
  const invitation = await prisma.admin_invitations.findFirst({
    where: { 
      email: email,
      status: 'pending',
      expires_at: { gt: new Date() }
    }
  });
  
  if (!invitation) {
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid or expired invitation' 
    }, { status: 400 });
  }
  
  // Verify token hash
  const isValid = await bcrypt.compare(token, invitation.invitation_token_hash);
  if (!isValid) {
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid invitation token' 
    }, { status: 401 });
  }
  
  // Create Supabase auth user
  const supabase = createRouteHandlerClient({ cookies });
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName
      }
    }
  });
  
  if (signUpError || !authData.user) {
    return NextResponse.json({ 
      success: false, 
      error: signUpError?.message || 'Failed to create account' 
    }, { status: 500 });
  }
  
  // Explicitly create admin profile (server-side only - prevents bypass)
  await prisma.admin_profiles.create({
    data: {
      user_id: authData.user.id,
      tenant_id: invitation.tenant_id,
      user_role: invitation.invited_role,
      display_name: displayName,
      player_id: invitation.player_id // Null if not linked to player
    }
  });
  
  // Mark invitation as accepted
  await prisma.admin_invitations.update({
    where: { id: invitation.id },
    data: {
      status: 'accepted',
      accepted_by: authData.user.id,
      accepted_at: new Date()
    }
  });
  
  return NextResponse.json({ 
    success: true,
    message: 'Admin account created successfully'
  });
}
```

#### Player Profile Claiming
```typescript
// POST /api/auth/player/claim-profile
// Player verifies phone and links to existing player record
export async function POST(request: NextRequest) {
  const { phone, tenant_id, verification_code } = await request.json();
  
  // Server-side validation: verify tenant_id is valid
  const tenant = await prisma.tenants.findUnique({
    where: { tenant_id: tenant_id }
  });
  
  if (!tenant || !tenant.is_active) {
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid or inactive tenant' 
    }, { status: 400 });
  }
  
  // Verify OTP with Supabase (already called by client, but verify session)
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session || session.user.phone !== phone) {
    return NextResponse.json({ 
      success: false, 
      error: 'Phone verification required' 
    }, { status: 401 });
  }
  
  // Find existing player or create new one
  let player = await prisma.players.findFirst({
    where: { phone, tenant_id }
  });
  
  if (player) {
    // Link existing player to auth user
    if (player.auth_user_id && player.auth_user_id !== session.user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number already claimed by another account' 
      }, { status: 409 });
    }
    
    await prisma.players.update({
      where: { player_id: player.player_id },
      data: { 
        auth_user_id: session.user.id,
        updated_at: new Date()
      }
    });
  } else {
    // Create new player
    player = await prisma.players.create({
      data: {
        tenant_id,
        phone,
        auth_user_id: session.user.id,
        name: 'New Player' // User can update later in app
      }
    });
  }
  
  // Log profile claiming
  await logAuthActivity({
    user_id: session.user.id,
    tenant_id: tenant_id,
    activity_type: 'profile_claimed',
    success: true,
    metadata: { player_id: player.player_id }
  });
  
  return NextResponse.json({ 
    success: true,
    player: {
      id: player.player_id,
      name: player.name,
      tenantId: player.tenant_id
    }
  });
}
```

#### Superadmin Tenant Switch (Simplified)
```typescript
// POST /api/auth/superadmin/switch-tenant
export async function POST(request: NextRequest) {
  const { tenantId } = await request.json();
  
  const { user, userRole } = await requireAdminRole(request, ['superadmin']);
  
  if (userRole !== 'superadmin') {
    return NextResponse.json({ 
      success: false, 
      error: 'Superadmin access required' 
    }, { status: 403 });
  }
  
  // Update app_metadata in Supabase (for RLS and JWT claims)
  const supabase = createRouteHandlerClient({ cookies });
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      tenant_id: tenantId
    }
  });
  
  if (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update tenant context' 
    }, { status: 500 });
  }
  
  // Update admin_profiles metadata
  await prisma.admin_profiles.update({
    where: { user_id: user.id },
    data: { updated_at: new Date() }
  });
  
  // Log tenant switch
  await logAuthActivity({
    user_id: user.id,
    tenant_id: tenantId,
    activity_type: 'tenant_switched',
    success: true,
    metadata: { previous_tenant: user.app_metadata?.tenant_id }
  });
  
  return NextResponse.json({ 
    success: true, 
    message: 'Tenant context updated',
    requiresRefresh: true // Client should call refreshSession()
  });
}
```

#### Role Switching API
```typescript
// POST /api/auth/switch-role
export async function POST(request: NextRequest) {
  const { role } = await request.json();
  const { user, supabase } = await requireAuth(request);
  
  // Validate requested role
  if (role === 'admin') {
    const adminProfile = await prisma.admin_profiles.findUnique({
      where: { user_id: user.id }
    });
    
    if (!adminProfile) {
      return NextResponse.json({ 
        error: 'Admin access required' 
      }, { status: 403 });
    }
  }
  
  if (role === 'player') {
    const adminProfile = await prisma.admin_profiles.findUnique({
      where: { user_id: user.id },
      select: { player_id: true }
    });
    
    if (!adminProfile?.player_id) {
      return NextResponse.json({ 
        error: 'No linked player profile' 
      }, { status: 403 });
    }
  }
  
  // Log role switch
  await logAuthActivity({
    user_id: user.id,
    tenant_id: user.app_metadata?.tenant_id,
    activity_type: 'role_switched',
    success: true,
    metadata: { new_role: role }
  });
  
  // Return success - client updates localStorage for UI preference
  return NextResponse.json({
    success: true,
    currentRole: role
  });
}
```

#### Get User Profile/Session
```typescript
// GET /api/auth/profile
export async function GET(request: NextRequest) {
  const { user, supabase } = await requireAuth(request);
  
  // Check if user has admin profile
  const adminProfile = await prisma.admin_profiles.findUnique({
    where: { user_id: user.id },
    select: { 
      user_role: true, 
      tenant_id: true, 
      player_id: true,
      display_name: true
    }
  });
  
  // Check if user has player profile
  const playerProfile = await prisma.players.findFirst({
    where: {
      OR: [
        { auth_user_id: user.id },
        { player_id: adminProfile?.player_id }
      ]
    },
    select: { 
      player_id: true, 
      name: true,
      tenant_id: true
    }
  });
  
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone
    },
    profile: {
      isAdmin: !!adminProfile,
      adminRole: adminProfile?.user_role,
      displayName: adminProfile?.display_name || playerProfile?.name,
      tenantId: adminProfile?.tenant_id || playerProfile?.tenant_id,
      linkedPlayerId: adminProfile?.player_id || playerProfile?.player_id,
      canSwitchRoles: !!(adminProfile?.player_id)
    }
  });
}
```

---

## J. Implementation Phases

### Phase 1: Core Authentication ✅ **CURRENT SCOPE**

**Deliverables**:
- [ ] Supabase Auth provider configuration (email + phone)
- [ ] Database schema migration (admin_profiles, players.auth_user_id, admin_invitations, auth_activity_log)
- [ ] Authentication middleware (admin and player routes)
- [ ] Admin web signup/login (email + password via invitation)
- [ ] Player mobile signup (phone + SMS OTP)
- [ ] Profile claiming for existing players (server-side validation)
- [ ] Admin invitation system (with bcrypt hashed tokens)

**API Endpoints**:
- [ ] `POST /api/auth/admin/login` (or use Supabase client directly)
- [ ] `POST /api/auth/admin/logout` (Supabase signOut)
- [ ] `POST /api/admin/users/invite` (with player_id linking)
- [ ] `POST /api/auth/admin/accept-invitation` (explicit admin_profile creation)
- [ ] `POST /api/auth/player/claim-profile` (link auth.users to players)
- [ ] `GET /api/auth/profile` (user session + role info)

**Testing**:
- [ ] Admin email/password authentication
- [ ] Player phone/OTP authentication
- [ ] Profile claiming for existing players
- [ ] Tenant isolation for admin routes
- [ ] RLS policies for admin and player access

### Phase 2: Role Switching 🔄 **NEXT**

**Deliverables**:
- [ ] Admin-to-player profile linking (`admin_profiles.player_id`)
- [ ] Role switching UI (mobile app)
- [ ] Role switching API endpoint
- [ ] Navigation updates based on current role
- [ ] Admin mobile login with role detection

**API Endpoints**:
- [ ] `POST /api/auth/switch-role`
- [ ] `POST /api/admin/profile/link-player`
- [ ] `GET /api/superadmin/tenants` (tenant selector)
- [ ] `POST /api/auth/superadmin/switch-tenant`

**Testing**:
- [ ] Admin with linked player can switch roles
- [ ] Navigation updates correctly
- [ ] Role preference persists (localStorage)
- [ ] Admin without player link cannot access player view

### Phase 3: Advanced Security 📋 **FUTURE**

**Deliverables**:
- [ ] TOTP 2FA for admins
- [ ] Mandatory 2FA for superadmin
- [ ] Enhanced audit logging
- [ ] Biometric authentication (mobile app)

---

## K. Security Considerations

### Authentication Security

#### Password Requirements (Configured in Supabase)
```typescript
// Supabase Dashboard → Authentication → Password Settings
const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};

// Additional validation in client
function validatePassword(password: string, email: string): boolean {
  if (password.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
    throw new Error('Password cannot contain your email');
  }
  // Check against common password list (zxcvbn library recommended)
  return true;
}
```

#### Session Management (Native Supabase)
- **JWT Expiry**: 1 hour for access tokens, 30 days for refresh tokens (Supabase default)
- **Automatic Refresh**: Supabase client handles token refresh automatically
- **Session Sync**: Supabase syncs sessions across tabs/devices natively
- **Secure Storage**: Tokens stored in httpOnly cookies (web) or secure storage (mobile)

#### Rate Limiting
```typescript
const AUTH_RATE_LIMITS = {
  // Supabase built-in rate limits (configure in dashboard)
  emailSignup: '4 requests per hour per IP',
  emailLogin: '30 requests per hour per IP',
  phoneOtp: '5 requests per hour per phone',
  passwordReset: '3 requests per hour per email',
  
  // Custom API rate limits (implement with Vercel Edge Config or Redis)
  adminInvitation: '10 invitations per day per admin',
  roleSwitching: '20 switches per hour per user'
};
```

### Data Protection

#### Token Security
- **Invitation Tokens**: bcrypt hashed storage (NEVER store raw tokens, use bcrypt.compare for validation)
- **JWT Tokens**: Managed by Supabase (signed with project JWT secret)
- **Phone Verification**: Supabase OTP system with configurable expiry (default 5 minutes)
- **Session Tokens**: httpOnly cookies prevent XSS attacks

#### PII Handling
- **Phone Number Masking**: Display as `+44 7*** ***789` in UI (except user's own)
- **Email Masking**: Display as `j***@example.com` in logs
- **IP Address Logging**: SHA256 hash in `auth_activity_log` for privacy
- **Audit Trail**: All auth events logged without exposing sensitive data

#### Tenant Isolation
- **RLS Enforcement**: All database queries scoped by tenant via RLS policies
- **JWT Claims**: `tenant_id` in app_metadata for server-side validation
- **API Route Protection**: Middleware validates tenant access via `admin_profiles.tenant_id`
- **Cross-Tenant Prevention**: Explicit tenant checks in all API routes
- **Player Data Access**: Players can only access own data (auth_user_id = auth.uid())

---

## L. Monitoring & Observability (Essential Metrics Only)

### Simplified Metrics Collection

#### Essential Performance Indicators
```typescript
const ESSENTIAL_AUTH_METRICS = {
  // Success rates (actionable)
  'auth.success': 'Successful authentication events per hour',
  'auth.failure': 'Failed authentication attempts per hour',
  'auth.response_time_ms': 'Authentication response time in milliseconds',
  
  // Security events (critical alerts only)
  'security.events': 'Security-relevant events requiring attention'
};
```

#### Practical Dashboard Queries
```sql
-- Essential authentication metrics (actionable alerts)
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  activity_type,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as failed,
  ROUND(AVG(response_time_ms), 2) as avg_response_ms
FROM auth_activity_log 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND activity_type IN ('login', 'rsvp_submission', 'tenant_switched')
GROUP BY DATE_TRUNC('hour', created_at), activity_type
ORDER BY hour DESC;

-- High-priority security alerts only
SELECT 
  ip_address_hash,
  COUNT(*) as failed_attempts,
  array_agg(DISTINCT activity_type) as attempted_actions,
  MAX(created_at) as last_attempt
FROM auth_activity_log
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND success = false
  AND activity_type IN ('login', 'tenant_switched')
GROUP BY ip_address_hash
HAVING COUNT(*) > 10; -- Alert threshold

-- Performance monitoring (RSVP endpoint health)
SELECT 
  DATE_TRUNC('minute', created_at) as minute,
  COUNT(*) as rsvp_requests,
  AVG(response_time_ms) as avg_response_time,
  MAX(response_time_ms) as max_response_time
  FROM auth_activity_log 
WHERE activity_type = 'rsvp_submission'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', created_at)
HAVING AVG(response_time_ms) > 1000 -- Performance alert threshold
ORDER BY minute DESC;
```

### Health Check Endpoints (Essential Only)
```typescript
// GET /api/health/auth
export async function GET() {
  const healthChecks = await Promise.allSettled([
    // Check Supabase Auth connectivity
    checkSupabaseAuth(),
    
    // Check database connectivity
    checkDatabaseHealth()
  ]);
  
  const results = healthChecks.map((check, index) => ({
    service: ['supabase_auth', 'database'][index],
    status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
    error: check.status === 'rejected' ? check.reason.message : null
  }));
  
  const overallHealth = results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded';
  
  return NextResponse.json({
    status: overallHealth,
    timestamp: new Date().toISOString(),
    checks: results
  });
}

async function checkSupabaseAuth(): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.auth.getSession();
    return true; // Auth service is responding
  } catch {
    return false;
  }
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
```

---

## M. Success Criteria & Acceptance Tests

### Functional Requirements

#### Authentication Flows
- [ ] **Admin Web Login**: Email/password authentication completes in <3 seconds
- [ ] **Player Mobile Signup**: Phone/SMS OTP verification works reliably
- [ ] **Profile Claiming**: Existing players can claim profiles via phone verification
- [ ] **Admin Mobile Login**: Admin can login with same email/password on mobile
- [ ] **Tenant Switching**: Superadmin can switch between tenants with session refresh

#### Authorization Controls
- [ ] **Route Protection**: Unauthorized users redirected to appropriate login
- [ ] **Tenant Isolation**: Users cannot access data from other tenants
- [ ] **Role Enforcement**: Each role can only access designated functionality
- [ ] **RLS Validation**: Database policies prevent cross-tenant data leakage
- [ ] **Player Data Access**: Players can only view their own profile

#### Role Switching (Phase 2)
- [ ] **Admin-Player Link**: Admin invitation can include player_id for linking
- [ ] **Role Switcher UI**: Shows only for admins with linked player_id
- [ ] **Navigation Updates**: Bottom nav changes based on current role
- [ ] **Preference Persistence**: Role choice saved in localStorage

### Performance Requirements

#### Response Times
- [ ] **Admin Login**: <2 seconds for email/password authentication
- [ ] **Player OTP Send**: <3 seconds for SMS delivery
- [ ] **Player OTP Verify**: <2 seconds for verification
- [ ] **Role Switch**: <500ms for UI role change
- [ ] **Token Refresh**: Automatic (handled by Supabase client)

#### Security Requirements
- [ ] **Invitation Security**: bcrypt hashed invitation tokens (NEVER store raw)
- [ ] **Session Management**: Supabase native session handling (automatic sync)
- [ ] **Password Strength**: Minimum 12 characters with complexity requirements
- [ ] **Audit Trail**: All auth events logged with hashed PII for privacy
- [ ] **Phone Privacy**: Phone numbers masked in UI (except user's own)

#### Scalability Requirements
- [ ] **Database Performance**: Auth queries complete in <100ms with proper indexes
- [ ] **Concurrent Logins**: Handle 100+ simultaneous logins (Supabase managed)
- [ ] **SMS Delivery**: Reliable OTP delivery via Twilio/Messagebird

---

## M2. Additional Notes

### Background Job Tenant Context

**Mandatory Tenant Payload**:
All background jobs must explicitly include `tenant_id`:
```typescript
// Job enqueue pattern
const jobPayload = {
  tenant_id: tenantId,        // REQUIRED for all jobs
  job_type: 'stats_update',
  triggered_by: source,
  request_id: crypto.randomUUID()
};

await prisma.background_job_status.create({
  data: {
    tenant_id: tenantId,      // REQUIRED in job record
    job_payload: jobPayload,
    status: 'queued'
  }
});
```

**Worker Tenant Context Setting**:
Workers must set tenant context before any database operations:
```typescript
// In worker processing
async function processJob(job: JobData) {
  const { tenant_id } = job.payload;
  
  if (!tenant_id) {
    throw new Error('Job missing required tenant_id in payload');
  }
  
  // Set RLS context for all subsequent queries
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant_id}, false)`;
  
  // OR pass tenant_id to SQL functions
  await supabase.rpc('update_stats_function', { target_tenant_id: tenant_id });
}
```

**Multi-Tenancy Isolation Guarantee**:
This pattern ensures background jobs cannot accidentally process data across tenant boundaries, maintaining strict isolation even in async operations.

### Migration Recovery Strategy

**Transactional Migration Pattern**:
```sql
-- All migrations wrapped in transactions where possible
BEGIN;
  -- Migration steps
  ALTER TABLE players ADD COLUMN tenant_id UUID;
  UPDATE players SET tenant_id = '00000000-0000-0000-0000-000000000001';
  ALTER TABLE players ALTER COLUMN tenant_id SET NOT NULL;
  
  -- Validation check before commit
  SELECT COUNT(*) FROM players WHERE tenant_id IS NULL;
  -- If count > 0, ROLLBACK; else COMMIT;
COMMIT;
```

**Schema Snapshot Recovery**:
```bash
# Manual recovery script location
/db/rollback/restore_pre_multitenancy_schema.sql

# Contents: Complete schema restoration + data re-seeding
# Usage: psql -d database_name -f /db/rollback/restore_pre_multitenancy_schema.sql
```

**Recovery Script Template**:
```sql
-- /db/rollback/restore_pre_multitenancy_schema.sql
BEGIN;
  -- Drop all tenant-related constraints and columns
  ALTER TABLE players DROP CONSTRAINT IF EXISTS fk_players_tenant;
  ALTER TABLE players DROP COLUMN IF EXISTS tenant_id;
  
  -- Restore original unique constraints
  ALTER TABLE players ADD CONSTRAINT unique_player_name UNIQUE(name);
  
  -- Drop tenants table and related structures
  DROP TABLE IF EXISTS tenants CASCADE;
  
  -- Re-seed any global configuration
  INSERT INTO app_config (config_key, config_value) VALUES 
    ('system_mode', 'single_tenant');
COMMIT;
```


## N. Appendix

### Configuration Templates

#### Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration (from Supabase dashboard)
SUPABASE_JWT_SECRET=your-jwt-secret

# Auth Configuration
NEXT_PUBLIC_SITE_URL=https://your-domain.com
AUTH_REDIRECT_URL=https://your-domain.com/auth/callback

# Security Settings
PASSWORD_MIN_LENGTH=12

# SMS Configuration (Twilio for Supabase phone provider)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Rate Limiting (optional - Vercel Edge Config or Redis)
RATE_LIMIT_REDIS_URL=redis://localhost:6379
AUTH_RATE_LIMIT_PER_15MIN=5
ADMIN_INVITE_LIMIT_PER_DAY=10
```

#### Supabase Dashboard Configuration

**Authentication → Providers**:
```yaml
Email:
  enabled: true
  confirm_email: true  # Require email verification
  secure_password_change: true
  minimum_password_length: 12

Phone:
  enabled: true
  provider: twilio  # Or messagebird
  phone_otp_length: 6
  phone_otp_expiry: 300  # 5 minutes
```

**Authentication → Email Templates**:
- Customize admin invitation email
- Customize password reset email
- Add branding and support links

**Authentication → URL Configuration**:
```
Site URL: https://your-domain.com
Redirect URLs: 
  - https://your-domain.com/auth/callback
  - capacitor://localhost (for mobile app)
```

### Database Migration Checklist

**Pre-Migration**:
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Enable Supabase Auth providers (email + phone)
- [ ] Configure Twilio for SMS delivery

**Migration Steps**:
1. Run schema migrations (admin_profiles, players.auth_user_id, admin_invitations, auth_activity_log)
2. Create initial superadmin account (see below)
3. Test admin signup/login flow
4. Test player phone verification flow
5. Verify RLS policies are working

### Creating First Superadmin

After running schema migrations, create the initial superadmin manually:

**Step 1: Create auth.users record**
```typescript
// Via Supabase Dashboard → Authentication → Users → Add User
// OR via API:
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role
);

const { data, error } = await supabase.auth.admin.createUser({
  email: 'superadmin@capo.com',
  password: 'very_secure_password',
  email_confirm: true // Skip email verification
});

// Note the user_id from the response
```

**Step 2: Create admin_profiles record**
```sql
-- Run once in Supabase SQL Editor
INSERT INTO admin_profiles (user_id, tenant_id, user_role, display_name)
VALUES (
  'your-auth-user-uuid-here',  -- From auth.users.id (step 1)
  NULL,                         -- NULL = superadmin (cross-tenant)
  'superadmin',
  'Your Name'
);
```

**Verification**:
```sql
-- Verify superadmin was created correctly
SELECT 
  au.email,
  ap.user_role,
  ap.tenant_id,
  ap.display_name
FROM auth.users au
JOIN admin_profiles ap ON ap.user_id = au.id
WHERE ap.user_role = 'superadmin';
```

**Note**: Automated superadmin creation via marketing/onboarding pages will be added in future phase.

**Post-Migration**:
- [ ] Verify all existing players can claim profiles
- [ ] Test admin invitation flow
- [ ] Test role switching (if admin has player_id linked)
- [ ] Monitor auth_activity_log for issues

### Helper Functions

#### Phone Number Utilities
```typescript
// src/utils/phone.util.ts

/**
 * Normalize UK phone numbers to E.164 format
 * Supports: 07XXX XXXXXX → +447XXX XXXXXX
 * Future: Expand for international with libphonenumber-js
 */
export function normalizeToE164(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+44')) {
    return cleaned; // Already E.164
  }
  
  if (cleaned.startsWith('07')) {
    return '+44' + cleaned.substring(1);
  }
  
  throw new Error('Invalid UK phone number format. Use 07XXX XXXXXX or +44 format');
}

/**
 * Validate UK phone number format
 */
export function isValidUKPhone(phone: string): boolean {
  const e164 = normalizeToE164(phone);
  return /^\+44[1-9]\d{9}$/.test(e164);
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string, mask: boolean = false): string {
  // E.164 format: +447123456789
  if (!phone) return '';
  
  if (mask) {
    // Mask middle digits: +44 7*** ***789
    const countryCode = phone.slice(0, 3);
    const lastDigits = phone.slice(-3);
    return `${countryCode} ${phone[3]}*** ***${lastDigits}`;
  }
  
  // Format for display: +44 7123 456789
  return phone.replace(/(\+\d{2})(\d{4})(\d+)/, '$1 $2 $3');
}
```

#### Activity Logging Helper
```typescript
export async function logAuthActivity(params: {
  user_id: string;
  tenant_id?: string;
  activity_type: string;
  success: boolean;
  failure_reason?: string;
  metadata?: Record<string, any>;
  request?: NextRequest;
}) {
  const ipHash = params.request 
    ? crypto.createHash('sha256').update(params.request.ip || 'unknown').digest('hex')
    : null;
    
  const userAgentHash = params.request?.headers.get('user-agent')
    ? crypto.createHash('sha256').update(params.request.headers.get('user-agent')!).digest('hex')
    : null;
  
  await prisma.auth_activity_log.create({
    data: {
      user_id: params.user_id,
      tenant_id: params.tenant_id,
      activity_type: params.activity_type,
      success: params.success,
      failure_reason: params.failure_reason,
      ip_address_hash: ipHash,
      user_agent_hash: userAgentHash,
      metadata: params.metadata || {}
    }
  });
}
```

---

**Document Status**: ✅ Implementation Complete - Phase 1  
**Version**: 4.1.0 (Implemented with enhancements)  
**Last Updated**: October 1, 2025  
**Implementation Notes**: See `docs/AUTH_IMPLEMENTATION_PROGRESS.md` for detailed progress  

**Next Steps**: 
1. Configure Supabase Auth providers (email + phone)
2. Run database migrations (Section C)
3. Implement Phase 1 authentication flows
4. Test admin and player signup/login

This specification provides a complete, production-ready authentication system using industry-standard Supabase Auth for all users. Admins authenticate via email/password, players via phone/SMS OTP, unified under one auth system with proper multi-tenancy isolation.