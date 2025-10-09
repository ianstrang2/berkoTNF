/**
 * API route for fetching background job status across ALL tenants (superadmin only)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleTenantError } from '@/lib/api-helpers';

// Superadmin routes use service role to bypass RLS for cross-tenant queries
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  try {
    // Fetch background job status across ALL tenants with tenant names
    // Use service role to bypass RLS
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('background_job_status')
      .select(`
        id,
        job_type,
        job_payload,
        status,
        started_at,
        completed_at,
        retry_count,
        error_message,
        results,
        created_at,
        tenant_id,
        tenants (
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false })
      .limit(25);

    if (jobsError) throw jobsError;

    // Transform to match expected format
    const formattedJobs = (jobs || []).map((job: any) => ({
      id: job.id,
      job_type: job.job_type,
      job_payload: job.job_payload,
      status: job.status,
      started_at: job.started_at,
      completed_at: job.completed_at,
      retry_count: job.retry_count,
      error_message: job.error_message,
      results: job.results,
      created_at: job.created_at,
      tenant_id: job.tenant_id,
      tenant_name: job.tenants?.name || null,
      tenant_slug: job.tenants?.slug || null
    }));

    /* Old code using Prisma with RLS blocking:
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
    */

    return NextResponse.json({
      success: true,
      data: formattedJobs
    });

  } catch (error) {
    return handleTenantError(error);
  }
}
