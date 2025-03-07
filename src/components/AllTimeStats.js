'use client';
import React, { useState, useEffect } from 'react';

const AllTimeStats = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({
    key: 'fantasy_points', // Default sort by Fantasy Points
    direction: 'desc'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/allTimeStats');
        const result = await response.json();
        
        if (result.data) {
          setStats(result.data);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  const getGamesPlayedColor = (games) => {
    if (games >= 400) return 'bg-green-600';
    if (games >= 300) return 'bg-green-500';
    if (games >= 200) return 'bg-green-400';
    if (games >= 100) return 'bg-yellow-200';
    return '';
  };

  const getGoalsColor = (goals) => {
    if (goals >= 300) return 'bg-green-600';
    if (goals >= 200) return 'bg-green-500';
    if (goals >= 100) return 'bg-green-400';
    if (goals >= 50) return 'bg-yellow-200';
    return '';
  };

  const getMPGColor = (mpg) => {
    if (mpg <= 60) return 'bg-green-600';
    if (mpg <= 90) return 'bg-green-500';
    if (mpg <= 120) return 'bg-green-400';
    return '';
  };

  const sortData = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...stats].sort((a, b) => {
      // Handle null or undefined values
      if (a[key] === null || a[key] === undefined) return 1;
      if (b[key] === null || b[key] === undefined) return -1;
      
      // Handle percentage values
      if (key.includes('percentage')) {
        const valueA = parseFloat(a[key]);
        const valueB = parseFloat(b[key]);
        if (direction === 'asc') {
          return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        }
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
      
      // Handle numeric and string values differently
      const valueA = typeof a[key] === 'string' ? a[key].toLowerCase() : a[key];
      const valueB = typeof b[key] === 'string' ? b[key].toLowerCase() : b[key];
      
      if (direction === 'asc') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      }
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    });
    
    setStats(sortedData);
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return (
        <span className="ml-2 inline-block text-xs font-bold">
          {sortConfig.direction === 'desc' ? '▼' : '▲'}
        </span>
      );
    }
    return null;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">All-Time Stats</h2>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="bg-dark text-white">
            <tr>
              <th onClick={() => sortData('name')} style={{ cursor: 'pointer', minWidth: '150px' }}>
                Player {getSortIndicator('name')}
              </th>
              <th onClick={() => sortData('games_played')} style={{ cursor: 'pointer', width: '50px', textAlign: 'center' }}>
                P {getSortIndicator('games_played')}
              </th>
              <th onClick={() => sortData('wins')} style={{ cursor: 'pointer', width: '50px', textAlign: 'center' }}>
                W {getSortIndicator('wins')}
              </th>
              <th onClick={() => sortData('draws')} style={{ cursor: 'pointer', width: '50px', textAlign: 'center' }}>
                D {getSortIndicator('draws')}
              </th>
              <th onClick={() => sortData('losses')} style={{ cursor: 'pointer', width: '50px', textAlign: 'center' }}>
                L {getSortIndicator('losses')}
              </th>
              <th onClick={() => sortData('goals')} style={{ cursor: 'pointer', width: '70px', textAlign: 'center' }}>
                Goals {getSortIndicator('goals')}
              </th>
              <th onClick={() => sortData('win_percentage')} style={{ cursor: 'pointer', width: '80px', textAlign: 'center' }}>
                Win % {getSortIndicator('win_percentage')}
              </th>
              <th onClick={() => sortData('minutes_per_goal')} style={{ cursor: 'pointer', width: '80px', textAlign: 'center' }}>
                MPG {getSortIndicator('minutes_per_goal')}
              </th>
              <th onClick={() => sortData('heavy_wins')} style={{ cursor: 'pointer', width: '80px', textAlign: 'center' }}>
                Heavy W {getSortIndicator('heavy_wins')}
              </th>
              <th onClick={() => sortData('heavy_win_percentage')} style={{ cursor: 'pointer', width: '100px', textAlign: 'center' }}>
                Heavy W % {getSortIndicator('heavy_win_percentage')}
              </th>
              <th onClick={() => sortData('heavy_losses')} style={{ cursor: 'pointer', width: '80px', textAlign: 'center' }}>
                Heavy L {getSortIndicator('heavy_losses')}
              </th>
              <th onClick={() => sortData('heavy_loss_percentage')} style={{ cursor: 'pointer', width: '100px', textAlign: 'center' }}>
                Heavy L % {getSortIndicator('heavy_loss_percentage')}
              </th>
              <th onClick={() => sortData('clean_sheets')} style={{ cursor: 'pointer', width: '100px', textAlign: 'center' }}>
                Clean Sheets {getSortIndicator('clean_sheets')}
              </th>
              <th onClick={() => sortData('clean_sheet_percentage')} style={{ cursor: 'pointer', width: '100px', textAlign: 'center' }}>
                Clean Sheet % {getSortIndicator('clean_sheet_percentage')}
              </th>
              <th onClick={() => sortData('fantasy_points')} style={{ cursor: 'pointer', width: '70px', textAlign: 'center' }}>
                Points {getSortIndicator('fantasy_points')}
              </th>
              <th onClick={() => sortData('points_per_game')} style={{ cursor: 'pointer', width: '70px', textAlign: 'center' }}>
                PPG {getSortIndicator('points_per_game')}
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map((player, index) => {
              const isRetired = player.is_retired;
              return (
                <tr key={index} className={isRetired ? 'table-secondary' : ''}>
                  <td className="font-medium">{player.name}</td>
                  <td className={`text-center ${getGamesPlayedColor(player.games_played)}`}>{player.games_played}</td>
                  <td className="text-center">{player.wins}</td>
                  <td className="text-center">{player.draws}</td>
                  <td className="text-center">{player.losses}</td>
                  <td className={`text-center ${getGoalsColor(player.goals)}`}>{player.goals}</td>
                  <td className="text-center">{player.win_percentage}%</td>
                  <td className={`text-center ${getMPGColor(player.minutes_per_goal)}`}>{player.minutes_per_goal}</td>
                  <td className="text-center">{player.heavy_wins}</td>
                  <td className="text-center">{player.heavy_win_percentage}%</td>
                  <td className="text-center">{player.heavy_losses}</td>
                  <td className="text-center">{player.heavy_loss_percentage}%</td>
                  <td className="text-center">{player.clean_sheets}</td>
                  <td className="text-center">{player.clean_sheet_percentage}%</td>
                  <td className="text-center font-bold">{player.fantasy_points}</td>
                  <td className="text-center">{player.points_per_game}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllTimeStats;