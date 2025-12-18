/**
 * Auto-Link Player by Phone Number
 * 
 * POST /api/auth/link-by-phone
 * Automatically links authenticated user to player profile by phone match
 * Used by direct login flow
 * 
 * SECURITY NOTE: This endpoint needs to search across ALL tenants to find
 * which club a phone number belongs to. We use Supabase admin client to
 * bypass RLS for this specific cross-tenant lookup during authentication.
 * 
 * PERFORMANCE FIX (Dec 2025): Uses cached auth via getAuthenticatedUser()
 * GLOBALISATION (Dec 2025): Uses international phone validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';
import { getAuthenticatedUser } from '@/lib/auth/cachedAuth';
import { normalizeToE164, phoneNumbersMatch, CountryCode } from '@/utils/phoneInternational.util';

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

    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number required' },
        { status: 400 }
      );
    }

    // Normalize phone number for matching
    // Default to GB for cross-tenant phone lookup (we don't know tenant yet)
    // libphonenumber-js can handle most international formats if user includes country code
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeToE164(phone, 'GB');
    } catch (error) {
      console.log('[LINK-BY-PHONE] Phone validation error:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Use Supabase admin client to bypass RLS for cross-tenant phone lookup
    // This is a legitimate use case: we need to find which tenant a phone belongs to
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Query using Supabase admin client (bypasses RLS)
    const { data: allPlayers, error: queryError } = await supabaseAdmin
      .from('players')
      .select('player_id, name, phone, tenant_id, auth_user_id, is_admin')
      .eq('is_ringer', false)
      .eq('is_retired', false)
      .not('phone', 'is', null);

    if (queryError) {
      console.error('[LINK-BY-PHONE] Query error:', queryError);
      throw new Error('Failed to search for player');
    }

    // Find matching player using international phone comparison
    const matchingPlayer = allPlayers?.find(p => {
      if (!p.phone) return false;
      return phoneNumbersMatch(p.phone, normalizedPhone, 'GB');
    });

    if (!matchingPlayer) {
      console.log('[LINK-BY-PHONE] No match found for phone:', normalizedPhone);
      return NextResponse.json({
        success: false,
        error: 'No player found with this phone number',
      });
    }

    console.log('[LINK-BY-PHONE] Found player:', matchingPlayer.name, 'in tenant:', matchingPlayer.tenant_id);

    // Check if already claimed by someone else
    if (matchingPlayer.auth_user_id && matchingPlayer.auth_user_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'This player profile is already claimed by another user',
      }, { status: 409 });
    }

    // Link to this user (use Prisma with tenant context)
    if (!matchingPlayer.auth_user_id) {
      // Set tenant context before updating
      await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${matchingPlayer.tenant_id}, false)`;
      
      await prisma.players.update({
        where: { 
          player_id: matchingPlayer.player_id,
          tenant_id: matchingPlayer.tenant_id  // Explicit tenant filter
        },
        data: { auth_user_id: user.id },
      });
      
      console.log('[LINK-BY-PHONE] Linked player', matchingPlayer.player_id, 'to user', user.id);
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

