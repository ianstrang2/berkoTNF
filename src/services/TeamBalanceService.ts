// TeamBalanceService.ts
// Service to handle team balancing logic

interface Player {
  id: string;
  name: string;
  goalscoring?: number;
  defending?: number;
  stamina_pace?: number;
  control?: number;
  teamwork?: number;
  resilience?: number;
  is_ringer?: boolean;
  is_retired?: boolean;
  [key: string]: any;
}

interface Slot {
  slot_number: number;
  player_id: string | null;
  team?: string;
  position?: string | null;
}

export class TeamBalanceService {
  /**
   * Performs the team balancing operation through API call
   * @param matchId The match ID to balance
   * @returns Promise that resolves when balancing is complete
   */
  public static async balanceTeams(matchId: string): Promise<boolean> {
    // Call the balance-planned-match endpoint
    const response = await fetch(`/api/admin/balance-planned-match?matchId=${matchId}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      console.error(`Balance API error (${response.status}):`, await response.text());
      
      // For 400 errors, show the error message
      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to balance teams');
      }
      
      // For server errors, provide a clear error message - no fallback
      if (response.status === 500) {
        console.error('Server error in balance API');
        throw new Error(`Server error during team balancing (500): The algorithm encountered an error. Please report this issue.`);
      }
      
      throw new Error(`Failed to balance teams: ${response.status}`);
    }
    
    // For successful API calls, process the response
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to balance teams');
    }
    
    return true;
  }
  
  /**
   * Calculate team statistics
   * @param teamSlots Slots for a specific team
   * @param players All available players
   * @returns Team statistics
   */
  public static calculateTeamStats(teamSlots: Slot[], players: Player[]) {
    // Filter out slots without player assignments
    const slotsWithPlayers = teamSlots.filter(slot => slot.player_id);
    if (slotsWithPlayers.length === 0) return null;
    
    // Get player objects for all assigned slots
    const teamPlayers = slotsWithPlayers
      .map(slot => {
        const player = players.find(p => p.id === slot.player_id);
        if (player) {
          // Add slot info to player for position grouping
          return { ...player, slot_number: slot.slot_number };
        }
        return null;
      })
      .filter(Boolean) as (Player & { slot_number: number })[];
    
    if (teamPlayers.length === 0) return null;
    
    // Group players by position
    const defenders = teamPlayers.filter(p => 
      p.slot_number <= 3 || (p.slot_number >= 10 && p.slot_number <= 12)
    );
    
    const midfielders = teamPlayers.filter(p => 
      (p.slot_number >= 4 && p.slot_number <= 7) || 
      (p.slot_number >= 13 && p.slot_number <= 16)
    );
    
    const attackers = teamPlayers.filter(p => 
      p.slot_number === 8 || p.slot_number === 9 || 
      p.slot_number === 17 || p.slot_number === 18
    );
    
    const calculateAvg = (players: Player[], field: keyof Player) => {
      const sum = players.reduce((total, player) => total + (Number(player[field]) || 0), 0);
      return players.length > 0 ? sum / players.length : 0;
    };
    
    return {
      defense: {
        goalscoring: calculateAvg(defenders, 'goalscoring'),
        defending: calculateAvg(defenders, 'defending'),
        stamina_pace: calculateAvg(defenders, 'stamina_pace'),
        control: calculateAvg(defenders, 'control'),
        teamwork: calculateAvg(defenders, 'teamwork'),
        resilience: calculateAvg(defenders, 'resilience')
      },
      midfield: {
        goalscoring: calculateAvg(midfielders, 'goalscoring'),
        defending: calculateAvg(midfielders, 'defending'),
        stamina_pace: calculateAvg(midfielders, 'stamina_pace'),
        control: calculateAvg(midfielders, 'control'),
        teamwork: calculateAvg(midfielders, 'teamwork'),
        resilience: calculateAvg(midfielders, 'resilience')
      },
      attack: {
        goalscoring: calculateAvg(attackers, 'goalscoring'),
        defending: calculateAvg(attackers, 'defending'),
        stamina_pace: calculateAvg(attackers, 'stamina_pace'),
        control: calculateAvg(attackers, 'control'),
        teamwork: calculateAvg(attackers, 'teamwork'),
        resilience: calculateAvg(attackers, 'resilience')
      },
      playerCount: teamPlayers.length
    };
  }
  
  /**
   * Calculate comparative statistics between teams
   * @param teamASlots Slots for team A
   * @param teamBSlots Slots for team B
   * @param players All available players
   * @returns Comparative statistics
   */
  public static calculateComparativeStats(teamASlots: Slot[], teamBSlots: Slot[], players: Player[]) {
    const statsA = this.calculateTeamStats(teamASlots, players);
    const statsB = this.calculateTeamStats(teamBSlots, players);
    
    if (!statsA || !statsB) return null;
    
    // Helper to calculate differences for each position group
    const calculatePositionDiffs = (posA: any, posB: any) => {
      return {
        goalscoring: Math.abs(posA.goalscoring - posB.goalscoring),
        defending: Math.abs(posA.defending - posB.defending),
        stamina_pace: Math.abs(posA.stamina_pace - posB.stamina_pace),
        control: Math.abs(posA.control - posB.control),
        teamwork: Math.abs(posA.teamwork - posB.teamwork),
        resilience: Math.abs(posA.resilience - posB.resilience)
      };
    };
    
    // Calculate differences for each position group
    const diffs = {
      defense: calculatePositionDiffs(statsA.defense, statsB.defense),
      midfield: calculatePositionDiffs(statsA.midfield, statsB.midfield),
      attack: calculatePositionDiffs(statsA.attack, statsB.attack)
    };
    
    // Calculate overall balance score (lower is better)
    // Sum up all differences and divide by total number of comparisons
    let totalDiff = 0;
    let totalComparisons = 0;
    
    for (const position in diffs) {
      const posDiffs = diffs[position as keyof typeof diffs];
      for (const attr in posDiffs) {
        totalDiff += posDiffs[attr as keyof typeof posDiffs];
        totalComparisons++;
      }
    }
    
    const balanceScore = totalComparisons > 0 ? totalDiff / totalComparisons : 0;
    
    // Calculate percentage for display purposes (higher is better)
    const balancePercentage = Math.min(100, Math.max(0, Math.round(100 - (balanceScore * 100))));
    
    // For debugging - display balance score to console
    console.log(`Team Balance Score: ${balanceScore.toFixed(3)}, Balance Percentage: ${balancePercentage}%`);
    
    return {
      diffs,
      balanceScore,
      balancePercentage,
      rawBalanceScore: balanceScore.toFixed(3) // Adding raw score for display
    };
  }
} 