/**
 * API Route Authentication Helpers
 * 
 * Helper functions for protecting API routes with authentication and authorization checks
 * Uses Supabase Auth for session management
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
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
 * Checks if user has an admin_profile record with the specified role
 * Throws AuthenticationError if not authenticated
 * Throws AuthorizationError if user is not an admin
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
  
  // Query admin_profiles to verify role
  const adminProfile = await prisma.admin_profiles.findUnique({
    where: { user_id: user.id },
    select: {
      user_role: true,
      tenant_id: true,
      player_id: true,
    },
  });
  
  if (!adminProfile) {
    throw new AuthorizationError('Admin access required');
  }
  
  if (!allowedRoles.includes(adminProfile.user_role as 'admin' | 'superadmin')) {
    throw new AuthorizationError(
      `Access denied. Required roles: ${allowedRoles.join(', ')}`
    );
  }
  
  return {
    user,
    session,
    supabase,
    userRole: adminProfile.user_role as 'admin' | 'superadmin',
    tenantId: adminProfile.tenant_id,
    linkedPlayerId: adminProfile.player_id,
  };
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
  
  // Check if user has player profile (either direct or via admin link)
  const player = await prisma.players.findFirst({
    where: {
      OR: [
        { auth_user_id: user.id }, // Direct player account
        {
          player_id: {
            in: (
              await prisma.admin_profiles.findMany({
                where: { user_id: user.id },
                select: { player_id: true },
              })
            )
              .map((ap) => ap.player_id)
              .filter((id): id is number => id !== null),
          },
        }, // Admin with linked player
      ],
    },
    select: {
      player_id: true,
      name: true,
      tenant_id: true,
      auth_user_id: true,
      phone: true,
    },
  });
  
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

