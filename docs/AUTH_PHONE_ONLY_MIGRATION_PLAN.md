# Migration Plan: Dual Auth → Phone-Only Authentication

**Date**: October 2, 2025  
**Decision**: Simplify to single phone-based authentication for all users  
**Estimated Time**: 2-3 hours  
**Status**: Planning phase

---

## Executive Summary

### What We're Changing

**FROM**: Dual authentication system
- Admins: Email/password
- Players: Phone/SMS
- Complex linking between admin_profiles and players

**TO**: Unified phone authentication
- Everyone: Phone/SMS (admins AND players)
- Admin = player with elevated permissions
- Simple "Promote to Admin" toggle

### Why This Change

**Simplicity**: One auth system, no linking complexity  
**User Experience**: Matches sports app patterns (Spond, TeamSnap)  
**Reality**: 95% of admins also play → why separate them?  
**Maintenance**: One system to maintain vs two

### Trade-Offs Accepted

**✅ Gains**:
- Eliminate linking complexity
- Simpler codebase
- Standard sports app UX
- Easy admin promotion

**⚠️ Costs**:
- 2-3 hours refactoring
- Desktop admin login needs phone for SMS (first time only)
- Throw away email auth work

---

## Database Schema Changes

### 1. Add Admin Flag to Players Table

**Current**: `players` table with `auth_user_id` (links to phone auth)

**Add**:
```sql
-- Add admin flag to players table
ALTER TABLE players
  ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Index for quick admin lookup
CREATE INDEX idx_players_is_admin 
  ON players(tenant_id, is_admin) 
  WHERE is_admin = true;

-- Add comment for clarity
COMMENT ON COLUMN players.is_admin IS 'True if this player has admin privileges for their club';
```

### 2. Deprecate (Don't Delete) Admin-Specific Tables

**Keep but mark deprecated**:
- `admin_profiles` - Keep for historical audit/reference
- `admin_invitations` - Keep for audit trail
- `auth_activity_log` - Keep (still useful)

**Why keep**:
- Preserve audit trail
- Can reference historical data
- Easy rollback if needed

**Add migration note**:
```sql
-- Mark tables as deprecated
COMMENT ON TABLE admin_profiles IS 'DEPRECATED: Migrated to players.is_admin. Kept for historical reference only.';
COMMENT ON TABLE admin_invitations IS 'DEPRECATED: Migrated to promotion model. Kept for audit trail.';
```

### 3. Migrate Existing Admin

**One-time migration for your account**:
```sql
-- Find Ian Strang (player ID 50) and mark as admin
UPDATE players
SET is_admin = true
WHERE player_id = 50 
  AND tenant_id = '00000000-0000-0000-0000-000000000001';

-- Verify
SELECT name, phone, auth_user_id, is_admin 
FROM players 
WHERE player_id = 50;
```

**Note**: Your current email-based admin session will stop working. You'll re-authenticate with phone.

---

## Code Changes

### Files to Modify

#### 1. Authentication Helpers (`src/lib/auth/apiAuth.ts`)

**Current**: Checks `admin_profiles` table for admin role

**New**: Check `players.is_admin` flag

```typescript
// BEFORE
export async function requireAdminRole(request: NextRequest) {
  const { user } = await requireAuth(request);
  
  const adminProfile = await prisma.admin_profiles.findUnique({
    where: { user_id: user.id },
    select: { user_role: true, tenant_id: true }
  });
  
  if (!adminProfile) {
    throw new Error('Admin access required');
  }
  
  return { user, tenantId: adminProfile.tenant_id, userRole: adminProfile.user_role };
}

// AFTER
export async function requireAdminRole(request: NextRequest) {
  const { user } = await requireAuth(request);
  
  // Find player with this auth_user_id who is also an admin
  const playerAdmin = await prisma.players.findFirst({
    where: {
      auth_user_id: user.id,
      is_admin: true
    },
    select: { tenant_id: true, player_id: true, name: true }
  });
  
  if (!playerAdmin) {
    throw new Error('Admin access required');
  }
  
  return { 
    user, 
    tenantId: playerAdmin.tenant_id, 
    playerId: playerAdmin.player_id 
  };
}
```

#### 2. Auth Profile API (`src/app/api/auth/profile/route.ts`)

**Current**: Checks both `admin_profiles` and `players` tables

**New**: Check only `players` table

