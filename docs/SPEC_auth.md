# BerkoTNF Authentication & Authorization Implementation Specification

Version 1.0.0 • Implementation-Ready Design Document

**SUPABASE AUTH INTEGRATION FOR MULTI-TENANT CAPO PLATFORM**

This specification provides a comprehensive, execution-ready plan for implementing robust authentication and authorization across the entire BerkoTNF application, integrating cleanly with the existing RSVP and multi-tenancy architecture.

---

## A. Executive Summary

### Why Authentication Now

The BerkoTNF platform requires a complete authentication overhaul to support:

- **Multi-Tenant Architecture**: Secure tenant isolation with role-based access
- **RSVP System Integration**: Player authentication for seamless booking flows  
- **Superadmin Platform Management**: Cross-tenant administration capabilities
- **Public/Marketing Site**: SEO-friendly public content with private app areas
- **Mobile App Support**: JWT-based authentication for native mobile experience

### Current Authentication State

**Existing System Analysis**:
- **Basic Admin Toggle**: Simple password (`'poo'`) stored in localStorage
- **No Real Authentication**: Admin routes unprotected, client-side only
- **Single Tenant**: No organizational boundaries or user management
- **No Player Authentication**: Players cannot access personalized content

### Target Architecture

**Four-Tier Access Model**:
1. **Public/Anonymous**: Marketing pages, SEO-friendly stats, **full RSVP functionality with tokens**
2. **Players (Authenticated)**: Enhanced personal profiles, RSVP with history, cross-match analytics (magic link auth)
3. **Admins**: Full club management within tenant scope (email + password + optional 2FA)
4. **Superadmin**: Platform-level tenant management (email + password + mandatory 2FA)

**Critical RSVP Access Policy**:
- **Token-based RSVP remains completely public** - no authentication required
- **Enhanced experience for authenticated players** - auto-populated data, history tracking
- **Profile claiming** - link existing anonymous RSVP history to new accounts
- **Zero disruption** - current RSVP users unaffected by authentication system

### Implementation Phases

**Phase 1**: Superadmin + Admin authentication, tenant-scoped admin routes
**Phase 2**: Player authentication with RSVP integration  
**Phase 3**: Public SEO pages and marketing site integration
**Phase 4**: Mobile app JWT tokens and deep-link authentication

---

## B. Authentication Technology Stack

### Supabase Auth Integration

**Why Supabase Auth**:
- **Multi-tenant ready**: Row Level Security (RLS) with tenant isolation
- **Multiple auth methods**: Email, phone, magic links, social providers
- **JWT tokens**: Automatic token refresh and session management
- **2FA support**: Built-in TOTP and SMS-based two-factor authentication
- **Existing infrastructure**: Already using Supabase for database

**Auth Methods by Role**:
- **Players**: Magic link (email) + optional phone verification
- **Admins**: Email + password + optional TOTP 2FA
- **Superadmin**: Email + password + mandatory TOTP 2FA

### JWT Token Structure

**Token Payload Design**:
```typescript
interface AuthToken {
  // Supabase standard fields
  sub: string;           // user_id (UUID)
  email: string;
  role: string;          // 'authenticated'
  
  // Custom claims (via Supabase Edge Function)
  app_metadata: {
    tenant_id?: string;  // Null for superadmin
    user_role: 'player' | 'admin' | 'superadmin';
    player_id?: number;  // For players only
  };
  
  // Standard JWT fields
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}
```

**Token Validation**:
- **Server-side**: Supabase JWT validation middleware for authenticated routes
- **RLS Integration**: Automatic `auth.uid()` and custom claims in policies for authenticated users
- **RSVP Token Access**: Separate token validation for public RSVP routes (not JWT-based)
- **Refresh Strategy**: Automatic refresh via Supabase client libraries
- **Dual System**: JWT for authenticated users, RSVP tokens for public access

---

## C. Database Schema Changes

### Supabase Auth Integration

**Existing Supabase Tables**:
- `auth.users`: Managed by Supabase Auth
- `auth.sessions`: Managed by Supabase Auth
- `auth.refresh_tokens`: Managed by Supabase Auth

### Custom User Management Tables

#### User Profiles Table
```sql
-- Extends Supabase auth.users with app-specific data
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_role TEXT NOT NULL CHECK (user_role IN ('player', 'admin', 'superadmin')),
    player_id INT REFERENCES players(player_id) ON DELETE SET NULL,
    
    -- Profile information
    display_name TEXT,
    phone TEXT, -- E.164 format for RSVP integration
    
    -- Preferences
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(tenant_id, phone) WHERE phone IS NOT NULL,
    
    -- Role-specific constraints
    CONSTRAINT superadmin_no_tenant CHECK (
        (user_role = 'superadmin' AND tenant_id IS NULL) OR 
        (user_role != 'superadmin' AND tenant_id IS NOT NULL)
    ),
    CONSTRAINT player_has_player_id CHECK (
        (user_role = 'player' AND player_id IS NOT NULL) OR 
        (user_role != 'player')
    )
);

-- Indexes
CREATE INDEX idx_user_profiles_tenant_role ON user_profiles(tenant_id, user_role);
CREATE INDEX idx_user_profiles_player ON user_profiles(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX idx_user_profiles_phone ON user_profiles(tenant_id, phone) WHERE phone IS NOT NULL;
```

#### Admin Invitations Table
```sql
-- Manage admin user invitations
CREATE TABLE admin_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    invited_role TEXT NOT NULL CHECK (invited_role IN ('admin', 'superadmin')),
    
    -- Invitation token
    invitation_token TEXT NOT NULL UNIQUE,
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
CREATE INDEX idx_admin_invitations_token ON admin_invitations(invitation_token);
CREATE INDEX idx_admin_invitations_tenant_status ON admin_invitations(tenant_id, status);
```

#### Session Activity Log
```sql
-- Track authentication events for security auditing
CREATE TABLE auth_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE SET NULL,
    
    -- Activity details
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'login', 'logout', 'password_reset', 'email_change', 
        '2fa_enabled', '2fa_disabled', 'role_changed', 'invitation_sent'
    )),
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    
    -- Metadata (no PII)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_auth_activity_user ON auth_activity_log(user_id, created_at DESC);
CREATE INDEX idx_auth_activity_tenant ON auth_activity_log(tenant_id, created_at DESC);
CREATE INDEX idx_auth_activity_type ON auth_activity_log(activity_type, created_at DESC);
```

### Players Table Integration

**Add Authentication Fields**:
```sql
-- Link players to auth system
ALTER TABLE players 
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN auth_method TEXT CHECK (auth_method IN ('email', 'phone', 'admin_created')),
  ADD COLUMN verified_at TIMESTAMPTZ,
  ADD COLUMN last_rsvp_at TIMESTAMPTZ;

-- Unique constraint: one auth user per player per tenant
CREATE UNIQUE INDEX idx_players_user_tenant 
  ON players(tenant_id, user_id) 
  WHERE user_id IS NOT NULL;

-- Index for auth lookups
CREATE INDEX idx_players_user_id ON players(user_id) WHERE user_id IS NOT NULL;
```

---

## D. Role-Based Access Control

### Role Definitions

#### 1. Public/Anonymous
**Access**:
- Marketing pages (`/marketing/*`)
- Limited public stats pages (no PII)
- **RSVP pages with valid token** (full booking functionality)
- Public API endpoints (rate-limited)

**RSVP Token Access**:
- Complete RSVP functionality without Supabase Auth
- Token-based identity for booking responses
- Phone-based player identification and linking
- Match details, capacity status, waitlist access

**Restrictions**:
- No personalized dashboard or match history
- No admin functionality  
- No cross-match data or player profiles
- Cannot link multiple matches without authentication

