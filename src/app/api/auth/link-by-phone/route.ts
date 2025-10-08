/**
 * Auto-Link Player by Phone Number
 * 
 * POST /api/auth/link-by-phone
 * Automatically links authenticated user to player profile by phone match
 * Used by direct login flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number required' },
        { status: 400 }
      );
    }

    // Normalize phone number for matching
    const normalizePhone = (phoneNum: string): string => {
      let cleaned = phoneNum.replace(/[\s\-\(\)]/g, '');
      if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
      if (cleaned.startsWith('0')) cleaned = '44' + cleaned.substring(1);
      if (!cleaned.startsWith('44')) cleaned = '44' + cleaned;
      return '+' + cleaned;
    };

    const normalizedPhone = normalizePhone(phone);

    // Find all players and check phone match
    const allPlayers = await prisma.players.findMany({
      where: {
        is_ringer: false,
        is_retired: false,
        phone: { not: null },
      },
      select: {
        player_id: true,
        name: true,
        phone: true,
        tenant_id: true,
        auth_user_id: true,
        is_admin: true,
      },
    });

    // Find matching player
    const matchingPlayer = allPlayers.find(p => {
      if (!p.phone) return false;
      return normalizePhone(p.phone) === normalizedPhone;
    });

    if (!matchingPlayer) {
      return NextResponse.json({
        success: false,
        error: 'No player found with this phone number',
      });
    }

    // Check if already claimed by someone else
    if (matchingPlayer.auth_user_id && matchingPlayer.auth_user_id !== session.user.id) {
      return NextResponse.json({
        success: false,
        error: 'This player profile is already claimed by another user',
      }, { status: 409 });
    }

    // Link to this user
    if (!matchingPlayer.auth_user_id) {
      await prisma.players.update({
        where: { player_id: matchingPlayer.player_id },
        data: { auth_user_id: session.user.id },
      });
    }

    return NextResponse.json({
      success: true,
      player: {
        id: matchingPlayer.player_id,
        name: matchingPlayer.name,
        is_admin: matchingPlayer.is_admin,
        tenant_id: matchingPlayer.tenant_id,
      },
    });
  } catch (error) {
    return handleTenantError(error);
  }
}

