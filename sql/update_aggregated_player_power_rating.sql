-- sql/update_aggregated_player_power_rating.sql
-- Function to calculate and update player power ratings.

CREATE OR REPLACE FUNCTION update_aggregated_player_power_rating()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Configuration for power rating calculation
    HALF_LIFE_DAYS NUMERIC := 180.0; -- Time for a game's weight to decay by 50%
    PRIOR_WEIGHT NUMERIC := 10.0;   -- Weight of the prior (league mean) in Bayesian shrinkage
    inserted_count INTEGER;

BEGIN
    RAISE NOTICE 'Starting update_aggregated_player_power_rating...';
    RAISE NOTICE 'Using: Half-life = % days, Prior Weight = %', HALF_LIFE_DAYS, PRIOR_WEIGHT;

    -- 1. Create the target table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.aggregated_player_power_ratings (
        player_id INT PRIMARY KEY REFERENCES public.players(player_id),
        rating NUMERIC NOT NULL,
        variance NUMERIC NOT NULL,
        effective_games NUMERIC NOT NULL,
        goal_threat       NUMERIC,
        defensive_shield  NUMERIC,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
    RAISE NOTICE 'Ensured aggregated_player_power_ratings table exists.';

    -- 2. Calculate power ratings using CTEs
    WITH
    -- Calculate fantasy points for each match for active, non-ringer players
    MatchPerformance AS (
        SELECT
            pm.player_id,
            m.match_date,
            -- Use the centralized helper to calculate fantasy points
            calculate_match_fantasy_points(
                pm.result,
                pm.heavy_win,
                pm.heavy_loss,
                pm.clean_sheet
            ) AS fantasy_points,
            COALESCE(pm.goals,0) AS goals_scored,
            CASE 
                WHEN pm.team = 'A' THEN m.team_b_score
                WHEN pm.team = 'B' THEN m.team_a_score
                ELSE 0 -- Should not happen if team is always A or B
            END AS goals_conceded
        FROM
            public.player_matches pm
        JOIN
            public.matches m ON pm.match_id = m.match_id -- Corrected join to m.match_id
        JOIN
            public.players p ON pm.player_id = p.player_id
        WHERE
            m.match_date IS NOT NULL -- keep this guard
    ),
    -- Apply time decay weighting to each match's fantasy points
    WeightedPerformance AS (
        SELECT
            player_id,
            match_date,
            fantasy_points,
            goals_scored,
            goals_conceded,
            -- Calculate age_days: difference between current date and match date.
            -- Ensure age_days is not negative (for matches scheduled in the future, though unlikely here).
            GREATEST(0, (CURRENT_DATE - match_date)) AS age_days,
            -- Calculate weight: w = 2 ^ (-age_days / half_life)
            POWER(
                2,
                -( GREATEST(0, (CURRENT_DATE - match_date))::NUMERIC / HALF_LIFE_DAYS )
            ) AS weight
        FROM
            MatchPerformance
    ),
    -- Calculate the global league average fantasy points (time-decayed)
    LeagueStats AS (
        SELECT
            SUM(wp.weight * wp.fantasy_points) AS total_weighted_fantasy_points,
            SUM(wp.weight) AS total_weights,
            -- league_mean = Σ_all_players (w * fantasy_points) / Σ_all_players w
            CASE
                WHEN SUM(wp.weight) > 0 THEN SUM(wp.weight * wp.fantasy_points) / SUM(wp.weight)
                ELSE 0 -- Default league_mean to 0 if no weighted games (e.g., empty db)
            END AS league_mean_fantasy_points,
            SUM(wp.weight*goals_conceded)
            / NULLIF(SUM(wp.weight), 0) AS league_avg_gc
        FROM
            WeightedPerformance wp
    ),
    -- Aggregate weighted fantasy points per player
    PlayerAggregates AS (
        SELECT
            wp.player_id,
            SUM(wp.weight * wp.fantasy_points) AS sum_weighted_fantasy_points, -- This is 'num' in the formula
            SUM(wp.weight) AS sum_player_weights, -- This is 'den' in the formula (effective_games)
            SUM(wp.weight*goals_scored)   AS sum_w_goals,
            SUM(wp.weight*goals_conceded) AS sum_w_gc
        FROM
            WeightedPerformance wp
        GROUP BY
            wp.player_id
    ),
    -- Calculate final power ratings using Bayesian shrinkage
    FinalRatings AS (
        SELECT
            p.player_id,
            COALESCE(pa.sum_player_weights, 0)                       AS effective_games,
            ( COALESCE(pa.sum_weighted_fantasy_points, 0)
                + PRIOR_WEIGHT * ls.league_mean_fantasy_points )
            / ( COALESCE(pa.sum_player_weights, 0) + PRIOR_WEIGHT )  AS rating,
            1.0 / ( COALESCE(pa.sum_player_weights, 0) + PRIOR_WEIGHT ) AS variance,
            COALESCE(pa.sum_w_goals,0) / NULLIF(COALESCE(pa.sum_player_weights, 0),0) AS goal_threat,
            1 - (
                  COALESCE(pa.sum_w_gc,0) / NULLIF(COALESCE(pa.sum_player_weights, 0),0)
                ) / NULLIF(ls.league_avg_gc,0) AS defensive_shield
        FROM public.players            p
        LEFT JOIN PlayerAggregates     pa ON pa.player_id = p.player_id,
             LeagueStats               ls   -- cross-join, single row
    )
    -- 3. Upsert the calculated ratings into the aggregated table
    INSERT INTO public.aggregated_player_power_ratings (
        player_id,
        rating,
        variance,
        effective_games,
        goal_threat,
        defensive_shield,
        updated_at
    )
    SELECT
        fr.player_id,
        fr.rating,
        fr.variance,
        fr.effective_games,
        fr.goal_threat,
        fr.defensive_shield,
        NOW() -- Use current timestamp for updated_at
    FROM
        FinalRatings fr
    ON CONFLICT (player_id) DO UPDATE SET
        rating = EXCLUDED.rating,
        variance = EXCLUDED.variance,
        effective_games = EXCLUDED.effective_games,
        goal_threat = EXCLUDED.goal_threat,
        defensive_shield = EXCLUDED.defensive_shield,
        updated_at = NOW();

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'Upserted % rows into aggregated_player_power_ratings.', inserted_count;

    -- Update Cache Metadata for player power ratings
    RAISE NOTICE 'Updating player_power_ratings cache metadata...';
    INSERT INTO public.cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('player_power_ratings', NOW(), 'player_power_ratings')
    ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();

    RAISE NOTICE 'update_aggregated_player_power_rating completed.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_aggregated_player_power_rating: %', SQLERRM;
END;
$$;

-- Ensure the helper function calculate_match_fantasy_points is available.
-- It is defined in sql/helpers.sql and should be deployed/available in the DB. 