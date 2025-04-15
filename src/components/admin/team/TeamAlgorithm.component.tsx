'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format, parse } from 'date-fns';
import { useRouter } from 'next/navigation';
import DraggablePlayerSlot from './DraggablePlayerSlot.component';
import { TeamBalanceService } from '@/services/TeamBalanceService';
import PlayerFormModal from '../player/PlayerFormModal.component';

// Types
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

interface PlayerSlotProps {
  slotNumber: number;
  player: Player | undefined;
  players: Player[];
  onSelect: (slotIndex: number, playerId: string) => Promise<void>;
  disabled: boolean;
  stats: string;
  position: string;
  highlighted: boolean;
}

interface Slot {
  slot_number: number;
  player_id: string | null;
  team?: string;
  position?: string | null;
}

interface TeamStructure {
  name: string;
  slots: {
    defenders: number[];
    midfielders: number[];
    attackers: number[];
  };
}

interface SlotInfo {
  team: TeamStructure;
  position: string;
}

interface TeamCharacteristics {
  resilience: number;
  teamwork: number;
}

interface WarningMessage {
  type: 'warning' | 'error';
  message: string;
}

interface PositionGroup {
  title: string;
  slots: number[];
  position: string;
  startSlot: number;
  endSlot: number;
}

interface Match {
  match_id: string;
  upcoming_match_id?: string;
  match_date: string;
  team_size: number;
  is_balanced: boolean;
  date: string;
  players?: Array<{
    player_id: string;
    team?: string;
    slot_number?: number;
    position?: string;
  }>;
}

interface RingerForm {
  name: string;
  goalscoring: number;
  defending: number;
  stamina_pace: number;
  control: number;
  teamwork: number;
  resilience: number;
}

interface NewMatchData {
  match_date: string;
  team_size: number;
  date: string;
}

interface StatBarProps {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
}

interface Stats {
  diffs: Record<string, number>;
  balanceScore: number;
  balanceQuality: string;
}

// Add this helper function after the other helper functions and before the component
const formatDateSafely = (dateString: string | undefined | null): string => {
  if (!dateString) return 'Date not set';
  
  // For server/client consistency, return a simple format
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    // Use toLocaleDateString with explicit locale for consistency
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date format error';
  }
};

