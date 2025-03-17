'use client';
import React, { useState, useEffect } from 'react';

const AllTimeStats = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({
    key: 'fantasy_points',
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

  const sortData = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...stats].sort((a, b) => {
      if (a[key] === null || a[key] === undefined) return 1;
      if (b[key] === null || b[key] === undefined) return -1;
      
      if (key.includes('percentage')) {
        const valueA = parseFloat(a[key]);
        const valueB = parseFloat(b[key]);
        if (direction === 'asc') {
          return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        }
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
      
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
        <span className="ml-1 text-primary-600">
          {sortConfig.direction === 'desc' ? '▼' : '▲'}
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-primary-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-600">All-Time Stats</h2>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full table-base">
            <thead>
              <tr>
                <th onClick={() => sortData('name')} className="min-w-[150px] cursor-pointer hover:text-primary-600">
                  Player {getSortIndicator('name')}
                </th>
                <th onClick={() => sortData('games_played')} className="w-[50px] cursor-pointer hover:text-primary-600">
                  P {getSortIndicator('games_played')}
                </th>
                <th onClick={() => sortData('wins')} className="w-[50px] cursor-pointer hover:text-primary-600">
                  W {getSortIndicator('wins')}
                </th>
                <th onClick={() => sortData('draws')} className="w-[50px] cursor-pointer hover:text-primary-600">
                  D {getSortIndicator('draws')}
                </th>
                <th onClick={() => sortData('losses')} className="w-[50px] cursor-pointer hover:text-primary-600">
                  L {getSortIndicator('losses')}
                </th>
                <th onClick={() => sortData('goals')} className="w-[60px] cursor-pointer hover:text-primary-600">
                  G {getSortIndicator('goals')}
                </th>
                <th onClick={() => sortData('win_percentage')} className="w-[70px] cursor-pointer hover:text-primary-600">
                  Win% {getSortIndicator('win_percentage')}
                </th>
                <th onClick={() => sortData('minutes_per_goal')} className="w-[70px] cursor-pointer hover:text-primary-600">
                  MPG {getSortIndicator('minutes_per_goal')}
                </th>
                <th onClick={() => sortData('heavy_wins')} className="w-[70px] cursor-pointer hover:text-primary-600">
                  HW {getSortIndicator('heavy_wins')}
                </th>
                <th onClick={() => sortData('heavy_win_percentage')} className="w-[70px] cursor-pointer hover:text-primary-600">
                  HW% {getSortIndicator('heavy_win_percentage')}
                </th>
                <th onClick={() => sortData('heavy_losses')} className="w-[70px] cursor-pointer hover:text-primary-600">
                  HL {getSortIndicator('heavy_losses')}
                </th>
                <th onClick={() => sortData('heavy_loss_percentage')} className="w-[70px] cursor-pointer hover:text-primary-600">
                  HL% {getSortIndicator('heavy_loss_percentage')}
                </th>
                <th onClick={() => sortData('clean_sheets')} className="w-[70px] cursor-pointer hover:text-primary-600">
                  CS {getSortIndicator('clean_sheets')}
                </th>
                <th onClick={() => sortData('clean_sheet_percentage')} className="w-[70px] cursor-pointer hover:text-primary-600">
                  CS% {getSortIndicator('clean_sheet_percentage')}
                </th>
                <th onClick={() => sortData('fantasy_points')} className="w-[70px] cursor-pointer hover:text-primary-600">
                  Pts {getSortIndicator('fantasy_points')}
                </th>
                <th onClick={() => sortData('points_per_game')} className="w-[70px] cursor-pointer hover:text-primary-600">
                  PPG {getSortIndicator('points_per_game')}
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((player, index) => {
                const isRetired = player.is_retired;
                const wins = player.wins || 0;
                const losses = player.losses || 0;
                const heavyWins = player.heavy_wins || 0;
                const heavyLosses = player.heavy_losses || 0;
                const cleanSheets = player.clean_sheets || 0;

                return (
                  <tr key={index} className={isRetired ? 'text-neutral-400' : ''}>
                    <td className={`font-medium ${isRetired ? 'text-neutral-400' : 'text-primary-600'}`}>
                      {player.name}
                    </td>
                    <td className={player.games_played >= 200 ? 'text-success-600 font-medium' : ''}>
                      {player.games_played}
                    </td>
                    <td>{wins}</td>
                    <td>{player.draws}</td>
                    <td>{losses}</td>
                    <td className={player.goals >= 100 ? 'text-success-600 font-medium' : ''}>
                      {player.goals}
                    </td>
                    <td className={player.win_percentage >= 50 ? 'text-success-600 font-medium' : ''}>
                      {Math.round(player.win_percentage)}%
                    </td>
                    <td className={player.minutes_per_goal <= 90 ? 'text-success-600 font-medium' : ''}>
                      {Math.round(player.minutes_per_goal)}
                    </td>
                    <td>{heavyWins}</td>
                    <td className={player.heavy_win_percentage >= 20 ? 'text-success-600 font-medium' : ''}>
                      {Math.round(player.heavy_win_percentage)}%
                    </td>
                    <td>{heavyLosses}</td>
                    <td className={player.heavy_loss_percentage >= 20 ? 'text-error-600 font-medium' : ''}>
                      {Math.round(player.heavy_loss_percentage)}%
                    </td>
                    <td>{cleanSheets}</td>
                    <td className={player.clean_sheet_percentage >= 7.5 ? 'text-success-600 font-medium' : ''}>
                      {Math.round(player.clean_sheet_percentage)}%
                    </td>
                    <td className="font-medium text-primary-600">{player.fantasy_points}</td>
                    <td>{player.points_per_game}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AllTimeStats;