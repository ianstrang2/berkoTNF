'use client';
import React, { useState, useEffect } from 'react';

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
    <div>
      <h3 className="h4 mb-4">Points Leaderboard</h3>
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="bg-dark text-white">
            <tr>
              <th className="text-nowrap" style={{minWidth: '150px'}}>Player</th>
              <th className="text-center" style={{width: '50px'}}>P</th>
              <th className="text-center" style={{width: '50px'}}>W</th>
              <th className="text-center" style={{width: '50px'}}>D</th>
              <th className="text-center" style={{width: '50px'}}>L</th>
              <th className="text-center" style={{width: '70px'}}>Goals</th>
              <th className="text-center" style={{width: '80px'}}>Heavy W</th>
              <th className="text-center" style={{width: '80px'}}>Heavy L</th>
              <th className="text-center" style={{width: '100px'}}>Clean Sheet</th>
              <th className="text-center" style={{width: '80px'}}>Win %</th>
              <th className="text-center" style={{width: '70px'}}>Points</th>
              <th style={{width: '150px'}}>Last 5</th>
            </tr>
          </thead>
          <tbody>
            {stats.seasonStats.map((player, index) => {
              const form = stats.formData.find(f => f.name === player.name)?.last_5_games?.split(', ') || [];
              const losses = player.games_played - player.wins - player.draws;
              return (
                <tr key={index}>
                  <td className="fw-medium text-nowrap">{player.name}</td>
                  <td className="text-center">{player.games_played}</td>
                  <td className={`text-center bg-success bg-opacity-${player.wins >= 10 ? '100' : player.wins >= 7 ? '75' : player.wins >= 4 ? '50' : player.wins >= 1 ? '25' : '10'}`}>{player.wins}</td>
                  <td className="text-center">{player.draws}</td>
                  <td className={`text-center bg-danger bg-opacity-${losses >= 10 ? '100' : losses >= 7 ? '75' : losses >= 4 ? '50' : losses >= 1 ? '25' : '10'}`}>{losses}</td>
                  <td className="text-center">{player.goals}</td>
                  <td className={`text-center bg-success bg-opacity-${player.heavy_wins >= 5 ? '100' : player.heavy_wins >= 3 ? '75' : player.heavy_wins >= 1 ? '50' : '10'}`}>{player.heavy_wins}</td>
                  <td className={`text-center bg-danger bg-opacity-${player.heavy_losses >= 5 ? '100' : player.heavy_losses >= 3 ? '75' : player.heavy_losses >= 1 ? '50' : '10'}`}>{player.heavy_losses}</td>
                  <td className={`text-center bg-success bg-opacity-${player.clean_sheets >= 5 ? '100' : player.clean_sheets >= 3 ? '75' : player.clean_sheets >= 1 ? '50' : '10'}`}>{player.clean_sheets}</td>
                  <td className="text-center">{player.win_percentage}%</td>
                  <td className="text-center fw-bold">{player.fantasy_points}</td>
                  <td>
                    <div className="d-flex gap-1">
                      {form.map((result, i) => (
                        <span key={i} className={`d-inline-block rounded px-2 ${result.includes('W') ? 'bg-success' : result === 'D' ? 'bg-warning' : 'bg-danger'} text-white`}>
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
    <div>
      <h3 className="h4 mb-4">Goalscoring Leaderboard</h3>
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="bg-dark text-white">
            <tr>
              <th className="text-nowrap" style={{minWidth: '150px'}}>Player</th>
              <th className="text-center" style={{width: '80px'}}>Goals</th>
              <th className="text-center" style={{width: '80px'}}>MPG</th>
              <th className="text-center" style={{width: '200px'}}>Last 5</th>
            </tr>
          </thead>
          <tbody>
            {stats.goalStats.map((player, index) => (
              <tr key={index}>
                <td className="fw-medium text-nowrap">{player.name}</td>
                <td className="text-center">{player.total_goals}</td>
                <td className={`text-center ${player.minutes_per_goal <= 60 ? 'bg-success' : player.minutes_per_goal <= 90 ? 'bg-success bg-opacity-75' : player.minutes_per_goal <= 120 ? 'bg-success bg-opacity-50' : ''}`}>{player.minutes_per_goal}</td>
                <td>
                  <div className="d-flex gap-1">
                    {player.last_five_games?.split(',').map((goals, i) => {
                      const goalCount = parseInt(goals);
                      const maxGoals = Math.max(...stats.goalStats.map(p => p.max_goals_in_game));
                      return (
                        <span key={i} className={`d-inline-block rounded px-2 ${goalCount === 0 ? 'bg-secondary bg-opacity-25' : goalCount === maxGoals ? 'bg-warning' : goalCount === maxGoals - 1 ? 'bg-warning bg-opacity-75' : goalCount === maxGoals - 2 ? 'bg-warning bg-opacity-50' : 'bg-warning bg-opacity-25'} text-dark`}>{goals || ''}</span>
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
    return <div className="spinner-border" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>;
  }

  return (
    <div className="container-fluid p-4">
      <h2 className="h2 mb-4">
        Current Half-Season Performance - {getCurrentHalf().description}
      </h2>

      {/* Desktop view */}
      <div className="d-none d-md-flex gap-4">
        <div className="flex-grow-1">{renderMainStats()}</div>
        <div className="flex-grow-1">{renderGoalStats()}</div>
      </div>

      {/* Mobile view */}
      <div className="d-md-none">
        <ul className="nav nav-tabs mb-3" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              Points
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'goals' ? 'active' : ''}`}
              onClick={() => setActiveTab('goals')}
            >
              Goals
            </button>
          </li>
        </ul>
        <div className="tab-content">
          <div className={`tab-pane fade ${activeTab === 'performance' ? 'show active' : ''}`}>
            {renderMainStats()}
          </div>
          <div className={`tab-pane fade ${activeTab === 'goals' ? 'show active' : ''}`}>
            {renderGoalStats()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrentHalfSeason;