/**
 * Auto-Link Player After Phone Verification
 * 
 * POST /api/join/link-player
 * Automatically links player based on phone number match or creates join request
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { tenant, token, phone, displayName, email } = await request.json();

    // Validate invite token
    const tenantRecord = await prisma.tenants.findUnique({
      where: { slug: tenant },
      select: { tenant_id: true, name: true },
    });

    if (!tenantRecord) {
      return NextResponse.json(
        { success: false, error: 'Club not found' },
        { status: 404 }
      );
    }

    const inviteToken = await prisma.club_invite_tokens.findFirst({
      where: {
        tenant_id: tenantRecord.tenant_id,
        invite_code: token,
        is_active: true,
      },
    });

    if (!inviteToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite token' },
        { status: 404 }
      );
    }

    // Normalize phone number for matching (convert to E.164 format)
    const normalizePhone = (phoneNum: string): string => {
      // Remove all spaces, dashes, parentheses
      let cleaned = phoneNum.replace(/[\s\-\(\)]/g, '');
      
      // Remove leading + if present
      if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
      }
      
      // Convert 07xxx to 447xxx
      if (cleaned.startsWith('0')) {
        cleaned = '44' + cleaned.substring(1);
      }
      
      // Ensure it has 44 prefix
      if (!cleaned.startsWith('44')) {
        cleaned = '44' + cleaned;
      }
      
      return '+' + cleaned;
    };

    const normalizedIncomingPhone = normalizePhone(phone);
    
    console.log('[JOIN] Incoming phone:', phone);
    console.log('[JOIN] Normalized incoming:', normalizedIncomingPhone);

    // Find all players in tenant and check phone matches
    const allPlayers = await prisma.players.findMany({
      where: {
        tenant_id: tenantRecord.tenant_id,
        is_ringer: false,
        is_retired: false,
        phone: { not: null },
      },
      select: {
        player_id: true,
        name: true,
        phone: true,
        auth_user_id: true,
      },
    });

    // Find player by normalized phone match
    const existingPlayer = allPlayers.find(p => {
      if (!p.phone) return false;
      const normalizedDbPhone = normalizePhone(p.phone);
      console.log('[JOIN] Checking player:', p.name, '| DB phone:', p.phone, '| Normalized:', normalizedDbPhone, '| Match:', normalizedDbPhone === normalizedIncomingPhone);
      return normalizedDbPhone === normalizedIncomingPhone;
    });
    
    console.log('[JOIN] Match found:', existingPlayer ? existingPlayer.name : 'NO MATCH');

    if (existingPlayer) {
      // Check if already claimed by someone else
      if (existingPlayer.auth_user_id && existingPlayer.auth_user_id !== session.user.id) {
        return NextResponse.json(
          { success: false, error: 'This player profile is already claimed by another user' },
          { status: 409 }
        );
      }

      // Auto-link to existing player!
      await prisma.players.update({
        where: { player_id: existingPlayer.player_id },
        data: {
          auth_user_id: session.user.id,
          // Update email if provided (optional)
          ...(email && { email: email.trim() }),
        },
      });

      return NextResponse.json({
        success: true,
        autoLinked: true,
        message: `Welcome ${existingPlayer.name}!`,
        player: {
          id: existingPlayer.player_id.toString(),
          name: existingPlayer.name,
        },
      });
    } else {
      // No matching player - create join request for admin approval
      const joinRequest = await prisma.player_join_requests.create({
        data: {
          tenant_id: tenantRecord.tenant_id,
          phone_number: normalizedIncomingPhone,
          display_name: displayName || null,
          email: email ? email.trim() : null, // Store email for notifications
          auth_user_id: session.user.id,
          status: 'pending',
        },
      });

      return NextResponse.json({
        success: true,
        autoLinked: false,
        message: 'Join request created - pending admin approval',
        requestId: joinRequest.id,
      });
    }
  } catch (error) {
    return handleTenantError(error);
  }
}

