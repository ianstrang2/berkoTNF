-- Phase 1: Add Own Goals Columns to Matches Table
-- Copy and paste this into Supabase SQL Editor

-- Add own goals columns to matches table
ALTER TABLE matches 
ADD COLUMN team_a_own_goals INTEGER DEFAULT 0,
ADD COLUMN team_b_own_goals INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN matches.team_a_own_goals IS 'Own goals scored by Team A (added to their total score)';
COMMENT ON COLUMN matches.team_b_own_goals IS 'Own goals scored by Team B (added to their total score)';

-- Add constraints to ensure non-negative values
ALTER TABLE matches 
ADD CONSTRAINT check_team_a_own_goals_non_negative CHECK (team_a_own_goals >= 0),
ADD CONSTRAINT check_team_b_own_goals_non_negative CHECK (team_b_own_goals >= 0);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND column_name IN ('team_a_own_goals', 'team_b_own_goals')
ORDER BY column_name; 