// team-algorithm.utils.ts
import {
  Slot,
  SlotInfo,
  WarningMessage,
  TeamCharacteristics,
  PositionGroup
} from '../types/team-algorithm.types';
import { PlayerProfile } from '../types/player.types';
import { TEAM_STRUCTURE } from '../constants/team-algorithm.constants';

/**
 * Formats a date string in a consistent way that works on both client and server
 */
export const formatDateSafely = (dateString: string | undefined | null): string => {
  if (!dateString) return 'Date not set';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    // Use toLocaleDateString with explicit locale for consistency
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date format error';
  }
};

/**
 * Gets team and position info based on slot number
 */
export const getSlotInfo = (slotNumber: number): SlotInfo => {
  const isGreen = slotNumber > 9;
  const team = isGreen ? TEAM_STRUCTURE.GREEN : TEAM_STRUCTURE.ORANGE;
  
  let position: string;
  if (team.slots.defenders.includes(slotNumber)) position = 'defenders';
  else if (team.slots.midfielders.includes(slotNumber)) position = 'midfielders';
  else position = 'attackers';
  
  return { team, position };
};

/**
 * Determines if a warning message should be shown based on team status
 */
export const getWarningMessage = (
  currentSlots: Slot[],
  isBalanced: boolean,
  error: string | null
): WarningMessage | null => {
  if (error) return { type: 'error', message: error };
  
  const filledSlotCount = currentSlots.filter(s => s.player_id !== null).length;
  
  // Remove the warning about needing more players
  if (filledSlotCount === 0) return null;
  // Remove the warning about balanced teams - don't show any warnings
  return null;
};

/**
 * Calculates team resilience metric
 */
export const calculateTeamResilience = (players: PlayerProfile[]): number => {
  if (!players || players.length === 0) return 0;
  const totalResilience = players.reduce((sum, player) => sum + (player.resilience || 3), 0);
  return totalResilience / players.length;
};

/**
 * Calculates multiple team characteristic metrics
 */
export const calculateTeamCharacteristics = (players: PlayerProfile[]): TeamCharacteristics => {
  if (!players || players.length === 0) return { resilience: 0, teamwork: 0 };
  const totalResilience = players.reduce((sum, player) => sum + (player.resilience || 3), 0);
  const totalTeamwork = players.reduce((sum, player) => sum + (player.teamwork || 3), 0);
  return {
    resilience: totalResilience / players.length,
    teamwork: totalTeamwork / players.length
  };
};

/**
 * Gets the current date as a string in YYYY-MM-DD format
 */
export const getCurrentDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Creates a modal for copying team information
 */
export const createCopyModal = (text: string): HTMLDivElement => {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  
  const pre = document.createElement('pre');
  pre.className = 'bg-gray-100 p-4 rounded-md text-sm whitespace-pre-wrap mb-4';
  pre.textContent = text;
  
  const modalContent = document.createElement('div');
  modalContent.className = 'bg-white p-6 rounded-lg shadow-lg max-w-md w-full';
  modalContent.innerHTML = `
    <h3 class="text-xl font-bold mb-4">Copy Teams</h3>
    <p class="text-gray-600 mb-4">Please select and copy the text below:</p>
    <div class="flex justify-end">
      <button class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 transition-colors" onclick="this.closest('.fixed').remove()">
        Close
      </button>
    </div>
  `;
  
  modalContent.insertBefore(pre, modalContent.lastElementChild);
  modal.appendChild(modalContent);
  
  return modal;
};

/**
 * Determines position groups based on team size and team type
 */
