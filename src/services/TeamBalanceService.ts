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
      
      // For server errors, try the basic balancing fallback
      if (response.status === 500) {
        console.warn('Server error in balance API, falling back to basic team balance');
        await this.performBasicTeamBalance(matchId);
        return true;
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
   * Basic team balancing fallback when the API fails
   * @param matchId The match ID to balance
   * @param currentSlots Current slot assignments
   * @param players List of all players
   * @param activeMatch Active match data
   */
  public static async performBasicTeamBalance(
    matchId: string, 
    currentSlots?: Slot[], 
    players?: Player[], 
    activeMatch?: { team_size: number }
  ): Promise<void> {
    try {
      console.log('Performing basic team balance');
      
      let finalCurrentSlots = currentSlots;
      let finalPlayers = players;
      let finalActiveMatch = activeMatch;
      
      // If we don't have the required data, fetch it
      if (!finalCurrentSlots || !finalPlayers || !finalActiveMatch) {
        // Fetch match data to get slots, players, and match info
        const matchResponse = await fetch(`/api/admin/upcoming-matches?id=${matchId}`);
        if (!matchResponse.ok) {
          throw new Error('Failed to fetch match data for basic balancing');
        }
        const matchData = await matchResponse.json();
        if (!matchData.success) {
          throw new Error('Failed to get match data for basic balancing');
        }
        
        finalActiveMatch = matchData.data;
        
        // Fetch players
        const playersResponse = await fetch('/api/admin/players');
        if (!playersResponse.ok) {
          throw new Error('Failed to fetch players for basic balancing');
        }
        const playersData = await playersResponse.json();
        if (!playersData.success) {
          throw new Error('Failed to get players for basic balancing');
        }
        
        finalPlayers = playersData.data;
        
        // Get current slots
        const slotsResponse = await fetch(`/api/admin/upcoming-match-players?match_id=${matchId}`);
        if (!slotsResponse.ok) {
          throw new Error('Failed to fetch slots for basic balancing');
        }
        const slotsData = await slotsResponse.json();
        if (!slotsData.success) {
          throw new Error('Failed to get slots for basic balancing');
        }
        
        finalCurrentSlots = slotsData.data;
      }
      
      // Ensure we have required data after fetching
      if (!finalCurrentSlots || !finalPlayers || !finalActiveMatch) {
        throw new Error('Failed to get required data for team balancing');
      }
      
      // Get players from current slots
      const assignedPlayers = finalCurrentSlots
        .filter(slot => slot.player_id !== null)
        .map(slot => ({
          player_id: slot.player_id,
          player: finalPlayers.find(p => p.id === slot.player_id)
        }));
      
      // Sort by player skill (using goalscoring as a proxy)
      assignedPlayers.sort((a, b) => 
        ((b.player?.goalscoring || 3) + (b.player?.stamina_pace || 3)) - 
        ((a.player?.goalscoring || 3) + (a.player?.stamina_pace || 3))
      );
      
      // Alternate between teams (best player to team A, second best to team B, etc.)
      const updates: Array<{ player_id: string | null; team: string; slot_number: number }> = [];
      
      assignedPlayers.forEach((player, index) => {
        if (!player.player_id) return;
        
        const team = index % 2 === 0 ? 'A' : 'B';
        const teamSlotStart = team === 'A' ? 0 : finalActiveMatch.team_size;
        
        // Find first empty slot in the appropriate team
        const teamSlots = finalCurrentSlots
          .slice(teamSlotStart, teamSlotStart + finalActiveMatch.team_size)
          .map((slot, idx) => ({ ...slot, realIndex: idx + teamSlotStart }));
        
        // Find position in team based on skill
        let slotNumber;
        
        if (team === 'A') {
          slotNumber = index / 2 + 1;
        } else {
          slotNumber = finalActiveMatch.team_size + Math.floor(index / 2) + 1;
        }
        
        // Ensure slot number is valid
        if (slotNumber > finalCurrentSlots.length) {
          slotNumber = finalCurrentSlots.length;
        }
        
        updates.push({
          player_id: player.player_id,
          team,
          slot_number: slotNumber
        });
      });
      
      // Update each player's team assignment in the database
      await Promise.all(updates.map(update => 
        fetch('/api/admin/upcoming-match-players', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upcoming_match_id: matchId,
            player_id: update.player_id,
            team: update.team,
            slot_number: update.slot_number
          })
        })
      ));
      
      // Mark match as balanced
      await fetch(`/api/admin/upcoming-matches`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upcoming_match_id: matchId,
          is_balanced: true
        })
      });
      
    } catch (error) {
      console.error('Error in basic team balancing:', error);
      throw new Error(`Basic team balancing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    
    return {
      diffs,
      balanceScore,
      balanceQuality: balanceScore <= 0.3 ? 'Excellent' : 
                       balanceScore <= 0.6 ? 'Good' : 
                       balanceScore <= 0.9 ? 'Fair' : 'Poor'
    };
  }
} 