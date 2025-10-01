/**
 * Accept Admin Invitation API Route
 * 
 * POST /api/auth/admin/accept-invitation
 * Validates invitation token and creates admin account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, email, password, displayName } = await request.json();

    // Validate input
    if (!token || !email || !password || !displayName) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Verify invitation token
    const invitation = await prisma.admin_invitations.findFirst({
      where: {
        email: email,
        status: 'pending',
        expires_at: { gt: new Date() },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invitation' },
        { status: 400 }
      );
    }

    // Verify token hash with bcrypt
    const isValid = await bcrypt.compare(token, invitation.invitation_token_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation token' },
        { status: 401 }
      );
    }

    // Create Supabase auth user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (signUpError || !authData.user) {
      return NextResponse.json(
        { success: false, error: signUpError?.message || 'Failed to create account' },
        { status: 500 }
      );
    }

    // Explicitly create admin profile (server-side only - prevents bypass)
    await prisma.admin_profiles.create({
      data: {
        user_id: authData.user.id,
        tenant_id: invitation.tenant_id,
        user_role: invitation.invited_role,
        display_name: displayName,
        player_id: invitation.player_id, // Null if not linked to player
      },
    });

    // Update user app_metadata in Supabase (for middleware and RLS)
    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
      app_metadata: {
        user_role: invitation.invited_role,
        tenant_id: invitation.tenant_id,
        player_id: invitation.player_id,
      },
    });

    // Mark invitation as accepted
    await prisma.admin_invitations.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        accepted_by: authData.user.id,
        accepted_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: invitation.invited_role,
        tenantId: invitation.tenant_id,
      },
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

