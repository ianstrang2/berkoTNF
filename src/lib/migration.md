# ⚙️ Supabase Trigger Migration Plan

## ✅ Goal

Migrate all Supabase trigger logic into the Node/React/Vercel app.  
Once complete, Supabase will be used for data storage only — all business logic will be version-controlled, auditable, and editable within the app codebase (and maintainable by Cursor).

---

## 🧠 Match Types: Important Distinction

There are two types of "match" records in the app:

### 🔹 `upcoming_matches`  
Used for **planned games** (pre-match team organization).  
- Logic: only one match can be active at a time.  
- ❌ No post-match processing happens here.

### 🟢 `matches` + `player_matches`  
Represent **played matches** and individual player stats.  
- ✅ This is where all postprocessing logic applies (fantasy points, streaks, reports, etc).

---

## 🚨 When to Run Postprocessing

Run `/api/match-postprocess` after **any of the following:**
- A `match` is inserted, updated, or deleted
- A `player_match` is inserted, updated, or deleted

Do **not** run it for changes to `upcoming_matches`.

---

## ✅ Logic to Migrate into the App

For each Supabase function listed below:
- Recreate the logic in a service file in `/lib/stats`
- Call each one from `/api/match-postprocess.ts` after a match or player stat update

---

## 📂 Suggested Folder Layout

```
/lib
  /stats
    updateRecentPerformance.ts
    updateAllTimeStats.ts
    updateSeasonHonours.ts
    updateHalfAndFullSeasonStats.ts
    updateMatchReportCache.ts
    helpers.ts
/api
  match-postprocess.ts
```

---

## 📦 Function: `check_only_one_active_upcoming_match`

**Trigger Type:** BEFORE INSERT/UPDATE on `upcoming_matches`

```sql
CREATE OR REPLACE FUNCTION public.check_only_one_active_upcoming_match()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE upcoming_matches
    SET is_active = FALSE
    WHERE upcoming_match_id <> NEW.upcoming_match_id AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$function$
```
📌 Recreate this logic in your API route that creates/updates planned matches.

---

## 📦 Function: `update_team_slots_timestamp`

```sql
CREATE OR REPLACE FUNCTION public.update_team_slots_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
```
📌 Add `updated_at = new Date()` manually in your `team_slots` update handler.

---

## 📦 Function: `handle_match_update`