export const determinePositionGroups = (teamSize: number, team: string): PositionGroup[] => {
  const isOrange = team.toLowerCase() === 'orange';
  const startingSlot = isOrange ? 1 : teamSize + 1;
  
  // Adjust position distribution based on team size
  let positions: PositionGroup[] = [];
  
  if (teamSize <= 5) {
    // 5-a-side: 2 defenders, 2 midfielders, 1 attacker
    positions = [
      { 
        title: 'Defenders', 
        slots: [startingSlot, startingSlot + 1],
        position: 'Defenders',
        startSlot: startingSlot,
        endSlot: startingSlot + 1
      },
      { 
        title: 'Midfielders', 
        slots: [startingSlot + 2, startingSlot + 3],
        position: 'Midfielders',
        startSlot: startingSlot + 2,
        endSlot: startingSlot + 3
      },
      { 
        title: 'Attackers', 
        slots: [startingSlot + 4],
        position: 'Attackers',
        startSlot: startingSlot + 4,
        endSlot: startingSlot + 4
      }
    ];
  } else if (teamSize <= 7) {
    // 6/7-a-side logic
    const attackerCount = Math.max(0, teamSize - 5);
    const attackerSlots = Array.from({ length: attackerCount }, (_, i) => startingSlot + 5 + i);
    positions = [
      { 
        title: 'Defenders', 
        slots: [startingSlot, startingSlot + 1],
        position: 'Defenders',
        startSlot: startingSlot,
        endSlot: startingSlot + 1
      },
      { 
        title: 'Midfielders', 
        slots: [startingSlot + 2, startingSlot + 3, startingSlot + 4],
        position: 'Midfielders',
        startSlot: startingSlot + 2,
        endSlot: startingSlot + 4
      },
      { 
        title: 'Attackers', 
        slots: attackerSlots,
        position: 'Attackers',
        startSlot: startingSlot + 5,
        endSlot: startingSlot + teamSize - 1
      }
    ];
  } else if (teamSize <= 9) {
    // 8/9-a-side logic
    const attackerCount = Math.max(0, teamSize - 7);
    const attackerSlots = Array.from({ length: attackerCount }, (_, i) => startingSlot + 7 + i);
    positions = [
      { 
        title: 'Defenders', 
        slots: [startingSlot, startingSlot + 1, startingSlot + 2],
        position: 'Defenders',
        startSlot: startingSlot,
        endSlot: startingSlot + 2
      },
      { 
        title: 'Midfielders', 
        slots: [startingSlot + 3, startingSlot + 4, startingSlot + 5, startingSlot + 6],
        position: 'Midfielders',
        startSlot: startingSlot + 3,
        endSlot: startingSlot + 6
      },
      { 
        title: 'Attackers', 
        slots: attackerSlots,
        position: 'Attackers',
        startSlot: startingSlot + 7,
        endSlot: startingSlot + teamSize - 1
      }
    ];
  } else {
    // 10/11-a-side logic
    const attackerCount = Math.max(0, teamSize - 8);
    const attackerSlots = Array.from({ length: attackerCount }, (_, i) => startingSlot + 8 + i);
    positions = [
      { 
        title: 'Defenders', 
        slots: [startingSlot, startingSlot + 1, startingSlot + 2, startingSlot + 3],
        position: 'Defenders',
        startSlot: startingSlot,
        endSlot: startingSlot + 3
      },
      { 
        title: 'Midfielders', 
        slots: [startingSlot + 4, startingSlot + 5, startingSlot + 6, startingSlot + 7],
        position: 'Midfielders',
        startSlot: startingSlot + 4,
        endSlot: startingSlot + 7
      },
      { 
        title: 'Attackers', 
        slots: attackerSlots,
        position: 'Attackers',
        startSlot: startingSlot + 8,
        endSlot: startingSlot + teamSize - 1
      }
    ];
  }
  
  return positions;
};

/**
 * Gets the position string (Defenders, Midfielders, Attackers) from a slot number
 */
export const getPositionFromSlot = (slotNumber: number): string => {
  const { position } = getSlotInfo(slotNumber);
  return position.charAt(0).toUpperCase() + position.slice(1);
};

/**
 * Gets player stats display string based on role
 */
export const getPlayerStats = (player: PlayerProfile | undefined, role: string): string => {
  if (!player) return '';
  
  let stats: (string | number | undefined)[] = [];
  if (role === 'Defenders') {
    stats = [player.defending, player.staminaPace, player.control];
  } else if (role === 'Midfielders') {
    stats = [player.control, player.staminaPace, player.goalscoring];
  } else { // Attackers
    stats = [player.goalscoring, player.staminaPace, player.control];
  }
  
  return stats.filter(s => s !== undefined).join('/');
};

/**
 * Validates match data before creation
 */
export const validateMatchData = (matchData: { date: string, team_size: number }): string | null => {
  if (!matchData.date) {
    return "Match date cannot be empty.";
  }
  
  if (new Date(matchData.date) < new Date(new Date().setHours(0, 0, 0, 0))) {
    return "Match date cannot be in the past.";
  }
  
  if (matchData.team_size < 5 || matchData.team_size > 11) {
    return "Team size must be between 5 and 11.";
  }
  
  return null;
};

/**
 * Formats team assignments for copying to clipboard
 */
export const formatTeamsForCopy = (
  slots: Slot[],
  players: PlayerProfile[],
  teamAName: string,
  teamBName: string,
  on_fire_player_id?: string | null,
  grim_reaper_player_id?: string | null,
  showOnFire?: boolean,
  showGrimReaper?: boolean
): string => {
  const orangeTeamSlots: Slot[] = [];
  const greenTeamSlots: Slot[] = [];

  slots.forEach(slot => {
    if (slot.team === 'A' && slot.player_id) {
      orangeTeamSlots.push(slot);
    } else if (slot.team === 'B' && slot.player_id) {
      greenTeamSlots.push(slot);
    }
    // Any other team value (e.g., 'Unassigned' or null) is implicitly ignored.
  });

  const formatTeam = (teamSlots: Slot[]) => {
    return teamSlots
      .map(slot => {
        const player = players.find(p => p.id === slot.player_id);
        let playerName = player ? player.name : 'Empty';
        
        if (player) {
          if (showOnFire && player.id === on_fire_player_id) {
            playerName += ' 🔥';
          }
          if (showGrimReaper && player.id === grim_reaper_player_id) {
            playerName += ' 💀';
          }
        }
        return playerName;
      })
      .join('\n');
  };

  const finalTeamAName = teamAName || 'Team A';
  const finalTeamBName = teamBName || 'Team B';

  return `--- ${finalTeamAName} ---\n${formatTeam(orangeTeamSlots)}\n\n--- ${finalTeamBName} ---\n${formatTeam(greenTeamSlots)}`;
}; 