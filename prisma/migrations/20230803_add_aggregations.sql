-- Add PostgreSQL stored procedures and triggers for pre-aggregation

-- Function to update season stats aggregation
CREATE OR REPLACE FUNCTION update_season_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete any existing season stats that include the modified match date
  DELETE FROM "aggregated_season_stats"
  WHERE season_start_date <= NEW.match_date AND season_end_date >= NEW.match_date;
  
  -- Recalculate all potential season periods that include this match
  -- For simplicity, we're updating the current half-season and full season
  -- Current half-season (last 6 months)
  INSERT INTO "aggregated_season_stats" (
    player_id, season_start_date, season_end_date, 
    games_played, wins, draws, losses, goals, 
    heavy_wins, heavy_losses, clean_sheets, 
    win_percentage, fantasy_points, points_per_game
  )
  SELECT 
    p.player_id,
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')::date as season_start_date,
    CURRENT_DATE as season_end_date,
    COUNT(*) as games_played,
    COUNT(CASE WHEN pm.result = 'win' THEN 1 END) as wins,
    COUNT(CASE WHEN pm.result = 'draw' THEN 1 END) as draws,
    COUNT(CASE WHEN pm.result = 'loss' THEN 1 END) as losses,
    SUM(pm.goals) as goals,
    COUNT(CASE WHEN pm.heavy_win = true THEN 1 END) as heavy_wins,
    COUNT(CASE WHEN pm.heavy_loss = true THEN 1 END) as heavy_losses,
    COUNT(CASE 
      WHEN (pm.team = 'A' AND m.team_b_score = 0) OR 
           (pm.team = 'B' AND m.team_a_score = 0) 
      THEN 1 
    END) as clean_sheets,
    CAST(
      (COUNT(CASE WHEN pm.result = 'win' THEN 1 END)::float * 100 / NULLIF(COUNT(*), 0)) 
      AS DECIMAL(5,1)
    ) as win_percentage,
    SUM(
      CASE 
        WHEN pm.result = 'win' AND pm.heavy_win = true AND 
             ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
        THEN 40  -- Heavy Win + Clean Sheet
        WHEN pm.result = 'win' AND pm.heavy_win = true 
        THEN 30  -- Heavy Win
        WHEN pm.result = 'win' AND 
             ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
        THEN 30  -- Win + Clean Sheet
        WHEN pm.result = 'win' 
        THEN 20  -- Win
        WHEN pm.result = 'draw' AND 
             ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
        THEN 20  -- Draw + Clean Sheet
        WHEN pm.result = 'draw' 
        THEN 10  -- Draw
        WHEN pm.result = 'loss' AND pm.heavy_loss = true 
        THEN -20 -- Heavy Loss
        WHEN pm.result = 'loss' 
        THEN -10 -- Loss
        ELSE 0
      END
    ) as fantasy_points,
    CAST(
      SUM(
        CASE 
          WHEN pm.result = 'win' AND pm.heavy_win = true AND 
               ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
          THEN 40
          WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
          WHEN pm.result = 'win' AND 
               ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
          THEN 30
          WHEN pm.result = 'win' THEN 20
          WHEN pm.result = 'draw' AND 
               ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
          THEN 20
          WHEN pm.result = 'draw' THEN 10
          WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
          WHEN pm.result = 'loss' THEN -10
          ELSE 0
        END
      )::float / NULLIF(COUNT(*), 0) AS DECIMAL(5,1)
    ) as points_per_game
  FROM players p
  JOIN player_matches pm ON p.player_id = pm.player_id
  JOIN matches m ON pm.match_id = m.match_id
  WHERE m.match_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')::date
  AND m.match_date <= CURRENT_DATE
  AND p.is_ringer = false
  GROUP BY p.player_id
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
    last_updated = CURRENT_TIMESTAMP;
    
  -- Full season (current calendar year)
  INSERT INTO "aggregated_season_stats" (
    player_id, season_start_date, season_end_date, 
    games_played, wins, draws, losses, goals, 
    heavy_wins, heavy_losses, clean_sheets, 
    win_percentage, fantasy_points, points_per_game
  )
  SELECT 
    p.player_id,
    DATE_TRUNC('year', CURRENT_DATE)::date as season_start_date,
    CURRENT_DATE as season_end_date,
    COUNT(*) as games_played,
    COUNT(CASE WHEN pm.result = 'win' THEN 1 END) as wins,
    COUNT(CASE WHEN pm.result = 'draw' THEN 1 END) as draws,
    COUNT(CASE WHEN pm.result = 'loss' THEN 1 END) as losses,
    SUM(pm.goals) as goals,
    COUNT(CASE WHEN pm.heavy_win = true THEN 1 END) as heavy_wins,
    COUNT(CASE WHEN pm.heavy_loss = true THEN 1 END) as heavy_losses,
    COUNT(CASE 
      WHEN (pm.team = 'A' AND m.team_b_score = 0) OR 
           (pm.team = 'B' AND m.team_a_score = 0) 
      THEN 1 
    END) as clean_sheets,
    CAST(
      (COUNT(CASE WHEN pm.result = 'win' THEN 1 END)::float * 100 / NULLIF(COUNT(*), 0)) 
      AS DECIMAL(5,1)
    ) as win_percentage,
    SUM(
      CASE 
        WHEN pm.result = 'win' AND pm.heavy_win = true AND 
             ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
        THEN 40  -- Heavy Win + Clean Sheet
        WHEN pm.result = 'win' AND pm.heavy_win = true 
        THEN 30  -- Heavy Win
        WHEN pm.result = 'win' AND 
             ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
        THEN 30  -- Win + Clean Sheet
        WHEN pm.result = 'win' 
        THEN 20  -- Win
        WHEN pm.result = 'draw' AND 
             ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
        THEN 20  -- Draw + Clean Sheet
        WHEN pm.result = 'draw' 
        THEN 10  -- Draw
        WHEN pm.result = 'loss' AND pm.heavy_loss = true 
        THEN -20 -- Heavy Loss
        WHEN pm.result = 'loss' 
        THEN -10 -- Loss
        ELSE 0
      END
    ) as fantasy_points,
    CAST(
      SUM(
        CASE 
          WHEN pm.result = 'win' AND pm.heavy_win = true AND 
               ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
          THEN 40
          WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
          WHEN pm.result = 'win' AND 
               ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
          THEN 30
          WHEN pm.result = 'win' THEN 20
          WHEN pm.result = 'draw' AND 
               ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
          THEN 20
          WHEN pm.result = 'draw' THEN 10
          WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
          WHEN pm.result = 'loss' THEN -10
          ELSE 0
        END
      )::float / NULLIF(COUNT(*), 0) AS DECIMAL(5,1)
    ) as points_per_game
  FROM players p
  JOIN player_matches pm ON p.player_id = pm.player_id
  JOIN matches m ON pm.match_id = m.match_id
  WHERE m.match_date >= DATE_TRUNC('year', CURRENT_DATE)::date
  AND m.match_date <= CURRENT_DATE
  AND p.is_ringer = false
  GROUP BY p.player_id
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
    last_updated = CURRENT_TIMESTAMP;
  
  -- Update cache metadata for season stats and honour roll
  INSERT INTO "cache_metadata" (cache_key, last_invalidated, dependency_type)
  VALUES 
    ('season_stats', CURRENT_TIMESTAMP, 'match_result'),
    ('honour_roll', CURRENT_TIMESTAMP, 'match_result')
  ON CONFLICT (cache_key) 
  DO UPDATE SET last_invalidated = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update all-time stats aggregation
