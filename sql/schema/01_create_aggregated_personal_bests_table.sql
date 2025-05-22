CREATE TABLE public.aggregated_personal_bests (
    match_id INTEGER NOT NULL PRIMARY KEY,
    broken_pbs_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_match
        FOREIGN KEY(match_id)
        REFERENCES public.matches(match_id)
        ON DELETE CASCADE
);

COMMENT ON TABLE public.aggregated_personal_bests IS 'Stores personal bests broken by players in a specific match. Each row corresponds to one match.';
COMMENT ON COLUMN public.aggregated_personal_bests.match_id IS 'The ID of the match in which these personal bests were broken. Foreign key to matches table.';
COMMENT ON COLUMN public.aggregated_personal_bests.broken_pbs_data IS 'JSONB object containing players and the personal bests they broke in this match. Format: { "player_id": [{ "metric_type": "...", "value": ..., "previous_best_value": ... }] }.';

-- Trigger to automatically update the updated_at timestamp
-- Create the function if it doesn''t exist, or ensure you have a similar one
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_aggregated_personal_bests_updated_at
BEFORE UPDATE ON public.aggregated_personal_bests
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp(); 