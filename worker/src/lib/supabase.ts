/**
 * Supabase client setup for background worker
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

// Custom fetch with 20-second timeout for long-running SQL functions
const customFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000); // 20 seconds

  console.log(`[DEBUG] Starting fetch to Supabase RPC: ${input}`);
  const start = Date.now();
  
  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    const duration = Date.now() - start;
    console.log(`[DEBUG] Supabase RPC completed in ${duration}ms`);
    return response;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[DEBUG] Supabase RPC failed after ${duration}ms:`, error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        fetch: customFetch
      }
    });

    console.log('✅ Supabase client initialized with 20s timeout for RPC calls');
  }

  return supabaseClient;
}

export async function updateJobStatus(
  jobId: string,
  status: 'queued' | 'processing' | 'completed' | 'failed',
  updates: {
    started_at?: string;
    completed_at?: string;
    error_message?: string;
    results?: any;
    retry_count?: number;
  } = {}
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const updateData: any = { status, ...updates };
  
  // Set timestamps based on status
  if (status === 'processing' && !updates.started_at) {
    updateData.started_at = new Date().toISOString();
  }
  
  if ((status === 'completed' || status === 'failed') && !updates.completed_at) {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('background_job_status')
    .update(updateData)
    .eq('id', jobId);

  if (error) {
    console.error(`Failed to update job ${jobId} status to ${status}:`, error);
    throw error;
  }

  console.log(`✅ Updated job ${jobId} status to ${status}`);
}
