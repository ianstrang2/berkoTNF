// src/app/api/admin/reset-player-profiles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantContext } from '@/lib/tenantContext';
import { requireAdminRole } from '@/lib/auth/apiAuth';

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // SECURITY: Verify admin access
      await requireAdminRole(request);
      console.log(`[RESET_PROFILES] Starting for tenant ${tenantId}...`);
      
      // Check if user only wants to clear profiles without regenerating
      const body = await request.json().catch(() => ({}));
      const clearOnly = body.clear_only === true;

      // Create background job entry for tracking
      let auditJobId: string | null = null;
      const startTime = Date.now();
      
      try {
        const auditLog = await prisma.background_job_status.create({
          data: {
            job_type: 'player_profile_generation',
            job_payload: {
              triggeredBy: 'manual',
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              action: clearOnly ? 'clear_only' : 'reset_and_regenerate'
            },
            status: 'processing',
            tenant_id: tenantId,
            started_at: new Date()
          }
        });
        auditJobId = auditLog.id;
        console.log(`📝 Created reset profiles audit log: ${auditJobId}`);
      } catch (auditError) {
        console.warn('Failed to create audit log (non-critical):', auditError);
      }

      // Clear all existing profiles - MULTI-TENANT: Scoped to tenant
      const clearResult = await prisma.players.updateMany({
        where: {
          tenant_id: tenantId,
          is_ringer: false,
          profile_text: { not: null }
        },
        data: {
          profile_text: null,
          profile_generated_at: null
        }
      });

      console.log(`Cleared ${clearResult.count} existing profiles`);

      // If user only wants to clear profiles, return early
      if (clearOnly) {
        // Update audit log
        if (auditJobId) {
          try {
            await prisma.background_job_status.update({
              where: { id: auditJobId },
              data: {
                status: 'completed',
                completed_at: new Date(),
                results: {
                  total_functions: 1,
                  successful_functions: 1,
                  failed_functions: 0,
                  function_results: [{
                    function: 'Clear Profiles',
                    status: 'success',
                    duration: Date.now() - startTime
                  }],
                  cleared_profiles: clearResult.count,
                  job_subtype: 'clear_only'
                }
              }
            });
          } catch (e) {
            console.warn('Failed to update audit log:', e);
          }
        }
        
        return NextResponse.json({
          success: true,
          message: 'Player profiles cleared successfully',
          cleared_profiles: clearResult.count,
          jobId: auditJobId
        });
      }

      // Trigger profile regeneration via Edge Function
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      // Use a very high threshold since we just cleared all profiles
      const recentDaysThreshold = 9999; // Effectively "all time" since profiles are NULL

      if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('Supabase configuration missing');
      }

      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
      
      console.log('Triggering profile regeneration via Edge Function...');
      
      // Don't await - let it run async. The edge function will process in background.
      // We return immediately so the UI doesn't hang.
      supabase.functions.invoke('generate-player-profiles', {
        body: { 
          recent_days_threshold: recentDaysThreshold, 
          limit: 100,
          tenant_id: tenantId
        }
      }).then(async ({ data: profileResult, error: profileError }) => {
        // This runs after the edge function completes (in background)
        if (auditJobId) {
          try {
            if (profileError) {
              console.error('Profile generation failed:', profileError);
              await prisma.background_job_status.update({
                where: { id: auditJobId },
                data: {
                  status: 'failed',
                  completed_at: new Date(),
                  error_message: profileError.message,
                  results: {
                    cleared_profiles: clearResult.count,
                    generation_error: profileError.message,
                    duration_ms: Date.now() - startTime
                  }
                }
              });
            } else {
              const playerResults = profileResult?.results || [];
              const successfulPlayers = playerResults.filter((r: any) => r.status === 'success');
              const failedPlayers = playerResults.filter((r: any) => r.status === 'error');
              
              await prisma.background_job_status.update({
                where: { id: auditJobId },
                data: {
                  status: 'completed',
                  completed_at: new Date(),
                  results: {
                    total_functions: playerResults.length,
                    successful_functions: successfulPlayers.length,
                    failed_functions: failedPlayers.length,
                    function_results: playerResults.map((r: any) => ({
                      function: r.name,
                      status: r.status === 'success' ? 'success' : 'failed',
                      duration: 0,
                      error: r.error || undefined,
                      action: r.action
                    })),
                    cleared_profiles: clearResult.count,
                    duration_ms: Date.now() - startTime,
                    job_subtype: 'reset_and_regenerate'
                  }
                }
              });
              console.log(`✅ Profile regeneration complete: ${successfulPlayers.length} succeeded`);
            }
          } catch (e) {
            console.warn('Failed to update audit log after completion:', e);
          }
        }
      }).catch(err => {
        console.error('Edge function invocation failed:', err);
      });

      // Return immediately - don't wait for edge function
      return NextResponse.json({
        success: true,
        message: 'Profile reset initiated - regeneration running in background',
        cleared_profiles: clearResult.count,
        jobId: auditJobId,
        status: 'queued'
      });

    } catch (error) {
      return handleTenantError(error);
    }
  });
}
