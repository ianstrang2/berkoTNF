/**
 * API Route Authentication Helpers
 * 
 * Helper functions for protecting API routes with authentication and authorization checks
 * Uses Supabase Auth for session management
 * 
 * Phase 2 Update: Uses Supabase service role for auth checks to avoid RLS blocking
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

/**
 * Authentication error - user is not authenticated
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error - user is authenticated but lacks permissions
 */
export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Result of requireAuth helper
 */
export interface AuthResult {
  user: User;
  session: any;
  supabase: any;
}

/**
 * Result of requireAdminRole helper
 */
export interface AdminAuthResult extends AuthResult {
  userRole: 'admin' | 'superadmin';
  tenantId: string | null;
  linkedPlayerId: number | null;
}

/**
 * Result of requirePlayerAccess helper
 */
export interface PlayerAuthResult extends AuthResult {
  player: {
    player_id: number;
    name: string;
    tenant_id: string;
    auth_user_id: string | null;
    phone: string | null;
  };
  tenantId: string;
}

/**
 * Require user to be authenticated
 * 
 * Checks if user has a valid Supabase session
 * Throws AuthenticationError if not authenticated
 * 
 * @param request - Next.js request object
 * @returns User session and Supabase client
 * @throws AuthenticationError if not authenticated
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const { user } = await requireAuth(request);
 *   // user is authenticated
 * }
 * ```
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    throw new AuthenticationError('Authentication required');
  }
  
  return {
    user: session.user,
    session,
    supabase,
  };
}

/**
 * Require user to have admin or superadmin role
 * 
 * PHONE-ONLY MODEL (v5.0):
 * - Club admins: players.is_admin = true (phone auth)
 * - Superadmin: admin_profiles with user_role = 'superadmin' (email auth - platform level)
 * 
 * @param request - Next.js request object
 * @param allowedRoles - Array of allowed roles (defaults to both admin and superadmin)
 * @returns Admin profile information
 * @throws AuthenticationError if not authenticated
 * @throws AuthorizationError if user is not an admin
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const { tenantId } = await requireAdminRole(request);
 *   // user is admin for tenantId
 * }
 * ```
 */
export async function requireAdminRole(
  request: NextRequest,
  allowedRoles: ('admin' | 'superadmin')[] = ['admin', 'superadmin']
): Promise<AdminAuthResult> {
  const { user, session, supabase } = await requireAuth(request);
  
  // Phase 2: Use Supabase admin client to bypass RLS for auth checks
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  // Check for superadmin first (email auth, admin_profiles table)
  const { data: superadminProfile } = await supabaseAdmin
    .from('admin_profiles')
    .select('user_role, tenant_id, player_id')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (superadminProfile && superadminProfile.user_role === 'superadmin') {
    if (!allowedRoles.includes('superadmin')) {
      throw new AuthorizationError('Access denied');
    }
    
    return {
      user,
      session,
      supabase,
      userRole: 'superadmin',
      tenantId: superadminProfile.tenant_id,
      linkedPlayerId: superadminProfile.player_id,
    };
  }
  
  // Check for club admin (phone auth, players.is_admin = true)
  if (allowedRoles.includes('admin')) {
    const { data: playerAdmin } = await supabaseAdmin
      .from('players')
      .select('player_id, name, tenant_id')
      .eq('auth_user_id', user.id)
      .eq('is_admin', true)
      .maybeSingle();
    
    if (playerAdmin) {
      return {
        user,
        session,
        supabase,
        userRole: 'admin',
        tenantId: playerAdmin.tenant_id,
        linkedPlayerId: playerAdmin.player_id,
      };
    }
  }
  
  throw new AuthorizationError('Admin access required');
}

/**
 * Require user to have superadmin role
 * 
 * Convenience wrapper for requireAdminRole(['superadmin'])
 * 
 * @param request - Next.js request object
 * @returns Superadmin profile information
 * @throws AuthenticationError if not authenticated
 * @throws AuthorizationError if user is not a superadmin
 */
export async function requireSuperadmin(request: NextRequest): Promise<AdminAuthResult> {
  return requireAdminRole(request, ['superadmin']);
}

/**
 * Require user to have player access
 * 
 * Checks if user has a player profile (either direct via auth_user_id
 * or indirect via admin_profiles.player_id)
 * 
 * @param request - Next.js request object
 * @returns Player profile information
 * @throws AuthenticationError if not authenticated
 * @throws AuthorizationError if user doesn't have player access
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const { player } = await requirePlayerAccess(request);
 *   // user has player profile
 * }
 * ```
 */
export async function requirePlayerAccess(request: NextRequest): Promise<PlayerAuthResult> {
  const { user, session, supabase } = await requireAuth(request);
  
  // Phase 2: Use Supabase admin client to bypass RLS for auth checks
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  // Check if user has player profile (direct via auth_user_id)
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('player_id, name, tenant_id, auth_user_id, phone')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  
  // If no direct player, check if they're an admin with linked player
  if (!player) {
    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('player_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (adminProfile?.player_id) {
      const { data: linkedPlayer } = await supabaseAdmin
        .from('players')
        .select('player_id, name, tenant_id, auth_user_id, phone')
        .eq('player_id', adminProfile.player_id)
        .maybeSingle();
      
      if (linkedPlayer) {
        return {
          user,
          session,
          supabase,
          player: linkedPlayer,
          tenantId: linkedPlayer.tenant_id,
        };
      }
    }
  }
  
  if (!player) {
    throw new AuthorizationError('Player profile required');
  }
  
  return {
    user,
    session,
    supabase,
    player,
    tenantId: player.tenant_id,
  };
}

/**
 * Require user to have access to a specific tenant
 * 
 * Verifies that:
 * - User is authenticated
 * - User is an admin
 * - If admin (not superadmin), user belongs to the specified tenant
 * - If superadmin, allows access to any tenant
 * 
 * @param request - Next.js request object
 * @param requiredTenantId - The tenant ID to check access for
 * @returns Admin profile information with validated tenant access
 * @throws AuthenticationError if not authenticated
 * @throws AuthorizationError if user doesn't have access to tenant
 * 
 * @example
 * ```typescript
 * export async function PUT(request: NextRequest) {
 *   const { tenantId } = await requireTenantAccess(request, 'tenant-uuid-here');
 *   // user has access to this tenant
 * }
 * ```
 */
export async function requireTenantAccess(
  request: NextRequest,
  requiredTenantId: string
): Promise<AdminAuthResult> {
  const { user, session, supabase, userRole, tenantId, linkedPlayerId } = 
    await requireAdminRole(request);
  
  // Superadmin can access any tenant
  if (userRole === 'superadmin') {
    return {
      user,
      session,
      supabase,
      userRole,
      tenantId: requiredTenantId,
      linkedPlayerId,
    };
  }
  
  // Admin must match tenant
  if (tenantId !== requiredTenantId) {
    throw new AuthorizationError('Access denied for this tenant');
  }
  
  return {
    user,
    session,
    supabase,
    userRole,
    tenantId,
    linkedPlayerId,
  };
}