```sql
CREATE OR REPLACE FUNCTION public.handle_match_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    half_season_start DATE;
    half_season_end DATE;
    -- Config values
    win_points INTEGER;
    draw_points INTEGER;
    loss_points INTEGER;
    heavy_win_points INTEGER;
    clean_sheet_win_points INTEGER;
    heavy_clean_sheet_win_points INTEGER;
    clean_sheet_draw_points INTEGER;
    heavy_loss_points INTEGER;
    -- Season tracking
    start_year INTEGER;
    end_year INTEGER;
    season_start DATE;
    season_end DATE;
BEGIN
    -- Get fantasy point values from app_config
    SELECT CAST(config_value AS INTEGER) INTO win_points
    FROM app_config WHERE config_key = 'fantasy_win_points';

    SELECT CAST(config_value AS INTEGER) INTO draw_points
    FROM app_config WHERE config_key = 'fantasy_draw_points';

    SELECT CAST(config_value AS INTEGER) INTO loss_points
    FROM app_config WHERE config_key = 'fantasy_loss_points';

    SELECT CAST(config_value AS INTEGER) INTO heavy_win_points
    FROM app_config WHERE config_key = 'fantasy_heavy_win_points';

    SELECT CAST(config_value AS INTEGER) INTO clean_sheet_win_points
    FROM app_config WHERE config_key = 'fantasy_clean_sheet_win_points';

    SELECT CAST(config_value AS INTEGER) INTO heavy_clean_sheet_win_points
    FROM app_config WHERE config_key = 'fantasy_heavy_clean_sheet_win_points';

    SELECT CAST(config_value AS INTEGER) INTO clean_sheet_draw_points
    FROM app_config WHERE config_key = 'fantasy_clean_sheet_draw_points';

    SELECT CAST(config_value AS INTEGER) INTO heavy_loss_points
    FROM app_config WHERE config_key = 'fantasy_heavy_loss_points';

    -- Default values if any config is missing
    win_points := COALESCE(win_points, 20);
    draw_points := COALESCE(draw_points, 10);
    loss_points := COALESCE(loss_points, -10);
    heavy_win_points := COALESCE(heavy_win_points, 30);
    clean_sheet_win_points := COALESCE(clean_sheet_win_points, 30);
    heavy_clean_sheet_win_points := COALESCE(heavy_clean_sheet_win_points, 40);
    clean_sheet_draw_points := COALESCE(clean_sheet_draw_points, 20);
    heavy_loss_points := COALESCE(heavy_loss_points, -20);

    -- Get current date parts
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    current_month := EXTRACT(MONTH FROM CURRENT_DATE);

    -- Set half season dates based on current month
    IF current_month BETWEEN 1 AND 6 THEN
        -- First half of year
        half_season_start := DATE_TRUNC('year', CURRENT_DATE);  -- January 1st
        half_season_end := (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '6 months' - INTERVAL '1 day');  -- June 30th
    ELSE
        -- Second half of year
        half_season_start := (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '6 months');  -- July 1st
        half_season_end := (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day');  -- December 31st
    END IF;

    -- Update aggregated_half_season_stats for current half season
    WITH match_stats AS (
        SELECT
            pm.player_id,
            COUNT(*) as games,
            COUNT(*) FILTER (WHERE pm.result = 'win') as wins,
            COUNT(*) FILTER (WHERE pm.result = 'draw') as draws,
            COUNT(*) FILTER (WHERE pm.result = 'loss') as losses,
            SUM(pm.goals) as total_goals,
            COUNT(*) FILTER (WHERE pm.heavy_win = true) as heavy_wins,
            COUNT(*) FILTER (WHERE pm.heavy_loss = true) as heavy_losses,
            COUNT(*) FILTER (WHERE pm.clean_sheet = true AND pm.result = 'win') as clean_sheet_wins,
            COUNT(*) FILTER (WHERE pm.clean_sheet = true AND pm.result = 'draw') as clean_sheet_draws,
            COUNT(*) FILTER (WHERE pm.clean_sheet = true AND pm.result = 'win' AND pm.heavy_win = true) as heavy_clean_sheet_wins,
            COUNT(*) FILTER (WHERE pm.clean_sheet = true) as clean_sheets
        FROM player_matches pm
        JOIN matches m ON pm.match_id = m.match_id
        JOIN players p ON pm.player_id = p.player_id
        WHERE m.match_date BETWEEN half_season_start AND half_season_end
          AND p.is_ringer = false
        GROUP BY pm.player_id
    ),
    calculated_fantasy AS (
        SELECT
            player_id,
            -- Calculate base points for each result type
            (wins - heavy_wins - clean_sheet_wins + heavy_clean_sheet_wins) * win_points +  -- Regular wins
            heavy_wins * heavy_win_points +                                                -- Heavy wins
            clean_sheet_wins * clean_sheet_win_points +                                    -- Clean sheet wins
            heavy_clean_sheet_wins * heavy_clean_sheet_win_points +                        -- Heavy clean sheet wins
            (draws - clean_sheet_draws) * draw_points +                                    -- Regular draws
            clean_sheet_draws * clean_sheet_draw_points +                                  -- Clean sheet draws
            (losses - heavy_losses) * loss_points +                                        -- Regular losses
            heavy_losses * heavy_loss_points                                               -- Heavy losses
            AS fantasy_points
        FROM match_stats
    )
    INSERT INTO aggregated_half_season_stats (
        player_id,
        games_played,
        wins,
        draws,
        losses,
        goals,
        heavy_wins,
        heavy_losses,
        clean_sheets,
        win_percentage,
        fantasy_points,
        points_per_game,
        last_updated
    )
    SELECT
        ms.player_id,
        ms.games,
        ms.wins,
        ms.draws,
        ms.losses,
        ms.total_goals,
        ms.heavy_wins,
        ms.heavy_losses,
        ms.clean_sheets,
        CASE WHEN ms.games > 0 THEN (ms.wins::DECIMAL / ms.games::DECIMAL) * 100 ELSE 0 END,
        cf.fantasy_points,  -- Use the calculated fantasy points
        CASE WHEN ms.games > 0 THEN (cf.fantasy_points::DECIMAL / ms.games::DECIMAL) ELSE 0 END,
        NOW()
    FROM match_stats ms
    JOIN calculated_fantasy cf ON ms.player_id = cf.player_id
    ON CONFLICT (player_id)
    DO UPDATE SET
        games_played = EXCLUDED.games_played,
        wins = EXCLUDED.wins,
        draws = EXCLUDED.draws,
        losses = EXCLUDED.losses,
        goals = EXCLUDED.goals,
        heavy_wins = EXCLUDED.heavy_wins,
        heavy_losses = EXCLUDED.heavy_losses,
        clean_sheets = EXCLUDED.clean_sheets,
        win_percentage = EXCLUDED.win_percentage,
        fantasy_points = EXCLUDED.fantasy_points,
        points_per_game = EXCLUDED.points_per_game,
        last_updated = NOW();

    -- Process all seasons since the earliest match date
    -- Get the earliest year and latest year
    SELECT
        EXTRACT(YEAR FROM MIN(match_date)) AS min_year,
        EXTRACT(YEAR FROM MAX(match_date)) AS max_year
    INTO start_year, end_year
    FROM matches;

    -- Loop through each year and update season stats
    FOR year_num IN start_year..end_year LOOP
        season_start := DATE_TRUNC('year', make_date(year_num, 1, 1));
        season_end := season_start + INTERVAL '1 year' - INTERVAL '1 day';

        -- Update aggregated_season_stats for this year
        WITH match_stats AS (
            SELECT
                pm.player_id,
                COUNT(*) as games,
                COUNT(*) FILTER (WHERE pm.result = 'win') as wins,
                COUNT(*) FILTER (WHERE pm.result = 'draw') as draws,
                COUNT(*) FILTER (WHERE pm.result = 'loss') as losses,
                SUM(pm.goals) as total_goals,
                COUNT(*) FILTER (WHERE pm.heavy_win = true) as heavy_wins,
                COUNT(*) FILTER (WHERE pm.heavy_loss = true) as heavy_losses,
                COUNT(*) FILTER (WHERE pm.clean_sheet = true AND pm.result = 'win') as clean_sheet_wins,
                COUNT(*) FILTER (WHERE pm.clean_sheet = true AND pm.result = 'draw') as clean_sheet_draws,
                COUNT(*) FILTER (WHERE pm.clean_sheet = true AND pm.result = 'win' AND pm.heavy_win = true) as heavy_clean_sheet_wins,
                COUNT(*) FILTER (WHERE pm.clean_sheet = true) as clean_sheets
            FROM player_matches pm
            JOIN matches m ON pm.match_id = m.match_id
            JOIN players p ON pm.player_id = p.player_id
            WHERE m.match_date BETWEEN season_start AND season_end
              AND p.is_ringer = false
            GROUP BY pm.player_id
        ),
        calculated_fantasy AS (
            SELECT
                player_id,
                -- Calculate base points for each result type
                (wins - heavy_wins - clean_sheet_wins + heavy_clean_sheet_wins) * win_points +  -- Regular wins
                heavy_wins * heavy_win_points +                                                -- Heavy wins
                clean_sheet_wins * clean_sheet_win_points +                                    -- Clean sheet wins
                heavy_clean_sheet_wins * heavy_clean_sheet_win_points +                        -- Heavy clean sheet wins
                (draws - clean_sheet_draws) * draw_points +                                    -- Regular draws
                clean_sheet_draws * clean_sheet_draw_points +                                  -- Clean sheet draws
                (losses - heavy_losses) * loss_points +                                        -- Regular losses
                heavy_losses * heavy_loss_points                                               -- Heavy losses
                AS fantasy_points
            FROM match_stats
        )
        INSERT INTO aggregated_season_stats (
            player_id,
            season_start_date,
            season_end_date,
            games_played,
            wins,
            draws,
            losses,
            goals,
            heavy_wins,
            heavy_losses,
            clean_sheets,
            win_percentage,
            fantasy_points,
            points_per_game,
            last_updated
        )
        SELECT
            ms.player_id,
            season_start,
            season_end,
            ms.games,
            ms.wins,
            ms.draws,
            ms.losses,
            ms.total_goals,
            ms.heavy_wins,
            ms.heavy_losses,
            ms.clean_sheets,
            CASE WHEN ms.games > 0 THEN (ms.wins::DECIMAL / ms.games::DECIMAL) * 100 ELSE 0 END,
            cf.fantasy_points,  -- Use the calculated fantasy points
            CASE WHEN ms.games > 0 THEN (cf.fantasy_points::DECIMAL / ms.games::DECIMAL) ELSE 0 END,
            NOW()
        FROM match_stats ms
        JOIN calculated_fantasy cf ON ms.player_id = cf.player_id
        ON CONFLICT (player_id, season_start_date, season_end_date)
        DO UPDATE SET
            games_played = EXCLUDED.games_played,
            wins = EXCLUDED.wins,
            draws = EXCLUDED.draws,
            losses = EXCLUDED.losses,
            goals = EXCLUDED.goals,
            heavy_wins = EXCLUDED.heavy_wins,
            heavy_losses = EXCLUDED.heavy_losses,
            clean_sheets = EXCLUDED.clean_sheets,
            win_percentage = EXCLUDED.win_percentage,
            fantasy_points = EXCLUDED.fantasy_points,
            points_per_game = EXCLUDED.points_per_game,
            last_updated = NOW();
    END LOOP;

    RETURN NEW;
END;
$function$
```

