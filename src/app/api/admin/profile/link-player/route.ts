/**
 * Link Player to Admin Profile API Route
 * 
 * POST /api/admin/profile/link-player
 * Allows admin to link their account to an existing player profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantContext } from '@/lib/tenantContext';

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user } = await requireAdminRole(request);
      const { player_id } = await request.json();

    // Validate player_id
    if (!player_id) {
      return NextResponse.json(
        { success: false, error: 'player_id is required' },
        { status: 400 }
      );
    }

    const playerId = parseInt(player_id);
    if (isNaN(playerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid player_id' },
        { status: 400 }
      );
    }

    // Verify player exists and belongs to same tenant
    const player = await prisma.players.findUnique({
      where: { player_id: playerId },
      select: { 
        player_id: true, 
        name: true, 
        tenant_id: true 
      },
    });

    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    if (player.tenant_id !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Player belongs to a different tenant' },
        { status: 403 }
      );
    }

    // Check if player already linked to another admin
    const existingLink = await prisma.admin_profiles.findFirst({
      where: { 
        player_id: playerId,
        user_id: { not: user.id } // Not this admin
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { success: false, error: 'This player is already linked to another admin account' },
        { status: 409 }
      );
    }

    // Update admin profile with player link
    await prisma.admin_profiles.update({
      where: { user_id: user.id },
      data: { player_id: playerId },
    });

      return NextResponse.json({
        success: true,
        message: 'Player profile linked successfully',
        player: {
          id: player.player_id,
          name: player.name,
        },
      });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}

/**
 * DELETE /api/admin/profile/link-player
 * Unlink player from admin profile
 */
export async function DELETE(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user } = await requireAdminRole(request);

      // Update admin profile to remove player link
      await prisma.admin_profiles.update({
        where: { user_id: user.id },
        data: { player_id: null },
      });

      return NextResponse.json({
        success: true,
        message: 'Player profile unlinked successfully',
      });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}