```typescript
// BEFORE
const adminProfile = await prisma.admin_profiles.findUnique({
  where: { user_id: session.user.id }
});

const playerProfile = await prisma.players.findFirst({
  where: { 
    OR: [
      { auth_user_id: session.user.id },
      { player_id: adminProfile?.player_id }
    ]
  }
});

// AFTER
const player = await prisma.players.findFirst({
  where: { auth_user_id: session.user.id },
  select: {
    player_id: true,
    name: true,
    tenant_id: true,
    is_admin: true,
    phone: true
  }
});

return NextResponse.json({
  user: {
    id: user.id,
    phone: user.phone
  },
  profile: {
    isAdmin: player?.is_admin || false,
    displayName: player?.name,
    tenantId: player?.tenant_id,
    linkedPlayerId: player?.player_id,
    canSwitchRoles: player?.is_admin || false // Admins can switch to player view
  }
});
```

#### 3. Middleware (`src/middleware.ts`)

**Current**: Checks `app_metadata.user_role` from email auth

**New**: Session exists = authenticated; role checked in API routes

**Simplified**:
```typescript
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  
  // Admin routes - require session (role checked in API)
  if (pathname.startsWith('/admin/') || pathname.startsWith('/superadmin/')) {
    if (!session) {
      return redirectToLogin(req, pathname);
    }
  }
  
  // Player routes - require session
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/stats')) {
    if (!session) {
      return redirectToLogin(req, pathname);
    }
  }
  
  return res;
}

function redirectToLogin(req: NextRequest, returnUrl: string) {
  // Everyone uses same login now (phone auth)
  const loginUrl = new URL('/auth/player-login', req.url);
  loginUrl.searchParams.set('returnUrl', returnUrl);
  return NextResponse.redirect(loginUrl);
}
```

#### 4. Remove/Redirect Email Auth Pages

**Delete**:
- `src/app/auth/login/page.tsx` (old email auth)
- `src/app/auth/accept-invitation/page.tsx` (email invitation)
- `src/app/auth/claim-profile/page.tsx` (manual dropdown - replaced by auto-linking)

**Rename**:
- `src/app/auth/player-login/` → `src/app/auth/login/` (phone auth becomes THE login)

**Keep**:
- `src/join/[tenant]/[token]/page.tsx` - Club invite flow (primary onboarding)

#### 5. Admin Invitation Endpoints

**Remove**:
- `POST /api/admin/users/invite` - No longer needed (promotion instead)
- `POST /api/auth/admin/accept-invitation` - No longer needed
- `POST /api/auth/admin/login` - No longer needed (phone auth only)
- `POST /api/auth/player/claim-profile` - No longer needed (auto-linking works)

**Keep**:
- Everything else (profile, switch-tenant, join/link-player, etc.)

#### 6. Add Promotion Feature

**New file**: `src/app/api/admin/players/promote/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireAdminRole(request);
    const { player_id, is_admin } = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context' },
        { status: 400 }
      );
    }

    // Update player admin status
    const player = await prisma.players.update({
      where: {
        player_id: Number(player_id),
        tenant_id: tenantId
      },
      data: {
        is_admin: is_admin
      }
    });

    return NextResponse.json({
      success: true,
      message: is_admin ? 'Player promoted to admin' : 'Admin demoted to player',
      player: {
        id: player.player_id.toString(),
        name: player.name,
        is_admin: player.is_admin
      }
    });
  } catch (error: any) {
    console.error('Error updating admin status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

#### 7. Add Admin Toggle to Player Table UI

**In `PlayerManager.component.tsx`**, add toggle column:

```typescript
<th>Admin</th>

// In row:
<td>
  <button
    onClick={() => toggleAdmin(player.id, !player.isAdmin)}
    className={`px-2 py-1 rounded text-xs ${
      player.isAdmin 
        ? 'bg-purple-100 text-purple-700' 
        : 'bg-gray-100 text-gray-600'
    }`}
  >
    {player.isAdmin ? 'Admin' : 'Player'}
  </button>
</td>
```

---

## Migration Steps (Execute in Order)

### Phase 1: Database Changes (5 minutes)

1. **Run SQL migration** in Supabase:
```sql
-- Add is_admin column
ALTER TABLE players ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Create index
CREATE INDEX idx_players_is_admin ON players(tenant_id, is_admin) WHERE is_admin = true;

