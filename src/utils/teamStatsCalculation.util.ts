import { PlayerInPool } from '@/types/player.types';

interface TeamTemplate {
  defenders: number;
  midfielders: number;
  attackers: number;
}

interface PositionStats {
  goalscoring: number;
  defending: number;
  staminaPace: number;
  control: number;
  teamwork: number;
  resilience: number;
}

interface TeamStats {
  defense: PositionStats;
  midfield: PositionStats;
  attack: PositionStats;
  playerCount: number;
}

/**
 * Determines player position based on slot number and team template
 */
export const getPlayerPosition = (
  slotNumber: number, 
  teamSize: number, 
  teamTemplate: TeamTemplate
): 'defense' | 'midfield' | 'attack' => {
  const { defenders, midfielders } = teamTemplate;
  
  // Normalize slot to team-relative position (1-teamSize)
  const teamRelativeSlot = slotNumber > teamSize ? slotNumber - teamSize : slotNumber;
  
  if (teamRelativeSlot <= defenders) return 'defense';
  if (teamRelativeSlot <= defenders + midfielders) return 'midfield';
  return 'attack';
};

/**
 * Calculates team statistics from PlayerInPool arrays
 */
export const calculateTeamStatsFromPlayers = (
  players: PlayerInPool[], 
  teamTemplate: TeamTemplate,
  teamSize: number
): TeamStats => {
  // Group players by position
  const positions = {
    defense: [] as PlayerInPool[],
    midfield: [] as PlayerInPool[],
    attack: [] as PlayerInPool[]
  };
  
  players.forEach(player => {
    if (player.slot_number) {
      const position = getPlayerPosition(player.slot_number, teamSize, teamTemplate);
      positions[position].push(player);
    }
  });
  
  // Calculate averages for each position
  const calculatePositionStats = (players: PlayerInPool[]): PositionStats => {
    if (players.length === 0) {
      return {
        goalscoring: 0, 
        defending: 0, 
        staminaPace: 0, 
        control: 0, 
        teamwork: 0, 
        resilience: 0
      };
    }
    
    return {
      goalscoring: players.reduce((sum, p) => sum + p.goalscoring, 0) / players.length,
      defending: players.reduce((sum, p) => sum + p.defending, 0) / players.length,
      staminaPace: players.reduce((sum, p) => sum + p.staminaPace, 0) / players.length,
      control: players.reduce((sum, p) => sum + p.control, 0) / players.length,
      teamwork: players.reduce((sum, p) => sum + p.teamwork, 0) / players.length,
      resilience: players.reduce((sum, p) => sum + p.resilience, 0) / players.length,
    };
  };
  
  return {
    defense: calculatePositionStats(positions.defense),
    midfield: calculatePositionStats(positions.midfield),
    attack: calculatePositionStats(positions.attack),
    playerCount: players.length
  };
};

/**
 * Performance-based team stats for TornadoChart (Power Rating + Goal Threat only)
 */
export interface PerformanceStats {
  powerRating: number;
  goalThreat: number;
}

export interface PerformanceTeamStats {
  powerRating: number;
  goalThreat: number;
  playerCount: number;
}

/**
 * Calculates performance-based team statistics from PlayerInPool arrays
 * Used for Performance algorithm tornado chart (2 metrics only)
 * 
 * Note: This is a placeholder for UI calculations. In production, this should fetch
 * actual performance data from aggregated_performance_ratings table.
 * For now, we approximate using player attributes until API integration is complete.
 */
export const calculatePerformanceTeamStats = (
  players: PlayerInPool[]
): PerformanceTeamStats => {
  if (players.length === 0) {
    return {
      powerRating: 0,
      goalThreat: 0,
      playerCount: 0
    };
  }

  // TODO: Replace with actual database query to aggregated_performance_ratings
  // This is a temporary approximation using available player attributes
  const totalPowerRating = players.reduce((sum, p) => {
    // Simplified composite rating - closer to how the algorithm works
    const compositePower = (p.goalscoring + p.defending + p.staminaPace + p.control + p.teamwork + p.resilience) / 6;
    return sum + compositePower;
  }, 0);

  const totalGoalThreat = players.reduce((sum, p) => {
    // Use goalscoring as proxy for goal threat
    return sum + p.goalscoring;
  }, 0);

  return {
    powerRating: totalPowerRating / players.length,
    goalThreat: totalGoalThreat / players.length,
    playerCount: players.length
  };
};

/**
 * Gets position labels with counts for display
 */
export const getPositionLabels = (teamSize: number = 9, teamTemplate?: TeamTemplate) => {
  if (teamTemplate) {
    return {
      defense: `Defense (${teamTemplate.defenders})`,
      midfield: `Midfield (${teamTemplate.midfielders})`, 
      attack: `Attack (${teamTemplate.attackers})`
    };
  }
  
  // Fallback based on team size
  switch (teamSize) {
    case 7:
      return { defense: 'Defense (2)', midfield: 'Midfield (3)', attack: 'Attack (2)' };
    case 9:
      return { defense: 'Defense (3)', midfield: 'Midfield (4)', attack: 'Attack (2)' };
    case 11:
      return { defense: 'Defense (4)', midfield: 'Midfield (4)', attack: 'Attack (3)' };
    default:
      return { defense: 'Defense', midfield: 'Midfield', attack: 'Attack' };
  }
}; 