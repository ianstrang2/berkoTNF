import React, { useState, useEffect, useRef } from 'react';
import { AttributeTooltip, AttributeGuideModal } from './AttributeGuide.component';
import Button from '@/components/ui-kit/Button.component';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';

type AttributeType = 'goalscoring' | 'defender' | 'stamina_pace' | 'control' | 'teamwork' | 'resilience';

interface StatCellProps {
  value: number;
}

interface Player {
  player_id: number;
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

interface EditForm {
  goalscoring: number;
  defender: number;
  stamina_pace: number;
  control: number;
  teamwork: number;
  resilience: number;
}

interface SortConfig {
  key: keyof Player;
  direction: 'asc' | 'desc';
}

// Soft UI styled StatCell for rating visualization
const StatCell: React.FC<StatCellProps> = ({ value }) => {
  const getStatColor = (val: number): string => {
    switch (val) {
      case 1: return 'from-red-600 to-red-400 text-white';
      case 2: return 'from-orange-600 to-orange-400 text-white';
      case 3: return 'from-yellow-600 to-yellow-400 text-slate-700';
      case 4: return 'from-lime-600 to-lime-400 text-white';
      case 5: return 'from-green-600 to-green-400 text-white';
      default: return 'from-slate-400 to-slate-300 text-white';
    }
  };

  return (
    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tl ${getStatColor(value)} shadow-soft-sm font-bold`}>
      {value}
    </div>
  );
};

const PlayerRatings: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'name',
    direction: 'asc'
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [showConfirmation, setShowConfirmation] = useState<{
    isOpen: boolean;
    playerId: number | null;
  }>({ isOpen: false, playerId: null });
  
  // Track component mount state
  const isMounted = useRef(true);
  
  // Set up isMounted ref cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    
    const fetchPlayers = async (): Promise<void> => {
      try {
        // Exit if component unmounted
        if (!isMounted.current || isCancelled) return;
        
        const response = await fetch('/api/admin/players');
        
        // Exit if component unmounted during fetch
        if (!isMounted.current || isCancelled) return;
        
        const data = await response.json();
        if (data.data) {
          // Filter to only show active players and ringers
          const activePlayers = data.data.filter((player: Player) => !player.is_retired);
          
          if (isMounted.current && !isCancelled) {
            setPlayers(activePlayers);
            setError('');
          }
        }
      } catch (error) {
        if (isMounted.current && !isCancelled) {
          setError('Failed to fetch players');
        }
      } finally {
        if (isMounted.current && !isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchPlayers();
    
    // Cleanup to prevent state updates after unmount
    return () => {
      isCancelled = true;
    };
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

  const handleSort = (field: keyof Player): void => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === field && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key: field, direction });
  };

  const sortPlayers = (playersToSort: Player[]): Player[] => {
    return [...playersToSort].sort((a, b) => {
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      // For numeric attributes
      return sortConfig.direction === 'asc'
        ? (a[sortConfig.key] as number) - (b[sortConfig.key] as number)
        : (b[sortConfig.key] as number) - (a[sortConfig.key] as number);
    });
  };

  const getSortIndicator = (key: keyof Player) => {
    if (sortConfig.key === key) {
      return (
        <span className="ml-1 text-fuchsia-500">
          {sortConfig.direction === 'desc' ? '▼' : '▲'}
        </span>
      );
    }
    return null;
  };

  const handleEditClick = (player: Player): void => {
    setEditingId(player.player_id);
    setEditForm({
      goalscoring: player.goalscoring,
      defender: player.defender,
      stamina_pace: player.stamina_pace,
      control: player.control,
      teamwork: player.teamwork,
      resilience: player.resilience
    });
  };

  const handleCancelEdit = (): void => {
    setShowConfirmation({
      isOpen: true,
      playerId: editingId
    });
  };

  const confirmCancelEdit = (): void => {
    setEditingId(null);
    setEditForm(null);
    setShowConfirmation({
      isOpen: false,
      playerId: null
    });
  };

  const closeConfirmation = (): void => {
    setShowConfirmation({
      isOpen: false,
      playerId: null
    });
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editingId || !editForm) return;
    
    try {
      setIsLoading(true);
      setError('');

      const player = players.find(p => p.player_id === editingId);
      if (!player) {
        throw new Error('Player not found');
      }

      const response = await fetch('/api/admin/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          player_id: editingId,
          // Preserve existing name and status
          name: player.name,
          is_retired: player.is_retired,
          is_ringer: player.is_ringer
        }),
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
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderEditableRow = (player: Player): JSX.Element => {
    if (!editForm) return <tr>{' '}</tr>;

    const handleNumberChange = (field: keyof EditForm, value: number): void => {
      const num = parseInt(value.toString());
      if (num >= 1 && num <= 5) {
        setEditForm(prev => prev ? { ...prev, [field]: num } : null);
      }
    };

    return (
      <tr key={player.player_id} className="bg-gradient-to-r from-fuchsia-50 to-slate-50">
        <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
          <div className="flex px-2 py-1">
            <div className="flex flex-row items-center justify-start">
              <h6 className="mb-0 leading-normal text-sm">{player.name}</h6>
              {player.is_ringer && (
                <span className="ml-2 inline-flex px-1.5 py-0.5 text-xxs font-medium leading-none text-slate-600 rounded-full bg-slate-100 border border-slate-200 shadow-soft-xs opacity-80">
                  RINGER
                </span>
              )}
            </div>
          </div>
        </td>
        {(['goalscoring', 'defender', 'stamina_pace', 'control', 'teamwork', 'resilience'] as const).map((field) => (
          <td key={field} className="p-2 text-center align-middle bg-transparent border-b">
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => handleNumberChange(field, editForm[field] - 1)}
                disabled={editForm[field] <= 1}
                className="w-6 h-6 flex items-center justify-center text-xs text-slate-700 hover:text-slate-900 disabled:opacity-30 border border-slate-200 rounded shadow-soft-xs"
              >
                -
              </button>
              <StatCell value={editForm[field]} />
              <button
                onClick={() => handleNumberChange(field, editForm[field] + 1)}
                disabled={editForm[field] >= 5}
                className="w-6 h-6 flex items-center justify-center text-xs text-slate-700 hover:text-slate-900 disabled:opacity-30 border border-slate-200 rounded shadow-soft-xs"
              >
                +
              </button>
            </div>
          </td>
        ))}
        <td className="p-2 text-right align-middle bg-transparent border-b">
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleSaveEdit}
              className="inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-block px-4 py-2 text-xs font-medium text-center text-slate-500 uppercase align-middle transition-all bg-transparent border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const filteredPlayers = sortPlayers(players).filter(player => 
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="text-center">
        <h6 className="mb-2 text-lg">Loading...</h6>
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-soft-xl p-6 max-w-fit">
        <div className="flex justify-between items-center mb-6">
          <h5 className="font-bold text-slate-700">Player Ratings</h5>
          <button 
            onClick={() => setShowGuide(true)}
            className="inline-block px-4 py-2 mb-0 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85"
          >
            View Attribute Guide
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

        <div className="mb-6 w-full sm:w-64">
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

        <div className="overflow-x-auto">
          <table className="items-center mb-0 align-top border-gray-200 text-slate-500">
            <thead className="align-bottom">
              <tr>
                <th onClick={() => handleSort('name')} className="cursor-pointer px-6 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                  Name {getSortIndicator('name')}
                </th>
                <th onClick={() => handleSort('goalscoring')} className="cursor-pointer px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                  GOL {getSortIndicator('goalscoring')}
                </th>
                <th onClick={() => handleSort('defender')} className="cursor-pointer px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                  DEF {getSortIndicator('defender')}
                </th>
                <th onClick={() => handleSort('stamina_pace')} className="cursor-pointer px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                  S&P {getSortIndicator('stamina_pace')}
                </th>
                <th onClick={() => handleSort('control')} className="cursor-pointer px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                  CTL {getSortIndicator('control')}
                </th>
                <th onClick={() => handleSort('teamwork')} className="cursor-pointer px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                  TMW {getSortIndicator('teamwork')}
                </th>
                <th onClick={() => handleSort('resilience')} className="cursor-pointer px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                  RES {getSortIndicator('resilience')}
                </th>
                <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => (
                editingId === player.player_id ? (
                  renderEditableRow(player)
                ) : (
                  <tr key={player.player_id}>
                    <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                      <div className="flex px-2 py-1">
                        <div className="flex flex-row items-center justify-start">
                          <h6 className="mb-0 leading-normal text-sm">{player.name}</h6>
                          {player.is_ringer && (
                            <span className="ml-2 inline-flex px-1.5 py-0.5 text-xxs font-medium leading-none text-slate-600 rounded-full bg-slate-100 border border-slate-200 shadow-soft-xs opacity-80">
                              RINGER
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-center align-middle bg-transparent border-b">
                      <StatCell value={player.goalscoring} />
                    </td>
                    <td className="p-2 text-center align-middle bg-transparent border-b">
                      <StatCell value={player.defender} />
                    </td>
                    <td className="p-2 text-center align-middle bg-transparent border-b">
                      <StatCell value={player.stamina_pace} />
                    </td>
                    <td className="p-2 text-center align-middle bg-transparent border-b">
                      <StatCell value={player.control} />
                    </td>
                    <td className="p-2 text-center align-middle bg-transparent border-b">
                      <StatCell value={player.teamwork} />
                    </td>
                    <td className="p-2 text-center align-middle bg-transparent border-b">
                      <StatCell value={player.resilience} />
                    </td>
                    <td className="p-2 text-center align-middle bg-transparent border-b">
                      <button
                        onClick={() => handleEditClick(player)}
                        className="inline-block px-3 py-1.5 text-xs font-medium text-center text-slate-500 uppercase align-middle transition-all bg-transparent border border-slate-200 rounded-lg shadow-none cursor-pointer hover:scale-102 active:opacity-85 hover:text-slate-800 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AttributeGuideModal 
        isOpen={showGuide} 
        onClose={() => setShowGuide(false)} 
      />

      <SoftUIConfirmationModal
        isOpen={showConfirmation.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmCancelEdit}
        title="Cancel Editing"
        message="Are you sure you want to cancel? Any unsaved changes will be lost."
        confirmText="Yes, Cancel Edit"
        cancelText="Continue Editing"
      />
    </>
  );
};

export default PlayerRatings; 