# Background Jobs Specification

**Version:** 1.0  
**Last Updated:** November 26, 2025  
**Status:** ✅ Production Complete

---

## Overview

Unified background job system for stats updates, replacing sequential edge functions with parallel queue-based processing.

**Key Benefits:**
- **Parallel processing:** 30-60 seconds (vs 45+ sequential)
- **Non-blocking:** Immediate API response
- **Unified system:** Single code path for all triggers
- **Robust retries:** Automatic failure recovery
- **Real-time monitoring:** Job status tracking

**Triggers:**
1. Post-match completion (automatic)
2. Admin button (manual)
3. Nightly cron job (scheduled)

---

## Current Architecture

### Job Flow

```
Trigger → Enqueue Job → Immediate Response (< 1s)
              ↓
Background Worker → Process Stats (parallel) → Cache Invalidation → Update Status
```

**Previous (Edge Functions):**
```
Trigger → Sequential Edge Functions → 45+ seconds
```

### Stats Functions Processed (10 total)

```typescript
const STATS_FUNCTIONS = [
  'update_half_and_full_season_stats',
  'update_aggregated_all_time_stats',
  'update_aggregated_hall_of_fame',
  'update_aggregated_recent_performance',
  'update_aggregated_season_honours_and_records',
  'update_aggregated_match_report_cache',
  'update_aggregated_personal_bests',
  'update_aggregated_player_profile_stats',
  'update_aggregated_season_race_data',
  'update_power_ratings'
];
```

**All execute in parallel** (no dependencies)

---

## Database Schema

### background_job_status table

```typescript
id: UUID                    // PK
tenant_id: UUID             // Multi-tenancy
job_type: string            // 'stats_update'
job_payload: JSONB          // { triggeredBy, matchId?, tenantId, requestId }
status: enum                // 'queued' | 'processing' | 'completed' | 'failed'
started_at: DateTime | null
completed_at: DateTime | null
error_message: string | null
results: JSONB | null       // Function results summary
retry_count: number         // Current retry attempt
max_retries: number         // Maximum retries (default: 3)
priority: number            // Job priority (default: 0)
created_at: DateTime
updated_at: DateTime
```

**Indexes:**
- `idx_background_job_status_created_at` - Job history queries
- `idx_background_job_status_status` - Active job filtering
- `idx_background_job_status_priority` - Priority queue

---

## API Endpoints

### Enqueue Job

**`POST /api/admin/enqueue-stats-job`**

**Request:**
```typescript
{
  triggeredBy: 'post-match' | 'admin' | 'cron',
  matchId?: number,     // Only for post-match
  tenantId: string,
  requestId: string     // Correlation ID
}
```

**Response:**
```typescript
{
  success: true,
  jobId: string,
  status: 'queued'
}
```

**Process:**
1. Validate request
2. Create job record in database
3. Return immediately
4. Worker picks up job asynchronously

### Cache Invalidation

**`POST /api/internal/cache/invalidate`**

**Purpose:** Internal endpoint for worker to trigger Next.js cache revalidation

**Security:** API key authentication

**Request:**
```typescript
{
  tags: string[],      // Cache tags to invalidate
  apiKey: string       // Internal API key
}
```

**Process:**
```typescript
tags.forEach(tag => revalidateTag(tag));
```

**Cache Tags:**
- `season_stats`, `half_season_stats`
- `all_time_stats`, `hall_of_fame`
- `recent_performance`, `honour_roll`
- `match_report`, `personal_bests`
- `player_profile_stats`, `season_race_data`
- `player_power_rating`, `player_teammate_stats`

---

## Worker Infrastructure

**Location:** `/worker/` - Standalone Node.js service

**Structure:**
```
/worker/
├── src/
│   ├── jobs/
│   │   └── statsUpdateJob.ts        # Main job processor
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client
│   │   ├── cache.ts                 # Cache invalidation
│   │   └── statsProcessor.ts        # Parallel execution
│   ├── types/
│   │   └── jobTypes.ts              # TypeScript types
│   └── index.ts                     # Worker entry point
├── package.json
└── README.md                         # Deployment guide
```

**Deployment:** Render.com (production-ready)

**Process:**
1. Poll `background_job_status` table for queued jobs
2. Update status to 'processing'
3. Execute all 10 SQL functions in parallel
4. Call cache invalidation endpoint
5. Update status to 'completed' or 'failed'
6. Retry on failure (max 3 attempts)

---

## Feature Flags

**Configuration:** `src/config/feature-flags.ts`

```typescript
// Master switch
USE_BG_JOBS_GLOBAL=true

// Per-trigger controls
USE_BG_JOBS_ADMIN=true   // Admin button
USE_BG_JOBS_CRON=true    // Nightly cron
USE_BG_JOBS_MATCH=true   // Post-match

// Check function
shouldUseBgJobs(trigger): boolean
```

**Fallback:** Automatically uses edge functions if disabled

