/**
 * API route for fetching background job status with proper tenant context
 * Replaces direct Supabase queries from frontend to handle RLS properly
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentTenantId } from '@/lib/tenantContext';

export async function GET() {
  try {
    // Get tenant context
    const tenantId = getCurrentTenantId();
    
    // Set RLS context for this session
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;

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

  } catch (error) {
    console.error('Error fetching background job status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      },
      { status: 500 }
    );
  }
}
