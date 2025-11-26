# Capo Authentication Specification

**Version:** 6.6.0 - Phone-Only Authentication  
**Last Updated:** November 26, 2025  
**Status:** ✅ Production Ready (Web + Android + iOS)

**🔄 For Implementation History:** See `ARCHIVE_auth_phases.md` for Phases 1-7 implementation details

---

## Executive Summary

### Current Architecture (v6.6 - Phone-Only)

**Single Authentication System:** Supabase Phone Provider for ALL users (admins and players)

**Access Levels:**
- **Players:** View stats, RSVP matches, track performance (mobile + web)
- **Admins:** Player permissions PLUS club management (web dashboard + mobile)
- **Superadmin:** Platform-level tenant management (phone auth + superadmin flag)

**Key Principle:** Admin is a permission flag (`players.is_admin = true`), not a separate account type

### Design Principles

1. **One Auth System:** All users authenticate via Supabase Phone Provider only
2. **Admin = Privileged Player:** Admins are players with `is_admin` flag set
3. **Unified Sessions:** Same JWT token works across web and mobile
4. **Promotion-Based:** Players promoted to admin (no separate invitation)
5. **Platform-Native:** Leverage Supabase session management, token refresh, security

### Why Phone-Only (October 2025)

**Decision:** Migrated from dual auth (email + phone) to phone-only authentication

**Rationale:**
1. **User reality:** 95% of admins also play → why separate them?
2. **Simplicity:** One auth system vs two (easier to maintain)
3. **Sports app pattern:** Matches Spond, TeamSnap (industry standard)
4. **No linking complexity:** Admin is just a flag, not separate account
5. **Casual football:** Weekly kickabout, not enterprise club management

**Trade-off accepted:** Desktop admins need phone for SMS on first login (then stays logged in)

### What's Implemented

