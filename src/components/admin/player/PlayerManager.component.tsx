import React, { useState, useEffect, useRef, useCallback } from 'react';

import PlayerFormModal from './PlayerFormModal.component';
import { PendingJoinRequests } from './PendingJoinRequests.component';
import { ClubInviteLinkButton } from './ClubInviteLinkButton.component';

import { Club, PlayerProfile } from '@/types/player.types';


// Extend PlayerProfile to include matches_played for this component's context
type PlayerWithMatchCount = PlayerProfile & {
  matches_played: number;
};



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

// Rating color helper function
const getRatingColor = (value: number): string => {
  switch (value) {
    case 1: return 'text-red-600 font-semibold'; // Red
    case 2: return 'text-orange-500 font-semibold'; // Orange  
    case 3: return 'text-yellow-500 font-semibold'; // Yellow
    case 4: return 'text-green-400 font-semibold'; // Light green
    case 5: return 'text-green-600 font-semibold'; // Strong green
    default: return 'text-gray-400 font-semibold';
  }
};

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

  const handleToggleAdmin = async (playerId: string, makeAdmin: boolean) => {
    if (!confirm(`Are you sure you want to ${makeAdmin ? 'promote this player to admin' : 'demote this admin to player'}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/players/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: playerId,
          is_admin: makeAdmin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update admin status');
      }

      // Refresh player list
      fetchPlayers();
      alert(data.message);
    } catch (err: any) {
      console.error('Error toggling admin:', err);
      setError(err.message || 'Failed to update admin status');
    }
  };

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
      
      // Handle rating fields (goalscoring, defending, staminaPace, control, teamwork, resilience)
      const ratingFields = ['goalscoring', 'defending', 'staminaPace', 'control', 'teamwork', 'resilience'];
      if (ratingFields.includes(sortConfig.key)) {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];
        if (aValue === bValue) {
          return a.name.localeCompare(b.name);
        }
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
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



  return (
    <div className="bg-white rounded-2xl shadow-soft-xl p-6 lg:w-fit max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h5 className="font-bold text-slate-700">Player Manager</h5>
        <div className="flex gap-2">
          <ClubInviteLinkButton />
          <button 
            onClick={() => setShowPlayerModal(true)}
            className="inline-block px-4 py-2 mb-0 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85"
          >
            Add Player
          </button>
        </div>
      </div>

      {/* Pending Join Requests */}
      <PendingJoinRequests />
      
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
              <th className="px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Club
              </th>
              <th onClick={() => handleSort('status')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Status {getSortIndicator('status')}
              </th>
              <th className="px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70" title="Phone number set">
                📱
              </th>
              <th className="px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70" title="App access claimed">
                🔗
              </th>
              <th className="px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70" title="Admin privileges">
                Admin
              </th>
              <th onClick={() => handleSort('ringer')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Ringer {getSortIndicator('ringer')}
              </th>
              <th onClick={() => handleSort('played')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Played {getSortIndicator('played')}
              </th>
              <th onClick={() => handleSort('goalscoring')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                GOL {getSortIndicator('goalscoring')}
              </th>
              <th onClick={() => handleSort('defending')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                DEF {getSortIndicator('defending')}
              </th>
              <th onClick={() => handleSort('staminaPace')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                S&P {getSortIndicator('staminaPace')}
              </th>
              <th onClick={() => handleSort('control')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                CTL {getSortIndicator('control')}
              </th>
              <th onClick={() => handleSort('teamwork')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                TMW {getSortIndicator('teamwork')}
              </th>
              <th onClick={() => handleSort('resilience')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                RES {getSortIndicator('resilience')}
              </th>
              <th className="px-2 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} className="p-2 text-center align-middle bg-transparent border-b">
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
                <td colSpan={15} className="p-2 text-center align-middle bg-transparent border-b">
                  <div className="py-4 text-slate-500">No players found</div>
                </td>
              </tr>
            ) : (
              filteredPlayers.map(player => (
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
                      <td className="p-2 text-center align-middle bg-transparent border-b" title={player.phone ? `Phone: ${player.phone}` : 'No phone number'}>
                        <span className={`text-lg ${player.phone ? 'text-green-500' : 'text-gray-300'}`}>
                          {player.phone ? '✓' : '○'}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b" title={player.authUserId ? 'Claimed - has app access' : 'Not claimed - cannot access app'}>
                        <span className={`text-lg ${player.authUserId ? 'text-green-500' : 'text-gray-300'}`}>
                          {player.authUserId ? '✓' : '○'}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <button
                          onClick={() => handleToggleAdmin(player.id, !(player.isAdmin || false))}
                          disabled={!player.authUserId}
                          className={`inline-flex px-3 py-1 text-xxs font-medium rounded-lg shadow-soft-xs transition-all ${
                            player.isAdmin 
                              ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white hover:scale-105' 
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                          title={!player.authUserId ? 'Player must claim profile first' : player.isAdmin ? 'Click to demote' : 'Click to promote to admin'}
                        >
                          {player.isAdmin ? 'ADMIN' : 'PLAYER'}
                        </button>
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
                        <span className={getRatingColor(player.goalscoring)}>
                          {player.goalscoring}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <span className={getRatingColor(player.defending)}>
                          {player.defending}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <span className={getRatingColor(player.staminaPace)}>
                          {player.staminaPace}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <span className={getRatingColor(player.control)}>
                          {player.control}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <span className={getRatingColor(player.teamwork)}>
                          {player.teamwork}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <span className={getRatingColor(player.resilience)}>
                          {player.resilience}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <button
                          onClick={() => {
                            setSelectedPlayer(player);
                            setShowPlayerModal(true);
                          }}
                          className="inline-block px-3 py-1.5 text-xs font-medium text-center text-slate-500 uppercase align-middle transition-all bg-transparent border border-slate-200 rounded-lg shadow-none cursor-pointer hover:scale-102 active:opacity-85 hover:text-slate-800 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25">
                          EDIT
                        </button>
                      </td>
                    </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Player Form Modal - for adding and editing players */}
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
          phone: selectedPlayer.phone,
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