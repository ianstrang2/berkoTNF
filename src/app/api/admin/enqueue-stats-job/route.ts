/**
 * Unified endpoint for enqueueing stats update jobs
 * Used by all three trigger points: post-match, admin, cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface StatsUpdateJobPayload {
  triggeredBy: 'post-match' | 'admin' | 'cron';
  matchId?: number;
  timestamp?: string;
  requestId: string;
  userId?: string;
  retryOf?: string;
}

interface EnqueueResponse {
  success: boolean;
  jobId?: string;
  message: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('📥 Stats job enqueue request received');

  try {
    // Parse request body
    const payload: StatsUpdateJobPayload = await request.json();
    
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
      retryOf: payload.retryOf
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
        retry_count: 0
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

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('🚨 Enqueue endpoint error:', error);

    return NextResponse.json(
      {
        success: false,
        error: `Server error: ${errorMessage}`,
        message: 'Failed to process enqueue request'
      } as EnqueueResponse,
      { status: 500 }
    );
  }
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
