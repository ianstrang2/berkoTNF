-- Create debug_logs table for tracking function execution and timeouts
CREATE TABLE IF NOT EXISTS debug_logs (
  id SERIAL PRIMARY KEY,
  source TEXT,
  message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying by source and timestamp
CREATE INDEX IF NOT EXISTS idx_debug_logs_source ON debug_logs(source);
CREATE INDEX IF NOT EXISTS idx_debug_logs_timestamp ON debug_logs(timestamp DESC);

-- Comment for documentation
COMMENT ON TABLE debug_logs IS 'Debug logging table for tracking function execution, timeouts, and performance metrics';
