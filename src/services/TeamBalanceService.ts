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
      .map(slot => players.find(p => p.id === slot.player_id))
      .filter(Boolean) as Player[];
    
    if (teamPlayers.length === 0) return null;
    
    const calculateAvg = (field: keyof Player) => {
      const sum = teamPlayers.reduce((total, player) => total + (Number(player[field]) || 0), 0);
      return teamPlayers.length > 0 ? sum / teamPlayers.length : 0;
    };
    
    return {
      goalscoring: calculateAvg('goalscoring'),
      defending: calculateAvg('defending'),
      stamina_pace: calculateAvg('stamina_pace'),
      control: calculateAvg('control'),
      teamwork: calculateAvg('teamwork'),
      resilience: calculateAvg('resilience'),
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
    
    // Calculate differences between teams
    const diffs = {
      goalscoring: Math.abs(statsA.goalscoring - statsB.goalscoring),
      defending: Math.abs(statsA.defending - statsB.defending),
      stamina_pace: Math.abs(statsA.stamina_pace - statsB.stamina_pace),
      control: Math.abs(statsA.control - statsB.control),
      teamwork: Math.abs(statsA.teamwork - statsB.teamwork),
      resilience: Math.abs(statsA.resilience - statsB.resilience)
    };
    
    // Calculate overall balance score (lower is better)
    const totalDiff = Object.values(diffs).reduce((sum, diff) => sum + diff, 0);
    const balanceScore = totalDiff / 6; // Average difference across all attributes
    
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