📌 Rebuild this logic in `/lib/stats/updateHalfAndFullSeasonStats.ts`.
Ensure `app_config` values (fantasy points) are fetched within the Node.js service.

---

## 📦 Function: `populate_recent_performance`

```sql
CREATE OR REPLACE FUNCTION populate_recent_performance()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM aggregated_recent_performance;

  INSERT INTO aggregated_recent_performance (player_id, last_5_games, last_5_goals, last_updated)
  SELECT
    p.player_id,
    (
      SELECT json_agg(json_build_object(
        'date', m.match_date,
        'goals', pm.goals,
        'result', pm.result,
        'score', CASE
          WHEN pm.team = 'A' THEN CONCAT(m.team_a_score, '-', m.team_b_score)
          ELSE CONCAT(m.team_b_score, '-', m.team_a_score)
        END,
        'heavy_win', pm.heavy_win,
        'heavy_loss', pm.heavy_loss,
        'clean_sheet', (
          (pm.team = 'A' AND m.team_b_score = 0)
          OR (pm.team = 'B' AND m.team_a_score = 0)
        )
      ) ORDER BY m.match_date DESC) -- Apply ORDER BY inside json_agg if supported, or handle in subquery
      FROM player_matches pm
      JOIN matches m ON m.match_id = pm.match_id
      WHERE pm.player_id = p.player_id
      -- Note: LIMIT 5 needs to be applied *before* aggregation. This SQL might need adjustment.
      -- A common pattern is a subquery with ROW_NUMBER() <= 5 or fetching into an array and slicing.
      -- For migration, replicate the logic to fetch the 5 most recent matches per player.
    ) AS last_5_games,
    COALESCE( ( -- Calculate sum based on the correctly selected last 5 games
      SELECT SUM(sub.goals)
      FROM (
        SELECT pm.goals
        FROM player_matches pm
        JOIN matches m ON m.match_id = pm.match_id
        WHERE pm.player_id = p.player_id
        ORDER BY m.match_date DESC
        LIMIT 5
      ) sub
    ), 0) AS last_5_goals, -- Ensure COALESCE applies to the sum result
    NOW()
  FROM players p
  WHERE p.is_ringer = FALSE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

📌 Rebuild this in `/lib/stats/updateRecentPerformance.ts`.
This service is **solely responsible** for calculating and updating recent performance metrics, including:
- `last_5_games`: A JSON array containing details of the last 5 matches played.
- `last_5_goals`: The sum of goals scored in the last 5 matches played.
- `last_5_results`: A representation (e.g., 'WDLWL', or an array `['W', 'D', 'L', 'W', 'L']`) of the results from the last 5 matches played (derived from `last_5_games`).
Used for recent form data (e.g. pills in UI).

---

## 📦 Function: `populate_all_time_stats`

**Original Trigger:** `populate_all_time_stats()` function triggered AFTER INSERT/UPDATE/DELETE on `player_matches`.

```sql
-- (Original complex SQL trigger code for all-time stats)
-- ... Includes aggregation, percentage calculations, fantasy points, HoF logic ...
```

📌 **Migrated Logic:** Recreated in `src/lib/stats/updateAllTimeStats.ts`.
- **Responsibilities:** Calculates all-time player statistics and Hall of Fame rankings.
- **Implementation:**
    - Fetches all non-ringer/non-retired `player_matches`.
    - Aggregates base stats (wins, goals, etc.) in memory using a Map.
    - Calculates derived stats (percentages, points per game).
    - Uses `helpers.ts` -> `calculateFantasyPointsForMatch()` for fantasy points, reading values from the passed `config` object.
    - Uses `helpers.ts` -> `getTopRanked()` to determine Hall of Fame entries based on config values (`games_required_for_hof`, `hall_of_fame_limit`).
    - `minutes_per_goal` calculation uses `config.match_duration_minutes`.
    - Clears and inserts into `aggregated_all_time_stats` and `aggregated_hall_of_fame` tables (verify exact Prisma model name like `prisma.aggregated_all_time_stats` after running `prisma generate`).

---

## 📦 Function: `populate_honour_roll_data`

**Original Trigger:** `populate_honour_roll_data()` function triggered AFTER INSERT/UPDATE/DELETE on `player_matches`.

```sql
-- (Original complex SQL trigger code for season honours and records)
-- ... Includes window functions, RANK(), JSON aggregation for winners/records ...
```

📌 **Migrated Logic:** Recreated in `src/lib/stats/updateSeasonHonours.ts`.
- **Responsibilities:** Calculates past season honours (winners, top scorers per year) and all-time records (streaks, biggest win, etc.).
- **Implementation:**
    - Uses the `config` object for `min_games_for_honours`, `min_streak_length` and fantasy points (embedded in SQL for now).
    - Calculates honours and records primarily using complex `$queryRaw` statements due to reliance on window functions and specific SQL aggregation patterns.
    - Clears and inserts into `aggregated_season_honours` and `aggregated_records` tables.
    - **Note:** Does not currently use calculation helpers from `helpers.ts` due to the nature of the raw SQL queries.

---

## 📦 Function: `update_match_report_cache`

```sql
CREATE OR REPLACE FUNCTION public.update_match_report_cache()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    latest_match RECORD;
BEGIN
    -- Get the latest match
    SELECT * INTO latest_match
    FROM matches
    ORDER BY match_date DESC
    LIMIT 1;

    -- First update the match report cache
    DELETE FROM aggregated_match_report;

    -- Insert basic match info - ADDING CONFIG_VALUES to the field list
    INSERT INTO aggregated_match_report (
        match_id,
        match_date,
        team_a_score,
        team_b_score,
        team_a_players,
        team_b_players,
        team_a_scorers,
        team_b_scorers,
        config_values  -- Added this field
    )
    SELECT
        m.match_id,
        m.match_date,
        m.team_a_score,
        m.team_b_score,
        -- For team_a_players, create a JSONB array of player names
        COALESCE(
            (
                SELECT JSONB_AGG(p.name ORDER BY p.name) -- Ensure consistent order
                FROM player_matches pm2
                JOIN players p ON pm2.player_id = p.player_id
                WHERE pm2.match_id = m.match_id AND pm2.team = 'A'
            ),
            '[]'::jsonb
        ) as team_a_players,

        -- For team_b_players, do the same
        COALESCE(
            (
                SELECT JSONB_AGG(p.name ORDER BY p.name) -- Ensure consistent order
                FROM player_matches pm2
                JOIN players p ON pm2.player_id = p.player_id
                WHERE pm2.match_id = m.match_id AND pm2.team = 'B'
            ),
            '[]'::jsonb
        ) as team_b_players,

        -- String aggregation for scorers
        (
            SELECT STRING_AGG(
                p.name || CASE WHEN pm2.goals > 1 THEN ' (' || pm2.goals || ')' ELSE '' END,
                ', '
                ORDER BY p.name
            )
            FROM player_matches pm2
            JOIN players p ON pm2.player_id = p.player_id
            WHERE pm2.match_id = m.match_id AND pm2.team = 'A' AND pm2.goals > 0
        ) as team_a_scorers,

        (
            SELECT STRING_AGG(
                p.name || CASE WHEN pm2.goals > 1 THEN ' (' || pm2.goals || ')' ELSE '' END,
                ', '
                ORDER BY p.name
            )
            FROM player_matches pm2
            JOIN players p ON pm2.player_id = p.player_id
            WHERE pm2.match_id = m.match_id AND pm2.team = 'B' AND pm2.goals > 0
        ) as team_b_scorers,

        -- Add config_values field with reasonable defaults
        jsonb_build_object(
            'win_streak_threshold', COALESCE((SELECT CAST(config_value AS INT) FROM app_config WHERE config_key = 'win_streak_threshold'), 4),
            'unbeaten_streak_threshold', COALESCE((SELECT CAST(config_value AS INT) FROM app_config WHERE config_key = 'unbeaten_streak_threshold'), 6),
            'loss_streak_threshold', COALESCE((SELECT CAST(config_value AS INT) FROM app_config WHERE config_key = 'loss_streak_threshold'), 4),
            'winless_streak_threshold', COALESCE((SELECT CAST(config_value AS INT) FROM app_config WHERE config_key = 'winless_streak_threshold'), 6),
            'goal_streak_threshold', COALESCE((SELECT CAST(config_value AS INT) FROM app_config WHERE config_key = 'goal_streak_threshold'), 3)
        ) as config_values

    FROM matches m
    WHERE m.match_id = latest_match.match_id;

    -- Then update the streaks with our fixed function
    PERFORM fix_all_streaks(); -- Dependency

    -- Update milestones
    PERFORM fix_all_milestones(); -- Dependency

    -- Update leaders - keep all this logic
    UPDATE aggregated_match_report amr
    SET
        half_season_goal_leaders = jsonb_build_array(calculate_leaders_for_match(latest_match.match_id)->'half_season_goals'), -- Dependency
        half_season_fantasy_leaders = jsonb_build_array(calculate_leaders_for_match(latest_match.match_id)->'half_season_fantasy'), -- Dependency
        season_goal_leaders = jsonb_build_array(calculate_leaders_for_match(latest_match.match_id)->'season_goals'), -- Dependency
        season_fantasy_leaders = jsonb_build_array(calculate_leaders_for_match(latest_match.match_id)->'season_fantasy') -- Dependency
    WHERE amr.match_id = latest_match.match_id;

    -- Update cache metadata
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('match_report', NOW(), 'match_report')
    ON CONFLICT (cache_key)
    DO UPDATE SET last_invalidated = NOW();

    RETURN NULL; -- Changed from NEW as it's likely an AFTER trigger
