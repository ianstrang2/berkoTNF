/**
 * API route for fetching background job status with proper tenant context
 * Replaces direct Supabase queries from frontend to handle RLS properly
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAdminRole } from '@/lib/auth/apiAuth';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // SECURITY: Verify admin access
    await requireAdminRole(request);
    // Fetch background job status with tenant scoping using raw query
    const jobs = await prisma.$queryRaw`
      SELECT 
        id,
        job_type,
        job_payload,
        status,
        started_at,
        completed_at,
        retry_count,
        error_message,
        created_at,
        tenant_id
      FROM background_job_status 
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return NextResponse.json({
      success: true,
      data: jobs
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Vary': 'Cookie',
      },
    });
  }).catch(handleTenantError);
}
