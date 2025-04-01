import React, { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui-kit/Card';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table';
import Button from '@/components/ui-kit/Button';
import PlayerFormModal from './PlayerFormModal';

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
        <span className="ml-related text-primary-600">
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
      <TableRow key={player.player_id} className="bg-blue-50">
        <TableCell>
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="w-full px-2 py-1 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
          />
        </TableCell>
        <TableCell>
          <button
            onClick={() => setEditData({ ...editData, is_retired: !editData.is_retired })}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              editData.is_retired ? 'bg-neutral-100 text-neutral-800' : 'bg-green-100 text-green-800'
            }`}
          >
            {editData.is_retired ? 'Retired' : 'Active'}
          </button>
        </TableCell>
        <TableCell>
          <button
            onClick={() => setEditData({ ...editData, is_ringer: !editData.is_ringer })}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              editData.is_ringer ? 'bg-blue-100 text-blue-800' : 'bg-neutral-100 text-neutral-800'
            }`}
          >
            {editData.is_ringer ? 'Yes' : 'No'}
          </button>
        </TableCell>
        <TableCell>
          <div className="flex space-x-2">
            <button
              onClick={handleEditSave}
              disabled={isLoading}
              className="px-2 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Save
            </button>
            <button
              onClick={handleEditCancel}
              className="px-2 py-1 bg-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Player Manager</h2>
          <Button 
            onClick={() => setShowPlayerModal(true)}
            variant="primary"
            size="sm"
          >
            Create Player
          </Button>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        
        <div className="mb-4 flex space-x-2 items-center">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 block w-full sm:text-sm"
          />
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showRetired"
              checked={showRetired}
              onChange={(e) => setShowRetired(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="showRetired" className="ml-2 text-sm text-gray-700">
              Show Retired
            </label>
          </div>
        </div>
        
        <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell onClick={() => handleSort('name')} className="cursor-pointer hover:text-primary-600">
                    Name {getSortIndicator('name')}
                  </TableCell>
                  <TableCell onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary-600">
                    Status {getSortIndicator('status')}
                  </TableCell>
                  <TableCell onClick={() => handleSort('ringer')} className="cursor-pointer hover:text-primary-600">
                    Ringer {getSortIndicator('ringer')}
                  </TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && !editingId ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      <div className="inline-block w-6 h-6 border-2 border-t-primary-500 border-primary-200 rounded-full animate-spin"></div>
                      <span className="ml-2">Loading players...</span>
                    </TableCell>
                  </TableRow>
                ) : filteredPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                      No players found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlayers.map(player => (
                    editingId === player.player_id 
                      ? renderEditableRow(player)
                      : (
                        <TableRow key={player.player_id}>
                          <TableCell>{player.name}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                player.is_retired ? 'bg-neutral-100 text-neutral-800' : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {player.is_retired ? 'Retired' : 'Active'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                player.is_ringer ? 'bg-blue-100 text-blue-800' : 'bg-neutral-100 text-neutral-800'
                              }`}
                            >
                              {player.is_ringer ? 'Yes' : 'No'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditStart(player)}
                                className="text-primary-600 hover:text-primary-900 text-sm"
                              >
                                Edit
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
      
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