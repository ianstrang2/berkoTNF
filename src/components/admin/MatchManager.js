import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';  // Import date-fns for date formatting
import styles from './MatchManager.module.css';

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
    <div className={styles.matchContainer}>
      <h2 className={styles.matchTitle}>
        {selectedMatch ? 'Edit Match' : 'Add New Match'}
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Match Date */}
        <div>
          <label className={styles.label}>Match Date</label>
          <input
            type="date"
            value={formData.match_date}
            onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
            className={styles.input}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team A */}
          <div className={styles.teamSection}>
            <h3 className={styles.teamTitle}>Team A</h3>
            {formData.team_a.map((player, index) => (
              <div key={`team-a-${index}`} className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <select
                    value={player.player_id}
                    onChange={(e) => handlePlayerChange('a', index, 'player_id', e.target.value)}
                    className={styles.select}
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
                  className={styles.input}
                />
              </div>
            ))}
            <div>
              <label className={styles.label}>Team A Score</label>
              <input
                type="number"
                min="0"
                value={formData.team_a_score}
                onChange={(e) => setFormData({ ...formData, team_a_score: parseInt(e.target.value) || 0 })}
                className={styles.input}
              />
            </div>
          </div>

          {/* Team B */}
          <div className={styles.teamSection}>
            <h3 className={styles.teamTitle}>Team B</h3>
            {formData.team_b.map((player, index) => (
              <div key={`team-b-${index}`} className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <select
                    value={player.player_id}
                    onChange={(e) => handlePlayerChange('b', index, 'player_id', e.target.value)}
                    className={styles.select}
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
                  className={styles.input}
                />
              </div>
            ))}
            <div>
              <label className={styles.label}>Team B Score</label>
              <input
                type="number"
                min="0"
                value={formData.team_b_score}
                onChange={(e) => setFormData({ ...formData, team_b_score: parseInt(e.target.value) || 0 })}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={styles.actionButton}
        >
          {isLoading ? 'Saving...' : (selectedMatch ? 'Update Match' : 'Add Match')}
        </button>

        {error && <div className="text-red-500 mt-4">{error}</div>}
      </form>

      {/* Previous Matches */}
      <div className="mt-8">
        <h3 className={styles.matchTitle}>Previous Matches</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Score</th>
              <th>Players</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.match_id}>
                <td>{format(new Date(match.match_date), 'dd/MM/yyyy')}</td>
                <td>{match.team_a_score} - {match.team_b_score}</td>
                <td>
                  {match.player_matches.map((pm) => (
                    <div key={pm.player_id} className={styles.playerRow}>
                      {players.find(p => p.player_id === pm.player_id)?.name} ({pm.team}): {pm.goals} goals
                    </div>
                  ))}
                </td>
                <td>
                  <button
                    onClick={() => handleEdit(match)}
                    className={`${styles.actionButton} ${styles.editButton}`}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MatchManager;