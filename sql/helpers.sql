-- sql/helpers.sql
-- Centralized helper functions

-- Function to calculate fantasy points based on match result and config
-- Fetches configuration values directly from app_config table.
-- UPDATED: Now calculates heavy_win/heavy_loss on-the-fly from goal_difference
-- UPDATED: Added attendance parameter for attendance points
CREATE OR REPLACE FUNCTION calculate_match_fantasy_points(
    result TEXT,
    goal_difference INT,           -- CHANGED: from heavy_win/heavy_loss booleans
    clean_sheet BOOLEAN,
    goals_scored INT DEFAULT 0,    -- NEW: goals scored by player
    target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID,
    attendance BOOLEAN DEFAULT true -- NEW: attendance bonus (true for all players in player_matches)
)
RETURNS INT LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_win_points INT;
    v_draw_points INT;
    v_loss_points INT;
    v_heavy_win_bonus INT;
    v_heavy_loss_penalty INT;
    v_cs_win_bonus INT;
    v_cs_draw_bonus INT;
    v_heavy_cs_win_bonus INT;
    v_goals_scored_points INT;
    v_attendance_points INT;
    v_heavy_win_threshold INT;
    heavy_win BOOLEAN;
    heavy_loss BOOLEAN;
    points INT := 0;
BEGIN
    -- Phase 2: Set RLS context for this function (required for prisma_app role)
    PERFORM set_config('app.tenant_id', target_tenant_id::text, false);
    
    -- Fetch Fantasy Points Config from app_config with defaults (tenant-scoped)
    v_win_points               := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_win_points' AND tenant_id = target_tenant_id LIMIT 1), 20);
    v_draw_points              := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_draw_points' AND tenant_id = target_tenant_id LIMIT 1), 10);
    v_loss_points              := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_loss_points' AND tenant_id = target_tenant_id LIMIT 1), -10);
    v_heavy_win_bonus          := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_heavy_win_points' AND tenant_id = target_tenant_id LIMIT 1), v_win_points + 10) - v_win_points;
    v_heavy_loss_penalty       := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_heavy_loss_points' AND tenant_id = target_tenant_id LIMIT 1), v_loss_points - 10) - v_loss_points;
    v_cs_win_bonus             := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_clean_sheet_win_points' AND tenant_id = target_tenant_id LIMIT 1), v_win_points + 10) - v_win_points;
    v_cs_draw_bonus            := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_clean_sheet_draw_points' AND tenant_id = target_tenant_id LIMIT 1), v_draw_points + 10) - v_draw_points;
    v_heavy_cs_win_bonus       := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_heavy_clean_sheet_win_points' AND tenant_id = target_tenant_id LIMIT 1), v_win_points + 20) - v_win_points - v_heavy_win_bonus - v_cs_win_bonus;
    v_goals_scored_points      := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_goals_scored_points' AND tenant_id = target_tenant_id LIMIT 1), 0);
    v_attendance_points        := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_attendance_points' AND tenant_id = target_tenant_id LIMIT 1), 10);
    v_heavy_win_threshold      := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_heavy_win_threshold' AND tenant_id = target_tenant_id LIMIT 1), 4);
    
    -- Calculate heavy_win/heavy_loss from goal_difference and threshold
    heavy_win := (result = 'win' AND ABS(goal_difference) >= v_heavy_win_threshold);
    heavy_loss := (result = 'loss' AND ABS(goal_difference) >= v_heavy_win_threshold);
    
    -- Calculation logic (same as before)
    IF result = 'win' THEN
        points := v_win_points;
        IF heavy_win THEN points := points + v_heavy_win_bonus; END IF;
        IF clean_sheet THEN points := points + v_cs_win_bonus; END IF;
        IF heavy_win AND clean_sheet THEN points := points + v_heavy_cs_win_bonus; END IF;
    ELSIF result = 'draw' THEN
        points := v_draw_points;
        IF clean_sheet THEN points := points + v_cs_draw_bonus; END IF;
    ELSIF result = 'loss' THEN
        points := v_loss_points;
        IF heavy_loss THEN points := points + v_heavy_loss_penalty; END IF;
    END IF;

    -- Add points for goals scored
    points := points + (goals_scored * v_goals_scored_points);

    -- NEW: Add attendance points
    IF attendance THEN
        points := points + v_attendance_points;
    END IF;

    RETURN points;
END;
$$;

-- Add other potential helper functions below, e.g., for calculating season dates

-- Function to get current season start date (uses seasons table)
CREATE OR REPLACE FUNCTION get_current_season_start_date()
RETURNS DATE LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
        (SELECT start_date FROM seasons WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1),
        MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, 1, 1) -- Fallback to calendar year
    );
$$;

-- Function to get current half-season start date (uses seasons table)
CREATE OR REPLACE FUNCTION get_current_half_season_start_date()
RETURNS DATE LANGUAGE sql STABLE AS $$
    SELECT CASE
        WHEN CURRENT_DATE <= (SELECT half_date FROM seasons WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1) 
        THEN (SELECT start_date FROM seasons WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1)
        ELSE (SELECT half_date + INTERVAL '1 day' FROM seasons WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1)::DATE
    END;
$$;

-- Function to get current half-season end date (uses seasons table)
CREATE OR REPLACE FUNCTION get_current_half_season_end_date()
RETURNS DATE LANGUAGE sql STABLE AS $$
    SELECT CASE
        WHEN CURRENT_DATE <= (SELECT half_date FROM seasons WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1)
        THEN (SELECT half_date FROM seasons WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1)
        ELSE (SELECT end_date FROM seasons WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1)
    END;
$$;

-- Function to fetch a single config value with default
CREATE OR REPLACE FUNCTION get_config_value(p_config_key TEXT, p_default_value TEXT, target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_config_value TEXT;
BEGIN
    -- Phase 2: Set RLS context for this function (required for prisma_app role)
    PERFORM set_config('app.tenant_id', target_tenant_id::text, false);
    
    SELECT config_value INTO v_config_value
    FROM app_config
    WHERE config_key = p_config_key AND tenant_id = target_tenant_id
    LIMIT 1;

    RETURN COALESCE(v_config_value, p_default_value);
END;
$$; 