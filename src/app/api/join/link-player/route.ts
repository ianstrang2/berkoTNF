/**
 * Auto-Link Player After Phone Verification
 * 
 * POST /api/join/link-player
 * Automatically links player based on phone number match or creates join request
 * 
 * PERFORMANCE FIX (Dec 2025): Uses cached auth via getAuthenticatedUser()
 * GLOBALISATION (Dec 2025): Uses international phone validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';
import { getAuthenticatedUser } from '@/lib/auth/cachedAuth';
import { normalizeToE164, phoneNumbersMatch, CountryCode } from '@/utils/phoneInternational.util';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // PERFORMANCE FIX: Use cached auth to prevent redundant getUser() calls
    const { user } = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { tenant, token, phone, displayName, email } = await request.json();

    // Validate invite token and get tenant country for phone validation
    const tenantRecord = await prisma.tenants.findUnique({
      where: { slug: tenant },
      select: { tenant_id: true, name: true, country: true },
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
    // Uses tenant's country as default for phone validation
    const tenantCountry = (tenantRecord.country || 'GB') as CountryCode;
    
    let normalizedIncomingPhone: string;
    try {
      normalizedIncomingPhone = normalizeToE164(phone, tenantCountry);
    } catch (error) {
      console.error('[JOIN] Phone validation error:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }
    
    console.log('[JOIN] Incoming phone:', phone);
    console.log('[JOIN] Normalized incoming:', normalizedIncomingPhone, '(country:', tenantCountry, ')');

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
        is_admin: true, // Needed for redirect logic
      },
    });

    // Find player by normalized phone match using international phone validation
    const existingPlayer = allPlayers.find(p => {
      if (!p.phone) return false;
      const isMatch = phoneNumbersMatch(p.phone, normalizedIncomingPhone, tenantCountry);
      console.log('[JOIN] Checking player:', p.name, '| DB phone:', p.phone, '| Match:', isMatch);
      return isMatch;
    });
    
    console.log('[JOIN] Match found:', existingPlayer ? existingPlayer.name : 'NO MATCH');

    if (existingPlayer) {
      // Check if already claimed by someone else
      if (existingPlayer.auth_user_id && existingPlayer.auth_user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: 'This player profile is already claimed by another user' },
          { status: 409 }
        );
      }

      // Auto-link to existing player!
      await prisma.players.update({
        where: { player_id: existingPlayer.player_id },
        data: {
          auth_user_id: user.id,
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
          is_admin: existingPlayer.is_admin || false, // Include admin status for redirect
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
          auth_user_id: user.id,
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

