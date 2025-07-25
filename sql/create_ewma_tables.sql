-- Create EWMA Performance Rating Tables
-- Based on prisma/schema.prisma aggregated_performance_ratings model

BEGIN;

-- Create the main EWMA performance ratings table
CREATE TABLE IF NOT EXISTS aggregated_performance_ratings (
    player_id INTEGER PRIMARY KEY,
    
    -- Raw weighted metrics (for team balancing)
    power_rating DECIMAL(10,3) NOT NULL,
    goal_threat DECIMAL(10,3) NOT NULL,
    participation DECIMAL(5,1) NOT NULL,
    
    -- Qualification data
    weighted_played DECIMAL(10,3) NOT NULL,
    weighted_available DECIMAL(10,3) NOT NULL,
    is_qualified BOOLEAN NOT NULL,
    
    -- Percentiles (for display)
    power_percentile DECIMAL(5,1) DEFAULT 50,
    goal_percentile DECIMAL(5,1) DEFAULT 50,
    participation_percentile DECIMAL(5,1) DEFAULT 50,
    
    -- Metadata
    first_match_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_ratings_power_desc 
ON aggregated_performance_ratings(power_rating DESC);

CREATE INDEX IF NOT EXISTS idx_performance_ratings_qualified 
ON aggregated_performance_ratings(is_qualified, power_rating DESC);

-- Add app_config entries for EWMA settings if they don't exist
INSERT INTO app_config (config_key, config_value, config_description, config_group) VALUES
('performance_half_life_days', '730', 'EWMA half-life in days (365=1yr, 730=2yr, 1095=3yr)', 'performance'),
('performance_qualification_threshold', '5', 'Minimum weighted games for percentile display', 'performance')
ON CONFLICT (config_key) DO NOTHING;

COMMIT; 