#### 2. Players (Authenticated)
**Enhanced Access**:
- Personal dashboard and profile
- Match history and statistics across all matches
- **Enhanced RSVP experience** (auto-populated phone, match history context)
- Upcoming matches and fixtures with personal status
- League tables and general stats with personal highlighting
- **Profile claiming** (link existing RSVP history to account)

**RSVP Integration**:
- Seamless RSVP without re-entering phone number
- Match history visible in RSVP interface
- Notification preferences and push notifications
- Cross-match analytics and personal trends

**Restrictions**:
- Cannot access other players' private data
- Cannot access admin functions
- Cannot modify match data or team assignments
- Tenant-scoped access only

**Authentication**: Magic link (email) + optional phone verification

#### 3. Admins  
**Access**:
- All player functionality within their tenant
- Match management (create, edit, balance teams)
- Player management (add, edit, assign tiers)
- RSVP system configuration
- Club settings and configuration
- Activity monitoring and logs

**Special Capability**:
- **Role switching**: Admin can view their own player profile
- **Tenant-scoped**: Full admin rights within assigned tenant only

**Restrictions**:
- Cannot access other tenants' data
- Cannot manage tenant settings or billing
- Cannot create or delete tenants
- Cannot promote/demote other admins

**Authentication**: Email + password + optional TOTP 2FA

#### 4. Superadmin
**Access**:
- All admin functionality across all tenants
- Tenant management (create, edit, disable)
- Cross-tenant analytics and reporting
- Platform-wide configuration
- Admin user management
- Billing and subscription management (future)

**Special Capabilities**:
- **Tenant switching**: Dropdown to switch between clubs
- **Admin impersonation**: Can act as admin for any tenant
- **Platform oversight**: Access to system logs and metrics

**Restrictions**:
- Cannot access individual player accounts
- Cannot modify historical match data
- Audit trail for all superadmin actions

**Authentication**: Email + password + mandatory TOTP 2FA

### Navigation Mapping

#### Public Navigation
```typescript
// No Supabase Auth required - token-based access
const PUBLIC_ROUTES = [
  '/marketing',           // Marketing site
  '/marketing/pricing',   // Pricing page
  '/marketing/features',  // Features page
  '/public/stats',        // Public league tables (no PII)
  '/public/fixtures',     // Public fixtures (basic info only)
  '/rsvp/match/[id]',     // RSVP with valid token (full functionality)
  '/upcoming/match/[id]'  // Alternative RSVP URL with token
];

// Token-based RSVP access (no Supabase Auth required)
const RSVP_PUBLIC_ROUTES = [
  '/rsvp/match/[id]?token=...',      // Full RSVP functionality
  '/api/booking/respond',            // RSVP submission
  '/api/booking/waitlist/claim',     // Waitlist claiming
  '/api/booking/match/[id]/live',    // Live match status
  '/api/calendar/match/[id].ics'     // Calendar integration
];
```

#### Player Navigation (Authenticated)
```typescript
// Requires Supabase Auth - enhanced experience
const AUTHENTICATED_PLAYER_ROUTES = [
  '/',                    // Personal dashboard with cross-match analytics
  '/upcoming',            // Upcoming matches with enhanced RSVP
  '/profile',             // Personal profile and stats
  '/history',             // Match history across all matches
  '/table',               // League tables with personal highlighting
  '/records',             // All-time records with personal achievements
  '/seasons',             // Season overview with personal performance
  '/settings'             // Account and notification settings
];

// Note: Authenticated players can also access all RSVP_PUBLIC_ROUTES
// with enhanced experience (auto-populated data, history context)
```

#### Admin Navigation
```typescript
// Requires admin authentication + tenant scope
const ADMIN_ROUTES = [
  '/admin/matches',       // Match management
  '/admin/players',       // Player management  
  '/admin/seasons',       // Season management
  '/admin/setup'          // Club configuration
];

// Admin can also access all player routes as their player profile
const ADMIN_PLAYER_SWITCH = '/admin/switch-to-player';
```

#### Superadmin Navigation
```typescript
// Requires superadmin authentication
const SUPERADMIN_ROUTES = [
  '/superadmin/tenants',     // Tenant management
  '/superadmin/analytics',   // Cross-tenant analytics
  '/superadmin/users',       // Admin user management
  '/superadmin/system'       // System configuration
];

// Current /admin/info becomes superadmin-only
const SUPERADMIN_TENANT_SELECTOR = '/superadmin/select-tenant';
```

---

## E. Authentication Flows

### 1. Player Authentication Flow

#### Magic Link Registration/Login (Optional Enhancement)
```typescript
// 1. Player enters email on RSVP page or dashboard
POST /api/auth/player/magic-link
{
  "email": "player@example.com",
  "phone"?: "+447123456789",  // Optional: link existing RSVP history
  "matchId"?: 123,           // Optional: for RSVP context
  "redirectTo"?: "/upcoming/match/123"
}

// 2. Supabase sends magic link email
// 3. Player clicks link → Supabase auth → JWT token
// 4. App receives authenticated session

// 5. Link player profile and existing RSVP history
POST /api/auth/player/link-profile
{
  "phone"?: "+447123456789",     // Links existing RSVP history
  "displayName"?: "John Smith",
  "claimExistingRSVPs": true     // Claim previous token-based RSVPs
}

// 6. Create user_profile record with player_id lookup
// 7. Link historical RSVP data from phone number
```

#### Profile Claiming Flow
```typescript
// Player can claim existing RSVP history when creating account
POST /api/auth/player/claim-profile
{
  "email": "player@example.com",
  "phone": "+447123456789",      // Phone used in previous RSVPs
  "verificationCode": "123456"   // SMS verification for security
}

// Links all previous RSVP responses to new authenticated account
// Preserves match history and statistics
```

### Profile Claiming System

#### Overview
The profile claiming system allows players who have been using RSVP functionality anonymously (via phone number) to create an authenticated account and link their existing match history.

#### Key Principles
- **No Data Loss**: All historical RSVP responses are preserved
- **Phone-Based Linking**: Phone number serves as the bridge between anonymous and authenticated identity
- **Voluntary Enhancement**: Players can continue using RSVP without authentication indefinitely
- **Security**: SMS verification required to claim existing profile data

#### Implementation Flow
```typescript
// 1. Player discovers they can claim existing data
GET /api/player/can-claim?phone=+447123456789
{
  "canClaim": true,
  "matchCount": 15,
  "lastRSVP": "2024-01-15T10:30:00Z"
}

// 2. Player initiates claiming process
POST /api/auth/player/claim-profile
{
  "email": "player@example.com",
  "phone": "+447123456789"
}
// → Sends SMS verification code

// 3. Player completes verification
POST /api/auth/player/verify-claim
{
  "phone": "+447123456789", 
  "verificationCode": "123456",
  "email": "player@example.com"
}
// → Creates Supabase auth user
// → Links user_id to existing player record
// → Preserves all historical data

// 4. Enhanced experience immediately available
```

#### UI Integration Points
- **RSVP Pages**: Subtle "Create account to track your history" prompts
- **Post-RSVP**: "Link this response to your profile" suggestions
- **Dashboard**: One-time claiming flow for new authenticated users
- **No Pressure**: Always optional, never blocks core functionality

#### Phone Verification (Optional)
```typescript
// For enhanced RSVP experience
POST /api/auth/player/verify-phone
{
  "phone": "+447123456789"
}

// Supabase sends SMS verification code
POST /api/auth/player/confirm-phone
{
  "phone": "+447123456789",
  "token": "123456"
}
```

### 2. Admin Authentication Flow

