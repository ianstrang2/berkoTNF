CREATE OR REPLACE FUNCTION handle_match_update()
RETURNS TRIGGER AS $$
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
            mps.player_id,
            COUNT(*) as games,
            COUNT(*) FILTER (WHERE mps.result = 'W') as wins,
            COUNT(*) FILTER (WHERE mps.result = 'D') as draws,
            COUNT(*) FILTER (WHERE mps.result = 'L') as losses,
            SUM(mps.goals) as total_goals,
            COUNT(*) FILTER (WHERE mps.goal_difference >= 3 AND mps.result = 'W') as heavy_wins,
            COUNT(*) FILTER (WHERE mps.goal_difference <= -3 AND mps.result = 'L') as heavy_losses,
            COUNT(*) FILTER (WHERE mps.clean_sheet = true AND mps.result = 'W') as clean_sheet_wins,
            COUNT(*) FILTER (WHERE mps.clean_sheet = true AND mps.result = 'D') as clean_sheet_draws,
            COUNT(*) FILTER (WHERE mps.clean_sheet = true AND mps.result = 'W' AND mps.goal_difference >= 3) as heavy_clean_sheet_wins,
            COUNT(*) FILTER (WHERE mps.clean_sheet = true) as clean_sheets
        FROM match_player_stats mps
        JOIN players p ON mps.player_id = p.player_id
        WHERE mps.match_date BETWEEN half_season_start AND half_season_end
          AND p.is_ringer = false
        GROUP BY mps.player_id
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
                mps.player_id,
                COUNT(*) as games,
                COUNT(*) FILTER (WHERE mps.result = 'W') as wins,
                COUNT(*) FILTER (WHERE mps.result = 'D') as draws,
                COUNT(*) FILTER (WHERE mps.result = 'L') as losses,
                SUM(mps.goals) as total_goals,
                COUNT(*) FILTER (WHERE mps.goal_difference >= 3 AND mps.result = 'W') as heavy_wins,
                COUNT(*) FILTER (WHERE mps.goal_difference <= -3 AND mps.result = 'L') as heavy_losses,
                COUNT(*) FILTER (WHERE mps.clean_sheet = true AND mps.result = 'W') as clean_sheet_wins,
                COUNT(*) FILTER (WHERE mps.clean_sheet = true AND mps.result = 'D') as clean_sheet_draws,
                COUNT(*) FILTER (WHERE mps.clean_sheet = true AND mps.result = 'W' AND mps.goal_difference >= 3) as heavy_clean_sheet_wins,
                COUNT(*) FILTER (WHERE mps.clean_sheet = true) as clean_sheets
            FROM match_player_stats mps
            JOIN players p ON mps.player_id = p.player_id
            WHERE mps.match_date BETWEEN season_start AND season_end
              AND p.is_ringer = false
            GROUP BY mps.player_id
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
        ON CONFLICT (player_id, season_start_date)
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
$$ LANGUAGE plpgsql; 