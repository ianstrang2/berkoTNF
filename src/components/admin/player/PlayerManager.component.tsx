import React, { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui-kit/Card.component';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table.component';
import Button from '@/components/ui-kit/Button.component';
import PlayerFormModal from './PlayerFormModal.component';

// Import the AttributeKey type
type AttributeKey = 'goalscoring' | 'defender' | 'stamina_pace' | 'control' | 'teamwork' | 'resilience';

interface Player {
  player_id: string;
  name: string;
  is_ringer: boolean;
  is_retired: boolean;
  goalscoring: number;
  defender: number;
  stamina_pace: number;
  control: number;
  teamwork: number;
  resilience: number;
}

interface FormData {
  name: string;
  is_ringer: boolean;
  is_retired: boolean;
  goalscoring: number;
  defender: number;
  stamina_pace: number;
  control: number;
  teamwork: number;
  resilience: number;
}

interface EditableRowData {
  name: string;
  is_ringer: boolean;
  is_retired: boolean;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const PlayerManager: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [showRetired, setShowRetired] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'status',
    direction: 'asc'
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showPlayerModal, setShowPlayerModal] = useState<boolean>(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditableRowData | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/players');
      const data = await response.json();
      if (data.data) {
        setPlayers(data.data);
      }
    } catch (error) {
      setError('Failed to fetch players');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitPlayer = async (formData: any): Promise<void> => {
    setIsSubmitting(true);
    setError('');

    try {
      const url = '/api/admin/players';
      const method = 'POST';
      
      // Create a copy of the data and map 'defending' to 'defender' for API compatibility
      const apiFormData = {
        ...formData,
        defender: formData.defending,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiFormData),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Close modal and refresh player list
      setShowPlayerModal(false);
      fetchPlayers();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
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

  const sortPlayers = (playersToSort: Player[]): Player[] => {
    return [...playersToSort].sort((a, b) => {
      if (sortConfig.key === 'status') {
        // Sort by status (active first) then by name
        if (a.is_retired === b.is_retired) {
          return a.name.localeCompare(b.name);
        }
        return sortConfig.direction === 'asc' 
          ? (a.is_retired === true ? 1 : -1)
          : (a.is_retired === true ? -1 : 1);
      }
      
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      if (sortConfig.key === 'ringer') {
        // Sort by ringer status
        if (a.is_ringer === b.is_ringer) {
          return a.name.localeCompare(b.name);
        }
        return sortConfig.direction === 'asc'
          ? (a.is_ringer === true ? 1 : -1)
          : (a.is_ringer === true ? -1 : 1);
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
    const matchesRetiredFilter = showRetired ? true : !player.is_retired;
    return matchesSearch && matchesRetiredFilter;
  });

  // Handlers for inline editing
  const handleEditStart = (player: Player): void => {
    setEditingId(player.player_id);
    setEditData({
      name: player.name,
      is_ringer: player.is_ringer,
      is_retired: player.is_retired
    });
  };

  const handleEditCancel = (): void => {
    setEditingId(null);
    setEditData(null);
  };

  const handleEditSave = async (): Promise<void> => {
    if (!editData || !editingId) return;
    
    try {
      setIsLoading(true);
      setError('');

      // Get the original player to preserve other fields
      const originalPlayer = players.find(p => p.player_id === editingId);
      if (!originalPlayer) return;

      const response = await fetch('/api/admin/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...originalPlayer,
          name: editData.name,
          is_ringer: editData.is_ringer,
          is_retired: editData.is_retired,
          player_id: editingId
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update player');

      // Update local state
      setPlayers(players.map(p => 
        p.player_id === editingId ? {
          ...p,
          name: editData.name,
          is_ringer: editData.is_ringer,
          is_retired: editData.is_retired
        } : p
      ));
      
      setEditingId(null);
      setEditData(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const renderEditableRow = (player: Player): JSX.Element => {
    if (!editData) return <></>;

    return (
      <tr key={player.player_id} className="bg-gradient-to-r from-fuchsia-50 to-slate-50">
        <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
          <div className="flex px-2 py-1">
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full px-2 py-1 border border-fuchsia-200 rounded-lg focus:outline-none focus:border-fuchsia-300 text-sm"
            />
          </div>
        </td>
        <td className="p-2 text-center align-middle bg-transparent border-b">
          <button
            onClick={() => setEditData({ ...editData, is_retired: !editData.is_retired })}
            className={`inline-flex px-2 py-1 text-xxs font-medium rounded-lg shadow-soft-xs ${
              editData.is_retired 
                ? 'bg-gradient-to-tl from-red-600 to-rose-400 text-white' 
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {editData.is_retired ? 'Retired' : 'Active'}
          </button>
        </td>
        <td className="p-2 text-center align-middle bg-transparent border-b">
          <button
            onClick={() => setEditData({ ...editData, is_ringer: !editData.is_ringer })}
            className={`inline-flex px-2 py-1 text-xxs font-medium rounded-lg shadow-soft-xs ${
              editData.is_ringer 
                ? 'bg-gradient-to-tl from-orange-500 to-amber-400 text-white' 
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {editData.is_ringer ? 'YES' : 'NO'}
          </button>
        </td>
        <td className="p-2 text-center align-middle bg-transparent border-b">
          <div className="flex justify-center space-x-2">
            <button
              onClick={handleEditSave}
              disabled={isLoading}
              className="inline-block px-3 py-1.5 text-xs font-bold text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25"
            >
              Save
            </button>
            <button
              onClick={handleEditCancel}
              className="inline-block px-3 py-1.5 text-xs font-bold text-center text-slate-500 uppercase align-middle transition-all bg-transparent border border-slate-200 rounded-lg shadow-none cursor-pointer hover:scale-102 active:opacity-85 hover:text-slate-800 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft-xl p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h5 className="font-bold text-slate-700">Player Manager</h5>
        <button 
          onClick={() => setShowPlayerModal(true)}
          className="inline-block px-4 py-2 mb-0 text-xs font-bold text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85 hover:shadow-soft-xs"
        >
          Create Player
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
              <th onClick={() => handleSort('name')} className="cursor-pointer px-6 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Name {getSortIndicator('name')}
              </th>
              <th onClick={() => handleSort('status')} className="cursor-pointer px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Status {getSortIndicator('status')}
              </th>
              <th onClick={() => handleSort('ringer')} className="cursor-pointer px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Ringer {getSortIndicator('ringer')}
              </th>
              <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !editingId ? (
              <tr>
                <td colSpan={4} className="p-2 text-center align-middle bg-transparent border-b">
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
                <td colSpan={4} className="p-2 text-center align-middle bg-transparent border-b">
                  <div className="py-4 text-slate-500">No players found</div>
                </td>
              </tr>
            ) : (
              filteredPlayers.map(player => (
                editingId === player.player_id 
                  ? renderEditableRow(player)
                  : (
                    <tr key={player.player_id}>
                      <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                        <div className="flex px-2 py-1">
                          <div className="flex flex-row items-center justify-start">
                            <h6 className="mb-0 leading-normal text-sm">{player.name}</h6>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <span className={`inline-flex px-2 py-1 text-xxs font-medium rounded-lg shadow-soft-xs ${
                          player.is_retired 
                            ? 'bg-slate-300 text-slate-700' 
                            : 'bg-gradient-to-tl from-green-600 to-lime-400 text-white'
                        }`}>
                          {player.is_retired ? 'RETIRED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <span className={`inline-flex px-2 py-1 text-xxs font-medium rounded-lg shadow-soft-xs ${
                          player.is_ringer 
                            ? 'bg-gradient-to-tl from-orange-500 to-amber-400 text-white' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {player.is_ringer ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <button
                          onClick={() => handleEditStart(player)}
                          className="inline-block px-3 py-1.5 text-xs font-bold text-center text-slate-500 uppercase align-middle transition-all bg-transparent border border-slate-200 rounded-lg shadow-none cursor-pointer hover:scale-102 active:opacity-85 hover:text-slate-800 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25 disabled:opacity-50"
                        >
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
        onClose={() => setShowPlayerModal(false)}
        onSubmit={handleSubmitPlayer}
        isProcessing={isSubmitting}
        title="Add Player"
        submitButtonText="Create Player"
      />
    </div>
  );
};

export default PlayerManager; 