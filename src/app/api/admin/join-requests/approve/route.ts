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
    const { requestId, playerName } = await request.json();

    if (!requestId || !playerName) {
      return NextResponse.json(
        { success: false, error: 'Missing requestId or playerName' },
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

    // Create new player
    const newPlayer = await prisma.players.create({
      data: {
        tenant_id: tenantId,
        name: playerName,
        phone: joinRequest.phone_number,
        auth_user_id: joinRequest.auth_user_id || undefined,
        is_ringer: false,
        is_retired: false,
      },
    });

    // Mark request as approved
    await prisma.player_join_requests.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        approved_by: user.id,
        linked_player_id: newPlayer.player_id,
        processed_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Player approved and created',
      player: {
        id: newPlayer.player_id.toString(),
        name: newPlayer.name,
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

