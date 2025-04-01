import React, { useState, useEffect, useRef } from 'react';
import { AttributeTooltip, AttributeGuideModal } from './AttributeGuide';
import { Card, Table, TableHead, TableBody, TableRow, TableCell, Button } from '@/components/ui-kit';

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

// NOTE: StatCell has conditional formatting based on value (1-5) with colors from red to green
// This conditional formatting is preserved for admin view to easily distinguish ratings
const StatCell: React.FC<StatCellProps> = ({ value }) => {
  const getStatColor = (val: number): string => {
    switch (val) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-lime-100 text-lime-800';
      case 5: return 'bg-green-100 text-green-800';
      default: return 'bg-neutral-100 text-neutral-800';
    }
  };

  return (
    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium ${getStatColor(value)}`}>
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

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
        // Filter to only show active players and ringers
        const activePlayers = data.data.filter((player: Player) => !player.is_retired);
        setPlayers(activePlayers);
      }
    } catch (error) {
      setError('Failed to fetch players');
    }
  };

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
        <span className="ml-related text-primary-600">
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
    setEditingId(null);
    setEditForm(null);
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
    if (!editForm) return <TableRow>{' '}</TableRow>; // This should never happen

    const handleNumberChange = (field: keyof EditForm, value: number): void => {
      const num = parseInt(value.toString());
      if (num >= 1 && num <= 5) {
        setEditForm(prev => prev ? { ...prev, [field]: num } : null);
      }
    };

    return (
      <TableRow key={player.player_id} className="bg-blue-50">
        <TableCell>
          {player.name}
          {player.is_ringer && (
            <span className="ml-related inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Ringer
            </span>
          )}
        </TableCell>
        {(['goalscoring', 'defender', 'stamina_pace', 'control', 'teamwork', 'resilience'] as const).map((field) => (
          <TableCell key={field}>
            <div className="flex items-center space-x-related">
              <button
                onClick={() => handleNumberChange(field, editForm[field] - 1)}
                disabled={editForm[field] <= 1}
                className="w-6 h-6 flex items-center justify-center text-sm text-neutral-500 hover:text-neutral-700 disabled:opacity-30 border border-neutral-200 rounded"
              >
                -
              </button>
              <StatCell value={editForm[field]} />
              <button
                onClick={() => handleNumberChange(field, editForm[field] + 1)}
                disabled={editForm[field] >= 5}
                className="w-6 h-6 flex items-center justify-center text-sm text-neutral-500 hover:text-neutral-700 disabled:opacity-30 border border-neutral-200 rounded"
              >
                +
              </button>
            </div>
          </TableCell>
        ))}
        <TableCell className="text-right">
          <button
            onClick={handleSaveEdit}
            disabled={isLoading}
            className="text-primary-600 hover:text-primary-700 mr-related"
          >
            Save
          </button>
          <button
            onClick={handleCancelEdit}
            className="text-neutral-600 hover:text-neutral-900"
          >
            Cancel
          </button>
        </TableCell>
      </TableRow>
    );
  };

  const filteredPlayers = sortPlayers(players).filter(player => 
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="space-y-section">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary-600 tracking-tight">Player Ratings</h2>
        <Button
          variant="primary"
          onClick={() => setShowGuide(true)}
          className="text-primary-600 hover:text-primary-700"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          iconPosition="left"
        >
          Grading Guide
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-element">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-element">
        <div className="flex items-center mb-element">
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <Table responsive>
          <TableHead>
            <TableRow>
              <TableCell isHeader onClick={() => handleSort('name')} className="cursor-pointer hover:text-primary-600">
                Name {getSortIndicator('name')}
              </TableCell>
              <TableCell isHeader onClick={() => handleSort('goalscoring')} className="cursor-pointer hover:text-primary-600">
                GOL {getSortIndicator('goalscoring')}
              </TableCell>
              <TableCell isHeader onClick={() => handleSort('defender')} className="cursor-pointer hover:text-primary-600">
                DEF {getSortIndicator('defender')}
              </TableCell>
              <TableCell isHeader onClick={() => handleSort('stamina_pace')} className="cursor-pointer hover:text-primary-600">
                S&P {getSortIndicator('stamina_pace')}
              </TableCell>
              <TableCell isHeader onClick={() => handleSort('control')} className="cursor-pointer hover:text-primary-600">
                CTL {getSortIndicator('control')}
              </TableCell>
              <TableCell isHeader onClick={() => handleSort('teamwork')} className="cursor-pointer hover:text-primary-600">
                TMW {getSortIndicator('teamwork')}
              </TableCell>
              <TableCell isHeader onClick={() => handleSort('resilience')} className="cursor-pointer hover:text-primary-600">
                RES {getSortIndicator('resilience')}
              </TableCell>
              <TableCell isHeader>{' '}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPlayers.map((player) => (
              editingId === player.player_id ? (
                renderEditableRow(player)
              ) : (
                <TableRow key={player.player_id} className="hover:bg-neutral-50">
                  <TableCell>
                    {player.name}
                    {player.is_ringer && (
                      <span className="ml-related inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Ringer
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatCell value={player.goalscoring} />
                  </TableCell>
                  <TableCell>
                    <StatCell value={player.defender} />
                  </TableCell>
                  <TableCell>
                    <StatCell value={player.stamina_pace} />
                  </TableCell>
                  <TableCell>
                    <StatCell value={player.control} />
                  </TableCell>
                  <TableCell>
                    <StatCell value={player.teamwork} />
                  </TableCell>
                  <TableCell>
                    <StatCell value={player.resilience} />
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleEditClick(player)}
                      disabled={editingId !== null}
                      className="text-primary-600 hover:text-primary-700 disabled:opacity-50"
                    >
                      Edit
                    </button>
                  </TableCell>
                </TableRow>
              )
            ))}
          </TableBody>
        </Table>
      </div>

      <AttributeGuideModal 
        isOpen={showGuide} 
        onClose={() => setShowGuide(false)} 
      />
    </Card>
  );
};

export default PlayerRatings; 