/**
 * Validate Club Invite Token
 * 
 * GET /api/join/validate-token?tenant=berkotnf&token=abc123
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantSlug = searchParams.get('tenant');
    const inviteCode = searchParams.get('token');

    if (!tenantSlug || !inviteCode) {
      return NextResponse.json(
        { success: false, error: 'Missing tenant or token' },
        { status: 400 }
      );
    }

    // Find tenant by slug
    const tenant = await prisma.tenants.findUnique({
      where: { slug: tenantSlug },
      select: { tenant_id: true, name: true, is_active: true },
    });

    if (!tenant || !tenant.is_active) {
      return NextResponse.json(
        { success: false, error: 'Club not found or inactive' },
        { status: 404 }
      );
    }

    // Validate invite token
    const inviteToken = await prisma.club_invite_tokens.findFirst({
      where: {
        tenant_id: tenant.tenant_id,
        invite_code: inviteCode,
        is_active: true,
      },
    });

    if (!inviteToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invite link' },
        { status: 404 }
      );
    }

    // Check expiry if set
    if (inviteToken.expires_at && new Date(inviteToken.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This invite link has expired' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      clubName: tenant.name,
      tenantId: tenant.tenant_id,
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Vary': 'Cookie',
      },
    });
  } catch (error: any) {
    console.error('Error validating invite token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate invite' },
      { status: 500 }
    );
  }
}

