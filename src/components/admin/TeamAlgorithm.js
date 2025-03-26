import React, { useState, useEffect, useRef } from 'react';
import { AttributeTooltip } from './AttributeGuide';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';
import { format, parse } from 'date-fns';
import { useRouter } from 'next/navigation';

// PlayerSlot component for player selection
const PlayerSlot = ({ slotNumber, currentPlayerId, availablePlayers, onSelectPlayer, isLoading }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 w-6">•</span>
      <select
        value={currentPlayerId || ''}
        onChange={(e) => onSelectPlayer(e.target.value)}
        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        disabled={isLoading}
      >
        <option value="">Select player</option>
        {availablePlayers.map(player => (
          <option key={player.id} value={player.id}>
            {player.name}
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
const getSlotInfo = (slotNumber) => {
  const isGreen = slotNumber > 9;
  const team = isGreen ? TEAM_STRUCTURE.GREEN : TEAM_STRUCTURE.ORANGE;
  
  let position;
  if (team.slots.defenders.includes(slotNumber)) position = 'defenders';
  else if (team.slots.midfielders.includes(slotNumber)) position = 'midfielders';
  else position = 'attackers';
  
  return { team, position };
};

// Warning message helper
const getWarningMessage = (currentSlots, isBalanced, error) => {
  if (error) return { type: 'error', message: error };
  
  const filledSlotCount = currentSlots.filter(s => s.player_id !== null).length;
  
  // Remove the warning about needing more players
  if (filledSlotCount === 0) return null;
  // Remove the warning about balanced teams - don't show any warnings
  return null;
};

// Helper function to calculate team resilience
const calculateTeamResilience = (players) => {
  if (!players || players.length === 0) return 0;
  const totalResilience = players.reduce((sum, player) => sum + (player.resilience || 3), 0);
  return totalResilience / players.length;
};

// Helper function to calculate team characteristics
const calculateTeamCharacteristics = (players) => {
  if (!players || players.length === 0) return { resilience: 0, teamwork: 0 };
  const totalResilience = players.reduce((sum, player) => sum + (player.resilience || 3), 0);
  const totalTeamwork = players.reduce((sum, player) => sum + (player.teamwork || 3), 0);
  return {
    resilience: totalResilience / players.length,
    teamwork: totalTeamwork / players.length
  };
};

const TeamAlgorithm = () => {
  const router = useRouter();
  const [players, setPlayers] = useState([]);
  const [currentSlots, setCurrentSlots] = useState(Array(18).fill().map((_, i) => ({
    slot_number: i + 1,
    player_id: null
  })));
  const [isBalanced, setIsBalanced] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [balanceProgress, setBalanceProgress] = useState(0);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showRingerModal, setShowRingerModal] = useState(false);
  const [ringerForm, setRingerForm] = useState({
    name: '',
    goalscoring: 3,
    defender: 3,
    stamina_pace: 3,
    control: 3,
    teamwork: 3,
    resilience: 3
  });
  const [isAddingRinger, setIsAddingRinger] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const tooltipRef = useRef(null);
  const [activeMatch, setActiveMatch] = useState(null);
  const [usingPlannedMatch, setUsingPlannedMatch] = useState(false);
  const [creatingMatchReport, setCreatingMatchReport] = useState(false);
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const [showEditMatchModal, setShowEditMatchModal] = useState(false);
  const [showClearMatchConfirm, setShowClearMatchConfirm] = useState(false);
  const [createMatchError, setCreateMatchError] = useState(null);
  const [defaultMatchDate, setDefaultMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMatchData, setNewMatchData] = useState({
    match_date: new Date().toISOString().split('T')[0],
    team_size: 9
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Make all initial API calls in parallel
        const playersResponse = await fetch('/api/admin/players');
        if (!playersResponse.ok) throw new Error('Failed to fetch players');
        const playersData = await playersResponse.json();
        if (!playersData.success) throw new Error(playersData.error || 'Failed to fetch players');
        
        // Sort players alphabetically and map to correct format
        const sortedPlayers = playersData.data
          .filter(p => !p.is_retired)
          .map(p => ({
            id: p.player_id,  // Map player_id to id for consistency
            ...p
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setPlayers(sortedPlayers);

        // Make all secondary API calls in parallel
        try {
          // Load settings and check for active match in parallel
          const [settingsResult, activeMatchResult] = await Promise.all([
            // Settings data - combine match history and app settings
            (async () => {
              const [lastMatchResponse, settingsResponse] = await Promise.all([
                fetch('/api/admin/matches?limit=1'),
                fetch('/api/admin/settings')
              ]);
              return { lastMatchResponse, settingsResponse };
            })(),
            // Active match check
            fetch('/api/admin/upcoming-matches?active=true')
          ]);
          
          // Process settings data
          const { lastMatchResponse, settingsResponse } = settingsResult;
          let nextDefaultDate = new Date();
          
          if (lastMatchResponse.ok && settingsResponse.ok) {
            const lastMatchData = await lastMatchResponse.json();
            const settingsData = await settingsResponse.json();
            
            // If we have matches and settings
            if (lastMatchData.success && lastMatchData.data.length > 0 && 
                settingsData.success && settingsData.data) {
              
              const lastMatch = lastMatchData.data[0];
              const daysBetweenMatches = parseInt(settingsData.data.days_between_matches) || 7;
              
              // Calculate next match date (last match date + days between matches)
              const lastMatchDate = new Date(lastMatch.match_date);
              if (!isNaN(lastMatchDate.getTime())) {
                nextDefaultDate = new Date(lastMatchDate);
                nextDefaultDate.setDate(nextDefaultDate.getDate() + daysBetweenMatches);
              }
            }
          }
          
          // Set default date for new matches
          const formattedDefaultDate = nextDefaultDate.toISOString().split('T')[0];
          setDefaultMatchDate(formattedDefaultDate);
          setNewMatchData(prev => ({
            ...prev,
            match_date: formattedDefaultDate
          }));
          
          // Process active match result
          if (activeMatchResult.ok) {
            const plannedMatchData = await activeMatchResult.json();
            if (plannedMatchData.success && plannedMatchData.data) {
              // We have an active match - use it
              await refreshMatchData();
              return; // refreshMatchData will handle isLoading state
            }
          } else {
            console.warn('Failed to check for active match:', await activeMatchResult.text());
          }
        } catch (secondaryError) {
          console.warn('Error in secondary data loading:', secondaryError);
          // Non-critical errors - continue without this data
          setDefaultMatchDate(new Date().toISOString().split('T')[0]);
          setNewMatchData(prev => ({
            ...prev,
            match_date: new Date().toISOString().split('T')[0]
          }));
        }
        
        // If we get here, there is no active match or an error occurred
        setActiveMatch(null);
        setUsingPlannedMatch(false);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data: ' + error.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate warning message when slots or balance status changes
  useEffect(() => {
    setWarning(getWarningMessage(currentSlots, isBalanced, error));
  }, [currentSlots, isBalanced, error]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setActiveTooltip(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get available players for a slot
  const getAvailablePlayers = (slotNumber) => {
    if (!players.length) return [];
    
    // Get IDs of players assigned to other slots
    const takenPlayerIds = new Set(
      currentSlots
        .filter(s => s.slot_number !== slotNumber && s.player_id !== null)
        .map(s => s.player_id)
    );

    // Get current player in this slot
    const currentPlayerId = currentSlots.find(s => s.slot_number === slotNumber)?.player_id;

    // Return available players (only unassigned + current player in this slot)
    return players
      .filter(p => !takenPlayerIds.has(p.id) || p.id === currentPlayerId)
      .sort((a, b) => {
        if (a.id === currentPlayerId) return -1; // Current player first
        if (b.id === currentPlayerId) return 1;
        return a.name.localeCompare(b.name); // Then alphabetical
      });
  };

  // Function to handle selecting a player for a slot
  const handlePlayerSelect = async (slotIndex, playerId) => {
    try {
      setError(null);
      
      // Get the correct match ID (prioritize upcoming_match_id)
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      
      if (!matchId) {
        throw new Error('No active match selected');
      }
      
      if (!playerId) {
        // Handle removing player from slot
        const slot = currentSlots[slotIndex];
        
        // If the slot has no player, nothing to do
        if (!slot.player_id) return;
        
        // Remove player from slot
        const response = await fetch(`/api/admin/upcoming-match-players`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            upcoming_match_id: matchId,
            player_id: slot.player_id
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to remove player');
        }
        
        // Update local state
        const updatedSlots = [...currentSlots];
        updatedSlots[slotIndex] = {
          ...updatedSlots[slotIndex],
          player_id: null
        };
        setCurrentSlots(updatedSlots);
        return;
      }
      
      // Convert playerId to an integer (if it's a string)
      const playerIdInt = parseInt(playerId, 10);
      if (isNaN(playerIdInt)) {
        throw new Error('Invalid player ID');
      }
      
      // Check if the player is already in a slot
      const existingSlotIndex = currentSlots.findIndex(s => s.player_id === playerIdInt);
      
      if (existingSlotIndex !== -1) {
        // If player is already in this exact slot, nothing to do
        if (existingSlotIndex === slotIndex) return;
        
        // Move player from one slot to another
        const updatedSlots = [...currentSlots];
        
        // Remove from old slot
        updatedSlots[existingSlotIndex] = {
          ...updatedSlots[existingSlotIndex],
          player_id: null
        };
        
        // Calculate team assignment based on slot number
        const slotNumber = slotIndex + 1; // Convert to 1-indexed
        const team = slotNumber <= activeMatch.team_size ? 'A' : 'B';
        
        // Add to new slot
        updatedSlots[slotIndex] = {
          ...updatedSlots[slotIndex],
          player_id: playerIdInt,
          team: team
        };
        
        // Update in database
        const response = await fetch(`/api/admin/upcoming-match-players`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            upcoming_match_id: matchId,
            player_id: playerIdInt,
            team: team,
            slot_number: slotNumber
        })
      });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update player slot');
        }
        
        // Update UI
        setCurrentSlots(updatedSlots);
        return;
      }
      
      // Add player to a slot for the first time
      // Calculate team assignment based on slot number
      const slotNumber = slotIndex + 1; // Convert to 1-indexed
      const team = slotNumber <= activeMatch.team_size ? 'A' : 'B';
      
      const response = await fetch(`/api/admin/upcoming-match-players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          upcoming_match_id: matchId,
          player_id: playerIdInt,
          team: team,
          slot_number: slotNumber
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add player to match');
      }
      
      // Update local state
      const updatedSlots = [...currentSlots];
      updatedSlots[slotIndex] = {
        ...updatedSlots[slotIndex],
        player_id: playerIdInt,
        team: team
      };
      setCurrentSlots(updatedSlots);
      
      // Mark match as unbalanced when players change
      setIsBalanced(false);
      
    } catch (error) {
      console.error('Error selecting player:', error);
      setError('Failed to update player assignment: ' + error.message);
    }
  };

  // Function to handle team balancing
  const handleBalanceTeams = async () => {
    try {
      setIsLoading(true);
      setError(null);
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
      
      // Call the balance-planned-match endpoint
      const response = await fetch(`/api/admin/balance-planned-match?matchId=${matchId}`, {
        method: 'POST'
      });
      
      setBalanceProgress(75);
      
      // Handle different error responses
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
          await performBasicTeamBalance(matchId);
          return;
        }
        
        throw new Error(`Failed to balance teams: ${response.status}`);
      }
      
      // For successful API calls, process the response
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to balance teams');
      }
      
      // Mark as balanced
      setIsBalanced(true);
      
      // Refresh data to get updated team assignments
      await refreshMatchData();
      
    } catch (error) {
      console.error('Error balancing teams:', error);
      setError('Failed to balance teams: ' + error.message);
    } finally {
      setBalanceProgress(100);
      setTimeout(() => setBalanceProgress(0), 500);
        setIsLoading(false);
    }
  };
  
  // Basic team balancing fallback when the API fails
  const performBasicTeamBalance = async (matchId) => {
    try {
      console.log('Performing basic team balance');
      
      // Get players from current slots
      const assignedPlayers = currentSlots
        .filter(slot => slot.player_id !== null)
        .map(slot => ({
          player_id: slot.player_id,
          player: players.find(p => p.id === slot.player_id)
        }));
      
      // Sort by player skill (using goalscoring as a proxy)
      assignedPlayers.sort((a, b) => 
        ((b.player?.goalscoring || 3) + (b.player?.stamina_pace || 3)) - 
        ((a.player?.goalscoring || 3) + (a.player?.stamina_pace || 3))
      );
      
      // Alternate between teams (best player to team A, second best to team B, etc.)
      const updates = [];
      
      assignedPlayers.forEach((player, index) => {
        const team = index % 2 === 0 ? 'A' : 'B';
        const teamSlotStart = team === 'A' ? 0 : activeMatch.team_size;
        
        // Find first empty slot in the appropriate team
        const teamSlots = currentSlots
          .slice(teamSlotStart, teamSlotStart + activeMatch.team_size)
          .map((slot, idx) => ({ ...slot, realIndex: idx + teamSlotStart }));
        
        // Find position in team based on skill
        let slotNumber;
        
        if (team === 'A') {
          slotNumber = index / 2 + 1;
        } else {
          slotNumber = activeMatch.team_size + Math.floor(index / 2) + 1;
        }
        
        // Ensure slot number is valid
        if (slotNumber > currentSlots.length) {
          slotNumber = currentSlots.length;
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
      
      setIsBalanced(true);
      await refreshMatchData();
      
    } catch (error) {
      console.error('Error in basic team balancing:', error);
      throw new Error('Basic team balancing failed: ' + error.message);
    }
  };

  const handleCreateMatchReport = async () => {
    if (!isBalanced) {
      setError('Teams must be balanced before creating a match report');
      return;
    }
    
    try {
      setCreatingMatchReport(true);
      setError(null);
      
      const assignedPlayers = currentSlots.filter(slot => slot.player_id !== null).length;
      const requiredPlayers = activeMatch.team_size * 2;
      
      if (assignedPlayers < requiredPlayers) {
        const proceed = window.confirm(
          `Only ${assignedPlayers} of ${requiredPlayers} players are assigned. Do you still want to create a match report?`
        );
        
        if (!proceed) {
          setCreatingMatchReport(false);
          return;
        }
      }
      
      // Get the correct match ID (prioritize upcoming_match_id)
      const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
      
      if (!matchId) {
        throw new Error('Could not determine match ID');
      }
      
      // Call API to create match from planned match
      const response = await fetch('/api/admin/create-match-from-planned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          upcoming_match_id: matchId // Use the correct field name
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create match report');
      }
      
      // Navigate to match manager to edit the new match
      router.push(`/admin/match-manager?match_id=${data.data.match_id}`);
      
    } catch (error) {
      console.error('Error creating match report:', error);
      setError('Failed to create match report: ' + error.message);
    } finally {
      setCreatingMatchReport(false);
    }
  };

  const formatTeamsForCopy = () => {
    const formatTeam = (teamSlots) => {
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
      const teamText = formatTeamsForCopy();
      await navigator.clipboard.writeText(teamText);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000); // Hide after 2 seconds
    } catch (error) {
      console.error('Failed to copy teams:', error);
      setError('Failed to copy teams to clipboard');
    }
  };

  const getPlayerStats = (player, role) => {
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

  const getPositionFromSlot = (slotNumber) => {
    if (slotNumber <= 3 || (slotNumber >= 10 && slotNumber <= 12)) return 'defender';
    if (slotNumber <= 7 || (slotNumber >= 13 && slotNumber <= 16)) return 'midfielder';
    return 'attacker';
  };

  const StatBar = ({ label, value, maxValue = 5, color = 'green' }) => {
    const percentage = (value / maxValue) * 100;
    const colorClasses = {
      green: 'bg-green-500',
      orange: 'bg-orange-500'
    };
    
    return (
      <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
        <span className="text-xs sm:text-sm text-gray-700 w-16 sm:w-20">{label}</span>
        <div className="flex-1 bg-gray-200 h-4 sm:h-6 rounded-md overflow-hidden">
          <div 
            className={`h-full ${colorClasses[color]} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          >
          </div>
        </div>
        <span className="text-xs sm:text-sm text-gray-700 w-10 sm:w-12 text-right">{value.toFixed(1)}</span>
      </div>
    );
  };

  const calculateSectionStats = (players, position) => {
    if (!players.length) return null;
    
    const avg = (field) => 
      players.reduce((sum, p) => sum + (Number(p[field]) || 0), 0) / players.length;

    // Convert plural position names to singular
    const role = position.endsWith('s') ? position.slice(0, -1) : position;

    const stats = {
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
    }[role] || {};

    return Object.entries(stats).map(([key, value]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: value || 0
    }));
  };

  const renderTeamSection = (team) => {
    const isTeamA = team === 'ORANGE';
    const teamSlots = currentSlots.filter(slot => 
      isTeamA ? slot.slot_number <= 9 : slot.slot_number > 9
    );

    const getTeamPlayers = (startSlot, endSlot) => {
      return teamSlots
        .filter(slot => {
          const slotNum = isTeamA ? slot.slot_number : slot.slot_number - 9;
          return slotNum >= startSlot && slotNum <= endSlot;
        })
        .map(slot => players.find(p => p.id === slot.player_id))
        .filter(Boolean);
    };

    const defenders = getTeamPlayers(1, 3);
    const midfielders = getTeamPlayers(4, 7);
    const attackers = getTeamPlayers(8, 9);

    const calculateStats = (players, type) => {
      if (!players.length) return null;
      
      switch (type) {
        case 'defense':
          return {
            stamina_pace: players.reduce((sum, p) => sum + (p.stamina_pace || 0), 0) / players.length,
            control: players.reduce((sum, p) => sum + (p.control || 0), 0) / players.length,
            goalscoring: players.reduce((sum, p) => sum + (p.goalscoring || 0), 0) / players.length
          };
        case 'midfield':
          return {
            control: players.reduce((sum, p) => sum + (p.control || 0), 0) / players.length,
            stamina_pace: players.reduce((sum, p) => sum + (p.stamina_pace || 0), 0) / players.length,
            goalscoring: players.reduce((sum, p) => sum + (p.goalscoring || 0), 0) / players.length
          };
        case 'attack':
          return {
            goalscoring: players.reduce((sum, p) => sum + (p.goalscoring || 0), 0) / players.length,
            stamina_pace: players.reduce((sum, p) => sum + (p.stamina_pace || 0), 0) / players.length,
            control: players.reduce((sum, p) => sum + (p.control || 0), 0) / players.length
          };
        default:
          return null;
      }
    };

    const renderPositionGroup = (title, players, type) => {
      const stats = calculateStats(players, type);
      
      return (
        <div className="mb-6 last:mb-0">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <div className="space-y-2">
            {players.map((player, idx) => (
              <div key={player.id} className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-6">
                  {isTeamA ? idx + (type === 'defense' ? 1 : type === 'midfield' ? 4 : 8) : 
                            idx + (type === 'defense' ? 10 : type === 'midfield' ? 13 : 17)}
                </span>
                <span>{player.name}</span>
              </div>
            ))}
            {stats && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                {Object.entries(stats).map(([key, value]) => (
                  <StatBar
                    key={key}
                    label={key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    value={value}
                    maxValue={5}
                    color={isTeamA ? 'orange' : 'green'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <Card className={`
        ${!isBalanced ? 'border-2 border-yellow-300' : ''}
      `}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: isTeamA ? '#ff9800' : '#4caf50' }}>
            {team}
          </h2>
          {!isBalanced && (
            <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
              Draft
            </span>
          )}
        </div>
        {renderPositionGroup('Defenders', defenders, 'defense')}
        {renderPositionGroup('Midfielders', midfielders, 'midfield')}
        {renderPositionGroup('Attackers', attackers, 'attack')}
        
        {/* Team Characteristics Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Team Characteristics</h3>
          <StatBar
            label="Resilience"
            value={calculateTeamCharacteristics([...defenders, ...midfielders, ...attackers]).resilience}
            maxValue={5}
            color={isTeamA ? 'orange' : 'green'}
          />
          <StatBar
            label="Teamwork"
            value={calculateTeamCharacteristics([...defenders, ...midfielders, ...attackers]).teamwork}
            maxValue={5}
            color={isTeamA ? 'orange' : 'green'}
          />
        </div>
      </Card>
    );
  };

  const renderTeamStats = (players) => {
    if (!players || players.length === 0) return <p>No players selected</p>;
    
    const teamStats = {
      goalscoring: players.reduce((sum, p) => sum + (p.goalscoring || 0), 0) / players.length,
      defender: players.reduce((sum, p) => sum + (p.defender || 0), 0) / players.length,
      stamina_pace: players.reduce((sum, p) => sum + (p.stamina_pace || 0), 0) / players.length,
      control: players.reduce((sum, p) => sum + (p.control || 0), 0) / players.length,
      teamwork: players.reduce((sum, p) => sum + (p.teamwork || 0), 0) / players.length,
      resilience: players.reduce((sum, p) => sum + (p.resilience || 0), 0) / players.length
    };
    
    return (
      <div className="space-y-2">
        {Object.entries(teamStats).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
            <span className="font-medium">{value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    );
  };

  // Moved inside component so it has access to currentSlots and players
  const renderComparativeStats = () => {
    // Get players from each team
    const orangeTeamPlayers = currentSlots
      .filter(slot => slot.player_id && slot.slot_number <= 9)
      .map(slot => players.find(p => p.id === slot.player_id))
      .filter(Boolean);
      
    const greenTeamPlayers = currentSlots
      .filter(slot => slot.player_id && slot.slot_number > 9)
      .map(slot => players.find(p => p.id === slot.player_id))
      .filter(Boolean);
    
    if (orangeTeamPlayers.length === 0 && greenTeamPlayers.length === 0) {
      return <p className="text-xs text-gray-500 italic">No players selected</p>;
    }
    
    // Calculate team stats
    const calcStatAverage = (players, attribute) => {
      if (players.length === 0) return 0;
      return players.reduce((sum, p) => sum + (p[attribute] || 0), 0) / players.length;
    };
    
    // Define the categories to compare
    const categories = [
      { 
        key: 'defense', 
        label: 'Defence',
        calcFunc: (players) => {
          // Calculate defense score using weighted combination of relevant attributes
          const defenders = players.filter(p => {
            const slotNumber = currentSlots.find(s => s.player_id === p.id)?.slot_number;
            return slotNumber <= 3 || (slotNumber >= 10 && slotNumber <= 12);
          });
          if (defenders.length === 0) return calcStatAverage(players, 'defender');
          return (
            calcStatAverage(defenders, 'stamina_pace') * 0.34 +
            calcStatAverage(defenders, 'control') * 0.33 +
            calcStatAverage(defenders, 'goalscoring') * 0.33
          );
        }
      },
      { 
        key: 'midfield', 
        label: 'Midfield',
        calcFunc: (players) => {
          // Calculate midfield score using weighted combination of relevant attributes
          const midfielders = players.filter(p => {
            const slotNumber = currentSlots.find(s => s.player_id === p.id)?.slot_number;
            return (slotNumber >= 4 && slotNumber <= 7) || (slotNumber >= 13 && slotNumber <= 16);
          });
          if (midfielders.length === 0) return calcStatAverage(players, 'control');
          return (
            calcStatAverage(midfielders, 'control') * 0.33 +
            calcStatAverage(midfielders, 'stamina_pace') * 0.33 +
            calcStatAverage(midfielders, 'goalscoring') * 0.34
          );
        }
      },
      { 
        key: 'attack', 
        label: 'Attack',
        calcFunc: (players) => {
          // Calculate attack score using weighted combination of relevant attributes
          const attackers = players.filter(p => {
            const slotNumber = currentSlots.find(s => s.player_id === p.id)?.slot_number;
            return (slotNumber === 8 || slotNumber === 9) || (slotNumber === 17 || slotNumber === 18);
          });
          if (attackers.length === 0) return calcStatAverage(players, 'goalscoring');
          return (
            calcStatAverage(attackers, 'goalscoring') * 0.5 +
            calcStatAverage(attackers, 'stamina_pace') * 0.25 +
            calcStatAverage(attackers, 'control') * 0.25
          );
        }
      },
      { key: 'teamwork', label: 'Teamwork' },
      { key: 'resilience', label: 'Resilience' }
    ];
    
    // Calculate stats for both teams
    const stats = categories.map(cat => {
      const orangeValue = cat.calcFunc ? 
        cat.calcFunc(orangeTeamPlayers) : 
        calcStatAverage(orangeTeamPlayers, cat.key);
      
      const greenValue = cat.calcFunc ? 
        cat.calcFunc(greenTeamPlayers) : 
        calcStatAverage(greenTeamPlayers, cat.key);
      
      const total = orangeValue + greenValue;
      
      // Calculate percentages (avoid division by zero)
      const orangePercent = total > 0 ? (orangeValue / total) * 100 : 50;
      const greenPercent = total > 0 ? (greenValue / total) * 100 : 50;
      
      return {
        ...cat,
        orangeValue,
        greenValue,
        orangePercent,
        greenPercent
      };
    });
    
    return stats.map(stat => (
      <div key={stat.key} className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{stat.label}</span>
        </div>
        <div className="flex items-center">
          <div className="w-10 text-right mr-2 text-xs font-medium text-gray-800">
            {stat.orangeValue.toFixed(1)}
          </div>
          <div className="flex-1 h-6 rounded-lg overflow-hidden flex">
            <div 
              className="bg-blue-500 h-full"
              style={{ width: `${stat.orangePercent}%` }}
            ></div>
            <div 
              className="bg-green-500 h-full"
              style={{ width: `${stat.greenPercent}%` }}
            ></div>
          </div>
          <div className="w-10 ml-2 text-xs font-medium text-gray-800">
            {stat.greenValue.toFixed(1)}
          </div>
        </div>
      </div>
    ));
  };

  // Helper function to determine position groups based on team size
  const determinePositionGroups = (teamSize, team) => {
    const isOrange = team.toLowerCase() === 'orange';
    const startingSlot = isOrange ? 1 : teamSize + 1;
    
    // Adjust position distribution based on team size
    let positions = [];
    
    if (teamSize <= 5) {
      // 5-a-side: 2 defenders, 2 midfielders, 1 attacker
      positions = [
        { title: 'Defenders', slots: [startingSlot, startingSlot + 1] },
        { title: 'Midfielders', slots: [startingSlot + 2, startingSlot + 3] },
        { title: 'Attackers', slots: [startingSlot + 4] }
      ];
    } else if (teamSize <= 7) {
      // 6/7-a-side: 2 defenders, 3 midfielders, 2 attackers
      positions = [
        { title: 'Defenders', slots: [startingSlot, startingSlot + 1] },
        { title: 'Midfielders', slots: [startingSlot + 2, startingSlot + 3, startingSlot + 4] },
        { title: 'Attackers', slots: Array.from({ length: teamSize - 5 }, (_, i) => startingSlot + 5 + i) }
      ];
    } else if (teamSize <= 9) {
      // 8/9-a-side: 3 defenders, 4 midfielders, 2 attackers
      positions = [
        { title: 'Defenders', slots: [startingSlot, startingSlot + 1, startingSlot + 2] },
        { title: 'Midfielders', slots: [startingSlot + 3, startingSlot + 4, startingSlot + 5, startingSlot + 6] },
        { title: 'Attackers', slots: Array.from({ length: teamSize - 7 }, (_, i) => startingSlot + 7 + i) }
      ];
    } else {
      // 10/11-a-side: 4 defenders, 4 midfielders, 3 attackers
      positions = [
        { title: 'Defenders', slots: [startingSlot, startingSlot + 1, startingSlot + 2, startingSlot + 3] },
        { title: 'Midfielders', slots: [startingSlot + 4, startingSlot + 5, startingSlot + 6, startingSlot + 7] },
        { title: 'Attackers', slots: Array.from({ length: teamSize - 8 }, (_, i) => startingSlot + 8 + i) }
      ];
    }
    
    return positions;
  };

  // Function to handle clearing all slots
  const handleClearAll = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (usingPlannedMatch) {
        // Get the correct match ID (prioritize upcoming_match_id)
        const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
        
        if (!matchId) {
          throw new Error('No active match selected');
        }
        
        // For planned matches, remove all players from the match using the appropriate method
        const response = await fetch('/api/admin/upcoming-match-players', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            upcoming_match_id: matchId
          })
      });

      if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to clear all players');
        }
        
        // Update UI to reflect cleared slots
        setCurrentSlots(prev => prev.map(slot => ({
          ...slot,
          player_id: null,
          team: slot.team, // Preserve team assignment based on slot number
          position: null
        })));
        
        // Mark as unbalanced
        setIsBalanced(false);
        if (activeMatch) {
          setActiveMatch(prev => ({
            ...prev,
            is_balanced: false
          }));
        }
      } else {
        // For legacy team slots, clear all slots
        const response = await fetch('/api/admin/team-slots/clear', {
          method: 'POST'
        });

      const data = await response.json();
        if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to clear slots');
      }

        // Update UI after successful database update
      setCurrentSlots(prev => prev.map(slot => ({
        ...slot,
        player_id: null
      })));
          
        // Mark as unbalanced
      setIsBalanced(false);
      }
      
      // Close modal
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing slots:', error);
      setError('Failed to clear slots: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh match data after changes
  const refreshMatchData = async () => {
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
      console.log('Loaded active match:', activeMatchData);
      
      // For backward compatibility, ensure match_id exists
      if (activeMatchData.upcoming_match_id && !activeMatchData.match_id) {
        activeMatchData.match_id = activeMatchData.upcoming_match_id;
      }
      
      setActiveMatch(activeMatchData);
      setIsBalanced(activeMatchData.is_balanced);
      
      // Create slot assignments from match players
      const teamSize = activeMatchData.team_size || 9; // Default to 9 if missing
      const matchPlayerSlots = Array(teamSize * 2)
        .fill()
        .map((_, i) => ({
          slot_number: i + 1,
          player_id: null,
          team: i < teamSize ? 'A' : 'B',
          position: null
        }));
      
      // Fill in existing players if any
      if (activeMatchData.players && activeMatchData.players.length > 0) {
        console.log(`Processing ${activeMatchData.players.length} players for match`);
        
        // Map players to their respective slots
        activeMatchData.players.forEach(player => {
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
          } else {
            console.warn(`Player ${player.player_id} has invalid slot number ${slotNumber}, slots length is ${matchPlayerSlots.length}`);
          }
        });
      }
      
      setCurrentSlots(matchPlayerSlots);
      setUsingPlannedMatch(true);
    } catch (error) {
      console.error('Error refreshing match data:', error);
      setError('Failed to refresh match data: ' + error.message);
      // Keep the UI in a usable state
      if (!activeMatch) {
        setCurrentSlots([]);
        setUsingPlannedMatch(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle creating a new planned match
  const handleCreatePlannedMatch = async () => {
    try {
      setIsLoading(true);
      setCreateMatchError(null);
      
      // Validate input
      if (!newMatchData.match_date) {
        setCreateMatchError('Please select a match date');
        return;
      }
      
      if (!newMatchData.team_size || newMatchData.team_size < 5 || newMatchData.team_size > 11) {
        setCreateMatchError('Team size must be between 5 and 11');
        return;
      }
      
      // Check if there's already an active match
      const activeMatchResponse = await fetch('/api/admin/upcoming-matches?active=true');
      const activeMatchData = await activeMatchResponse.json();
      
      if (activeMatchData.success && activeMatchData.data) {
        const confirmDeactivate = window.confirm(
          'There is already an active planned match. Creating a new match will deactivate the current one. Do you want to continue?'
        );
        
        if (!confirmDeactivate) {
          setIsLoading(false);
          return;
        }
      }
      
      // Create the new match
      const response = await fetch('/api/admin/upcoming-matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          match_date: newMatchData.match_date,
          team_size: parseInt(newMatchData.team_size),
          is_active: true
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create planned match');
      }
      
      // Close modal
      setShowCreateMatchModal(false);
      
      // Reset form for next time
      setNewMatchData({
        match_date: defaultMatchDate,
        team_size: 9
      });
      
      // Refresh data rather than reloading the page
      await refreshMatchData();
      
    } catch (error) {
      console.error('Error creating planned match:', error);
      setCreateMatchError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to handle editing a planned match
  const handleEditPlannedMatch = async () => {
    try {
      setIsLoading(true);
      setCreateMatchError(null);
      
      // Validate input
      if (!newMatchData.match_date) {
        setCreateMatchError('Please select a match date');
        return;
      }
      
      if (!newMatchData.team_size || newMatchData.team_size < 5 || newMatchData.team_size > 11) {
        setCreateMatchError('Team size must be between 5 and 11');
        return;
      }
      
      // Check if team size is being reduced
      if (activeMatch && newMatchData.team_size < activeMatch.team_size) {
        // Count currently assigned players
        const assignedPositions = currentSlots.filter(slot => 
          slot.player_id !== null && slot.slot_number <= activeMatch.team_size * 2
        ).length;
        
        // If there are more players assigned than the new size would allow
        if (assignedPositions > newMatchData.team_size * 2) {
          setCreateMatchError(`Cannot reduce team size: ${assignedPositions} players are currently assigned but the new team size would only allow ${newMatchData.team_size * 2} players. Please remove some players first.`);
          setIsLoading(false);
          return;
        }
      }
      
      // Get the correct match ID (prioritize upcoming_match_id)
      const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
      
      if (!matchId) {
        throw new Error('Could not determine match ID');
      }
      
      // Update the match
      const response = await fetch(`/api/admin/upcoming-matches`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          upcoming_match_id: matchId, // Use the correct field name
          match_date: newMatchData.match_date,
          team_size: parseInt(newMatchData.team_size)
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update planned match');
      }
      
      // Close modal
      setShowEditMatchModal(false);
      
      // Refresh data rather than reloading the page
      await refreshMatchData();
      
    } catch (error) {
      console.error('Error updating planned match:', error);
      setCreateMatchError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to deactivate the active match (preserves data but marks as inactive)
  const handleDeactivateMatch = async () => {
    try {
      setIsLoading(true);
      
      // Get the correct match ID (prioritize upcoming_match_id)
      const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
      
      if (!matchId) {
        throw new Error('Could not determine match ID');
      }
      
      // Deactivate the match (set is_active to false)
      const response = await fetch(`/api/admin/upcoming-matches`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          upcoming_match_id: matchId, // Use the correct field name
          is_active: false
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove match');
      }
      
      // Clear active match state and hide player sections
      setActiveMatch(null);
      setCurrentSlots([]);
      setUsingPlannedMatch(false);
      setIsBalanced(false);
      setShowClearMatchConfirm(false);
      
    } catch (error) {
      console.error('Error removing match:', error);
      setError('Failed to remove match: ' + error.message);
    } finally {
      setIsLoading(false);
      setShowClearMatchConfirm(false);
    }
  };

  // Show create match modal
  const handleShowCreateMatchModal = () => {
    // Reset form with default date and team size when opening modal
    setNewMatchData({
      match_date: defaultMatchDate,
      team_size: 9
    });
    setShowCreateMatchModal(true);
  };

  // Add a function to completely delete a match instead of just deactivating it
  const handleDeleteMatch = async () => {
    try {
      setIsLoading(true);
      
      // Check if there are assigned players
      const assignedPlayers = currentSlots.filter(slot => slot.player_id !== null).length;
      
      if (assignedPlayers > 0) {
        const confirmDelete = window.confirm(
          `This will permanently delete the match and all ${assignedPlayers} assigned players. This action cannot be undone. Do you want to continue?`
        );
        
        if (!confirmDelete) {
          setIsLoading(false);
          setShowClearMatchConfirm(false);
          return;
        }
      } else {
        const confirmDelete = window.confirm(
          `Are you sure you want to permanently delete this match?`
        );
        
        if (!confirmDelete) {
          setIsLoading(false);
          setShowClearMatchConfirm(false);
          return;
        }
      }
      
      // Delete the match
      const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
      const response = await fetch(`/api/admin/upcoming-matches?id=${matchId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete match');
      }
      
      // Clear active match state and hide player sections
      setActiveMatch(null);
      setCurrentSlots([]);
      setUsingPlannedMatch(false);
      setIsBalanced(false);
      setShowClearMatchConfirm(false);
      
    } catch (error) {
      console.error('Error deleting match:', error);
      setError('Failed to delete match: ' + error.message);
    } finally {
      setIsLoading(false);
      setShowClearMatchConfirm(false);
    }
  };

  // Debugging function to check player assignments
  const checkPlayerAssignments = async () => {
    try {
      setError(null);
      
      // Get the correct match ID
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      if (!matchId) {
        throw new Error('No match ID found');
      }
      
      // Fetch player assignments
      const response = await fetch(`/api/admin/upcoming-match-players?upcoming_match_id=${matchId}`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      // Log player assignments for debugging
      console.log('Player assignments:', data.data);
      console.log('Team A players:', data.data.filter(p => p.team === 'A').length);
      console.log('Team B players:', data.data.filter(p => p.team === 'B').length);
      
      return data.data;
    } catch (error) {
      console.error('Error checking player assignments:', error);
      setError('Failed to check player assignments: ' + error.message);
      return [];
    }
  };

  return (
    <div className="px-4 py-8 md:px-6 lg:px-8">
      {/* Actions Section - This is the ONLY Back to Dashboard button we'll keep */}
      <div className="flex flex-wrap justify-end gap-2 mb-6">
        <Button
          variant="outline"
          onClick={checkPlayerAssignments}
          className="text-sm h-9 mr-auto"
        >
          Check Team Assignments
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/dashboard')}
          className="text-sm h-9"
        >
          Back to Dashboard
        </Button>
      </div>
      
      {/* Match Info Section */}
      {activeMatch ? (
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
    <div>
              <h2 className="text-xl font-bold mb-1">Planned Match</h2>
              <p className="text-gray-600">
                {activeMatch.match_date ? format(new Date(activeMatch.match_date), 'EEEE, MMMM do yyyy') : 'Date not set'}
              </p>
              <p className="text-gray-600">
                Format: {activeMatch.team_size}v{activeMatch.team_size}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <Button 
                variant="outline"
                onClick={() => {
                  setNewMatchData({
                    match_date: new Date(activeMatch.match_date).toISOString().split('T')[0],
                    team_size: activeMatch.team_size
                  });
                  setShowEditMatchModal(true);
                }}
                className="text-sm h-9"
              >
                Edit Match
          </Button>
            <Button
                variant="danger"
                onClick={() => setShowClearMatchConfirm(true)}
                className="text-sm h-9"
                title="Remove this match from view"
              >
                Delete Match
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4 text-center">
          <p className="text-gray-600 mb-3">No active planned match</p>
          <Button
            variant="primary"
            onClick={handleShowCreateMatchModal}
            className="text-sm h-9"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Create New Planned Match'}
          </Button>
        </div>
      )}

      {/* Warning Messages */}
      {warning && activeMatch && (
        <div className={`mb-6 p-3 rounded-md ${warning.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
          {warning.message}
        </div>
      )}
      
      {/* Progress Bar */}
      {balanceProgress > 0 && (
        <div className="w-full h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
          <div 
            className="h-full bg-primary-500 transition-all duration-300 ease-out"
                  style={{ width: `${balanceProgress}%` }}
          ></div>
              </div>
            )}
      
      {/* Only show player selection, team balance, and comparative stats sections when there's an active match */}
      {activeMatch && (
        <>
          {/* Player Selection Section */}
          <Card className="mb-6">
            <div className="p-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Available Players</h2>
                  <p className="text-gray-600 text-sm">
                    {currentSlots.filter(s => s.player_id !== null).length}/{activeMatch.team_size * 2} players selected
                  </p>
          </div>
                <div className="flex gap-2 mt-2 md:mt-0">
          <Button
            variant="outline"
                    onClick={() => setShowClearConfirm(true)}
                    className="h-9"
          >
                    Clear All
          </Button>
          <Button
                    variant="primary"
                    onClick={handleBalanceTeams}
                    disabled={isLoading || balanceProgress > 0 || currentSlots.filter(s => s.player_id !== null).length < activeMatch.team_size * 2}
                    className="h-9"
                  >
                    {balanceProgress > 0 ? `Balancing ${balanceProgress}%` : 'Balance Teams'}
          </Button>
        </div>
      </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array(activeMatch.team_size * 2).fill().map((_, i) => (
                  <PlayerSlot 
                    key={i + 1}
                    slotNumber={i + 1}
                    currentPlayerId={currentSlots.find(s => s.slot_number === i + 1)?.player_id}
                    availablePlayers={getAvailablePlayers(i + 1)}
                    onSelectPlayer={(playerId) => handlePlayerSelect(i, playerId)}
                    isLoading={isLoading}
                  />
                ))}
        </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>To remove a player, select "Select player" from the dropdown.</p>
        </div>
            </div>
          </Card>

          {/* Team Balance Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Balanced Teams</h2>
              <p className="text-gray-600">
                {isBalanced 
                  ? "Teams have been balanced for optimal matchups" 
                  : "Balance teams to create closer, more entertaining games"}
              </p>
        </div>
            <div className="flex gap-2 mt-2 md:mt-0">
              <Button
                variant="secondary"
                onClick={handleCopyTeams}
                disabled={!isBalanced}
                className="h-9"
              >
                Copy Teams
              </Button>
              {isBalanced && (
                <Button
                  variant="primary"
                  onClick={handleCreateMatchReport}
                  disabled={creatingMatchReport}
                  className="h-9"
                >
                  {creatingMatchReport ? 'Creating...' : 'Create Match Report'}
                </Button>
              )}
            </div>
          </div>

          {/* Teams Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Orange Team Card */}
            <Card className="h-full">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-orange-600 mb-3">Orange Team</h3>
                
                {!isBalanced && (
                  <p className="text-sm text-gray-500 italic mb-3">Teams will appear here after balancing</p>
                )}
                
                {/* Players listing by position group - dynamically determine positions based on team size */}
                <div className="space-y-4">
                  {determinePositionGroups(activeMatch.team_size, 'orange').map(({ title, slots }) => {
                    const positionPlayers = slots
                      .map(slotNum => {
                        const slot = currentSlots.find(s => s.slot_number === slotNum);
                        if (!slot || !slot.player_id) return null;
                        return players.find(p => p.id === slot.player_id);
                      })
                      .filter(Boolean);
                    
                    return (
                      <div key={title} className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
                        {positionPlayers.length > 0 ? (
                          <div className="space-y-1">
                            {positionPlayers.map(player => (
                              <div key={player.id} className="p-1.5 bg-gray-50 rounded-md">
                                <span className="text-sm font-medium">{player.name}</span>
                  </div>
                ))}
              </div>
                        ) : (
                          <p className="text-xs text-gray-500 italic">No players assigned</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Green Team Card */}
            <Card className="h-full">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-green-600 mb-3">Green Team</h3>
                
                {!isBalanced && (
                  <p className="text-sm text-gray-500 italic mb-3">Teams will appear here after balancing</p>
                )}
                
                {/* Players listing by position group - dynamically determine positions based on team size */}
                <div className="space-y-4">
                  {determinePositionGroups(activeMatch.team_size, 'green').map(({ title, slots }) => {
                    const positionPlayers = slots
                      .map(slotNum => {
                        const slot = currentSlots.find(s => s.slot_number === slotNum);
                        if (!slot || !slot.player_id) return null;
                        return players.find(p => p.id === slot.player_id);
                      })
                      .filter(Boolean);

                    return (
                      <div key={title} className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
                        {positionPlayers.length > 0 ? (
                          <div className="space-y-1">
                            {positionPlayers.map(player => (
                              <div key={player.id} className="p-1.5 bg-gray-50 rounded-md">
                                <span className="text-sm font-medium">{player.name}</span>
                        </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 italic">No players assigned</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Comparative Team Stats Section */}
          <Card className="mb-6">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-3">Team Comparison</h3>
              
              {!isBalanced ? (
                <p className="text-sm text-gray-500 italic">Team comparison will appear after balancing</p>
              ) : (
                <div className="space-y-3">
                  {renderComparativeStats()}
        </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Create Planned Match Modal */}
      {showCreateMatchModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Create Planned Match</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Match Date</label>
                <input 
                  type="date"
                  value={newMatchData.match_date}
                  onChange={(e) => setNewMatchData({...newMatchData, match_date: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
                <p className="mt-1 text-xs text-gray-500">Format: YYYY-MM-DD</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
                <select
                  value={newMatchData.team_size}
                  onChange={(e) => setNewMatchData({...newMatchData, team_size: parseInt(e.target.value)})}
                  className="w-full p-2 rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                >
                  {[5, 6, 7, 8, 9, 10, 11].map(size => (
                    <option key={size} value={size}>{size}-a-side</option>
                  ))}
                </select>
              </div>
              
              {createMatchError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
                  {createMatchError}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => {
                setShowCreateMatchModal(false);
                setCreateMatchError(null);
              }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreatePlannedMatch}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Match'}
              </Button>
            </div>
        </div>
        </div>
      )}

      {/* Edit Planned Match Modal */}
      {showEditMatchModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Planned Match</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Match Date</label>
                <input
                  type="date"
                  value={newMatchData.match_date}
                  onChange={(e) => setNewMatchData({...newMatchData, match_date: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
                <p className="mt-1 text-xs text-gray-500">Format: YYYY-MM-DD</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
                <select
                  value={newMatchData.team_size}
                  onChange={(e) => setNewMatchData({...newMatchData, team_size: parseInt(e.target.value)})}
                  className="w-full p-2 rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                >
                  {[5, 6, 7, 8, 9, 10, 11].map(size => (
                    <option key={size} value={size}>{size}-a-side</option>
                  ))}
                </select>
                            </div>
              
              {createMatchError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
                  {createMatchError}
                          </div>
                        )}
              </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => {
                setShowEditMatchModal(false);
                setCreateMatchError(null);
              }}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                onClick={handleEditPlannedMatch}
                disabled={isLoading}
                >
                {isLoading ? 'Updating...' : 'Update Match'}
                </Button>
              </div>
          </div>
        </div>
      )}

      {/* Clear All Slots Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-4">Clear All Slots?</h3>
            <p className="mb-6">Are you sure you want to remove all players from the team slots?</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleClearAll}>
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Deactivate Match Confirmation Modal */}
      {showClearMatchConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-4">Remove Match?</h3>
            <p className="mb-6">Are you sure you want to remove this match? The match data will be preserved but no longer visible in this screen.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowClearMatchConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeactivateMatch}>
                Remove Match
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Teams Success Toast */}
      {showCopyToast && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-200 text-green-700 px-4 py-2 rounded-md shadow-md">
          Teams copied to clipboard!
        </div>
      )}
    </div>
  );
};

export default TeamAlgorithm; 