---

## Trigger Integration

### 1. Post-Match Trigger

**File:** `src/hooks/useMatchState.hook.ts`

```typescript
// After match completion
fetch('/api/admin/enqueue-stats-job', { 
  method: 'POST',
  body: JSON.stringify({ 
    triggeredBy: 'post-match',
    matchId: matchData.id,
    tenantId: tenantId,
    requestId: crypto.randomUUID()
  })
}).catch(err => console.warn('Stats job failed:', err));
```

**Non-blocking:** User sees immediate completion, stats update in background

### 2. Admin Button Trigger

**File:** `src/app/admin/info/page.tsx`

```typescript
const handleUpdateStats = async () => {
  const response = await fetch('/api/admin/enqueue-stats-job', {
    method: 'POST',
    body: JSON.stringify({
      triggeredBy: 'admin',
      tenantId: currentTenantId,
      requestId: crypto.randomUUID()
    })
  });
  
  if (response.ok) {
    showToast('Stats update queued', 'success');
  }
};
```

### 3. Cron Job Trigger

**File:** `vercel.json`

```json
{
  "crons": [{
    "path": "/api/admin/trigger-stats-update",
    "schedule": "0 2 * * *"
  }]
}
```

**Nightly:** 2 AM UTC  
**Process:** Forwards to enqueue endpoint

---

## Admin UI Integration

**Location:** Bottom of `/admin/info` page

**Features:**
- Job history (last 10 jobs)
- Status indicators (color-coded)
- Duration tracking
- Retry button for failed jobs
- Auto-refresh every 30s if active jobs

**Job Status Display:**

| Status | Color | Description |
|--------|-------|-------------|
| queued | Yellow | Waiting to process |
| processing | Blue | Currently running |
| completed | Green | Finished successfully |
| failed | Red | Error occurred |

**Duration Calculation:**
```typescript
duration = completed_at - started_at
// Typical: 30-60 seconds
```

---

## Performance

**Processing Times:**
- **Job enqueue:** < 100ms
- **Queue latency:** < 5 seconds
- **Stats processing:** 30-60 seconds (parallel)
- **Cache invalidation:** < 2 seconds

**Reliability:**
- **Success rate:** > 99%
- **Automatic retries:** 3 attempts
- **Graceful degradation:** Falls back to edge functions if needed

**User Experience:**
- Match completion: Instant feedback
- Stats available: Within 60 seconds
- No blocking operations

---

## Monitoring

### Key Metrics

**Job Metrics:**
- Jobs queued per day
- Average processing time
- Success/failure rate
- Retry frequency

**Performance:**
- Time to complete (target: < 60s)
- Queue depth (target: < 5 jobs)
- Cache invalidation latency

### Logging

**Structured format:**
```json
{
  "timestamp": "2025-11-26T10:30:00Z",
  "level": "INFO",
  "event": "job_completed",
  "job_id": "uuid",
  "tenant_id": "uuid",
  "duration_ms": 45000,
  "triggered_by": "post-match"
}
```

---

## Deployment

**Worker Service (Render.com):**

1. **Create Web Service**
   - Repository: Connect GitHub
   - Build: `cd worker && npm install && npm run build`
   - Start: `cd worker && npm start`

2. **Environment Variables:**
   ```bash
   DATABASE_URL=postgresql://...
   SUPABASE_URL=https://...
   SUPABASE_SERVICE_ROLE_KEY=...
   INTERNAL_API_KEY=...
   NEXT_PUBLIC_APP_URL=https://app.caposport.com
   ```

3. **Health Check:**
   - Path: `/health`
   - Expected: `{ status: 'ok' }`

**See:** `worker/README.md` for complete deployment guide

---

## Error Handling

**Job Failures:**
- Automatic retry (up to 3 attempts)
- Exponential backoff between retries
- Error message logged in database
- Admin can manually retry via UI

**Partial Failures:**
- If 1 function fails, others still complete
- Results JSONB tracks per-function status
- Cache invalidation proceeds for successful functions

**Cache Invalidation Failures:**
- Non-blocking (stats still updated)
- Logged for monitoring
- Next request will trigger cache rebuild

---

## Migration from Edge Functions

**Status:** ✅ Complete

**What Changed:**
- 11 edge functions → 1 worker service
- Sequential → Parallel processing
- ~1,200 lines of duplicated code → ~400 lines unified
- Complex deployment → Simple Render deployment

**Backward Compatibility:**
- Feature flags allow gradual rollout
- Edge functions kept as fallback
- No breaking changes to UI

**Cleanup:**
- Edge functions deprecated but not deleted (emergency fallback)
- Deploy script updated to skip edge functions

---

**Document Status:** ✅ Production Complete  
**Last Updated:** November 26, 2025  
**Version:** 1.0

**For worker deployment:** See `worker/README.md`  
**For stats functions:** See individual SQL files in `/sql/update_*.sql`
