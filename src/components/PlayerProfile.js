'use client';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const PlayerProfile = ({ id }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedStat, setSelectedStat] = useState('Games Played');
  const [selectedPlayerId, setSelectedPlayerId] = useState(id);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/admin/players');
        const data = await response.json();
        if (data.data) {
          const filteredPlayers = data.data.filter(player => !player.is_ringer);
          setPlayers(filteredPlayers);
        }
      } catch (error) {
        setError('Failed to fetch players');
      }
    };

    fetchPlayers();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/playerprofile?id=${selectedPlayerId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.statusText}`);
        }
        const data = await response.json();
        if (data && data.profile) {
          const profileData = {
            ...data.profile,
            yearly_stats: data.profile.yearly_stats || [],
          };
          setProfile(profileData);
          if (profileData.yearly_stats.length > 0) {
            setSelectedYear(profileData.yearly_stats[0].year);
          }
        } else {
          throw new Error('Invalid data structure: profile not found in response');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (selectedPlayerId) {
      fetchProfile();
    }
  }, [selectedPlayerId]);

  const getStreakColor = (streak) => {
    if (streak >= 5) return 'text-success-600';
    if (streak >= 3) return 'text-warning-600';
    return 'text-neutral-600';
  };

  const statOptions = [
    'Games Played',
    'Goals Scored',
    'Minutes Per Goal',
    'Points Per Game',
    'Fantasy Points'
  ];

  const yearlyPerformanceData = profile?.yearly_stats.map(year => {
    const minutesPerGoal = (year.games_played * 60) / (year.goals_scored || 1);
    const pointsPerGame = year.fantasy_points / (year.games_played || 1);

    return {
      year: year.year.toString(),
      games_played: year.games_played || 0,
      goals_scored: year.goals_scored || 0,
      minutes_per_goal: minutesPerGoal || 0,
      points_per_game: pointsPerGame || 0,
      fantasy_points: year.fantasy_points || 0
    };
  }).reverse();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-primary-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-error-600">{error}</div>
      </div>
    );
  }

  if (!profile || !profile.yearly_stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-warning-600">No profile data found</div>
      </div>
    );
  }

  if (!Array.isArray(profile.yearly_stats) || profile.yearly_stats.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-warning-600">No yearly stats available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Player Selection Dropdown */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-4">
          <label htmlFor="player-select" className="text-lg font-medium text-primary-600">
            Select Player
          </label>
          <select
            id="player-select"
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
            className="form-select rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
          >
            {Array.isArray(players) && players.length > 0 ? (
              players.map((player) => (
                <option key={player.player_id} value={player.player_id}>
                  {player.name}
                </option>
              ))
            ) : (
              <option value="">No players available</option>
            )}
          </select>
        </div>
      </div>

      {/* Player Profile Overview */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-center text-primary-600 mb-6">{profile.name}'s Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-primary-600 mb-2">Games Played</h3>
            <p className="text-2xl font-bold text-neutral-900">{profile.games_played}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-primary-600 mb-2">Fantasy Points</h3>
            <p className="text-2xl font-bold text-neutral-900">{profile.fantasy_points}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-primary-600 mb-2">Most Goals in a Game</h3>
            <p className="text-2xl font-bold text-neutral-900">{profile.most_goals}</p>
            <p className="text-sm text-neutral-600 mt-1">{profile.most_goals_date}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-primary-600 mb-2">Longest Win Streak</h3>
            <p className={`text-2xl font-bold ${getStreakColor(profile.win_streak)}`}>
              {profile.win_streak} games
            </p>
            <p className="text-sm text-neutral-600 mt-1">{profile.win_streak_dates}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-primary-600 mb-2">Longest Undefeated Streak</h3>
            <p className={`text-2xl font-bold ${getStreakColor(profile.undefeated_streak)}`}>
              {profile.undefeated_streak} games
            </p>
            <p className="text-sm text-neutral-600 mt-1">{profile.undefeated_streak_dates}</p>
          </div>
        </div>
      </div>

      {/* Performance Over Time */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-2xl font-bold text-center text-primary-600 mb-6">Performance Over Time</h3>
        <div className="flex items-center gap-4 mb-6">
          <label htmlFor="stat-select" className="text-lg font-medium text-primary-600">
            Select Stat to Display
          </label>
          <select
            id="stat-select"
            value={selectedStat}
            onChange={(e) => setSelectedStat(e.target.value)}
            className="form-select rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
          >
            {statOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={yearlyPerformanceData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
              <XAxis dataKey="year" stroke="#3B82F6" />
              <YAxis stroke="#3B82F6" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  color: '#111827'
                }}
              />
              <Legend wrapperStyle={{ color: '#3B82F6' }} />
              <Bar
                dataKey={selectedStat.toLowerCase().replace(/ /g, '_')}
                fill="#3B82F6"
                stroke="#2563EB"
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Yearly Statistics */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-2xl font-bold text-center text-primary-600 mb-6">Yearly Statistics</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-base">
            <thead>
              <tr>
                <th>Year</th>
                <th>Games</th>
                <th>Goals</th>
                <th>Mins/Goal</th>
                <th>Points/Game</th>
                <th>Fantasy Points</th>
              </tr>
            </thead>
            <tbody>
              {yearlyPerformanceData.map((year) => (
                <tr key={year.year}>
                  <td>{year.year}</td>
                  <td>{year.games_played}</td>
                  <td>{year.goals_scored}</td>
                  <td>{year.minutes_per_goal.toFixed(1)}</td>
                  <td>{year.points_per_game.toFixed(1)}</td>
                  <td>{year.fantasy_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;