**✅ Complete:**
- Phone/SMS authentication for all users (Supabase Phone Provider)
- Admin promotion system (players promoted to admin)
- Role-based access control (player/admin/superadmin)
- Club creation flow (admin signup)
- Player join flow (invite tokens + club codes)
- Tenant isolation (multi-tenancy with RLS)
- Mobile app authentication (iOS + Android)
- Deep linking (capo:// + universal links)
- Session management (JWT tokens, automatic refresh)

**📋 Future Enhancements:**
- 2FA for admin accounts
- Biometric auth (fingerprint/Face ID)
- Enhanced audit logging dashboard

---

## Authentication Technology Stack

### Supabase Auth (Unified System)

**Why Supabase Auth:**
- **Phone/SMS support:** OTP via Twilio integration
- **Multi-tenant ready:** RLS with tenant isolation
- **JWT tokens:** OAuth2 flows with automatic refresh
- **Built-in security:** Token management, session handling
- **Mobile SDK:** Native Capacitor integration
- **Existing infrastructure:** Already using Supabase for database

### Phone Provider Configuration

**Provider:** Supabase Phone Auth with Twilio SMS

**OTP Flow:**
1. User enters phone number (E.164 format, normalized server-side)
2. Supabase sends 6-digit OTP via Twilio
3. User enters OTP code
4. Supabase validates and creates session
5. JWT token issued with `user.phone` claim
6. Session persists in browser/mobile app

**Configuration:**
```typescript
// Supabase client initialization
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sign in with phone
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+447123456789', // E.164 format
  options: {
    channel: 'sms'
  }
});
```

**Security:**
- Rate limiting: 3 OTP attempts per hour per phone
- OTP expiry: 60 seconds
- Phone normalization: Server-side E.164 conversion
- Token rotation: Automatic JWT refresh

---

## Database Schema

### Core Tables

**`auth.users`** (Supabase managed):
```sql
id UUID PRIMARY KEY
phone TEXT UNIQUE NOT NULL  -- E.164 format
created_at TIMESTAMPTZ
last_sign_in_at TIMESTAMPTZ
-- Managed by Supabase Auth
```

**`tenants`** (Capo managed):
```sql
tenant_id UUID PRIMARY KEY
name TEXT NOT NULL
slug VARCHAR(50) UNIQUE NOT NULL
club_code VARCHAR(5) UNIQUE NOT NULL  -- Join code (e.g., "FC247")
created_at TIMESTAMPTZ DEFAULT now()
is_active BOOLEAN DEFAULT true
settings JSONB DEFAULT '{}'
```

**`players`** (Capo managed):
```sql
player_id INT PRIMARY KEY
tenant_id UUID NOT NULL REFERENCES tenants(tenant_id)
auth_user_id UUID REFERENCES auth.users(id)
phone TEXT NOT NULL  -- E.164 format
email TEXT           -- Optional for players, required for admins
name VARCHAR(14) NOT NULL
is_admin BOOLEAN DEFAULT false
is_retired BOOLEAN DEFAULT false
created_at TIMESTAMPTZ DEFAULT now()

-- Constraints
UNIQUE(tenant_id, phone)  -- One player per phone per tenant
UNIQUE(tenant_id, name)   -- Unique names within tenant
```

**`admin_profiles`** (Capo managed):
```sql
profile_id UUID PRIMARY KEY
tenant_id UUID NOT NULL REFERENCES tenants(tenant_id)
player_id INT NOT NULL REFERENCES players(player_id)
auth_user_id UUID NOT NULL REFERENCES auth.users(id)
created_at TIMESTAMPTZ DEFAULT now()

-- Constraints
UNIQUE(auth_user_id, tenant_id)  -- One admin profile per user per tenant
```

**`club_invite_tokens`** (Capo managed):
```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL REFERENCES tenants(tenant_id)
token VARCHAR(255) UNIQUE NOT NULL  -- URL-safe token
is_active BOOLEAN DEFAULT true
expires_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT now()
```

### RLS Policies

**Tenants table:**
```sql
-- Allow users to read their own tenants
CREATE POLICY tenants_read_own ON tenants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.tenant_id = tenants.tenant_id
      AND p.auth_user_id = auth.uid()
    )
  );
```

**Players table:**
```sql
-- Allow users to read players in their tenant
CREATE POLICY players_read_own_tenant ON players
  FOR SELECT USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- Allow admins to manage players in their tenant
CREATE POLICY players_admin_manage ON players
  FOR ALL USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND EXISTS (
      SELECT 1 FROM players p
      WHERE p.tenant_id = players.tenant_id
      AND p.auth_user_id = auth.uid()
      AND p.is_admin = true
    )
  );
```

---

## Role-Based Access Control

### Role Hierarchy

```
Superadmin → Can manage all tenants, switch between them
    ↓
Admin → Can manage club (players, matches, settings)
    ↓
Player → Can view stats, RSVP to matches
```

### Role Determination

**From database:**
```typescript
// Get user's role for current tenant
const { data: player } = await prisma.players.findFirst({
  where: {
    auth_user_id: session.user.id,
    tenant_id: currentTenantId
  },
  select: {
    player_id: true,
    is_admin: true,
    tenant_id: true
  }
});

const role = player?.is_admin ? 'admin' : 'player';
```

**Cached in session:**
```typescript
// Stored in JWT claims
interface SessionUser {
  id: string;
  phone: string;
  player_id?: number;
  tenant_id?: string;
  is_admin?: boolean;
}
```

### Permission Matrix

| Action | Player | Admin | Superadmin |
|--------|--------|-------|------------|
| View own stats | ✅ | ✅ | ✅ |
| View club stats | ✅ | ✅ | ✅ |
| RSVP to matches | ✅ | ✅ | ✅ |
| Create matches | ❌ | ✅ | ✅ |
| Manage players | ❌ | ✅ | ✅ |
| Edit club settings | ❌ | ✅ | ✅ |
| Create clubs | ❌ | ✅ (signup) | ✅ |
| Switch tenants | ❌ | ❌ | ✅ |
| Manage platform | ❌ | ❌ | ✅ |

---

## Authentication Flows

### 1. Player Join Flow (Invite Link)

**Trigger:** Player receives WhatsApp/SMS with invite link

**URL:** `https://app.caposport.com/join/{slug}/{token}`

**Flow:**
1. Player clicks invite link (opens in browser/app)
2. Lands on join page (shows club name)
3. If not authenticated:
   - Enters phone number
   - Receives SMS OTP
   - Enters OTP code
   - Supabase creates session
4. Enters player details:
   - Name (required, 1-14 chars)
   - Email (optional, for notifications)
5. System creates player record:
   - Links `auth_user_id` to `players.auth_user_id`
   - Sets `tenant_id` from invite token
   - Sets `is_admin = false`
6. Redirects to `/player/dashboard`

**API:** `POST /api/join/link-player`

### 2. Admin Signup Flow (Club Creation)

**Trigger:** Marketing site "Start Your Club" button

**URL:** `https://app.caposport.com/signup/admin`

**Flow:**
1. Lands on admin signup page
2. Platform detection:
   - Mobile: Shows app download prompt (optional)
   - Desktop: Shows signup form directly
3. Completes phone authentication (OTP flow)
4. Enters club details:
   - Club name (required, 1-50 chars)
   - Personal name (required, 1-14 chars)
   - Email (required, for admin comms)
5. System creates (atomic transaction):
   - Tenant record (with auto-generated club_code)
   - Player record (`is_admin = true`)
   - Admin profile record
6. Redirects to `/admin/dashboard`
7. Displays club code for sharing (e.g., "Your club code is FC247")

**API:** `POST /api/admin/create-club`

### 3. Player Join by Club Code

**Trigger:** Player has no invite link but knows club code

**URL:** `https://app.caposport.com/auth/no-club`

**Flow:**
1. Player authenticates via phone (OTP)
2. System checks for existing player record
3. If not found, redirects to "no club" page
4. Player enters 5-character club code (e.g., "FC247")
5. System looks up tenant by `club_code`
6. If found, generates invite token and redirects to join flow
7. If not found, shows error: "Club code not found"

**API:** `POST /api/join/by-code`

### 4. Admin Login Flow

**URL:** `https://app.caposport.com/auth/login`

**Flow:**
1. Admin enters phone number
2. Receives SMS OTP
3. Enters OTP code
4. Supabase validates and creates session
5. System checks for admin status:
   - Queries `players` table for `auth_user_id` + `is_admin = true`
6. If admin for multiple tenants:
   - Shows tenant selector
   - Admin chooses which club to manage
7. Redirects to `/admin/dashboard` for selected tenant

### 5. Role Switching (Admin-Players)

**Scenario:** Admin who also plays wants to view player dashboard

**Trigger:** Profile dropdown menu

**Flow:**
1. Admin clicks "Switch to Player View" in dropdown
2. System checks: `is_admin = true` in current tenant
3. If yes, redirects to `/player/dashboard`
4. Player view shows limited UI (no admin features)
5. Profile dropdown shows "Switch to Admin View"
6. Clicking switches back to `/admin/dashboard`

**Implementation:**
```typescript
// In profile dropdown component
const { data: profile } = await useProfile();

{profile.is_admin && (
  <button onClick={() => router.push('/player/dashboard')}>
    Switch to Player View
  </button>
)}
```

**Note:** Both views use same session, same data, just different UI

---

## Middleware & Route Protection

### Route Protection Strategy

**Public routes** (no auth required):
- `/` - Marketing homepage
- `/auth/login` - Login page
- `/auth/no-club` - No club found page
- `/join/{slug}/{token}` - Join flow
- `/privacy` - Privacy policy
- `/terms` - Terms of service

**Protected routes** (auth required):
- `/admin/*` - Admin dashboard and management
- `/player/*` - Player dashboard and stats
- `/api/admin/*` - Admin API endpoints
- `/api/player/*` - Player API endpoints

### Middleware Implementation

**File:** `src/middleware.ts`

**Pattern:**
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Check session
  const { data: { session } } = await supabase.auth.getSession();

  // Public routes - allow through
  if (isPublicRoute(request.nextUrl.pathname)) {
    return res;
  }

  // Protected routes - require auth
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
```

### API Route Protection

**Pattern:** Use `requireAuth()` or `requireAdminRole()` helpers

**File:** `src/lib/auth/apiAuth.ts`

```typescript
// Require any authentication
export async function requireAuth(request: NextRequest): Promise<Session> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    throw new Error('Unauthorized');
  }
  
  return session;
}

