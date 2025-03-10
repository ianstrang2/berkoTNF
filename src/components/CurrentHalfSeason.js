'use client';
import React, { useState, useEffect } from 'react';
import styles from './CurrentHalfSeason.module.css';

const CurrentHalfSeason = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    seasonStats: [],
    goalStats: [],
    formData: []
  });

  const [activeTab, setActiveTab] = useState("performance");

  const getCurrentHalf = () => {
    const now = new Date(new Date().setFullYear(new Date().getFullYear()));
    const year = now.getFullYear();
    const isFirstHalf = now.getMonth() < 6;

    return {
      year,
      half: isFirstHalf ? 1 : 2,
      startDate: isFirstHalf ? `${year}-01-01` : `${year}-07-01`,
      endDate: isFirstHalf ? `${year}-06-30` : `${year}-12-31`,
      description: `${isFirstHalf ? 'First' : 'Second'} Half ${year}`
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentPeriod = getCurrentHalf();
        console.log('Current period:', currentPeriod);

        const response = await fetch('/api/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: currentPeriod.startDate, endDate: currentPeriod.endDate })
        });

        console.log('API Response:', response.status);
        const result = await response.json();
        console.log('API Data:', result);

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
  }, []);

  const renderMainStats = () => (
    <div className={styles.arcadeContainer}>
      <h3 className={styles.arcadeTitle}>Points Leaderboard</h3>
      <div className="table-responsive">
        <table className={styles.arcadeTable}>
          <thead>
            <tr>
              <th style={{minWidth: '150px'}}>Player</th>
              <th style={{width: '50px'}}>P</th>
              <th style={{width: '50px'}}>W</th>
              <th style={{width: '50px'}}>D</th>
              <th style={{width: '50px'}}>L</th>
              <th style={{width: '70px'}}>Goals</th>
              <th style={{width: '80px'}}>Heavy W</th>
              <th style={{width: '80px'}}>Heavy L</th>
              <th style={{width: '100px'}}>Clean Sheet</th>
              <th style={{width: '80px'}}>Win %</th>
              <th style={{width: '70px'}}>Points</th>
              <th style={{width: '150px'}}>Last 5</th>
            </tr>
          </thead>
          <tbody>
            {stats.seasonStats.map((player, index) => {
              const form = stats.formData.find(f => f.name === player.name)?.last_5_games?.split(', ') || [];
              const losses = player.games_played - player.wins - player.draws;
              return (
                <tr key={index}>
                  <td className={styles.playerName}>{player.name}</td>
                  <td>{player.games_played}</td>
                  <td className={player.wins >= 7 ? styles.success : ''}>{player.wins}</td>
                  <td>{player.draws}</td>
                  <td className={losses >= 7 ? styles.danger : ''}>{losses}</td>
                  <td>{player.goals}</td>
                  <td className={player.heavy_wins >= 3 ? styles.success : ''}>{player.heavy_wins}</td>
                  <td className={player.heavy_losses >= 3 ? styles.danger : ''}>{player.heavy_losses}</td>
                  <td className={player.clean_sheets >= 3 ? styles.success : ''}>{player.clean_sheets}</td>
                  <td>{Math.round(player.win_percentage)}%</td>
                  <td className="fw-bold">{player.fantasy_points}</td>
                  <td>
                    <div className="d-flex gap-1">
                      {form.map((result, i) => (
                        <span key={i} className={`${result.includes('W') ? styles.success : result === 'D' ? styles.warning : styles.danger}`}>
                          {result.replace('H', '')}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGoalStats = () => (
    <div className={styles.arcadeContainer}>
      <h3 className={styles.arcadeTitle}>Goalscoring Leaderboard</h3>
      <div className="table-responsive">
        <table className={styles.arcadeTable}>
          <thead>
            <tr>
              <th style={{minWidth: '150px'}}>Player</th>
              <th style={{width: '80px'}}>Goals</th>
              <th style={{width: '80px'}}>MPG</th>
              <th style={{width: '200px'}}>Last 5</th>
            </tr>
          </thead>
          <tbody>
            {stats.goalStats.map((player, index) => (
              <tr key={index}>
                <td className={styles.playerName}>{player.name}</td>
                <td>{player.total_goals}</td>
                <td className={player.total_goals > 0 && player.minutes_per_goal <= 90 ? styles.success : ''}>
                  {player.minutes_per_goal}
                </td>
                <td>
                  <div className="d-flex gap-1">
                    {player.last_five_games?.split(',').map((goals, i) => {
                      const goalCount = parseInt(goals);
                      return (
                        <span key={i} className={goalCount > 0 ? styles.success : goals === '0' ? styles.danger : ''}>
                          {goals}
                        </span>
                      );
                    })}
                  </div>
                </td>
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
    <div className="w-full">
      <h2 className={styles.arcadeTitle}>
        Current Half-Season Performance - {getCurrentHalf().description}
      </h2>

      {/* Desktop view */}
      <div className="d-none d-md-flex gap-4">
        <div className="flex-grow-1">{renderMainStats()}</div>
        <div className="flex-grow-1">{renderGoalStats()}</div>
      </div>

      {/* Mobile view */}
      <div className="d-md-none w-full">
        <div className={styles.arcadeContainer}>
          <ul className="nav nav-tabs mb-3" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'performance' ? 'active' : ''} ${styles.arcadeButton}`}
                onClick={() => setActiveTab('performance')}
              >
                Points
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'goals' ? 'active' : ''} ${styles.arcadeButton}`}
                onClick={() => setActiveTab('goals')}
              >
                Goals
              </button>
            </li>
          </ul>
          <div className="tab-content w-full">
            <div className={`tab-pane fade ${activeTab === 'performance' ? 'show active' : ''} w-full`}>
              {renderMainStats()}
            </div>
            <div className={`tab-pane fade ${activeTab === 'goals' ? 'show active' : ''} w-full`}>
              {renderGoalStats()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrentHalfSeason;