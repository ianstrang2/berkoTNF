/**
 * Join Club by Code API
 * 
 * POST /api/join/by-code
 * Validates club code and redirects to join flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { club_code } = await request.json();

    if (!club_code) {
      return NextResponse.json(
        { success: false, error: 'Club code is required' },
        { status: 400 }
      );
    }

    // Normalize code (uppercase, remove spaces)
    const normalizedCode = club_code.trim().toUpperCase();

    // Find tenant by club code
    const tenant = await prisma.tenants.findUnique({
      where: { club_code: normalizedCode },
      select: {
        tenant_id: true,
        name: true,
        slug: true,
        is_active: true,
        club_invite_tokens: {
          where: { is_active: true },
          select: { invite_code: true },
          take: 1,
        },
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

    // Get active invite token for this club
    const inviteToken = tenant.club_invite_tokens[0];

    if (!inviteToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No active invite link for this club. Please ask your admin to generate one.' 
        },
        { status: 404 }
      );
    }

    // Return join URL
    return NextResponse.json({
      success: true,
      club_name: tenant.name,
      join_url: `/join/${tenant.slug}/${inviteToken.invite_code}`,
    });

  } catch (error: any) {
    console.error('Error looking up club code:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to find club' 
      },
      { status: 500 }
    );
  }
}

