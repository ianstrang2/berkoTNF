/**
 * Background Worker Entry Point
 * Listens to Supabase Queues and processes stats update jobs
 */

import { config } from 'dotenv';
import { getSupabaseClient } from './lib/supabase.js';
import { processStatsUpdateJob, handleJobRetry } from './jobs/statsUpdateJob.js';
import { StatsUpdateJobPayload } from './types/jobTypes.js';

// Load environment variables
config();

const QUEUE_NAME = process.env.QUEUE_NAME || 'stats-update-queue';
const WORKER_ID = process.env.WORKER_ID || `worker-${Date.now()}`;

interface QueueJob {
  id: string;
  payload: StatsUpdateJobPayload;
  retry_count?: number;
}

async function startWorker(): Promise<void> {
  console.log(`🚀 Starting Background Worker: ${WORKER_ID}`);
  console.log(`📡 Listening to queue: ${QUEUE_NAME}`);
  
  // Validate environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  console.log('✅ Environment variables validated');

  // Initialize Supabase client
  try {
    const supabase = getSupabaseClient();
    console.log('✅ Supabase client initialized');

    // Start listening to the queue
    await listenToQueue(supabase);
  } catch (error) {
    console.error('❌ Failed to initialize worker:', error);
    process.exit(1);
  }
}

async function listenToQueue(supabase: any): Promise<void> {
  console.log(`👂 Worker listening for jobs on queue: ${QUEUE_NAME}`);

  // Note: This is a placeholder for Supabase Queues implementation
  // The actual implementation will depend on Supabase's queue API
  // For now, we'll simulate with a polling mechanism

  while (true) {
    try {
      // Poll for jobs from the background_job_status table
      const { data: jobs, error } = await supabase
        .from('background_job_status')
        .select('*')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error('❌ Error polling for jobs:', error);
        await delay(5000); // Wait 5 seconds before retry
        continue;
      }

      if (jobs && jobs.length > 0) {
        const job = jobs[0];
        console.log(`📥 Received job: ${job.id}`);
        
        await processJob({
          id: job.id,
          payload: job.job_payload,
          retry_count: job.retry_count || 0
        });
      }

      // Wait before next poll
      await delay(1000); // Poll every second
    } catch (error) {
      console.error('❌ Error in queue listener:', error);
      await delay(5000); // Wait 5 seconds before retry
    }
  }
}

async function processJob(job: QueueJob): Promise<void> {
  try {
    console.log(`🔨 Processing job ${job.id} with payload:`, job.payload);
    
    if (job.retry_count && job.retry_count > 0) {
      await handleJobRetry(job.id, job.payload, job.retry_count);
    } else {
      await processStatsUpdateJob(job.id, job.payload);
    }
    
    console.log(`✅ Job ${job.id} processed successfully`);
  } catch (error) {
    console.error(`❌ Error processing job ${job.id}:`, error);
    
    // The job processor handles updating the status to failed
    // The queue system can decide whether to retry based on the job status
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the worker
if (require.main === module) {
  startWorker().catch((error) => {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  });
}
