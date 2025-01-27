'use client';
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Placeholder Card components
const Card = ({ children }) => <div className="border rounded-lg shadow-sm p-4">{children}</div>;
const CardHeader = ({ children }) => <div className="border-b pb-2 mb-4">{children}</div>;
const CardTitle = ({ children }) => <h2 className="text-xl font-semibold">{children}</h2>;
const CardContent = ({ children }) => <div className="mt-4">{children}</div>;

const PlayerProfile = ({ id }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedStat, setSelectedStat] = useState('Games Played'); // Default stat to display
  const [selectedPlayerId, setSelectedPlayerId] = useState(id); // Default to the passed player ID
  const [players, setPlayers] = useState([]); // State to hold the list of players

  // Fetch players, excluding ringers
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/players'); // Updated endpoint
        if (!response.ok) {
          throw new Error('Failed to fetch players');
        }
        const data = await response.json();
        setPlayers(data.data); // Set the players list
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    };

    fetchPlayers();
  }, []);

  // Fetch player profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/playerprofile?id=${selectedPlayerId}`); // Updated endpoint
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.statusText}`);
        }
        const data = await response.json();
        if (data && data.profile) {
          const profileData = {
            ...data.profile,
            yearly_stats: data.profile.yearly_stats || [], // Default to an empty array if yearly_stats is undefined
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

  // Helper function for streak colors
  const getStreakColor = (streak) => {
    if (streak >= 5) return 'text-green-600';
    if (streak >= 3) return 'text-green-500';
    if (streak >= 2) return 'text-yellow-500';
    return 'text-gray-600';
  };

  // Stat options for the dropdown
  const statOptions = [
    'Games Played',
    'Goals Scored',
    'Minutes Per Goal',
    'Points per Game',
    'Fantasy Points'
  ];

  // Prepare chart data based on the selected stat
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

  const selectedYearStats = profile?.yearly_stats.find(y => y.year === selectedYear) || {};

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!profile || !profile.yearly_stats) {
    return <div>No profile data found</div>;
  }

  if (!Array.isArray(profile.yearly_stats) || profile.yearly_stats.length === 0) {
    return <div>No yearly stats available</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Player Selection Dropdown */}
      <div className="flex items-center gap-4 mb-6">
        <label htmlFor="player-select" className="block text-sm font-medium text-gray-700">
          Select Player
        </label>
        <select
          id="player-select"
          value={selectedPlayerId}
          onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
          className="block w-48 px-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          {Array.isArray(players) && players.length > 0 ? (
            players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))
          ) : (
            <option value="">No players available</option>
          )}
        </select>
      </div>

      {/* Player Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>{profile.name}'s Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Games Played</h3>
              <p className="text-2xl">{profile.games_played}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Fantasy Points</h3>
              <p className="text-2xl">{profile.fantasy_points}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Most Goals in a Game</h3>
              <p className="text-2xl">{profile.most_goals}</p>
              <p className="text-sm text-gray-600">{profile.most_goals_date}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Longest Win Streak</h3>
              <p className={`text-2xl ${getStreakColor(profile.win_streak)}`}>
                {profile.win_streak} games
              </p>
              <p className="text-sm text-gray-600">{profile.win_streak_dates}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Longest Undefeated Streak</h3>
              <p className={`text-2xl ${getStreakColor(profile.undefeated_streak)}`}>
                {profile.undefeated_streak} games
              </p>
              <p className="text-sm text-gray-600">{profile.undefeated_streak_dates}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Over Time Card */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <label htmlFor="stat-select" className="block text-sm font-medium text-gray-700">
              Select Stat to Display
            </label>
            <select
              id="stat-select"
              value={selectedStat}
              onChange={(e) => setSelectedStat(e.target.value)}
              className="block w-48 px-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={selectedStat.toLowerCase().replace(/ /g, '_')} fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Yearly Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Yearly Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Games</TableHead>
                <TableHead className="text-right">Goals</TableHead>
                <TableHead className="text-right">Mins/Goal</TableHead>
                <TableHead className="text-right">Points/Game</TableHead>
                <TableHead className="text-right">Fantasy Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profile.yearly_stats.map((year) => {
                const minutesPerGoal = (year.games_played * 60) / (year.goals_scored || 1);
                const pointsPerGame = year.fantasy_points / (year.games_played || 1);

                return (
                  <TableRow
                    key={year.year}
                    className={selectedYear === year.year ? 'bg-gray-100' : ''}
                    onClick={() => setSelectedYear(year.year)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>{year.year}</TableCell>
                    <TableCell className="text-right">{year.games_played}</TableCell>
                    <TableCell className="text-right">{year.goals_scored}</TableCell>
                    <TableCell className="text-right">{minutesPerGoal.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{pointsPerGame.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{year.fantasy_points}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerProfile;