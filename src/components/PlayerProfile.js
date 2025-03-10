'use client';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import styles from './PlayerProfile.module.css';

// Placeholder Card components
const Card = ({ children }) => <div className="border rounded-lg shadow-sm p-4">{children}</div>;
const CardHeader = ({ children }) => <div className="border-b pb-2 mb-4">{children}</div>;
const CardTitle = ({ children }) => <h2 className="text-xl font-semibold">{children}</h2>;
const CardContent = ({ children }) => <div className="mt-4">{children}</div>;

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
    if (streak >= 5) return styles.success;
    if (streak >= 3) return styles.warning;
    return '';
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
    return <div className={`${styles.arcadeContainer} text-center`}>
      <div className={styles.arcadeTitle}>Loading...</div>
    </div>;
  }

  if (error) {
    return <div className={`${styles.arcadeContainer} text-center`}>
      <div className={styles.danger}>{error}</div>
    </div>;
  }

  if (!profile || !profile.yearly_stats) {
    return <div className={`${styles.arcadeContainer} text-center`}>
      <div className={styles.warning}>No profile data found</div>
    </div>;
  }

  if (!Array.isArray(profile.yearly_stats) || profile.yearly_stats.length === 0) {
    return <div className={`${styles.arcadeContainer} text-center`}>
      <div className={styles.warning}>No yearly stats available</div>
    </div>;
  }

  return (
    <div className="p-4">
      {/* Player Selection Dropdown */}
      <div className={styles.arcadeContainer}>
        <div className="flex items-center gap-4 mb-6">
          <label htmlFor="player-select" className={styles.arcadeSubtitle}>
            Select Player
          </label>
          <select
            id="player-select"
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
            className={styles.arcadeSelect}
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
      <div className={styles.arcadeContainer}>
        <h2 className={styles.arcadeTitle}>{profile.name}'s Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className={styles.arcadeCard}>
            <h3 className={styles.arcadeSubtitle}>Games Played</h3>
            <p className={styles.arcadeValue}>{profile.games_played}</p>
          </div>
          <div className={styles.arcadeCard}>
            <h3 className={styles.arcadeSubtitle}>Fantasy Points</h3>
            <p className={styles.arcadeValue}>{profile.fantasy_points}</p>
          </div>
          <div className={styles.arcadeCard}>
            <h3 className={styles.arcadeSubtitle}>Most Goals in a Game</h3>
            <p className={styles.arcadeValue}>{profile.most_goals}</p>
            <p className={styles.arcadeDate}>{profile.most_goals_date}</p>
          </div>
          <div className={styles.arcadeCard}>
            <h3 className={styles.arcadeSubtitle}>Longest Win Streak</h3>
            <p className={`${styles.arcadeValue} ${getStreakColor(profile.win_streak)}`}>
              {profile.win_streak} games
            </p>
            <p className={styles.arcadeDate}>{profile.win_streak_dates}</p>
          </div>
          <div className={styles.arcadeCard}>
            <h3 className={styles.arcadeSubtitle}>Longest Undefeated Streak</h3>
            <p className={`${styles.arcadeValue} ${getStreakColor(profile.undefeated_streak)}`}>
              {profile.undefeated_streak} games
            </p>
            <p className={styles.arcadeDate}>{profile.undefeated_streak_dates}</p>
          </div>
        </div>
      </div>

      {/* Performance Over Time */}
      <div className={styles.arcadeContainer}>
        <h3 className={styles.arcadeTitle}>Performance Over Time</h3>
        <div className="flex items-center gap-4 mb-4">
          <label htmlFor="stat-select" className={styles.arcadeSubtitle}>
            Select Stat to Display
          </label>
          <select
            id="stat-select"
            value={selectedStat}
            onChange={(e) => setSelectedStat(e.target.value)}
            className={styles.arcadeSelect}
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 255, 0.2)" />
              <XAxis dataKey="year" stroke="#00ffff" />
              <YAxis stroke="#00ffff" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '2px solid #00ffff',
                  borderRadius: '4px',
                  color: '#00ffff'
                }}
              />
              <Legend wrapperStyle={{ color: '#00ffff' }} />
              <Bar
                dataKey={selectedStat.toLowerCase().replace(/ /g, '_')}
                fill="#ff00ff"
                stroke="#00ffff"
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Yearly Statistics */}
      <div className={styles.arcadeContainer}>
        <h3 className={styles.arcadeTitle}>Yearly Statistics</h3>
        <div className="table-responsive">
          <table className={styles.arcadeTable}>
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
              {profile.yearly_stats.map((year) => {
                const minutesPerGoal = (year.games_played * 60) / (year.goals_scored || 1);
                const pointsPerGame = year.fantasy_points / (year.games_played || 1);

                return (
                  <tr
                    key={year.year}
                    className={selectedYear === year.year ? styles.selectedRow : ''}
                    onClick={() => setSelectedYear(year.year)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{year.year}</td>
                    <td>{year.games_played}</td>
                    <td>{year.goals_scored}</td>
                    <td>{Math.round(minutesPerGoal)}</td>
                    <td>{pointsPerGame.toFixed(1)}</td>
                    <td>{year.fantasy_points}</td>
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

export default PlayerProfile;