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

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSuperadmin(request);
    const { tenantId } = await request.json();

    // tenantId can be null (return to platform) or a valid UUID (switch to tenant)
    let tenant: { tenant_id: string; name: string; is_active: boolean | null } | null = null;
    
    if (tenantId !== null) {
      // Verify tenant exists and is active
      tenant = await prisma.tenants.findUnique({
        where: { tenant_id: tenantId },
        select: { 
          tenant_id: true, 
          name: true, 
          is_active: true 
        },
      });

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

    // Update admin_profiles timestamp
    await prisma.admin_profiles.update({
      where: { user_id: user.id },
      data: { updated_at: new Date() },
    });

    // Log tenant switch
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