CREATE OR REPLACE FUNCTION update_all_time_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all-time stats for affected players
  WITH affected_players AS (
    SELECT DISTINCT player_id 
    FROM player_matches 
    WHERE match_id = NEW.match_id
  )
  DELETE FROM "aggregated_all_time_stats"
  WHERE player_id IN (SELECT player_id FROM affected_players);
  
  -- Recalculate all-time stats for affected players
  INSERT INTO "aggregated_all_time_stats" (
    player_id, games_played, wins, draws, losses, 
    goals, win_percentage, minutes_per_goal, 
    heavy_wins, heavy_win_percentage, 
    heavy_losses, heavy_loss_percentage, 
    clean_sheets, clean_sheet_percentage, 
    fantasy_points, points_per_game
  )
  WITH player_stats AS (
    SELECT 
      p.player_id,
      COUNT(*) as games_played,
      COUNT(CASE WHEN pm.result = 'win' THEN 1 END) as wins,
      COUNT(CASE WHEN pm.result = 'draw' THEN 1 END) as draws,
      COUNT(CASE WHEN pm.result = 'loss' THEN 1 END) as losses,
      SUM(pm.goals) as goals,
      CAST(COUNT(CASE WHEN pm.result = 'win' THEN 1 END)::float * 100 / NULLIF(COUNT(*), 0) AS DECIMAL(5,1)) as win_percentage,
      CAST(COUNT(*) * 60.0 / NULLIF(SUM(pm.goals), 0) AS DECIMAL(5,1)) as minutes_per_goal,
      COUNT(CASE WHEN pm.heavy_win = true THEN 1 END) as heavy_wins,
      CAST(COUNT(CASE WHEN pm.heavy_win = true THEN 1 END)::float * 100 / NULLIF(COUNT(*), 0) AS DECIMAL(5,1)) as heavy_win_percentage,
      COUNT(CASE WHEN pm.heavy_loss = true THEN 1 END) as heavy_losses,
      CAST(COUNT(CASE WHEN pm.heavy_loss = true THEN 1 END)::float * 100 / NULLIF(COUNT(*), 0) AS DECIMAL(5,1)) as heavy_loss_percentage,
      COUNT(CASE WHEN (pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0) THEN 1 END) as clean_sheets,
      CAST(COUNT(CASE WHEN (pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0) THEN 1 END)::float * 100 / NULLIF(COUNT(*), 0) AS DECIMAL(5,1)) as clean_sheet_percentage,
      SUM(
        CASE 
          WHEN pm.result = 'win' AND pm.heavy_win = true AND 
               ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
          THEN 40
          WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
          WHEN pm.result = 'win' AND 
               ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
          THEN 30
          WHEN pm.result = 'win' THEN 20
          WHEN pm.result = 'draw' AND 
               ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
          THEN 20
          WHEN pm.result = 'draw' THEN 10
          WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
          WHEN pm.result = 'loss' THEN -10
          ELSE 0
        END
      ) as fantasy_points
    FROM players p
    JOIN player_matches pm ON p.player_id = pm.player_id
    JOIN matches m ON pm.match_id = m.match_id
    WHERE p.is_ringer = false
    AND p.player_id IN (SELECT player_id FROM player_matches WHERE match_id = NEW.match_id)
    GROUP BY p.player_id
  )
  SELECT 
    player_id,
    games_played,
    wins,
    draws,
    losses,
    goals,
    win_percentage,
    minutes_per_goal,
    heavy_wins,
    heavy_win_percentage,
    heavy_losses,
    heavy_loss_percentage,
    clean_sheets,
    clean_sheet_percentage,
    fantasy_points,
    CAST(fantasy_points::numeric / NULLIF(games_played, 0) AS DECIMAL(5,1)) as points_per_game
  FROM player_stats
  ON CONFLICT (player_id) 
  DO UPDATE SET
    games_played = EXCLUDED.games_played,
    wins = EXCLUDED.wins,
    draws = EXCLUDED.draws,
    losses = EXCLUDED.losses,
    goals = EXCLUDED.goals,
    win_percentage = EXCLUDED.win_percentage,
    minutes_per_goal = EXCLUDED.minutes_per_goal,
    heavy_wins = EXCLUDED.heavy_wins,
    heavy_win_percentage = EXCLUDED.heavy_win_percentage,
    heavy_losses = EXCLUDED.heavy_losses,
    heavy_loss_percentage = EXCLUDED.heavy_loss_percentage,
    clean_sheets = EXCLUDED.clean_sheets,
    clean_sheet_percentage = EXCLUDED.clean_sheet_percentage,
    fantasy_points = EXCLUDED.fantasy_points,
    points_per_game = EXCLUDED.points_per_game,
    last_updated = CURRENT_TIMESTAMP;
  
  -- Update hall of fame data
  -- We'll calculate top performers for different categories
  DELETE FROM "aggregated_hall_of_fame";
  
  -- Most goals all-time
  INSERT INTO "aggregated_hall_of_fame" (category, player_id, value)
  SELECT 'most_goals', p.player_id, CAST(SUM(pm.goals) AS DECIMAL(10,2))
  FROM players p
  JOIN player_matches pm ON p.player_id = pm.player_id
  WHERE p.is_ringer = false
  GROUP BY p.player_id
  ORDER BY SUM(pm.goals) DESC
  LIMIT 10;
  
  -- Best win percentage (min 50 games)
  INSERT INTO "aggregated_hall_of_fame" (category, player_id, value)
  SELECT 'best_win_percentage', p.player_id, 
    CAST(COUNT(CASE WHEN pm.result = 'win' THEN 1 END)::float * 100 / COUNT(*) AS DECIMAL(10,2))
  FROM players p
  JOIN player_matches pm ON p.player_id = pm.player_id
  WHERE p.is_ringer = false
  GROUP BY p.player_id
  HAVING COUNT(*) >= 50
  ORDER BY COUNT(CASE WHEN pm.result = 'win' THEN 1 END)::float * 100 / COUNT(*) DESC
  LIMIT 10;
  
  -- Most fantasy points
  INSERT INTO "aggregated_hall_of_fame" (category, player_id, value)
  SELECT 'most_fantasy_points', p.player_id, 
    CAST(SUM(
      CASE 
        WHEN pm.result = 'win' AND pm.heavy_win = true AND 
             ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
        THEN 40
        WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
        WHEN pm.result = 'win' AND 
             ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
        THEN 30
        WHEN pm.result = 'win' THEN 20
        WHEN pm.result = 'draw' AND 
             ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
        THEN 20
        WHEN pm.result = 'draw' THEN 10
        WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
        WHEN pm.result = 'loss' THEN -10
        ELSE 0
      END
    ) AS DECIMAL(10,2))
  FROM players p
  JOIN player_matches pm ON p.player_id = pm.player_id
  JOIN matches m ON pm.match_id = m.match_id
  WHERE p.is_ringer = false
  GROUP BY p.player_id
  ORDER BY SUM(
    CASE 
      WHEN pm.result = 'win' AND pm.heavy_win = true AND 
           ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
      THEN 40
      WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
      WHEN pm.result = 'win' AND 
           ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
      THEN 30
      WHEN pm.result = 'win' THEN 20
      WHEN pm.result = 'draw' AND 
           ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
      THEN 20
      WHEN pm.result = 'draw' THEN 10
      WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
      WHEN pm.result = 'loss' THEN -10
      ELSE 0
    END
  ) DESC
  LIMIT 10;
  
  -- Update cache metadata for all-time stats, hall of fame, and honour roll
  INSERT INTO "cache_metadata" (cache_key, last_invalidated, dependency_type)
  VALUES 
    ('all_time_stats', CURRENT_TIMESTAMP, 'match_result'),
    ('hall_of_fame', CURRENT_TIMESTAMP, 'match_result'),
    ('honour_roll', CURRENT_TIMESTAMP, 'match_result')
  ON CONFLICT (cache_key) 
  DO UPDATE SET last_invalidated = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update match report cache
