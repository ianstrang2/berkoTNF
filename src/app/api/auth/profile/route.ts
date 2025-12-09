/**
 * Get User Profile API Route
 * 
 * GET /api/auth/profile
 * Returns current user's session and profile information
 * 
 * SECURITY NOTE: This endpoint needs to look up user profile across tenants
 * to determine which tenant they belong to. We use Supabase admin client to
 * bypass RLS for this cross-tenant lookup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/apiAuth';
import { createClient } from '@supabase/supabase-js';
import { handleTenantError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request);

    // Use Supabase admin client for cross-tenant profile lookup
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

    // Check for superadmin (email auth - platform level)
    const { data: superadminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('user_role, tenant_id, player_id, display_name')
      .eq('user_id', user.id)
      .maybeSingle();

    // If superadmin, return superadmin profile
    if (superadminProfile && superadminProfile.user_role === 'superadmin') {
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
        },
        profile: {
          isAdmin: true,
          isSuperadmin: true,
          adminRole: 'superadmin',
          displayName: superadminProfile.display_name,
          // Priority 1: Check app_metadata (for tenant switching)
          // Priority 2: Fall back to superadmin_profiles.tenant_id
          tenantId: user.app_metadata?.tenant_id || superadminProfile.tenant_id || null,
          linkedPlayerId: superadminProfile.player_id,
          canSwitchRoles: false, // Superadmin uses 3-way view selector instead
        },
      }, {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Vary': 'Cookie',
        }
      });
    }

    // Check for player profile (phone auth - club level)
    const { data: playerProfile } = await supabaseAdmin
      .from('players')
      .select('player_id, name, tenant_id, is_admin, tenants!fk_players_tenant(name, club_code)')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!playerProfile) {
      // Authenticated but no profile yet (shouldn't happen)
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
        },
        profile: {
          isAuthenticated: true,
          isAdmin: false,
          isSuperadmin: false,
          displayName: null,
          tenantId: null,
          linkedPlayerId: null,
          canSwitchRoles: false,
        },
      }, {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Vary': 'Cookie',
        }
      });
    }

    // Return player profile (with optional admin privileges)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
      },
      profile: {
        isAuthenticated: true,
        isAdmin: playerProfile.is_admin || false,
        isSuperadmin: false,
        adminRole: playerProfile.is_admin ? 'admin' : null,
        displayName: playerProfile.name,
        tenantId: playerProfile.tenant_id,
        tenantName: (playerProfile as any).tenants?.name || null,
        clubCode: (playerProfile as any).tenants?.club_code || null,
        linkedPlayerId: playerProfile.player_id,
        canSwitchRoles: playerProfile.is_admin || false, // Admins can switch to player view
      },
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Vary': 'Cookie',
      }
    });
  } catch (error) {
    return handleTenantError(error);
  }
}

