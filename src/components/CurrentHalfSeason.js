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
              <th className="w-[100px]">Clean Sheet</th>
              <th className="w-[80px]">Win %</th>
              <th className="w-[70px]">Points</th>
              <th className="w-[150px]">Last 5</th>
            </tr>
          </thead>
          <tbody>
            {stats.seasonStats.map((player, index) => {
              const form = stats.formData.find(f => f.name === player.name)?.last_5_games?.split(', ') || [];
              const losses = player.games_played - player.wins - player.draws;
              return (
                <tr key={index}>
                  <td className="font-medium text-primary-600">{player.name}</td>
                  <td>{player.games_played}</td>
                  <td className={player.wins >= 7 ? 'text-success-600 font-medium' : ''}>
                    {player.wins}
                  </td>
                  <td>{player.draws}</td>
                  <td className={losses >= 7 ? 'text-error-600 font-medium' : ''}>
                    {losses}
                  </td>
                  <td>{player.goals}</td>
                  <td className={player.heavy_wins >= 3 ? 'text-success-600 font-medium' : ''}>
                    {player.heavy_wins}
                  </td>
                  <td className={player.heavy_losses >= 3 ? 'text-error-600 font-medium' : ''}>
                    {player.heavy_losses}
                  </td>
                  <td className={player.clean_sheets >= 3 ? 'text-success-600 font-medium' : ''}>
                    {player.clean_sheets}
                  </td>
                  <td>{Math.round(player.win_percentage)}%</td>
                  <td className="font-bold">{player.fantasy_points}</td>
                  <td>
                    <div className="flex gap-1">
                      {form.map((result, i) => (
                        <span 
                          key={i} 
                          className={`px-1.5 py-0.5 rounded text-sm font-medium ${
                            result.includes('W') 
                              ? 'bg-success-50 text-success-600' 
                              : result === 'D' 
                                ? 'bg-warning-50 text-warning-600' 
                                : 'bg-error-50 text-error-600'
                          }`}
                        >
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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-center text-primary-600 mb-6">Goalscoring Leaderboard</h3>
      <div className="overflow-x-auto">
        <table className="w-full table-base">
          <thead>
            <tr>
              <th className="min-w-[150px]">Player</th>
              <th className="w-[80px]">Goals</th>
              <th className="w-[80px]">MPG</th>
              <th className="w-[200px]">Last 5</th>
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
                <td>
                  <div className="flex gap-1">
                    {player.last_five_games?.split(',').map((goals, i) => {
                      const goalCount = parseInt(goals);
                      return (
                        <span 
                          key={i} 
                          className={`px-1.5 py-0.5 rounded text-sm font-medium ${
                            goalCount > 0 
                              ? 'bg-success-50 text-success-600' 
                              : goals === '0' 
                                ? 'bg-error-50 text-error-600' 
                                : ''
                          }`}
                        >
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
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-primary-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-600">
        Current Half-Season Performance - {getCurrentHalf().description}
      </h2>

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

export default CurrentHalfSeason;