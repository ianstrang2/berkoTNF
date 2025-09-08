# Background Jobs Refactor Plan

## Executive Summary

This plan outlines the refactoring of Supabase edge functions to use background jobs via **Supabase Queues**. **All three trigger points** (post-match updates, admin button, and cron job) will be moved to background processing, completely eliminating the need for edge functions.

## Current Architecture Analysis

### Edge Functions Structure
- **Location**: `/supabase/functions/`
- **Count**: 11 edge functions (10 stats + 1 profile generator)
- **Pattern**: All follow identical structure - call a single SQL RPC function
- **Shared Logic**: Each function has ~109 lines of boilerplate code with minimal differences

### Trigger Points (ALL TARGETS FOR REFACTOR)
1. **Post-Match Update**: `useMatchState.hook.ts` line 180
2. **Admin Button**: `/admin/info` page - manual trigger
3. **Cron Job**: Nightly via Vercel cron

### Current Flow
```
All Triggers → API Call → trigger-stats-update → Sequential Edge Functions → SQL RPCs → Cache Invalidation
```

### Dependencies & Execution Order
- **No execution dependencies** (EWMA system removed order requirements)
- **Cache tags**: Each function maps to specific cache invalidation tags
- **Error handling**: Retry logic (3 attempts) with graceful degradation

## Proposed Architecture

### New Unified Flow (All Triggers)
```
Any Trigger → API Call → Enqueue Background Job → Immediate Response
                                    ↓
Background Worker → Process All Stats → Cache Invalidation → Update Job Status
```

### Benefits of Unified Approach
- **Consistency**: All triggers use identical processing logic
- **Simplicity**: Single code path to maintain and debug
- **Performance**: Parallel processing for all scenarios
- **Monitoring**: Unified job tracking and status reporting
- **Scalability**: Queue-based processing handles load spikes
- **Edge Function Elimination**: No more Supabase function deployments needed

## Implementation Plan

### Phase 1: Infrastructure Setup

#### 1.1 Create Worker Directory Structure
```
/worker/
├── src/
│   ├── jobs/
│   │   └── statsUpdateJob.ts        # Main job processor
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client setup
│   │   ├── cache.ts                 # Cache invalidation logic
│   │   └── statsProcessor.ts        # Core stats processing logic
│   ├── types/
│   │   └── jobTypes.ts              # Job payload types
│   └── index.ts                     # Worker entry point
├── package.json                     # Worker dependencies
├── tsconfig.json                    # TypeScript config
└── README.md                        # Worker setup instructions
```

#### 1.2 Create Shared Logic Library
**File**: `/worker/src/lib/statsProcessor.ts`
```typescript
/**
 * Shared stats processing logic extracted from edge functions
 * This replaces the duplicated boilerplate across all edge functions
 */

export interface StatsFunction {
  name: string;
  rpcName: string;
  cacheTags: string[];
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  duration: number;
  error?: string;
}

export const STATS_FUNCTIONS: StatsFunction[] = [
  { name: 'call-update-half-and-full-season-stats', rpcName: 'update_half_and_full_season_stats', cacheTags: ['season_stats', 'half_season_stats'] },
  { name: 'call-update-all-time-stats', rpcName: 'update_aggregated_all_time_stats', cacheTags: ['all_time_stats'] },
  { name: 'call-update-hall-of-fame', rpcName: 'update_aggregated_hall_of_fame', cacheTags: ['hall_of_fame'] },
  { name: 'call-update-recent-performance', rpcName: 'update_aggregated_recent_performance', cacheTags: ['recent_performance'] },
  { name: 'call-update-season-honours-and-records', rpcName: 'update_aggregated_season_honours_and_records', cacheTags: ['honour_roll'] },
  { name: 'call-update-match-report-cache', rpcName: 'update_aggregated_match_report_cache', cacheTags: ['match_report'] },
  { name: 'call-update-personal-bests', rpcName: 'update_aggregated_personal_bests', cacheTags: ['personal_bests'] },
  { name: 'call-update-player-profile-stats', rpcName: 'update_aggregated_player_profile_stats', cacheTags: ['player_profile_stats'] },
  { name: 'call-update-season-race-data', rpcName: 'update_aggregated_season_race_data', cacheTags: ['season_race_data'] },
  { name: 'call-update-power-ratings', rpcName: 'update_power_ratings', cacheTags: ['player_power_rating'] }
];

export async function processStatsFunction(
  supabase: SupabaseClient,
  statsFunction: StatsFunction
): Promise<ProcessingResult> {
  // Implementation mirrors existing edge function logic
  // with enhanced error handling and metrics
}
```

### Phase 2: Background Job Implementation

