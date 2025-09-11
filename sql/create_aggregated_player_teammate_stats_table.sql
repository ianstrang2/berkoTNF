-- sql/create_aggregated_player_teammate_stats_table.sql
-- Create new table for teammate chemistry stats and migrate existing data
-- Part of the player profile stats refactor to resolve PostgREST timeout issues

-- Step 1: Create the new table
CREATE TABLE IF NOT EXISTS public.aggregated_player_teammate_stats (
    player_id INTEGER PRIMARY KEY,
    teammate_chemistry_all JSONB DEFAULT '[]'::jsonb,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

-- Note: PRIMARY KEY on player_id automatically creates an index, no additional index needed

-- Step 2: Migrate existing data with fresh timestamp
INSERT INTO public.aggregated_player_teammate_stats (player_id, teammate_chemistry_all, last_updated)
SELECT player_id, teammate_chemistry_all, NOW()
FROM public.aggregated_player_profile_stats 
WHERE teammate_chemistry_all IS NOT NULL
ON CONFLICT (player_id) DO UPDATE SET
    teammate_chemistry_all = EXCLUDED.teammate_chemistry_all,
    last_updated = EXCLUDED.last_updated;

-- Step 3: Remove the teammate column from the original table
-- NOTE: This step should be run AFTER confirming the new system works
-- ALTER TABLE public.aggregated_player_profile_stats DROP COLUMN IF EXISTS teammate_chemistry_all;

-- Success message (as SQL comment since RAISE NOTICE requires function context)
-- Successfully created aggregated_player_teammate_stats table and migrated existing data
