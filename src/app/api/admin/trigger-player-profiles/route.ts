import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantContext, getCurrentTenantId } from '@/lib/tenantContext';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

// Main profile generation logic that can be called by both GET (cron) and POST (manual)
async function triggerProfileGeneration(tenantId: string, triggeredBy: 'cron' | 'manual' = 'manual') {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const recentDaysThreshold = parseInt(process.env.PROFILE_RECENT_DAYS_THRESHOLD || '7');
  const startTime = Date.now();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase URL or Service Role Key is missing.');
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
  }

  // Create audit log entry for tracking
  let auditJobId: string | null = null;
  try {
    const auditLog = await prisma.background_job_status.create({
      data: {
        job_type: 'player_profile_generation',
        job_payload: {
          triggeredBy,
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          recent_days_threshold: recentDaysThreshold
        },
        status: 'processing',
        tenant_id: tenantId,
        started_at: new Date()
      }
    });
    auditJobId = auditLog.id;
    console.log(`📝 Created profile generation audit log: ${auditJobId}`);
  } catch (auditError) {
    console.warn('Failed to create audit log (non-critical):', auditError);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  console.log(`🎭 Starting profile generation with ${recentDaysThreshold}-day threshold`);

  try {
    // Call the Edge Function with retry logic
    let attempt = 0;
    const maxAttempts = 3;
    let lastError: any = null;
    let resultData: any = null;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Attempt ${attempt} for generate-player-profiles (tenant: ${tenantId})`);
      
      const { data, error } = await supabase.functions.invoke('generate-player-profiles', {
        body: { 
          recent_days_threshold: recentDaysThreshold,
          tenant_id: tenantId  // Pass tenant context to edge function
        }
      });
      
      if (!error) {
        resultData = data;
        console.log('✅ Profile generation completed successfully');
        
        // Update audit log with success (format compatible with system-health UI)
        if (auditJobId) {
          try {
            const playerResults = data?.results || [];
            const successfulPlayers = playerResults.filter((r: any) => r.status === 'success');
            const failedPlayers = playerResults.filter((r: any) => r.status === 'error');
            
            await prisma.background_job_status.update({
              where: { id: auditJobId },
              data: {
                status: 'completed',
                completed_at: new Date(),
                results: {
                  // UI-compatible fields for expandable details
                  total_functions: playerResults.length,
                  successful_functions: successfulPlayers.length,
                  failed_functions: failedPlayers.length,
                  function_results: playerResults.map((r: any) => ({
                    function: r.name,  // Player name as "function" for display
                    status: r.status === 'success' ? 'success' : 'failed',
                    duration: 0,  // Individual duration not tracked
                    error: r.error || undefined,
                    action: r.action  // Additional context (generate_new, replace_existing, etc.)
                  })),
                  // Profile-specific fields
                  duration_ms: Date.now() - startTime,
                  job_subtype: 'player_profiles'
                }
              }
            });
            console.log(`📝 Updated audit log ${auditJobId} with success status`);
          } catch (updateError) {
            console.warn('Failed to update audit log (non-critical):', updateError);
          }
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Profile generation completed',
          results: data,
          recent_days_threshold: recentDaysThreshold,
          jobId: auditJobId
        });
      }
      
      lastError = error;
      console.log(`Attempt ${attempt} failed for generate-player-profiles:`, error);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // All attempts failed
    console.error(`All attempts failed for generate-player-profiles:`, lastError);
    const errorMessage = lastError?.message || lastError?.toString() || 'Unknown error';
    
    // Update audit log with failure
    if (auditJobId) {
      try {
        await prisma.background_job_status.update({
          where: { id: auditJobId },
          data: {
            status: 'failed',
            completed_at: new Date(),
            error_message: errorMessage,
            results: {
              duration_ms: Date.now() - startTime,
              attempts: attempt
            }
          }
        });
        console.log(`📝 Updated audit log ${auditJobId} with failed status`);
      } catch (updateError) {
        console.warn('Failed to update audit log (non-critical):', updateError);
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: `Profile generation failed: ${errorMessage}`,
      recent_days_threshold: recentDaysThreshold,
      jobId: auditJobId
    }, { status: 500 });

  } catch (error) {
    // Update audit log with error
    if (auditJobId) {
      try {
        await prisma.background_job_status.update({
          where: { id: auditJobId },
          data: {
            status: 'failed',
            completed_at: new Date(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
            results: {
              duration_ms: Date.now() - startTime
            }
          }
        });
      } catch (updateError) {
        console.warn('Failed to update audit log (non-critical):', updateError);
      }
    }
    return handleTenantError(error);
  }
}

// GET handler for Vercel cron jobs (no auth required - cron jobs are unauthenticated)
export async function GET() {
  // Use default tenant for cron jobs (matches trigger-stats-update pattern)
  const tenantId = getCurrentTenantId();
  console.log(`📅 Cron job triggered profile generation for tenant ${tenantId}`);
  return triggerProfileGeneration(tenantId, 'cron');
}

// POST handler for manual admin triggers
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // SECURITY: Verify admin access
    await requireAdminRole(request);
    
    console.log(`👤 Manual admin triggered profile generation for tenant ${tenantId}`);
    return triggerProfileGeneration(tenantId, 'manual');
  });
}
