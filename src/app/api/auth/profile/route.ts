/**
 * Get User Profile API Route
 * 
 * GET /api/auth/profile
 * Returns current user's session and profile information
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request);

    // Check if user has admin profile
    const adminProfile = await prisma.admin_profiles.findUnique({
      where: { user_id: user.id },
      select: {
        user_role: true,
        tenant_id: true,
        player_id: true,
        display_name: true,
      },
    });

    // Check if user has player profile (direct or via admin link)
    const playerProfile = await prisma.players.findFirst({
      where: {
        OR: [
          { auth_user_id: user.id },
          { player_id: adminProfile?.player_id || -1 },
        ],
      },
      select: {
        player_id: true,
        name: true,
        tenant_id: true,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
      },
      profile: {
        isAdmin: !!adminProfile,
        adminRole: adminProfile?.user_role || null,
        displayName: adminProfile?.display_name || playerProfile?.name || null,
        tenantId: adminProfile?.tenant_id || playerProfile?.tenant_id || null,
        linkedPlayerId: adminProfile?.player_id || playerProfile?.player_id || null,
        canSwitchRoles: !!(adminProfile?.player_id), // Only if admin explicitly linked
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
}

