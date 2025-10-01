/**
 * Role Switching API Route
 * 
 * POST /api/auth/switch-role
 * Allows admins with linked player profiles to switch between admin and player views
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';
import { logAuthActivity } from '@/lib/auth/activity';

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth(request);
    const { role } = await request.json();

    // Validate role parameter
    if (!role || !['admin', 'player'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "player"' },
        { status: 400 }
      );
    }

    // Validate requested role access
    if (role === 'admin') {
      const adminProfile = await prisma.admin_profiles.findUnique({
        where: { user_id: user.id },
      });

      if (!adminProfile) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
    }

    if (role === 'player') {
      const adminProfile = await prisma.admin_profiles.findUnique({
        where: { user_id: user.id },
        select: { player_id: true, tenant_id: true },
      });

      if (!adminProfile?.player_id) {
        return NextResponse.json(
          { error: 'No linked player profile. Contact an admin to link your account.' },
          { status: 403 }
        );
      }
    }

    // Log role switch
    await logAuthActivity({
      user_id: user.id,
      tenant_id: user.app_metadata?.tenant_id,
      activity_type: 'role_switched',
      success: true,
      metadata: { new_role: role },
      request,
    });

    // Return success - client updates localStorage for UI preference
    return NextResponse.json({
      success: true,
      currentRole: role,
      message: `Switched to ${role} view`,
    });
  } catch (error: any) {
    console.error('Role switch error:', error);

    if (error.name === 'AuthenticationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

