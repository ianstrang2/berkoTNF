'use client';
import React, { useState, useEffect } from 'react';

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
    if (percentage > 0.8) return 'text-success-600';
    if (percentage > 0.6) return 'text-success-500';
    if (percentage > 0.4) return 'text-success-400';
    if (percentage > 0.2) return 'text-success-300';
    return 'text-success-200';
  };

  const getRedColor = (value, max) => {
    const percentage = value / max;
    if (percentage > 0.8) return 'text-error-600';
    if (percentage > 0.6) return 'text-error-500';
    if (percentage > 0.4) return 'text-error-400';
    if (percentage > 0.2) return 'text-error-300';
    return 'text-error-200';
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-6">Points Leaderboard</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-base">
            <thead>
              <tr>
                <th className="min-w-[150px]">Player</th>
                <th className="w-[50px]">P</th>
                <th className="w-[50px]">W</th>
                <th className="w-[50px]">D</th>
                <th className="w-[50px]">L</th>
                <th className="w-[70px]">Goals</th>
                <th className="w-[80px]">HW</th>
                <th className="w-[80px]">HL</th>
                <th className="w-[100px]">CS</th>
                <th className="w-[80px]">Win %</th>
                <th className="w-[70px]">Points</th>
              </tr>
            </thead>
            <tbody>
              {stats.seasonStats.map((player, index) => {
                const losses = player.games_played - player.wins - player.draws;
                
                return (
                  <tr key={index}>
                    <td className="font-medium text-primary-600">{player.name}</td>
                    <td>{player.games_played}</td>
                    <td className={player.wins > maxWins * 0.6 ? 'text-success-600 font-medium' : ''}>
                      {player.wins}
                    </td>
                    <td>{player.draws}</td>
                    <td className={losses > maxLosses * 0.6 ? 'text-error-600 font-medium' : ''}>
                      {losses}
                    </td>
                    <td className={player.goals >= 100 ? 'text-success-600 font-medium' : ''}>{player.goals}</td>
                    <td className={player.heavy_wins > maxHeavyWins * 0.6 ? 'text-success-600 font-medium' : ''}>
                      {player.heavy_wins}
                    </td>
                    <td className={player.heavy_losses > maxHeavyLosses * 0.6 ? 'text-error-600 font-medium' : ''}>
                      {player.heavy_losses}
                    </td>
                    <td className={player.clean_sheets > maxCleanSheets * 0.6 ? 'text-success-600 font-medium' : ''}>
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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-center text-primary-600 mb-6">Goalscoring Leaderboard</h3>
      <div className="overflow-x-auto">
        <table className="w-full table-base">
          <thead>
            <tr>
              <th className="min-w-[150px]">Player</th>
              <th className="w-[70px]">Goals</th>
              <th className="w-[70px]">MPG</th>
            </tr>
          </thead>
          <tbody>
            {stats.goalStats.map((player, index) => (
              <tr key={index}>
                <td className="font-medium text-primary-600">{player.name}</td>
                <td>{player.total_goals}</td>
                <td className={player.total_goals > 0 && player.minutes_per_goal <= 90 ? 'text-success-600 font-medium' : ''}>
                  {player.minutes_per_goal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-primary-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-2xl font-bold text-primary-600">Overall Season Performance</h2>
        <select 
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="form-select rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
        >
          {yearOptions.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Desktop view */}
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        {renderMainStats()}
        {renderGoalStats()}
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <div className="flex rounded-lg bg-neutral-100 p-1 mb-6">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'performance' 
                ? 'bg-white text-primary-600 shadow-sm' 
                : 'text-neutral-600 hover:text-primary-600'
            }`}
            onClick={() => setActiveTab('performance')}
          >
            Points
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'goals' 
                ? 'bg-white text-primary-600 shadow-sm' 
                : 'text-neutral-600 hover:text-primary-600'
            }`}
            onClick={() => setActiveTab('goals')}
          >
            Goals
          </button>
        </div>
        {activeTab === 'performance' ? renderMainStats() : renderGoalStats()}
      </div>
    </div>
  );
};

export default OverallSeasonPerformance;