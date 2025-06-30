import { PlayerProfile, PlayerInPool, PlayerWithStats, PlayerWithGoalStats, Club } from '@/types/player.types';

/**
 * Transforms a database club object (or JSON string) into a canonical Club object.
 * @param dbClub - The raw club data from the database.
 * @returns A canonical Club object or null.
 */
const transformClubFromDb = (dbClub: any): Club | null => {
  if (!dbClub) return null;
  // Handle cases where club data is a JSON string
  const clubData = typeof dbClub === 'string' ? JSON.parse(dbClub) : dbClub;
  if (!clubData || !clubData.filename) return null;

  return {
    id: clubData.id || 0, // The ID might not always be present in every query
    name: clubData.name,
    filename: clubData.filename,
  };
};

/**
 * Transforms a raw database player object into a canonical PlayerProfile object.
 * This function handles the snake_case to camelCase conversion and provides default values.
 * @param dbPlayer - The raw player object from the database.
 * @returns A canonical PlayerProfile object.
 */
const transformBasePlayerFromDb = (dbPlayer: any): Omit<PlayerProfile, 'id' | 'name'> & { id: string; name: string } => {
    const rawId = dbPlayer.id ?? dbPlayer.player_id;
    return {
        id: String(rawId),
        name: dbPlayer.name,
        isRinger: dbPlayer.is_ringer ?? false,
        isRetired: dbPlayer.is_retired ?? false,
        club: transformClubFromDb(dbPlayer.selected_club),
        goalscoring: dbPlayer.goalscoring ?? 0,
        defending: dbPlayer.defending ?? 0,
        staminaPace: dbPlayer.stamina_pace ?? 0,
        control: dbPlayer.control ?? 0,
        teamwork: dbPlayer.teamwork ?? 0,
        resilience: dbPlayer.resilience ?? 0,
    }
}

/**
 * Converts a raw database player object to the canonical PlayerProfile type.
 */
export const toPlayerProfile = (dbPlayer: any): PlayerProfile => {
  return transformBasePlayerFromDb(dbPlayer);
};

/**
 * Converts a raw database player object (from a join with upcoming_match_players) 
 * to the canonical PlayerInPool type.
 */
export const toPlayerInPool = (dbUpcomingMatchPlayer: any): PlayerInPool => {
  const dbPlayer = dbUpcomingMatchPlayer.player;
  if (!dbPlayer) {
    throw new Error('Invalid dbUpcomingMatchPlayer object: missing nested player data.');
  }
  const baseProfile = transformBasePlayerFromDb(dbPlayer);

  return {
    ...baseProfile,
    responseStatus: dbUpcomingMatchPlayer.response_status || 'PENDING',
    // Carry over slot-specific details from the upcoming_match_players table
    slot_number: dbUpcomingMatchPlayer.slot_number,
    team: dbUpcomingMatchPlayer.team,
    position: dbUpcomingMatchPlayer.position
  };
};

/**
 * Converts a raw database player object to the canonical PlayerWithStats type.
 */
export const toPlayerWithStats = (dbPlayer: any): PlayerWithStats => {
  return {
    ...transformBasePlayerFromDb(dbPlayer),
    gamesPlayed: dbPlayer.games_played ?? 0,
    wins: dbPlayer.wins ?? 0,
    draws: dbPlayer.draws ?? 0,
    losses: dbPlayer.losses ?? 0,
    goals: dbPlayer.goals ?? 0,
    heavyWins: dbPlayer.heavy_wins ?? 0,
    heavyLosses: dbPlayer.heavy_losses ?? 0,
    cleanSheets: dbPlayer.clean_sheets ?? 0,
    winPercentage: dbPlayer.win_percentage ?? 0,
    fantasyPoints: dbPlayer.fantasy_points ?? 0,
    pointsPerGame: dbPlayer.points_per_game ?? 0,
    minutesPerGoal: dbPlayer.minutes_per_goal ?? 0,
    heavyWinPercentage: dbPlayer.heavy_win_percentage ?? 0,
    heavyLossPercentage: dbPlayer.heavy_loss_percentage ?? 0,
    cleanSheetPercentage: dbPlayer.clean_sheet_percentage ?? 0,
  };
};

/**
 * Converts a raw database player object to the canonical PlayerWithGoalStats type.
 */
export const toPlayerWithGoalStats = (dbPlayer: any): PlayerWithGoalStats => {
    return {
        ...transformBasePlayerFromDb(dbPlayer),
        totalGoals: dbPlayer.total_goals ?? 0,
        minutesPerGoal: dbPlayer.minutes_per_goal ?? 0,
        lastFiveGames: dbPlayer.last_five_games ?? '',
        maxGoalsInGame: dbPlayer.max_goals_in_game ?? 0,
    };
}; 