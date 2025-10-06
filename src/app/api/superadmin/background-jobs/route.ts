/**
 * API route for fetching background job status across ALL tenants (superadmin only)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch background job status across ALL tenants with tenant names
    const jobs = await prisma.$queryRaw<Array<{
      id: string;
      job_type: string;
      job_payload: any;
      status: string;
      started_at: Date | null;
      completed_at: Date | null;
      retry_count: number;
      error_message: string | null;
      results: any;
      created_at: Date;
      tenant_id: string | null;
      tenant_name: string | null;
      tenant_slug: string | null;
    }>>`
      SELECT 
        bjs.id,
        bjs.job_type,
        bjs.job_payload,
        bjs.status,
        bjs.started_at,
        bjs.completed_at,
        bjs.retry_count,
        bjs.error_message,
        bjs.results,
        bjs.created_at,
        bjs.tenant_id,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM background_job_status bjs
      LEFT JOIN tenants t ON t.tenant_id = bjs.tenant_id
      ORDER BY bjs.created_at DESC
      LIMIT 25
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
