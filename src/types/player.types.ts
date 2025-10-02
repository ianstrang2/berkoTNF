/**
 * Represents a player's football club.
 * This is the canonical definition to be used across the application.
 */
export interface Club {
  id: number;
  name: string;
  filename: string;
}

/**
 * The absolute base representation of a player, corresponding to the `players` table.
 * This is the single source of truth for a player's core profile and attributes.
 * Properties are in camelCase. Player ID is a string.
 */
export interface PlayerProfile {
  id: string;
  name: string;
  phone?: string | null;
  isRinger: boolean;
  isRetired: boolean;
  club?: Club | null;
  // Core attributes
  goalscoring: number;
  defending: number;
  staminaPace: number;
  control: number;
  teamwork: number;
  resilience: number;
}

/**
 * A player in the context of a match pool, extending the base profile.
 * Includes match-specific status information.
 */
export interface PlayerInPool extends PlayerProfile {
  responseStatus: 'IN' | 'OUT' | 'MAYBE' | 'PENDING';
  // Note: player_id is now `id` from the extended PlayerProfile type.
  pool_id?: number; // Optional: ID from the match_player_pool table
  team?: 'A' | 'B' | 'Unassigned'; // Optional: Team assignment after balancing
  slot_number?: number; // Optional: Slot number after team assignment
  position?: string; // Optional: Position after team assignment
}

/**
 * Represents a player with their calculated statistics for a given season or period.
 * Extends the base profile with performance metrics.
 * All properties are camelCase.
 */
export interface PlayerWithStats extends PlayerProfile {
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  heavyWins: number;
  heavyLosses: number;
  cleanSheets: number;
  winPercentage: number;
  fantasyPoints: number;
  pointsPerGame: number;
  // Leaderboard-specific
  minutesPerGoal: number;
  heavyWinPercentage: number;
  heavyLossPercentage: number;
  cleanSheetPercentage: number;
}

/**
 * Represents a player with their calculated goal-scoring statistics.
 * Extends the base profile with goal-specific metrics.
 * All properties are camelCase.
 */
export interface PlayerWithGoalStats extends PlayerProfile {
  totalGoals: number;
  minutesPerGoal: number;
  lastFiveGames: string;
  maxGoalsInGame: number;
}

export interface PlayerWithTrend extends PlayerProfile {
  trend_rating: number | null;
  trend_goal_threat: number | null;
  trend_participation: number | null;
  power_rating_percentile: number | null;
  goal_threat_percentile: number | null;
  participation_percentile: number | null;
} 