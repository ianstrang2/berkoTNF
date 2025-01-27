import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';  // Import date-fns for date formatting

const MatchManager = () => {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultTeamState = Array(9).fill({ player_id: '', goals: 0 });

  const [formData, setFormData] = useState({
    match_date: new Date().toISOString().split('T')[0],
    team_a: [...defaultTeamState],
    team_b: [...defaultTeamState],
    team_a_score: 0,
    team_b_score: 0,
  });

  // Fetch players and matches on component mount
  useEffect(() => {
    fetchPlayers();
    fetchMatches();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/admin/players');
      const data = await response.json();
      console.log('Fetched players:', data.data);  // Debugging log
      if (data.data) {
        // Filter players where is_retired is false (not retired)
        setPlayers(data.data.filter(p => !p.is_retired));
      }
    } catch (error) {
      console.error('Error fetching players:', error);  // Debugging log
      setError('Failed to fetch players');
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/admin/matches');
      const data = await response.json();
      console.log('Fetched matches:', data.data);  // Debugging log
  
      if (data.data) {
        // Ensure data is an array before setting state
        if (Array.isArray(data.data)) {
          setMatches(data.data);
        } else {
          console.error('Invalid matches data:', data.data);
          setError('Invalid matches data received');
        }
      } else {
        console.error('No matches data found:', data);
        setError('No matches data found');
      }
    } catch (error) {
      console.error('Error fetching matches:', error);  // Debugging log
      setError('Failed to fetch matches');
    }
  };

  const handlePlayerChange = (team, index, field, value) => {
    const newTeam = [...formData[`team_${team}`]];
    newTeam[index] = { ...newTeam[index], [field]: value };
    setFormData({ ...formData, [`team_${team}`]: newTeam });
  };

  const calculateTeamGoals = (team) => {
    return formData[`team_${team}`].reduce((sum, player) => sum + (parseInt(player.goals) || 0), 0);
  };

  const validateForm = () => {
    // Calculate total goals for Team A and Team B
    const teamAGoals = formData.team_a.reduce((sum, player) => sum + (parseInt(player.goals) || 0), 0);
    const teamBGoals = formData.team_b.reduce((sum, player) => sum + (parseInt(player.goals) || 0), 0);
  
    // Check if team scores match player goals
    if (teamAGoals !== parseInt(formData.team_a_score) || 
        teamBGoals !== parseInt(formData.team_b_score)) {
      // Flag the discrepancy and ask for confirmation
      const message = `The total goals scored by players do not match the team scores.\n\n` +
                      `Team A: Players scored ${teamAGoals} goals, but the team score is ${formData.team_a_score}.\n` +
                      `Team B: Players scored ${teamBGoals} goals, but the team score is ${formData.team_b_score}.\n\n` +
                      `Do you want to save anyway?`;
      return window.confirm(message);  // Ask for confirmation
    }
  
    // Check for duplicate players
    const allPlayers = [
      ...formData.team_a.map(p => p.player_id),
      ...formData.team_b.map(p => p.player_id)
    ].filter(id => id); // Remove empty strings
  
    if (new Set(allPlayers).size !== allPlayers.length) {
      setError('A player cannot be in both teams');
      return false;
    }
  
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Validate the form
    const isValid = validateForm();
    if (!isValid) return;  // Stop if validation fails and user cancels
  
    setIsLoading(true);
    setError('');
  
    try {
      // Process players data and ensure player_id is a number
      const processedPlayers = [
        ...formData.team_a.map(p => ({ 
          ...p, 
          team: 'A', 
          player_id: parseInt(p.player_id)  // Convert player_id to a number
        })),
        ...formData.team_b.map(p => ({ 
          ...p, 
          team: 'B', 
          player_id: parseInt(p.player_id)  // Convert player_id to a number
        }))
      ].filter(p => p.player_id); // Remove empty player slots
  
      const matchData = {
        match_date: formData.match_date,
        team_a_score: parseInt(formData.team_a_score),
        team_b_score: parseInt(formData.team_b_score),
        players: processedPlayers,
      };
  
      if (selectedMatch) {
        matchData.match_id = selectedMatch.match_id;
      }
  
      const url = '/api/admin/matches';
      const method = selectedMatch ? 'PUT' : 'POST';
  
      console.log('Sending match data:', matchData);  // Debugging log
  
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData),
      });
  
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
  
      // Reset form and refresh matches
      setFormData({
        match_date: new Date().toISOString().split('T')[0],
        team_a: [...defaultTeamState],
        team_b: [...defaultTeamState],
        team_a_score: 0,
        team_b_score: 0,
      });
      setSelectedMatch(null);
      fetchMatches();
    } catch (error) {
      console.error('Error updating match:', error);  // Debugging log
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (match) => {
    setSelectedMatch(match);

    // Process players into team A and team B
    const teamA = Array(9).fill({ player_id: '', goals: 0 });
    const teamB = Array(9).fill({ player_id: '', goals: 0 });

    match.player_matches.forEach(pm => {
      const team = pm.team === 'A' ? teamA : teamB;
      const emptySlot = team.findIndex(p => !p.player_id);
      if (emptySlot !== -1) {
        team[emptySlot] = {
          player_id: pm.player_id,
          goals: pm.goals,
        };
      }
    });

    setFormData({
      match_date: new Date(match.match_date).toISOString().split('T')[0],
      team_a: teamA,
      team_b: teamB,
      team_a_score: match.team_a_score,
      team_b_score: match.team_b_score,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        {selectedMatch ? 'Edit Match' : 'Add New Match'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Match Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Match Date</label>
          <input
            type="date"
            value={formData.match_date}
            onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team A */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Team A</h3>
            {formData.team_a.map((player, index) => (
              <div key={`team-a-${index}`} className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <select
                    value={player.player_id}
                    onChange={(e) => handlePlayerChange('a', index, 'player_id', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Player</option>
                    {players.map((p) => (
                      <option key={p.player_id} value={p.player_id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  min="0"
                  value={player.goals}
                  onChange={(e) => handlePlayerChange('a', index, 'goals', parseInt(e.target.value) || 0)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700">Team A Score</label>
              <input
                type="number"
                min="0"
                value={formData.team_a_score}
                onChange={(e) => setFormData({ ...formData, team_a_score: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Team B */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Team B</h3>
            {formData.team_b.map((player, index) => (
              <div key={`team-b-${index}`} className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <select
                    value={player.player_id}
                    onChange={(e) => handlePlayerChange('b', index, 'player_id', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Player</option>
                    {players.map((p) => (
                      <option key={p.player_id} value={p.player_id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  min="0"
                  value={player.goals}
                  onChange={(e) => handlePlayerChange('b', index, 'goals', parseInt(e.target.value) || 0)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700">Team B Score</label>
              <input
                type="number"
                min="0"
                value={formData.team_b_score}
                onChange={(e) => setFormData({ ...formData, team_b_score: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-500 transition-all disabled:opacity-50"
          >
            {isLoading
              ? 'Saving...'
              : selectedMatch
              ? 'Update Match'
              : 'Add Match'}
          </button>

          {selectedMatch && (
            <button
              type="button"
              onClick={() => {
                setSelectedMatch(null);
                setFormData({
                  match_date: new Date().toISOString().split('T')[0],
                  team_a: [...defaultTeamState],
                  team_b: [...defaultTeamState],
                  team_a_score: 0,
                  team_b_score: 0,
                });
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* Previous Matches List */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Previous Matches</h3>
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Players
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
  {matches && matches.map((match) => {
    if (!match || !match.player_matches) {
      console.error('Invalid match data:', match);  // Debugging log
      return null;  // Skip invalid matches
    }
    return (
      <tr key={match.match_id}>
        <td className="px-6 py-4 whitespace-nowrap">
          {format(new Date(match.match_date), 'MM/dd/yyyy')}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {match.team_a_score} - {match.team_b_score}
        </td>
        <td className="px-6 py-4">
          <div className="text-sm">
            <div>
              Team A: {match.player_matches
                .filter(pm => pm.team === 'A' && pm.players)
                .map(pm => pm.players.name)
                .join(', ')}
            </div>
            <div>
              Team B: {match.player_matches
                .filter(pm => pm.team === 'B' && pm.players)
                .map(pm => pm.players.name)
                .join(', ')}
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button
            onClick={() => handleEdit(match)}
            className="text-blue-600 hover:text-blue-900"
          >
            Edit
          </button>
        </td>
      </tr>
    );
  })}
</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MatchManager;