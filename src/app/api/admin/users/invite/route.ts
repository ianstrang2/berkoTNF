/**
 * Admin Invitation API Route
 * 
 * POST /api/admin/users/invite
 * Creates invitation for new admin users (with bcrypt hashed tokens)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';
import { logAuthActivity } from '@/lib/auth/activity';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { user, tenantId, userRole } = await requireAdminRole(request);
    const { email, player_id, role } = await request.json();

    // Validate input
    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: 'Email and role are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'superadmin'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be admin or superadmin' },
        { status: 400 }
      );
    }

    // Only superadmin can invite other superadmins
    if (role === 'superadmin' && userRole !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Only superadmin can invite superadmins' },
        { status: 403 }
      );
    }

    // Determine target tenant
    // Note: Even superadmin invitations need a tenant_id (schema constraint)
    // Superadmins can switch tenants after accepting the invitation
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Must be in a tenant context to invite users' },
        { status: 400 }
      );
    }
    const targetTenantId = tenantId;

    // Validate player_id belongs to tenant (if provided)
    if (player_id) {
      const player = await prisma.players.findUnique({
        where: { player_id: parseInt(player_id) },
        select: { tenant_id: true },
      });

      if (!player || player.tenant_id !== targetTenantId) {
        return NextResponse.json(
          { success: false, error: 'Invalid player_id for this tenant' },
          { status: 400 }
        );
      }

      // Check if player already linked to an admin
      const existingAdmin = await prisma.admin_profiles.findFirst({
        where: { player_id: parseInt(player_id) },
      });

      if (existingAdmin) {
        return NextResponse.json(
          { success: false, error: 'This player is already linked to an admin account' },
          { status: 409 }
        );
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.admin_invitations.findFirst({
      where: {
        email,
        tenant_id: targetTenantId,
        status: 'pending',
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { success: false, error: 'An invitation for this email already exists' },
        { status: 409 }
      );
    }

    // Generate secure invitation token (NEVER store raw)
    const invitationToken = crypto.randomUUID();
    const hashedToken = await bcrypt.hash(invitationToken, 12);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store invitation with optional player link
    await prisma.admin_invitations.create({
      data: {
        tenant_id: targetTenantId,
        email,
        invited_by: user.id,
        invited_role: role,
        player_id: player_id ? parseInt(player_id) : null,
        invitation_token_hash: hashedToken,
        expires_at: expiresAt,
      },
    });

    // Log invitation activity
    await logAuthActivity({
      user_id: user.id,
      tenant_id: targetTenantId,
      activity_type: 'invitation_sent',
      success: true,
      metadata: { invited_email: email, invited_role: role },
      request,
    });

    // TODO: Send invitation email
    // For now, return the token (in production, this would be sent via email)
    const invitationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/accept-invitation?token=${invitationToken}`;

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      // TEMP: Include invitation URL for testing (remove in production)
      invitationUrl: process.env.NODE_ENV === 'development' ? invitationUrl : undefined,
    });
  } catch (error: any) {
    console.error('Invitation error:', error);

    if (error.name === 'AuthenticationError' || error.name === 'AuthorizationError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.name === 'AuthenticationError' ? 401 : 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

