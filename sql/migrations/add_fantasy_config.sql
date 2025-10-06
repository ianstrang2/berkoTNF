-- add_fantasy_config.sql
-- Add new fantasy points configuration options:
-- 1. fantasy_goals_scored_points - Points per goal scored (default: 0)
-- 2. fantasy_heavy_win_threshold - Goal difference for heavy win/loss (default: 4)

-- Add to global defaults
INSERT INTO app_config_defaults (config_key, config_value, config_description, config_group) VALUES
('fantasy_goals_scored_points', '0', 'Points awarded per goal scored by a player', 'fantasy_points'),
('fantasy_heavy_win_threshold', '4', 'Goal difference threshold for heavy win/loss bonus (e.g., 4 means 4+ goal difference)', 'fantasy_points')
ON CONFLICT (config_key) DO NOTHING;

-- Add to all tenant configs
-- Note: Uses dynamic tenant selection to work for single or multiple tenants
INSERT INTO app_config (
  config_key, 
  config_value, 
  config_description, 
  config_group,
  display_name,
  display_group,
  sort_order,
  tenant_id
)
SELECT 
  'fantasy_goals_scored_points', 
  '0', 
  'Points awarded per goal scored by a player', 
  'fantasy_points',
  'Goals Scored Points',
  'Fantasy Points',
  90,
  tenant_id
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM app_config 
  WHERE config_key = 'fantasy_goals_scored_points' 
  AND app_config.tenant_id = tenants.tenant_id
);

INSERT INTO app_config (
  config_key, 
  config_value, 
  config_description, 
  config_group,
  display_name,
  display_group,
  sort_order,
  tenant_id
)
SELECT 
  'fantasy_heavy_win_threshold', 
  '4', 
  'Goal difference threshold for heavy win/loss bonus (e.g., 4 means 4+ goal difference)', 
  'fantasy_points',
  'Heavy Win Threshold',
  'Fantasy Points',
  91,
  tenant_id
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM app_config 
  WHERE config_key = 'fantasy_heavy_win_threshold' 
  AND app_config.tenant_id = tenants.tenant_id
);

-- Verify the config was added
SELECT config_key, config_value, display_name, display_group, sort_order
FROM app_config 
WHERE config_key IN ('fantasy_goals_scored_points', 'fantasy_heavy_win_threshold')
ORDER BY sort_order;
