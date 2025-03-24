-- App Configuration Tables

-- Main app_config table for general settings
CREATE TABLE app_config (
    config_id SERIAL PRIMARY KEY,
    config_key VARCHAR(50) NOT NULL UNIQUE,
    config_value VARCHAR(255) NOT NULL,
    config_description TEXT NOT NULL,
    config_group VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Team size templates 
CREATE TABLE team_size_templates (
    template_id SERIAL PRIMARY KEY,
    team_size INTEGER NOT NULL CHECK (team_size BETWEEN 5 AND 11),
    name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    team_a_name VARCHAR(50) NOT NULL DEFAULT 'Orange',
    team_b_name VARCHAR(50) NOT NULL DEFAULT 'Green',
    defenders_per_team INTEGER NOT NULL,
    midfielders_per_team INTEGER NOT NULL,
    attackers_per_team INTEGER NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_size, is_default)
);

-- Balance algorithm weights for each team size template
CREATE TABLE team_balance_weights (
    weight_id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES team_size_templates(template_id) ON DELETE CASCADE,
    position_group VARCHAR(20) NOT NULL CHECK (position_group IN ('defense', 'midfield', 'attack', 'team')),
    attribute VARCHAR(20) NOT NULL,
    weight DECIMAL(5,2) NOT NULL CHECK (weight BETWEEN 0 AND 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, position_group, attribute)
);

-- Upcoming matches table
CREATE TABLE upcoming_matches (
    upcoming_match_id SERIAL PRIMARY KEY,
    match_date DATE NOT NULL,
    team_size INTEGER NOT NULL DEFAULT 9 CHECK (team_size BETWEEN 5 AND 11),
    team_a_name VARCHAR(50) NOT NULL DEFAULT 'Orange',
    team_b_name VARCHAR(50) NOT NULL DEFAULT 'Green',
    is_balanced BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Players assigned to upcoming matches
CREATE TABLE upcoming_match_players (
    upcoming_player_id SERIAL PRIMARY KEY,
    upcoming_match_id INTEGER NOT NULL REFERENCES upcoming_matches(upcoming_match_id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    team CHAR(1) CHECK (team IN ('A', 'B')),
    position VARCHAR(20) CHECK (position IN ('defender', 'midfielder', 'attacker')),
    slot_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(upcoming_match_id, player_id)
);

-- Insert default values for app_config
INSERT INTO app_config (config_key, config_value, config_description, config_group) VALUES
-- Match Settings
('days_between_matches', '7', 'Default number of days between matches', 'match_settings'),
('default_team_size', '9', 'Default team size (players per team)', 'match_settings'),

-- Fantasy Points
('fantasy_win_points', '20', 'Fantasy points for a win', 'fantasy_points'),
('fantasy_draw_points', '10', 'Fantasy points for a draw', 'fantasy_points'),
('fantasy_loss_points', '-10', 'Fantasy points for a loss', 'fantasy_points'),
('fantasy_heavy_win_points', '30', 'Fantasy points for a heavy win', 'fantasy_points'),
('fantasy_clean_sheet_win_points', '30', 'Fantasy points for a clean sheet win', 'fantasy_points'),
('fantasy_heavy_clean_sheet_win_points', '40', 'Fantasy points for a heavy win with clean sheet', 'fantasy_points'),
('fantasy_clean_sheet_draw_points', '20', 'Fantasy points for a clean sheet draw', 'fantasy_points'),
('fantasy_heavy_loss_points', '-20', 'Fantasy points for a heavy loss', 'fantasy_points'),

-- Match Report Streaks
('win_streak_threshold', '4', 'Consecutive wins needed to highlight win streak', 'match_report'),
('loss_streak_threshold', '4', 'Consecutive losses needed to highlight loss streak', 'match_report'),
('unbeaten_streak_threshold', '6', 'Consecutive matches without a loss to highlight unbeaten streak', 'match_report'),
('winless_streak_threshold', '6', 'Consecutive matches without a win to highlight winless streak', 'match_report'),
('goal_streak_threshold', '3', 'Consecutive matches with at least one goal to highlight goal streak', 'match_report'),
('game_milestone_threshold', '50', 'Number of games for celebrating milestones (in multiples)', 'match_report'),
('goal_milestone_threshold', '50', 'Number of goals for celebrating milestones (in multiples)', 'match_report');

-- Insert default team size templates
INSERT INTO team_size_templates (team_size, name, description, defenders_per_team, midfielders_per_team, attackers_per_team, is_default) VALUES
(5, '5-a-side', '5 players per team format', 1, 3, 1, TRUE),
(6, '6-a-side', '6 players per team format', 2, 3, 1, TRUE),
(7, '7-a-side', '7 players per team format', 2, 3, 2, TRUE),
(8, '8-a-side', '8 players per team format', 3, 3, 2, TRUE),
(9, '9-a-side', '9 players per team format', 3, 4, 2, TRUE),
(11, '11-a-side', '11 players per team format', 4, 4, 3, TRUE);

-- Insert default balance weights for the 9-a-side template (current implementation)
WITH nine_template AS (SELECT template_id FROM team_size_templates WHERE team_size = 9 AND is_default = TRUE)
INSERT INTO team_balance_weights (template_id, position_group, attribute, weight) VALUES
-- Defense weights - 9-a-side
((SELECT template_id FROM nine_template), 'defense', 'stamina_pace', 0.5),
((SELECT template_id FROM nine_template), 'defense', 'control', 0.5),

-- Midfield weights - 9-a-side
((SELECT template_id FROM nine_template), 'midfield', 'control', 0.33),
((SELECT template_id FROM nine_template), 'midfield', 'stamina_pace', 0.33),
((SELECT template_id FROM nine_template), 'midfield', 'goalscoring', 0.34),

-- Attack weights - 9-a-side
((SELECT template_id FROM nine_template), 'attack', 'goalscoring', 0.5),
((SELECT template_id FROM nine_template), 'attack', 'stamina_pace', 0.25),
((SELECT template_id FROM nine_template), 'attack', 'control', 0.25),

-- Team-wide attributes - 9-a-side
((SELECT template_id FROM nine_template), 'team', 'resilience', 0.1),
((SELECT template_id FROM nine_template), 'team', 'teamwork', 0.1);

-- Clone the weights for other templates
INSERT INTO team_balance_weights (template_id, position_group, attribute, weight)
SELECT t.template_id, w.position_group, w.attribute, w.weight
FROM team_size_templates t
CROSS JOIN team_balance_weights w
JOIN nine_template nt ON w.template_id = nt.template_id
WHERE t.template_id != (SELECT template_id FROM nine_template);

-- Create indexes for performance
CREATE INDEX idx_app_config_group ON app_config(config_group);
CREATE INDEX idx_team_size_templates_size ON team_size_templates(team_size);
CREATE INDEX idx_upcoming_matches_date ON upcoming_matches(match_date);
CREATE INDEX idx_upcoming_match_players_match_id ON upcoming_match_players(upcoming_match_id);
CREATE INDEX idx_upcoming_match_players_player_id ON upcoming_match_players(player_id); 