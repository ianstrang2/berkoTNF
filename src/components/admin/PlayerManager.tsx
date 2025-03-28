import React, { useState, useEffect, useRef } from 'react';
import { AttributeTooltip, AttributeGuideModal } from './AttributeGuide';
import Card from '@/components/ui-kit/Card';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table';
import Button from '@/components/ui-kit/Button';

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

const PlayerManager: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showRetired, setShowRetired] = useState<boolean>(false);
  const [sortField, setSortField] = useState<string>('status');
  const [sortDirection, setDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    is_ringer: false,
    is_retired: false,
    goalscoring: 3,
    defender: 3,
    stamina_pace: 3,
    control: 3,
    teamwork: 3,
    resilience: 3
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [activeTooltip, setActiveTooltip] = useState<AttributeKey | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setActiveTooltip(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchPlayers = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/players');
      const data = await response.json();
      if (data.data) {
        setPlayers(data.data);
      }
    } catch (error) {
      setError('Failed to fetch players');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = '/api/admin/players';
      const method = selectedPlayer ? 'PUT' : 'POST';
      const body = selectedPlayer
        ? { ...formData, player_id: selectedPlayer.player_id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setFormData({
        name: '',
        is_ringer: false,
        is_retired: false,
        goalscoring: 3,
        defender: 3,
        stamina_pace: 3,
        control: 3,
        teamwork: 3,
        resilience: 3
      });
      setSelectedPlayer(null);
      fetchPlayers();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (player: Player): void => {
    setSelectedPlayer(player);
    setFormData({
      name: player.name,
      is_ringer: player.is_ringer,
      is_retired: player.is_retired,
      goalscoring: player.goalscoring,
      defender: player.defender,
      stamina_pace: player.stamina_pace,
      control: player.control,
      teamwork: player.teamwork,
      resilience: player.resilience
    });
  };

  const handleSort = (field: string): void => {
    if (sortField === field) {
      setDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setDirection('asc');
    }
  };

  const sortPlayers = (players: Player[]): Player[] => {
    return [...players].sort((a, b) => {
      if (sortField === 'status') {
        // Sort by status (active first) then by name
        if (a.is_retired === b.is_retired) {
          return a.name.localeCompare(b.name);
        }
        return a.is_retired === true ? 1 : -1;
      }
      
      if (sortField === 'name') {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      // For numeric fields
      const aValue = a[sortField as keyof Player];
      const bValue = b[sortField as keyof Player];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  };

  const filteredPlayers = sortPlayers(players).filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRetiredFilter = showRetired ? true : !player.is_retired;
    return matchesSearch && matchesRetiredFilter;
  });

  const handleEditClick = (player: Player): void => {
    setEditingId(player.player_id);
    setEditForm({
      name: player.name,
      is_ringer: player.is_ringer,
      is_retired: player.is_retired,
      goalscoring: player.goalscoring,
      defender: player.defender,
      stamina_pace: player.stamina_pace,
      control: player.control,
      teamwork: player.teamwork,
      resilience: player.resilience
    });
  };

  const handleCancelEdit = (): void => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editForm || !editingId) return;
    
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/admin/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, player_id: editingId }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Update local state
      setPlayers(players.map(p => 
        p.player_id === editingId ? { ...p, ...editForm } : p
      ));
      setEditingId(null);
      setEditForm(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const renderEditableRow = (player: Player): JSX.Element => {
    if (!editForm) return <></>;
    
    const handleInputChange = (field: keyof FormData, value: string | number | boolean): void => {
      setEditForm(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleNumberChange = (field: keyof FormData, value: string): void => {
      const num = parseInt(value);
      if (num >= 1 && num <= 5) {
        handleInputChange(field, num);
      }
    };

    return (
      <TableRow key={player.player_id} className="bg-blue-50">
        <TableCell>
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-2 py-1 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
          />
        </TableCell>
        <TableCell>
          <button
            onClick={() => handleInputChange('is_retired', !editForm.is_retired)}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              editForm.is_retired ? 'bg-neutral-100 text-neutral-800' : 'bg-green-100 text-green-800'
            }`}
          >
            {editForm.is_retired ? 'Retired' : 'Active'}
          </button>
        </TableCell>
        <TableCell>
          <button
            onClick={() => handleInputChange('is_ringer', !editForm.is_ringer)}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              editForm.is_ringer ? 'bg-blue-100 text-blue-800' : 'bg-neutral-100 text-neutral-800'
            }`}
          >
            {editForm.is_ringer ? 'Yes' : 'No'}
          </button>
        </TableCell>
        {['goalscoring', 'defender', 'stamina_pace', 'control', 'teamwork', 'resilience'].map((field) => (
          <TableCell key={field}>
            <input
              type="number"
              min="1"
              max="5"
              value={editForm[field as keyof FormData] as number}
              onChange={(e) => handleNumberChange(field as keyof FormData, e.target.value)}
              className="w-12 px-2 py-1 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </TableCell>
        ))}
        <TableCell>
          <div className="flex space-x-2">
            <button
              onClick={handleSaveEdit}
              disabled={isLoading}
              className="px-2 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
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
            onClick={() => setShowGuide(true)}
            variant="secondary"
            size="sm"
          >
            Attribute Guide
          </Button>
        </div>
        
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
          <div className="md:w-1/2">
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
                      <TableCell onClick={() => handleSort('name')} className="cursor-pointer">
                        Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell onClick={() => handleSort('status')} className="cursor-pointer">
                        Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell>Ringer</TableCell>
                      {['goalscoring', 'defender', 'stamina_pace', 'control', 'teamwork', 'resilience'].map(attr => (
                        <TableCell 
                          key={attr}
                          onClick={() => handleSort(attr)}
                          className="cursor-pointer"
                          onMouseEnter={() => setActiveTooltip(attr as AttributeKey)}
                          onMouseLeave={() => setActiveTooltip(null)}
                        >
                          {attr.charAt(0).toUpperCase() + attr.slice(1).replace('_', '/')} {sortField === attr && (sortDirection === 'asc' ? '↑' : '↓')}
                          {activeTooltip === attr && <AttributeTooltip attribute={attr as AttributeKey} />}
                        </TableCell>
                      ))}
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPlayers.map(player => (
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
                            {['goalscoring', 'defender', 'stamina_pace', 'control', 'teamwork', 'resilience'].map(attr => (
                              <TableCell key={attr}>{player[attr as keyof Player]}</TableCell>
                            ))}
                            <TableCell>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditClick(player)}
                                  className="text-primary-600 hover:text-primary-900 text-sm"
                                >
                                  Edit
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          
          <div className="md:w-1/2">
            <form onSubmit={handleSubmit}>
              <h3 className="text-md font-medium mb-4">
                {selectedPlayer ? `Edit ${selectedPlayer.name}` : 'Add New Player'}
              </h3>
              
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    required
                  />
                </div>
                
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input
                      id="is_ringer"
                      type="checkbox"
                      checked={formData.is_ringer}
                      onChange={(e) => setFormData({ ...formData, is_ringer: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_ringer" className="ml-2 block text-sm text-gray-700">
                      Ringer
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="is_retired"
                      type="checkbox"
                      checked={formData.is_retired}
                      onChange={(e) => setFormData({ ...formData, is_retired: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_retired" className="ml-2 block text-sm text-gray-700">
                      Retired
                    </label>
                  </div>
                </div>
                
                {['goalscoring', 'defender', 'stamina_pace', 'control', 'teamwork', 'resilience'].map(attr => (
                  <div key={attr}>
                    <div className="flex justify-between items-center">
                      <label htmlFor={attr} className="block text-sm font-medium text-gray-700">
                        {attr.charAt(0).toUpperCase() + attr.slice(1).replace('_', '/')}
                      </label>
                      <span className="text-sm text-gray-500">{formData[attr as keyof FormData]}/5</span>
                    </div>
                    <input
                      type="range"
                      id={attr}
                      min="1"
                      max="5"
                      value={formData[attr as keyof FormData] as number}
                      onChange={(e) => setFormData({ ...formData, [attr]: parseInt(e.target.value) })}
                      className="mt-1 block w-full"
                    />
                  </div>
                ))}
                
                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                  >
                    {selectedPlayer ? 'Update Player' : 'Add Player'}
                  </Button>
                  
                  {selectedPlayer && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSelectedPlayer(null);
                        setFormData({
                          name: '',
                          is_ringer: false,
                          is_retired: false,
                          goalscoring: 3,
                          defender: 3,
                          stamina_pace: 3,
                          control: 3,
                          teamwork: 3,
                          resilience: 3
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </Card>
      
      {showGuide && (
        <AttributeGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      )}
    </div>
  );
};

export default PlayerManager; 