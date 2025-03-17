import React, { useState, useEffect } from 'react';

const TeamAlgorithm = () => {
  const [players, setPlayers] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch players and current slot assignments
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch players
        const playersResponse = await fetch('/api/admin/players');
        const playersData = await playersResponse.json();
        if (playersData.data) {
          const activePlayers = playersData.data.filter(p => !p.is_retired);
          setPlayers(activePlayers);
        }

        // Fetch current slot assignments
        const slotsResponse = await fetch('/api/admin/team-slots');
        const slotsData = await slotsResponse.json();
        if (slotsData.success) {
          setSlots(slotsData.data);
        }
      } catch (err) {
        setError('Failed to fetch data');
      }
    };
    fetchData();
  }, []);

  const handlePlayerSelect = async (slotNumber, playerId) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/team-slots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_number: slotNumber,
          player_id: playerId ? parseInt(playerId) : null
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update the slots state with the new assignment
        setSlots(slots.map(slot => 
          slot.slot_number === slotNumber 
            ? { ...slot, player_id: playerId ? parseInt(playerId) : null, player: playerId ? players.find(p => p.player_id === parseInt(playerId)) : null }
            : slot
        ));
      } else {
        setError(data.error || 'Failed to update slot');
      }
    } catch (err) {
      setError('Failed to update slot');
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/generate-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        setSlots(data.data);
      } else {
        setError(data.error || 'Failed to balance teams');
      }
    } catch (err) {
      setError('Failed to balance teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTeams = () => {
    const formatTeam = (teamSlots) => {
      const players = teamSlots
        .filter(slot => slot.player)
        .map(slot => slot.player.name)
        .sort();
      return players.join('\n');
    };

    const teamASlots = slots.filter(s => s.slot_number <= 9);
    const teamBSlots = slots.filter(s => s.slot_number > 9);

    const formattedText = `Orange\n${formatTeam(teamASlots)}\n\nGreen\n${formatTeam(teamBSlots)}`;
    
    navigator.clipboard.writeText(formattedText).then(() => {
      // Could add a toast notification here if you want to show feedback
      console.log('Teams copied to clipboard');
    });
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

  const StatBar = ({ label, value, maxValue = 5 }) => {
    const percentage = (value / maxValue) * 100;
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="text-sm text-gray-700 w-20">{label}</span>
        <div className="flex-1 bg-gray-200 h-6 rounded-md overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          >
          </div>
        </div>
        <span className="text-sm text-gray-700 w-12 text-right">{value.toFixed(1)}</span>
      </div>
    );
  };

  const calculateSectionStats = (players, role) => {
    if (!players.length) return null;
    
    const avg = (field) => 
      players.reduce((sum, p) => sum + (Number(p[field]) || 0), 0) / players.length;

    switch (role) {
      case 'defender':
        return {
          physical: avg('stamina_pace'),
          control: avg('control')
        };
      case 'midfielder':
        return {
          control: avg('control'),
          teamwork: avg('teamwork'),
          physical: avg('stamina_pace')
        };
      case 'attacker':
        return {
          goalscoring: avg('goalscoring'),
          physical: avg('stamina_pace'),
          teamwork: avg('teamwork')
        };
      default:
        return null;
    }
  };

  const renderPositionSection = (slots, position, team) => {
    const isTeamB = team === 'B';
    const players = slots
      .filter(s => s.player)
      .map(s => s.player);
    
    const stats = calculateSectionStats(players, position.toLowerCase());

    return (
      <div>
        <h4 className="font-medium text-gray-900 mb-4">
          {position}s
        </h4>
        <div className="space-y-2">
          {slots.map(slot => (
            <div key={slot.slot_number} className="relative">
              <div className="flex items-center space-x-2">
                <div className="w-full">
                  <select
                    value={slot.player_id || ''}
                    onChange={(e) => handlePlayerSelect(slot.slot_number, e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select Player</option>
                    {players.map(player => (
                      <option
                        key={player.player_id}
                        value={player.player_id}
                        disabled={slots.some(s => 
                          s.player_id === player.player_id && s.slot_number !== slot.slot_number
                        )}
                      >
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
        {stats && (
          <>
            <div className="my-4 border-t border-gray-200" />
            <div className="mt-4">
              {position === 'Defender' && (
                <>
                  <StatBar label="Physical" value={stats.physical} />
                  <StatBar label="Control" value={stats.control} />
                </>
              )}
              {position === 'Midfielder' && (
                <>
                  <StatBar label="Control" value={stats.control} />
                  <StatBar label="Teamwork" value={stats.teamwork} />
                  <StatBar label="Physical" value={stats.physical} />
                </>
              )}
              {position === 'Attacker' && (
                <>
                  <StatBar label="Goalscoring" value={stats.goalscoring} />
                  <StatBar label="Physical" value={stats.physical} />
                  <StatBar label="Teamwork" value={stats.teamwork} />
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderTeamSection = (team) => {
    const startSlot = team === 'A' ? 1 : 10;
    const endSlot = team === 'A' ? 9 : 18;
    const teamSlots = slots.filter(s => s.slot_number >= startSlot && s.slot_number <= endSlot);

    const defenderSlots = teamSlots.filter(s => 
      getPositionFromSlot(s.slot_number) === 'defender'
    );
    const midfielderSlots = teamSlots.filter(s => 
      getPositionFromSlot(s.slot_number) === 'midfielder'
    );
    const attackerSlots = teamSlots.filter(s => 
      getPositionFromSlot(s.slot_number) === 'attacker'
    );

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-primary-600">
          {team === 'A' ? 'Orange' : 'Green'}
        </h3>
        
        {renderPositionSection(defenderSlots, 'Defender', team)}
        <hr className="border-gray-200" />
        {renderPositionSection(midfielderSlots, 'Midfielder', team)}
        <hr className="border-gray-200" />
        {renderPositionSection(attackerSlots, 'Attacker', team)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-primary-600">Team Selection</h2>
            <p className="text-gray-600 mt-2">
              Assign players to slots and then click 'Balance' to generate balanced teams.
            </p>
          </div>
          <div className="space-x-4">
            <button
              onClick={handleBalanceTeams}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Balancing...' : 'Balance'}
            </button>
            <button
              onClick={handleCopyTeams}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Copy
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {renderTeamSection('A')}
          {renderTeamSection('B')}
        </div>
      </div>
    </div>
  );
};

export default TeamAlgorithm; 