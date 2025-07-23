-- sql/update_power_ratings.sql  (refactored 2025-07-23)
-- Calculates historical 6-month blocks + current trend ratings in one pass
-- Requirements:
--   • dynamic games-played qualifier  (25 % of avg, min 3, max 6)
--   • proper trend projection using REGR_SLOPE
--   • raw values power_rating / goal_threat / participation
--   • percentiles only for display (width_bucket 1-99)
--   • single CTE pipeline – no temp tables, no loops

CREATE OR REPLACE FUNCTION update_power_ratings()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    -------------------------------------------------------------------------
    -- 1.  Period-level raw stats (6-month half-seasons)
    -------------------------------------------------------------------------
    WITH grouped AS (
        SELECT
            pm.player_id,
            EXTRACT(YEAR  FROM m.match_date)::int                        AS yr,
            CASE WHEN EXTRACT(MONTH FROM m.match_date) <= 6 THEN 1 ELSE 2 END AS hf,
            COUNT(*)                                                    AS games_played,
            SUM(calculate_match_fantasy_points(pm.result, pm.heavy_win,
                                               pm.heavy_loss, pm.clean_sheet)) AS total_fantasy_points,
            COUNT(*) FILTER (WHERE COALESCE(pm.goals,0) > 0)            AS total_goals
        FROM player_matches pm
        JOIN matches m   ON m.match_id   = pm.match_id
        JOIN players p   ON p.player_id  = pm.player_id
        WHERE p.is_ringer = false
        GROUP BY pm.player_id, yr, hf
    ),
    period_stats AS (
        SELECT
            g.player_id,
            MAKE_DATE(g.yr, CASE WHEN g.hf = 1 THEN 1 ELSE 7 END, 1)                         AS period_start,
            MAKE_DATE(g.yr, CASE WHEN g.hf = 1 THEN 6 ELSE 12 END,
                      CASE WHEN g.hf = 1 THEN 30 ELSE 31 END)                                AS period_end,
            g.games_played,
            g.total_fantasy_points,
            g.total_goals,
            -- total officially-scheduled games in that half-season
            (
              SELECT COUNT(*) FROM matches mm
              WHERE EXTRACT(YEAR  FROM mm.match_date) = g.yr
                AND (CASE WHEN EXTRACT(MONTH FROM mm.match_date) <= 6 THEN 1 ELSE 2 END) = g.hf
            )                                                                               AS total_games_in_period
        FROM grouped g
    ),
    ---------------------------------------------------------------------
    -- 2.  Dynamic qualification threshold per player
    ---------------------------------------------------------------------
    qual_thresh AS (
        SELECT
            player_id,
            GREATEST(3, LEAST(6, FLOOR(AVG(games_played)::numeric * 0.25))) AS min_games_required
        FROM period_stats
        GROUP BY player_id
    ),
    ---------------------------------------------------------------------
    -- 3.  Rates for qualified periods
    ---------------------------------------------------------------------
    period_rates AS (
            SELECT 
            ps.player_id,
            ps.period_start,
            ps.period_end,
            ps.games_played,
            ps.total_fantasy_points,
            ps.total_goals,
            ps.total_games_in_period,
            CASE WHEN ps.games_played >= qt.min_games_required THEN ROUND(ps.total_fantasy_points::numeric / ps.games_played,2) END AS power_rating,
            CASE WHEN ps.games_played >= qt.min_games_required THEN ROUND(ps.total_goals::numeric   / ps.games_played,3)          END AS goal_threat,
            CASE WHEN ps.games_played >= qt.min_games_required THEN ROUND((ps.games_played::numeric / ps.total_games_in_period)*100)::int END AS participation
        FROM period_stats ps
        JOIN qual_thresh qt ON qt.player_id = ps.player_id
    ),
    ---------------------------------------------------------------------
    -- 4.  Per-period percentiles (for historical blocks)
    ---------------------------------------------------------------------
    period_pct AS (
                SELECT 
            pr.*,
            CASE WHEN MAX(pr.power_rating) OVER (PARTITION BY pr.period_start)
                     = MIN(pr.power_rating) OVER (PARTITION BY pr.period_start)
                 THEN 50
                 ELSE width_bucket(pr.power_rating,
                        MIN(pr.power_rating) OVER (PARTITION BY pr.period_start),
                        MAX(pr.power_rating) OVER (PARTITION BY pr.period_start), 99)::float
            END AS power_rating_pct,
            CASE WHEN MAX(pr.goal_threat) OVER (PARTITION BY pr.period_start)
                     = MIN(pr.goal_threat) OVER (PARTITION BY pr.period_start)
                 THEN 50
                 ELSE width_bucket(pr.goal_threat,
                        MIN(pr.goal_threat) OVER (PARTITION BY pr.period_start),
                        MAX(pr.goal_threat) OVER (PARTITION BY pr.period_start), 99)::float
            END AS goal_threat_pct,
            CASE WHEN MAX(pr.participation) OVER (PARTITION BY pr.period_start)
                     = MIN(pr.participation) OVER (PARTITION BY pr.period_start)
                 THEN 50
                 ELSE width_bucket(pr.participation,
                        MIN(pr.participation) OVER (PARTITION BY pr.period_start),
                        MAX(pr.participation) OVER (PARTITION BY pr.period_start), 99)::float
            END AS participation_pct
        FROM period_rates pr
        WHERE pr.power_rating IS NOT NULL
    ),
    ---------------------------------------------------------------------
    -- 5.  Build historical JSON blocks
    ---------------------------------------------------------------------
    blocks AS (
            SELECT
            player_id,
            jsonb_agg(jsonb_build_object(
                'start_date',               period_start,
                'end_date',                 period_end,
                'games_played',             games_played,
                'power_rating',             power_rating,
                'goal_threat',              goal_threat,
                'participation',            participation,
                'power_rating_percentile',  power_rating_pct,
                'goal_threat_percentile',   goal_threat_pct,
                'participation_percentile', participation_pct,
                'total_fantasy_points',     total_fantasy_points,
                'total_goals',              total_goals
            ) ORDER BY period_end DESC) AS block_json
        FROM period_pct
        GROUP BY player_id
    ),
    ---------------------------------------------------------------------
    -- 6.  Trend calculation (proper regression + 6-month projection)
    ---------------------------------------------------------------------
    trend_core AS (
        SELECT
            player_id,
            REGR_SLOPE(power_rating, EXTRACT(EPOCH FROM period_end)) OVER w_agg       AS rating_slope,
            REGR_SLOPE(goal_threat , EXTRACT(EPOCH FROM period_end)) OVER w_agg       AS threat_slope,
            REGR_SLOPE(participation, EXTRACT(EPOCH FROM period_end)) OVER w_agg      AS part_slope,
            FIRST_VALUE(power_rating)  OVER w_first                               AS latest_rating,
            FIRST_VALUE(goal_threat)   OVER w_first                               AS latest_threat,
            FIRST_VALUE(participation) OVER w_first                               AS latest_part
        FROM period_rates
        WHERE power_rating IS NOT NULL
        WINDOW 
            w_agg AS (PARTITION BY player_id),  -- No ORDER BY: aggregates over entire partition
            w_first AS (PARTITION BY player_id ORDER BY period_end DESC)
    ),
    trend_final AS (
        SELECT DISTINCT ON (player_id)
            player_id,
            latest_rating + rating_slope * 15778463 AS trend_rating,
            latest_threat + threat_slope * 15778463 AS trend_goal_threat,
            latest_part   + part_slope   * 15778463 AS trend_participation
        FROM trend_core
        ORDER BY player_id  -- Make DISTINCT ON deterministic
    ),
    trend_pct AS (
        SELECT
            tf.*,
            CASE WHEN MAX(trend_rating) OVER () = MIN(trend_rating) OVER ()
                 THEN 50
                 ELSE width_bucket(trend_rating,
                        MIN(trend_rating) OVER (),
                        MAX(trend_rating) OVER (), 99)::float END AS power_rating_percentile,
            CASE WHEN MAX(trend_goal_threat) OVER () = MIN(trend_goal_threat) OVER ()
                 THEN 50
                 ELSE width_bucket(trend_goal_threat,
                        MIN(trend_goal_threat) OVER (),
                        MAX(trend_goal_threat) OVER (), 99)::float END AS goal_threat_percentile
        FROM trend_final tf
    ),
    upsert_trends AS (
        INSERT INTO aggregated_player_power_ratings AS apr
               (player_id,
                rating, variance, effective_games,        -- mandatory NOT NULL columns
                trend_rating, trend_goal_threat, trend_participation,
                power_rating_percentile, goal_threat_percentile,
                updated_at)
        SELECT player_id,
                0          AS rating,        -- default base rating for new players
                0          AS variance,
                0          AS effective_games,
                trend_rating, trend_goal_threat, trend_participation,
                power_rating_percentile, goal_threat_percentile,
                NOW()
        FROM trend_pct
        ON CONFLICT (player_id) DO UPDATE
        SET trend_rating            = EXCLUDED.trend_rating,
            trend_goal_threat       = EXCLUDED.trend_goal_threat,
            trend_participation     = EXCLUDED.trend_participation,
            power_rating_percentile = EXCLUDED.power_rating_percentile,
            goal_threat_percentile  = EXCLUDED.goal_threat_percentile,
            updated_at              = NOW()
        RETURNING player_id
    )
    ---------------------------------------------------------------------
    -- 7.  Upsert historical blocks (and ensure trends CTE executes)
    ---------------------------------------------------------------------
    INSERT INTO aggregated_half_season_stats AS ahs
          (player_id, historical_blocks)
    SELECT b.player_id, b.block_json
    FROM blocks b
    WHERE EXISTS (SELECT 1 FROM upsert_trends ut WHERE ut.player_id = b.player_id)
    UNION ALL
    SELECT b.player_id, b.block_json  
    FROM blocks b
    WHERE NOT EXISTS (SELECT 1 FROM upsert_trends ut WHERE ut.player_id = b.player_id)
    ON CONFLICT (player_id) DO UPDATE
    SET historical_blocks = EXCLUDED.historical_blocks;
END;
$$; 