#### Email + Password Login
```typescript
// 1. Admin enters credentials
POST /api/auth/admin/login
{
  "email": "admin@club.com",
  "password": "secure_password",
  "tenantSlug": "berko-tnf"     // From subdomain or form
}

// 2. Supabase validates credentials
// 3. Custom claims added via Edge Function
// 4. JWT token with tenant_id and admin role
```

#### Admin Invitation Flow
```typescript
// 1. Existing admin invites new admin
POST /api/admin/users/invite
{
  "email": "newadmin@club.com",
  "role": "admin"
}

// 2. System sends invitation email with secure token
// 3. New admin clicks invitation link
GET /api/auth/admin/accept-invitation?token=secure_token

// 4. New admin sets password and completes profile
POST /api/auth/admin/complete-invitation
{
  "token": "secure_token",
  "password": "new_password",
  "displayName": "Admin Name"
}
```

### 3. Superadmin Authentication Flow

#### Enhanced Security Login
```typescript
// 1. Superadmin enters credentials
POST /api/auth/superadmin/login
{
  "email": "superadmin@capo.com",
  "password": "very_secure_password"
}

// 2. If 2FA not set up, require setup
// 3. If 2FA enabled, require TOTP code
POST /api/auth/superadmin/verify-2fa
{
  "code": "123456"
}

// 4. JWT token with superadmin role (no tenant_id)
```

#### Tenant Switching
```typescript
// Superadmin can switch context to any tenant
POST /api/auth/superadmin/switch-tenant
{
  "tenantId": "tenant-uuid-here"
}

// Returns new JWT token with tenant context
// All subsequent API calls scoped to that tenant
```

---

## F. Middleware & Route Protection

### Authentication Middleware

**File**: `src/middleware/auth.ts`
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;
  
  // Public routes - no auth required (includes RSVP with tokens)
  if (isPublicRoute(pathname)) {
    return res;
  }
  
  // RSVP routes with tokens - validate token but don't require Supabase auth
  if (isRSVPRoute(pathname)) {
    return validateRSVPToken(req, res);
  }
  
  // Supabase authentication required beyond this point
  if (!session) {
    return redirectToLogin(req, pathname);
  }
  
  // Role-based route protection
  const userRole = session.user.app_metadata?.user_role;
  const tenantId = session.user.app_metadata?.tenant_id;
  
  // Admin routes
  if (pathname.startsWith('/admin/')) {
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
    
    // Tenant validation for admin routes
    if (userRole === 'admin' && !tenantId) {
      return NextResponse.redirect(new URL('/admin/select-tenant', req.url));
    }
  }
  
  // Superadmin routes
  if (pathname.startsWith('/superadmin/')) {
    if (userRole !== 'superadmin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }
  
  // Player routes - require player or admin role
  if (isPlayerRoute(pathname)) {
    if (!['player', 'admin', 'superadmin'].includes(userRole)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }
  
  return res;
}

function isPublicRoute(pathname: string): boolean {
  const publicPaths = [
    '/marketing',
    '/public',
    '/auth',
    '/_next',
    '/favicon.ico'
  ];
  
  return publicPaths.some(path => pathname.startsWith(path));
}

function isRSVPRoute(pathname: string): boolean {
  const rsvpPaths = [
    '/rsvp/match/',
    '/upcoming/match/'  // Alternative RSVP URL
  ];
  
  return rsvpPaths.some(path => pathname.startsWith(path));
}

function isPlayerRoute(pathname: string): boolean {
  const playerPaths = ['/', '/upcoming', '/profile', '/history', '/table', '/records'];
  return playerPaths.includes(pathname) || pathname.startsWith('/seasons');
}

async function validateRSVPToken(req: NextRequest, res: NextResponse): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token');
  
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login?error=missing_token', req.url));
  }
  
  // Validate RSVP token without requiring Supabase auth
  try {
    const isValidToken = await verifyRSVPToken(token);
    if (!isValidToken) {
      return NextResponse.redirect(new URL('/auth/login?error=invalid_token', req.url));
    }
    
    return res; // Allow access with valid token
  } catch (error) {
    return NextResponse.redirect(new URL('/auth/login?error=token_validation_failed', req.url));
  }
}

