/**
 * Superadmin endpoint to trigger stats update for ALL tenants
 * Loops through all tenants and enqueues stats jobs for each
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleTenantError } from '@/lib/api-helpers';

// Superadmin routes use service role to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('tenant_id, name')
      .eq('is_active', true);

    if (tenantsError) throw tenantsError;
    
    if (!tenants || tenants.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active tenants found'
      }, { status: 404 });
    }

    console.log(`[SUPERADMIN] Enqueueing stats jobs for ${tenants.length} tenants...`);

    // Enqueue background jobs for each tenant (so they appear in job status table)
    const results = await Promise.allSettled(
      tenants.map(async (tenant) => {
        console.log(`[SUPERADMIN] Enqueueing job for: ${tenant.name} (${tenant.tenant_id})`);
        
        try {
          // Insert background job for this tenant
          const { data: job, error: jobError } = await supabaseAdmin
            .from('background_job_status')
            .insert({
              tenant_id: tenant.tenant_id,
              job_type: 'stats_update',
              status: 'queued',
              job_payload: {
                triggeredBy: 'superadmin',
                requestId: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                tenantId: tenant.tenant_id,
                tenantName: tenant.name
              },
              retry_count: 0,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (jobError) throw jobError;
          
          console.log(`[SUPERADMIN] ✅ Job enqueued for ${tenant.name}: ${job.id}`);
          
          // Job is now enqueued - Render worker will pick it up and process it
          // Worker will update status: queued → processing → completed
          
          return { 
            tenantId: tenant.tenant_id, 
            name: tenant.name, 
            jobId: job.id,
            success: true 
          };
        } catch (err: any) {
          console.error(`[SUPERADMIN] ❌ Failed to enqueue for ${tenant.name}:`, err.message);
          throw new Error(`${tenant.name}: ${err.message}`);
        }
      })
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const failures = results
      .filter(r => r.status === 'rejected')
      .map((r: any) => r.reason?.message);

    console.log(`[SUPERADMIN] Jobs enqueued: ${successful} success, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `${successful} job(s) enqueued for processing. Check Background Job Status table below.`,
      details: {
        total: tenants.length,
        enqueued: successful,
        failed,
        failures: failed > 0 ? failures : undefined
      }
    });

  } catch (error) {
    console.error('[SUPERADMIN] Error triggering all stats:', error);
    return handleTenantError(error);
  }
}

