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
  console.log(`🎯 Starting stats update job ${jobId}`);
  console.log(`📋 Job payload:`, payload);

  const startTime = Date.now();

  try {
    // Update job status to processing
    await updateJobStatus(jobId, 'processing');

    // Get Supabase client
    const supabase = getSupabaseClient();

    // Process all stats functions in parallel
    console.log(`⚡ Processing all stats functions in parallel...`);
    const { results, allCacheTags, summary } = await processAllStatsFunctions(supabase);

    // Convert results to job format
    const jobResults: JobResult[] = results.map((result, index) => ({
      function: `stats_function_${index}`,
      status: result.success ? 'success' : 'failed',
      duration: result.duration,
      error: result.error
    }));

    // Attempt cache invalidation
    console.log(`🧹 Attempting cache invalidation for ${allCacheTags.length} tags...`);
    const cacheResult = await invalidateCache(allCacheTags, payload.requestId, `job-${payload.triggeredBy}`);

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
      
      await updateJobStatus(jobId, 'failed', {
        error_message: errorMessage,
        results: finalResults
      });

      console.error(`❌ Job ${jobId} completed with errors in ${totalDuration}ms: ${errorMessage}`);
    } else {
      // Complete success
      await updateJobStatus(jobId, 'completed', {
        results: finalResults
      });

      console.log(`✅ Job ${jobId} completed successfully in ${totalDuration}ms`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const totalDuration = Date.now() - startTime;

    console.error(`🚨 Job ${jobId} failed with critical error after ${totalDuration}ms:`, error);

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
