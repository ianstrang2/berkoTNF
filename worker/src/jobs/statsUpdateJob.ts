/**
 * Background job processor for stats updates
 * Processes all stats functions and handles cache invalidation
 */

import { getSupabaseClient, updateJobStatus } from '../lib/supabase.js';
import { processAllStatsFunctions } from '../lib/statsProcessor.js';
import { invalidateCache } from '../lib/cache.js';
import { StatsUpdateJobPayload, JobResult } from '../types/jobTypes.js';

export async function processStatsUpdateJob(
  jobId: string,
  payload: StatsUpdateJobPayload
): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🎯 Starting stats update job ${jobId}`);
  console.log(`[${timestamp}] 📋 Job payload:`, {
    triggeredBy: payload.triggeredBy,
    matchId: payload.matchId || 'N/A',
    requestId: payload.requestId,
    userId: payload.userId || 'system',
    timestamp: payload.timestamp,
    retryOf: payload.retryOf || 'N/A',
    tenantId: payload.tenantId
  });

  const startTime = Date.now();

  try {
    // Update job status to processing
    console.log(`[${new Date().toISOString()}] 📝 Updating job status to 'processing'`);
    await updateJobStatus(jobId, 'processing');

    // Get Supabase client
    console.log(`[${new Date().toISOString()}] 🔗 Initializing Supabase client`);
    const supabase = getSupabaseClient();

    // Process all stats functions in parallel
    console.log(`[${new Date().toISOString()}] ⚡ Starting parallel processing of all stats functions...`);
    const { results, allCacheTags, summary } = await processAllStatsFunctions(supabase, payload.tenantId);
    console.log(`[${new Date().toISOString()}] 📊 Stats processing completed:`, {
      totalFunctions: summary.total,
      successful: summary.successful,
      failed: summary.failed,
      totalDuration: summary.totalDuration + 'ms',
      cacheTags: allCacheTags.length
    });

    // Convert results to job format with actual function names
    const { STATS_FUNCTIONS } = await import('../lib/statsProcessor.js');
    const jobResults: JobResult[] = results.map((result, index) => ({
      function: STATS_FUNCTIONS[index]?.rpcName || `stats_function_${index}`,
      status: result.success ? 'success' : 'failed',
      duration: result.duration,
      error: result.error
    }));

    // Attempt cache invalidation
    console.log(`[${new Date().toISOString()}] 🧹 Starting cache invalidation for ${allCacheTags.length} tags:`, allCacheTags);
    const cacheResult = await invalidateCache(allCacheTags, payload.requestId, `job-${payload.triggeredBy}`);
    console.log(`[${new Date().toISOString()}] 🧹 Cache invalidation completed:`, {
      success: cacheResult.success,
      invalidatedTags: cacheResult.invalidated_tags.length,
      failedTags: cacheResult.failed_tags.length,
      error: cacheResult.error || 'none'
    });

    // Prepare final results
    const finalResults = {
      total_functions: summary.total,
      successful_functions: summary.successful,
      failed_functions: summary.failed,
      cache_invalidation_success: cacheResult.success,
      function_results: jobResults
    };

    const totalDuration = Date.now() - startTime;

    if (summary.failed > 0 || !cacheResult.success) {
      // Partial failure
      const errorMessages: string[] = [];
      
      if (summary.failed > 0) {
        errorMessages.push(`${summary.failed}/${summary.total} stats functions failed`);
      }
      
      if (!cacheResult.success) {
        errorMessages.push(`Cache invalidation failed: ${cacheResult.error}`);
      }

      const errorMessage = errorMessages.join('; ');
      
      console.log(`[${new Date().toISOString()}] 📝 Updating job status to 'failed'`);
      await updateJobStatus(jobId, 'failed', {
        error_message: errorMessage,
        results: finalResults
      });

      console.error(`[${new Date().toISOString()}] ❌ Job ${jobId} completed with errors in ${totalDuration}ms: ${errorMessage}`);
    } else {
      // Complete success
      console.log(`[${new Date().toISOString()}] 📝 Updating job status to 'completed'`);
      await updateJobStatus(jobId, 'completed', {
        results: finalResults
      });

      console.log(`[${new Date().toISOString()}] ✅ Job ${jobId} completed successfully in ${totalDuration}ms`);
    }

  } catch (error) {
    const errorTime = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const totalDuration = Date.now() - startTime;

    console.error(`[${errorTime}] 🚨 CRITICAL ERROR in job ${jobId} after ${totalDuration}ms`);
    console.error(`[${errorTime}] Error message:`, errorMessage);
    console.error(`[${errorTime}] Full error:`, error);
    console.error(`[${errorTime}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    console.error(`[${errorTime}] Job context:`, {
      jobId,
      triggeredBy: payload.triggeredBy,
      matchId: payload.matchId,
      requestId: payload.requestId,
      userId: payload.userId,
      duration: totalDuration + 'ms'
    });

    try {
      console.log(`[${new Date().toISOString()}] 📝 Updating failed job status in database`);
      await updateJobStatus(jobId, 'failed', {
        error_message: errorMessage,
        results: {
          total_functions: 0,
          successful_functions: 0,
          failed_functions: 0,
          cache_invalidation_success: false,
          function_results: []
        }
      });
    } catch (updateError) {
      console.error(`[${new Date().toISOString()}] 🚨 Failed to update job status to 'failed':`, updateError);
    }

    throw error; // Re-throw for queue system to handle retries
  }
}

export async function handleJobRetry(
  jobId: string,
  payload: StatsUpdateJobPayload,
  currentRetryCount: number
): Promise<void> {
  const maxRetries = 3;
  
  if (currentRetryCount >= maxRetries) {
    console.error(`🛑 Job ${jobId} exceeded maximum retry attempts (${maxRetries})`);
    await updateJobStatus(jobId, 'failed', {
      error_message: `Job exceeded maximum retry attempts (${maxRetries})`,
      retry_count: currentRetryCount
    });
    return;
  }

  console.log(`🔄 Retrying job ${jobId} (attempt ${currentRetryCount + 1}/${maxRetries})`);
  
  // Update retry count
  await updateJobStatus(jobId, 'queued', {
    retry_count: currentRetryCount + 1
  });

  // Process the job again
  await processStatsUpdateJob(jobId, payload);
}
