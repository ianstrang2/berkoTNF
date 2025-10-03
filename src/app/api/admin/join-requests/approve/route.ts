/**
 * Approve Join Request API
 * 
 * POST /api/admin/join-requests/approve
 * Creates new player and links to authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { user, tenantId } = await requireAdminRole(request);
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context' },
        { status: 400 }
      );
    }
    
    const { requestId, playerName, existingPlayerId } = await request.json();

    if (!requestId || (!playerName && !existingPlayerId)) {
      return NextResponse.json(
        { success: false, error: 'Missing requestId or playerName/existingPlayerId' },
        { status: 400 }
      );
    }

    // Get the join request
    const joinRequest = await prisma.player_join_requests.findUnique({
      where: { id: requestId },
    });

    if (!joinRequest || joinRequest.tenant_id !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Join request not found' },
        { status: 404 }
      );
    }

    if (joinRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request already processed' },
        { status: 409 }
      );
    }

    let linkedPlayer;

    if (existingPlayerId) {
      // Link to existing player
      const existingPlayer = await prisma.players.findUnique({
        where: { player_id: parseInt(existingPlayerId) },
        select: { player_id: true, name: true, tenant_id: true, auth_user_id: true },
      });

      if (!existingPlayer || existingPlayer.tenant_id !== tenantId) {
        return NextResponse.json(
          { success: false, error: 'Player not found or belongs to different tenant' },
          { status: 404 }
        );
      }

      if (existingPlayer.auth_user_id) {
        return NextResponse.json(
          { success: false, error: 'This player is already claimed' },
          { status: 409 }
        );
      }

      // Link auth_user_id and update phone
      linkedPlayer = await prisma.players.update({
        where: { player_id: parseInt(existingPlayerId) },
        data: {
          auth_user_id: joinRequest.auth_user_id || undefined,
          phone: joinRequest.phone_number,
        },
      });
    } else {
      // Create new player
      linkedPlayer = await prisma.players.create({
        data: {
          tenant_id: tenantId,
          name: playerName,
          phone: joinRequest.phone_number,
          auth_user_id: joinRequest.auth_user_id || undefined,
          is_ringer: false,
          is_retired: false,
        },
      });
    }

    // Mark request as approved
    await prisma.player_join_requests.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        approved_by: user.id,
        linked_player_id: linkedPlayer.player_id,
        processed_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: existingPlayerId ? 'Player linked successfully' : 'Player approved and created',
      player: {
        id: linkedPlayer.player_id.toString(),
        name: linkedPlayer.name,
      },
    });
  } catch (error: any) {
    console.error('Error approving join request:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to approve request' },
      { status: 500 }
    );
  }
}

