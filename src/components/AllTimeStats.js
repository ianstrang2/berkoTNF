'use client';
import React, { useState, useEffect } from 'react';
import styles from './AllTimeStats.module.css';

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
        <span className={styles.sortIndicator}>
          {sortConfig.direction === 'desc' ? '▼' : '▲'}
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return <div className={`${styles.arcadeContainer} text-center`}>
      <div className={styles.arcadeTitle}>Loading...</div>
    </div>;
  }

  return (
    <div className="p-4">
      <h2 className={styles.arcadeTitle}>All-Time Stats</h2>
      <div className={styles.arcadeContainer}>
        <div className="table-responsive">
          <table className={styles.arcadeTable}>
            <thead>
              <tr>
                <th onClick={() => sortData('name')} style={{ minWidth: '150px' }}>
                  Player {getSortIndicator('name')}
                </th>
                <th onClick={() => sortData('games_played')} style={{ width: '50px' }}>
                  P {getSortIndicator('games_played')}
                </th>
                <th onClick={() => sortData('wins')} style={{ width: '50px' }}>
                  W {getSortIndicator('wins')}
                </th>
                <th onClick={() => sortData('draws')} style={{ width: '50px' }}>
                  D {getSortIndicator('draws')}
                </th>
                <th onClick={() => sortData('losses')} style={{ width: '50px' }}>
                  L {getSortIndicator('losses')}
                </th>
                <th onClick={() => sortData('goals')} style={{ width: '60px' }}>
                  G {getSortIndicator('goals')}
                </th>
                <th onClick={() => sortData('win_percentage')} style={{ width: '70px' }}>
                  Win% {getSortIndicator('win_percentage')}
                </th>
                <th onClick={() => sortData('minutes_per_goal')} style={{ width: '70px' }}>
                  MPG {getSortIndicator('minutes_per_goal')}
                </th>
                <th onClick={() => sortData('heavy_wins')} style={{ width: '70px' }}>
                  HW {getSortIndicator('heavy_wins')}
                </th>
                <th onClick={() => sortData('heavy_win_percentage')} style={{ width: '70px' }}>
                  HW% {getSortIndicator('heavy_win_percentage')}
                </th>
                <th onClick={() => sortData('heavy_losses')} style={{ width: '70px' }}>
                  HL {getSortIndicator('heavy_losses')}
                </th>
                <th onClick={() => sortData('heavy_loss_percentage')} style={{ width: '70px' }}>
                  HL% {getSortIndicator('heavy_loss_percentage')}
                </th>
                <th onClick={() => sortData('clean_sheets')} style={{ width: '70px' }}>
                  CS {getSortIndicator('clean_sheets')}
                </th>
                <th onClick={() => sortData('clean_sheet_percentage')} style={{ width: '70px' }}>
                  CS% {getSortIndicator('clean_sheet_percentage')}
                </th>
                <th onClick={() => sortData('fantasy_points')} style={{ width: '70px' }}>
                  Pts {getSortIndicator('fantasy_points')}
                </th>
                <th onClick={() => sortData('points_per_game')} style={{ width: '70px' }}>
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
                  <tr key={index} className={isRetired ? styles.retired : ''}>
                    <td className={isRetired ? styles.retiredPlayerName : styles.playerName}>{player.name}</td>
                    <td className={player.games_played >= 200 ? styles.success : ''}>{player.games_played}</td>
                    <td>{wins}</td>
                    <td>{player.draws}</td>
                    <td>{losses}</td>
                    <td className={player.goals >= 100 ? styles.success : ''}>{player.goals}</td>
                    <td className={player.win_percentage >= 50 ? styles.success : ''}>{Math.round(player.win_percentage)}%</td>
                    <td className={player.minutes_per_goal <= 90 ? styles.success : ''}>{Math.round(player.minutes_per_goal)}</td>
                    <td>{heavyWins}</td>
                    <td className={player.heavy_win_percentage >= 20 ? styles.success : ''}>{Math.round(player.heavy_win_percentage)}%</td>
                    <td>{heavyLosses}</td>
                    <td className={player.heavy_loss_percentage >= 20 ? styles.danger : ''}>{Math.round(player.heavy_loss_percentage)}%</td>
                    <td>{cleanSheets}</td>
                    <td className={player.clean_sheet_percentage >= 7.5 ? styles.success : ''}>{Math.round(player.clean_sheet_percentage)}%</td>
                    <td className={styles.playerName}>{player.fantasy_points}</td>
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