END;
$function$
```
📌 Rebuild in `/lib/stats/updateMatchReportCache.ts`.
Run it always after a match update (since "most recent match" may change).

**Dependencies:** This function originally called `fix_all_streaks()`, `fix_all_milestones()`, and `calculate_leaders_for_match()`.
- **Decision:** The logic from these helper functions **will be migrated into TypeScript** and incorporated directly within `updateMatchReportCache.ts` or potentially broken out into separate TypeScript helper services called by it. They will *not* remain as separate SQL functions to be called via raw SQL.
- Ensure `app_config` values (streak thresholds) are fetched within the Node.js service.

---

### 📄 SQL Definition: `fix_all_streaks()` (to be migrated)

```sql
CREATE OR REPLACE FUNCTION public.fix_all_streaks()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    latest_match_id INT;
BEGIN
    -- Get the latest match ID
    SELECT match_id INTO latest_match_id
    FROM matches
    ORDER BY match_date DESC
    LIMIT 1;

    -- First, reset all streaks to 0 for players not in the latest match
    UPDATE aggregated_match_streaks ams
    SET
        current_win_streak = 0,
        current_unbeaten_streak = 0,
        current_winless_streak = 0,
        current_loss_streak = 0,
        current_scoring_streak = 0,
        goals_in_scoring_streak = 0
    WHERE ams.player_id NOT IN (
        SELECT pm.player_id
        FROM player_matches pm
        WHERE pm.match_id = latest_match_id
    );

    -- Continue with streak calculations only for players in the latest match

    -- 1. Goal scoring streaks
    WITH latest_players AS (
        -- Get players from the latest match
        SELECT DISTINCT pm.player_id
        FROM player_matches pm
        WHERE pm.match_id = latest_match_id
    ),
    player_matches AS (
        -- Get all matches in descending order by date
        SELECT
            p.player_id,
            p.name,
            m.match_date,
            pm.goals,
            ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false
        AND p.is_retired = false
        AND p.player_id IN (SELECT player_id FROM latest_players) -- Only include players from latest match
        ORDER BY p.player_id, m.match_date DESC
    ),
    streak_groups AS (
        SELECT
            player_id,
            name,
            match_num,
            goals,
            SUM(CASE WHEN goals = 0 THEN 1 ELSE 0 END) OVER (
                PARTITION BY player_id
                ORDER BY match_num
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) as streak_group
        FROM player_matches
        WHERE match_num <= 20
    ),
    current_streaks AS (
        SELECT
            player_id,
            COUNT(*) as streak_length,
            SUM(goals) as total_goals
        FROM streak_groups
        WHERE streak_group = 0
        GROUP BY player_id
    )
    UPDATE aggregated_match_streaks ams
    SET
        current_scoring_streak = cs.streak_length,
        goals_in_scoring_streak = cs.total_goals
    FROM current_streaks cs
    WHERE ams.player_id = cs.player_id;

    -- 2. Win streaks (similar pattern, only for latest match players)
    WITH latest_players AS (
        SELECT DISTINCT pm.player_id
        FROM player_matches pm
        WHERE pm.match_id = latest_match_id
    ),
    player_matches AS (
        SELECT
            p.player_id,
            pm.result,
            ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false
        AND p.is_retired = false
        AND p.player_id IN (SELECT player_id FROM latest_players)
        ORDER BY p.player_id, m.match_date DESC
    ),
    streak_groups AS (
        SELECT
            player_id,
            match_num,
            result,
            SUM(CASE WHEN result != 'win' THEN 1 ELSE 0 END) OVER (
                PARTITION BY player_id
                ORDER BY match_num
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) as streak_group
        FROM player_matches
        WHERE match_num <= 20
    ),
    current_streaks AS (
        SELECT
            player_id,
            COUNT(*) as streak_length
        FROM streak_groups
        WHERE streak_group = 0
        GROUP BY player_id
    )
    UPDATE aggregated_match_streaks ams
    SET current_win_streak = cs.streak_length
    FROM current_streaks cs
    WHERE ams.player_id = cs.player_id;

    -- 3. Unbeaten streaks (win or draw)
    WITH latest_players AS (
        SELECT DISTINCT pm.player_id
        FROM player_matches pm
        WHERE pm.match_id = latest_match_id
    ),
    player_matches AS (
        SELECT
            p.player_id,
            pm.result,
            ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false
        AND p.is_retired = false
        AND p.player_id IN (SELECT player_id FROM latest_players)
        ORDER BY p.player_id, m.match_date DESC
    ),
    streak_groups AS (
        SELECT
            player_id,
            match_num,
            result,
            SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) OVER (
                PARTITION BY player_id
                ORDER BY match_num
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) as streak_group
        FROM player_matches
        WHERE match_num <= 20
    ),
    current_streaks AS (
        SELECT
            player_id,
            COUNT(*) as streak_length
        FROM streak_groups
        WHERE streak_group = 0
        GROUP BY player_id
    )
    UPDATE aggregated_match_streaks ams
    SET current_unbeaten_streak = cs.streak_length
    FROM current_streaks cs
    WHERE ams.player_id = cs.player_id;

    -- 4. Winless streaks (loss or draw)
    WITH latest_players AS (
        SELECT DISTINCT pm.player_id
        FROM player_matches pm
        WHERE pm.match_id = latest_match_id
    ),
    player_matches AS (
        SELECT
            p.player_id,
            pm.result,
            ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false
        AND p.is_retired = false
        AND p.player_id IN (SELECT player_id FROM latest_players)
        ORDER BY p.player_id, m.match_date DESC
    ),
    streak_groups AS (
        SELECT
            player_id,
            match_num,
            result,
            SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) OVER (
                PARTITION BY player_id
                ORDER BY match_num
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) as streak_group
        FROM player_matches
        WHERE match_num <= 20
    ),
    current_streaks AS (
        SELECT
            player_id,
            COUNT(*) as streak_length
        FROM streak_groups
        WHERE streak_group = 0
        GROUP BY player_id
    )
    UPDATE aggregated_match_streaks ams
    SET current_winless_streak = cs.streak_length
    FROM current_streaks cs
    WHERE ams.player_id = cs.player_id;

    -- 5. Loss streaks
    WITH latest_players AS (
        SELECT DISTINCT pm.player_id
        FROM player_matches pm
        WHERE pm.match_id = latest_match_id
    ),
    player_matches AS (
        SELECT
            p.player_id,
            pm.result,
            ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false
        AND p.is_retired = false
        AND p.player_id IN (SELECT player_id FROM latest_players)
        ORDER BY p.player_id, m.match_date DESC
    ),
    streak_groups AS (
        SELECT
            player_id,
            match_num,
            result,
            SUM(CASE WHEN result != 'loss' THEN 1 ELSE 0 END) OVER (
                PARTITION BY player_id
                ORDER BY match_num
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) as streak_group
        FROM player_matches
        WHERE match_num <= 20
    ),
    current_streaks AS (
        SELECT
            player_id,
            COUNT(*) as streak_length
        FROM streak_groups
        WHERE streak_group = 0
        GROUP BY player_id
    )
    UPDATE aggregated_match_streaks ams
    SET current_loss_streak = cs.streak_length
    FROM current_streaks cs
    WHERE ams.player_id = cs.player_id;
