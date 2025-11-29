import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePlayerAccess } from '@/lib/auth/apiAuth';
import { Club } from '@/types/player.types';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Verify player access
    const { player, tenantId } = await requirePlayerAccess(request);

    const body = await request.json();
    const { name, email, club } = body as {
      name: string;
      email?: string | null;
      club?: Club | null;
    };

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    
    // Validate name length (max 14 characters for new names)
    if (trimmedName.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedName.length > 14) {
      return NextResponse.json(
        { success: false, error: 'Name cannot exceed 14 characters' },
        { status: 400 }
      );
    }

    // Check for duplicate name (excluding current player)
    const existingPlayer = await prisma.players.findFirst({
      where: {
        name: trimmedName,
        tenant_id: tenantId,
        NOT: { player_id: player.player_id }
      }
    });

    if (existingPlayer) {
      return NextResponse.json(
        { success: false, error: 'This name is already taken' },
        { status: 409 }
      );
    }

    // Validate email format if provided
    const trimmedEmail = email?.trim() || null;
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Update player record
    const updatedPlayer = await prisma.players.update({
      where: { 
        player_id: player.player_id  // Primary key - sufficient for WHERE clause
      },
      data: {
        name: trimmedName,
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