CREATE OR REPLACE FUNCTION update_match_report_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Update cache metadata for match report
  INSERT INTO "cache_metadata" (cache_key, last_invalidated, dependency_type)
  VALUES ('match_report', CURRENT_TIMESTAMP, 'match_report')
  ON CONFLICT (cache_key) 
  DO UPDATE SET last_invalidated = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update upcoming match cache
CREATE OR REPLACE FUNCTION update_upcoming_match_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Update cache metadata for upcoming match
  INSERT INTO "cache_metadata" (cache_key, last_invalidated, dependency_type)
  VALUES ('upcoming_match', CURRENT_TIMESTAMP, 'squad_selection')
  ON CONFLICT (cache_key) 
  DO UPDATE SET last_invalidated = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
-- Match updates trigger aggregation recalculation
CREATE TRIGGER match_update_trigger
AFTER INSERT OR UPDATE ON matches
FOR EACH ROW EXECUTE FUNCTION update_season_stats();

CREATE TRIGGER match_stats_update_trigger
AFTER INSERT OR UPDATE ON matches
FOR EACH ROW EXECUTE FUNCTION update_all_time_stats();

-- Player match updates trigger aggregation recalculation
CREATE TRIGGER player_match_update_trigger
AFTER INSERT OR UPDATE ON player_matches
FOR EACH ROW EXECUTE FUNCTION update_season_stats();

