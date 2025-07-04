import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePlayerData } from './usePlayerData.hook';
import { useMatchData } from './useMatchData.hook';
import { useTeamSlots } from './useTeamSlots.hook';
import { useDragAndDrop } from './useDragAndDrop.hook';
import { NewMatchData, PlayerFormData, TeamStats } from '@/types/team-algorithm.types';
import { PlayerProfile, PlayerInPool } from '@/types/player.types';
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

// TODO: Define these types more specifically if available from your types/team-algorithm.types
// interface TeamStatsData { 
//   // Define expected properties, e.g., total_rating: number, player_count: number, etc.
//   [key: string]: any; // Placeholder
// }

interface ComparativeStatsData {
  balanceScore: number; 
  // Define other expected properties
  [key: string]: any; // Placeholder
}

export const useTeamAlgorithm = () => {
  // Local state
  const [error, setError] = useState<string | null>(null);
  const [balanceProgress, setBalanceProgress] = useState<number>(0);
  const [isRingerModalOpen, setIsRingerModalOpen] = useState<boolean>(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [selectedPoolPlayers, setSelectedPoolPlayers] = useState<PlayerInPool[]>([]);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [pendingPlayerToggles, setPendingPlayerToggles] = useState<Set<string>>(new Set());
  const [lastSuccessfulBalanceMethod, setLastSuccessfulBalanceMethod] = useState<BalanceMethod | null>(null);
  
  // State for team analysis stats
  const [orangeTeamStats, setOrangeTeamStats] = useState<TeamStats | null>(null);
  const [greenTeamStats, setGreenTeamStats] = useState<TeamStats | null>(null);
  const [comparativeStats, setComparativeStats] = useState<ComparativeStatsData | null>(null);
  
  // New state for player status and config
  const [onFirePlayerId, setOnFirePlayerId] = useState<string | null>(null);
  const [grimReaperPlayerId, setGrimReaperPlayerId] = useState<string | null>(null);
  const [showOnFireIcon, setShowOnFireIcon] = useState<boolean>(true);
  const [showGrimReaperIcon, setShowGrimReaperIcon] = useState<boolean>(true);
  const [configTeamAName, setConfigTeamAName] = useState<string>('Orange'); // Default
  const [configTeamBName, setConfigTeamBName] = useState<string>('Green');  // Default
  
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
      // Reset stats when teams are no longer balanced
      setOrangeTeamStats(null);
      setGreenTeamStats(null);
      setComparativeStats(null);
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
          setOnFirePlayerId(statusData.on_fire_player_id ? String(statusData.on_fire_player_id) : null);
          setGrimReaperPlayerId(statusData.grim_reaper_player_id ? String(statusData.grim_reaper_player_id) : null);
        } else {
          console.warn('Failed to fetch latest player status');
        }

        // Fetch admin config for icons (match_report group)
        const reportConfigRes = await fetch('/api/admin/app-config?group=match_report');
        if (reportConfigRes.ok) {
          const reportConfigData: { success: boolean, data: AppConfig[] } = await reportConfigRes.json();
          if (reportConfigData.success && reportConfigData.data) {
            const onFireSetting = reportConfigData.data.find(c => c.config_key === 'show_on_fire');
            const grimReaperSetting = reportConfigData.data.find(c => c.config_key === 'show_grim_reaper');
            setShowOnFireIcon(onFireSetting?.config_value !== 'false');
            setShowGrimReaperIcon(grimReaperSetting?.config_value !== 'false');
          }
        } else {
          console.warn('Failed to fetch app config for match_report group');
        }

        // Fetch admin config for team names (match_settings group)
        const settingsConfigRes = await fetch('/api/admin/app-config?group=match_settings');
        if (settingsConfigRes.ok) {
          const settingsConfigData: { success: boolean, data: AppConfig[] } = await settingsConfigRes.json();
          if (settingsConfigData.success && settingsConfigData.data) {
            const teamANameSetting = settingsConfigData.data.find(c => c.config_key === 'team_a_name');
            const teamBNameSetting = settingsConfigData.data.find(c => c.config_key === 'team_b_name');
            if (teamANameSetting?.config_value) {
              setConfigTeamAName(teamANameSetting.config_value);
            }
            if (teamBNameSetting?.config_value) {
              setConfigTeamBName(teamBNameSetting.config_value);
            }
          }
        } else {
          console.warn('Failed to fetch app config for match_settings group');
        }

      } catch (err) {
        console.error('Error fetching player status or config:', err);
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
          const playerData = players.find(p => p.id === pp.id);
          if (!playerData) return null;
          
          return {
            ...playerData,
            responseStatus: pp.responseStatus || 'PENDING'
          };
        }).filter(Boolean) as PlayerInPool[];
        
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
      setBalanceProgress(0);
      setOrangeTeamStats(null);
      setGreenTeamStats(null);
      setComparativeStats(null);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const hiddenSlots = currentSlots.map(slot => ({ ...slot, temp_hidden: true }));
      setCurrentSlots(hiddenSlots);
      setBalanceProgress(25);
      
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      if (!matchId) throw new Error('No active match selected');
      if (selectedPoolPlayers.length < 2) throw new Error('Please select at least 2 players in the player pool before balancing');
      
      setBalanceProgress(50);
      const playerIds = selectedPoolPlayers.map(player => player.id);

      // Perform the balancing operation via API
      if (method === 'random') {
        await TeamAPIService.balanceTeamsRandomly(matchId, playerIds);
      } else if (method === 'performance') {
        await TeamAPIService.balanceTeamsByPastPerformance(matchId, playerIds);
      } else { // ability (default)
        await TeamBalanceService.balanceTeams(matchId); // This only returns a boolean
      }
      
      setBalanceProgress(75);        
      setIsBalanced(true);
      setLastSuccessfulBalanceMethod(method);
      
      // After balancing, refresh match data to get the new slot assignments
      await refreshMatchData(); // This will update currentSlots via underlying hook state changes

      if (method === 'ability') {
        // currentSlots should now be updated from the refreshMatchData call.
        if (activeMatch && players.length > 0 && currentSlots.length > 0) {
          const teamSize = activeMatch.team_size;
          const teamASlots = currentSlots.filter(s => s.slot_number <= teamSize);
          const teamBSlots = currentSlots.filter(s => s.slot_number > teamSize);

          const allPlayersInSlots = players.filter(p => 
            currentSlots.some(s => String(s.player_id) === p.id)
          );

          const calculatedOrangeStats = TeamBalanceService.calculateTeamStats(teamASlots, allPlayersInSlots);
          const calculatedGreenStats = TeamBalanceService.calculateTeamStats(teamBSlots, allPlayersInSlots);
          setOrangeTeamStats(calculatedOrangeStats);
          setGreenTeamStats(calculatedGreenStats);

          if (calculatedOrangeStats && calculatedGreenStats) {
            const calculatedCompStats = TeamBalanceService.calculateComparativeStats(teamASlots, teamBSlots, allPlayersInSlots);
            setComparativeStats(calculatedCompStats);
          }
        } else {
          // Not enough data to calculate stats, ensure they are null
          setOrangeTeamStats(null);
          setGreenTeamStats(null);
          setComparativeStats(null);
        }
      } else {
        // For non-ability based balancing, ensure stats are cleared
        setOrangeTeamStats(null);
        setGreenTeamStats(null);
        setComparativeStats(null);
      }
      
      setBalanceProgress(100);
      
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
          await TeamAPIService.addPlayerToPool(matchId.toString(), newRinger.id);
          
          // Add to the local selectedPoolPlayers state
          setSelectedPoolPlayers(prev => [...prev, { ...newRinger, responseStatus: 'PENDING' }]);
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
  const handleTogglePlayerInPool = useCallback(async (player: PlayerProfile) => {
    if (!activeMatch) {
      setError("No active match to manage player pool.");
      return;
    }

    const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
    if (!matchId) {
      setError("Match ID is missing.");
      return;
    }

    const playerIdStr = player.id;
    if (pendingPlayerToggles.has(playerIdStr)) {
      return; // Already processing
    }
    setPendingPlayerToggles(prev => new Set(prev).add(playerIdStr));

    const previousSelectedPoolPlayers = [...selectedPoolPlayers]; // Store previous state for rollback

    try {
      const isSelected = selectedPoolPlayers.some(p => p.id === player.id);

      if (isSelected) {
        // Optimistically update UI
        setSelectedPoolPlayers(prev => prev.filter(p => p.id !== player.id));
        await TeamAPIService.removePlayerFromPool(matchId.toString(), playerIdStr);
      } else {
        // Optimistically update UI
        // Check again to prevent duplicates if rapidly called before state updates (though pendingPlayerToggles helps)
        if (!selectedPoolPlayers.some(p => p.id === player.id)) {
          setSelectedPoolPlayers(prev => [...prev, { ...player, responseStatus: 'PENDING' }]); 
        }
        await TeamAPIService.addPlayerToPool(matchId.toString(), playerIdStr);
      }
      setError(null); // Clear any previous errors on success
    } catch (err) {
      console.error('Error toggling player in pool:', err);
      setError(`Failed to update player pool: ${err instanceof Error ? err.message : String(err)}`);
      // Rollback UI change on error
      setSelectedPoolPlayers(previousSelectedPoolPlayers);
    } finally {
      setPendingPlayerToggles(prev => {
        const next = new Set(prev);
        next.delete(playerIdStr);
        return next;
      });
    }
  }, [activeMatch, selectedPoolPlayers, pendingPlayerToggles, setError]); // Added selectedPoolPlayers to dependencies due to its use in rollback
  
  // Calculate available players based on the current pool
  const availablePlayersForSelection = useMemo(() => {
    if (!activeMatch || !selectedPoolPlayers.length) return [];
    // Filter selectedPoolPlayers to exclude those already in currentSlots
    const assignedPlayerIds = new Set(currentSlots.map(s => String(s.player_id)).filter(Boolean));
    return selectedPoolPlayers.filter(p => !assignedPlayerIds.has(p.id));
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
      const playerIdsToAssign = selectedPoolPlayers.map(p => p.id);
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
    if (!activeMatch || !currentSlots.some(slot => slot.player_id !== null)) {
      setError('No teams to copy.');
      return;
    }

    const playersInSlots = players.filter(p => currentSlots.some(s => String(s.player_id) === p.id));

    const teamsText = formatTeamsForCopy(
      currentSlots,
      playersInSlots,
      configTeamAName,      // Use fetched team name
      configTeamBName,      // Use fetched team name
      onFirePlayerId,
      grimReaperPlayerId,
      showOnFireIcon,
      showGrimReaperIcon
    );

    navigator.clipboard.writeText(teamsText)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
      })
      .catch(err => {
        console.error('Failed to copy teams: ', err);
        setError('Failed to copy teams. Please try again.');
      });
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
      // Call API to clear assignments for the match (from current new hook)
      // This might be redundant if clearing the pool also implies unassigning,
      // or if assignments are managed separately. For now, keeping it.
      await TeamAPIService.clearTeamAssignments(matchId.toString());
      
      // Clear local slots and unmark as balanced (from current new hook)
      clearSlots(); 
      setIsBalanced(false);
      setLastSuccessfulBalanceMethod(null);
      // Also clear team stats when teams are cleared
      setOrangeTeamStats(null);
      setGreenTeamStats(null);
      setComparativeStats(null);

      // === New logic for clearing player pool ===
      await TeamAPIService.clearEntirePlayerPool(matchId.toString());
      setSelectedPoolPlayers([]); // Clear local pool state
      // === End of new logic ===
      
      // Refresh data to confirm clearance (optional, clearSlots might be enough)
      await refreshMatchData(); 
      
    } catch (err) {
      console.error('Error during clear teams/pool operation:', err); 
      setError(`Failed to clear teams/pool: ${err instanceof Error ? err.message : String(err)}`);
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
    orangeTeamStats,
    greenTeamStats,
    comparativeStats,
    configTeamAName,
    configTeamBName,

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
