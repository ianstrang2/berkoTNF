/**
 * Get User Profile API Route
 * 
 * GET /api/auth/profile
 * Returns current user's session and profile information
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request);

    // Check for superadmin (email auth - platform level)
    const superadminProfile = await prisma.admin_profiles.findUnique({
      where: { user_id: user.id },
      select: {
        user_role: true,
        tenant_id: true,
        player_id: true,
        display_name: true,
      },
    });

    // If superadmin, return superadmin profile
    if (superadminProfile && superadminProfile.user_role === 'superadmin') {
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
        },
        profile: {
          isAdmin: true,
          isSuperadmin: true,
          adminRole: 'superadmin',
          displayName: superadminProfile.display_name,
          tenantId: superadminProfile.tenant_id, // Can be null (platform view)
          linkedPlayerId: superadminProfile.player_id,
          canSwitchRoles: false, // Superadmin uses 3-way view selector instead
        },
      }, {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Vary': 'Cookie',
        }
      });
    }

    // Check for player profile (phone auth - club level)
    const playerProfile = await prisma.players.findFirst({
      where: { auth_user_id: user.id },
      select: {
        player_id: true,
        name: true,
        tenant_id: true,
        is_admin: true,
      },
    });

    if (!playerProfile) {
      // Authenticated but no profile yet (shouldn't happen)
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
        },
        profile: {
          isAuthenticated: true,
          isAdmin: false,
          isSuperadmin: false,
          displayName: null,
          tenantId: null,
          linkedPlayerId: null,
          canSwitchRoles: false,
        },
      }, {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Vary': 'Cookie',
        }
      });
    }

    // Return player profile (with optional admin privileges)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
      },
      profile: {
        isAuthenticated: true,
        isAdmin: playerProfile.is_admin || false,
        isSuperadmin: false,
        adminRole: playerProfile.is_admin ? 'admin' : null,
        displayName: playerProfile.name,
        tenantId: playerProfile.tenant_id,
        linkedPlayerId: playerProfile.player_id,
        canSwitchRoles: playerProfile.is_admin || false, // Admins can switch to player view
      },
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Vary': 'Cookie',
      }
    });
  } catch (error) {
    return handleTenantError(error);
  }
}

