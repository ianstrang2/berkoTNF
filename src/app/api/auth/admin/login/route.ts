/**
 * Admin Login API Route
 * 
 * POST /api/auth/admin/login
 * Handles admin email/password authentication via Supabase
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuthActivity } from '@/lib/auth/activity';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Supabase handles password verification and session creation
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      // Log failed login attempt
      await logAuthActivity({
        user_id: email, // Use email since we don't have user_id for failed logins
        activity_type: 'login',
        success: false,
        failure_reason: error?.message || 'Invalid credentials',
        request,
      });

      return NextResponse.json(
        { success: false, error: error?.message || 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify user has admin_profile
    const adminProfile = await prisma.admin_profiles.findUnique({
      where: { user_id: data.user.id },
      select: {
        user_role: true,
        tenant_id: true,
        display_name: true,
        player_id: true,
      },
    });

    if (!adminProfile) {
      // User exists but is not an admin - sign them out
      await supabase.auth.signOut();

      await logAuthActivity({
        user_id: data.user.id,
        activity_type: 'login',
        success: false,
        failure_reason: 'Not an admin account',
        request,
      });

      return NextResponse.json(
        { success: false, error: 'Not an admin account' },
        { status: 403 }
      );
    }

    // Update last login timestamp
    await prisma.admin_profiles.update({
      where: { user_id: data.user.id },
      data: { last_login_at: new Date() },
    });

    // Log successful login
    await logAuthActivity({
      user_id: data.user.id,
      tenant_id: adminProfile.tenant_id,
      activity_type: 'login',
      success: true,
      request,
    });

    // Determine redirect URL based on role
    const redirectUrl = adminProfile.user_role === 'superadmin' 
      ? '/superadmin/tenants' 
      : '/admin';

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: adminProfile.user_role,
        displayName: adminProfile.display_name,
        tenantId: adminProfile.tenant_id,
        hasPlayerProfile: !!adminProfile.player_id,
      },
      redirectUrl,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

