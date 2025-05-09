import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';  // Import date-fns for date formatting
import { Card, Table, TableHead, TableBody, TableRow, TableCell, Button } from '@/components/ui-kit';
import { SoftUIConfirmationModal } from '@/components/ui-kit';

interface Player {
  player_id: number;
  name: string;
  is_retired?: boolean;
}

interface PlayerMatch {
  player_id: number;
  team: 'A' | 'B';
  goals: number;
}

interface Match {
  match_id: number;
  match_date: string;
  team_a_score: number;
  team_b_score: number;
  player_matches: PlayerMatch[];
}

interface TeamPlayer {
  player_id: string | number;
  goals: number;
}

interface FormData {
  match_date: string;
  team_a: TeamPlayer[];
  team_b: TeamPlayer[];
  team_a_score: number;
  team_b_score: number;
}

const MatchManager: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [matchToDelete, setMatchToDelete] = useState<number | null>(null);
  
  const defaultTeamState: TeamPlayer[] = Array(9).fill({ player_id: '', goals: 0 });

  const [formData, setFormData] = useState<FormData>({
    match_date: new Date().toISOString().split('T')[0],
    team_a: [...defaultTeamState],
    team_b: [...defaultTeamState],
    team_a_score: 0,
    team_b_score: 0,
  });

  useEffect(() => {
    fetchPlayers();
    fetchMatches();
  }, []);

  const fetchPlayers = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/players');
      const data = await response.json();
      console.log('Fetched players:', data.data);  // Debugging log
      if (data.data) {
        // Filter players where is_retired is false (not retired)
        setPlayers(data.data.filter((p: Player) => !p.is_retired));
      }
    } catch (error) {
      console.error('Error fetching players:', error);  // Debugging log
      setError('Failed to fetch players');
    }
  };

  const fetchMatches = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/matches');
      const data = await response.json();
      console.log('Fetched matches:', data.data);  // Debugging log
  
      if (data.data) {
        // Ensure data is an array before setting state
        if (Array.isArray(data.data)) {
          // Add more detailed logging to check player data
          data.data.forEach((match, index) => {
            console.log(`Match ${index} (ID: ${match.match_id}) - Player matches:`, 
              match.player_matches ? match.player_matches.length : 0);
          });
          
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

  const handlePlayerChange = (team: 'a' | 'b', index: number, field: keyof TeamPlayer, value: string | number): void => {
    const newTeam = [...formData[`team_${team}`]];
    newTeam[index] = { ...newTeam[index], [field]: value };
    setFormData({ ...formData, [`team_${team}`]: newTeam });
  };

  const calculateTeamGoals = (team: 'a' | 'b'): number => {
    return formData[`team_${team}`].reduce((sum, player) => sum + (parseInt(String(player.goals)) || 0), 0);
  };

  const validateForm = (): boolean => {
    // Calculate total goals for Team A and Team B
    const teamAGoals = formData.team_a.reduce((sum, player) => sum + (parseInt(String(player.goals)) || 0), 0);
    const teamBGoals = formData.team_b.reduce((sum, player) => sum + (parseInt(String(player.goals)) || 0), 0);
  
    // Check if team scores match player goals
    if (teamAGoals !== parseInt(String(formData.team_a_score)) || 
        teamBGoals !== parseInt(String(formData.team_b_score))) {
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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
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
          team: 'A' as const, 
          player_id: parseInt(String(p.player_id))  // Convert player_id to a number
        })),
        ...formData.team_b.map(p => ({ 
          ...p, 
          team: 'B' as const, 
          player_id: parseInt(String(p.player_id))  // Convert player_id to a number
        }))
      ].filter(p => p.player_id); // Remove empty player slots
  
      const matchData: {
        match_date: string;
        team_a_score: number;
        team_b_score: number;
        players: Array<{ player_id: number; team: 'A' | 'B'; goals: number }>;
        match_id?: number;
      } = {
        match_date: formData.match_date,
        team_a_score: parseInt(String(formData.team_a_score)),
        team_b_score: parseInt(String(formData.team_b_score)),
        players: processedPlayers,
      };
  
      if (selectedMatch) {
        matchData.match_id = selectedMatch.match_id;
      }
  
      const response = await fetch('/api/admin/matches', {
        method: selectedMatch ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save match');
      }

      // If match save is successful, trigger the stats update via the API route
      console.log('Match saved successfully. Triggering stats update...');
      const statsUpdateResponse = await fetch('/api/admin/trigger-stats-update', {
        method: 'POST',
      });

      if (!statsUpdateResponse.ok) {
        const errorResult = await statsUpdateResponse.json();
        // Log this error but don't necessarily block success of match save
        console.error('Error triggering stats update:', errorResult.error || statsUpdateResponse.statusText);
        setError('Match saved, but failed to trigger subsequent stats update. Please trigger manually if needed.');
      } else {
        const statsResult = await statsUpdateResponse.json();
        if (!statsResult.success) {
          console.error('Stats update API returned an error:', statsResult.error);
          setError('Match saved, but the stats update process reported an error. Please check logs or trigger manually.');
        } else {
          console.log('Stats update triggered successfully via API route.');
        }
      }

      fetchMatches(); // Refresh matches list
      setSelectedMatch(null); // Reset form
      setFormData({
        match_date: new Date().toISOString().split('T')[0],
        team_a: [...defaultTeamState],
        team_b: [...defaultTeamState],
        team_a_score: 0,
        team_b_score: 0,
      });
      // Optionally, add a success message to the user here
      // For example: showToast('Match saved and stats update initiated!');

    } catch (err: any) {
      console.error('Error saving match:', err);
      setError(err.message || 'Failed to save match');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (match: Match): void => {
    setSelectedMatch(match);
    
    // Log detailed information about the match being edited
    console.log('Editing match:', {
      match_id: match.match_id,
      team_a_score: match.team_a_score,
      team_b_score: match.team_b_score,
      player_matches_count: match.player_matches ? match.player_matches.length : 0,
      player_matches: match.player_matches
    });

    // Process players into team A and team B
    // Create arrays with independent objects to avoid reference issues
    const teamA: TeamPlayer[] = Array(9).fill(0).map(() => ({ player_id: '', goals: 0 }));
    const teamB: TeamPlayer[] = Array(9).fill(0).map(() => ({ player_id: '', goals: 0 }));
    
    if (!match.player_matches || match.player_matches.length === 0) {
      console.warn('No player matches found for this match!');
    } else {
      match.player_matches.forEach((pm, index) => {
        console.log(`Processing player match ${index}:`, pm);
        const team = pm.team === 'A' ? teamA : teamB;
        const emptySlot = team.findIndex(p => !p.player_id);
        if (emptySlot !== -1) {
          team[emptySlot] = {
            player_id: pm.player_id,
            goals: pm.goals,
          };
        } else {
          console.warn(`No empty slot found for player ${pm.player_id} in team ${pm.team}`);
        }
      });
    }

    console.log('Populated teams:', { 
      teamA: teamA.map(p => p.player_id ? p : null).filter(Boolean).length + ' players', 
      teamB: teamB.map(p => p.player_id ? p : null).filter(Boolean).length + ' players',
      teamA_raw: teamA,
      teamB_raw: teamB
    });

    setFormData({
      match_date: new Date(match.match_date).toISOString().split('T')[0],
      team_a: teamA,
      team_b: teamB,
      team_a_score: match.team_a_score,
      team_b_score: match.team_b_score,
    });
  };

  const handleDeleteClick = (matchId: number): void => {
    setMatchToDelete(matchId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!matchToDelete) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/matches?matchId=${matchToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh matches after deletion
      fetchMatches();
      setShowDeleteModal(false);
      setMatchToDelete(null);
    } catch (error) {
      console.error('Error deleting match:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = (): void => {
    setShowDeleteModal(false);
    setMatchToDelete(null);
  };

  return (
    <div className="flex flex-col max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Form Card */}
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6 lg:mb-0 max-w-fit lg:flex-1">
          <div className="flex-auto p-6">
            <form onSubmit={handleSubmit}>
              {/* Match Date */}
              <div className="mb-4">
                <label className="mb-2 ml-1 text-xs font-bold text-slate-700">Match Date</label>
                <div className="relative max-w-xs">
                  <input
                    type="date"
                    value={formData.match_date}
                    onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                    className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-3 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-wrap -mx-3 mb-6">
                {/* Team A */}
                <div className="w-full px-3 lg:w-1/2">
                  <div className="relative flex flex-col min-w-0 break-words bg-white rounded-xl border border-gray-200 bg-clip-border mb-4">
                    <div className="p-4 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-t-xl">
                      <h6 className="mb-0 font-bold text-white">Team A</h6>
                    </div>
                    <div className="flex-auto p-4">
                      {/* Player/Goals Header */}
                      <div className="flex mb-2">
                        <div className="w-3/4 pr-2">
                          <span className="text-xs font-bold text-slate-700 uppercase">Player</span>
                        </div>
                        <div className="w-1/4">
                          <span className="text-xs font-bold text-slate-700 uppercase">Goals</span>
                        </div>
                      </div>
                      
                      {formData.team_a.map((player, index) => (
                        <div key={`team-a-${index}`} className="flex flex-wrap mb-3">
                          <div className="w-3/4 pr-2">
                            <select
                              value={player.player_id}
                              onChange={(e) => handlePlayerChange('a', index, 'player_id', e.target.value)}
                              className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-3 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                            >
                              <option value="">Select Player</option>
                              {players.map((p) => (
                                <option key={p.player_id} value={p.player_id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-1/4">
                            <input
                              type="number"
                              min="0"
                              value={player.goals}
                              onChange={(e) => handlePlayerChange('a', index, 'goals', parseInt(e.target.value) || 0)}
                              className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-16 appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-2 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="mt-4">
                        <label className="mb-2 ml-1 text-xs font-bold text-slate-700">Team A Score</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={formData.team_a_score}
                            onChange={(e) => setFormData({ ...formData, team_a_score: parseInt(e.target.value) || 0 })}
                            className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-16 appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-2 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team B */}
                <div className="w-full px-3 lg:w-1/2">
                  <div className="relative flex flex-col min-w-0 break-words bg-white rounded-xl border border-gray-200 bg-clip-border mb-4">
                    <div className="p-4 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-t-xl">
                      <h6 className="mb-0 font-bold text-white">Team B</h6>
                    </div>
                    <div className="flex-auto p-4">
                      {/* Player/Goals Header */}
                      <div className="flex mb-2">
                        <div className="w-3/4 pr-2">
                          <span className="text-xs font-bold text-slate-700 uppercase">Player</span>
                        </div>
                        <div className="w-1/4">
                          <span className="text-xs font-bold text-slate-700 uppercase">Goals</span>
                        </div>
                      </div>
                      
                      {formData.team_b.map((player, index) => (
                        <div key={`team-b-${index}`} className="flex flex-wrap mb-3">
                          <div className="w-3/4 pr-2">
                            <select
                              value={player.player_id}
                              onChange={(e) => handlePlayerChange('b', index, 'player_id', e.target.value)}
                              className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-3 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                            >
                              <option value="">Select Player</option>
                              {players.map((p) => (
                                <option key={p.player_id} value={p.player_id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-1/4">
                            <input
                              type="number"
                              min="0"
                              value={player.goals}
                              onChange={(e) => handlePlayerChange('b', index, 'goals', parseInt(e.target.value) || 0)}
                              className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-16 appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-2 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="mt-4">
                        <label className="mb-2 ml-1 text-xs font-bold text-slate-700">Team B Score</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={formData.team_b_score}
                            onChange={(e) => setFormData({ ...formData, team_b_score: parseInt(e.target.value) || 0 })}
                            className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-16 appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-2 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="my-4 p-3 bg-red-50 border border-red-100 text-red-500 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex mt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-block px-4 py-2 mr-3 font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer text-xs ease-soft-in leading-pro tracking-tight-soft bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85"
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
                    className="inline-block px-4 py-2 font-medium text-center text-slate-700 uppercase align-middle transition-all bg-transparent border border-slate-300 rounded-lg cursor-pointer text-xs ease-soft-in leading-pro tracking-tight-soft hover:bg-slate-100 hover:scale-102 active:opacity-85 mr-3"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Match List */}
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border max-w-lg lg:max-w-none lg:flex-1">
          <div className="p-6 mb-0 bg-white border-b-0 rounded-t-2xl">
            <h6 className="mb-1 font-bold text-xl text-slate-700">Match History</h6>
            <p className="text-sm text-slate-500">View and manage past matches</p>
          </div>
          
          <div className="flex-auto p-6">
            <div className="overflow-y-auto max-h-[600px]">
              <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500">
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th className="px-4 py-3 font-bold text-left uppercase align-middle bg-white border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">Date</th>
                    <th className="px-4 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">Score</th>
                    <th className="px-4 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-sm text-slate-500">
                        No matches found. Add a match to get started.
                      </td>
                    </tr>
                  ) : (
                    matches.map((match) => (
                      <tr key={match.match_id} className="hover:bg-slate-50">
                        <td className="p-2 align-middle bg-transparent whitespace-nowrap">
                          <p className="mb-0 font-semibold leading-tight text-sm">
                            {format(new Date(match.match_date), 'dd/MM/yyyy')}
                          </p>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent">
                          <span className="font-semibold text-slate-700">
                            {match.team_a_score} - {match.team_b_score}
                          </span>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(match)}
                              className="inline-block px-2 py-1 text-xs font-medium text-center text-slate-700 uppercase align-middle transition-all bg-transparent border border-slate-200 rounded-lg shadow-none cursor-pointer hover:scale-102 active:opacity-85 hover:text-slate-800 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25"
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() => handleDeleteClick(match.match_id)}
                              className="inline-block px-2 py-1 text-xs font-medium text-center text-white uppercase align-middle transition-all bg-transparent border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-gradient-to-tl from-red-500 to-orange-400 shadow-soft-md bg-150 bg-x-25"
                            >
                              DELETE
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={handleDeleteCancel} aria-hidden="true"></div>
            
            {/* Modal panel */}
            <div className="relative bg-white rounded-2xl max-w-md w-full mx-auto shadow-soft-xl transform transition-all p-6">
              {/* Modal content */}
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-100">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2" id="modal-title">Delete Match</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Are you sure you want to delete this match? This action cannot be undone.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleDeleteCancel}
                    className="inline-block px-4 py-2 font-medium text-center text-slate-700 uppercase align-middle transition-all bg-transparent border border-slate-300 rounded-lg cursor-pointer text-xs ease-soft-in leading-pro tracking-tight-soft hover:bg-slate-100 hover:scale-102 active:opacity-85"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isLoading}
                    className="inline-block px-4 py-2 font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer text-xs ease-soft-in leading-pro tracking-tight-soft bg-gradient-to-tl from-red-500 to-orange-400 shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85"
                  >
                    {isLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchManager; 