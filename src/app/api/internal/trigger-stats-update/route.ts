import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { prisma } from '@/lib/prisma';

/**
 * Internal API endpoint for triggering stats updates
 * 
 * This endpoint is designed for server-to-server calls (e.g., from deletion routes)
 * and uses Bearer token authentication instead of cookie-based auth.
 * 
 * Authentication: Bearer token (INTERNAL_API_KEY)
 */

// Define the list of Edge Functions to call and their associated cache tags
const FUNCTIONS_TO_CALL: Array<{ name: string; tag?: string; tags?: string[] }> = [
  { name: 'call-update-half-and-full-season-stats', tags: [CACHE_TAGS.SEASON_STATS, CACHE_TAGS.HALF_SEASON_STATS] },
  { name: 'call-update-all-time-stats', tag: CACHE_TAGS.ALL_TIME_STATS },
  { name: 'call-update-hall-of-fame', tag: CACHE_TAGS.HALL_OF_FAME },
  { name: 'call-update-recent-performance', tag: CACHE_TAGS.RECENT_PERFORMANCE },
  { name: 'call-update-season-honours-and-records', tag: CACHE_TAGS.HONOUR_ROLL },
  { name: 'call-update-match-report-cache', tag: CACHE_TAGS.MATCH_REPORT },
  { name: 'call-update-personal-bests', tag: CACHE_TAGS.PERSONAL_BESTS },
  { name: 'call-update-player-profile-stats', tag: CACHE_TAGS.PLAYER_PROFILE },
  { name: 'call-update-player-teammate-stats', tag: CACHE_TAGS.PLAYER_TEAMMATE_STATS },
  { name: 'call-update-season-race-data', tag: CACHE_TAGS.SEASON_RACE_DATA },
  { name: 'call-update-power-ratings', tag: CACHE_TAGS.PLAYER_POWER_RATING }
];

// Simplified direct cache revalidation function
function revalidateCache(tag: string): { success: boolean; error?: string } {
  try {
    console.log(`🔄 Revalidating cache tag: ${tag}`);
    revalidateTag(tag);
    console.log(`✅ Successfully revalidated tag: ${tag}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to revalidate tag ${tag}:`, error);
    return { success: false, error: errorMessage };
  }
}

// Verify internal API key
function verifyInternalAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.INTERNAL_API_KEY || 'internal-worker-key';
  
  if (!authHeader) {
    console.warn('[INTERNAL_API] Missing Authorization header');
    return false;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return token === expectedKey;
}

