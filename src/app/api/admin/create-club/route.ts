/**
 * Create Club (Tenant) API
 * 
 * POST /api/admin/create-club
 * Creates a new club and first admin player
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/utils/phone.util';
import { requireSuperadmin } from '@/lib/auth/apiAuth';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  // NOTE: This route DOES NOT use withTenantContext because we're CREATING a new tenant
  // There's no tenant_id to set in context yet (chicken-and-egg problem)
  try {
    // SECURITY: Only superadmins can create new clubs
    await requireSuperadmin(request);
    
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {}
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch {}
          },
        },
      }
    );
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('[CREATE_CLUB] Authenticated user:', {
      id: user.id,
      phone: user.phone,
      email: user.email,
      app_metadata: user.app_metadata
    });

    const { email, name, club_name, attribution } = await request.json();

    // Get phone from authenticated user (already verified via OTP)
    const phone = user.phone;

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
        auth_user_id: user.id,
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

      // Create tenant with attribution data (if provided)
      const tenant = await tx.tenants.create({
        data: {
          name: club_name,
          slug: slug,
          club_code: clubCode,
          is_active: true,
          settings: attribution ? { attribution } : {},
        },
      });

      // Log attribution capture
      if (attribution) {
        console.log('[CREATE_CLUB] Attribution captured:', {
          referrer: attribution.referrer,
          utm_source: attribution.utm_source,
          utm_campaign: attribution.utm_campaign,
          landing_page: attribution.landing_page,
        });
      }

      // Auto-create invite token for the new club (permanent link for sharing)
      const inviteCode = crypto.randomUUID().replace(/-/g, '').substring(0, 32);
      await tx.club_invite_tokens.create({
        data: {
          tenant_id: tenant.tenant_id,
          invite_code: inviteCode,
          created_by: user.id,
          is_active: true,
          expires_at: null, // Permanent invite link
        },
      });
      
      console.log('[CREATE_CLUB] Created invite token:', inviteCode);

      // Create first player (admin)
      console.log('[CREATE_CLUB] Creating player with auth_user_id:', user.id);
      const player = await tx.players.create({
        data: {
          tenant_id: tenant.tenant_id,
          name: name,
          phone: normalizedPhone,
          email: email,
          is_admin: true,
          auth_user_id: user.id,
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
          ${user.id}::uuid,
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
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}
