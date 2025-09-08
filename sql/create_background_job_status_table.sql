-- Background Job Status Table
-- This table tracks all background job executions across the system

CREATE TABLE IF NOT EXISTS background_job_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL DEFAULT 'stats_update',
    job_payload JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')) DEFAULT 'queued',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    priority INTEGER DEFAULT 1,
    tenant_id UUID, -- Nullable; placeholder for future multi-tenancy
    error_message TEXT,
    results JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_background_job_status_created_at ON background_job_status(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_background_job_status_status ON background_job_status(status);
CREATE INDEX IF NOT EXISTS idx_background_job_status_job_type ON background_job_status(job_type);
CREATE INDEX IF NOT EXISTS idx_background_job_status_tenant_id ON background_job_status(tenant_id);

-- Trigger to automatically update updated_at timestamp
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

-- RLS (Row Level Security) setup for future multi-tenancy
ALTER TABLE background_job_status ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (can be restricted later)
CREATE POLICY "Allow all operations on background_job_status" ON background_job_status
    FOR ALL USING (true);

-- Comment for documentation
COMMENT ON TABLE background_job_status IS 'Tracks status and execution details of background jobs across the system';
COMMENT ON COLUMN background_job_status.job_payload IS 'JSON payload containing job parameters like triggeredBy, matchId, requestId, userId';
COMMENT ON COLUMN background_job_status.results IS 'JSON results from job execution including function results and timing data';
COMMENT ON COLUMN background_job_status.retry_count IS 'Number of retry attempts for this job';
COMMENT ON COLUMN background_job_status.priority IS 'Job priority (higher numbers = higher priority)';
COMMENT ON COLUMN background_job_status.tenant_id IS 'Future multi-tenancy support - currently unused';
