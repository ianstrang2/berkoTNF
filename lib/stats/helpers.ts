import { prisma } from '../db';
import type { player_matches, matches, app_config } from '@prisma/client';

// Define the expected structure for the formatted config
export interface FormattedAppConfig {
  [key: string]: number | string | boolean | undefined;
  points_win?: number;
  points_draw?: number;
  points_loss?: number;
  points_heavy_win?: number;
  points_clean_sheet_win?: number;
  points_heavy_win_clean_sheet?: number;
  points_clean_sheet_draw?: number;
  points_heavy_loss?: number;
  // Add other expected numeric config keys here if needed
}

/**
 * Calculates fantasy points for a given player match based on the structured configuration.
 * Provides fallback logic if specific config values are missing.
 */
export function calculateFantasyPointsForMatch(
  pm: player_matches & { matches?: matches | null }, 
  config: FormattedAppConfig | null // Use the structured config type
): number {
  // Keep guards for player match data
  if (!pm.matches || !pm.result) {
    console.warn("Incomplete match data for fantasy points calculation", {
      matchId: pm.match_id,
      playerId: pm.player_id,
      hasMatches: !!pm.matches,
      hasResult: !!pm.result
    });
    return 0;
  }

  // Guard for config availability
  if (!config) {
    console.warn("Config not available for fantasy points calculation for match", pm.match_id);
    // Optionally proceed with hardcoded fallbacks only, or return 0
    // Let's proceed with fallbacks for now
    config = {}; // Use an empty object so getPoint still works
  }

  let points = 0;
  const isCleanSheet = (pm.team === 'A' && pm.matches.team_b_score === 0) ||
                       (pm.team === 'B' && pm.matches.team_a_score === 0);

  // Define fallback points
  const fbWin = 20;
  const fbDraw = 10;
  const fbLoss = -10;
  const fbHeavyWin = 30;
  const fbCleanWin = 30;
  const fbHeavyCleanWin = 40;
  const fbCleanDraw = 20;
  const fbHeavyLoss = -20;

  // Helper to get config value (as number) or fallback
  const getPoint = (key: keyof FormattedAppConfig, fallback: number): number => {
    const value = config![key]; // Use non-null assertion as we handled null case
    // Ensure the retrieved value is treated as a number
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return typeof numValue === 'number' && !isNaN(numValue) ? numValue : fallback;
  };

  if (pm.result === 'win') {
    if (pm.heavy_win && isCleanSheet) {
      points += getPoint('points_heavy_win_clean_sheet', fbHeavyCleanWin);
    } else if (pm.heavy_win) {
      points += getPoint('points_heavy_win', fbHeavyWin);
    } else if (isCleanSheet) {
      points += getPoint('points_clean_sheet_win', fbCleanWin);
    } else {
      points += getPoint('points_win', fbWin);
    }
  } else if (pm.result === 'draw') {
    if (isCleanSheet) {
      points += getPoint('points_clean_sheet_draw', fbCleanDraw);
    } else {
      points += getPoint('points_draw', fbDraw);
    }
  } else if (pm.result === 'loss') {
    if (pm.heavy_loss) {
      points += getPoint('points_heavy_loss', fbHeavyLoss);
    } else {
      points += getPoint('points_loss', fbLoss);
    }
  }
  return points;
}

/**
 * Fetches the application configuration from the database and structures it.
 */
export async function fetchStructuredConfig(): Promise<FormattedAppConfig | null> {
  try {
    const configRows = await prisma.app_config.findMany();
    const formattedConfig: FormattedAppConfig = {};
    
    for (const row of configRows) {
      if (row.config_key && row.config_value !== null && row.config_value !== undefined) {
         // Attempt to parse numeric values, otherwise use the raw value (could be string/boolean)
         const numValue = parseFloat(row.config_value);
         formattedConfig[row.config_key] = !isNaN(numValue) ? numValue : row.config_value;
         // Add more sophisticated type parsing if needed (e.g., for specific boolean keys)
         // if (row.config_key === 'some_boolean_key') {
         //   formattedConfig[row.config_key] = row.config_value.toLowerCase() === 'true';
         // }
      }
    }
    
    // Validate essential keys if necessary
    // if (formattedConfig.points_win === undefined) { ... }

    return formattedConfig;
  } catch (error) {
    console.error("Error fetching structured app config:", error);
    return null;
  }
}

/**
 * Formats a player name to 'F. Lastname' or returns the original name if format doesn't apply.
 */
export function formatPlayerName(name: string | null | undefined): string {
  if (!name) return 'Unknown Player';
  const nameParts = name.trim().split(' ');
  if (nameParts.length > 1 && nameParts[0].length > 0) {
    // Join all parts except the first one as the last name
    const lastName = nameParts.slice(1).join(' ');
    return `${nameParts[0].charAt(0)}. ${lastName}`;
  }
  // Handle single names or names without spaces
  return name;
} 