#### 2.1 Job Queue Setup
**File**: `/worker/src/jobs/statsUpdateJob.ts`
```typescript
/**
 * Background job processor for stats updates
 * Processes all stats functions and handles cache invalidation
 */

export interface StatsUpdateJobPayload {
  triggeredBy: 'post-match' | 'admin' | 'cron';
  matchId?: number; // Only present for post-match triggers
  timestamp: string;
  requestId: string; // For tracking and correlation
  userId?: string; // For admin-triggered jobs (audit trail)
}

export async function processStatsUpdateJob(payload: StatsUpdateJobPayload) {
  // 1. Process all stats functions in parallel (no dependencies)
  // 2. Handle cache invalidation via API calls back to Next.js
  // 3. Update job status in database
  // 4. Send completion notification if needed
}
```

#### 2.2 Cache Invalidation Strategy
**Challenge**: Background worker cannot directly call Next.js `revalidateTag()`
**Solution**: HTTP endpoint for cache invalidation

**New API Route**: `/api/internal/cache/invalidate`
```typescript
// Internal endpoint for cache invalidation from background workers
export async function POST(request: Request) {
  // Verify internal request (API key or internal token)
  // Accept array of cache tags to invalidate
  // Call revalidateTag() for each tag
  // Return success/failure status
}
```

### Phase 3: API Route Modifications

#### 3.1 Update Post-Match Flow
**File**: `src/hooks/useMatchState.hook.ts`
**Current** (lines 179-181):
```typescript
// ✅ Trigger stats in background (non-blocking)
fetch('/api/admin/trigger-stats-update', { method: 'POST' })
  .catch(err => console.warn('Stats update failed:', err));
```

**New**:
```typescript
// ✅ Enqueue background job (non-blocking)
fetch('/api/admin/enqueue-stats-job', { 
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    triggeredBy: 'post-match',
    matchId: matchData?.id,
    requestId: crypto.randomUUID()
  })
}).catch(err => console.warn('Stats job enqueue failed:', err));
```

#### 3.2 Update Admin Button Flow
**File**: `src/app/admin/info/page.tsx`
**Current** `handleUpdateStats` function (lines 329-379):
```typescript
const response = await fetch('/api/admin/trigger-stats-update', {
  method: 'POST',
});
```

**New**:
```typescript
const response = await fetch('/api/admin/enqueue-stats-job', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    triggeredBy: 'admin',
    requestId: crypto.randomUUID(),
    userId: 'admin' // Or get from auth context
  })
});
```

#### 3.3 Update Cron Job Flow
**File**: `src/app/api/admin/trigger-stats-update/route.ts`
**Transform existing GET handler**:
```typescript
// GET handler for Vercel cron jobs
export async function GET() {
  console.log('🕐 Scheduled stats update triggered');
  
  // Enqueue job instead of processing directly
  const jobPayload = {
    triggeredBy: 'cron' as const,
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };

  // Forward to enqueue endpoint
  return fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/enqueue-stats-job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobPayload)
  });
}
```

#### 3.4 New Unified Enqueue Endpoint
**File**: `/api/admin/enqueue-stats-job/route.ts`
```typescript
/**
 * Unified endpoint for enqueueing stats update jobs
 * Used by all three trigger points: post-match, admin, cron
 */
export async function POST(request: Request) {
  // 1. Validate request payload
  // 2. Enqueue job via Supabase Queues
  // 3. Return immediately with job ID and status
  // 4. Log enqueue success/failure with trigger context
}
```

#### 3.5 Remove/Deprecate Edge Function Route
**File**: `src/app/api/admin/trigger-stats-update/route.ts`
**Status**: **DEPRECATED** - Replace POST handler, keep GET for cron compatibility
- POST handler removed (replaced by enqueue endpoint)
- GET handler forwards to enqueue endpoint
- All edge function invocation logic removed

### Phase 4: User Experience Considerations

#### 4.1 Match Completion Modal
**File**: `src/components/team/modals/MatchCompletedModal.component.tsx`
**Current Message**: "Stats will recalculate in ~45 seconds"
**New Message**: "Stats will recalculate in ~60 seconds"
**Rationale**: Background job may take slightly longer due to queue processing

#### 4.2 Admin Info Page
**File**: `src/app/admin/info/page.tsx`
**Changes Required**:
- Update button messaging to reflect job queuing
- Modify success/failure handling for async job processing
- Add job status polling for real-time updates
- Enhanced error handling for job enqueue failures

**New Button States**:
- "Enqueue Stats Job" (default)
- "Job Queued..." (immediate after click)
- "Processing..." (when job starts)
- "Completed" (when job finishes)
- "Failed" (if job fails)

#### 4.3 Background Job Status Section
**New Section**: Add to bottom of `/admin/info` page
**Title**: "Background Job Status"
**Data Source**: `background_job_status` table via Supabase client

