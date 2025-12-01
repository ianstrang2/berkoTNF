import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePlayerAccess } from '@/lib/auth/apiAuth';
import { Club } from '@/types/player.types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify player access
    const { player } = await requirePlayerAccess(request);

    // Fetch current player's profile data
    const playerData = await prisma.players.findUnique({
      where: { player_id: player.player_id },
      select: {
        player_id: true,
        name: true,
        email: true,
        selected_club: true
      }
    });

    if (!playerData) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        data: {
          id: String(playerData.player_id),
          name: playerData.name,
          email: playerData.email,
          club: playerData.selected_club as Club | null
        }
      },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie',
        }
      }
    );

  } catch (error: any) {
    console.error('[PLAYER PROFILE GET] Error:', error);
    
    if (error.message === 'Player profile required') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Verify player access
    const { player, tenantId } = await requirePlayerAccess(request);

    const body = await request.json();
    const { email, club } = body as {
      email?: string | null;
      club?: Club | null;
    };

    // Validate email format if provided
    const trimmedEmail = email?.trim() || null;
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Update player record (name excluded - admin-only)
    const updatedPlayer = await prisma.players.update({
      where: { 
        player_id: player.player_id  // Primary key - sufficient for WHERE clause
      },
      data: {
        email: trimmedEmail,
        selected_club: club as any  // Club object or null (stored as JSON)
      }
    });

    return NextResponse.json(
      { 
        success: true, 
        data: {
          id: String(updatedPlayer.player_id),
          name: updatedPlayer.name,
          email: updatedPlayer.email,
          club: updatedPlayer.selected_club as Club | null
        }
      },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie',
        }
      }
    );

  } catch (error: any) {
    console.error('[PLAYER PROFILE UPDATE] Error:', error);
    
    // Handle specific error types
    if (error.message === 'Player profile required') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// Simple email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

