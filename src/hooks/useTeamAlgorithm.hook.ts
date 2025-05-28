import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePlayerData } from './usePlayerData.hook';
import { useMatchData } from './useMatchData.hook';
import { useTeamSlots } from './useTeamSlots.hook';
import { useDragAndDrop } from './useDragAndDrop.hook';
import { Player, NewMatchData, PlayerFormData } from '@/types/team-algorithm.types';
import { TeamBalanceService } from '@/services/TeamBalance.service';
import { TeamAPIService } from '@/services/TeamAPI.service';
import { determinePositionGroups, formatTeamsForCopy, createCopyModal } from '@/utils/teamAlgorithm.util';

// Define a type for the player status API response
interface PlayerStatusResponse {
  on_fire_player_id: number | null;
  grim_reaper_player_id: number | null;
}

// Define a type for the app config API response
interface AppConfig {
  config_key: string;
  config_value: string;
}

export type BalanceMethod = 'ability' | 'random' | 'performance';

export const useTeamAlgorithm = () => {
  // Local state
  const [error, setError] = useState<string | null>(null);
  const [balanceProgress, setBalanceProgress] = useState<number>(0);
  const [isRingerModalOpen, setIsRingerModalOpen] = useState<boolean>(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [selectedPoolPlayers, setSelectedPoolPlayers] = useState<Player[]>([]);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [pendingPlayerToggles, setPendingPlayerToggles] = useState<Set<string>>(new Set());
  const [lastSuccessfulBalanceMethod, setLastSuccessfulBalanceMethod] = useState<BalanceMethod | null>(null);
  
  // New state for player status and config
  const [onFirePlayerId, setOnFirePlayerId] = useState<number | null>(null);
  const [grimReaperPlayerId, setGrimReaperPlayerId] = useState<number | null>(null);
  const [showOnFireIcon, setShowOnFireIcon] = useState<boolean>(true);
  const [showGrimReaperIcon, setShowGrimReaperIcon] = useState<boolean>(true);
  
  // Use our custom hooks
  const { 
    players, 
    isLoadingPlayers, 
    addRinger,
    fetchPlayers 
  } = usePlayerData();
  
  const { 
    activeMatch, 
    isLoadingMatch, 
    defaultMatchDate, 
    createMatchError, 
    createMatch, 
    updateMatch,
    clearActiveMatch, 
    fetchActiveMatch
  } = useMatchData();
  
  const { 
    currentSlots, 
    setCurrentSlots, 
    isBalanced, 
    setIsBalanced, 
    isLoading, 
    setIsLoading, 
    selectPlayer, 
    clearSlots, 
    getAvailablePlayers: getAvailablePlayersFn
  } = useTeamSlots(activeMatch, setError);
  
  // Effect to reset lastSuccessfulBalanceMethod when teams become unbalanced
  useEffect(() => {
    if (!isBalanced) {
      setLastSuccessfulBalanceMethod(null);
    }
  }, [isBalanced]);
  
  // Fetch player status and admin config on mount
  useEffect(() => {
    const fetchStatusAndConfig = async () => {
      try {
        // Fetch player status (on fire/grim reaper)
        const playerStatusRes = await fetch('/api/latest-player-status');
        if (playerStatusRes.ok) {
          const statusData: PlayerStatusResponse = await playerStatusRes.json();
          setOnFirePlayerId(statusData.on_fire_player_id);
          setGrimReaperPlayerId(statusData.grim_reaper_player_id);
        } else {
          console.warn('Failed to fetch latest player status');
        }

        // Fetch admin config for icons
        const configRes = await fetch('/api/admin/app-config?group=match_report'); // Assuming group is match_report or similar
        if (configRes.ok) {
          const configData: { success: boolean, data: AppConfig[] } = await configRes.json();
          if (configData.success && configData.data) {
            const onFireSetting = configData.data.find(c => c.config_key === 'show_on_fire');
            const grimReaperSetting = configData.data.find(c => c.config_key === 'show_grim_reaper');
            setShowOnFireIcon(onFireSetting?.config_value !== 'false');
            setShowGrimReaperIcon(grimReaperSetting?.config_value !== 'false');
          }
        } else {
          console.warn('Failed to fetch app config for icons');
        }
      } catch (err) {
        console.error('Error fetching player status or config:', err);
        // Optionally set an error state for the UI
      }
    };

    fetchStatusAndConfig();
  }, []); // Empty dependency array to run once on mount
  
  // Load existing pool players when match changes
  useEffect(() => {
    const loadPoolPlayers = async () => {
      try {
        // Get the correct match ID
        const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
        if (!matchId) return;

        // Fetch pool players from the database
        const poolPlayersData = await TeamAPIService.fetchPlayerPool(matchId.toString());
        
        // Map pool players to Player format
        const poolPlayers = poolPlayersData.map(pp => {
          // Find full player data from the players array
          const playerData = players.find(p => p.id.toString() === pp.id.toString());
          if (!playerData) return null;
          
          return {
            ...playerData,
            response_status: pp.response_status
          };
        }).filter(Boolean) as Player[];
        
        // Update state
        setSelectedPoolPlayers(poolPlayers);
      } catch (error) {
        console.error('Error loading pool players:', error);
        setError(`Failed to load player pool: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    loadPoolPlayers();
  }, [activeMatch, players]);
  
  // Success callback for drag and drop operations
  const refreshMatchData = useCallback(async () => {
    await fetchActiveMatch();
  }, [fetchActiveMatch]);
  
  const { 
    draggedItem, 
    highlightedSlot, 
    selectedSlot, 
    handleDragStart, 
    handleDragOver, 
    handleDrop, 
    handleSlotTap 
  } = useDragAndDrop(
    activeMatch, 
    currentSlots, 
    setCurrentSlots, 
    setIsBalanced, 
    setIsLoading, 
    setError, 
    refreshMatchData
  );
  
  // Memoized position groups for both teams
  const orangePositionGroups = useMemo(() => {
    return activeMatch ? determinePositionGroups(activeMatch.team_size, 'orange') : [];
  }, [activeMatch]);
  
  const greenPositionGroups = useMemo(() => {
    return activeMatch ? determinePositionGroups(activeMatch.team_size, 'green') : [];
  }, [activeMatch]);
  
  // Function to handle team balancing
  const handleBalanceTeams = async (method: BalanceMethod = 'ability') => {
    try {
      setIsLoading(true);
      setError(null);
      setBalanceProgress(0); // Reset progress first
      
      // Short delay to ensure UI updates and shows the loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clear or hide current assignments during balancing to prevent flickering
      const hiddenSlots = currentSlots.map(slot => ({
        ...slot,
        temp_hidden: true // Mark slots as temporarily hidden for UI
      }));
      setCurrentSlots(hiddenSlots);
      
      // Progress indicator - using percentage values (0-100)
      setBalanceProgress(25); // Starting
      
      // Get the correct match ID (prioritize upcoming_match_id)
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      
      if (!matchId) {
        throw new Error('No active match selected');
      }
      
      // Check if we have enough players selected in the pool
      if (selectedPoolPlayers.length < 2) {
        throw new Error('Please select at least 2 players in the player pool before balancing');
      }
      
      setBalanceProgress(50); // Processing
      
      // Get player IDs from the selected pool for methods that require it
      const playerIds = selectedPoolPlayers.map(player => player.id.toString());

      let result;
      
      if (method === 'random') {
        result = await TeamAPIService.balanceTeamsRandomly(matchId, playerIds);
      } else if (method === 'performance') {
        result = await TeamAPIService.balanceTeamsByPastPerformance(matchId, playerIds);
      } else {
        // Default to ability-based balancing
        // The server already knows to use players from the pool for ability balancing
        // and doesn't require playerIds to be passed for that specific legacy endpoint.
        result = await TeamBalanceService.balanceTeams(matchId);
      }
      
      setBalanceProgress(75); // Almost done
        
      // Mark as balanced and store the method used
      setIsBalanced(true);
      setLastSuccessfulBalanceMethod(method);
      
      // Refresh data to get updated team assignments
      await refreshMatchData();
      
      setBalanceProgress(100); // Complete
      
    } catch (error) {
      console.error('Error balancing teams:', error);
      setError(`${error instanceof Error ? error.message : String(error)}`);
      setBalanceProgress(0); // Reset progress on error
    } finally {
      // Delay clearing the progress bar to give a sense of completion
      setTimeout(() => {
        setBalanceProgress(0);
      }, 2000); // Keep it for 2 seconds
      
      // Re-show slots
      const visibleSlots = currentSlots.map(slot => ({ ...slot, temp_hidden: false }));
      setCurrentSlots(visibleSlots);
      setIsLoading(false);
    }
  };
  
  // Add ringer to the player list and optionally to the current match
  const handleAddRinger = async (ringerData: PlayerFormData, assignToMatch: boolean = false) => {
    try {
      setError(null);
      setIsLoading(true); // Indicate loading
      
      // Add ringer using usePlayerData hook
      const newRinger = await addRinger(ringerData);
      
      // If assignToMatch is true, and there's an active match, add to match pool
      if (newRinger && assignToMatch && activeMatch) {
        const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
        if (matchId) {
          // Add to the match's player pool in the database
          await TeamAPIService.addPlayerToPool(matchId.toString(), newRinger.id.toString());
          
          // Add to the local selectedPoolPlayers state
          setSelectedPoolPlayers(prev => [...prev, newRinger]);
        }
      }
      
      setIsRingerModalOpen(false); // Close modal on success
    } catch (error) {
      console.error('Error adding ringer:', error);
      setError(`Failed to add ringer: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  // Function to handle creating a new match
  const handleCreateMatch = async (newMatchData: NewMatchData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the createMatch function from useMatchData hook
      await createMatch(newMatchData);
      
      setIsMatchModalOpen(false); // Close modal on success
    } catch (error) {
      // Error is already handled and set by useMatchData hook
      // setError is available if specific error handling is needed here
      console.error('Error creating match (from useTeamAlgorithm):', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to manually assign a player to a slot
  const handleManualAssign = async (playerId: string, slotNumber: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the correct match ID
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      if (!matchId) {
        throw new Error('No active match selected for manual assignment.');
      }

      // Determine team based on slot number (assuming standard 9-a-side for now, or use activeMatch.team_size)
      const teamSize = activeMatch?.team_size || 9;
      const team = slotNumber <= teamSize ? 'A' : 'B';

      // Call API to assign player
      await TeamAPIService.assignPlayerToSlot(matchId.toString(), playerId, slotNumber, team);
      
      // Refresh data to get updated team assignments
      await refreshMatchData(); 
      setIsBalanced(false); // Manual assignment might unbalance teams
      
    } catch (error) {
      console.error('Error manually assigning player:', error);
      setError(`Failed to assign player: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle player selection in the pool
  const handleTogglePlayerInPool = async (playerId: string, isSelected: boolean) => {
    if (!activeMatch) {
      setError("No active match to manage player pool.");
      return;
    }

    const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
    if (!matchId) {
      setError("Match ID is missing.");
      return;
    }

    // Add to pending toggles to manage UI state immediately
    setPendingPlayerToggles(prev => new Set(prev).add(playerId));

    try {
      if (isSelected) {
        // Add player to pool
        await TeamAPIService.addPlayerToPool(matchId.toString(), playerId);
        const playerToAdd = players.find(p => p.id.toString() === playerId);
        if (playerToAdd) {
          setSelectedPoolPlayers(prev => [...prev, playerToAdd]);
        }
      } else {
        // Remove player from pool
        await TeamAPIService.removePlayerFromPool(matchId.toString(), playerId);
        setSelectedPoolPlayers(prev => prev.filter(p => p.id.toString() !== playerId));
      }
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error toggling player in pool:', err);
      setError(`Failed to update player pool: ${err instanceof Error ? err.message : String(err)}`);
      // Revert optimistic UI update if API call fails by re-fetching or specific logic
      // For simplicity, we'll rely on a full refresh or user action to correct discrepancies here.
    } finally {
      // Remove from pending toggles
      setPendingPlayerToggles(prev => {
        const next = new Set(prev);
        next.delete(playerId);
        return next;
      });
    }
  };
  
  // Calculate available players based on the current pool
  const availablePlayersForSelection = useMemo(() => {
    if (!activeMatch || !selectedPoolPlayers.length) return [];
    // Filter selectedPoolPlayers to exclude those already in currentSlots
    const assignedPlayerIds = new Set(currentSlots.map(s => s.player_id).filter(Boolean));
    return selectedPoolPlayers.filter(p => !assignedPlayerIds.has(p.id.toString()));
  }, [selectedPoolPlayers, currentSlots, activeMatch]);

  // Function to save current team assignments to the database
  const handleSaveAssignments = async () => {
    if (!activeMatch || !isBalanced) {
      setError("Cannot save: No active match or teams are not balanced.");
      return;
    }
    const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
    if (!matchId) {
      setError("Match ID is missing.");
      return;
    }

    setIsLoading(true);
    try {
      // Construct payload based on currentSlots
      const assignments = currentSlots
        .filter(slot => slot.player_id !== null)
        .map(slot => ({
          player_id: slot.player_id!,
          slot_id: slot.slot_number, // Changed from slot.id
          team_name: slot.team,       // Changed from slot.team_name
          position_name: slot.position, // Changed from slot.position_name
        }));

      if (assignments.length === 0) {
        setError("No players assigned to save.");
        return;
      }
      
      // Call API to save assignments (assuming an endpoint like this exists)
      // This would typically be part of updateMatch or a specific assignment endpoint
      // For now, let's simulate success and rely on the existing flow.
      // If activeMatch contains all necessary NewMatchData fields, use them.
      // Otherwise, this part needs a more robust way to get complete NewMatchData.
      if (activeMatch && (activeMatch.match_date || activeMatch.date) && activeMatch.team_size) {
        await updateMatch({ 
          match_id: matchId, 
          match_date: activeMatch.match_date || activeMatch.date, // Prioritize match_date
          team_size: activeMatch.team_size,
          date: activeMatch.match_date || activeMatch.date, // Also pass date for NewMatchData
        });
      } else if (activeMatch) {
        // Fallback if full NewMatchData isn't directly on activeMatch, might need to fetch or use defaults
        console.warn("Attempting to save assignments: Match date or team size missing from activeMatch. Using placeholders.");
        await updateMatch({
           match_id: matchId,
           match_date: defaultMatchDate, // Or some other sensible default/fetched value
           team_size: 9, // Or some other sensible default/fetched value
           date: defaultMatchDate, // Also pass date for NewMatchData
        });
      } else {
        setError("Cannot save assignments: Active match data is incomplete.");
        setIsLoading(false);
        return;
      }

      alert('Team assignments saved successfully!'); // Or use a more sophisticated notification
      setError(null);
    } catch (err) {
      console.error('Error saving assignments:', err);
      setError(`Failed to save assignments: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to assign all players from the pool to the match
  const handleAssignPoolPlayers = async (shouldClearPool = false) => {
    if (!activeMatch) {
      setError("No active match to assign players to.");
      return;
    }
    const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
    if (!matchId) {
      setError("Match ID is missing.");
      return;
    }

    setIsLoading(true);
    try {
      const playerIdsToAssign = selectedPoolPlayers.map(p => p.id.toString());
      if (playerIdsToAssign.length === 0) {
        setError("No players in the pool to assign.");
        return;
      }

      // This function is conceptual. 
      // You'd need an API endpoint like `assignMultiplePlayersToMatch` or similar.
      // await TeamAPIService.assignPlayersToMatch(matchId, playerIdsToAssign);
      console.log("Conceptual: Assigning players to match", matchId, playerIdsToAssign);
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // After successful assignment, you might want to clear the pool locally if shouldClearPool is true
      if (shouldClearPool) {
        setSelectedPoolPlayers([]);
        // Optionally, also clear from the backend if the above API doesn't handle it
      }
      
      // Refresh match data to reflect new assignments (if backend handles slotting)
      // Or manually update currentSlots if assignments are only local until save
      await refreshMatchData(); 
      setIsBalanced(false); // New players likely unbalance teams until re-balanced

      alert('Selected pool players assigned to the match. Please re-balance if needed.');
      setError(null);
    } catch (err) {
      console.error('Error assigning pool players:', err);
      setError(`Failed to assign pool players: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTeams = () => {
    if (!activeMatch || currentSlots.length === 0) {
      setError("No active match or team data to copy.");
      return;
    }

    const teamDataText = formatTeamsForCopy(
      currentSlots, 
      players, 
      onFirePlayerId, 
      grimReaperPlayerId,
      showOnFireIcon, 
      showGrimReaperIcon
    );
    
    createCopyModal(teamDataText);
  };
  
  // Function to clear team assignments
  const handleClearTeams = () => {
    if (!activeMatch) {
      setError("No active match to clear teams from.");
      return;
    }
    setIsClearConfirmOpen(true); // Open confirmation dialog
  };

  // Confirmation action for clearing teams
  const confirmClearTeams = async () => {
    setIsClearConfirmOpen(false); // Close dialog
    if (!activeMatch) return;

    const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
    if (!matchId) {
      setError("Match ID is missing for clearing teams.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Call API to clear assignments for the match
      await TeamAPIService.clearTeamAssignments(matchId.toString());
      
      // Clear local slots and unmark as balanced
      clearSlots(); 
      setIsBalanced(false);
      setLastSuccessfulBalanceMethod(null);
      
      // Refresh data to confirm clearance (optional, clearSlots might be enough)
      await refreshMatchData(); 
      
    } catch (err) {
      console.error('Error clearing team assignments:', err);
      setError(`Failed to clear teams: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle changes in the new match form
  const handleMatchFormChange = (field: string, value: any) => {
    // This function would typically update a local state for the new match form
    // For example: setNewMatchDetails(prev => ({ ...prev, [field]: value }));
    // Since the form state is not managed within this hook directly, 
    // this is a placeholder or should be connected to the component's state management.
    console.log('Match form change:', field, value);
  };
  
  // Effect to refetch players if activeMatch changes (e.g., after creating a new match)
  // This is to ensure the player list (especially ringer status) is up-to-date for the new match context
  useEffect(() => {
    if (activeMatch) {
      fetchPlayers(); // from usePlayerData
    }
  }, [activeMatch, fetchPlayers]);

  return {
    // State
    players,
    isLoadingPlayers,
    activeMatch,
    isLoadingMatch,
    currentSlots,
    isBalanced,
    isLoading,
    error,
    defaultMatchDate,
    createMatchError,
    draggedItem,
    highlightedSlot,
    selectedSlot,
    isRingerModalOpen,
    isMatchModalOpen,
    isClearConfirmOpen,
    selectedPoolPlayers,
    orangePositionGroups,
    greenPositionGroups,
    copySuccess,
    balanceProgress,    
    pendingPlayerToggles,
    lastSuccessfulBalanceMethod,
    onFirePlayerId,
    grimReaperPlayerId,
    showOnFireIcon,
    showGrimReaperIcon,
    availablePlayersForSelection,

    // Actions
    setCurrentSlots,
    setIsBalanced,
    setIsLoading,
    setError,
    selectPlayer,
    clearSlots,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleSlotTap,
    handleBalanceTeams,
    handleAddRinger,
    setIsRingerModalOpen,
    handleCreateMatch,
    setIsMatchModalOpen,
    handleMatchFormChange, 
    handleManualAssign,
    handleTogglePlayerInPool,
    handleSaveAssignments,
    handleAssignPoolPlayers,
    handleCopyTeams,
    setCopySuccess,
    handleClearTeams,
    confirmClearTeams,
    setIsClearConfirmOpen,
    clearActiveMatch, 
    fetchActiveMatch, 
    fetchPlayers, // Re-exporting for direct use if needed
    updateMatch, // Re-exporting for direct use if needed
    getAvailablePlayersFn, // Add getAvailablePlayersFn to the return object
  };
};