END;
$function$
```

---

### 📄 SQL Definition: `fix_all_milestones()` (to be migrated)

```sql
CREATE OR REPLACE FUNCTION public.fix_all_milestones()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    latest_match_id INT;
    game_threshold INT;
    goal_threshold INT;
BEGIN
    -- Get the latest match ID
    SELECT match_id INTO latest_match_id
    FROM matches
    ORDER BY match_date DESC
    LIMIT 1;

    -- Get milestone thresholds from app_config
    SELECT COALESCE(CAST(config_value AS INT), 50) INTO game_threshold
    FROM app_config WHERE config_key = 'game_milestone_threshold';

    SELECT COALESCE(CAST(config_value AS INT), 50) INTO goal_threshold
    FROM app_config WHERE config_key = 'goal_milestone_threshold';

    -- Calculate and update milestones
    UPDATE aggregated_match_report amr
    SET
        game_milestones = (
            -- Game milestones - only for players who played in the latest match
            WITH players_in_latest_match AS (
                -- Get players who played in the latest match
                SELECT
                    pm.player_id
                FROM
                    player_matches pm
                WHERE
                    pm.match_id = latest_match_id
            ),
            player_game_counts AS (
                -- Get game counts for these players
                SELECT
                    p.player_id,
                    p.name,
                    COUNT(*) as total_games
                FROM
                    players p
                JOIN
                    player_matches pm ON p.player_id = pm.player_id
                WHERE
                    p.is_ringer = false
                    AND p.player_id IN (SELECT player_id FROM players_in_latest_match)
                GROUP BY
                    p.player_id, p.name
            )
            SELECT
                jsonb_agg(
                    jsonb_build_object(
                        'name', name,
                        'total_games', total_games
                    )
                )
            FROM
                player_game_counts
            WHERE
                total_games % game_threshold = 0
        ),
        goal_milestones = (
            -- Goal milestones - only for players who played in the latest match
            WITH players_in_latest_match AS (
                -- Get players who played in the latest match
                SELECT
                    pm.player_id
                FROM
                    player_matches pm
                WHERE
                    pm.match_id = latest_match_id
            ),
            player_goal_counts AS (
                -- Get goal counts for these players
                SELECT
                    p.player_id,
                    p.name,
                    SUM(pm.goals) as total_goals
                FROM
                    players p
                JOIN
                    player_matches pm ON p.player_id = pm.player_id
                WHERE
                    p.is_ringer = false
                    AND p.player_id IN (SELECT player_id FROM players_in_latest_match)
                GROUP BY
                    p.player_id, p.name
            )
            SELECT
                jsonb_agg(
                    jsonb_build_object(
                        'name', name,
                        'total_goals', total_goals
                    )
                )
            FROM
                player_goal_counts
            WHERE
                total_goals % goal_threshold = 0
                AND total_goals > 0
        )
    WHERE amr.match_id = latest_match_id;
