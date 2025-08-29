import React, { useState, useEffect, useRef, useCallback } from 'react';
import Card from '@/components/ui-kit/Card.component';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table.component';
import Button from '@/components/ui-kit/Button.component';
import PlayerFormModal from './PlayerFormModal.component';
import ClubSelector from './ClubSelector.component';
import { Club, PlayerProfile } from '@/types/player.types';
import { PlayerFormData } from '@/types/team-algorithm.types';

// Extend PlayerProfile to include matches_played for this component's context
type PlayerWithMatchCount = PlayerProfile & {
  matches_played: number;
};

type EditableRowData = Pick<PlayerProfile, 'name' | 'isRinger' | 'isRetired' | 'club'>;

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Default Person Icon SVG
const DefaultPlayerIcon = () => (
  <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
  </svg>
);

const PlayerManager: React.FC = () => {
  const [players, setPlayers] = useState<PlayerWithMatchCount[]>([]);
  const [showRetired, setShowRetired] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'status',
    direction: 'asc'
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showPlayerModal, setShowPlayerModal] = useState<boolean>(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithMatchCount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditableRowData | null>(null);
  const [inlineEditError, setInlineEditError] = useState<string | null>(null);

  const fetchPlayers = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/players?include_match_counts=true&show_retired=${showRetired}`);
      const data = await response.json();
      if (data.data) {
        // The transform should handle this, but as a fallback, ensure IDs are strings
        const transformedData = data.data.map((p: any) => ({
          ...p,
          id: String(p.id || p.player_id),
        }));
        setPlayers(transformedData);
      }
    } catch (error) {
      setError('Failed to fetch players');
    } finally {
      setIsLoading(false);
    }
  }, [showRetired]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]); // Refetch when fetchPlayers changes

  const handleSubmitPlayer = async (formData: any): Promise<void> => {
    setIsSubmitting(true);
    setError('');

    try {
      const isEditing = !!selectedPlayer;
      const url = '/api/admin/players';
      const method = isEditing ? 'PUT' : 'POST';
      
      // The form gives us camelCase, the API expects snake_case for some fields
      const apiFormData = {
        ...formData,
        player_id: isEditing ? selectedPlayer.id : undefined,
        is_ringer: formData.isRinger,
        is_retired: formData.isRetired,
        stamina_pace: formData.staminaPace,
        selected_club: formData.club,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiFormData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEditing ? 'Failed to update player' : 'Failed to add player'));
      }

      setShowPlayerModal(false);
      setSelectedPlayer(null);
      fetchPlayers();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('That name already exists')) {
          setError(errorMessage);
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSort = (key: string): void => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortPlayers = (playersToSort: PlayerWithMatchCount[]): PlayerWithMatchCount[] => {
    return [...playersToSort].sort((a, b) => {
      if (sortConfig.key === 'status') {
        // Sort by status (active first) then by name
        if (a.isRetired === b.isRetired) {
          return a.name.localeCompare(b.name);
        }
        return sortConfig.direction === 'asc' 
          ? (a.isRetired === true ? 1 : -1)
          : (a.isRetired === true ? -1 : 1);
      }
      
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      if (sortConfig.key === 'ringer') {
        // Sort by ringer status
        if (a.isRinger === b.isRinger) {
          return a.name.localeCompare(b.name);
        }
        return sortConfig.direction === 'asc'
          ? (a.isRinger === true ? 1 : -1)
          : (a.isRinger === true ? -1 : 1);
      }
      
      if (sortConfig.key === 'played') {
        // Sort by number of matches played
        if (a.matches_played === b.matches_played) {
          return a.name.localeCompare(b.name);
        }
        return sortConfig.direction === 'asc'
          ? a.matches_played - b.matches_played
          : b.matches_played - a.matches_played;
      }
      
      return 0;
    });
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig.key === key) {
      return (
        <span className="ml-1 text-fuchsia-500">
          {sortConfig.direction === 'desc' ? '▼' : '▲'}
        </span>
      );
    }
    return null;
  };

  const filteredPlayers = sortPlayers(players).filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    // No need to filter by retired status since API handles this now
    return matchesSearch;
  });

  // Handlers for inline editing
  const handleEditStart = (player: PlayerWithMatchCount): void => {
    setEditingId(player.id);
    setEditData({
      name: player.name,
      isRinger: player.isRinger,
      isRetired: player.isRetired,
      club: player.club || null,
    });
    setInlineEditError(null); // Clear previous inline edit errors
    setError(''); // Clear general component errors too
  };

  const handleEditCancel = (): void => {
    setEditingId(null);
    setEditData(null);
    setInlineEditError(null); // Clear inline edit errors on cancel
  };

  const handleEditSave = async (): Promise<void> => {
    if (!editData || !editingId) return;
    
    setInlineEditError(null);
    setError('');

    if (!editData.name.trim()) {
      setInlineEditError("Name cannot be empty.");
      return;
    }
    if (editData.name.length > 14) {
      setInlineEditError("Name cannot exceed 14 characters.");
      return;
    }
    
    const originalPlayer = players.find(p => p.id === editingId);
    if (!originalPlayer) {
        setInlineEditError("Original player data not found. Cannot save.");
        return;
    }

    try {
      setIsLoading(true); 
      
      // Construct payload, ensuring all required fields for the API are present
      const payload = {
        player_id: editingId, // API expects player_id as a string for identification
        name: editData.name,
        is_ringer: editData.isRinger,
        is_retired: editData.isRetired,
        selected_club: editData.club,
        // Preserve existing rating attributes from the original player data (ensure valid 1-10 values)
        goalscoring: Math.max(1, Math.min(10, originalPlayer.goalscoring || 3)),
        defender: Math.max(1, Math.min(10, originalPlayer.defending || 3)), 
        stamina_pace: Math.max(1, Math.min(10, originalPlayer.staminaPace || 3)),
        control: Math.max(1, Math.min(10, originalPlayer.control || 3)),
        teamwork: Math.max(1, Math.min(10, originalPlayer.teamwork || 3)),
        resilience: Math.max(1, Math.min(10, originalPlayer.resilience || 3)),
      };

      const response = await fetch('/api/admin/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json(); // Parse the JSON response body

      if (!response.ok) {
        const errorDetail = responseData?.error || responseData?.details?.message || responseData?.message || 'Failed to update player';
        throw new Error(errorDetail);
      }

      // Assuming API returns the full updated player object in responseData.data
      const updatedPlayerFromAPI = responseData.data;

      setPlayers(players.map(p => 
        p.id === editingId ? 
        {
          ...originalPlayer,
          ...updatedPlayerFromAPI,
          id: String(updatedPlayerFromAPI.id || updatedPlayerFromAPI.player_id),
          isRinger: updatedPlayerFromAPI.is_ringer,
          isRetired: updatedPlayerFromAPI.is_retired,
          club: updatedPlayerFromAPI.selected_club || null,
        } 
        : p
      ));
      
      setEditingId(null);
      setEditData(null);
      setInlineEditError(null);
    } catch (error) {
      console.error("Error saving player (inline edit):", error); // Log the full error
      const message = error instanceof Error ? error.message : String(error);
      if (message && message.includes('duplicate key value violates unique constraint')) {
        setInlineEditError('That name already exists. Please choose a different one.');
      } else {
        setInlineEditError(message || 'Failed to update player (see console for details).');
      }
      // Do not clear editingId or editData here if save failed, so the user can see the error and try again
    } finally {
      setIsLoading(false);
    }
  };

  const renderEditableRow = (player: PlayerWithMatchCount): JSX.Element => {
    if (!editData) return <></>;
    
    const isSaveDisabled = isLoading || !editData.name.trim() || editData.name.length > 14 || !!inlineEditError;

    return (
      <tr key={player.id} className="bg-gradient-to-r from-fuchsia-50 to-slate-50">
        <td className="p-2 align-middle bg-transparent border-b">
          <input
            type="text"
            value={editData.name}
            onChange={(e) => {
              setEditData({ ...editData, name: e.target.value });
              if (e.target.value.trim() && e.target.value.length <= 14 && inlineEditError === "Name cannot be empty." || inlineEditError === "Name cannot exceed 14 characters.") {
                  setInlineEditError(null);
              }
            }}
            maxLength={14}
            className={`px-2 py-1 border rounded-lg focus:outline-none text-sm ${ (inlineEditError && (!editData.name.trim() || editData.name.length > 14)) || (inlineEditError && editData.name.trim() && editData.name.length <=14) ? 'border-red-500' : 'border-fuchsia-200 focus:border-fuchsia-300'}`}
            style={{width: '130px'}}
          />
          {inlineEditError && (
            <div className="text-xs text-red-500 mt-1">
              {inlineEditError}
            </div>
          )}
        </td>
        <td className="p-2 align-middle bg-transparent border-b">
           <ClubSelector
                value={editData.club || null}
                onChange={(club) => {
                  setEditData({ ...editData, club: club });
                }}
            />
        </td>
        <td className="p-2 text-center align-middle bg-transparent border-b">
          <button
            onClick={() => setEditData({ ...editData, isRetired: !editData.isRetired })}
            className={`inline-flex px-2 py-1 text-xxs font-medium rounded-lg shadow-soft-xs ${editData.isRetired ? 'bg-gradient-to-tl from-blue-600 to-blue-400 text-white' : 'bg-slate-300 text-slate-700'}`}>
            {editData.isRetired ? 'RETIRED' : 'ACTIVE'}
          </button>
        </td>
        <td className="p-2 text-center align-middle bg-transparent border-b">
          <button
            onClick={() => setEditData({ ...editData, isRinger: !editData.isRinger })}
            className={`inline-flex px-2 py-1 text-xxs font-medium rounded-lg shadow-soft-xs ${editData.isRinger ? 'bg-gradient-to-tl from-blue-600 to-blue-400 text-white' : 'bg-slate-300 text-slate-700'}`}>
            {editData.isRinger ? 'YES' : 'NO'}
          </button>
        </td>
        <td className="p-2 text-center align-middle bg-transparent border-b">
          <span className="font-medium text-sm">
            {player.matches_played || 0}
          </span>
        </td>
        <td className="p-2 text-center align-middle bg-transparent border-b">
          <div className="flex justify-center space-x-2">
            <button
              onClick={handleEditSave}
              disabled={isSaveDisabled}
              className="inline-block px-3 py-1.5 text-xs font-bold text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 disabled:opacity-50 disabled:cursor-not-allowed">
              Save
            </button>
            <button
              onClick={handleEditCancel}
              className="inline-block px-3 py-1.5 text-xs font-medium text-center text-slate-500 uppercase align-middle transition-all bg-transparent border border-slate-200 rounded-lg shadow-none cursor-pointer hover:scale-102 active:opacity-85 hover:text-slate-800 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25">
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft-xl p-6 lg:w-fit max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h5 className="font-bold text-slate-700">Player Manager</h5>
        <button 
          onClick={() => setShowPlayerModal(true)}
          className="inline-block px-4 py-2 mb-0 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85"
        >
          Add Player
        </button>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow-soft-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="w-full sm:w-64">
          <div className="relative flex w-full flex-wrap items-stretch">
            <span className="z-10 h-full leading-snug font-normal text-center text-slate-300 absolute bg-transparent rounded text-base items-center justify-center w-8 pl-3 py-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm focus:shadow-soft-primary-outline ease-soft leading-5.6 relative -ml-px block w-full min-w-0 rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding py-2 pr-3 text-gray-700 transition-all focus:border-fuchsia-300 focus:outline-none focus:transition-shadow"
            />
          </div>
        </div>
        <div className="flex items-center">
          <div className="min-h-6 mb-0.5 block pl-0">
            <input
              type="checkbox"
              id="showRetired"
              checked={showRetired}
              onChange={(e) => setShowRetired(e.target.checked)}
              className="mt-0.5 rounded-10 duration-250 ease-soft-in-out after:rounded-circle after:shadow-soft-2xl after:duration-250 checked:after:translate-x-5.3 h-5 relative float-left ml-auto w-10 cursor-pointer appearance-none border border-solid border-gray-200 bg-slate-800/10 bg-none bg-contain bg-left bg-no-repeat align-top transition-all after:absolute after:top-px after:h-4 after:w-4 after:translate-x-px after:bg-white after:content-[''] checked:border-slate-800/95 checked:bg-slate-800/95 checked:bg-none checked:bg-right"
            />
            <label htmlFor="showRetired" className="ml-2 text-sm text-slate-700 font-normal cursor-pointer">
              Show Retired
            </label>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500">

          <thead className="align-bottom">
            <tr>
              <th onClick={() => handleSort('name')} className="cursor-pointer px-1 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Name {getSortIndicator('name')}
              </th>
              <th className="px-4 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70" style={{minWidth: '200px'}}>
                Club
              </th>
              <th onClick={() => handleSort('status')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Status {getSortIndicator('status')}
              </th>
              <th onClick={() => handleSort('ringer')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Ringer {getSortIndicator('ringer')}
              </th>
              <th onClick={() => handleSort('played')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Played {getSortIndicator('played')}
              </th>
              <th className="px-2 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !editingId ? (
              <tr>
                <td colSpan={6} className="p-2 text-center align-middle bg-transparent border-b">
                  <div className="flex justify-center items-center py-4">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                    </div>
                    <span className="ml-2">Loading players...</span>
                  </div>
                </td>
              </tr>
            ) : filteredPlayers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-2 text-center align-middle bg-transparent border-b">
                  <div className="py-4 text-slate-500">No players found</div>
                </td>
              </tr>
            ) : (
              filteredPlayers.map(player => (
                editingId === player.id 
                  ? renderEditableRow(player)
                  : (
                    <tr key={player.id}>
                      <td className="p-2 align-middle bg-transparent border-b">
                        <h6 className="mb-0 leading-normal text-sm">{player.name}</h6>
                      </td>
                      <td className="p-2 align-middle bg-transparent border-b text-center">
                        <div className="flex justify-center items-center">
                          {player.club ? (
                            <img 
                              src={`/club-logos-40px/${player.club.filename}`} 
                              alt={player.club.name} 
                              className="h-6 w-6" 
                              title={player.club.name}
                            />
                          ) : (
                            <DefaultPlayerIcon />
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <span className={`inline-flex px-2 py-1 text-xxs font-medium rounded-lg shadow-soft-xs ${player.isRetired ? 'bg-gradient-to-tl from-blue-600 to-blue-400 text-white' : 'bg-slate-300 text-slate-700'}`}>
                          {player.isRetired ? 'RETIRED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <span className={`inline-flex px-2 py-1 text-xxs font-medium rounded-lg shadow-soft-xs ${player.isRinger ? 'bg-gradient-to-tl from-blue-600 to-blue-400 text-white' : 'bg-slate-300 text-slate-700'}`}>
                          {player.isRinger ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <span className="font-medium text-sm">
                          {player.matches_played || 0}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <button
                          onClick={() => handleEditStart(player)}
                          className="inline-block px-3 py-1.5 text-xs font-medium text-center text-slate-500 uppercase align-middle transition-all bg-transparent border border-slate-200 rounded-lg shadow-none cursor-pointer hover:scale-102 active:opacity-85 hover:text-slate-800 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25">
                          EDIT
                        </button>
                      </td>
                    </tr>
                  )
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Player Form Modal - only for adding new players */}
      <PlayerFormModal 
        isOpen={showPlayerModal}
        onClose={() => {
          setShowPlayerModal(false);
          setSelectedPlayer(null); // Clear selected player when closing modal
          setError(''); // Clear any general errors when modal is closed by user
        }}
        onSubmit={handleSubmitPlayer}
        isProcessing={isSubmitting}
        initialData={selectedPlayer ? {
          name: selectedPlayer.name,
          isRinger: selectedPlayer.isRinger,
          isRetired: selectedPlayer.isRetired,
          goalscoring: selectedPlayer.goalscoring,
          defending: selectedPlayer.defending,
          staminaPace: selectedPlayer.staminaPace,
          control: selectedPlayer.control,
          teamwork: selectedPlayer.teamwork,
          resilience: selectedPlayer.resilience,
          club: selectedPlayer.club,
        } : {isRinger: true, goalscoring: 3, defending: 3, staminaPace: 3, control: 3, teamwork: 3, resilience: 3, club: null}}
        title={selectedPlayer ? "Edit Player" : "Add New Player"}
        submitButtonText={selectedPlayer ? "Save Changes" : "Create Player"}
      />
    </div>
  );
};

export default PlayerManager; 