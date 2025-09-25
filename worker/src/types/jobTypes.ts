/**
 * Type definitions for background job system
 */

export interface StatsUpdateJobPayload {
  triggeredBy: 'post-match' | 'admin' | 'cron';
  matchId?: number; // Only present for post-match triggers
  timestamp: string;
  requestId: string; // For tracking and correlation
  userId?: string; // For admin-triggered jobs (audit trail)
  retryOf?: string; // If this is a retry of another job
  tenantId: string; // Multi-tenant context
}

export interface StatsFunction {
  name: string;
  rpcName: string;
  cacheTags: string[];
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  duration: number;
  error: string | undefined;
}

export interface JobResult {
  function: string;
  status: 'success' | 'failed';
  duration: number;
  error: string | undefined;
}

export interface BackgroundJobStatus {
  id: string;
  job_type: string;
  job_payload: StatsUpdateJobPayload;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  retry_count: number;
  priority: number;
  tenant_id: string | null;
  error_message: string | null;
  results: {
    total_functions: number;
    successful_functions: number;
    failed_functions: number;
    cache_invalidation_success: boolean;
    function_results: JobResult[];
  } | null;
  created_at: string;
  updated_at: string;
}

export interface CacheInvalidationRequest {
  tags: string[];
  source: string;
  requestId: string;
}

export interface CacheInvalidationResponse {
  success: boolean;
  invalidated_tags: string[];
  failed_tags: string[];
  error?: string;
}
