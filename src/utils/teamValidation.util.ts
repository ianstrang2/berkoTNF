import { PlayerInPool } from '@/types/player.types';

/**
 * Checks if all team slots are properly filled for both teams
 * @param players - Array of all players in the match
 * @param actualSizeA - Required size for team A
 * @param actualSizeB - Required size for team B
 * @returns true if all slots are filled, false otherwise
 */
export function areAllSlotsFilled(
  players: PlayerInPool[], 
  actualSizeA?: number, 
  actualSizeB?: number
): boolean {
  if (!players || players.length === 0) return false;
  if (!actualSizeA || !actualSizeB) return false;

  const teamAPlayers = players.filter(p => p.team === 'A');
  const teamBPlayers = players.filter(p => p.team === 'B');

  // Check if we have the right number of players on each team
  if (teamAPlayers.length !== actualSizeA || teamBPlayers.length !== actualSizeB) {
    return false;
  }

  // Check if all team players have valid slot assignments
  const teamASlots = teamAPlayers.map(p => p.slot_number).filter(slot => slot !== undefined);
  const teamBSlots = teamBPlayers.map(p => p.slot_number).filter(slot => slot !== undefined);

  if (teamASlots.length !== actualSizeA || teamBSlots.length !== actualSizeB) {
    return false;
  }

  // Check for duplicate slots within each team
  const uniqueTeamASlots = new Set(teamASlots);
  const uniqueTeamBSlots = new Set(teamBSlots);

  if (uniqueTeamASlots.size !== actualSizeA || uniqueTeamBSlots.size !== actualSizeB) {
    return false;
  }

  // Check if slot numbers are within valid range (1 to team size)
  const validTeamASlots = teamASlots.every(slot => slot && slot >= 1 && slot <= actualSizeA);
  const validTeamBSlots = teamBSlots.every(slot => slot && slot >= 1 && slot <= actualSizeB);

  return validTeamASlots && validTeamBSlots;
}

/**
 * Gets a human-readable description of what's missing for team completion
 * @param players - Array of all players in the match
 * @param actualSizeA - Required size for team A
 * @param actualSizeB - Required size for team B
 * @returns Description of what's needed to complete teams
 */
export function getTeamCompletionStatus(
  players: PlayerInPool[], 
  actualSizeA?: number, 
  actualSizeB?: number
): string {
  if (!actualSizeA || !actualSizeB) return "Team sizes not set";

  const teamAPlayers = players.filter(p => p.team === 'A');
  const teamBPlayers = players.filter(p => p.team === 'B');

  if (teamAPlayers.length < actualSizeA && teamBPlayers.length < actualSizeB) {
    const neededA = actualSizeA - teamAPlayers.length;
    const neededB = actualSizeB - teamBPlayers.length;
    return `Need ${neededA} more for Orange, ${neededB} more for Green`;
  }

  if (teamAPlayers.length < actualSizeA) {
    const needed = actualSizeA - teamAPlayers.length;
    return `Need ${needed} more player${needed > 1 ? 's' : ''} for Orange`;
  }

  if (teamBPlayers.length < actualSizeB) {
    const needed = actualSizeB - teamBPlayers.length;
    return `Need ${needed} more player${needed > 1 ? 's' : ''} for Green`;
  }

  // Check for missing slot assignments
  const teamAWithoutSlots = teamAPlayers.filter(p => !p.slot_number);
  const teamBWithoutSlots = teamBPlayers.filter(p => !p.slot_number);

  if (teamAWithoutSlots.length > 0 || teamBWithoutSlots.length > 0) {
    return "Some players need position assignments";
  }

  return "All teams complete";
}
