/**
 * Create Club (Tenant) API
 * 
 * POST /api/admin/create-club
 * Creates a new club and first admin player
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/utils/phone.util';
import { handleTenantError } from '@/lib/api-helpers';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    console.log('[CREATE_CLUB] Session user:', {
      id: session.user.id,
      phone: session.user.phone,
      email: session.user.email,
      app_metadata: session.user.app_metadata
    });

    const { email, name, club_name } = await request.json();

    // Get phone from authenticated session (already verified via OTP)
    const phone = session.user.phone;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'No phone number in session. Please authenticate with phone first.' },
        { status: 400 }
      );
    }

    // Validate inputs
    if (!email || !name || !club_name) {
      return NextResponse.json(
        { success: false, error: 'Email, name, and club name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate name length (matching player name limits)
    if (name.length < 1 || name.length > 14) {
      return NextResponse.json(
        { success: false, error: 'Name must be between 1 and 14 characters' },
        { status: 400 }
      );
    }

    // Validate club name length
    if (club_name.length < 1 || club_name.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Club name must be between 1 and 50 characters' },
        { status: 400 }
      );
    }

    // Use phone from session (already normalized by Supabase)
    const normalizedPhone = phone;

    // Check if user already has a club (is already a player)
    const existingPlayerByAuth = await prisma.players.findFirst({
      where: {
        auth_user_id: session.user.id,
      },
      select: {
        player_id: true,
        name: true,
        tenant_id: true,
        tenants: {
          select: { name: true }
        }
      },
    });

    if (existingPlayerByAuth) {
      return NextResponse.json(
        { 
          success: false, 
          error: `You are already a member of ${existingPlayerByAuth.tenants.name}. Cannot create a new club.` 
        },
        { status: 409 }
      );
    }

    // Check if this phone number is already used in ANY club
    const existingPlayerByPhone = await prisma.players.findFirst({
      where: {
        phone: normalizedPhone,
      },
      select: {
        player_id: true,
        name: true,
        tenant_id: true,
        tenants: {
          select: { name: true }
        }
      },
    });

    if (existingPlayerByPhone) {
      return NextResponse.json(
        { 
          success: false, 
          error: `This phone number is already registered in ${existingPlayerByPhone.tenants.name}. Please use a different number or contact your admin.` 
        },
        { status: 409 }
      );
    }

    // Create tenant and player in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate slug from club name (lowercase, replace spaces with hyphens, remove special chars)
      const baseSlug = club_name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .substring(0, 50);
      
      // Ensure unique slug
      let slug = baseSlug;
      let counter = 1;
      while (await tx.tenants.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Generate unique 5-character club code (alphanumeric, uppercase)
      const generateClubCode = (): string => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous: 0,O,1,I
        let code = '';
        for (let i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      // Ensure unique club code
      let clubCode = generateClubCode();
      while (await tx.tenants.findUnique({ where: { club_code: clubCode } })) {
        clubCode = generateClubCode();
      }

      // Create tenant
      const tenant = await tx.tenants.create({
        data: {
          name: club_name,
          slug: slug,
          club_code: clubCode,
          is_active: true,
          settings: {},
        },
      });

      // Verify the auth user exists before creating player
      console.log('[CREATE_CLUB] Creating player with auth_user_id:', session.user.id);
      
      // Check if user exists in auth.users (debug)
      const authUserExists = await prisma.$queryRaw`
        SELECT id FROM auth.users WHERE id = ${session.user.id}::uuid LIMIT 1
      `;
      console.log('[CREATE_CLUB] Auth user exists check:', authUserExists);
      
      // Create first player (admin)
      const player = await tx.players.create({
        data: {
          tenant_id: tenant.tenant_id,
          name: name,
          phone: normalizedPhone,
          email: email,
          is_admin: true,
          auth_user_id: session.user.id,
          is_ringer: false,
          is_retired: false,
          // Default skill ratings
          goalscoring: 3,
          defender: 3,
          stamina_pace: 3,
          control: 3,
          teamwork: 3,
          resilience: 3,
        },
      });

      return { tenant, player };
    });

    // Log club creation activity (optional - add if auth_activity_log exists)
    try {
      await prisma.$executeRaw`
        INSERT INTO auth_activity_log (user_id, tenant_id, activity_type, success, metadata, created_at)
        VALUES (
          ${session.user.id}::uuid,
          ${result.tenant.tenant_id}::uuid,
          'club_created',
          true,
          ${JSON.stringify({ club_name, player_name: name })}::jsonb,
          NOW()
        )
      `;
    } catch (logError) {
      // Don't fail club creation if logging fails
      console.error('Failed to log club creation:', logError);
    }

    return NextResponse.json({
      success: true,
      tenant_id: result.tenant.tenant_id,
      player_id: result.player.player_id.toString(),
      club_code: result.tenant.club_code,
      redirect_url: '/admin/matches',
      message: `Welcome to ${club_name}! Your club code is ${result.tenant.club_code}`,
    });

  } catch (error: any) {
    console.error('[CREATE_CLUB] Error creating club:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    return handleTenantError(error);
  }
}
