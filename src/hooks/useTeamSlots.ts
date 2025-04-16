import { useState, useCallback, useEffect } from 'react';
import { Slot, Player, Match } from '@/types/team-algorithm.types';
import { API_ENDPOINTS } from '@/constants/team-algorithm.constants';
import { INITIAL_SLOTS } from '@/constants/team-algorithm.constants';

export const useTeamSlots = (
  activeMatch: Match | null,
  onError: (error: string) => void
) => {
  const [currentSlots, setCurrentSlots] = useState<Slot[]>(INITIAL_SLOTS);
  const [isBalanced, setIsBalanced] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [usingPlannedMatch, setUsingPlannedMatch] = useState<boolean>(false);
  
  // Initialize slots based on the active match
  useEffect(() => {
    if (activeMatch) {
      initializeSlots();
    } else {
      // Reset slots if no active match
      setCurrentSlots(INITIAL_SLOTS);
      setIsBalanced(false);
      setUsingPlannedMatch(false);
    }
  }, [activeMatch]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Initialize slots based on active match
  const initializeSlots = useCallback(async () => {
    if (!activeMatch) return;
    
    try {
      setIsLoading(true);
      
      const teamSize = activeMatch.team_size || 9; // Default to 9 if missing
      const matchPlayerSlots: Slot[] = Array(teamSize * 2)
        .fill(null)
        .map((_, i) => ({
          slot_number: i + 1,
          player_id: null,
          team: i < teamSize ? 'A' : 'B',
          position: null
        }));
      
      // Fill in existing players if any
      if (activeMatch.players && activeMatch.players.length > 0) {
        // Map players to their respective slots
        activeMatch.players.forEach((player: { slot_number?: number; player_id: string; team?: string; position?: string }) => {
          // Handle case where slot_number might be missing
          const slotNumber = player.slot_number || 
            (player.team === 'A' ? 
              (Math.floor(Math.random() * teamSize) + 1) : 
              (Math.floor(Math.random() * teamSize) + teamSize + 1));
          
          // Ensure slot number is within range
          if (slotNumber > 0 && slotNumber <= matchPlayerSlots.length) {
            matchPlayerSlots[slotNumber - 1] = {
              ...matchPlayerSlots[slotNumber - 1],
              player_id: player.player_id,
              team: player.team || matchPlayerSlots[slotNumber - 1].team, // Use existing team if player.team is missing
              position: player.position
            };
          }
        });
      }
      
      // Update state
      setCurrentSlots(matchPlayerSlots);
      setIsBalanced(activeMatch.is_balanced || false);
      setUsingPlannedMatch(true);
      
    } catch (error) {
      console.error('Error initializing slots:', error);
      onError(`Failed to initialize team slots: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeMatch, onError]);
  
  // Select a player for a slot
  const selectPlayer = useCallback(async (slotIndex: number, playerId: string) => {
    if (!activeMatch) {
      onError('No active match selected');
      return false;
    }
    
    try {
      setIsLoading(true);
      
      // Get the correct match ID (prioritize upcoming_match_id)
      const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
      
      if (!playerId) {
        // Handle removing player from slot
        const slot = currentSlots[slotIndex - 1];
        
        // If the slot has no player, nothing to do
        if (!slot.player_id) return true;
        
        // Remove player from slot
        const response = await fetch(`${API_ENDPOINTS.MATCH_PLAYERS}?upcoming_match_id=${matchId}&player_id=${slot.player_id}&slot_number=${slotIndex}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to remove player');
        }
        
        // Update local state
        const updatedSlots = [...currentSlots];
        updatedSlots[slotIndex - 1] = {
          ...updatedSlots[slotIndex - 1],
          player_id: null
        };
        setCurrentSlots(updatedSlots);
        
        // Mark match as unbalanced when players change
        setIsBalanced(false);
        
        return true;
      }
      
      // Check if the player is already in a slot
      const existingSlotIndex = currentSlots.findIndex(s => s.player_id === playerId);
      
      if (existingSlotIndex !== -1) {
        // If player is already in this exact slot, nothing to do
        if (existingSlotIndex === slotIndex - 1) return true;
        
        // Move player from one slot to another
        const updatedSlots = [...currentSlots];
        
        // Remove from old slot
        updatedSlots[existingSlotIndex] = {
          ...updatedSlots[existingSlotIndex],
          player_id: null
        };
        
        // Calculate team assignment based on slot number
        const team = slotIndex <= (activeMatch.team_size || 9) ? 'A' : 'B';
        
        // Add to new slot
        updatedSlots[slotIndex - 1] = {
          ...updatedSlots[slotIndex - 1],
          player_id: playerId,
          team: team
        };
        
        // Update database
        const response = await fetch(API_ENDPOINTS.MATCH_PLAYERS, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            upcoming_match_id: matchId,
            player_id: playerId,
            team: team,
            slot_number: slotIndex
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to move player');
        }
        
        // Update local state
        setCurrentSlots(updatedSlots);
        
        // Mark match as unbalanced when players change
        setIsBalanced(false);
        
        return true;
      }
      
      // Adding a new player to a slot
      const response = await fetch(API_ENDPOINTS.MATCH_PLAYERS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          upcoming_match_id: matchId,
          player_id: playerId,
          team: slotIndex <= (activeMatch.team_size || 9) ? 'A' : 'B',
          slot_number: slotIndex
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add player');
      }
      
      // Update local state
      const updatedSlots = [...currentSlots];
      updatedSlots[slotIndex - 1] = {
        ...updatedSlots[slotIndex - 1],
        player_id: playerId,
        team: slotIndex <= (activeMatch.team_size || 9) ? 'A' : 'B'
      };
      setCurrentSlots(updatedSlots);
      
      // Mark match as unbalanced when players change
      setIsBalanced(false);
      
      return true;
      
    } catch (error) {
      console.error('Error selecting player:', error);
      onError(`Failed to update player assignment: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [activeMatch, currentSlots, onError]);
  
  // Clear all slots
  const clearSlots = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (!activeMatch) {
        // Just clear the local state if no active match
        setCurrentSlots(currentSlots.map(slot => ({ ...slot, player_id: null })));
        setIsBalanced(false);
        return true;
      }
      
      const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
      
      // Call API to clear slots
      const response = await fetch(`${API_ENDPOINTS.CLEAR_MATCH_PLAYERS}?matchId=${matchId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear slots');
      }
      
      // Update local state with empty slots
      setCurrentSlots(currentSlots.map(slot => ({ ...slot, player_id: null })));
      setIsBalanced(false);
      
      return true;
    } catch (error) {
      console.error('Error clearing slots:', error);
      onError(`Failed to clear slots: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [activeMatch, currentSlots, onError]);
  
  // Get available players for a slot
  const getAvailablePlayers = useCallback((currentSlot: Slot, allPlayers: Player[]): Player[] => {
    if (!allPlayers.length) return [];
    
    // Get IDs of players assigned to other slots
    const takenPlayerIds = new Set(
      currentSlots
        .filter(s => s.slot_number !== currentSlot.slot_number && s.player_id !== null)
        .map(s => s.player_id)
    );

    // Get current player in this slot
    const currentPlayerId = currentSlots.find(s => s.slot_number === currentSlot.slot_number)?.player_id;

    // Return available players (only unassigned + current player in this slot)
    return allPlayers
      .filter(p => !takenPlayerIds.has(p.id) || p.id === currentPlayerId)
      .sort((a, b) => {
        if (a.id === currentPlayerId) return -1; // Current player first
        if (b.id === currentPlayerId) return 1;
        return a.name.localeCompare(b.name); // Then alphabetical
      });
  }, [currentSlots]);
  
  return {
    currentSlots,
    setCurrentSlots,
    isBalanced,
    setIsBalanced,
    isLoading,
    setIsLoading,
    usingPlannedMatch,
    initializeSlots,
    selectPlayer,
    clearSlots,
    getAvailablePlayers
  };
}; 