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
    teamwork: 3
  });

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
        teamwork: 3
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
      teamwork: player.teamwork
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
                  teamwork: 3
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
          <h3 className="text-xl font-semibold text-primary-600">Player List</h3>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer">
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
                <th 
                  onClick={() => handleSort('name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                >
                  Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                >
                  Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('goalscoring')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                >
                  Goalscoring {sortField === 'goalscoring' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('defender')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                >
                  Defender {sortField === 'defender' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('stamina_pace')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                >
                  Stamina & Pace {sortField === 'stamina_pace' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('control')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                >
                  Control {sortField === 'control' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('teamwork')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                >
                  Teamwork {sortField === 'teamwork' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlayers.map((player) => (
                <tr key={player.player_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {player.name}
                    {player.is_ringer && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Ringer
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                      player.is_retired
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {player.is_retired ? 'Retired' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{player.goalscoring}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{player.defender}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{player.stamina_pace}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{player.control}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{player.teamwork}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(player)}
                      className="text-primary-600 hover:text-primary-900 font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
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
