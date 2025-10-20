# Capo Background Worker

A Node.js background worker service that processes stats update jobs using Supabase Queues. This worker replaces the previous edge function system with a more robust, scalable queue-based architecture.

## 🏗️ Architecture Overview

The background worker system consists of:

- **Job Queue**: Supabase Queues for job management
- **Worker Process**: Node.js service that processes jobs in parallel
- **Database Integration**: Direct Supabase client for data operations
- **Cache Invalidation**: HTTP calls back to Next.js for cache management
- **Status Tracking**: Database-backed job status and retry management

## 📋 Prerequisites

- Node.js 18+ 
- Access to Supabase project with Queues enabled
- Environment variables configured (see below)
- Render account for deployment (recommended)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd worker
npm install
```

### 2. Environment Setup

Create a `.env` file in the worker directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Queue Configuration  
QUEUE_NAME=stats-update-queue
WORKER_ID=worker-production-1

# Cache Invalidation (uses NEXT_PUBLIC_APP_URL + endpoint path)
NEXT_PUBLIC_APP_URL=https://your-nextjs-app.vercel.app
INTERNAL_API_KEY=your_internal_api_key

# Optional: Development
NODE_ENV=production
```

### 3. Build and Run Locally

```bash
# Development mode with auto-restart
npm run dev

# Production build and run
npm run build
npm start
```

### 4. Verify Operation

The worker will:
- Connect to Supabase
- Start polling for jobs in the `background_job_status` table
- Process stats functions in parallel
- Update job status in real-time
- Handle cache invalidation

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | ✅ | Your Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key with full access | `eyJhbG...` |
| `QUEUE_NAME` | ❌ | Queue name (defaults to `stats-update-queue`) | `stats-update-queue` |
| `WORKER_ID` | ❌ | Unique worker identifier | `worker-render-1` |
| `NEXT_PUBLIC_APP_URL` | ❌ | Next.js app base URL | `https://app.com` |
| `INTERNAL_API_KEY` | ❌ | API key for cache invalidation | `internal-worker-key` |

### Stats Functions Processed

The worker processes these 10 stats functions in parallel:

1. `update_half_and_full_season_stats` → Cache: `season_stats`, `half_season_stats`
2. `update_aggregated_all_time_stats` → Cache: `all_time_stats`
3. `update_aggregated_hall_of_fame` → Cache: `hall_of_fame`
4. `update_aggregated_recent_performance` → Cache: `recent_performance`
5. `update_aggregated_season_honours_and_records` → Cache: `honour_roll`
6. `update_aggregated_match_report_cache` → Cache: `match_report`
7. `update_aggregated_personal_bests` → Cache: `personal_bests`
8. `update_aggregated_player_profile_stats` → Cache: `player_profile_stats`
9. `update_aggregated_season_race_data` → Cache: `season_race_data`
10. `update_power_ratings` → Cache: `player_power_rating`

## 🚢 Deployment to Render

### 1. Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

**Basic Settings:**
- **Name**: `berkotns-background-worker`
- **Runtime**: `Node`
- **Build Command**: `cd worker && npm install && npm run build`
- **Start Command**: `cd worker && npm start`
- **Instance Type**: `Starter` (can upgrade later)

**Advanced Settings:**
- **Root Directory**: Leave blank (commands handle the path)
- **Auto-Deploy**: `Yes` (deploys on git push)

### 2. Environment Variables in Render

Add these environment variables in the Render dashboard:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
QUEUE_NAME=stats-update-queue
WORKER_ID=worker-render-production
NEXT_PUBLIC_APP_URL=https://your-nextjs-app.vercel.app
INTERNAL_API_KEY=your_internal_api_key
NODE_ENV=production
```

### 3. Deploy

1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Monitor logs for successful startup
4. Verify worker is processing jobs via admin interface

## 🗄️ Database Setup

### Required Table: `background_job_status`

Run this SQL in your Supabase SQL editor:

```sql
-- This should already be created if you ran the migration
-- Located at: /sql/create_background_job_status_table.sql

SELECT COUNT(*) FROM background_job_status; -- Should work if table exists
```

### Required RLS Policies

The worker uses the service role key, so it bypasses RLS. However, the frontend needs read access:

```sql
-- Allow frontend to read job status
CREATE POLICY "Allow read access to background_job_status" ON background_job_status
    FOR SELECT USING (true);
```

## 🎯 Job Processing Flow

### 1. Job Creation
- Jobs are created by the Next.js app via `/api/admin/enqueue-stats-job`
- Initial status: `queued`
- Priority: `2` for post-match, `1` for admin/cron

### 2. Job Processing
1. Worker polls `background_job_status` table every 1 second
2. Picks up jobs with status `queued` (oldest first)
3. Updates status to `processing` with `started_at` timestamp
4. Runs all 10 stats functions in parallel using `Promise.all()`
5. Attempts cache invalidation via HTTP call to Next.js
6. Updates status to `completed` or `failed` with results

### 3. Error Handling
- Individual function failures don't stop other functions
- Cache invalidation failures are retried 3 times
- Job failures increment `retry_count`
- Failed jobs can be manually retried via admin interface

### 4. Status Updates
Jobs progress through these states:
- `queued` → `processing` → `completed`
- `queued` → `processing` → `failed`

## 🔍 Monitoring & Debugging

### Admin Interface
- View job status at `/admin/info` page
- Real-time status updates every 30 seconds
- Retry failed jobs with one click
- Color-coded status indicators

### Logs
```bash
# Render deployment logs
# Available in Render dashboard under "Logs" tab

