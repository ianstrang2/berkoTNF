-- sql/cleanup_legacy_cache_keys.sql
-- Remove legacy cache keys that are no longer updated by the current system

-- Remove the 'records' cache key (legacy from old updateFeats.ts system)
DELETE FROM cache_metadata WHERE cache_key = 'records';

-- Note: 'upcoming_match' is kept because it's still used by the Match Control Centre
-- It just doesn't get updated during stats runs, which is correct behavior. 