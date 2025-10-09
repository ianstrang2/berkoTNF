/**
 * Promote/Demote Player to Admin
 * 
 * POST /api/admin/players/promote
 * Toggle admin privilege for a player
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantContext } from '@/lib/tenantContext';

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      await requireAdminRole(request);
      
      const { player_id, is_admin } = await request.json();

    if (!player_id || is_admin === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing player_id or is_admin' },
        { status: 400 }
      );
    }

    // Verify player exists and belongs to this tenant
    const player = await prisma.players.findUnique({
      where: { player_id: Number(player_id) },
      select: { tenant_id: true, name: true, is_admin: true },
    });

    if (!player || player.tenant_id !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Player not found or belongs to different tenant' },
        { status: 404 }
      );
    }

    // Update admin status
    const updatedPlayer = await prisma.players.update({
      where: {
        player_id: Number(player_id),
        tenant_id: tenantId,
      },
      data: {
        is_admin: is_admin,
      },
    });

    console.log(`[PROMOTION] ${player.name} ${is_admin ? 'promoted to' : 'demoted from'} admin`);

      return NextResponse.json({
        success: true,
        message: is_admin 
          ? `${player.name} promoted to admin` 
          : `${player.name} demoted to player`,
        player: {
          id: updatedPlayer.player_id.toString(),
          name: updatedPlayer.name,
          is_admin: updatedPlayer.is_admin,
        },
      });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}

