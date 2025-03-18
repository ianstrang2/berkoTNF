import React, { useState, useEffect, useRef } from 'react';
import { AttributeTooltip, AttributeGuideModal } from './AttributeGuide';

const PlayerManager = () => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showRetired, setShowRetired] = useState(false);
  const [sortField, setSortField] = useState('status');
  const [sortDirection, setDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const tooltipRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

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
        setPlayers(data.data);
      }
    } catch (error) {
      setError('Failed to fetch players');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = selectedPlayer
        ? '/api/admin/players'
        : '/api/admin/players';
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
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (player) => {
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
      
      return sortDirection === 'asc'
        ? a[sortField] - b[sortField]
        : b[sortField] - a[sortField];
    });
  };

  const filteredPlayers = sortPlayers(players).filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRetiredFilter = showRetired ? true : !player.is_retired;
    return matchesSearch && matchesRetiredFilter;
  });

  const handleEditClick = (player) => {
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
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderEditableRow = (player) => {
    const handleInputChange = (field, value) => {
      setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const handleNumberChange = (field, value) => {
      const num = parseInt(value);
      if (num >= 1 && num <= 5) {
        handleInputChange(field, num);
      }
    };

    return (
      <tr key={player.player_id} className="bg-blue-50">
        <td className="px-2 py-1 whitespace-nowrap">
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-2 py-1 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
          />
        </td>
        <td className="px-2 py-1 whitespace-nowrap">
          <button
            onClick={() => handleInputChange('is_retired', !editForm.is_retired)}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              editForm.is_retired ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
            }`}
          >
            {editForm.is_retired ? 'Retired' : 'Active'}
          </button>
        </td>
        <td className="px-2 py-1 whitespace-nowrap">
          <button
            onClick={() => handleInputChange('is_ringer', !editForm.is_ringer)}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              editForm.is_ringer ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {editForm.is_ringer ? 'Yes' : 'No'}
          </button>
        </td>
        {['goalscoring', 'defender', 'stamina_pace', 'control', 'teamwork', 'resilience'].map((field) => (
          <td key={field} className="px-2 py-1 whitespace-nowrap">
            <div className="flex items-center space-x-0.5">
              <button
                onClick={() => handleNumberChange(field, editForm[field] - 1)}
                disabled={editForm[field] <= 1}
                className="w-5 h-5 flex items-center justify-center text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
              >
                -
              </button>
              <input
                type="text"
                value={editForm[field]}
                onChange={(e) => handleNumberChange(field, e.target.value)}
                className="w-7 px-0 py-0.5 text-center border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={() => handleNumberChange(field, editForm[field] + 1)}
                disabled={editForm[field] >= 5}
                className="w-5 h-5 flex items-center justify-center text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
              >
                +
              </button>
            </div>
          </td>
        ))}
        <td className="px-2 py-1 whitespace-nowrap text-right">
          <div className="flex space-x-2 justify-end">
            <button
              onClick={handleSaveEdit}
              disabled={isLoading}
              className="text-xs text-green-600 hover:text-green-900 font-medium"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isLoading}
              className="text-xs text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderAttributeInput = (label, field) => (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 focus:outline-none"
          onClick={() => setActiveTooltip(activeTooltip === field ? null : field)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <div ref={tooltipRef} className="relative">
          {activeTooltip === field && (
            <AttributeTooltip attribute={field} />
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="range"
          min="1"
          max="5"
          value={formData[field]}
          onChange={(e) => setFormData({ ...formData, [field]: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <span className="w-8 text-center">{formData[field]}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary-600">
          {selectedPlayer ? 'Edit Player' : 'Add New Player'}
        </h2>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderAttributeInput('Goalscoring', 'goalscoring')}
            {renderAttributeInput('Defender', 'defender')}
            {renderAttributeInput('Stamina & Pace', 'stamina_pace')}
            {renderAttributeInput('Control', 'control')}
            {renderAttributeInput('Teamwork', 'teamwork')}
            {renderAttributeInput('Resilience', 'resilience')}
          </div>

          <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-4 sm:space-y-0">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_ringer}
                onChange={(e) => setFormData({ ...formData, is_ringer: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded transition-colors"
              />
              <span>Ringer</span>
            </label>

            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!formData.is_retired}
                onChange={(e) => setFormData({ ...formData, is_retired: !e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded transition-colors"
              />
              <span>Active</span>
            </label>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm font-medium text-center">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : selectedPlayer ? 'Update Player' : 'Add Player'}
          </button>

          {selectedPlayer && (
            <button
              type="button"
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
              className="flex-1 py-2 px-4 bg-white text-primary-600 border border-primary-200 rounded-md hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showRetired}
                onChange={(e) => setShowRetired(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span>Show Retired Players</span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                  Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('status')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                  Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ringer
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
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        player.is_retired ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {player.is_retired ? 'Retired' : 'Active'}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {player.is_ringer && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Yes
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">{player.goalscoring}</td>
                    <td className="px-3 py-4 whitespace-nowrap">{player.defender}</td>
                    <td className="px-3 py-4 whitespace-nowrap">{player.stamina_pace}</td>
                    <td className="px-3 py-4 whitespace-nowrap">{player.control}</td>
                    <td className="px-3 py-4 whitespace-nowrap">{player.teamwork}</td>
                    <td className="px-3 py-4 whitespace-nowrap">{player.resilience}</td>
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

export default PlayerManager;
