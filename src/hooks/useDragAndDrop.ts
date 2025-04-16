import { useState, useCallback } from 'react';
import { Player, Slot, Match } from '@/types/team-algorithm.types';
import { API_ENDPOINTS } from '@/constants/team-algorithm.constants';

export const useDragAndDrop = (
  activeMatch: Match | null,
  currentSlots: Slot[],
  setCurrentSlots: (slots: Slot[]) => void,
  setIsBalanced: (isBalanced: boolean) => void,
  setIsLoading: (isLoading: boolean) => void,
  onError: (error: string) => void,
  onSuccess: () => Promise<void>
) => {
  const [draggedItem, setDraggedItem] = useState<{ slotNumber: number; player: Player } | null>(null);
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  
  // Handle drag start
  const handleDragStart = useCallback((slotNumber: number, player: Player) => {
    setDraggedItem({ slotNumber, player });
  }, []);
  
  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, slotNumber: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHighlightedSlot(slotNumber);
  }, []);
  
  // Handle drop
  const handleDrop = useCallback(async (e: React.DragEvent, targetSlotNumber: number) => {
    e.preventDefault();
    setHighlightedSlot(null);
    
    if (!draggedItem) return;
    
    try {
      setIsLoading(true);
      
      // Get source and target slots
      const sourceSlot = currentSlots.find(s => s.slot_number === draggedItem.slotNumber);
      const targetSlot = currentSlots.find(s => s.slot_number === targetSlotNumber);
      
      if (!sourceSlot || !targetSlot) {
        throw new Error('Invalid slot operation');
      }
      
      // No need to do anything if dropping on the same slot
      if (sourceSlot.slot_number === targetSlot.slot_number) {
        return;
      }
      
      // Check if target has a player
      const targetPlayerId = targetSlot.player_id;
      const sourcePlayerId = sourceSlot.player_id;
      
      if (!sourcePlayerId) {
        throw new Error('No player in source slot');
      }
      
      // Get the correct match ID
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      
      if (!matchId) {
        throw new Error('No active match selected');
      }
      
      // Determine the team based on slot number
      const sourceTeam = sourceSlot.slot_number <= (activeMatch?.team_size || 9) ? 'A' : 'B';
      const targetTeam = targetSlot.slot_number <= (activeMatch?.team_size || 9) ? 'A' : 'B';
      
      // Update source player to target slot
      await fetch(API_ENDPOINTS.MATCH_PLAYERS, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          upcoming_match_id: matchId,
          player_id: sourcePlayerId,
          team: targetTeam,
          slot_number: targetSlot.slot_number
        })
      });
      
      // If target has a player, update them to source slot (swap)
      if (targetPlayerId) {
        await fetch(API_ENDPOINTS.MATCH_PLAYERS, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            upcoming_match_id: matchId,
            player_id: targetPlayerId,
            team: sourceTeam,
            slot_number: sourceSlot.slot_number
          })
        });
      } else {
        // If target was empty, remove the player from the source slot
        await fetch(API_ENDPOINTS.MATCH_PLAYERS, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            upcoming_match_id: matchId,
            slot_number: sourceSlot.slot_number
          })
        });
      }
      
      // Update the local state
      const updatedSlots = [...currentSlots];
      
      // Swap the player IDs between source and target slots
      if (targetPlayerId) {
        // Swap players between slots
        updatedSlots[sourceSlot.slot_number - 1] = {
          ...updatedSlots[sourceSlot.slot_number - 1],
          player_id: targetPlayerId,
          team: sourceTeam
        };
        
        updatedSlots[targetSlot.slot_number - 1] = {
          ...updatedSlots[targetSlot.slot_number - 1],
          player_id: sourcePlayerId,
          team: targetTeam
        };
      } else {
        // Move player to empty slot
        updatedSlots[sourceSlot.slot_number - 1] = {
          ...updatedSlots[sourceSlot.slot_number - 1],
          player_id: null,
          team: sourceTeam
        };
        
        updatedSlots[targetSlot.slot_number - 1] = {
          ...updatedSlots[targetSlot.slot_number - 1],
          player_id: sourcePlayerId,
          team: targetTeam
        };
      }
      
      setCurrentSlots(updatedSlots);
      setIsBalanced(false); // Teams are no longer balanced after a manual move
      
      // Refresh match data to ensure UI is updated correctly
      await onSuccess();
      
    } catch (error) {
      console.error('Error swapping players:', error);
      onError(`Failed to swap players: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDraggedItem(null);
      setIsLoading(false);
    }
  }, [activeMatch, currentSlots, draggedItem, setCurrentSlots, setIsBalanced, setIsLoading, onError, onSuccess]);
  
  // Handle slot tap/select
  const handleSlotTap = useCallback(async (slotNumber: number) => {
    if (!selectedSlot) {
      // First tap - select the slot
      setSelectedSlot(slotNumber);
    } else if (selectedSlot === slotNumber) {
      // Tapped same slot - deselect
      setSelectedSlot(null);
    } else {
      // Second tap - perform swap
      try {
        setIsLoading(true);
        
        // Get the slots involved in the swap
        const firstSlot = currentSlots.find(s => s.slot_number === selectedSlot);
        const secondSlot = currentSlots.find(s => s.slot_number === slotNumber);
        
        if (!firstSlot || !secondSlot) {
          throw new Error('Invalid slot operation');
        }
        
        const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
        
        if (!matchId) {
          throw new Error('No active match selected');
        }
        
        // Determine teams
        const firstTeam = firstSlot.slot_number <= (activeMatch?.team_size || 9) ? 'A' : 'B';
        const secondTeam = secondSlot.slot_number <= (activeMatch?.team_size || 9) ? 'A' : 'B';
        
        // First, remove both players from their slots if present
        if (firstSlot.player_id) {
          await fetch(API_ENDPOINTS.MATCH_PLAYERS, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              upcoming_match_id: matchId,
              player_id: firstSlot.player_id
            })
          });
        }
        
        if (secondSlot.player_id) {
          await fetch(API_ENDPOINTS.MATCH_PLAYERS, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              upcoming_match_id: matchId,
              player_id: secondSlot.player_id
            })
          });
        }
        
        // Then, add them to their new slots
        if (secondSlot.player_id) {
          await fetch(API_ENDPOINTS.MATCH_PLAYERS, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              upcoming_match_id: matchId,
              player_id: secondSlot.player_id,
              team: firstTeam,
              slot_number: firstSlot.slot_number
            })
          });
        }
        
        if (firstSlot.player_id) {
          await fetch(API_ENDPOINTS.MATCH_PLAYERS, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              upcoming_match_id: matchId,
              player_id: firstSlot.player_id,
              team: secondTeam,
              slot_number: secondSlot.slot_number
            })
          });
        }
        
        // Update local state
        const updatedSlots = [...currentSlots];
        const firstIndex = firstSlot.slot_number - 1;
        const secondIndex = secondSlot.slot_number - 1;
        
        // Swap the player IDs
        [updatedSlots[firstIndex].player_id, updatedSlots[secondIndex].player_id] = 
        [updatedSlots[secondIndex].player_id, updatedSlots[firstIndex].player_id];
        
        setCurrentSlots(updatedSlots);
        setIsBalanced(false);
        
        // Refresh match data to ensure UI is updated correctly
        await onSuccess();
        
      } catch (error) {
        console.error('Error swapping players:', error);
        onError(`Failed to swap players: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
        setSelectedSlot(null);
      }
    }
  }, [selectedSlot, currentSlots, activeMatch, setIsLoading, setCurrentSlots, setIsBalanced, onError, onSuccess]);
  
  return {
    draggedItem,
    setDraggedItem,
    highlightedSlot,
    setHighlightedSlot,
    selectedSlot,
    setSelectedSlot,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleSlotTap
  };
}; 