// Require admin role
export async function requireAdminRole(request: NextRequest): Promise<Profile> {
  const session = await requireAuth(request);
  
  const player = await prisma.players.findFirst({
    where: {
      auth_user_id: session.user.id,
      tenant_id: getCurrentTenantId(),
      is_admin: true
    }
  });
  
  if (!player) {
    throw new Error('Forbidden: Admin access required');
  }
  
  return { ...session.user, ...player };
}

// Require superadmin role
export async function requireSuperadmin(request: NextRequest): Promise<Profile> {
  const session = await requireAuth(request);
  
  // Check superadmin flag (stored in admin_profiles or auth metadata)
  const isSuper = await checkSuperadminStatus(session.user.id);
  
  if (!isSuper) {
    throw new Error('Forbidden: Superadmin access required');
  }
  
  return session.user;
}
```

**Usage in API routes:**
```typescript
// Admin-only endpoint
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    await requireAdminRole(request);  // 🔒 MANDATORY
    
    // Now safe to proceed with admin operations
    const data = await prisma.players.findMany({
      where: withTenantFilter(tenantId)
    });
    
    return NextResponse.json({ success: true, data });
  });
}
```

---

## Multi-Tenancy Integration

### Tenant Context Resolution

**Pattern:** Use `withTenantContext()` wrapper for all API routes

**File:** `src/lib/tenantContext.ts`

```typescript
export async function withTenantContext<T>(
  request: NextRequest,
  handler: (tenantId: string) => Promise<T>,
  options?: { allowUnauthenticated?: boolean }
): Promise<T> {
  // 1. Check for superadmin tenant override (cookie)
  const overrideTenantId = request.cookies.get('admin_tenant_override')?.value;
  if (overrideTenantId) {
    return handler(overrideTenantId);
  }
  
  // 2. Get session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && !options?.allowUnauthenticated) {
    throw new Error('Unauthorized');
  }
  
  // 3. Resolve tenant from player record
  const player = await prisma.players.findFirst({
    where: { auth_user_id: session.user.id },
    select: { tenant_id: true }
  });
  
  if (!player) {
    throw new Error('No tenant association');
  }
  
  // 4. Set RLS context
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${player.tenant_id}, false)`;
  
  // 5. Execute handler
  return handler(player.tenant_id);
}
```