**Table Columns**:
- **Trigger Source**: `post-match`, `admin`, `cron`
- **Job Status**: `queued`, `processing`, `completed`, `failed` (color-coded)
- **Started At**: Formatted timestamp
- **Completed At**: Formatted timestamp (if available)
- **Duration**: Calculated from start/completion times
- **Actions**: Retry button for failed jobs

**Implementation Details**:
- Use existing admin/info table styling and component structure
- Fetch via `supabase.from('background_job_status').select().order('created_at', { ascending: false }).limit(10)`
- Loading spinner during data fetch
- Empty state for no jobs
- Auto-refresh every 30 seconds when jobs are active
- Status color coding: `queued` (yellow), `processing` (blue), `completed` (green), `failed` (red)

### Phase 5: Monitoring & Observability

#### 5.1 Job Status Tracking
**New Database Table**: `background_job_status`
```sql
CREATE TABLE background_job_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL DEFAULT 'stats_update',
  job_payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying by status and creation time
CREATE INDEX idx_background_job_status_created_at ON background_job_status(created_at DESC);
CREATE INDEX idx_background_job_status_status ON background_job_status(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_background_job_status_updated_at 
    BEFORE UPDATE ON background_job_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 5.2 Background Job Status UI Implementation
**File**: `src/app/admin/info/page.tsx`

**New State Variables**:
```typescript
const [jobStatusData, setJobStatusData] = useState<BackgroundJobStatus[]>([]);
const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(true);
const [jobError, setJobError] = useState<string | null>(null);
```

**New Interface**:
```typescript
interface BackgroundJobStatus {
  id: string;
  job_type: string;
  job_payload: {
    triggeredBy: 'post-match' | 'admin' | 'cron';
    matchId?: number;
    requestId: string;
    userId?: string;
  };
  status: 'queued' | 'processing' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}
```

**Fetch Function**:
```typescript
const fetchJobStatus = useCallback(async () => {
  setIsLoadingJobs(true);
  setJobError(null);
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('background_job_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    setJobStatusData(data || []);
  } catch (err: any) {
    console.error('Error fetching job status:', err);
    setJobError(err.message);
  } finally {
    setIsLoadingJobs(false);
  }
}, []);
```

**Retry Function**:
```typescript
const handleRetryJob = async (jobId: string) => {
  try {
    // Re-enqueue the failed job
    const response = await fetch('/api/admin/enqueue-stats-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        triggeredBy: 'admin',
        requestId: crypto.randomUUID(),
        userId: 'admin',
        retryOf: jobId
      })
    });
    
    if (!response.ok) throw new Error('Failed to retry job');
    
    // Refresh job status
    await fetchJobStatus();
    showToast('Job retry queued successfully', 'success');
  } catch (err: any) {
    showToast(`Failed to retry job: ${err.message}`, 'error');
  }
};
```

**Status Color Function**:
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'queued': return 'text-yellow-600 bg-yellow-100';
    case 'processing': return 'text-blue-600 bg-blue-100';
    case 'completed': return 'text-green-600 bg-green-100';
    case 'failed': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};
```

**Duration Calculation**:
```typescript
const calculateDuration = (startedAt: string | null, completedAt: string | null) => {
  if (!startedAt) return 'N/A';
  if (!completedAt) return 'In progress...';
  
  const start = new Date(startedAt);
  const end = new Date(completedAt);
  const durationMs = end.getTime() - start.getTime();
  const durationSeconds = Math.round(durationMs / 1000);
  
  return `${durationSeconds}s`;
};
```

**JSX Section** (add to existing page):
```typescript
{/* Background Job Status Section */}
<ErrorBoundary>
  <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
    <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
      <h3 className="mb-0 text-lg font-semibold text-slate-700">Background Job Status</h3>
    </div>
    <div className="p-4">
      {isLoadingJobs ? (
        <p className="text-center text-sm text-slate-500">Loading job status...</p>
      ) : jobError ? (
        <p className="text-center text-sm text-red-500">Error loading jobs: {jobError}</p>
      ) : jobStatusData.length === 0 ? (
        <p className="text-center text-sm text-slate-500">No background jobs found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-slate-600">Trigger</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-600">Status</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-600">Started</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-600">Completed</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-600">Duration</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobStatusData.map((job) => (
                <tr key={job.id} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-slate-700">
                    <span className="capitalize">{job.job_payload.triggeredBy}</span>
                    {job.job_payload.matchId && (
                      <span className="text-xs text-slate-500 ml-1">
                        (Match {job.job_payload.matchId})
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-600 text-xs">
                    {job.started_at ? format(new Date(job.started_at), 'HH:mm:ss') : 'N/A'}
                  </td>
                  <td className="py-2 px-3 text-slate-600 text-xs">
                    {job.completed_at ? format(new Date(job.completed_at), 'HH:mm:ss') : 'N/A'}
                  </td>
                  <td className="py-2 px-3 text-slate-600 text-xs">
                    {calculateDuration(job.started_at, job.completed_at)}
                  </td>
                  <td className="py-2 px-3">
                    {job.status === 'failed' && (
                      <Button 
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRetryJob(job.id)}
                        className="text-xs px-2 py-1"
                      >
                        Retry
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
</ErrorBoundary>
```

