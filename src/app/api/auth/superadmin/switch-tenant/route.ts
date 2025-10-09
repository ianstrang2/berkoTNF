/**
 * Superadmin Tenant Switch API Route
 * 
 * POST /api/auth/superadmin/switch-tenant
 * Allows superadmin to switch active tenant context
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/apiAuth';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { logAuthActivity } from '@/lib/auth/activity';
import { handleTenantError } from '@/lib/api-helpers';
import { cookies } from 'next/headers';

// Use service role for cross-tenant tenant verification
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSuperadmin(request);
    const { tenantId } = await request.json();

    // tenantId can be null (return to platform) or a valid UUID (switch to tenant)
    let tenant: { tenant_id: string; name: string; is_active: boolean | null } | null = null;
    
    if (tenantId !== null) {
      // Verify tenant exists and is active (use service role to bypass RLS)
      const { data: tenantData, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .select('tenant_id, name, is_active')
        .eq('tenant_id', tenantId)
        .single();
      
      if (tenantError || !tenantData) {
        console.error('Tenant lookup error:', tenantError);
        return NextResponse.json(
          { success: false, error: 'Tenant not found' },
          { status: 404 }
        );
      }
      
      tenant = tenantData;

      if (!tenant) {
        return NextResponse.json(
          { success: false, error: 'Tenant not found' },
          { status: 404 }
        );
      }

      if (!tenant.is_active) {
        return NextResponse.json(
          { success: false, error: 'Tenant is inactive' },
          { status: 403 }
        );
      }
    }

    // Update app_metadata in Supabase (for RLS and JWT claims)
    // supabaseAdmin already created at module level
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...user.app_metadata,
        tenant_id: tenantId,
      },
    });

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update tenant context' },
        { status: 500 }
      );
    }

    // Update admin_profiles timestamp (optional - skip if fails)
    try {
      // Use service role to update admin_profiles (might be cross-tenant)
      const { error: profileError } = await supabaseAdmin
        .from('admin_profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      
      if (profileError) {
        console.warn('Could not update admin_profiles timestamp:', profileError);
        // Not critical - continue anyway
      }
    } catch (e) {
      console.warn('Admin profiles update skipped:', e);
    }

    // Log tenant switch (optional - skip if fails)
    try {
      await logAuthActivity({
        user_id: user.id,
        tenant_id: tenantId,
        activity_type: 'tenant_switched',
        success: true,
        metadata: { 
          previous_tenant: user.app_metadata?.tenant_id,
          new_tenant: tenantId,
        },
        request,
      });
    } catch (e) {
      console.warn('Activity logging failed:', e);
      // Not critical - continue anyway
    }

    // CRITICAL: Set HTTP-only cookie for reliable tenant context
    // This bypasses JWT refresh timing issues - cookie is immediately available on next request
    const cookieStore = cookies();
    
    if (tenantId) {
      // Set tenant cookie (expires in 30 days, will be cleared on logout)
      cookieStore.set('superadmin_selected_tenant', tenantId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
      console.log(`✅ Set superadmin_selected_tenant cookie: ${tenantId}`);
    } else {
      // Returning to platform view - clear the cookie
      cookieStore.delete('superadmin_selected_tenant');
      console.log(`🗑️ Cleared superadmin_selected_tenant cookie`);
    }

    return NextResponse.json({
      success: true,
      message: tenantId ? 'Tenant context updated' : 'Returned to platform view',
      tenant: tenant ? {
        id: tenant.tenant_id,
        name: tenant.name,
      } : null,
      requiresRefresh: true, // Client should call refreshSession()
    });
  } catch (error) {
    return handleTenantError(error);
  }
}