export async function POST(request: NextRequest) {
  // Verify internal authentication
  if (!verifyInternalAuth(request)) {
    console.error('[INTERNAL_API] Unauthorized access attempt');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { tenantId, triggeredBy, matchId } = body;

  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'tenantId is required' },
      { status: 400 }
    );
  }

  console.log(`[INTERNAL_API] Stats update triggered for tenant ${tenantId} (source: ${triggeredBy})`);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase URL or Service Role Key is missing.');
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
  }

  // Create audit log entry
  let auditJobId: string | null = null;
  
  try {
    const auditLog = await prisma.background_job_status.create({
      data: {
        job_type: 'stats_update_internal',
        job_payload: {
          triggeredBy: triggeredBy || 'internal',
          matchId,
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          note: 'Internal server-to-server trigger'
        },
        status: 'processing',
        tenant_id: tenantId,
        started_at: new Date()
      }
    });
    auditJobId = auditLog.id;
    console.log(`📝 Created internal audit log: ${auditJobId}`);
  } catch (auditError) {
    console.warn('Failed to create audit log (non-critical):', auditError);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const results: { function: string, status: string, duration?: number, revalidated?: boolean, error?: string, revalidation_error?: string }[] = [];
  let hasFailed = false;
  const startTime = Date.now();

  for (const func of FUNCTIONS_TO_CALL) {
    console.log(`Invoking Edge Function: ${func.name}`);
    
    const funcStartTime = Date.now();
    
    // Add retry logic for network issues
    let attempt = 0;
    const maxAttempts = 3;
    let invokeError = null;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Attempt ${attempt} for ${func.name}`);
      
      const { error } = await supabase.functions.invoke(func.name, {
        body: { tenantId }
      });
      
      if (!error) {
        invokeError = null;
        break; // Success, exit retry loop
      }
      
      invokeError = error;
      console.log(`Attempt ${attempt} failed for ${func.name}:`, error);
      
      // Wait briefly before retry
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const funcDuration = Date.now() - funcStartTime;

    if (invokeError) {
      console.error(`All attempts failed for ${func.name}:`, invokeError);
      results.push({ 
        function: func.name, 
        status: 'failed',
        duration: funcDuration,
        error: String(invokeError),
        revalidated: false,
        revalidation_error: 'Skipped due to function failure'
      });
      hasFailed = true;
      continue; // Continue to next function even if one fails
    }
    
    console.log(`Successfully invoked ${func.name}. Revalidating cache...`);
    
    // Handle both single tag and multiple tags
    const tagsToRevalidate = func.tags || (func.tag ? [func.tag] : []);
    let allRevalidationSucceeded = true;
    let revalidationErrors: string[] = [];
    
    for (const tag of tagsToRevalidate) {
      const revalidationResult = revalidateCache(tag);
      if (!revalidationResult.success) {
        allRevalidationSucceeded = false;
        revalidationErrors.push(`${tag}: ${revalidationResult.error}`);
        hasFailed = true;
      }
    }
    
    results.push({
      function: func.name,
      status: 'success',
      duration: funcDuration,
      revalidated: allRevalidationSucceeded,
      revalidation_error: revalidationErrors.length > 0 ? revalidationErrors.join('; ') : undefined
    });
  }

  const totalDuration = Date.now() - startTime;
  
  // Update audit log with results
  if (auditJobId) {
    try {
      const finalStatus = hasFailed ? 'failed' : 'completed';
      const errorSummary = hasFailed 
        ? `${results.filter(r => r.status === 'failed').length}/${results.length} functions failed`
        : null;
      
      await prisma.background_job_status.update({
        where: { id: auditJobId },
        data: {
          status: finalStatus,
          completed_at: new Date(),
          error_message: errorSummary,
          results: {
            total_functions: results.length,
            successful_functions: results.filter(r => r.status === 'success').length,
            failed_functions: results.filter(r => r.status === 'failed').length,
            function_results: results.map(r => ({
              function: r.function,
              status: r.status,
              duration: r.duration || 0,
              error: r.error
            }))
          }
        }
      });
      console.log(`📝 Updated internal audit log ${auditJobId} with ${finalStatus} status`);
    } catch (auditUpdateError) {
      console.warn('Failed to update audit log (non-critical):', auditUpdateError);
    }
  }

  // Generate user-friendly summary
  const functionFailures = results.filter(r => r.status === 'failed').length;
  const revalidationFailures = results.filter(r => !r.revalidated).length;
  const totalFunctions = results.length;

  if (hasFailed) {
    let userMessage = 'Stats update completed with issues:\n';
    
    if (functionFailures > 0) {
      userMessage += `• ${functionFailures}/${totalFunctions} database updates failed\n`;
    }
    
    if (revalidationFailures > 0) {
      userMessage += `• ${revalidationFailures}/${totalFunctions} cache invalidations failed\n`;
    }
    
    userMessage += '\nData may be stale until cache expires or manual refresh.';

    return NextResponse.json({
      success: false,
      message: userMessage,
      summary: {
        total_functions: totalFunctions,
        function_failures: functionFailures,
        revalidation_failures: revalidationFailures,
        failed_tags: results.filter(r => !r.revalidated).map(r => r.function)
      },
      results,
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `All ${totalFunctions} stats update functions and cache invalidations completed successfully.`,
    summary: {
      total_functions: totalFunctions,
      function_failures: 0,
      revalidation_failures: 0
    },
    results,
  });
}