**Auto-refresh Logic**:
```typescript
// Add to useEffect for auto-refresh
useEffect(() => {
  const interval = setInterval(() => {
    // Only auto-refresh if there are active jobs
    const hasActiveJobs = jobStatusData.some(job => 
      job.status === 'queued' || job.status === 'processing'
    );
    
    if (hasActiveJobs) {
      fetchJobStatus();
    }
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
}, [jobStatusData, fetchJobStatus]);
```

#### 5.3 Enhanced Logging
- Structured logging with correlation IDs
- Performance metrics collection
- Error tracking and alerting
- Queue depth monitoring

## Migration Strategy

### Step 1: Development Setup
1. Create `/worker/` directory with basic structure
2. Implement shared stats processing logic
3. Set up local Supabase Queues development
4. Create job processor with comprehensive testing

### Step 2: Background Infrastructure
1. Deploy background worker to Render
2. Set up Supabase Queues in production
3. Create cache invalidation API endpoint
4. Implement job status tracking database

### Step 3: Unified Job System Migration
1. Deploy new unified enqueue endpoint (`/api/admin/enqueue-stats-job`)
2. Update all three trigger points:
   - Post-match: Update `useMatchState.hook.ts`
   - Admin: Update `handleUpdateStats` in admin info page
   - Cron: Update GET handler to forward to enqueue endpoint
3. Remove edge function invocation logic from existing routes
4. Monitor job processing across all trigger types

### Step 4: Edge Function Cleanup
1. **Deprecate all stats edge functions** - no longer needed
2. Update `deploy_all.ps1` to skip edge function deployment
3. Keep functions temporarily for emergency fallback
4. Eventually remove from `/supabase/functions/` directory

### Step 5: Enhanced Monitoring & UX
1. **Background Job Status Section**: Add new table section to `/admin/info` page
   - Implement job status fetching and display
   - Add auto-refresh functionality for active jobs
   - Implement retry functionality for failed jobs
   - Apply consistent styling with existing admin tables
2. **Real-time Updates**: Implement job polling for live status updates
3. **Enhanced Error Handling**: Better user feedback and error messaging
4. **Performance Monitoring**: Job duration tracking and alerting

## Risk Mitigation

### 1. Fallback Strategy
If background jobs fail, provide admin interface to:
- Manually retry failed jobs via re-enqueue
- View detailed job status and error logs
- Emergency direct SQL execution for critical stats
- Temporary edge function restoration if needed

### 2. Gradual Rollout
- Feature flag for background vs direct processing
- A/B testing with percentage of matches
- Quick rollback capability

### 3. Data Consistency
- Ensure cache invalidation happens after successful job completion
- Handle partial failures gracefully
- Maintain audit trail of all processing attempts

## Success Metrics

### Performance
- **Job Processing Time**: Target < 45 seconds (current edge function time)
- **Queue Latency**: < 5 seconds from enqueue to start processing
- **Cache Invalidation**: < 2 seconds after job completion

### Reliability
- **Job Success Rate**: > 99.5%
- **Cache Consistency**: 100% (no stale data)
- **Error Recovery**: Automatic retry with exponential backoff

### User Experience
- **Match Completion**: No perceived change in UX
- **Admin Interface**: Identical functionality preserved
- **Monitoring**: Enhanced visibility into processing status

## Timeline Estimate

- **Week 1**: Infrastructure setup and shared logic extraction
- **Week 2**: Background job implementation and testing
- **Week 3**: API route modifications and cache invalidation
- **Week 4**: Deployment, monitoring, and validation

## Conclusion

This refactor provides a **unified, queue-based architecture** that eliminates edge functions entirely while improving system resilience, consistency, and maintainability. All three trigger points (post-match, admin, cron) benefit from:

- **Consistent Processing**: Single code path for all stats updates
- **Better Performance**: Parallel processing and queue-based scaling
- **Enhanced Monitoring**: Unified job tracking and status reporting
- **Simplified Deployment**: No more edge function management
- **Improved Reliability**: Robust retry mechanisms and error handling

The key insight is that **all triggers benefit from background processing** - there's no need to maintain separate edge function logic when a unified queue system provides superior functionality across the board.
