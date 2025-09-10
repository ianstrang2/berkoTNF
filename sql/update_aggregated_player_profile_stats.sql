-- sql/update_aggregated_player_profile_stats.sql
-- Backward compatibility wrapper for existing Edge functions and background worker
-- Now calls the optimized wrapper function for improved performance
CREATE OR REPLACE FUNCTION update_aggregated_player_profile_stats()
RETURNS VOID LANGUAGE sql AS $$
    -- Call the new optimized wrapper function
    SELECT update_aggregated_player_profile_stats_all();
$$;