import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePlayerData } from './usePlayerData';
import { useMatchData } from './useMatchData';
import { useTeamSlots } from './useTeamSlots';
import { useDragAndDrop } from './useDragAndDrop';
import { RingerForm, Player, NewMatchData } from '@/types/team-algorithm.types';
import { TeamBalanceService } from '@/services/TeamBalanceService';
import { TeamAPIService } from '@/services/TeamAPI.service';
import { DEFAULT_RINGER_FORM } from '@/constants/team-algorithm.constants';
import { determinePositionGroups, formatTeamsForCopy, createCopyModal } from '@/utils/team-algorithm.utils';

export const useTeamAlgorithm = () => {
  // Local state
  const [error, setError] = useState<string | null>(null);
  const [balanceProgress, setBalanceProgress] = useState<number>(0);
  const [isRingerModalOpen, setIsRingerModalOpen] = useState<boolean>(false);
  const [ringerForm, setRingerForm] = useState<RingerForm>(DEFAULT_RINGER_FORM);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [selectedPoolPlayers, setSelectedPoolPlayers] = useState<Player[]>([]);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [pendingPlayerToggles, setPendingPlayerToggles] = useState<Set<string>>(new Set());
  
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
  const handleBalanceTeams = async (method: 'ability' | 'random' = 'ability') => {
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
      
      // Simple progress indicator
      setBalanceProgress(50);
      
      // Get the correct match ID (prioritize upcoming_match_id)
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      
      if (!matchId) {
        throw new Error('No active match selected');
      }
      
      // Check if we have enough players selected in the pool
      if (selectedPoolPlayers.length < 2) {
        throw new Error('Please select at least 2 players in the player pool before balancing');
      }
      
      // Use the appropriate balancing method
      let result;
      
      if (method === 'random') {
        // Get player IDs from the selected pool
        const playerIds = selectedPoolPlayers.map(player => player.id.toString());
        result = await TeamAPIService.balanceTeamsRandomly(matchId, playerIds);
      } else {
        // Default to ability-based balancing
        // The server already knows to use players from the pool
        result = await TeamBalanceService.balanceTeams(matchId);
      }
        
      // Mark as balanced
      setIsBalanced(true);
      
      // Refresh data to get updated team assignments
      await refreshMatchData();
      
    } catch (error) {
      console.error('Error balancing teams:', error);
      setError(`${error instanceof Error ? error.message : String(error)}`);
      setBalanceProgress(0); // Reset progress on error
    } finally {
      setBalanceProgress(100);
      // Delay clearing the progress bar to give a sense of completion
      setTimeout(() => {
        setBalanceProgress(0);
        setIsLoading(false);
      }, 500);
    }
  };
  
  // Function to handle pool player auto-assignment
  const handleAssignPoolPlayers = async (shouldClearPool = false) => {
    if (selectedPoolPlayers.length === 0 || !activeMatch) return;
    
    try {
      setIsLoading(true);
      const teamSize = activeMatch.team_size || 9;
      let assignedCount = 0;
      
      // Get free slots
      const orangeFreeSlots = currentSlots
        .filter(s => s.slot_number <= teamSize && s.player_id === null)
        .sort((a, b) => a.slot_number - b.slot_number);
        
      const greenFreeSlots = currentSlots
        .filter(s => s.slot_number > teamSize && s.player_id === null)
        .sort((a, b) => a.slot_number - b.slot_number);
      
      // Assign evenly to both teams
      for (const player of selectedPoolPlayers) {
        // Alternate between teams
        const targetSlot = assignedCount % 2 === 0 && orangeFreeSlots.length > 0
          ? orangeFreeSlots.shift()
          : greenFreeSlots.shift();
        
        if (!targetSlot) break;
        
        // Assign player to slot
        await selectPlayer(targetSlot.slot_number, player.id);
        assignedCount++;
      }
      
      // Never clear pool by default, only if explicitly requested
      if (shouldClearPool) {
        setSelectedPoolPlayers([]);
      }
      
    } catch (error) {
      console.error('Error assigning players:', error);
      setError(`Failed to assign players: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to handle copying teams to clipboard
  const handleCopyTeams = useCallback(async () => {
    try {
      const teamsText = formatTeamsForCopy(currentSlots, players);
      
      // Use the Clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(teamsText);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000); // Hide the message after 2 seconds
      } else {
        // Fallback method for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = teamsText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful) {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        } else {
          // If clipboard copy fails, fall back to modal
          const modal = createCopyModal(teamsText);
          document.body.appendChild(modal);
          
          // Select the text for copying
          const pre = modal.querySelector('pre');
          if (pre) {
            const range = document.createRange();
            range.selectNode(pre);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
          }
        }
      }
    } catch (error) {
      console.error('Error copying teams:', error);
      setError(`Failed to copy teams: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fall back to modal if any error occurs
      const modal = createCopyModal(formatTeamsForCopy(currentSlots, players));
      document.body.appendChild(modal);
    }
  }, [currentSlots, players]);
  
  // Handle a new match creation
  const handleCreateMatch = useCallback(async (matchData: NewMatchData) => {
    const result = await createMatch(matchData);
    if (result) {
      setIsMatchModalOpen(false);
    }
  }, [createMatch]);
  
  // Handle adding a ringer player
  const handleAddRinger = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Validate required fields
      if (!ringerForm.name.trim()) {
        setError('Player name is required');
        return;
      }
      
      // Check if we've already reached the maximum players for the pool
      const maxAllowedPlayers = (activeMatch?.team_size || 9) * 2;
      if (selectedPoolPlayers.length >= maxAllowedPlayers) {
        setError('Maximum number of players has been reached');
        return;
      }
      
      // Add the ringer
      const result = await addRinger({
        name: ringerForm.name,
        goalscoring: ringerForm.goalscoring,
        defending: ringerForm.defending,
        stamina_pace: ringerForm.stamina_pace,
        control: ringerForm.control,
        teamwork: ringerForm.teamwork,
        resilience: ringerForm.resilience,
        is_ringer: true
      });
      
      if (result) {
        // Reset form and close modal
        setRingerForm(DEFAULT_RINGER_FORM);
        setIsRingerModalOpen(false);
        
        // Add the new player to the pool
        if (activeMatch) {
          const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
          await TeamAPIService.addPlayerToPool(matchId.toString(), result.id.toString());
          
          // Update the local player pool state
          setSelectedPoolPlayers(prev => [...prev, result]);
        }
      }
    } catch (error) {
      console.error('Error adding ringer:', error);
      setError(`Failed to add ringer: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [ringerForm, addRinger, activeMatch, selectedPoolPlayers.length]);
  
  // Handle ringer form field changes
  const handleRingerFormChange = (field: string, value: any) => {
    setRingerForm(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle toggling a player in the pool
  const handleTogglePoolPlayer = useCallback(async (player: Player) => {
    try {
      // Get the correct match ID (prioritize upcoming_match_id)
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      
      if (!matchId) {
        setError('No active match selected');
        return;
      }
      
      // Check if this player is already being processed
      if (pendingPlayerToggles.has(player.id)) {
        return; // Already processing this player, exit to prevent duplicates
      }
      
      // Mark this player as being processed
      setPendingPlayerToggles(prev => new Set([...prev, player.id]));
      
      const isSelected = selectedPoolPlayers.some(p => p.id === player.id);
      
      if (isSelected) {
        // Remove player from pool in the database
        await TeamAPIService.removePlayerFromPool(matchId.toString(), player.id.toString());
        // Update local state
        setSelectedPoolPlayers(prev => prev.filter(p => p.id !== player.id));
      } else {
        // Check again if the player already exists in the pool to prevent duplicates
        if (!selectedPoolPlayers.some(p => p.id === player.id)) {
          // Add player to pool in the database
          await TeamAPIService.addPlayerToPool(matchId.toString(), player.id.toString());
          // Update local state
          setSelectedPoolPlayers(prev => [...prev, player]);
        }
      }
    } catch (error) {
      console.error('Error toggling player in pool:', error);
      setError(`Failed to update player in pool: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Remove this player from the pending set when done
      setPendingPlayerToggles(prev => {
        const newSet = new Set(prev);
        newSet.delete(player.id);
        return newSet;
      });
    }
  }, [activeMatch, selectedPoolPlayers, pendingPlayerToggles, setError]);
  
  // Function to clear teams with confirmation
  const handleClearTeams = () => {
    setIsClearConfirmOpen(true);
  };
  
  // Clear player pool from database
  const clearPlayerPool = useCallback(async () => {
    try {
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      if (!matchId) return;
      
      // Only proceed if there are players in the pool
      if (selectedPoolPlayers.length === 0) return;
      
      setIsLoading(true);
      
      // Remove each player from pool in the database
      const playersToRemove = [...selectedPoolPlayers];
      for (const player of playersToRemove) {
        await TeamAPIService.removePlayerFromPool(matchId.toString(), player.id.toString());
      }
      
      // Clear local state
      setSelectedPoolPlayers([]);
    } catch (error) {
      console.error('Error clearing player pool:', error);
      setError(`Failed to clear player pool: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeMatch, selectedPoolPlayers, setError, setIsLoading]);
  
  // Confirm clearing teams
  const confirmClearTeams = async () => {
    try {
      setIsLoading(true);
      // First clear slots
      await clearSlots();
      
      // Then clear the player pool
      await clearPlayerPool();
      
      // Close confirmation dialog
      setIsClearConfirmOpen(false);
    } catch (error) {
      console.error('Error in confirmClearTeams:', error);
      setError(`Failed to clear data: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate team statistics
  const calculateTeamStats = useCallback((teamSlots: typeof currentSlots) => {
    return TeamBalanceService.calculateTeamStats(teamSlots, players);
  }, [players]);
  
  // Calculate comparative statistics
  const calculateComparativeStats = useCallback(() => {
    const teamASlots = currentSlots.filter(s => s.slot_number <= (activeMatch?.team_size || 9));
    const teamBSlots = currentSlots.filter(s => s.slot_number > (activeMatch?.team_size || 9));
    
    return TeamBalanceService.calculateComparativeStats(teamASlots, teamBSlots, players);
  }, [currentSlots, activeMatch?.team_size, players]);
  
  // Memoized team stats
  const orangeTeamStats = useMemo(() => {
    const teamSlots = currentSlots.filter(s => s.slot_number <= (activeMatch?.team_size || 9));
    return calculateTeamStats(teamSlots);
  }, [currentSlots, activeMatch?.team_size, calculateTeamStats]);
  
  const greenTeamStats = useMemo(() => {
    const teamSlots = currentSlots.filter(s => s.slot_number > (activeMatch?.team_size || 9));
    return calculateTeamStats(teamSlots);
  }, [currentSlots, activeMatch?.team_size, calculateTeamStats]);
  
  // Memoized comparative stats
  const comparativeStats = useMemo(() => {
    return calculateComparativeStats();
  }, [calculateComparativeStats]);
  
  // Helper function to get available players for a specific slot
  const getAvailablePlayers = useCallback((slot: any) => {
    return getAvailablePlayersFn(slot, players);
  }, [getAvailablePlayersFn, players]);
  
  // Create initial match data for the modal
  const [newMatchData, setNewMatchData] = useState<NewMatchData>({
    date: defaultMatchDate,
    match_date: defaultMatchDate,
    team_size: activeMatch?.team_size || 9
  });
  
  // Update match data for modal
  const handleMatchFormChange = (field: string, value: any) => {
    setNewMatchData(prev => ({ 
      ...prev, 
      [field]: value,
      match_date: field === 'date' ? value : prev.match_date
    }));
  };
  
  // Overall loading state
  const isComponentLoading = isLoadingPlayers || isLoadingMatch || isLoading;
  
  return {
    // State
    players,
    activeMatch,
    currentSlots,
    isBalanced,
    error,
    balanceProgress,
    isRingerModalOpen,
    ringerForm,
    isMatchModalOpen,
    newMatchData,
    isClearConfirmOpen,
    isLoading: isComponentLoading,
    selectedPoolPlayers,
    orangePositionGroups,
    greenPositionGroups,
    draggedItem,
    highlightedSlot,
    selectedSlot,
    orangeTeamStats,
    greenTeamStats,
    comparativeStats,
    createMatchError,
    copySuccess,
    pendingPlayerToggles,
    
    // Actions
    setIsRingerModalOpen,
    setIsMatchModalOpen,
    setIsClearConfirmOpen,
    handleRingerFormChange,
    handleMatchFormChange,
    handleAddRinger,
    handleCreateMatch,
    handleClearTeams,
    confirmClearTeams,
    handleTogglePoolPlayer,
    handleAssignPoolPlayers,
    handleBalanceTeams,
    handleCopyTeams,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleSlotTap,
    selectPlayer, // This is used for player selection in slots
    getAvailablePlayers,
    refreshMatchData
  };
}; 