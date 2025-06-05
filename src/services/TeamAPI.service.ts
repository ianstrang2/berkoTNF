import { 
  Player, 
  PoolPlayer, 
  Slot, 
  MatchFormData, 
  RingerFormData, 
  ApiResponse 
} from '@/types/team-algorithm.types';
import { TeamBalanceService } from './TeamBalance.service';

export const TeamAPIService = {
  // Player pool APIs
  fetchPlayerPool: async (matchId: string): Promise<PoolPlayer[]> => {
    try {
      const response = await fetch(`/api/admin/match-player-pool?match_id=${matchId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch player pool: ${response.status} ${errorText}`);
      }
      const data = await response.json() as ApiResponse<PoolPlayer[]>;
      return data.success ? data.data || [] : [];
    } catch (error) {
      console.error('Error fetching player pool:', error);
      throw error;
    }
  },
  
  addPlayerToPool: async (matchId: string, playerId: string): Promise<void> => {
    try {
      const response = await fetch('/api/admin/match-player-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, player_id: playerId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add player: ${response.status}`);
      }
    } catch (error) {
      console.error('Error adding player to pool:', error);
      throw error;
    }
  },
  
  removePlayerFromPool: async (matchId: string, playerId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/match-player-pool?match_id=${matchId}&player_id=${playerId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to remove player: ${response.status}`);
      }
    } catch (error) {
      console.error('Error removing player from pool:', error);
      throw error;
    }
  },
  
  clearEntirePlayerPool: async (matchId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/match-player-pool?match_id=${matchId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // Check if errorData exists and has an error property, otherwise provide a default message
        const message = errorData && errorData.error ? errorData.error : `Failed to clear player pool: ${response.status}`;
        throw new Error(message);
      }
      // Optionally, you can check response.json() for { success: true, count: N }
      // const result = await response.json(); 
      // console.log('Player pool cleared:', result);
    } catch (error) {
      console.error('Error clearing entire player pool:', error);
      throw error;
    }
  },
  
  // Team assignment APIs
  fetchTeamAssignments: async (matchId: string): Promise<Slot[]> => {
    try {
      const response = await fetch(`/api/admin/upcoming-match-players?matchId=${matchId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch team assignments: ${response.status} ${errorText}`);
      }
      const data = await response.json() as ApiResponse<any[]>;
      
      // Convert API data to Slot format
      const slots = data.success && data.data ? data.data.map(item => ({
        slot_number: item.slot_number,
        player_id: item.player_id.toString(),
        team: item.team,
        position: item.position
      })) : [];
      
      return slots;
    } catch (error) {
      console.error('Error fetching team assignments:', error);
      throw error;
    }
  },
  
  assignPlayerToSlot: async (matchId: string, playerId: string, slotNumber: number, team: string): Promise<void> => {
    try {
      const response = await fetch('/api/admin/upcoming-match-players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upcoming_match_id: matchId,
          player_id: playerId,
          team,
          slot_number: slotNumber
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to assign player: ${response.status}`);
      }
    } catch (error) {
      console.error('Error assigning player to slot:', error);
      throw error;
    }
  },
  
  // Team balancing APIs with retries and fallbacks
  balanceTeamsByAbility: async (matchId: string, playerIds: string[]): Promise<any> => {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/admin/balance-planned-match?matchId=${matchId}`, {
          method: 'POST'
        });
        
        if (response.ok) {
          const data = await response.json();
          return data;
        }
        
        // For 400 errors, don't retry
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to balance teams: ${response.status}`);
        }
        
        // For 500 errors, retry with exponential backoff
        attempts++;
        console.warn(`Server error (attempt ${attempts}/${maxAttempts}), retrying...`);
        
        // Wait before retrying (exponential backoff)
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed:`, error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to balance teams after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Wait before retrying
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
      }
    }
    
    // This should never happen due to the retry logic, but TypeScript needs a return
    throw new Error('Failed to balance teams after multiple attempts');
  },
  
  balanceTeamsRandomly: async (matchId: string, playerIds: string[]): Promise<any> => {
    try {
      const response = await fetch(`/api/admin/random-balance-match?matchId=${matchId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        // For random balancing, implement a client-side fallback
        console.warn('Random balance API failed, using client-side fallback');
        return await TeamAPIService.performClientSideRandomBalance(matchId, playerIds);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error in random team balance:', error);
      // Fallback to client-side random balancing
      return await TeamAPIService.performClientSideRandomBalance(matchId, playerIds);
    }
  },
  
  // New function for balancing by past performance
  balanceTeamsByPastPerformance: async (matchId: string, playerIds: string[]): Promise<any> => {
    try {
      const response = await fetch(`/api/admin/balance-by-past-performance`, { // Updated endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, playerIds }) // Pass matchId and playerIds
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to balance teams by past performance: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Balancing by past performance failed according to API response.');
      }
      return data;
    } catch (error) {
      console.error('Error in balanceTeamsByPastPerformance:', error);
      // Consider if a client-side fallback is appropriate or even possible here
      throw error; // Re-throw the error to be handled by the calling hook
    }
  },
  
  // Client-side fallback for random balancing
  performClientSideRandomBalance: async (matchId: string, playerIds: string[]): Promise<any> => {
    try {
      // Fetch current match data to get team size
      const matchResponse = await fetch(`/api/admin/upcoming-matches?id=${matchId}`);
      const matchData = await matchResponse.json();
      if (!matchData.success) throw new Error('Failed to fetch match data');
      
      const teamSize = matchData.data.team_size || 9;
      
      // Shuffle player IDs
      const shuffledPlayerIds = [...playerIds].sort(() => Math.random() - 0.5);
      
      // Split into teams
      const teamA = shuffledPlayerIds.slice(0, teamSize);
      const teamB = shuffledPlayerIds.slice(teamSize);
      
      // Create slot assignments
      interface SlotAssignment {
        player_id: string;
        team: string;
        slot_number: number;
      }
      
      const slotAssignments: SlotAssignment[] = [];
      
      for (let i = 0; i < teamA.length; i++) {
        slotAssignments.push({
          player_id: teamA[i],
          team: 'A',
          slot_number: i + 1
        });
      }
      
      for (let i = 0; i < teamB.length; i++) {
        slotAssignments.push({
          player_id: teamB[i],
          team: 'B',
          slot_number: i + teamSize + 1
        });
      }
      
      // Update each player's team assignment
      await Promise.all(slotAssignments.map(assignment => 
        TeamAPIService.assignPlayerToSlot(
          matchId, 
          assignment.player_id, 
          assignment.slot_number, 
          assignment.team
        )
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
      
      // Fetch the updated assignments
      const slots = await TeamAPIService.fetchTeamAssignments(matchId);
      
      return {
        success: true,
        data: {
          slots,
          stats: {
            balanceType: 'random',
            balancePercentage: 50
          }
        }
      };
    } catch (error) {
      console.error('Error in client-side random balance:', error);
      throw error;
    }
  },
  
  // Clear all slot assignments but keep the match
  clearTeamAssignments: async (matchId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/upcoming-match-players/clear?matchId=${matchId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to clear team assignments: ${response.status}`);
      }
    } catch (error) {
      console.error('Error clearing team assignments:', error);
      throw error;
    }
  },
  
  // Clear the active match entirely
  clearActiveMatch: async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/clear-active-match', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to clear active match: ${response.status}`);
      }
    } catch (error) {
      console.error('Error clearing active match:', error);
      throw error;
    }
  },
  
  // Create a new match
  createMatch: async (matchData: MatchFormData): Promise<void> => {
    try {
      const response = await fetch('/api/admin/create-planned-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: matchData.match_date,
          team_size: matchData.team_size
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create match: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  },
  
  // Edit an existing match
  updateMatch: async (matchId: string, matchData: MatchFormData): Promise<void> => {
    try {
      const response = await fetch('/api/admin/upcoming-matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          match_date: matchData.match_date,
          team_size: matchData.team_size
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update match: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  },
  
  // Add a ringer player
  addRinger: async (ringerData: RingerFormData): Promise<Player> => {
    try {
      const response = await fetch('/api/admin/add-ringer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ringerData.name,
          goalscoring: parseFloat(ringerData.goalscoring.toString()),
          defending: parseFloat(ringerData.defending.toString()),
          stamina_pace: parseFloat(ringerData.stamina_pace.toString()),
          control: parseFloat(ringerData.control.toString()),
          teamwork: parseFloat(ringerData.teamwork.toString()),
          resilience: parseFloat(ringerData.resilience.toString())
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add ringer: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error adding ringer:', error);
      throw error;
    }
  }
}; 