END;
$function$
```

---

### 📄 SQL Definition: `calculate_leaders_for_match(target_match_id integer)` (to be migrated)

```sql
CREATE OR REPLACE FUNCTION public.calculate_leaders_for_match(target_match_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    target_date DATE;
    half_season_start DATE;
    half_season_end DATE;
    win_points INT;
    draw_points INT;
    loss_points INT;
    heavy_win_points INT;
    clean_sheet_win_points INT;
    heavy_clean_sheet_win_points INT;
    clean_sheet_draw_points INT;
    heavy_loss_points INT;
BEGIN
    -- Get match date
    SELECT m.match_date INTO target_date
    FROM matches m
    WHERE m.match_id = target_match_id;

    -- Calculate half-season boundaries
    IF EXTRACT(MONTH FROM target_date) <= 6 THEN
        -- First half of year
        half_season_start := DATE_TRUNC('year', target_date);
        half_season_end := (DATE_TRUNC('year', target_date) + INTERVAL '6 months')::date - INTERVAL '1 day';
    ELSE
        -- Second half of year
        half_season_start := DATE_TRUNC('year', target_date) + INTERVAL '6 months';
        half_season_end := (DATE_TRUNC('year', target_date) + INTERVAL '1 year')::date - INTERVAL '1 day';
    END IF;

    -- Get the current point configuration from app_config
    SELECT CAST(config_value AS INT) INTO win_points
    FROM app_config WHERE config_key = 'fantasy_win_points';

    SELECT CAST(config_value AS INT) INTO draw_points
    FROM app_config WHERE config_key = 'fantasy_draw_points';

    SELECT CAST(config_value AS INT) INTO loss_points
    FROM app_config WHERE config_key = 'fantasy_loss_points';

    SELECT CAST(config_value AS INT) INTO heavy_win_points
    FROM app_config WHERE config_key = 'fantasy_heavy_win_points';

    SELECT CAST(config_value AS INT) INTO clean_sheet_win_points
    FROM app_config WHERE config_key = 'fantasy_clean_sheet_win_points';

    SELECT CAST(config_value AS INT) INTO heavy_clean_sheet_win_points
    FROM app_config WHERE config_key = 'fantasy_heavy_clean_sheet_win_points';

    SELECT CAST(config_value AS INT) INTO clean_sheet_draw_points
    FROM app_config WHERE config_key = 'fantasy_clean_sheet_draw_points';

    SELECT CAST(config_value AS INT) INTO heavy_loss_points
    FROM app_config WHERE config_key = 'fantasy_heavy_loss_points';

    -- Set default values if configurations are missing
    win_points := COALESCE(win_points, 20);
    draw_points := COALESCE(draw_points, 10);
    loss_points := COALESCE(loss_points, -10);
    heavy_win_points := COALESCE(heavy_win_points, 30);
    clean_sheet_win_points := COALESCE(clean_sheet_win_points, 30);
    heavy_clean_sheet_win_points := COALESCE(heavy_clean_sheet_win_points, 40);
    clean_sheet_draw_points := COALESCE(clean_sheet_draw_points, 20);
    heavy_loss_points := COALESCE(heavy_loss_points, -20);

    RETURN (
        WITH match_stats AS (
            SELECT
                p.name,
                m.match_date,
                pm.goals,
                pm.result,
                pm.clean_sheet,
                pm.heavy_win,
                pm.heavy_loss,
                CASE
                    WHEN pm.result = 'win' AND pm.heavy_win = true AND
                        ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                    THEN heavy_clean_sheet_win_points
                    WHEN pm.result = 'win' AND pm.heavy_win = true
                    THEN heavy_win_points
                    WHEN pm.result = 'win' AND
                        ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                    THEN clean_sheet_win_points
                    WHEN pm.result = 'win'
                    THEN win_points
                    WHEN pm.result = 'draw' AND
                        ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                    THEN clean_sheet_draw_points
                    WHEN pm.result = 'draw'
                    THEN draw_points
                    WHEN pm.result = 'loss' AND pm.heavy_loss = true
                    THEN heavy_loss_points
                    WHEN pm.result = 'loss'
                    THEN loss_points
                    ELSE 0
                END as calculated_fantasy_points
            FROM players p
            JOIN player_matches pm ON p.player_id = pm.player_id
            JOIN matches m ON pm.match_id = m.match_id
            WHERE p.is_ringer = false
        ),
        current_season_stats AS (
            SELECT
                name,
                SUM(goals) as total_goals,
                SUM(calculated_fantasy_points) as fantasy_points
            FROM match_stats
            WHERE match_date >= DATE_TRUNC('year', target_date)::date
            AND match_date <= target_date
            GROUP BY name
        ),
        previous_season_stats AS (
            SELECT
                name,
                SUM(goals) as total_goals,
                SUM(calculated_fantasy_points) as fantasy_points
            FROM match_stats
            WHERE match_date >= DATE_TRUNC('year', target_date)::date
            AND match_date < target_date
            GROUP BY name
        ),
        current_half_season_stats AS (
            SELECT
                name,
                SUM(goals) as total_goals,
                SUM(calculated_fantasy_points) as fantasy_points
            FROM match_stats
            WHERE match_date >= half_season_start
            AND match_date <= target_date
            GROUP BY name
        ),
        previous_half_season_stats AS (
            SELECT
                name,
                SUM(goals) as total_goals,
                SUM(calculated_fantasy_points) as fantasy_points
            FROM match_stats
            WHERE match_date >= half_season_start
            AND match_date < target_date
            GROUP BY name
        )
        SELECT jsonb_build_object(
            'season_goals', (
                SELECT jsonb_build_object(
                    'change_type',
                    CASE
                        WHEN c.name IS NULL THEN 'new_leader'
                        WHEN c.name = p.name THEN 'remains'
                        WHEN p.name IS NULL THEN 'new_leader'
                        WHEN c.total_goals = p.total_goals THEN 'tied'
                        ELSE 'overtake'
                    END,
                    'new_leader', c.name,
                    'new_leader_goals', c.total_goals,
                    'previous_leader', p.name,
                    'previous_leader_goals', p.total_goals
                )
                FROM (SELECT * FROM current_season_stats ORDER BY total_goals DESC LIMIT 1) c
                LEFT JOIN (SELECT * FROM previous_season_stats ORDER BY total_goals DESC LIMIT 1) p ON true
            ),
            'season_fantasy', (
                SELECT jsonb_build_object(
                    'change_type',
                    CASE
                        WHEN c.name IS NULL THEN 'new_leader'
                        WHEN c.name = p.name THEN 'remains'
                        WHEN p.name IS NULL THEN 'new_leader'
                        WHEN c.fantasy_points = p.fantasy_points THEN 'tied'
                        ELSE 'overtake'
                    END,
                    'new_leader', c.name,
                    'new_leader_points', c.fantasy_points,
                    'previous_leader', p.name,
                    'previous_leader_points', p.fantasy_points
                )
                FROM (SELECT * FROM current_season_stats ORDER BY fantasy_points DESC LIMIT 1) c
                LEFT JOIN (SELECT * FROM previous_season_stats ORDER BY fantasy_points DESC LIMIT 1) p ON true
            ),
            'half_season_goals', (
                SELECT jsonb_build_object(
                    'change_type',
                    CASE
                        WHEN c.name IS NULL THEN 'new_leader'
                        WHEN c.name = p.name THEN 'remains'
                        WHEN p.name IS NULL THEN 'new_leader'
                        WHEN c.total_goals = p.total_goals THEN 'tied'
                        ELSE 'overtake'
                    END,
                    'new_leader', c.name,
                    'new_leader_goals', c.total_goals,
                    'previous_leader', p.name,
                    'previous_leader_goals', p.total_goals
                )
                FROM (SELECT * FROM current_half_season_stats ORDER BY total_goals DESC LIMIT 1) c
                LEFT JOIN (SELECT * FROM previous_half_season_stats ORDER BY total_goals DESC LIMIT 1) p ON true
            ),
            'half_season_fantasy', (
                SELECT jsonb_build_object(
                    'change_type',
                    CASE
                        WHEN c.name IS NULL THEN 'new_leader'
                        WHEN c.name = p.name THEN 'remains'
                        WHEN p.name IS NULL THEN 'new_leader'
                        WHEN c.fantasy_points = p.fantasy_points THEN 'tied'
                        ELSE 'overtake'
                    END,
                    'new_leader', c.name,
                    'new_leader_points', c.fantasy_points,
                    'previous_leader', p.name,
                    'previous_leader_points', p.fantasy_points
                )
                FROM (SELECT * FROM current_half_season_stats ORDER BY fantasy_points DESC LIMIT 1) c
                LEFT JOIN (SELECT * FROM previous_half_season_stats ORDER BY fantasy_points DESC LIMIT 1) p ON true
            )
        )
    );
END;
$function$
```

---

## 🔧 Postprocess Endpoint: `/api/match-postprocess.ts`

This API route acts as the orchestrator for all post-match processing logic.

**Responsibilities:**
- Call the migrated service functions in the correct order:
  ```ts
  // Ensure correct imports for each service function
  await updateRecentPerformance();
  await updateAllTimeStats();
  await updateSeasonHonours();
  await updateHalfAndFullSeasonStats(); // Derived from handle_match_update
  await updateMatchReportCache();
  ```
- Trigger Conditions: Run this **only after changes to `matches` or `player_matches`**, not `upcoming_matches`.
- **Admin Only:** Access to this endpoint must be restricted to authenticated admin users.
- **Future-Proofing:** While not immediately necessary (due to admin-only access), design with potential future needs in mind:
    - *Batch Processing:* Could the logic be adapted to process multiple match updates at once?
    - *Retries:* Implement robust error handling and consider idempotency to allow for safe retries if a step fails.

---

## ✅ Implementation Notes & Considerations

- **Error Handling:**
    - Each service function (`updateRecentPerformance`, `updateAllTimeStats`, etc.) should handle potential errors gracefully (e.g., database connection issues, calculation errors) and log them appropriately.
    - The main orchestration function in `/api/match-postprocess.ts` should ideally wrap the sequence of service calls in a **database transaction**. If any step fails, the entire transaction should be rolled back to maintain data consistency. If full transactions are complex with the chosen database client/ORM, simulate this by implementing manual rollback logic for each step in case of a failure in a subsequent step.
- **Performance Optimization:**
    - The current plan recalculates many potentially expensive stats (all-time, honours, records) after every single match update.
    - **Future Consideration:** For performance scaling, investigate running computationally intensive calculations less frequently. For example:
        - `updateAllTimeStats` and `updateSeasonHonours` (especially the records part) might only need to run nightly or weekly via a scheduled job, rather than after every match.
        - `updateMatchReportCache` only needs to run if the *most recent* match changes, or if underlying data it depends on (like streaks/milestones included in the report) is updated.
- **Configuration:** Ensure all hardcoded values currently in SQL (fantasy points, streak thresholds, min games played for honours) are externalized into application configuration (e.g., environment variables, config files) in the Node.js implementation.
- **Testing:** Thoroughly test the output of the migrated TypeScript functions against the output of the original Supabase SQL triggers using sample data to ensure accuracy.
- **Logging:** Add detailed logging (including timing for each step) within the post-processing endpoint and service functions to aid debugging and performance monitoring.
- **Trigger Deletion:** Once the migration is complete and thoroughly tested, the original Supabase triggers can be safely deleted.
- **Naming:** Consider renaming `/api/match-postprocess.ts` to something more specific like `/api/admin/postprocess-played-match` to reflect its purpose and access restrictions.

---

## ⚙️ Configuration Values

Several calculation parameters are now stored in the `app_config` table and passed via the `AppConfig` object:

- **Fantasy Points:** `fantasy_win_points`, `fantasy_draw_points`, etc. (Already existed)
- `match_duration_minutes`: Assumed duration of a match for `minutes_per_goal` calculation (Default: 60).
- `hall_of_fame_limit`: Max number of ranked entries per Hall of Fame category (Default: 10).
- `games_required_for_hof`: Minimum games played for a player to be eligible for *any* Hall of Fame category (Default: 50).
- `min_games_for_honours`: Minimum games played in a year for season honours eligibility (Default: 10).
- `min_streak_length`: Minimum length for a streak to be recorded (Default: 3).

Ensure these keys exist in your `app_config` table.

---

