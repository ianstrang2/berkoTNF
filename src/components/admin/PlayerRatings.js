import React, { useState, useEffect, useRef } from 'react';
import { AttributeTooltip, AttributeGuideModal } from './AttributeGuide';

const StatCell = ({ value }) => {
  const getStatColor = (val) => {
    switch (val) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-lime-100 text-lime-800';
      case 5: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium ${getStatColor(value)}`}>
      {value}
    </div>
  );
};

const PlayerRatings = () => {
  const [players, setPlayers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setActiveTooltip(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/admin/players');
      const data = await response.json();
      if (data.data) {
        // Filter to only show active players and ringers
        const activePlayers = data.data.filter(player => !player.is_retired);
        setPlayers(activePlayers);
      }
    } catch (error) {
      setError('Failed to fetch players');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setDirection('asc');
    }
  };

  const sortPlayers = (players) => {
    return [...players].sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      return sortDirection === 'asc'
        ? a[sortField] - b[sortField]
        : b[sortField] - a[sortField];
    });
  };

  const handleEditClick = (player) => {
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

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/admin/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          player_id: editingId,
          // Preserve existing name and status
          name: players.find(p => p.player_id === editingId).name,
          is_retired: players.find(p => p.player_id === editingId).is_retired,
          is_ringer: players.find(p => p.player_id === editingId).is_ringer
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
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderEditableRow = (player) => {
    const handleNumberChange = (field, value) => {
      const num = parseInt(value);
      if (num >= 1 && num <= 5) {
        setEditForm(prev => ({ ...prev, [field]: num }));
      }
    };

    return (
      <tr key={player.player_id} className="bg-blue-50">
        <td className="px-3 py-4 whitespace-nowrap">
          {player.name}
          {player.is_ringer && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Ringer
            </span>
          )}
        </td>
        {['goalscoring', 'defender', 'stamina_pace', 'control', 'teamwork', 'resilience'].map((field) => (
          <td key={field} className="px-3 py-4 whitespace-nowrap">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleNumberChange(field, editForm[field] - 1)}
                disabled={editForm[field] <= 1}
                className="w-6 h-6 flex items-center justify-center text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 border border-gray-200 rounded"
              >
                -
              </button>
              <StatCell value={editForm[field]} />
              <button
                onClick={() => handleNumberChange(field, editForm[field] + 1)}
                disabled={editForm[field] >= 5}
                className="w-6 h-6 flex items-center justify-center text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 border border-gray-200 rounded"
              >
                +
              </button>
            </div>
          </td>
        ))}
        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
          <button
            onClick={handleSaveEdit}
            disabled={isLoading}
            className="text-green-600 hover:text-green-900"
          >
            Save
          </button>
          <button
            onClick={handleCancelEdit}
            className="text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        </td>
      </tr>
    );
  };

  const filteredPlayers = sortPlayers(players).filter(player => 
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary-600">Player Ratings</h2>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Grading Guide
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
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

      <div className="mt-4">
        <div className="flex items-center mb-4">
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                  Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('goalscoring')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                  GOL {sortField === 'goalscoring' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('defender')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                  DEF {sortField === 'defender' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('stamina_pace')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                  S&P {sortField === 'stamina_pace' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('control')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                  CTL {sortField === 'control' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('teamwork')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                  TMW {sortField === 'teamwork' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('resilience')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                  RES {sortField === 'resilience' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlayers.map((player) => (
                editingId === player.player_id ? (
                  renderEditableRow(player)
                ) : (
                  <tr key={player.player_id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap">
                      {player.name}
                      {player.is_ringer && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Ringer
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <StatCell value={player.goalscoring} />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <StatCell value={player.defender} />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <StatCell value={player.stamina_pace} />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <StatCell value={player.control} />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <StatCell value={player.teamwork} />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <StatCell value={player.resilience} />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(player)}
                        disabled={editingId !== null}
                        className="text-primary-600 hover:text-primary-900 disabled:opacity-50"
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
    </div>
  );
};

export default PlayerRatings; 