function redirectToLogin(req: NextRequest, returnUrl: string) {
  const loginUrl = new URL('/auth/login', req.url);
  loginUrl.searchParams.set('returnUrl', returnUrl);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### API Route Protection

**File**: `src/lib/auth/apiAuth.ts`
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

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

export async function requireRole(
  request: NextRequest, 
  allowedRoles: string[]
) {
  const { user } = await requireAuth(request);
  const userRole = user.app_metadata?.user_role;
  
  if (!allowedRoles.includes(userRole)) {
    throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
  }
  
  return {
    user,
    userRole,
    tenantId: user.app_metadata?.tenant_id,
    playerId: user.app_metadata?.player_id
  };
}

export async function requireTenantAccess(
  request: NextRequest,
  requiredTenantId?: string
) {
  const { user, tenantId } = await requireRole(request, ['admin', 'superadmin']);
  
  // Superadmin can access any tenant
  if (user.app_metadata?.user_role === 'superadmin') {
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

**Enhanced RLS with Auth Integration**:
```sql
-- Players table policies
CREATE POLICY players_own_profile ON players
  FOR ALL TO authenticated
  USING (
    tenant_id = current_setting('app.tenant_id')::uuid AND (
      -- Player can access their own profile
      user_id = auth.uid() OR
      -- Admins can access all players in their tenant
      EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.user_id = auth.uid() 
        AND up.tenant_id = players.tenant_id 
        AND up.user_role IN ('admin', 'superadmin')
      )
    )
  );

-- Match player pool policies  
CREATE POLICY match_pool_rsvp_access ON match_player_pool
  FOR ALL TO authenticated
  USING (
    tenant_id = current_setting('app.tenant_id')::uuid AND (
      -- Player can modify their own RSVP
      EXISTS (
        SELECT 1 FROM players p 
        WHERE p.player_id = match_player_pool.player_id 
        AND p.user_id = auth.uid()
      ) OR
      -- Admins can modify any RSVP in their tenant
      EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.user_id = auth.uid() 
        AND up.tenant_id = match_player_pool.tenant_id 
        AND up.user_role IN ('admin', 'superadmin')
      )
    )
  );

-- Public RSVP access (token-based, no Supabase auth required)
CREATE POLICY match_pool_public_rsvp ON match_player_pool
  FOR ALL TO anon
  USING (
    tenant_id = current_setting('app.tenant_id')::uuid AND
    -- Allow access when valid RSVP token is provided
    current_setting('app.rsvp_token_valid', true)::boolean = true
  );

-- Enable policy for anonymous users (RSVP token access)
ALTER TABLE match_player_pool ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON match_player_pool TO anon;

-- Admin-only tables
CREATE POLICY admin_only_access ON upcoming_matches
  FOR ALL TO authenticated
  USING (
    tenant_id = current_setting('app.tenant_id')::uuid AND
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.tenant_id = upcoming_matches.tenant_id 
      AND up.user_role IN ('admin', 'superadmin')
    )
  );
```

---

## G. UI/UX Implementation

### Authentication Pages

#### Login Page
**File**: `src/app/auth/login/page.tsx`
```typescript
'use client';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPlayer, setIsPlayer] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  const handlePlayerMagicLink = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`
      }
    });
    
    if (error) {
      alert(error.message);
    } else {
      alert('Check your email for the magic link!');
    }
    setLoading(false);
  };
  
  const handleAdminLogin = async () => {
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
            Sign in to Capo
          </h2>
        </div>
        
        {/* Role Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setIsPlayer(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
              isPlayer ? 'bg-white text-gray-900 shadow' : 'text-gray-500'
            }`}
          >
            Player
          </button>
          <button
            onClick={() => setIsPlayer(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
              !isPlayer ? 'bg-white text-gray-900 shadow' : 'text-gray-500'
            }`}
          >
            Admin
          </button>
        </div>
        
        <form className="mt-8 space-y-6">
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
          
          {!isPlayer && (
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
          )}
          
          <button
            type="button"
            onClick={isPlayer ? handlePlayerMagicLink : handleAdminLogin}
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : (isPlayer ? 'Send Magic Link' : 'Sign In')}
          </button>
        </form>
      </div>
    </div>
  );
}
```

#### Role Switching Component
**File**: `src/components/auth/RoleSwitcher.component.tsx`
```typescript
'use client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface RoleSwitcherProps {
  currentRole: string;
  isAdmin: boolean;
  playerId?: number;
}

export default function RoleSwitcher({ currentRole, isAdmin, playerId }: RoleSwitcherProps) {
  const [switching, setSwitching] = useState(false);
  const router = useRouter();
  
  const switchToPlayerView = async () => {
    if (!isAdmin || !playerId) return;
    
    setSwitching(true);
    // Store admin context in session storage
    sessionStorage.setItem('adminContext', 'true');
    router.push('/profile');
    setSwitching(false);
  };
  
  const switchToAdminView = async () => {
    setSwitching(true);
    sessionStorage.removeItem('adminContext');
    router.push('/admin');
    setSwitching(false);
  };
  
  if (!isAdmin) return null;
  
  return (
    <div className="flex items-center space-x-2">
      {currentRole === 'admin-view' ? (
        <button
          onClick={switchToPlayerView}
          disabled={switching || !playerId}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
        >
          {switching ? 'Switching...' : 'View as Player'}
        </button>
      ) : (
        <button
          onClick={switchToAdminView}
          disabled={switching}
          className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50"
        >
          {switching ? 'Switching...' : 'Back to Admin'}
        </button>
      )}
    </div>
  );
}
```

### Navigation Updates

#### Updated Admin Mode Toggle
**File**: `src/components/navigation/AdminModeToggle.component.tsx`
```typescript
'use client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function AdminModeToggle() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setUserRole(user?.app_metadata?.user_role);
    };
    
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setUserRole(session?.user?.app_metadata?.user_role || null);
    });
    
    return () => subscription.unsubscribe();
  }, [supabase]);
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };
  
  if (!user) {
    return (
      <button
        onClick={() => router.push('/auth/login')}
        className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-50"
      >
        Sign In
      </button>
    );
  }
  
  return (
    <div className="flex items-center space-x-4">
      <span className="text-white text-sm">
        {user.email} ({userRole})
      </span>
      
      <button
        onClick={handleSignOut}
        className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30"
      >
        Sign Out
      </button>
    </div>
  );
}
```

#### Superadmin Tenant Selector
**File**: `src/components/superadmin/TenantSelector.component.tsx`
```typescript
'use client';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Tenant {
  tenant_id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export default function TenantSelector() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    fetchTenants();
  }, []);
  
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
    try {
      const response = await fetch('/api/auth/superadmin/switch-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      
      if (response.ok) {
        setSelectedTenant(tenantId);
        window.location.reload(); // Refresh to apply new tenant context
      }
    } catch (error) {
      console.error('Error switching tenant:', error);
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
            className={`w-full text-left p-3 rounded-md border ${
              selectedTenant === tenant.tenant_id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium">{tenant.name}</div>
            <div className="text-sm text-gray-500">@{tenant.slug}</div>
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

---

## H. API Endpoints

### Authentication API Routes

#### Player Magic Link
```typescript
// POST /api/auth/player/magic-link
export async function POST(request: NextRequest) {
  const { email, matchId, redirectTo } = await request.json();
  
  const supabase = createRouteHandlerClient({ cookies });
  
  // Send magic link
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback${
        redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''
      }`
    }
  });
  
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
  
  return NextResponse.json({ 
    success: true, 
    message: 'Magic link sent to your email' 
  });
}
```

#### Admin Login
```typescript
// POST /api/auth/admin/login
export async function POST(request: NextRequest) {
  const { email, password, tenantSlug } = await request.json();
  
  const supabase = createRouteHandlerClient({ cookies });
  
  // Authenticate with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
  
  // Verify admin role and tenant access
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_role, tenant_id, tenants(slug)')
    .eq('user_id', data.user.id)
    .single();
  
  if (!profile || !['admin', 'superadmin'].includes(profile.user_role)) {
    await supabase.auth.signOut();
    return NextResponse.json({ 
      success: false, 
      error: 'Admin access required' 
    }, { status: 403 });
  }
  
  // Validate tenant access for admins
  if (profile.user_role === 'admin') {
    if (!profile.tenants || profile.tenants.slug !== tenantSlug) {
      await supabase.auth.signOut();
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid tenant access' 
      }, { status: 403 });
    }
  }
  
  return NextResponse.json({ 
    success: true, 
    user: data.user,
    profile 
  });
}
```

#### Superadmin Tenant Switch
```typescript
// POST /api/auth/superadmin/switch-tenant
export async function POST(request: NextRequest) {
  const { tenantId } = await request.json();
  
  const { user } = await requireRole(request, ['superadmin']);
  
  // Update custom claims via Supabase Edge Function
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/update-user-claims`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: user.id,
      claims: {
        tenant_id: tenantId,
        user_role: 'superadmin'
      }
    })
  });
  
  if (!response.ok) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update tenant context' 
    }, { status: 500 });
  }
  
  return NextResponse.json({ 
    success: true, 
    message: 'Tenant context updated' 
  });
}
```

### User Management API Routes

#### Admin Invitation
```typescript
// POST /api/admin/users/invite
export async function POST(request: NextRequest) {
  const { email, role } = await request.json();
  
  const { user, tenantId } = await requireRole(request, ['admin', 'superadmin']);
  
  // Generate secure invitation token
  const invitationToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Create invitation record
  const supabase = createRouteHandlerClient({ cookies });
  const { error } = await supabase
    .from('admin_invitations')
    .insert({
      tenant_id: tenantId,
      email,
      invited_by: user.id,
      invited_role: role,
      invitation_token: invitationToken,
      expires_at: expiresAt.toISOString()
    });
  
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
  
  // Send invitation email (via Supabase Edge Function or email service)
  await sendInvitationEmail(email, invitationToken, role, tenantId);
  
  return NextResponse.json({ 
    success: true, 
    message: 'Invitation sent successfully' 
  });
}
```

### RSVP Integration API Routes

#### Enhanced RSVP with Optional Authentication
```typescript
// POST /api/booking/respond
export async function POST(request: NextRequest) {
  const { matchId, token, phone, action, source } = await request.json();
  
  // Derive tenant from token (existing logic - no auth required)
  const tenantId = await getTenantFromToken(token);
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }
  
  // Set tenant context for RLS (token-based access)
  await setTenantContext(tenantId);
  await setRSVPTokenValid(true); // Enable public RLS policy
  
  // Optional: enhance experience if user is authenticated
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  let playerId: number;
  let enhancedExperience = false;
  
  if (session?.user) {
    // Authenticated user - get player ID from profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('player_id, phone')
      .eq('user_id', session.user.id)
      .single();
    
    if (profile?.player_id) {
      playerId = profile.player_id;
      enhancedExperience = true;
      
      // Auto-populate phone if not provided
      if (!phone && profile.phone) {
        phone = profile.phone;
      }
    } else {
      // Link phone to authenticated user if not already linked
      playerId = await linkPlayerToUser(session.user.id, phone, tenantId);
      enhancedExperience = true;
    }
  } else {
    // Anonymous user - lookup by phone (existing logic)
    playerId = await getPlayerByPhone(phone, tenantId);
  }
  
  // Continue with existing RSVP logic...
  const result = await processRSVP(tenantId, matchId, playerId, action, source);
  
  // Add enhancement flags to response
  return NextResponse.json({
    ...result,
    enhancedExperience,
    canClaimProfile: !enhancedExperience && !!playerId
  });
}
```

---

## I. Public vs Private Pages

### Public Marketing Site

#### Route Structure
```typescript
// Public routes (no authentication)
const PUBLIC_MARKETING_ROUTES = {
  '/marketing': 'Marketing homepage',
  '/marketing/features': 'Feature overview',
  '/marketing/pricing': 'Pricing plans',
  '/marketing/about': 'About Capo platform',
  '/marketing/contact': 'Contact information',
  '/marketing/blog': 'Blog posts',
  '/marketing/legal/privacy': 'Privacy policy',
  '/marketing/legal/terms': 'Terms of service'
};

// Public stats (SEO-friendly, no PII)
const PUBLIC_STATS_ROUTES = {
  '/public/[slug]/fixtures': 'Upcoming fixtures list',
  '/public/[slug]/results': 'Recent results',
  '/public/[slug]/table': 'League table (names only)',
  '/public/[slug]/stats': 'General statistics'
};
```

#### Public Data Policy
**What's Public**:
- Match fixtures (date, time, venue)
- Match results (scores, no individual stats)
- League tables (player names, wins/losses/draws)
- General club information

**What's Private**:
- Phone numbers or contact details
- Detailed player statistics
- Personal performance data
- RSVP status or attendance
- Admin functionality
- Internal club communications

### Private App Routes

#### Player Dashboard (Authenticated)
```typescript
// Authenticated player routes (enhanced experience)
const AUTHENTICATED_PLAYER_ROUTES = {
  '/': 'Personal dashboard with cross-match analytics',
  '/profile': 'Player profile and comprehensive stats',
  '/upcoming': 'Upcoming matches with enhanced RSVP',
  '/history': 'Personal match history across all matches',
  '/achievements': 'Personal achievements and milestones',
  '/settings': 'Account and notification settings'
};

// Note: RSVP functionality remains public via token access
// Authenticated players get enhanced experience on same routes
```

#### Admin Interface
```typescript
// Admin-only routes (tenant-scoped)
const PRIVATE_ADMIN_ROUTES = {
  '/admin/dashboard': 'Admin overview',
  '/admin/matches': 'Match management',
  '/admin/players': 'Player management',
  '/admin/seasons': 'Season management',
  '/admin/settings': 'Club settings',
  '/admin/users': 'Admin user management'
};
```

#### Superadmin Platform
```typescript
// Superadmin-only routes (cross-tenant)
const SUPERADMIN_ROUTES = {
  '/superadmin/dashboard': 'Platform overview',
  '/superadmin/tenants': 'Tenant management',
  '/superadmin/analytics': 'Cross-tenant analytics',
  '/superadmin/users': 'Platform user management',
  '/superadmin/system': 'System configuration'
};
```

### SEO Implementation

#### Public Pages SEO
```typescript
// Generate metadata for public pages
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug);
  
  if (!tenant) {
    return { title: 'Club Not Found' };
  }
  
  return {
    title: `${tenant.name} - Football Club Stats`,
    description: `View fixtures, results, and league tables for ${tenant.name}`,
    openGraph: {
      title: `${tenant.name} Football Club`,
      description: `Latest fixtures, results and league standings`,
      url: `https://capo.app/public/${params.slug}`,
      siteName: 'Capo',
      images: [
        {
          url: `https://capo.app/api/og/club/${params.slug}`,
          width: 1200,
          height: 630,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tenant.name} Football Club`,
      description: `Latest fixtures, results and league standings`,
      images: [`https://capo.app/api/og/club/${params.slug}`],
    }
  };
}
```

#### Sitemap Generation
```typescript
// Generate sitemap for public pages
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenants = await getAllActiveTenants();
  
  const publicRoutes = tenants.flatMap(tenant => [
    {
      url: `https://capo.app/public/${tenant.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `https://capo.app/public/${tenant.slug}/fixtures`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `https://capo.app/public/${tenant.slug}/table`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }
  ]);
  
  return [
    {
      url: 'https://capo.app/marketing',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...publicRoutes
  ];
}
```

---

## J. Implementation Phases

### Phase 1: Superadmin + Admin Authentication (Week 1-2)

**Deliverables**:
- [ ] Supabase Auth configuration and setup
- [ ] Database schema migration (user_profiles, admin_invitations, auth_activity_log)
- [ ] Authentication middleware implementation
- [ ] Admin login/logout functionality
- [ ] Superadmin tenant switching
- [ ] Move `/admin/info` to superadmin-only access
- [ ] Role-based navigation updates

**API Endpoints**:
- [ ] `POST /api/auth/admin/login`
- [ ] `POST /api/auth/admin/logout`
- [ ] `POST /api/auth/superadmin/switch-tenant`
- [ ] `POST /api/admin/users/invite`
- [ ] `GET /api/superadmin/tenants`

**Testing**:
- [ ] Admin authentication flow
- [ ] Tenant isolation for admin routes
- [ ] Superadmin cross-tenant access
- [ ] Role-based navigation rendering

### Phase 2: Player Authentication + RSVP Enhancement (Week 3-4)

**Deliverables**:
- [ ] Player magic link authentication (optional enhancement)
- [ ] Profile claiming flow for existing RSVP users
- [ ] Enhanced RSVP experience for authenticated players
- [ ] Player dashboard with personalized content
- [ ] Session management and token refresh
- [ ] **RSVP remains fully functional without authentication**

**API Endpoints**:
- [ ] `POST /api/auth/player/magic-link`
- [ ] `POST /api/auth/player/claim-profile`
- [ ] `POST /api/auth/player/link-profile`
- [ ] Enhanced `/api/booking/respond` with optional auth context
- [ ] `GET /api/player/can-claim` (check if phone has RSVP history)

**UI Components**:
- [ ] Optional player registration/login prompts in RSVP flow
- [ ] Profile claiming interface ("Link your match history")
- [ ] Enhanced RSVP interface for authenticated users
- [ ] Personal dashboard components
- [ ] **No changes to core RSVP functionality**

**Testing**:
- [ ] RSVP works identically with and without authentication
- [ ] Profile claiming links historical RSVP data correctly
- [ ] Enhanced experience provides additional value
- [ ] Anonymous users maintain full RSVP functionality

### Phase 3: Public SEO Pages + Marketing Site (Week 5-6)

**Deliverables**:
- [ ] Public marketing site pages
- [ ] SEO-friendly club stat pages
- [ ] Sitemap and metadata generation
- [ ] Open Graph and Twitter card integration
- [ ] Public API endpoints (rate-limited)
- [ ] Marketing site navigation

**Public Pages**:
- [ ] `/marketing/*` - Marketing site
- [ ] `/public/[slug]/fixtures` - Public fixtures
- [ ] `/public/[slug]/table` - Public league table
- [ ] `/public/[slug]/results` - Public results

**SEO Features**:
- [ ] Dynamic metadata generation
- [ ] Structured data markup
- [ ] Sitemap generation
- [ ] Robot.txt configuration

**Testing**:
- [ ] SEO metadata validation
- [ ] Public data access (no PII exposure)
- [ ] Marketing site functionality
- [ ] Search engine indexing

### Phase 4: Mobile App + Advanced Features (Week 7-8)

**Deliverables**:
- [ ] JWT token management for mobile
- [ ] Deep-link authentication
- [ ] Push notification integration with auth
- [ ] 2FA setup for admins and superadmin
- [ ] Admin role switching (admin ↔ player view)
- [ ] Session activity logging and security

**Mobile Features**:
- [ ] JWT token refresh handling
- [ ] Deep-link authentication flows
- [ ] Biometric authentication (optional)
- [ ] Offline session management

**Advanced Security**:
- [ ] TOTP 2FA implementation
- [ ] Session activity monitoring
- [ ] Suspicious activity detection
- [ ] Security audit logging

**Testing**:
- [ ] Mobile authentication flows
- [ ] Deep-link handling
- [ ] 2FA setup and verification
- [ ] Security audit trail

---

## K. Security Considerations

### Authentication Security

#### Password Requirements
```typescript
const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventEmailInPassword: true
};
```

#### Session Management
- **JWT Expiry**: 1 hour for access tokens, 7 days for refresh tokens
- **Automatic Refresh**: Supabase handles token refresh automatically
- **Session Invalidation**: Immediate logout on role changes or security events
- **Concurrent Sessions**: Allow multiple sessions but track for security monitoring

#### Rate Limiting
```typescript
const AUTH_RATE_LIMITS = {
  login: '5 attempts per 15 minutes per IP',
  magicLink: '3 requests per hour per email',
  passwordReset: '3 requests per hour per email',
  phoneVerification: '5 attempts per hour per phone',
  adminInvitation: '10 invitations per day per admin'
};
```

### Data Protection

#### PII Handling
- **Phone Number Masking**: Always display as `+44******789` in UI
- **Email Masking**: Display as `j***@example.com` in logs
- **IP Address Logging**: Hash IP addresses for activity logs
- **Audit Trail**: Log all authentication events without exposing sensitive data

#### Tenant Isolation
- **RLS Enforcement**: All database queries automatically scoped by tenant
- **JWT Claims**: Tenant ID embedded in JWT for server-side validation
- **API Route Protection**: Middleware validates tenant access on every request
- **Cross-Tenant Prevention**: Explicit checks prevent accidental data leakage

### Compliance & Auditing

#### GDPR Compliance
- **Data Minimization**: Only collect necessary authentication data
- **Right to Deletion**: User can delete account and all associated data
- **Data Export**: Users can export their authentication and profile data
- **Consent Management**: Clear consent for data processing and communications

#### Security Auditing
```sql
-- Security event monitoring
SELECT 
  activity_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users
FROM auth_activity_log 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND success = false
GROUP BY activity_type
ORDER BY event_count DESC;

-- Suspicious activity detection
SELECT 
  user_id,
  ip_address,
  COUNT(*) as failed_attempts,
  array_agg(DISTINCT activity_type) as attempted_actions
FROM auth_activity_log
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND success = false
GROUP BY user_id, ip_address
HAVING COUNT(*) > 10;
```

---

## L. Migration from Current System

### Current State Analysis

**Existing Authentication**:
```typescript
// Current simple system in NavigationContext
const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
  () => localStorage.getItem('adminAuth') === 'true'
);

// Simple password check
if (password === 'poo') {
  setIsAdminAuthenticated(true);
  localStorage.setItem('adminAuth', 'true');
}
```

### Migration Strategy

#### Step 1: Parallel Authentication (Week 1)
- Deploy new Supabase Auth alongside existing system
- Add feature flag to switch between systems
- Create migration script for existing admin users
- No user-facing changes during this phase

#### Step 2: Admin Migration (Week 2)
- Create admin accounts in Supabase for existing admins
- Send invitation emails to set up proper passwords
- Gradually migrate admin routes to use new authentication
- Keep fallback to old system during transition

#### Step 3: Player Onboarding (Week 3-4)
- Link existing players to authentication system via phone/email
- Send onboarding emails to players for account setup
- Integrate RSVP system with authenticated players
- Maintain anonymous RSVP for non-authenticated users

#### Step 4: Full Cutover (Week 5)
- Remove old authentication system
- All routes protected by new authentication
- Complete feature flag removal
- Monitor for any issues and provide user support

### Data Migration Scripts

#### Create Default Superadmin
```sql
-- Create superadmin user in Supabase Auth
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'admin@capo.app',
  crypt('temporary_password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"user_role": "superadmin"}',
  '{"display_name": "Platform Admin"}'
);

-- Create corresponding user_profile
INSERT INTO user_profiles (
  user_id,
  tenant_id,
  user_role,
  display_name,
  created_at
) SELECT 
  id,
  NULL, -- Superadmin has no tenant
  'superadmin',
  'Platform Admin',
  NOW()
FROM auth.users WHERE email = 'admin@capo.app';
```

#### Link Existing Players
```sql
-- Create placeholder auth users for existing players with phones
INSERT INTO user_profiles (
  user_id,
  tenant_id,
  user_role,
  player_id,
  phone,
  display_name
)
SELECT 
  gen_random_uuid(), -- Temporary user_id, will be updated when they authenticate
  p.tenant_id,
  'player',
  p.player_id,
  p.phone,
  p.name
FROM players p 
WHERE p.phone IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.player_id = p.player_id
  );
```

---

## M. Testing Strategy

### Unit Tests

#### Authentication Flow Tests
```typescript
// src/lib/auth/__tests__/auth.test.ts
describe('Authentication Flows', () => {
  describe('Player Magic Link', () => {
    it('should send magic link for valid email', async () => {
      const result = await sendPlayerMagicLink('player@test.com');
      expect(result.success).toBe(true);
    });
    
    it('should rate limit magic link requests', async () => {
      // Send 4 requests (should succeed)
      for (let i = 0; i < 4; i++) {
        await sendPlayerMagicLink('player@test.com');
      }
      
      // 5th request should be rate limited
      const result = await sendPlayerMagicLink('player@test.com');
      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });
  });
  
  describe('Admin Authentication', () => {
    it('should authenticate valid admin credentials', async () => {
      const result = await authenticateAdmin('admin@test.com', 'password123', 'test-tenant');
      expect(result.success).toBe(true);
      expect(result.user.app_metadata.user_role).toBe('admin');
    });
    
    it('should reject admin login for wrong tenant', async () => {
      const result = await authenticateAdmin('admin@test.com', 'password123', 'wrong-tenant');
      expect(result.success).toBe(false);
      expect(result.error).toContain('tenant access');
    });
  });
  
  describe('Role Switching', () => {
    it('should allow admin to switch to player view', async () => {
      const adminUser = await createTestAdminUser();
      const result = await switchToPlayerView(adminUser.id);
      expect(result.success).toBe(true);
    });
    
    it('should prevent player from accessing admin routes', async () => {
      const playerUser = await createTestPlayerUser();
      const result = await accessAdminRoute(playerUser.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });
  });
});
```

#### RLS Policy Tests
```sql
-- Test tenant isolation
BEGIN;
  -- Set tenant context for tenant A
  SELECT set_config('app.tenant_id', 'tenant-a-uuid', true);
  
  -- Should only see tenant A players
  SELECT COUNT(*) FROM players; -- Should return only tenant A count
  
  -- Switch to tenant B
  SELECT set_config('app.tenant_id', 'tenant-b-uuid', true);
  
  -- Should only see tenant B players
  SELECT COUNT(*) FROM players; -- Should return only tenant B count
ROLLBACK;

-- Test role-based access
BEGIN;
  -- Set up test user with player role
  INSERT INTO user_profiles (user_id, tenant_id, user_role, player_id) 
  VALUES ('test-user-uuid', 'tenant-a-uuid', 'player', 123);
  
  -- Set auth context
  SELECT set_config('request.jwt.claims', 
    '{"sub": "test-user-uuid", "role": "authenticated"}', true);
  
  -- Player should only access their own data
  SELECT * FROM match_player_pool WHERE player_id = 123; -- Should succeed
  SELECT * FROM match_player_pool WHERE player_id = 456; -- Should fail
ROLLBACK;
```

### Integration Tests

#### End-to-End Authentication Flows
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('Player magic link login', async ({ page }) => {
    // Go to login page
    await page.goto('/auth/login');
    
    // Select player mode
    await page.click('[data-testid="player-mode"]');
    
    // Enter email
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    
    // Click send magic link
    await page.click('[data-testid="send-magic-link"]');
    
    // Should see success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Check your email');
  });
  
  test('Admin login and role switching', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.click('[data-testid="admin-mode"]');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="admin-login"]');
    
    // Should redirect to admin dashboard
    await expect(page).toHaveURL('/admin');
    
    // Switch to player view
    await page.click('[data-testid="switch-to-player"]');
    
    // Should redirect to player dashboard
    await expect(page).toHaveURL('/profile');
    
    // Should show player interface
    await expect(page.locator('[data-testid="player-stats"]')).toBeVisible();
  });
  
  test('Superadmin tenant switching', async ({ page }) => {
    // Login as superadmin
    await page.goto('/auth/login');
    await page.click('[data-testid="admin-mode"]');
    await page.fill('[data-testid="email-input"]', 'superadmin@capo.app');
    await page.fill('[data-testid="password-input"]', 'superpassword123');
    await page.click('[data-testid="admin-login"]');
    
    // Should see tenant selector
    await expect(page.locator('[data-testid="tenant-selector"]')).toBeVisible();
    
    // Select a tenant
    await page.click('[data-testid="tenant-berko-tnf"]');
    
    // Should see admin interface for that tenant
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-tenant"]')).toContainText('Berko TNF');
  });
});
```

### Security Tests

#### Penetration Testing Scenarios
```typescript
// tests/security/auth.security.test.ts
describe('Security Tests', () => {
  test('Should prevent SQL injection in tenant resolution', async () => {
    const maliciousToken = "'; DROP TABLE tenants; --";
    const result = await getTenantFromToken(maliciousToken);
    expect(result).toBeNull(); // Should safely return null, not crash
  });
  
  test('Should prevent cross-tenant data access', async () => {
    const tenantAUser = await createTestUser('tenant-a');
    const tenantBData = await fetchPlayersAsUser(tenantAUser, 'tenant-b');
    expect(tenantBData).toHaveLength(0); // Should return no data
  });
  
  test('Should rate limit authentication attempts', async () => {
    const email = 'test@example.com';
    
    // Make 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      await attemptLogin(email, 'wrongpassword');
    }
    
    // 6th attempt should be rate limited
    const result = await attemptLogin(email, 'wrongpassword');
    expect(result.error).toContain('rate limit');
  });
  
  test('Should invalidate sessions on role change', async () => {
    const user = await createTestUser();
    const initialSession = await getSession(user.id);
    
    // Change user role
    await changeUserRole(user.id, 'admin');
    
    // Previous session should be invalid
    const sessionValid = await validateSession(initialSession.token);
    expect(sessionValid).toBe(false);
  });
});
```

---

## N. Monitoring & Observability

### Authentication Metrics

#### Key Performance Indicators
```typescript
const AUTH_METRICS = {
  // Success rates
  'auth.login.success_rate': 'Percentage of successful logins',
  'auth.magic_link.delivery_rate': 'Magic link email delivery success',
  'auth.phone.verification_rate': 'Phone verification success rate',
  
  // Security metrics
  'auth.failed_attempts.count': 'Failed authentication attempts',
  'auth.rate_limit.hits': 'Rate limit violations',
  'auth.suspicious_activity.count': 'Detected suspicious activities',
  
  // User engagement
  'auth.daily_active_users': 'Daily active authenticated users',
  'auth.session_duration.avg': 'Average session duration',
  'auth.role_switches.count': 'Admin-to-player role switches',
  
  // System health
  'auth.token_refresh.success_rate': 'JWT token refresh success',
  'auth.database_connections.count': 'Auth-related DB connections',
  'auth.response_time.p95': '95th percentile auth response time'
};
```

#### Dashboard Queries
```sql
-- Daily authentication summary
SELECT 
  DATE(created_at) as date,
  activity_type,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as failed,
  ROUND(
    COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*), 2
  ) as success_rate_percent
FROM auth_activity_log 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), activity_type
ORDER BY date DESC, activity_type;

-- User role distribution
SELECT 
  up.user_role,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE up.last_login_at > NOW() - INTERVAL '7 days') as active_last_7d,
  COUNT(*) FILTER (WHERE up.last_login_at > NOW() - INTERVAL '30 days') as active_last_30d
FROM user_profiles up
WHERE up.created_at > NOW() - INTERVAL '90 days'
GROUP BY up.user_role;

-- Tenant-specific authentication stats
SELECT 
  t.name as tenant_name,
  COUNT(up.user_id) as total_users,
  COUNT(*) FILTER (WHERE up.user_role = 'player') as players,
  COUNT(*) FILTER (WHERE up.user_role = 'admin') as admins,
  COUNT(*) FILTER (WHERE up.last_login_at > NOW() - INTERVAL '7 days') as active_users
FROM tenants t
LEFT JOIN user_profiles up ON up.tenant_id = t.tenant_id
GROUP BY t.tenant_id, t.name
ORDER BY total_users DESC;
```

### Security Monitoring

#### Alert Conditions
```typescript
const SECURITY_ALERTS = {
  // High-priority alerts
  'multiple_failed_logins': {
    condition: 'More than 10 failed logins from same IP in 5 minutes',
    action: 'Temporarily block IP and notify security team'
  },
  
  'cross_tenant_access_attempt': {
    condition: 'User attempts to access data from different tenant',
    action: 'Log security incident and review user permissions'
  },
  
  'privilege_escalation': {
    condition: 'Player role attempts to access admin endpoints',
    action: 'Block request and flag account for review'
  },
  
  // Medium-priority alerts
  'unusual_login_pattern': {
    condition: 'Login from new location or device for admin users',
    action: 'Send notification to admin user and log event'
  },
  
  'high_rate_limit_hits': {
    condition: 'More than 100 rate limit violations in 1 hour',
    action: 'Review API usage patterns and adjust limits if needed'
  }
};
```

#### Security Audit Reports
```sql
-- Weekly security audit report
WITH security_events AS (
  SELECT 
    activity_type,
    success,
    ip_address,
    created_at,
    user_id,
    failure_reason
  FROM auth_activity_log 
  WHERE created_at > NOW() - INTERVAL '7 days'
),
failed_logins AS (
  SELECT 
    ip_address,
    COUNT(*) as failed_count,
    array_agg(DISTINCT user_id) as affected_users
  FROM security_events 
  WHERE success = false AND activity_type = 'login'
  GROUP BY ip_address
  HAVING COUNT(*) > 5
),
suspicious_activity AS (
  SELECT 
    user_id,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(*) as total_events
  FROM security_events
  WHERE success = true
  GROUP BY user_id
  HAVING COUNT(DISTINCT ip_address) > 3
)
SELECT 
  'Failed Login Attempts' as alert_type,
  failed_count as event_count,
  ip_address as source,
  affected_users as details
FROM failed_logins
UNION ALL
SELECT 
  'Multiple IP Access' as alert_type,
  total_events as event_count,
  user_id::text as source,
  ARRAY[unique_ips::text] as details
FROM suspicious_activity
ORDER BY event_count DESC;
```

### Performance Monitoring

#### Response Time Tracking
```typescript
// Middleware for tracking auth performance
export async function authPerformanceMiddleware(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const result = await processAuthentication(req);
    
    // Log successful auth timing
    const duration = Date.now() - startTime;
    await logMetric('auth.response_time', duration, {
      endpoint: req.nextUrl.pathname,
      method: req.method,
      success: true
    });
    
    return result;
  } catch (error) {
    // Log failed auth timing
    const duration = Date.now() - startTime;
    await logMetric('auth.response_time', duration, {
      endpoint: req.nextUrl.pathname,
      method: req.method,
      success: false,
      error: error.message
    });
    
    throw error;
  }
}
```

#### Health Check Endpoints
```typescript
// GET /api/health/auth
export async function GET() {
  const healthChecks = await Promise.allSettled([
    // Check Supabase Auth connectivity
    checkSupabaseAuth(),
    
    // Check database connectivity for user profiles
    checkUserProfilesTable(),
    
    // Check JWT token validation
    checkJWTValidation(),
    
    // Check rate limiting service
    checkRateLimiting()
  ]);
  
  const results = healthChecks.map((check, index) => ({
    service: ['supabase_auth', 'user_profiles', 'jwt_validation', 'rate_limiting'][index],
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
```

---

## O. Success Criteria & Acceptance Tests

### Functional Requirements

#### Authentication Flows
- [ ] **Player Magic Link**: Email sent within 30 seconds, login completes in <5 seconds
- [ ] **Admin Login**: Password authentication completes in <3 seconds
- [ ] **Superadmin 2FA**: TOTP verification works with Google Authenticator/Authy
- [ ] **Role Switching**: Admin can switch to player view and back seamlessly
- [ ] **Tenant Switching**: Superadmin can switch between tenants with context preservation

#### Authorization Controls
- [ ] **Route Protection**: Unauthorized users redirected to appropriate login page (except RSVP)
- [ ] **Tenant Isolation**: Users cannot access data from other tenants
- [ ] **Role Enforcement**: Each role can only access designated functionality
- [ ] **RLS Validation**: Database policies prevent cross-tenant data leakage
- [ ] **API Security**: All admin endpoints require proper authentication
- [ ] **RSVP Token Access**: Public RSVP routes work without Supabase authentication

#### RSVP Integration (Critical)
- [ ] **Token-Based Access**: RSVP functionality works completely without authentication
- [ ] **Enhanced Experience**: Authenticated players get improved RSVP interface
- [ ] **Profile Claiming**: Users can link existing RSVP history to new accounts
- [ ] **Seamless Transition**: No disruption to current RSVP user experience
- [ ] **Phone Linking**: Phone numbers correctly bridge anonymous and authenticated use

#### General Integration Points
- [ ] **Session Management**: JWT tokens refresh automatically without user intervention
- [ ] **Navigation Updates**: UI shows appropriate options based on user role
- [ ] **Mobile Compatibility**: Authentication works in mobile app context
- [ ] **Backward Compatibility**: All existing functionality preserved

### Performance Requirements

#### Response Times
- [ ] **Authentication**: <3 seconds for login, <1 second for session validation
- [ ] **Authorization**: <100ms for role/tenant checks
- [ ] **Token Refresh**: <2 seconds for automatic token renewal
- [ ] **Database Queries**: <500ms for auth-related database operations
- [ ] **Magic Links**: Email delivery within 30 seconds

#### Scalability
- [ ] **Concurrent Users**: Support 1000+ concurrent authenticated users
- [ ] **Rate Limiting**: Handle rate limit violations gracefully
- [ ] **Session Storage**: Efficient session management with minimal memory usage
- [ ] **Database Connections**: Optimal connection pooling for auth operations

### Security Requirements

#### Data Protection
- [ ] **PII Masking**: Phone numbers and emails masked in all logs and UI
- [ ] **Password Security**: Minimum 12 characters with complexity requirements
- [ ] **Session Security**: JWT tokens expire appropriately and refresh securely
- [ ] **Audit Trail**: All authentication events logged with sufficient detail
- [ ] **Rate Limiting**: Brute force attacks prevented by rate limiting

#### Compliance
- [ ] **GDPR Compliance**: User data deletion and export capabilities
- [ ] **Security Auditing**: Comprehensive logging of security-relevant events
- [ ] **Access Controls**: Proper separation of duties between roles
- [ ] **Data Encryption**: Sensitive data encrypted in transit and at rest

### User Experience Requirements

#### Ease of Use
- [ ] **Intuitive Login**: Clear distinction between player and admin login flows
- [ ] **Error Handling**: Helpful error messages without exposing security details
- [ ] **Mobile Experience**: Touch-friendly authentication on mobile devices
- [ ] **Accessibility**: Login forms meet WCAG 2.1 AA standards
- [ ] **Progressive Enhancement**: Works with JavaScript disabled for basic flows

#### Administrative Efficiency
- [ ] **Admin Onboarding**: New admins can be invited and onboarded in <5 minutes
- [ ] **Role Management**: User roles can be changed without system downtime
- [ ] **Tenant Management**: Superadmin can efficiently manage multiple tenants
- [ ] **Monitoring**: Clear visibility into authentication health and usage

---

## P. Appendix

### Supabase Edge Functions

#### Update User Claims Function
```typescript
// supabase/functions/update-user-claims/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { userId, claims } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: claims
    });
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

#### Authentication Webhook
```typescript
// supabase/functions/auth-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { event, session, user } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  // Handle different auth events
  switch (event) {
    case 'user.created':
      await handleUserCreated(supabase, user);
      break;
    case 'user.signin':
      await handleUserSignIn(supabase, user, session);
      break;
    case 'user.signout':
      await handleUserSignOut(supabase, user);
      break;
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

async function handleUserCreated(supabase: any, user: any) {
  // Create user profile if it doesn't exist
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      display_name: user.user_metadata?.display_name || user.email,
      created_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('Error creating user profile:', error);
  }
}

async function handleUserSignIn(supabase: any, user: any, session: any) {
  // Update last login time
  await supabase
    .from('user_profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('user_id', user.id);
  
  // Log authentication event
  await supabase
    .from('auth_activity_log')
    .insert({
      user_id: user.id,
      activity_type: 'login',
      success: true,
      ip_address: session?.ip_address,
      user_agent: session?.user_agent
    });
}
```

### Configuration Templates

#### Supabase Auth Configuration
```typescript
// lib/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const supabaseClient = createClientComponentClient();

export const supabaseServer = () => createServerComponentClient({ cookies });

// Auth configuration
export const authConfig = {
  // JWT settings
  jwt: {
    expiryMargin: 60, // Refresh 60 seconds before expiry
    storage: 'localStorage', // Use localStorage for web
  },
  
  // Auth flow settings
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    
    // Redirect URLs
    redirectTo: {
      login: '/auth/callback',
      logout: '/auth/login',
      signup: '/auth/callback'
    }
  },
  
  // Rate limiting
  rateLimits: {
    login: { requests: 5, window: 900 }, // 5 per 15 minutes
    signup: { requests: 3, window: 3600 }, // 3 per hour
    reset: { requests: 3, window: 3600 } // 3 per hour
  }
};
```

#### Environment Variables Template
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
SUPABASE_JWT_SECRET=your-jwt-secret

# Auth Configuration
NEXT_PUBLIC_SITE_URL=https://your-domain.com
AUTH_REDIRECT_URL=https://your-domain.com/auth/callback

# Security Settings
PASSWORD_MIN_LENGTH=12
SESSION_TIMEOUT_HOURS=24
RATE_LIMIT_REDIS_URL=redis://localhost:6379

# Email Configuration (for magic links)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
FROM_EMAIL=noreply@your-domain.com

# Feature Flags
ENABLE_PHONE_VERIFICATION=true
ENABLE_2FA=true
ENABLE_SOCIAL_LOGIN=false
```

---

**Document Status**: Ready for Implementation  
**Next Steps**: Begin Phase 1 - Superadmin + Admin Authentication  
**Contact**: Development Team Lead for questions and implementation guidance

This comprehensive authentication specification provides a complete roadmap for implementing secure, scalable authentication and authorization across the BerkoTNF platform, integrating seamlessly with the existing RSVP and multi-tenancy architecture while providing a foundation for future platform growth.