**MANDATORY Pattern for ALL tenant-scoped API routes:**
```typescript
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // Tenant context automatically set
    // All queries MUST include tenant filtering
    
    const data = await prisma.table.findMany({
      where: withTenantFilter(tenantId)  // 🔒 MANDATORY
    });
    
    return NextResponse.json({ success: true, data });
  });
}
```

### Superadmin Tenant Switching

**Scenario:** Superadmin needs to manage multiple tenants

**Implementation:**
```typescript
// Set tenant override (superadmin only)
export async function POST(request: NextRequest) {
  await requireSuperadmin(request);
  
  const { tenantId } = await request.json();
  
  // Set cookie with tenant override
  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_tenant_override', tenantId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24  // 24 hours
  });
  
  return response;
}

// Clear tenant override (return to own tenant)
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_tenant_override');
  return response;
}
```

**UI Implementation:**
```typescript
// Superadmin tenant selector in admin header
const [tenants, setTenants] = useState([]);

// Show dropdown if superadmin
{isSuperadmin && (
  <select onChange={handleTenantSwitch}>
    <option value="">My Club</option>
    {tenants.map(t => (
      <option key={t.id} value={t.id}>{t.name}</option>
    ))}
  </select>
)}
```

---

## Security Considerations

### Critical Security Rules

**🔴 MANDATORY for ALL tenant-scoped queries:**

1. **Explicit tenant filtering:**
   ```typescript
   where: withTenantFilter(tenantId)  // MANDATORY
   ```

2. **Authorization checks:**
   ```typescript
   await requireAdminRole(request);  // For admin endpoints
   await requireAuth(request);       // For any protected endpoint
   ```

3. **RLS policies are NOT enforcing:**
   - Database connection uses `postgres` role with `BYPASS RLS` privilege
   - Explicit filtering is the ONLY security layer
   - Missing filters = cross-tenant data leak

### Security Architecture Reality

**⚠️ CRITICAL:** RLS policies exist but do NOT enforce (postgres role bypasses RLS)

**Actual Security Model:**
- ✅ **Layer 1 (ONLY): Explicit Filtering** - Application queries with `where: { tenant_id }`
- ❌ **Layer 2 (DORMANT): RLS Policies** - Exist but do not enforce

**Why this still works:**
- Explicit filtering is visible in code (easy to audit)
- TypeScript enforces pattern usage
- Debugging is clearer (queries visible in logs)
- No connection pooling race conditions

**See:** `SPEC_multi_tenancy.md` Section Q for complete RLS architecture decision

### Auth Token Security

**JWT Token Storage:**
- **Web:** HTTP-only cookies (Supabase default)
- **Mobile:** Secure storage (iOS Keychain / Android Keystore via Capacitor)

**Token Rotation:**
- Access token: 1 hour expiry
- Refresh token: 30 days expiry
- Automatic rotation via Supabase SDK

**Session Management:**
```typescript
// Auto-refresh token
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed successfully');
  }
});
```

