import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define a type for the configuration object for better type safety
export type AppConfig = {
  [key: string]: string | number | boolean; // Adjust types as needed based on actual config values
};

// Default values matching those in the SQL functions
const defaultConfig: AppConfig = {
  fantasy_win_points: 20,
  fantasy_draw_points: 10,
  fantasy_loss_points: -10,
  fantasy_heavy_win_points: 30,
  fantasy_clean_sheet_win_points: 30,
  fantasy_heavy_clean_sheet_win_points: 40,
  fantasy_clean_sheet_draw_points: 20,
  fantasy_heavy_loss_points: -20,
  win_streak_threshold: 4,
  unbeaten_streak_threshold: 6,
  loss_streak_threshold: 4,
  winless_streak_threshold: 6,
  goal_streak_threshold: 3,
  game_milestone_threshold: 50,
  goal_milestone_threshold: 50,
  // Add other config keys and their defaults here
};

/**
 * Fetches all configuration key-value pairs from the app_config table.
 * Merges fetched values with defaults, ensuring all expected keys are present.
 * Attempts to parse numeric values.
 * @returns {Promise<AppConfig>} A promise that resolves to the application configuration object.
 */
export async function getAppConfig(): Promise<AppConfig> {
  try {
    const dbConfig = await prisma.app_config.findMany();

    const configMap: AppConfig = { ...defaultConfig }; // Start with defaults

    dbConfig.forEach(item => {
      const key = item.config_key;
      const value = item.config_value;

      // Attempt to parse numeric values, otherwise keep as string
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        configMap[key] = numValue;
      } else if (value?.toLowerCase() === 'true') {
        configMap[key] = true;
      } else if (value?.toLowerCase() === 'false') {
        configMap[key] = false;
      }
       else if (value) {
         configMap[key] = value; // Keep as string if not numeric or boolean
       }
      // If value is null/undefined in DB, the default remains
    });

    // Ensure all default keys are present, even if not in DB
    Object.keys(defaultConfig).forEach(key => {
        if (!(key in configMap)) {
            configMap[key] = defaultConfig[key];
        }
    });


    return configMap;
  } catch (error) {
    console.error("Error fetching app configuration:", error);
    // In case of error fetching config, return defaults to allow graceful degradation
    console.warn("Falling back to default application configuration.");
    return { ...defaultConfig };
  }
}

// Optional: Consider adding a simple in-memory cache with a TTL
// if fetching config on every request becomes a performance bottleneck.
// For now, fetching per request ensures up-to-date values. 