/**
 * Request Access to Club API
 * 
 * POST /api/join/request-access
 * Creates join request after phone verification via OTP
 * 
 * Flow: Phone → OTP → This endpoint creates join request
 * Admin approves → Player can login
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
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
    
    // Verify user is authenticated (just completed OTP)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated. Please verify your phone first.' },
        { status: 401 }
      );
    }

    const { phone, clubCode, name, email } = await request.json();

    if (!phone || !clubCode || !name) {
      return NextResponse.json(
        { success: false, error: 'Phone, club code, and name are required' },
        { status: 400 }
      );
    }

    // Normalize club code
    const normalizedCode = clubCode.trim().toUpperCase();

    // Look up tenant by club code
    const tenant = await prisma.tenants.findUnique({
      where: { club_code: normalizedCode },
      select: {
        tenant_id: true,
        name: true,
        is_active: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Club code not found. Please check with your admin.' },
        { status: 404 }
      );
    }

    if (!tenant.is_active) {
      return NextResponse.json(
        { success: false, error: 'This club is not currently active.' },
        { status: 403 }
      );
    }

    // Normalize phone for storage
    const normalizePhone = (phoneNum: string): string => {
      let cleaned = phoneNum.replace(/[\s\-\(\)]/g, '');
      if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
      if (cleaned.startsWith('0')) cleaned = '44' + cleaned.substring(1);
      if (!cleaned.startsWith('44')) cleaned = '44' + cleaned;
      return '+' + cleaned;
    };

    const normalizedPhone = normalizePhone(phone);

    // Check if phone already has a pending/approved request for this club
    const existingRequest = await prisma.player_join_requests.findFirst({
      where: {
        tenant_id: tenant.tenant_id,
        phone_number: normalizedPhone,
        status: { in: ['pending', 'approved'] },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { 
          success: false, 
          error: existingRequest.status === 'pending' 
            ? 'You already have a pending request for this club'
            : 'You have already been approved for this club'
        },
        { status: 409 }
      );
    }

    // Create join request
    const joinRequest = await prisma.player_join_requests.create({
      data: {
        tenant_id: tenant.tenant_id,
        phone_number: normalizedPhone,
        display_name: name.trim(),
        email: email ? email.trim() : null,
        auth_user_id: session.user.id,
        status: 'pending',
      },
    });

    console.log('[JOIN-REQUEST] Created for:', name, 'phone:', normalizedPhone, 'club:', tenant.name);

    return NextResponse.json({
      success: true,
      message: 'Join request submitted successfully',
      requestId: joinRequest.id,
      clubName: tenant.name,
    });

  } catch (error: any) {
    console.error('[JOIN-REQUEST] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create join request' 
      },
      { status: 500 }
    );
  }
}