### Rate Limiting

**OTP Requests:**
- 3 attempts per hour per phone number
- Enforced by Supabase/Twilio

**API Endpoints:**
- Admin endpoints: 100 requests per minute per user
- Player endpoints: 50 requests per minute per user
- Public endpoints: 10 requests per minute per IP

### Audit Logging

**Logged Events:**
- User authentication (success/failure)
- Admin actions (player management, match creation)
- Tenant creation
- Permission changes (admin promotion)
- Suspicious activity (multiple failed logins, cross-tenant access attempts)

**Implementation:**
```typescript
// Log activity
await prisma.auth_activity_log.create({
  data: {
    activity_type: 'login',
    user_id: session.user.id,
    tenant_id: tenantId,
    ip_address: getClientIP(request),
    user_agent: request.headers.get('user-agent'),
    success: true,
    created_at: new Date()
  }
});
```

---

## Mobile App Authentication

### Platform: iOS + Android (Capacitor)

**Implementation:** Same authentication flows as web (Supabase SDK works natively)

**Key Differences:**
- **Deep linking:** Custom `capo://` scheme + universal links
- **Session persistence:** iOS Keychain / Android Keystore (automatic)
- **Push notifications:** Requires authentication for device token registration

### Deep Link Configuration

**Custom Scheme:** `capo://join/{slug}/{token}`

**iOS Configuration** (`Info.plist`):
```xml
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
```

**Android Configuration** (`AndroidManifest.xml`):
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="capo" />
</intent-filter>
```

**Universal Links:** `https://capo.app/join/{slug}/{token}`
- Requires `.well-known/apple-app-site-association` file
- Auto-opens app if installed, falls back to web if not

### Mobile API Calls

**Pattern:** Use `apiFetch()` helper (not raw `fetch()`)

**File:** `src/lib/apiConfig.ts`

```typescript
export async function apiFetch(path: string, options?: RequestInit) {
  const baseUrl = Capacitor.isNativePlatform() 
    ? 'https://app.caposport.com/api'
    : '/api';
  
  return fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'include',  // Important for session cookies
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });
}
```

**Migration Status:** ✅ 218 uses across 62 files (complete)

---

## UI Implementation Patterns

### Login Form (Mobile + Web)

**File:** `src/app/auth/login/page.tsx`

```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const router = useRouter();

  const handleSendOTP = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { channel: 'sms' }
    });
    
    if (!error) setStep('otp');
  };

  const handleVerifyOTP = async () => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms'
    });
    
    if (!error) router.push('/admin/dashboard');
  };

  return (
    <div>
      {step === 'phone' && (
        <form onSubmit={handleSendOTP}>
          <input 
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+44..."
          />
          <button type="submit">Send Code</button>
        </form>
      )}
      
      {step === 'otp' && (
        <form onSubmit={handleVerifyOTP}>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit code"
          />
          <button type="submit">Verify</button>
        </form>
      )}
    </div>
  );
}
```

### Profile Dropdown (Role Switching)

**Pattern:** Show role-specific options based on `is_admin` flag

```typescript
const { data: profile } = useProfile();

<DropdownMenu>
  {profile.is_admin && (
    <>
      <DropdownItem href="/admin/dashboard">
        Admin Dashboard
      </DropdownItem>
      <DropdownItem href="/player/dashboard">
        Player View
      </DropdownItem>
      <DropdownDivider />
    </>
  )}
  
  <DropdownItem onClick={handleLogout}>
    Logout
  </DropdownItem>
</DropdownMenu>
```

---

## API Endpoints

### Authentication Endpoints

**`POST /api/auth/send-otp`**
- Sends SMS OTP to phone number
- Rate limited: 3 attempts per hour
- Returns: `{ success: true }`

**`POST /api/auth/verify-otp`**
- Verifies OTP code
- Creates/updates session
- Returns: `{ success: true, redirect: '/admin/dashboard' }`

**`POST /api/auth/logout`**
- Clears session
- Revokes tokens
- Returns: `{ success: true }`

**`GET /api/auth/session`**
- Returns current session
- Returns: `{ user: {...}, tenant_id: '...' }`

**`GET /api/auth/profile`**
- Returns user profile with role
- Returns: `{ ...player, is_admin: boolean }`

### Admin Endpoints

**`POST /api/admin/create-club`**
- Creates new tenant + admin player
- Requires: phone auth complete
- Body: `{ email, name, club_name }`
- Returns: `{ success: true, tenant_id, player_id }`

