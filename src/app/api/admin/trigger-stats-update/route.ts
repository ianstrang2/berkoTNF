import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
// Multi-tenant imports - ensuring background jobs include tenant context
import { getCurrentTenantId } from '@/lib/tenantContext';

// Define the list of Edge Functions to call and their associated cache tags
// UPDATED: EWMA system has no execution order dependencies
const FUNCTIONS_TO_CALL: Array<{ name: string; tag?: string; tags?: string[] }> = [
  { name: 'call-update-half-and-full-season-stats', tags: [CACHE_TAGS.SEASON_STATS, CACHE_TAGS.HALF_SEASON_STATS] },
  { name: 'call-update-all-time-stats', tag: CACHE_TAGS.ALL_TIME_STATS },
  { name: 'call-update-hall-of-fame', tag: CACHE_TAGS.HALL_OF_FAME },
  { name: 'call-update-recent-performance', tag: CACHE_TAGS.RECENT_PERFORMANCE },
  { name: 'call-update-season-honours-and-records', tag: CACHE_TAGS.HONOUR_ROLL },
  { name: 'call-update-match-report-cache', tag: CACHE_TAGS.MATCH_REPORT },
  { name: 'call-update-personal-bests', tag: CACHE_TAGS.PERSONAL_BESTS },
  { name: 'call-update-player-profile-stats', tag: CACHE_TAGS.PLAYER_PROFILE },
  { name: 'call-update-player-teammate-stats', tag: CACHE_TAGS.PLAYER_TEAMMATE_STATS }, // NEW: Teammate stats function
  { name: 'call-update-season-race-data', tag: CACHE_TAGS.SEASON_RACE_DATA },
  // EWMA function - no position dependency
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

// Main stats update logic that can be called by both GET (cron) and POST (manual)
async function triggerStatsUpdate() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase URL or Service Role Key is missing.');
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const results: { function: string, status: string, revalidated?: boolean, error?: string, revalidation_error?: string }[] = [];
  let hasFailed = false;

  for (const func of FUNCTIONS_TO_CALL) {
    console.log(`Invoking Edge Function: ${func.name}`);
    
    // Add retry logic for network issues
    let attempt = 0;
    const maxAttempts = 3;
    let invokeError = null;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Attempt ${attempt} for ${func.name}`);
      
      const { error } = await supabase.functions.invoke(func.name);
      
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

    if (invokeError) {
      console.error(`All attempts failed for ${func.name}:`, invokeError);
      results.push({ 
        function: func.name, 
        status: 'failed', 
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
      revalidated: allRevalidationSucceeded,
      revalidation_error: revalidationErrors.length > 0 ? revalidationErrors.join('; ') : undefined
    });
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
      results, // Keep detailed results for debugging
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

// GET handler for Vercel cron jobs with feature flag support
export async function GET() {
  console.log('📅 Cron job triggered stats update');
  
  // Import feature flags dynamically to avoid module loading issues
  const { shouldUseBackgroundJobs } = await import('@/config/feature-flags');
  const useBackgroundJobs = shouldUseBackgroundJobs('cron');
  
  if (useBackgroundJobs) {
    console.log('🔄 Using background job system for cron trigger');
    
    // Multi-tenant: Get tenant context for background job
    const tenantId = getCurrentTenantId();
    
    // Enqueue job instead of processing directly
    const jobPayload = {
      triggeredBy: 'cron' as const,
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: tenantId // Multi-tenant: Include tenant context in background job
    };

    try {
      // Call the enqueue endpoint directly
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/admin/enqueue-stats-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Enqueue failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Cron job successfully enqueued:', result.jobId);
      
      return NextResponse.json({
        success: true,
        message: 'Cron stats update job successfully enqueued',
        jobId: result.jobId,
        method: 'background-job'
      });
    } catch (error) {
      console.error('❌ Failed to enqueue cron job, falling back to direct processing');
      return triggerStatsUpdate(); // Fallback to original implementation
    }
  } else {
    console.log('🔄 Using fallback edge functions for cron trigger');
    return triggerStatsUpdate();
  }
}

// POST handler for manual admin triggers
export async function POST() {
  console.log('👤 Manual stats update triggered');
  // Multi-tenant: Manual triggers also use tenant context
  const tenantId = getCurrentTenantId();
  console.log(`👤 Manual stats update triggered for tenant: ${tenantId}`);
  return triggerStatsUpdate();
}