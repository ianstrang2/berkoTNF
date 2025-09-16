-- sql/helpers.sql
-- Centralized helper functions

-- Function to calculate fantasy points based on match result and config
-- Fetches configuration values directly from app_config table.
CREATE OR REPLACE FUNCTION calculate_match_fantasy_points(
    result TEXT,
    heavy_win BOOLEAN,
    heavy_loss BOOLEAN,
    clean_sheet BOOLEAN
)
RETURNS INT LANGUAGE plpgsql STABLE AS $$
DECLARE
    -- Fantasy Points Config (fetched from app_config with defaults)
    v_win_points INT               := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_win_points'), 20);
    v_draw_points INT              := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_draw_points'), 10);
    v_loss_points INT              := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_loss_points'), -10);
    v_heavy_win_bonus INT          := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_heavy_win_points'), v_win_points + 10) - v_win_points;
    v_heavy_loss_penalty INT       := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_heavy_loss_points'), v_loss_points - 10) - v_loss_points;
    v_cs_win_bonus INT             := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_clean_sheet_win_points'), v_win_points + 10) - v_win_points;
    v_cs_draw_bonus INT            := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_clean_sheet_draw_points'), v_draw_points + 10) - v_draw_points;
    v_heavy_cs_win_bonus INT       := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_heavy_clean_sheet_win_points'), v_win_points + 20) - v_win_points - v_heavy_win_bonus - v_cs_win_bonus;
    points INT := 0;
BEGIN
    -- Fetch config only once (optimization - removed redundant fetches)
    -- Calculation logic remains the same
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
CREATE OR REPLACE FUNCTION get_config_value(p_config_key TEXT, p_default_value TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_config_value TEXT;
BEGIN
    SELECT config_value INTO v_config_value
    FROM app_config
    WHERE config_key = p_config_key;

    RETURN COALESCE(v_config_value, p_default_value);
END;
$$; 