-- Migrate existing admin (Ian Strang)
UPDATE players SET is_admin = true WHERE player_id = 50;

-- Mark old tables as deprecated (keep for audit)
COMMENT ON TABLE admin_profiles IS 'DEPRECATED: Migrated to players.is_admin';
COMMENT ON TABLE admin_invitations IS 'DEPRECATED: Migrated to promotion model';
```

2. **Update Prisma schema** - Add `is_admin Boolean @default(false)` to players model

3. **Run** `npx prisma generate`

### Phase 2: Update Auth Logic (30 minutes)

**Files to modify** (in order):

1. `src/lib/auth/apiAuth.ts` - Update `requireAdminRole()` to check `players.is_admin`
2. `src/app/api/auth/profile/route.ts` - Simplified to only check players table
3. `src/middleware.ts` - Simplified (session check only, role in API)
4. `src/contexts/AuthContext.tsx` - Update profile loading logic

### Phase 3: Remove Email Auth (20 minutes)

**Files to delete**:
1. `src/app/auth/login/page.tsx` - Delete
2. `src/app/auth/accept-invitation/page.tsx` - Delete  
3. `src/app/api/auth/admin/login/route.ts` - Delete
4. `src/app/api/auth/admin/accept-invitation/route.ts` - Delete
5. `src/app/api/admin/users/invite/route.ts` - Delete

**Files to rename**:
1. `src/app/auth/player-login/page.tsx` → `src/app/auth/login/page.tsx`

**Update references**:
- Change all `/auth/player-login` links to `/auth/login`
- Update login redirect logic

### Phase 4: Add Promotion UI (25 minutes)

**Create**:
1. `src/app/api/admin/players/promote/route.ts` - Promotion endpoint
2. Admin toggle in `PlayerManager.component.tsx` - Add "Admin" toggle column

**Update**:
1. Player table - Add "Admin" column with toggle button
2. Join approval - When creating player, option to make admin immediately

### Phase 5: Update Documentation (15 minutes)

**Files to update**:
1. `docs/SPEC_auth.md` - Remove dual auth sections, update to phone-only
2. `docs/AUTH_CURRENT_STATUS.md` - Reflect new architecture
3. `docs/AUTH_IMPLEMENTATION_PROGRESS.md` - Add migration log
4. `README.md` (if exists) - Update auth description

### Phase 6: Testing (30 minutes)

**Test scenarios**:
1. ✓ Logout from email admin account
2. ✓ Join via invite link with your phone (+447949251277)
3. ✓ Verify auto-linked to Ian Strang (player 50)
4. ✓ Verify `is_admin: true` flag set
5. ✓ Login on desktop with phone/SMS
6. ✓ Access /admin/* pages
7. ✓ Promote another player to admin
8. ✓ Verify they can access /admin/* pages
9. ✓ Test view switching (admin → player)
10. ✓ Test Capacitor app with phone auth

---

## Rollback Plan

**If migration fails**:
1. Revert database: `UPDATE players SET is_admin = false WHERE is_admin = true;`
2. Revert code: `git checkout` to before migration
3. Keep deprecated tables - they still have your admin_profiles record
4. Re-enable email auth in Supabase

**Safety**:
- Don't delete old tables (just deprecate)
- Commit after each phase
- Test thoroughly before declaring complete

---

## Breaking Changes

### What Stops Working (Temporarily)

**During migration**:
- Your current email admin login won't work
- `/auth/login` (email) will be deleted/redirected
- Admin invitations won't work

**After migration**:
- Email-based admin auth permanently disabled
- Admin invitation emails no longer sent
- Must use club invite link + promotion instead

### What Keeps Working

- ✅ Player phone authentication (unchanged)
- ✅ Club invite links (unchanged)
- ✅ Auto-linking by phone (unchanged)
- ✅ Join request approval (unchanged)
- ✅ All player features (dashboard, stats, etc.)
- ✅ Capacitor app (unchanged)
- ✅ View switching UI (unchanged - just simpler backend)

---

## New Admin Onboarding Flow

### Old Way (Email Invitation):
```
1. Existing admin invites new admin via email
2. New admin receives email
3. Clicks link → Creates account with email/password
4. Optionally links to player profile
5. Can now access /admin/*
```

### New Way (Promotion):
```
1. New person joins via club invite link (phone/SMS)
2. Auto-linked to player profile (or created if new)
3. Existing admin goes to Players page
4. Clicks "Make Admin" toggle next to their name
5. Done! They can now access /admin/*
```

**Simpler**: No email, no manual linking, no dropdown. Just: invite → verify → promote!

---

## Implementation Checklist

### Pre-Migration

- [ ] Commit all current changes
- [ ] Document current admin account details
- [ ] Backup Supabase database (optional, can restore from migration history)
- [ ] Read through this plan completely

### Database Phase

- [ ] Run SQL migration (add is_admin column)
- [ ] Mark Ian Strang as admin (player 50)
- [ ] Update Prisma schema
- [ ] Run `npx prisma generate`
- [ ] Verify no Prisma errors

### Code Phase 1: Core Auth

- [ ] Update `requireAdminRole()` in apiAuth.ts
- [ ] Update `/api/auth/profile` route
- [ ] Update middleware.ts
- [ ] Test: No TypeScript errors

### Code Phase 2: Remove Email Auth

- [ ] Delete `src/app/auth/login/page.tsx`
- [ ] Delete `src/app/auth/accept-invitation/page.tsx`
- [ ] Rename `player-login` → `login`
- [ ] Delete email auth API routes
- [ ] Update all `/auth/login` references
- [ ] Test: App compiles

### Code Phase 3: Add Promotion

- [ ] Create promotion API endpoint
- [ ] Add "Admin" toggle column to player table
- [ ] Test promotion on test player
- [ ] Verify promoted player can access /admin/*

### Testing Phase

- [ ] Logout from current admin account
- [ ] Re-join via club invite link (phone)
- [ ] Verify admin access works
- [ ] Test desktop login with phone/SMS
- [ ] Test Capacitor app
- [ ] Test promotion workflow
- [ ] Verify all /admin/* pages accessible

### Documentation Phase

- [ ] Update SPEC_auth.md
- [ ] Update AUTH_CURRENT_STATUS.md
- [ ] Update AUTH_IMPLEMENTATION_PROGRESS.md
- [ ] Add migration notes

### Cleanup Phase

- [ ] Remove unused imports
- [ ] Run linter and fix errors
- [ ] Test production build (`npm run build`)
- [ ] Commit changes

---

## Risk Assessment

### Low Risk
- ✅ Database migration (simple column add)
- ✅ New promotion feature (additive)
- ✅ Player auth (unchanged)

### Medium Risk
- ⚠️ Middleware changes (affects all routes)
- ⚠️ Auth helpers (widely used)
- ⚠️ Profile context (used everywhere)

### Mitigation
- Test each phase before proceeding
- Keep git commits granular
- Don't delete database tables (deprecate only)
- Easy rollback path

---

## Success Criteria

**Migration is complete when**:
1. ✅ You can login with phone on desktop
2. ✅ You have admin access with phone auth
3. ✅ Can promote players to admin via UI toggle
4. ✅ Promoted admins can access /admin/* pages
5. ✅ View switching still works
6. ✅ Capacitor app works unchanged
7. ✅ All TypeScript errors resolved
8. ✅ No console errors in browser
9. ✅ Specs updated to reflect new architecture

---

## Timeline

**Estimated**: 2-3 hours (careful, methodical work)

**Breakdown**:
- Database: 15 minutes
- Core auth updates: 45 minutes
- Remove email auth: 30 minutes
- Add promotion: 30 minutes
- Testing: 30 minutes
- Docs: 20 minutes

**Buffer**: 30 minutes for unexpected issues

---

## Post-Migration

### What Gets Easier

**No more**:
- Email invitation system
- Admin-player linking UI
- Dual auth mental model
- Complex profile loading logic

**Instead**:
- Click "Make Admin" toggle
- Done!

### What Changes for You

**Your workflow** (managing club):
1. Share invite link in WhatsApp
2. Players join automatically
3. Want to make someone admin? → Click toggle
4. That's it!

**Your login** (desktop):
- First time: Enter phone, get SMS, enter code
- After that: Stays logged in (you might never need to login again!)

---

## Questions to Answer Before Starting

1. **Are you ready to logout and re-authenticate with phone?**
2. **Is desktop SMS login acceptable for first-time?**
3. **Should we do this now or in a separate session?**
4. **Want to review any specific part of the plan first?**

---

**This plan is comprehensive and careful. Ready to execute?** 🚀

