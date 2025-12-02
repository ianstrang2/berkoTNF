/**
 * Unified endpoint for enqueueing stats update jobs
 * Used by all three trigger points: post-match, admin, cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Multi-tenant imports - ensuring background jobs include tenant context
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAdminRole } from '@/lib/auth/apiAuth';

interface StatsUpdateJobPayload {
  triggeredBy: 'post-match' | 'admin' | 'cron';
  matchId?: number;
  timestamp?: string;
  requestId: string;
  userId?: string;
  retryOf?: string;
  // Multi-tenant: Include tenant context in job payloads
  tenantId: string;
}

interface EnqueueResponse {
  success: boolean;
  jobId?: string;
  message: string;
  error?: string;
}

// Verify internal API key for server-to-server calls
function verifyInternalAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.INTERNAL_API_KEY || 'internal-worker-key';
  
  if (!authHeader) {
    return false;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return token === expectedKey;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check if this is an internal server-to-server call
  const isInternalCall = verifyInternalAuth(request);
  
  if (isInternalCall) {
    // Internal call: Extract tenantId from payload and bypass cookie auth
    console.log('📥 Stats job enqueue request received (internal server-to-server)');
    
    const payload: StatsUpdateJobPayload = await request.json();
    
    // Validate tenantId is provided in payload for internal calls
    if (!payload.tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'tenantId is required in payload for internal calls',
          message: 'Invalid request payload'
        } as EnqueueResponse,
        { status: 400 }
      );
    }
    
    // Process the job with tenant from payload
    return processEnqueueJob(payload, payload.tenantId);
  }
  
  // Regular call: Use cookie-based auth via withTenantContext
  return withTenantContext(request, async (tenantId) => {
    // SECURITY: Verify admin access for cookie-based calls
    await requireAdminRole(request);
    
    console.log('📥 Stats job enqueue request received (authenticated user)');

    // Parse request body
    const payload: StatsUpdateJobPayload = await request.json();
    
    // Multi-tenant: Ensure tenant context is included in job payload
    payload.tenantId = tenantId;
    
    // Process the job
    return processEnqueueJob(payload, tenantId);
  }).catch(handleTenantError);
}

// Shared processing logic for both auth paths
async function processEnqueueJob(payload: StatsUpdateJobPayload, tenantId: string): Promise<NextResponse> {
  // Validate required fields
  if (!payload.triggeredBy || !payload.requestId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required fields: triggeredBy and requestId are required',
        message: 'Invalid request payload'
      } as EnqueueResponse,
      { status: 400 }
    );
  }

  // Validate triggeredBy value
  if (!['post-match', 'admin', 'cron'].includes(payload.triggeredBy)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid triggeredBy value. Must be one of: post-match, admin, cron',
        message: 'Invalid trigger type'
      } as EnqueueResponse,
      { status: 400 }
    );
  }

  // Add timestamp if not provided
  if (!payload.timestamp) {
    payload.timestamp = new Date().toISOString();
  }

  console.log(`🎯 Enqueueing stats job for ${payload.triggeredBy} trigger:`, {
    triggeredBy: payload.triggeredBy,
    matchId: payload.matchId,
    requestId: payload.requestId,
    userId: payload.userId,
    retryOf: payload.retryOf,
    tenantId: payload.tenantId
  });

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing Supabase configuration');
    return NextResponse.json(
      {
        success: false,
        error: 'Server configuration error: Missing Supabase credentials',
        message: 'Internal server error'
      } as EnqueueResponse,
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Insert job into background_job_status table
  const { data, error } = await supabase
    .from('background_job_status')
    .insert({
      job_type: 'stats_update',
      job_payload: payload,
      status: 'queued',
      priority: payload.triggeredBy === 'post-match' ? 2 : 1, // Higher priority for post-match
      retry_count: 0,
      tenant_id: payload.tenantId
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ Failed to enqueue job:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Database error: ${error.message}`,
        message: 'Failed to enqueue job'
      } as EnqueueResponse,
      { status: 500 }
    );
  }

  const jobId = data.id;
  console.log(`✅ Successfully enqueued job ${jobId} for ${payload.triggeredBy} trigger`);

  // Log job details for monitoring
  console.log(`📊 Job ${jobId} details:`, {
    triggeredBy: payload.triggeredBy,
    matchId: payload.matchId || 'N/A',
    requestId: payload.requestId,
    userId: payload.userId || 'system',
    isRetry: !!payload.retryOf,
    priority: payload.triggeredBy === 'post-match' ? 2 : 1
  });

  return NextResponse.json({
    success: true,
    jobId,
    message: `Stats update job successfully enqueued for ${payload.triggeredBy} trigger`
  } as EnqueueResponse);
}

// Health check endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'enqueue-stats-job',
    timestamp: new Date().toISOString(),
    supportedTriggers: ['post-match', 'admin', 'cron']
  });
}
