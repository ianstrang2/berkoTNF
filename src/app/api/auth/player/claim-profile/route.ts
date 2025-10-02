/**
 * Player Profile Claiming API
 * 
 * POST /api/auth/player/claim-profile
 * Links authenticated player to their existing player record
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { player_id } = await request.json();

    if (!player_id) {
      return NextResponse.json(
        { success: false, error: 'player_id is required' },
        { status: 400 }
      );
    }

    // Check if player exists and is not already claimed
    const player = await prisma.players.findUnique({
      where: { player_id: parseInt(player_id) },
      select: { 
        player_id: true, 
        name: true, 
        auth_user_id: true,
        tenant_id: true
      }
    });

    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    if (player.auth_user_id) {
      return NextResponse.json(
        { success: false, error: 'This player profile is already claimed' },
        { status: 409 }
      );
    }

    // Link player to authenticated user
    await prisma.players.update({
      where: { player_id: parseInt(player_id) },
      data: { 
        auth_user_id: session.user.id,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Profile claimed successfully',
      player: {
        id: player.player_id.toString(),
        name: player.name
      }
    });
  } catch (error: any) {
    console.error('Error claiming profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to claim profile' },
      { status: 500 }
    );
  }
}

