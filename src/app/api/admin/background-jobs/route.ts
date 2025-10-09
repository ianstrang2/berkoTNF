/**
 * API route for fetching background job status with proper tenant context
 * Replaces direct Supabase queries from frontend to handle RLS properly
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
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
    });
  }).catch(handleTenantError);
}