**`POST /api/admin/promote-player`**
- Promotes player to admin
- Requires: admin role
- Body: `{ player_id }`
- Returns: `{ success: true }`

**`POST /api/admin/demote-player`**
- Removes admin role
- Requires: admin role
- Body: `{ player_id }`
- Returns: `{ success: true }`

### Player Endpoints

**`POST /api/join/link-player`**
- Links authenticated user to tenant
- Requires: valid invite token
- Body: `{ token, name, email? }`
- Returns: `{ success: true, player_id }`

**`POST /api/join/by-code`**
- Looks up tenant by club code
- Generates invite token
- Body: `{ club_code }`
- Returns: `{ success: true, join_url }`

---

## Monitoring & Observability

### Key Metrics to Track

**Authentication:**
- Login success rate (target: > 99%)
- OTP delivery time (target: < 5 seconds)
- Failed login attempts (alert if > 5 per user per hour)
- Session duration (average)

**User Activity:**
- Daily active users (DAU)
- Weekly active users (WAU)
- New signups per day
- Admin vs player ratio

**Performance:**
- Auth endpoint response time (target: < 200ms)
- OTP delivery success rate (target: > 99%)
- Token refresh success rate (target: > 99.9%)

### Logging Strategy

**Log Levels:**
- `INFO`: Successful logins, signups, role changes
- `WARN`: Failed login attempts, rate limit hits
- `ERROR`: Auth failures, API errors, data issues

**Structured Logging Format:**
```json
{
  "timestamp": "2025-11-26T10:30:00Z",
  "level": "INFO",
  "event": "login_success",
  "user_id": "uuid",
  "tenant_id": "uuid",
  "platform": "mobile_ios",
  "ip_address": "***.***.123.456"  // Masked for privacy
}
```

---

## Success Criteria

### Authentication Works When:

✅ **Player Join:**
- Player clicks invite link → Completes phone auth → Creates account → Sees player dashboard

✅ **Admin Signup:**
- Admin clicks "Start Club" → Completes phone auth → Enters details → Creates club → Sees admin dashboard + club code

✅ **Admin Login:**
- Admin enters phone → Receives OTP → Enters code → Sees admin dashboard

✅ **Role Switching:**
- Admin clicks "Player View" → Sees player dashboard
- Player view shows "Admin View" → Switches back to admin dashboard

✅ **Tenant Isolation:**
- Admin A cannot see Admin B's data
- Player A cannot see Player B's tenant data
- Queries with missing `tenant_id` filter fail

✅ **Mobile App:**
- Deep links open app correctly
- Sessions persist across app restarts
- Authentication works same as web

---

## Appendix

### Phone Number Normalization

**E.164 Format:** `+[country code][number]`

**Examples:**
- UK: `+447123456789`
- US: `+15551234567`
- France: `+33612345678`

**Server-Side Normalization:**
```typescript
import parsePhoneNumber from 'libphonenumber-js';

export function normalizeToE164(phone: string): string {
  try {
    const parsed = parsePhoneNumber(phone, 'GB');  // Default country
    return parsed?.format('E.164') || phone;
  } catch {
    return phone;  // Return as-is if parsing fails
  }
}
```

### JWT Token Claims

**Standard claims:**
```json
{
  "sub": "user-uuid",
  "phone": "+447123456789",
  "role": "authenticated",
  "iat": 1700000000,
  "exp": 1700003600
}
```

**Custom claims (added by API):**
```json
{
  "player_id": 123,
  "tenant_id": "tenant-uuid",
  "is_admin": true
}
```

### Useful SQL Queries

**Find user's tenants:**
```sql
SELECT t.* 
FROM tenants t
JOIN players p ON p.tenant_id = t.tenant_id
WHERE p.auth_user_id = 'user-uuid';
```

**Check if user is admin:**
```sql
SELECT p.is_admin
FROM players p
WHERE p.auth_user_id = 'user-uuid'
AND p.tenant_id = 'tenant-uuid';
```

**Get club by code:**
```sql
SELECT *
FROM tenants
WHERE club_code = 'FC247'
AND is_active = true;
```

---

**Document Status:** ✅ Production Ready  
**Last Updated:** November 26, 2025  
**Version:** 6.6.0  
**Platform Support:** Web + iOS + Android

**For implementation history, see:** `ARCHIVE_auth_phases.md`