CREATE TRIGGER player_match_stats_update_trigger
AFTER INSERT OR UPDATE ON player_matches
FOR EACH ROW EXECUTE FUNCTION update_all_time_stats();

-- Match report changes trigger cache invalidation
CREATE TRIGGER match_report_update_trigger
AFTER INSERT OR UPDATE ON player_matches
FOR EACH ROW EXECUTE FUNCTION update_match_report_cache();

-- Upcoming match player changes trigger cache invalidation
CREATE TRIGGER upcoming_match_update_trigger
AFTER INSERT OR UPDATE OR DELETE ON upcoming_match_players
FOR EACH ROW EXECUTE FUNCTION update_upcoming_match_cache();

-- Initialize the cache metadata
INSERT INTO "cache_metadata" (cache_key, last_invalidated, dependency_type)
VALUES 
  ('season_stats', CURRENT_TIMESTAMP, 'match_result'),
  ('all_time_stats', CURRENT_TIMESTAMP, 'match_result'),
  ('hall_of_fame', CURRENT_TIMESTAMP, 'match_result'),
  ('match_report', CURRENT_TIMESTAMP, 'match_report'),
  ('upcoming_match', CURRENT_TIMESTAMP, 'squad_selection')
ON CONFLICT (cache_key) DO NOTHING;

-- Execute the initial aggregation for existing data
SELECT update_season_stats();
SELECT update_all_time_stats(); 