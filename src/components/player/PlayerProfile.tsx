'use client';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Card from '@/components/ui-kit/Card';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table';

interface PlayerProfileProps {
  id?: number;
}

interface Player {
  player_id: number;
  name: string;
  is_ringer: boolean;
}

interface YearlyStats {
  year: number;
  games_played: number;
  goals_scored: number;
  fantasy_points: number;
}

interface ProfileData {
  name: string;
  games_played: number;
  fantasy_points: number;
  most_goals: number;
  most_goals_date: string;
  win_streak: number;
  win_streak_dates: string;
  undefeated_streak: number;
  undefeated_streak_dates: string;
  yearly_stats: YearlyStats[];
}

interface YearlyPerformanceData {
  year: string;
  games_played: number;
  goals_scored: number;
  minutes_per_goal: number;
  points_per_game: number;
  fantasy_points: number;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ id }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedStat, setSelectedStat] = useState<string>('Games Played');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | undefined>(id);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/admin/players');
        const data = await response.json();
        if (data.data) {
          const filteredPlayers = data.data.filter((player: Player) => !player.is_ringer);
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
          const profileData: ProfileData = {
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
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (selectedPlayerId) {
      fetchProfile();
    }
  }, [selectedPlayerId]);

  const getStreakColor = (streak: number): string => {
    return 'text-neutral-900';
  };

  const statOptions: string[] = [
    'Games Played',
    'Goals Scored',
    'Minutes Per Goal',
    'Points Per Game',
    'Fantasy Points'
  ];

  const yearlyPerformanceData: YearlyPerformanceData[] | undefined = profile?.yearly_stats.map(year => {
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
      <Card className="text-center">
        <div className="text-xl font-semibold text-primary-600 mb-element">Loading...</div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="text-center">
        <div className="text-xl font-semibold text-error-600">{error}</div>
      </Card>
    );
  }

  if (!profile || !profile.yearly_stats) {
    return (
      <Card className="text-center">
        <div className="text-xl font-semibold text-warning-600">No profile data found</div>
      </Card>
    );
  }

  if (!Array.isArray(profile.yearly_stats) || profile.yearly_stats.length === 0) {
    return (
      <Card className="text-center">
        <div className="text-xl font-semibold text-warning-600">No yearly stats available</div>
      </Card>
    );
  }

  return (
    <div className="space-y-section">
      {/* Player Selection Dropdown */}
      <Card>
        <div className="flex items-center gap-element">
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
      </Card>

      {/* Player Profile Overview */}
      <Card>
        <h2 className="text-2xl font-bold text-center text-primary-600 mb-section tracking-tight">{profile.name}'s Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-grid">
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="text-base font-medium text-primary-600 mb-related">Games Played</h3>
            <p className="text-2xl font-semibold text-neutral-900">{profile.games_played}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="text-base font-medium text-primary-600 mb-related">Fantasy Points</h3>
            <p className="text-2xl font-semibold text-neutral-900">{profile.fantasy_points}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="text-base font-medium text-primary-600 mb-related">Most Goals in a Game</h3>
            <p className="text-2xl font-semibold text-neutral-900">{profile.most_goals}</p>
            <p className="text-sm text-neutral-600 mt-related">{profile.most_goals_date}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="text-base font-medium text-primary-600 mb-related">Longest Win Streak</h3>
            <p className="text-2xl font-semibold text-neutral-900">
              {profile.win_streak} games
            </p>
            <p className="text-sm text-neutral-600 mt-related">{profile.win_streak_dates}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="text-base font-medium text-primary-600 mb-related">Longest Undefeated Streak</h3>
            <p className="text-2xl font-semibold text-neutral-900">
              {profile.undefeated_streak} games
            </p>
            <p className="text-sm text-neutral-600 mt-related">{profile.undefeated_streak_dates}</p>
          </div>
        </div>
      </Card>

      {/* Performance Over Time */}
      <Card>
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-section tracking-tight">Performance Over Time</h3>
        <div className="flex items-center gap-element mb-element">
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33, 150, 243, 0.2)" />
              <XAxis dataKey="year" stroke="#2196F3" />
              <YAxis stroke="#2196F3" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E0E0E0',
                  borderRadius: '0.375rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  color: '#212121'
                }}
              />
              <Legend wrapperStyle={{ color: '#2196F3' }} />
              <Bar
                dataKey={selectedStat.toLowerCase().replace(/ /g, '_')}
                fill="#2196F3"
                stroke="#1976D2"
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Yearly Statistics */}
      <Card>
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-section tracking-tight">Yearly Statistics</h3>
        <Table responsive>
          <TableHead>
            <TableRow>
              <TableCell isHeader className="w-20">Year</TableCell>
              <TableCell isHeader className="w-20">Games</TableCell>
              <TableCell isHeader className="w-20">Goals</TableCell>
              <TableCell isHeader className="w-20">Fantasy Points</TableCell>
              <TableCell isHeader className="w-20">Points Per Game</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {profile.yearly_stats.map((yearStat, index) => {
              const pointsPerGame = (yearStat.fantasy_points / (yearStat.games_played || 1)).toFixed(2);
              return (
                <TableRow key={index}>
                  <TableCell>{yearStat.year}</TableCell>
                  <TableCell>{yearStat.games_played}</TableCell>
                  <TableCell>{yearStat.goals_scored}</TableCell>
                  <TableCell>{yearStat.fantasy_points}</TableCell>
                  <TableCell>{pointsPerGame}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default PlayerProfile; 