# Key log messages to monitor:
✅ Supabase client initialized
👂 Worker listening for jobs on queue: stats-update-queue
📥 Received job: [job-id]
🔨 Processing job [job-id] with payload: {...}
⚡ Processing all stats functions in parallel...
✅ Job [job-id] completed successfully in [duration]ms
```

### Health Checks
The worker doesn't expose HTTP endpoints, but you can monitor:
- **Database**: Check for recent `completed` jobs in `background_job_status`
- **Logs**: Look for successful job processing messages
- **Admin UI**: Monitor job completion rates and error patterns

## 🚨 Troubleshooting

### Worker Not Starting
```bash
# Check environment variables
❌ Missing required environment variables: SUPABASE_URL

# Solution: Verify all required env vars are set
```

### Jobs Stuck in "Queued"
```bash
# Check worker logs for polling errors
❌ Error polling for jobs: [error details]

# Common causes:
# 1. Database connection issues
# 2. Table permissions
# 3. Worker process crashed
```

### Cache Invalidation Failures
```bash
❌ All cache invalidation attempts failed

# Check:
# 1. CACHE_INVALIDATION_URL is correct
# 2. INTERNAL_API_KEY matches Next.js app
# 3. Next.js app is accessible from worker
```

### High Memory Usage
```bash
# If worker uses too much memory:
# 1. Check for memory leaks in job processing
# 2. Consider upgrading Render instance type
# 3. Monitor job frequency and batch sizes
```

## 🔄 Migration from Edge Functions

### Feature Flags
The system uses feature flags to control background job usage:

```env
# In Next.js app (.env.local)
USE_BG_JOBS_GLOBAL=true
USE_BG_JOBS_ADMIN=true
USE_BG_JOBS_CRON=true
USE_BG_JOBS_MATCH=true
```

### Rollback Plan
If issues occur, disable background jobs:
```env
USE_BG_JOBS_GLOBAL=false
```
This reverts all triggers to use the original edge function system.

### Performance Comparison
- **Edge Functions**: ~45 seconds (sequential processing)
- **Background Jobs**: ~30-60 seconds (parallel processing + queue overhead)
- **Reliability**: Significantly improved with retry mechanisms

## 📚 Development

### Project Structure
```
worker/
├── src/
│   ├── jobs/
│   │   └── statsUpdateJob.ts     # Main job processor
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client setup
│   │   ├── cache.ts              # Cache invalidation logic
│   │   └── statsProcessor.ts     # Core stats processing
│   ├── types/
│   │   └── jobTypes.ts           # TypeScript interfaces
│   └── index.ts                  # Worker entry point
├── package.json
├── tsconfig.json
└── README.md
```

### Adding New Stats Functions
1. Add function definition to `STATS_FUNCTIONS` in `statsProcessor.ts`
2. Include appropriate cache tags
3. Redeploy worker

### Local Development
```bash
# Terminal 1: Start Next.js app (for cache invalidation)
cd /path/to/nextjs-app
npm run dev

# Terminal 2: Start worker
cd worker
npm run dev

# Terminal 3: Test job creation
curl -X POST http://localhost:3000/api/admin/enqueue-stats-job \
  -H "Content-Type: application/json" \
  -d '{"triggeredBy":"admin","requestId":"test-123"}'
```

## 🤝 Support

### Getting Help
1. Check worker logs in Render dashboard
2. Monitor job status in admin interface
3. Verify environment variables are correct
4. Test database connectivity

### Manual Operations
```sql
-- View recent jobs
SELECT * FROM background_job_status 
ORDER BY created_at DESC 
LIMIT 10;

-- Retry a failed job (update status to queued)
UPDATE background_job_status 
SET status = 'queued', retry_count = retry_count + 1 
WHERE id = 'job-id-here';

-- Clear old job records (optional cleanup)
DELETE FROM background_job_status 
WHERE created_at < NOW() - INTERVAL '7 days';
```

## 🎉 Success Criteria

Your worker deployment is successful when:

✅ Worker starts without errors  
✅ Jobs are picked up from queue (status: `queued` → `processing`)  
✅ Stats functions execute successfully  
✅ Cache invalidation completes  
✅ Jobs complete with status `completed`  
✅ Admin interface shows job history  
✅ Failed jobs can be retried  
✅ Auto-refresh works for active jobs  

---

**🚀 Ready to deploy!** Follow the steps above and monitor the admin interface to verify everything is working correctly.