// PlayerSlot component for player selection
const PlayerSlot: React.FC<PlayerSlotProps> = ({ slotNumber, player, players, onSelect, disabled, stats, position, highlighted }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-neutral-500 w-6">•</span>
      <select
        value={player?.id || ''}
        onChange={(e) => onSelect(slotNumber, e.target.value)}
        className="flex-1 rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        disabled={disabled}
      >
        <option value="">Select player</option>
        {players.map(p => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
};

// Team structure constants
const TEAM_STRUCTURE = {
  ORANGE: {
    name: 'Orange',
    slots: {
      defenders: [1, 2, 3],
      midfielders: [4, 5, 6, 7],
      attackers: [8, 9]
    }
  },
  GREEN: {
    name: 'Green',
    slots: {
      defenders: [10, 11, 12],
      midfielders: [13, 14, 15, 16],
      attackers: [17, 18]
    }
  }
};

// Helper function to get team and position info from slot number
const getSlotInfo = (slotNumber: number): SlotInfo => {
  const isGreen = slotNumber > 9;
  const team = isGreen ? TEAM_STRUCTURE.GREEN : TEAM_STRUCTURE.ORANGE;
  
  let position: string;
  if (team.slots.defenders.includes(slotNumber)) position = 'defenders';
  else if (team.slots.midfielders.includes(slotNumber)) position = 'midfielders';
  else position = 'attackers';
  
  return { team, position };
};

// Warning message helper
const getWarningMessage = (currentSlots: Slot[], isBalanced: boolean, error: string | null): WarningMessage | null => {
  if (error) return { type: 'error', message: error };
  
  const filledSlotCount = currentSlots.filter(s => s.player_id !== null).length;
  
  // Remove the warning about needing more players
  if (filledSlotCount === 0) return null;
  // Remove the warning about balanced teams - don't show any warnings
  return null;
};

// Helper function to calculate team resilience
const calculateTeamResilience = (players: Player[]): number => {
  if (!players || players.length === 0) return 0;
  const totalResilience = players.reduce((sum, player) => sum + (player.resilience || 3), 0);
  return totalResilience / players.length;
};

// Helper function to calculate team characteristics
const calculateTeamCharacteristics = (players: Player[]): TeamCharacteristics => {
  if (!players || players.length === 0) return { resilience: 0, teamwork: 0 };
  const totalResilience = players.reduce((sum, player) => sum + (player.resilience || 3), 0);
  const totalTeamwork = players.reduce((sum, player) => sum + (player.teamwork || 3), 0);
  return {
    resilience: totalResilience / players.length,
    teamwork: totalTeamwork / players.length
  };
};

// Add the getCurrentDateString helper function before the component
const getCurrentDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Add this for drag and drop
interface DragItem {
  slotNumber: number;
  player: Player;
}

// Add this function before TeamAlgorithm component
const createCopyModal = (text: string) => {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  
  const pre = document.createElement('pre');
  pre.className = 'bg-gray-100 p-4 rounded-md text-sm whitespace-pre-wrap mb-4';
  pre.textContent = text;
  
  const modalContent = document.createElement('div');
  modalContent.className = 'bg-white p-6 rounded-lg shadow-lg max-w-md w-full';
  modalContent.innerHTML = `
    <h3 class="text-xl font-bold mb-4">Copy Teams</h3>
    <p class="text-gray-600 mb-4">Please select and copy the text below:</p>
    <div class="flex justify-end">
      <button class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 transition-colors" onclick="this.closest('.fixed').remove()">
        Close
      </button>
    </div>
  `;
  
  // Insert the pre element after the paragraph
  modalContent.insertBefore(pre, modalContent.lastElementChild);
  modal.appendChild(modalContent);
  
  return modal;
};

const TeamAlgorithm: React.FC = () => {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentSlots, setCurrentSlots] = useState<Slot[]>(Array(18).fill(null).map((_, i) => ({
    slot_number: i + 1,
    player_id: null
  })));
  const [isBalanced, setIsBalanced] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<WarningMessage | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [balanceProgress, setBalanceProgress] = useState<number>(0);
  const [showCopyToast, setShowCopyToast] = useState<boolean>(false);
  const [showRingerModal, setShowRingerModal] = useState<boolean>(false);
  const [ringerForm, setRingerForm] = useState<RingerForm>({
    name: '',
    goalscoring: 3,
    defending: 3,
    stamina_pace: 3,
    control: 3,
    teamwork: 3,
    resilience: 3
  });
  const [isAddingRinger, setIsAddingRinger] = useState<boolean>(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [usingPlannedMatch, setUsingPlannedMatch] = useState<boolean>(false);
  const [showCreateMatchModal, setShowCreateMatchModal] = useState<boolean>(false);
  const [showEditMatchModal, setShowEditMatchModal] = useState<boolean>(false);
  const [showClearMatchConfirm, setShowClearMatchConfirm] = useState<boolean>(false);
  const [createMatchError, setCreateMatchError] = useState<string | null>(null);
  const [defaultMatchDate, setDefaultMatchDate] = useState<string>(getCurrentDateString());
  const [newMatchData, setNewMatchData] = useState<NewMatchData>({
    match_date: getCurrentDateString(),
    team_size: 9,
    date: getCurrentDateString()
  });
  
  // Add drag and drop state
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);
  // Add new state for selected slot
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Define INITIAL_SLOTS constant
  const INITIAL_SLOTS: Slot[] = Array(18).fill(null).map((_, i) => ({
    slot_number: i + 1,
    player_id: null
  }));

  // Drag and drop handlers
  const handleDragStart = (slotNumber: number, player: Player) => {
    setDraggedItem({ slotNumber, player });
  };
  
  const handleDragOver = (e: React.DragEvent, slotNumber: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHighlightedSlot(slotNumber);
  };
  
  const handleDrop = async (e: React.DragEvent, targetSlotNumber: number) => {
    e.preventDefault();
    setHighlightedSlot(null);
    
    if (!draggedItem) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
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
      await fetch('/api/admin/upcoming-match-players', {
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
        await fetch('/api/admin/upcoming-match-players', {
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
        await fetch('/api/admin/upcoming-match-players', {
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
      await refreshMatchData();
      
    } catch (error) {
      console.error('Error swapping players:', error);
      setError(`Failed to swap players: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDraggedItem(null);
      setIsLoading(false);
    }
  };

  // Define refreshMatchData before it's used in useEffect
  const refreshMatchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch updated match data
      const matchResponse = await fetch('/api/admin/upcoming-matches?active=true');
      
      if (!matchResponse.ok) {
        const responseText = await matchResponse.text();
        console.error(`Error fetching match data (${matchResponse.status}): ${responseText}`);
        throw new Error(`Failed to fetch updated match: ${matchResponse.status} ${responseText.substring(0, 100)}`);
      }
      
      const matchData = await matchResponse.json();
      
      if (!matchData.success || !matchData.data) {
        console.error('No active match data found:', matchData);
        // Clear active match if none found
        setActiveMatch(null);
        setCurrentSlots([]);
        setIsBalanced(false);
        setUsingPlannedMatch(false);
        return;
      }
      
      // Set the active match
      const activeMatchData = matchData.data;
      
      // Ensure date field is valid
      if (activeMatchData.date) {
        // Validate date format
        const dateObj = new Date(activeMatchData.date);
        if (isNaN(dateObj.getTime())) {
          console.warn('Invalid date format received:', activeMatchData.date);
          // Try to fix common date format issues
          if (typeof activeMatchData.date === 'string') {
            // If date is in format DD/MM/YYYY, convert to YYYY-MM-DD
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(activeMatchData.date)) {
              const [day, month, year] = activeMatchData.date.split('/');
              activeMatchData.date = `${year}-${month}-${day}`;
            }
          }
        }
      } else if (activeMatchData.match_date) {
        // Use match_date as a fallback
        activeMatchData.date = activeMatchData.match_date;
      }
      
      // For backward compatibility, ensure match_id exists
      if (activeMatchData.upcoming_match_id && !activeMatchData.match_id) {
        activeMatchData.match_id = activeMatchData.upcoming_match_id;
      }
      
      // Create slot assignments from match players
      const teamSize = activeMatchData.team_size || 9; // Default to 9 if missing
      const matchPlayerSlots: Slot[] = Array(teamSize * 2)
        .fill(null)
        .map((_, i) => ({
          slot_number: i + 1,
          player_id: null,
          team: i < teamSize ? 'A' : 'B',
          position: null
        }));
      
      // Fill in existing players if any
      if (activeMatchData.players && activeMatchData.players.length > 0) {
        // Map players to their respective slots
        activeMatchData.players.forEach((player: { slot_number?: number; player_id: string; team?: string; position?: string }) => {
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
      setActiveMatch(activeMatchData);
      setIsBalanced(activeMatchData.is_balanced);
      setCurrentSlots(matchPlayerSlots);
      setUsingPlannedMatch(true);
    } catch (error) {
      console.error('Error refreshing match data:', error);
      setError(`Failed to refresh match data: ${error instanceof Error ? error.message : String(error)}`);
      // Keep the UI in a usable state
      setCurrentSlots(prevSlots => {
        // Only clear slots if we don't have an active match
        // This avoids a state update loop during render
        return prevSlots.length > 0 ? prevSlots : [];
      });
      setUsingPlannedMatch(false);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array to avoid circular reference

  // Helper function to determine position groups based on team size
  const determinePositionGroups = useCallback((teamSize: number, team: string): PositionGroup[] => {
    const isOrange = team.toLowerCase() === 'orange';
    const startingSlot = isOrange ? 1 : teamSize + 1;
    
    // Adjust position distribution based on team size
    let positions: PositionGroup[] = [];
    
    if (teamSize <= 5) {
      // 5-a-side: 2 defenders, 2 midfielders, 1 attacker
      positions = [
        { 
          title: 'Defenders', 
          slots: [startingSlot, startingSlot + 1],
          position: 'Defenders',
          startSlot: startingSlot,
          endSlot: startingSlot + 1
        },
        { 
          title: 'Midfielders', 
          slots: [startingSlot + 2, startingSlot + 3],
          position: 'Midfielders',
          startSlot: startingSlot + 2,
          endSlot: startingSlot + 3
        },
        { 
          title: 'Attackers', 
          slots: [startingSlot + 4],
          position: 'Attackers',
          startSlot: startingSlot + 4,
          endSlot: startingSlot + 4
        }
      ];
    } else if (teamSize <= 7) {
      // 6/7-a-side: 2 defenders, 3 midfielders, 2 attackers
      const attackerCount = Math.max(0, teamSize - 5);
      const attackerSlots = Array.from({ length: attackerCount }, (_, i) => startingSlot + 5 + i);
      positions = [
        { 
          title: 'Defenders', 
          slots: [startingSlot, startingSlot + 1],
          position: 'Defenders',
          startSlot: startingSlot,
          endSlot: startingSlot + 1
        },
        { 
          title: 'Midfielders', 
          slots: [startingSlot + 2, startingSlot + 3, startingSlot + 4],
          position: 'Midfielders',
          startSlot: startingSlot + 2,
          endSlot: startingSlot + 4
        },
        { 
          title: 'Attackers', 
          slots: attackerSlots,
          position: 'Attackers',
          startSlot: startingSlot + 5,
          endSlot: startingSlot + teamSize - 1
        }
      ];
    } else if (teamSize <= 9) {
      // 8/9-a-side: 3 defenders, 4 midfielders, 2 attackers
      const attackerCount = Math.max(0, teamSize - 7);
      const attackerSlots = Array.from({ length: attackerCount }, (_, i) => startingSlot + 7 + i);
      positions = [
        { 
          title: 'Defenders', 
          slots: [startingSlot, startingSlot + 1, startingSlot + 2],
          position: 'Defenders',
          startSlot: startingSlot,
          endSlot: startingSlot + 2
        },
        { 
          title: 'Midfielders', 
          slots: [startingSlot + 3, startingSlot + 4, startingSlot + 5, startingSlot + 6],
          position: 'Midfielders',
          startSlot: startingSlot + 3,
          endSlot: startingSlot + 6
        },
        { 
          title: 'Attackers', 
          slots: attackerSlots,
          position: 'Attackers',
          startSlot: startingSlot + 7,
          endSlot: startingSlot + teamSize - 1
        }
      ];
    } else {
      // 10/11-a-side: 4 defenders, 4 midfielders, 3 attackers
      const attackerCount = Math.max(0, teamSize - 8);
      const attackerSlots = Array.from({ length: attackerCount }, (_, i) => startingSlot + 8 + i);
      positions = [
        { 
          title: 'Defenders', 
          slots: [startingSlot, startingSlot + 1, startingSlot + 2, startingSlot + 3],
          position: 'Defenders',
          startSlot: startingSlot,
          endSlot: startingSlot + 3
        },
        { 
          title: 'Midfielders', 
          slots: [startingSlot + 4, startingSlot + 5, startingSlot + 6, startingSlot + 7],
          position: 'Midfielders',
          startSlot: startingSlot + 4,
          endSlot: startingSlot + 7
        },
        { 
          title: 'Attackers', 
          slots: attackerSlots,
          position: 'Attackers',
          startSlot: startingSlot + 8,
          endSlot: startingSlot + teamSize - 1
        }
      ];
    }
    
    return positions;
  }, []);

  // Create memoized position groups for rendering optimization 
  // Now positioned after determinePositionGroups is defined
  const orangePositionGroups = useMemo(() => {
    return activeMatch ? determinePositionGroups(activeMatch.team_size, 'orange') : [];
  }, [activeMatch, determinePositionGroups]);

  const greenPositionGroups = useMemo(() => {
    return activeMatch ? determinePositionGroups(activeMatch.team_size, 'green') : [];
  }, [activeMatch, determinePositionGroups]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Make essential API calls first to get the UI interactive quickly
        const playersResponse = await fetch(`/api/admin/players?t=${Date.now()}`);
        if (!playersResponse.ok) throw new Error('Failed to fetch players');
        const playersData = await playersResponse.json();
        if (!playersData.success) throw new Error(playersData.error || 'Failed to fetch players');
        
        // Process players immediately to make the UI interactive faster
        const sortedPlayers = playersData.data
          .filter((p: any) => !p.is_retired)
          .map((p: any) => ({
            id: p.player_id,
            ...p
          }))
          .sort((a: Player, b: Player) => a.name.localeCompare(b.name));
        
        // Set players immediately to reduce perceived loading time
        setPlayers(sortedPlayers);
        
        // Check if there's an active match first
        const activeMatchResponse = await fetch('/api/admin/upcoming-matches?active=true');
        let hasActiveMatch = false;
        
        if (activeMatchResponse.ok) {
          const activeMatchData = await activeMatchResponse.json();
          hasActiveMatch = activeMatchData.success && activeMatchData.data;
          
          if (hasActiveMatch) {
            // If we have an active match, update the state immediately
            // but load detailed data later
            setActiveMatch(activeMatchData.data);
          } else {
            // If there's no active match, we can immediately disable loading
            setActiveMatch(null);
            setUsingPlannedMatch(false);
            setIsLoading(false);
          }
        } else {
          // Failed to check for active match
          setActiveMatch(null);
          setUsingPlannedMatch(false);
          setIsLoading(false);
        }
        
        // Now load settings in the background - doesn't block UI interaction
        loadSettingsInBackground();
        
        // If there's an active match, now load the detailed data
        if (hasActiveMatch) {
          await refreshMatchData();
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(`Failed to load data: ${error instanceof Error ? error.message : String(error)}`);
        setIsLoading(false);
      }
    };
    
    const loadSettingsInBackground = async () => {
      try {
        // These settings aren't critical for initial UI rendering
        const [lastMatchResponse, settingsResponse] = await Promise.all([
          fetch('/api/admin/matches?limit=1'),
          fetch('/api/admin/settings')
        ]);
        
        let nextDefaultDate = new Date();
        
        if (lastMatchResponse.ok && settingsResponse.ok) {
          const lastMatchData = await lastMatchResponse.json();
          const settingsData = await settingsResponse.json();
          
          if (lastMatchData.success && lastMatchData.data.length > 0 && 
              settingsData.success && settingsData.data) {
            
            const lastMatch = lastMatchData.data[0];
            const daysBetweenMatches = parseInt(settingsData.data.days_between_matches) || 7;
            
            const lastMatchDate = new Date(lastMatch.match_date);
            if (!isNaN(lastMatchDate.getTime())) {
              nextDefaultDate = new Date(lastMatchDate);
              nextDefaultDate.setDate(nextDefaultDate.getDate() + daysBetweenMatches);
            }
          }
        }
        
        const formattedDefaultDate = nextDefaultDate.toISOString().split('T')[0];
        setDefaultMatchDate(formattedDefaultDate);
        setNewMatchData(prev => ({
          ...prev,
          match_date: formattedDefaultDate,
          date: formattedDefaultDate
        }));
      } catch (error) {
        console.warn('Error loading settings:', error);
        // Use default values if settings fail to load
        setDefaultMatchDate(new Date().toISOString().split('T')[0]);
        setNewMatchData(prev => ({
          ...prev,
          match_date: new Date().toISOString().split('T')[0],
          date: new Date().toISOString().split('T')[0]
        }));
      }
    };

    fetchData();
  }, [refreshMatchData, determinePositionGroups]); // Add determinePositionGroups to dependencies

  // Calculate warning message when slots or balance status changes
  useEffect(() => {
    // Move this to a useEffect to avoid state updates during render
    setWarning(getWarningMessage(currentSlots, isBalanced, error));
  }, [currentSlots, isBalanced, error]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && event.target instanceof Node && !tooltipRef.current.contains(event.target)) {
        setActiveTooltip(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Memoize the getAvailablePlayers function to avoid recalculations
  const getAvailablePlayers = useCallback((currentSlot: Slot): Player[] => {
    if (!players.length) return [];
    
    // Get IDs of players assigned to other slots
    const takenPlayerIds = new Set(
      currentSlots
        .filter(s => s.slot_number !== currentSlot.slot_number && s.player_id !== null)
        .map(s => s.player_id)
    );

    // Get current player in this slot
    const currentPlayerId = currentSlots.find(s => s.slot_number === currentSlot.slot_number)?.player_id;

    // Return available players (only unassigned + current player in this slot)
    return players
      .filter(p => !takenPlayerIds.has(p.id) || p.id === currentPlayerId)
      .sort((a, b) => {
        if (a.id === currentPlayerId) return -1; // Current player first
        if (b.id === currentPlayerId) return 1;
        return a.name.localeCompare(b.name); // Then alphabetical
      });
  }, [players, currentSlots]);

  // Function to handle selecting a player for a slot
  const handlePlayerSelect = async (slotIndex: number, playerId: string) => {
    try {
      setError(null);
      
      // Get the correct match ID (prioritize upcoming_match_id)
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      
      if (!matchId) {
        throw new Error('No active match selected');
      }
      
      if (!playerId) {
        // Handle removing player from slot
        const slot = currentSlots[slotIndex - 1];
        
        // If the slot has no player, nothing to do
        if (!slot.player_id) return;
        
        // Remove player from slot
        const response = await fetch(`/api/admin/upcoming-match-players?upcoming_match_id=${matchId}&player_id=${slot.player_id}&slot_number=${slotIndex}`, {
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
        
        // Refresh match data to ensure UI is updated correctly
        await refreshMatchData();
        
        return;
      }
      
      // Check if the player is already in a slot
      const existingSlotIndex = currentSlots.findIndex(s => s.player_id === playerId);
      
      if (existingSlotIndex !== -1) {
        // If player is already in this exact slot, nothing to do
        if (existingSlotIndex === slotIndex - 1) return;
        
        // Move player from one slot to another
        const updatedSlots = [...currentSlots];
        
        // Remove from old slot
        updatedSlots[existingSlotIndex] = {
          ...updatedSlots[existingSlotIndex],
          player_id: null
        };
        
        // Calculate team assignment based on slot number
        const team = slotIndex <= (activeMatch?.team_size || 9) ? 'A' : 'B';
        
        // Add to new slot
        updatedSlots[slotIndex - 1] = {
          ...updatedSlots[slotIndex - 1],
          player_id: playerId,
          team: team
        };
        
        // Update database
        const response = await fetch('/api/admin/upcoming-match-players', {
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
        
        // Refresh match data to ensure UI is updated correctly
        await refreshMatchData();
        
        return;
      }
      
      // Adding a new player to a slot
      const response = await fetch('/api/admin/upcoming-match-players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          upcoming_match_id: matchId,
          player_id: playerId,
          team: slotIndex <= (activeMatch?.team_size || 9) ? 'A' : 'B',
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
        team: slotIndex <= (activeMatch?.team_size || 9) ? 'A' : 'B'
      };
      setCurrentSlots(updatedSlots);
      
      // Mark match as unbalanced when players change
      setIsBalanced(false);
      
      // Refresh match data to ensure UI is updated correctly
      await refreshMatchData();
      
    } catch (error) {
      console.error('Error selecting player:', error);
      setError(`Failed to update player assignment: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Function to handle team balancing
  const handleBalanceTeams = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setBalanceProgress(0); // Reset progress first
      
      // Short delay to ensure UI updates and shows the loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setBalanceProgress(25);
      
      // Get the correct match ID (prioritize upcoming_match_id)
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      
      if (!matchId) {
        throw new Error('No active match selected');
      }
      
      // Count players assigned to avoid needless API calls
      const assignedPlayerCount = currentSlots.filter(slot => slot.player_id !== null).length;
      
      if (assignedPlayerCount < 2) {
        throw new Error('Please assign at least 2 players before balancing');
      }
      
      setBalanceProgress(50);
      
      // Use the TeamBalanceService to balance teams
      await TeamBalanceService.balanceTeams(matchId);
      
      setBalanceProgress(75);
      
      // Mark as balanced
      setIsBalanced(true);
      
      // Refresh data to get updated team assignments
      await refreshMatchData();
      
    } catch (error) {
      console.error('Error balancing teams:', error);
      setError(`Failed to balance teams: ${error instanceof Error ? error.message : String(error)}`);
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
  
  const formatTeamsForCopy = () => {
    const formatTeam = (teamSlots: Slot[]) => {
      return teamSlots
        .filter(slot => slot.player_id)
        .map(slot => {
          const player = players.find(p => p.id === slot.player_id);
          return player ? player.name : '';
        })
        .filter(name => name) // Remove empty names
        .sort()
        .join('\n');
    };

    const teamASlots = currentSlots.filter(s => s.slot_number <= 9);
    const teamBSlots = currentSlots.filter(s => s.slot_number > 9);

    return `Orange\n${formatTeam(teamASlots)}\n\nGreen\n${formatTeam(teamBSlots)}`;
  };

  const handleCopyTeams = async () => {
    try {
      const teams = formatTeamsForCopy();
      
      // Try using the modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(teams);
      } else {
        // Fallback for older browsers and non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = teams;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          textArea.remove();
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err);
          textArea.remove();
          throw new Error('Failed to copy text');
        }
      }
      
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000); // Hide after 2 seconds
    } catch (error) {
      console.error('Failed to copy teams:', error);
      setError('Failed to copy teams to clipboard. Please try selecting and copying manually.');
      
      // Add the modal to the document
      const teams = formatTeamsForCopy();
      document.body.appendChild(createCopyModal(teams));
    }
  };

  const getPlayerStats = (player: Player | undefined, role: string): string => {
    if (!player) return '';
    
    switch (role) {
      case 'defender':
        return `G:${player.goalscoring} | S&P:${player.stamina_pace} | C:${player.control}`;
      case 'midfielder':
        return `C:${player.control} | S&P:${player.stamina_pace} | G:${player.goalscoring}`;
      case 'attacker':
        return `G:${player.goalscoring} | S&P:${player.stamina_pace} | C:${player.control}`;
      default:
        return '';
    }
  };

  const getPositionFromSlot = (slotNumber: number): string => {
    if (slotNumber <= 3 || (slotNumber >= 10 && slotNumber <= 12)) return 'defender';
    if (slotNumber <= 7 || (slotNumber >= 13 && slotNumber <= 16)) return 'midfielder';
    return 'attacker';
  };

  const StatBar: React.FC<StatBarProps> = ({ label, value, maxValue = 5, color = 'green' }) => {
    const percentage = (value / maxValue) * 100;
    const colorClasses: Record<string, string> = {
      green: 'bg-green-500',
      orange: 'bg-orange-500'
    };
    
    return (
      <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
        <span className="text-xs sm:text-sm text-neutral-700 w-16 sm:w-20">{label}</span>
        <div className="flex-1 bg-neutral-200 h-4 sm:h-6 rounded-md overflow-hidden">
          <div 
            className={`h-full ${colorClasses[color]} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <span className="text-xs sm:text-sm text-neutral-700 w-10 sm:w-12 text-right">{value.toFixed(1)}</span>
      </div>
    );
  };

  const calculateSectionStats = (players: Player[], position: string) => {
    if (!players.length) return null;
    
    const avg = (field: keyof Player) => 
      players.reduce((sum, p) => sum + (Number(p[field]) || 0), 0) / players.length;

    // Convert plural position names to singular
    const role = position.endsWith('s') ? position.slice(0, -1) : position;

    const stats: Record<string, Record<string, number>> = {
      defender: {
        goalscoring: avg('goalscoring'),
        physical: avg('stamina_pace'),
        control: avg('control')
      },
      midfielder: {
        control: avg('control'),
        stamina_pace: avg('stamina_pace'),
        goalscoring: avg('goalscoring')
      },
      attacker: {
        goalscoring: avg('goalscoring'),
        stamina_pace: avg('stamina_pace'),
        control: avg('control')
      }
    };

    const roleStats = stats[role] || {};

    return Object.entries(roleStats).map(([key, value]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: value || 0
    }));
  };

  const renderTeamSection = (
    teamType: 'a' | 'b',
    slots: Slot[], 
    getAvailablePlayersFn: (slot: Slot) => Player[]
  ) => {
    const teamClass = teamType === 'a' ? 'text-orange-600' : 'text-emerald-600';
    const teamName = teamType === 'a' ? 'Orange' : 'Green';
    const playerIdPrefix = teamType === 'a' ? 'teamA-player-' : 'teamB-player-';
    
    // Get team size if we have an active match
    const teamSize = activeMatch?.team_size || 5;
    
    const positionGroups = teamType === 'a' ? orangePositionGroups : greenPositionGroups;
    
    return (
      <div className="mb-4">
        <h3 className={`text-xl font-bold ${teamClass}`}>{teamName}</h3>
        
        {/* Build position groups for this team */}
        {positionGroups.map((group) => {
          // Filter slots for current group
          const positionSlots = slots.filter(
            slot => slot.slot_number >= group.startSlot && slot.slot_number <= group.endSlot
          );
          
          const assignedSlots = positionSlots.filter(slot => slot.player_id !== null);
          const assignedPlayers = assignedSlots.map(slot => 
            players.find(p => p.id === slot.player_id)
          ).filter(Boolean) as Player[];
          
          const stats = calculateSectionStats(assignedPlayers, group.position);
          
          return (
            <div key={`${teamType}-${group.position}`} className="my-2 p-2 bg-white rounded-md shadow">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-md">{group.position}</h4>
                {assignedSlots.length > 0 && (
                  <div className="text-sm text-neutral-500">
                    {assignedSlots.length}/{positionSlots.length}
                  </div>
                )}
              </div>
              
              {/* Position section stats */}
              {stats && stats.length > 0 && (
                <div className="my-2 px-2 py-1 bg-gray-50 rounded">
                  {stats.map((stat, i) => (
                    <StatBar 
                      key={`${teamType}-${group.position}-stat-${i}`}
                      label={stat.label}
                      value={stat.value}
                      color={teamType === 'a' ? 'orange' : 'green'}
                    />
                  ))}
                </div>
              )}
              
              {/* Player slots for this position */}
              <div className="grid grid-cols-1 gap-2">
                {positionSlots.map(slot => {
                  const player = players.find(p => p.id === slot.player_id);
                  const position = getPositionFromSlot(slot.slot_number);
                  const playerStats = getPlayerStats(player, position);
                  const availablePlayers = getAvailablePlayersFn(slot);
                  
                  return (
                    <DraggablePlayerSlot
                      key={`${playerIdPrefix}${slot.slot_number}`}
                      slotNumber={slot.slot_number}
                      player={player}
                      players={availablePlayers}
                      onSelect={handlePlayerSelect}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onTap={handleSlotTap}
                      disabled={isLoading}
                      stats={playerStats}
                      position={position}
                      highlighted={highlightedSlot === slot.slot_number || selectedSlot === slot.slot_number}
                      teamColor={teamType === 'a' ? 'orange' : 'green'}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const calculateTeamStats = (teamSlots: Slot[]) => {
    return TeamBalanceService.calculateTeamStats(teamSlots, players);
  };

  const renderTeamStats = (teamType: 'a' | 'b') => {
    const teamSlots = teamType === 'a' 
      ? currentSlots.filter(s => s.slot_number <= 9)
      : currentSlots.filter(s => s.slot_number > 9);
    
    const stats = calculateTeamStats(teamSlots);
    if (!stats) return null;
    
    const teamColor = teamType === 'a' ? 'orange' : 'green';
    const teamName = teamType === 'a' ? 'Team Orange' : 'Team Green';
    
    return (
      <div className="bg-white rounded-md shadow p-3 mb-4">
        <h3 className={`text-lg font-bold ${teamType === 'a' ? 'text-orange-600' : 'text-emerald-600'}`}>
          {teamName} ({stats.playerCount} players)
        </h3>
        <div className="mt-2">
          <StatBar label="Goalscoring" value={stats.goalscoring} color={teamColor} />
          <StatBar label="Defending" value={stats.defending} color={teamColor} />
          <StatBar label="Stamina/Pace" value={stats.stamina_pace} color={teamColor} />
          <StatBar label="Control" value={stats.control} color={teamColor} />
          <StatBar label="Teamwork" value={stats.teamwork} color={teamColor} />
          <StatBar label="Resilience" value={stats.resilience} color={teamColor} />
        </div>
      </div>
    );
  };

  const calculateComparativeStats = () => {
    const teamASlots = currentSlots.filter(s => s.slot_number <= 9);
    const teamBSlots = currentSlots.filter(s => s.slot_number > 9);
    
    return TeamBalanceService.calculateComparativeStats(teamASlots, teamBSlots, players);
  };
  
  const renderComparativeStats = () => {
    const stats = calculateComparativeStats();
    if (!stats) return null;
    
    const { diffs, balanceScore, balanceQuality } = stats as Stats;
    
    const qualityColorClass = 
      balanceQuality === 'Excellent' ? 'text-emerald-600' :
      balanceQuality === 'Good' ? 'text-blue-600' :
      balanceQuality === 'Fair' ? 'text-amber-600' : 'text-red-600';
    
    // Get color for the balance bar
    const getBalanceColor = (score: number) => {
      if (score <= 0.3) return "bg-emerald-500";
      if (score <= 0.6) return "bg-blue-500";
      if (score <= 0.9) return "bg-amber-500";
      return "bg-red-500";
    };
    
    return (
      <div className="bg-white rounded-md shadow p-3 mt-4">
        <h3 className="text-lg font-bold text-neutral-800">Team Balance Analysis</h3>
        
        <div className="mb-2 mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-neutral-700">Balance Quality:</span>
            <span className={`font-semibold ${qualityColorClass}`}>
              {balanceQuality}
            </span>
          </div>
          
          {/* Balance quality visual indicator */}
          <div className="relative h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`absolute top-0 left-0 h-full ${getBalanceColor(balanceScore)}`}
              style={{ 
                width: `${Math.max(0, 100 - (balanceScore * 100))}%`,
                transition: 'width 0.5s ease-out'
              }}
            />
          </div>
        </div>
        
        <div className="mt-3">
          <div className="text-sm text-neutral-600 mb-1">Attribute Differences:</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(diffs).map(([key, value]) => {
              const label = key.charAt(0).toUpperCase() + key.replace('_', '/').slice(1);
              const diffClass = 
                value <= 0.3 ? 'text-emerald-600' :
                value <= 0.6 ? 'text-blue-600' :
                value <= 0.9 ? 'text-amber-600' : 'text-red-600';
              
              return (
                <div key={key} className="flex justify-between">
                  <span className="text-sm">{label}:</span>
                  <span className={`text-sm font-medium ${diffClass}`}>{value.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const handleClearSlots = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setShowClearConfirm(false);
      
      if (!activeMatch) {
        // Just clear the local state if no active match
        setCurrentSlots(currentSlots.map(slot => ({ ...slot, player_id: null })));
        setIsBalanced(false);
        return;
      }
      
      const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
      
      // Call API to clear slots - use the new API endpoint
      const response = await fetch(`/api/admin/upcoming-match-players/clear?matchId=${matchId}`, {
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
      
      // Refresh match data to get updated state
      refreshMatchData();
      
    } catch (error) {
      console.error('Error clearing slots:', error);
      setError(`Failed to clear slots: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearMatch = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setShowClearMatchConfirm(false);
      
      // Call API to clear active match
      const response = await fetch('/api/admin/clear-active-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear active match');
      }
      
      // Reset all local state
      setCurrentSlots(INITIAL_SLOTS.map(s => ({ ...s, player_id: null })));
      setIsBalanced(false);
      setActiveMatch(null);
      setUsingPlannedMatch(false);
      
    } catch (error) {
      console.error('Error clearing active match:', error);
      setError(`Failed to clear active match: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const validateMatchData = (matchData: NewMatchData): string | null => {
    if (!matchData.date) {
      return 'Match date is required';
    }
    
    const matchDateObj = new Date(matchData.date);
    if (isNaN(matchDateObj.getTime())) {
      return 'Invalid match date';
    }
    
    if (!matchData.team_size || matchData.team_size < 5 || matchData.team_size > 11) {
      return 'Team size must be between 5 and 11';
    }
    
    return null;
  };

  const handleCreateMatch = async () => {
    try {
      // Validate input data
      const validationError = validateMatchData(newMatchData);
      if (validationError) {
        setCreateMatchError(validationError);
        return;
      }
      
      setIsLoading(true);
      setCreateMatchError(null);
      setError(null);
      
      // Check if there's already an active match
      if (activeMatch) {
        const proceed = window.confirm(
          'There is already an active match. Creating a new one will replace it. Do you want to continue?'
        );
        
        if (!proceed) {
          setShowCreateMatchModal(false);
          return;
        }
      }
      
      // Format the date for API request
      const formattedDate = newMatchData.date;
      
      // Call API to create match
      const response = await fetch('/api/admin/create-planned-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: formattedDate,
          team_size: newMatchData.team_size
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create match');
      }
      
      // Close modal and refresh data
      setShowCreateMatchModal(false);
      refreshMatchData();
      
      // Reset form
      setNewMatchData({
        match_date: defaultMatchDate,
        team_size: 5,
        date: defaultMatchDate
      });
      
    } catch (error) {
      console.error('Error creating match:', error);
      setCreateMatchError(`Failed to create match: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMatch = async () => {
    // If no activeMatch, show error
    if (!activeMatch) {
      setCreateMatchError('No active match to edit');
      return;
    }
    
    // If the modal is not open yet, open it with current match data
    if (!showEditMatchModal) {
      // Format the date properly for the date input (YYYY-MM-DD)
      let formattedDate = '';
      
      if (activeMatch.date) {
        // Try to create a valid date object
        const dateObj = new Date(activeMatch.date);
        if (!isNaN(dateObj.getTime())) {
          // Format to YYYY-MM-DD for the date input
          formattedDate = dateObj.toISOString().split('T')[0];
        }
      } else if (activeMatch.match_date) {
        // Try with match_date as fallback
        const dateObj = new Date(activeMatch.match_date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0];
        }
      }
      
      // If we couldn't get a valid date, use today's date
      if (!formattedDate) {
        formattedDate = new Date().toISOString().split('T')[0];
        console.warn('Could not parse match date, using current date as fallback');
      }
      
      setNewMatchData({
        match_date: formattedDate,
        team_size: activeMatch.team_size,
        date: formattedDate
      });
      
      setShowEditMatchModal(true);
      return;
    }
    
    try {
      // Validate input data
      const validationError = validateMatchData(newMatchData);
      if (validationError) {
        setCreateMatchError(validationError);
        return;
      }
      
      setIsLoading(true);
      setCreateMatchError(null);
      setError(null);
      
      const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
      
      // Call API to update match
      const response = await fetch(`/api/admin/upcoming-matches`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          match_id: matchId,
          match_date: newMatchData.date,
          team_size: newMatchData.team_size
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update match');
      }
      
      // Close modal and refresh data
      setShowEditMatchModal(false);
      refreshMatchData();
      
    } catch (error) {
      console.error('Error updating match:', error);
      setCreateMatchError(`Failed to update match: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRinger = async () => {
    try {
      if (!ringerForm.name.trim()) {
        setError('Ringer name is required');
        return;
      }
      
      setIsAddingRinger(true);
      setError(null);
      
      // Call API to add ringer
      const response = await fetch('/api/admin/add-ringer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: ringerForm.name,
          goalscoring: parseFloat(ringerForm.goalscoring.toString()),
          defending: parseFloat(ringerForm.defending.toString()),
          stamina_pace: parseFloat(ringerForm.stamina_pace.toString()),
          control: parseFloat(ringerForm.control.toString()),
          teamwork: parseFloat(ringerForm.teamwork.toString()),
          resilience: parseFloat(ringerForm.resilience.toString())
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add ringer');
      }
      
      // Add the new player to the local state
      setPlayers([...players, data.data]);
      
      // Reset form and close modal
      setRingerForm({
        name: '',
        goalscoring: 3.0,
        defending: 3.0,
        stamina_pace: 3.0,
        control: 3.0,
        teamwork: 3.0,
        resilience: 3.0
      });
      
      setShowRingerModal(false);
      
    } catch (error) {
      console.error('Error adding ringer:', error);
      setError(`Failed to add ringer: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsAddingRinger(false);
    }
  };

  // Add handler for slot selection/tap
  const handleSlotTap = async (slotNumber: number) => {
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
        setError(null);
        
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
        
        // First, remove both players from their slots
        if (firstSlot.player_id) {
          await fetch('/api/admin/upcoming-match-players', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              upcoming_match_id: matchId,
              player_id: firstSlot.player_id
            })
          });
        }
        
        if (secondSlot.player_id) {
          await fetch('/api/admin/upcoming-match-players', {
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
          await fetch('/api/admin/upcoming-match-players', {
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
          await fetch('/api/admin/upcoming-match-players', {
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
        await refreshMatchData();
        
      } catch (error) {
        console.error('Error swapping players:', error);
        setError(`Failed to swap players: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
        setSelectedSlot(null);
      }
    }
  };

  return (
    <div className="flex flex-col max-w-7xl">
      {/* Main content area */}
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6">
        {/* Component content goes here */}
        
        {/* Rest of the component... */}
      </div>
    </div>
  );
};

export default TeamAlgorithm; 