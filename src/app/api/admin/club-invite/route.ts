/**
 * Club Invite Token API
 * 
 * GET /api/admin/club-invite - Get or generate invite link for the club
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';
import { withTenantContext } from '@/lib/tenantContext';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user } = await requireAdminRole(request);
      
      // Check if active invite token exists
      let inviteToken = await prisma.club_invite_tokens.findFirst({
      where: {
        tenant_id: tenantId,
        is_active: true,
      },
    });

    // If no active token, create one
    if (!inviteToken) {
      const inviteCode = crypto.randomBytes(16).toString('hex');
      
      inviteToken = await prisma.club_invite_tokens.create({
        data: {
          tenant_id: tenantId,
          invite_code: inviteCode,
          created_by: user.id,
          is_active: true,
        },
      });
    }

    // Get tenant slug for URL
    const tenant = await prisma.tenants.findUnique({
      where: { tenant_id: tenantId },
      select: { slug: true, name: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/join/${tenant?.slug}/${inviteToken.invite_code}`;

    return NextResponse.json({
      success: true,
      data: {
        inviteUrl,
        inviteCode: inviteToken.invite_code,
        createdAt: inviteToken.created_at,
        tenantName: tenant?.name || 'Your Club',
      },
    });
    } catch (error: any) {
      console.error('Error managing club invite:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to manage invite token' },
        { status: 500 }
      );
    }
  });
}

// POST: Regenerate invite token (security - if link gets compromised)
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user } = await requireAdminRole(request);
      
      // Deactivate old token
      await prisma.club_invite_tokens.updateMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
      },
      data: {
        is_active: false,
      },
    });

    // Create new token
    const inviteCode = crypto.randomBytes(16).toString('hex');
    
    const newToken = await prisma.club_invite_tokens.create({
      data: {
        tenant_id: tenantId,
        invite_code: inviteCode,
        created_by: user.id,
        is_active: true,
      },
    });

    // Get tenant slug for URL
    const tenant = await prisma.tenants.findUnique({
      where: { tenant_id: tenantId },
      select: { slug: true, name: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/join/${tenant?.slug}/${newToken.invite_code}`;

      return NextResponse.json({
        success: true,
        message: 'Invite link regenerated',
        data: {
          inviteUrl,
          inviteCode: newToken.invite_code,
          createdAt: newToken.created_at,
          tenantName: tenant?.name || 'Your Club',
        },
      });
    } catch (error: any) {
      console.error('Error regenerating invite:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to regenerate invite token' },
        { status: 500 }
      );
    }
  });
}

