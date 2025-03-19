import React, { useState, useEffect } from 'react';

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
  
  if (filledSlotCount === 0) return null;
  if (filledSlotCount < 18) return {
    type: 'error',
    message: `Need ${18 - filledSlotCount} more players`
  };
  if (!isBalanced) return {
    type: 'warning',
    message: 'Teams have been modified. Click "Balance Teams" to optimize team balance.'
  };
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
  const [players, setPlayers] = useState([]);
  const [currentSlots, setCurrentSlots] = useState(Array(18).fill().map((_, i) => ({
    slot_number: i + 1,
    player_id: null
  })));
  const [isBalanced, setIsBalanced] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [balanceProgress, setBalanceProgress] = useState(0);
  const [showCopyToast, setShowCopyToast] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch players
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

        // Fetch current slot assignments
        const slotsResponse = await fetch('/api/admin/team-slots');
        if (!slotsResponse.ok) throw new Error('Failed to fetch slots');
        const slotsData = await slotsResponse.json();
        if (!slotsData.success) throw new Error(slotsData.error || 'Failed to fetch slots');
        
        // Ensure slots are ordered 1-18
        const orderedSlots = slotsData.data.sort((a, b) => a.slot_number - b.slot_number);
        setCurrentSlots(orderedSlots);
        
        // If all slots are filled, consider it balanced
        const allFilled = orderedSlots.every(slot => slot.player_id !== null);
        setIsBalanced(allFilled);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
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

    // Return available players (unassigned + current player)
    return players
      .filter(p => !takenPlayerIds.has(p.id) || p.id === currentPlayerId)
      .sort((a, b) => {
        if (a.id === currentPlayerId) return -1;
        if (b.id === currentPlayerId) return 1;
        return a.name.localeCompare(b.name);
      });
  };

  const handlePlayerSelect = async (slotNumber, newPlayerId) => {
    try {
      setError(null);
      console.log('Updating slot:', slotNumber, 'with player:', newPlayerId);
      
      // Parse the player ID properly
      const parsedPlayerId = newPlayerId === '' ? null : Number(newPlayerId);
      
      console.log('Parsed player ID:', parsedPlayerId);
      
      // Update database first
      const response = await fetch('/api/admin/team-slots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_number: slotNumber,
          player_id: parsedPlayerId
        })
      });

      console.log('API Response status:', response.status);
      const data = await response.json();
      console.log('API Response data:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update slot');
      }

      // Update UI after successful database update
      setCurrentSlots(prev => prev.map(slot => ({
        ...slot,
        player_id: slot.slot_number === slotNumber ? parsedPlayerId : slot.player_id
      })));
      
      // Mark as unbalanced when changes are made
      setIsBalanced(false);
    } catch (error) {
      console.error('Error updating slot:', error);
      setError('Failed to update slot: ' + error.message);
    }
  };

  const handleBalanceTeams = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setBalanceProgress(0);

      const response = await fetch('/api/admin/generate-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: currentSlots }),
      });

      if (!response.ok) throw new Error('Failed to balance teams');
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to balance teams');

      // Update slots with new assignments
      setCurrentSlots(data.data.sort((a, b) => a.slot_number - b.slot_number));
      setIsBalanced(true);
      setBalanceProgress(100); // Ensure progress bar shows completion
    } catch (error) {
      console.error('Error balancing teams:', error);
      setError('Failed to balance teams: ' + error.message);
    } finally {
      // Keep progress bar visible briefly after completion
      setTimeout(() => {
        setIsLoading(false);
        setBalanceProgress(0);
      }, 500);
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
        return `D:${player.defender} | S&P:${player.stamina_pace} | C:${player.control}`;
      case 'midfielder':
        return `C:${player.control} | T:${player.teamwork} | S&P:${player.stamina_pace}`;
      case 'attacker':
        return `G:${player.goalscoring} | S&P:${player.stamina_pace} | T:${player.teamwork}`;
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
            affinity: players.reduce((sum, p) => sum + (p.defender || 0), 0) / players.length,
            stamina_pace: players.reduce((sum, p) => sum + (p.stamina_pace || 0), 0) / players.length,
            control: players.reduce((sum, p) => sum + (p.control || 0), 0) / players.length
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
      <div className={`
        bg-white rounded-lg shadow p-4 sm:p-6
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
      </div>
    );
  };

  // Render player selection dropdowns
  const renderPlayerSelection = () => (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Player Selection</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {currentSlots.map(slot => (
          <div key={slot.slot_number} className="flex items-center gap-2">
            <span className="text-sm text-gray-500 w-6">{slot.slot_number}</span>
            <select
              value={slot.player_id || ''}
              onChange={(e) => {
                const value = e.target.value;
                console.log('Select changed:', {
                  slot: slot.slot_number,
                  value: value,
                  type: typeof value
                });
                handlePlayerSelect(slot.slot_number, value);
              }}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              disabled={isLoading}
            >
              <option value="">Select player</option>
              {getAvailablePlayers(slot.slot_number).map(player => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );

  const handleClearAll = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/team-slots/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to clear slots');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to clear slots');
      }

      // Update local state
      setCurrentSlots(prev => prev.map(slot => ({
        ...slot,
        player_id: null
      })));
      setIsBalanced(false);
    } catch (error) {
      console.error('Error clearing slots:', error);
      setError('Failed to clear slots: ' + error.message);
    } finally {
      setIsLoading(false);
      setShowClearConfirm(false);
    }
  };

  // Confirmation Modal
  const renderConfirmationModal = () => {
    if (!showClearConfirm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Clear All Squads?</h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to clear all squad assignments? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isLoading}
            >
              No, Cancel
            </button>
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Clearing...' : 'Yes, Clear Squads'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Team Algorithm</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={isLoading || !currentSlots.some(slot => slot.player_id !== null)}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:hover:text-gray-700"
          >
            Clear All
          </button>
          <div className="flex flex-col gap-1">
            <button
              onClick={handleBalanceTeams}
              disabled={isLoading || !currentSlots.some(slot => slot.player_id !== null)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Balancing...' : 'Balance Teams'}
            </button>
            {isLoading && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${balanceProgress}%` }}
                />
              </div>
            )}
          </div>
          <button
            onClick={handleCopyTeams}
            disabled={isLoading || !currentSlots.some(slot => slot.player_id !== null)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Copy Teams
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md mb-6">
          Loading players...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {!error && !isBalanced && currentSlots.some(slot => slot.player_id !== null) && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mb-6 flex items-center gap-2">
          <span className="text-yellow-600 text-xl">⚠️</span>
          <span>Teams have been modified. Click "Balance Teams" to optimize team balance.</span>
        </div>
      )}

      {renderPlayerSelection()}

      {currentSlots.some(slot => slot.player_id !== null) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {renderTeamSection('ORANGE')}
          {renderTeamSection('GREEN')}
        </div>
      )}

      {/* Team Comparison Section */}
      {currentSlots.some(slot => slot.player_id !== null) && (
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Team Comparison</h2>
            <div className="relative h-[300px] mt-6">
              {/* Y-axis grid lines and labels */}
              <div className="absolute inset-y-0 left-12 right-0 flex flex-col justify-between">
                {[5, 4, 3, 2, 1, 0].map((value) => (
                  <div key={value} className="flex items-center w-full" style={{ transform: 'translateY(-0.5rem)' }}>
                    <span className="text-xs text-gray-500 w-8 text-right mr-2">{value}</span>
                    <div className="flex-1 border-t border-gray-200"></div>
                  </div>
                ))}
              </div>

              {/* Bars */}
              <div className="absolute inset-y-0 left-12 right-0 flex items-end">
                <div className="flex-1 flex justify-around h-[250px]">
                  {['Defense', 'Attack', 'Midfield', 'Resilience', 'Teamwork'].map((factor) => {
                    const getTeamValue = (team) => {
                      const teamSlots = currentSlots.filter(slot => 
                        team === 'ORANGE' ? slot.slot_number <= 9 : slot.slot_number > 9
                      );
                      const teamPlayers = teamSlots
                        .map(slot => players.find(p => p.id === slot.player_id))
                        .filter(Boolean);
                      
                      if (!teamPlayers.length) return 0;
                      
                      switch (factor) {
                        case 'Defense': {
                          const defenders = teamPlayers.slice(0, 3);
                          return defenders.length ? defenders.reduce((sum, p) => 
                            sum + ((p.defender || 0) + (p.stamina_pace || 0) + (p.control || 0)) / 3, 0) / defenders.length : 0;
                        }
                        case 'Midfield': {
                          const midfielders = teamPlayers.slice(3, 7);
                          return midfielders.length ? midfielders.reduce((sum, p) => 
                            sum + ((p.control || 0) + (p.stamina_pace || 0) + (p.goalscoring || 0)) / 3, 0) / midfielders.length : 0;
                        }
                        case 'Attack': {
                          const attackers = teamPlayers.slice(7, 9);
                          return attackers.length ? attackers.reduce((sum, p) => 
                            sum + ((p.goalscoring || 0) + (p.stamina_pace || 0) + (p.control || 0)) / 3, 0) / attackers.length : 0;
                        }
                        case 'Teamwork':
                          return teamPlayers.reduce((sum, p) => sum + (p.teamwork || 3), 0) / teamPlayers.length;
                        case 'Resilience':
                          return teamPlayers.reduce((sum, p) => sum + (p.resilience || 3), 0) / teamPlayers.length;
                        default:
                          return 0;
                      }
                    };

                    const orangeValue = getTeamValue('ORANGE');
                    const greenValue = getTeamValue('GREEN');

                    return (
                      <div key={factor} className="flex flex-col items-center" style={{ width: '15%' }}>
                        <div className="flex gap-4 text-xs mb-2">
                          <span className="text-orange-600">{orangeValue.toFixed(1)}</span>
                          <span className="text-green-600">{greenValue.toFixed(1)}</span>
                        </div>
                        <div className="flex gap-2 w-full justify-center h-full">
                          <div className="w-8 flex flex-col items-center justify-end">
                            <div 
                              className="w-full bg-orange-500 rounded-sm transition-all duration-300"
                              style={{ 
                                height: `${(orangeValue / 5) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="w-8 flex flex-col items-center justify-end">
                            <div 
                              className="w-full bg-green-500 rounded-sm transition-all duration-300"
                              style={{ 
                                height: `${(greenValue / 5) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 mt-2">{factor}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {renderConfirmationModal()}

      {/* Copy Toast Notification */}
      {showCopyToast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300">
          Teams copied to clipboard
        </div>
      )}
    </div>
  );
};

export default TeamAlgorithm; 