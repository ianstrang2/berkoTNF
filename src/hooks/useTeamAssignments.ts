import { useState, useEffect, useCallback } from 'react';
import { Slot, ComparativeStats } from '@/types/team-algorithm.types';
import { TeamAPIService } from '@/services/TeamAPI.service';

interface SlotState {
  slot_number: number;
  player_id: string | null;
  team: string;
  position?: string | null;
}

export const useTeamAssignments = (matchId?: string, teamSize: number = 9) => {
  // Initialize slots array based on team size
  const [slots, setSlots] = useState<SlotState[]>(Array(teamSize * 2).fill(null).map((_, i) => ({
    slot_number: i + 1,
    player_id: null,
    team: i < teamSize ? 'A' : 'B'
  })));
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceStats, setBalanceStats] = useState<{
    balanceScore?: number;
    balanceQuality?: string;
    diffs?: Record<string, number>;
  } | null>(null);
  
  // Fetch team assignments when matchId changes
  const fetchAssignments = useCallback(async () => {
    if (!matchId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const assignments = await TeamAPIService.fetchTeamAssignments(matchId);
      
      // If we have assignments, update slots
      if (assignments && assignments.length > 0) {
        // Create a new array with default values
        const initialSlots: SlotState[] = Array(teamSize * 2).fill(null).map((_, i) => ({
          slot_number: i + 1,
          player_id: null,
          team: i < teamSize ? 'A' : 'B'
        }));
        
        // Merge assignments into slots
        assignments.forEach(assignment => {
          const slotIndex = assignment.slot_number - 1;
          if (slotIndex >= 0 && slotIndex < initialSlots.length) {
            initialSlots[slotIndex] = {
              ...initialSlots[slotIndex],
              ...assignment
            };
          }
        });
        
        setSlots(initialSlots);
      }
    } catch (error) {
      console.error('Error fetching team assignments:', error);
      setError(`Failed to load team assignments: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [matchId, teamSize]);
  
  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);
  
  // Balance teams with selected algorithm
  const balanceTeams = useCallback(async (playerIds: string[], algorithm: 'ability' | 'random' = 'ability') => {
    if (!matchId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      let result;
      
      if (algorithm === 'random') {
        result = await TeamAPIService.balanceTeamsRandomly(matchId, playerIds);
      } else {
        result = await TeamAPIService.balanceTeamsByAbility(matchId, playerIds);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to balance teams');
      }
      
      // Update slots with new assignments
      if (result.data && result.data.slots) {
        // Create a new array with default values
        const newSlots: SlotState[] = Array(teamSize * 2).fill(null).map((_, i) => ({
          slot_number: i + 1,
          player_id: null,
          team: i < teamSize ? 'A' : 'B'
        }));
        
        // Update with new assignments
        result.data.slots.forEach((slotData: any) => {
          const slotIndex = slotData.slot_number - 1;
          if (slotIndex >= 0 && slotIndex < newSlots.length) {
            newSlots[slotIndex] = {
              slot_number: slotData.slot_number,
              player_id: slotData.player_id,
              team: slotData.team,
              position: slotData.position
            };
          }
        });
        
        setSlots(newSlots);
      }
      
      // Update balance stats if available
      if (result.data && result.data.stats) {
        setBalanceStats(result.data.stats);
      }
      
      return result.data;
    } catch (error) {
      console.error('Error balancing teams:', error);
      setError(`Failed to balance teams: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [matchId, teamSize]);
  
  // Move player between slots
  const movePlayer = useCallback(async (sourceSlotNumber: number, targetSlotNumber: number) => {
    if (!matchId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Find source and target slots
      const sourceSlot = slots.find(s => s.slot_number === sourceSlotNumber);
      const targetSlot = slots.find(s => s.slot_number === targetSlotNumber);
      
      if (!sourceSlot || !targetSlot) {
        throw new Error('Invalid slot operation');
      }
      
      // If source slot is empty, nothing to do
      if (!sourceSlot.player_id) {
        return;
      }
      
      // Determine target team based on slot number
      const targetTeam = targetSlotNumber <= teamSize ? 'A' : 'B';
      
      // Move player to target slot
      await TeamAPIService.assignPlayerToSlot(
        matchId,
        sourceSlot.player_id,
        targetSlotNumber,
        targetTeam
      );
      
      // If target slot had a player, move that player to source slot
      if (targetSlot.player_id) {
        const sourceTeam = sourceSlotNumber <= teamSize ? 'A' : 'B';
        
        await TeamAPIService.assignPlayerToSlot(
          matchId,
          targetSlot.player_id,
          sourceSlotNumber,
          sourceTeam
        );
      }
      
      // Update local state
      const newSlots = [...slots];
      
      // Update source and target slots
      const sourceIndex = slots.findIndex(s => s.slot_number === sourceSlotNumber);
      const targetIndex = slots.findIndex(s => s.slot_number === targetSlotNumber);
      
      if (targetSlot.player_id) {
        // Swap players
        newSlots[sourceIndex] = {
          ...newSlots[sourceIndex],
          player_id: targetSlot.player_id
        };
        
        newSlots[targetIndex] = {
          ...newSlots[targetIndex],
          player_id: sourceSlot.player_id
        };
      } else {
        // Move player to empty slot
        newSlots[targetIndex] = {
          ...newSlots[targetIndex],
          player_id: sourceSlot.player_id
        };
        
        newSlots[sourceIndex] = {
          ...newSlots[sourceIndex],
          player_id: null
        };
      }
      
      setSlots(newSlots);
      
      // Fetch updated assignments to ensure consistency
      await fetchAssignments();
    } catch (error) {
      console.error('Error moving player:', error);
      setError(`Failed to move player: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [matchId, slots, teamSize, fetchAssignments]);
  
  // Clear all team assignments
  const clearTeams = useCallback(async () => {
    if (!matchId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await TeamAPIService.clearTeamAssignments(matchId);
      
      // Reset slots
      setSlots(Array(teamSize * 2).fill(null).map((_, i) => ({
        slot_number: i + 1,
        player_id: null,
        team: i < teamSize ? 'A' : 'B'
      })));
      
      setBalanceStats(null);
    } catch (error) {
      console.error('Error clearing teams:', error);
      setError(`Failed to clear teams: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [matchId, teamSize]);
  
  return {
    slots,
    isLoading,
    error,
    balanceStats,
    balanceTeams,
    movePlayer,
    clearTeams,
    fetchAssignments
  };
}; 