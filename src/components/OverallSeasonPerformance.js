import React, { useState, useEffect } from 'react';
import styles from './OverallSeasonPerformance.module.css';

const OverallSeasonPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    seasonStats: [],
    goalStats: [],
    formData: []
  });
  const [selectedYear, setSelectedYear] = useState(2025);
  const [activeTab, setActiveTab] = useState("performance");
  const yearOptions = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011];

  const getGreenColor = (value, max) => {
    const percentage = value / max;
    if (percentage > 0.8) return 'bg-green-600';
    if (percentage > 0.6) return 'bg-green-500';
    if (percentage > 0.4) return 'bg-green-400';
    if (percentage > 0.2) return 'bg-green-300';
    return 'bg-green-200';
  };

  const getRedColor = (value, max) => {
    const percentage = value / max;
    if (percentage > 0.8) return 'bg-red-600';
    if (percentage > 0.6) return 'bg-red-500';
    if (percentage > 0.4) return 'bg-red-400';
    if (percentage > 0.2) return 'bg-red-300';
    return 'bg-red-200';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDate: `${selectedYear}-01-01`,
            endDate: `${selectedYear}-12-31`
          })
        });
        
        const result = await response.json();
        
        if (result.data) {
          setStats(result.data);
        } else {
          console.error('No data received from API');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  const renderMainStats = () => {
    const maxWins = Math.max(...stats.seasonStats.map(p => p.wins), 1);
    const maxHeavyWins = Math.max(...stats.seasonStats.map(p => p.heavy_wins), 1);
    const maxCleanSheets = Math.max(...stats.seasonStats.map(p => p.clean_sheets), 1);
    const maxLosses = Math.max(...stats.seasonStats.map(p => 
      p.games_played - p.wins - p.draws), 1);
    const maxHeavyLosses = Math.max(...stats.seasonStats.map(p => p.heavy_losses), 1);

    return (
      <div className={styles.arcadeContainer}>
        <h3 className={styles.arcadeTitle}>Points Leaderboard</h3>
        <div className="table-responsive">
          <table className={styles.arcadeTable}>
            <thead>
              <tr>
                <th style={{ minWidth: '150px' }}>Player</th>
                <th style={{ width: '50px' }}>P</th>
                <th style={{ width: '50px' }}>W</th>
                <th style={{ width: '50px' }}>D</th>
                <th style={{ width: '50px' }}>L</th>
                <th style={{ width: '70px' }}>Goals</th>
                <th style={{ width: '80px' }}>Heavy W</th>
                <th style={{ width: '80px' }}>Heavy L</th>
                <th style={{ width: '100px' }}>Clean Sheet</th>
                <th style={{ width: '80px' }}>Win %</th>
                <th style={{ width: '70px' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {stats.seasonStats.map((player, index) => {
                const losses = player.games_played - player.wins - player.draws;
                
                return (
                  <tr key={index}>
                    <td className={styles.playerName}>{player.name}</td>
                    <td>{player.games_played}</td>
                    <td className={player.wins > maxWins * 0.6 ? styles.success : ''}>
                      {player.wins}
                    </td>
                    <td>{player.draws}</td>
                    <td className={losses > maxLosses * 0.6 ? styles.danger : ''}>
                      {losses}
                    </td>
                    <td className={player.goals >= 100 ? styles.success : ''}>{player.goals}</td>
                    <td className={player.heavy_wins > maxHeavyWins * 0.6 ? styles.success : ''}>
                      {player.heavy_wins}
                    </td>
                    <td className={player.heavy_losses > maxHeavyLosses * 0.6 ? styles.danger : ''}>
                      {player.heavy_losses}
                    </td>
                    <td className={player.clean_sheets > maxCleanSheets * 0.6 ? styles.success : ''}>
                      {player.clean_sheets}
                    </td>
                    <td>{Math.round(player.win_percentage)}%</td>
                    <td>{player.fantasy_points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderGoalStats = () => (
    <div className={styles.arcadeContainer}>
      <h3 className={styles.arcadeTitle}>Goalscoring Leaderboard</h3>
      <div className="table-responsive">
        <table className={styles.arcadeTable}>
          <thead>
            <tr>
              <th style={{ minWidth: '150px' }}>Player</th>
              <th style={{ width: '70px' }}>Goals</th>
              <th style={{ width: '70px' }}>MPG</th>
            </tr>
          </thead>
          <tbody>
            {stats.goalStats.map((player, index) => (
              <tr key={index}>
                <td className={styles.playerName}>{player.name}</td>
                <td>{player.total_goals}</td>
                <td className={player.total_goals > 0 && player.minutes_per_goal <= 90 ? styles.success : ''}>{player.minutes_per_goal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return <div className={`${styles.arcadeContainer} text-center`}>
      <div className={styles.arcadeTitle}>Loading...</div>
    </div>;
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <h2 className={styles.arcadeTitle}>Overall Season Performance</h2>
        <select 
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className={styles.arcadeSelect}
        >
          {yearOptions.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Desktop view */}
      <div className="hidden md:flex gap-8">
        <div className="flex-1">{renderMainStats()}</div>
        <div className="flex-1">{renderGoalStats()}</div>
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <div className={styles.arcadeTabs}>
          <button
            className={`${styles.arcadeTab} ${activeTab === 'performance' ? styles.active : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Points
          </button>
          <button
            className={`${styles.arcadeTab} ${activeTab === 'goals' ? styles.active : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            Goals
          </button>
        </div>
        <div>
          {activeTab === 'performance' ? renderMainStats() : renderGoalStats()}
        </div>
      </div>
    </div>
  );
};

export default OverallSeasonPerformance;