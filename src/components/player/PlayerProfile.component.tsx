'use client';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Card from '@/components/ui-kit/Card.component';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table.component';
import { CardHeader, CardTitle, CardContent } from '@/components/ui-kit/Card.component';
import StatsCard from '@/components/ui-kit/StatsCard.component';
import Chart from '@/components/ui-kit/Chart.component';
import NavPills from '@/components/ui-kit/NavPills.component';

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
  most_game_goals: number;
  most_game_goals_date: string;
  most_season_goals: number;
  most_season_goals_year: string;
  win_streak: number;
  win_streak_dates: string;
  losing_streak: number;
  losing_streak_dates: string;
  undefeated_streak: number;
  undefeated_streak_dates: string;
  winless_streak: number;
  winless_streak_dates: string;
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
      <div className="py-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white dark:bg-gray-950 shadow-soft-xl dark:shadow-soft-dark-xl rounded-2xl bg-clip-border">
          <div className="text-center">
            <h6 className="mb-2 text-lg">Loading...</h6>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white dark:bg-gray-950 shadow-soft-xl dark:shadow-soft-dark-xl rounded-2xl bg-clip-border">
          <div className="text-center text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (!profile || !profile.yearly_stats || !Array.isArray(profile.yearly_stats) || profile.yearly_stats.length === 0) {
    return (
      <div className="py-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white dark:bg-gray-950 shadow-soft-xl dark:shadow-soft-dark-xl rounded-2xl bg-clip-border">
          <div className="text-center">No profile data found</div>
        </div>
      </div>
    );
  }

  // Now we know profile is not null for the rest of the component
  const {
    games_played,
    fantasy_points,
    win_streak,
    win_streak_dates,
    most_game_goals,
    most_game_goals_date,
    most_season_goals,
    most_season_goals_year,
    losing_streak,
    losing_streak_dates,
    undefeated_streak,
    undefeated_streak_dates,
    winless_streak,
    winless_streak_dates
  } = profile;

  return (
    <div className="flex flex-wrap -mx-3">
      {/* Player Selection */}
      <div className="w-full max-w-full px-3 mb-6">
        <div className="flex justify-end">
          <div className="w-40 relative">
            <select
              id="player-select"
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
              className="block w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-sm shadow-soft-md rounded-lg font-medium py-2 px-3 text-gray-700 dark:text-white appearance-none focus:outline-none"
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
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-white">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="w-full max-w-full px-3 mb-6">
        <div className="flex flex-wrap gap-6 max-w-[1000px]">
          <div className="flex-[1_1_calc(50%-12px)]">
            <StatsCard
              title="Games Played"
              value={games_played}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
          </div>
          <div className="flex-[1_1_calc(50%-12px)]">
            <StatsCard
              title="Fantasy Points"
              value={fantasy_points}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
          </div>
          <div className="flex-[1_1_calc(50%-12px)]">
            <StatsCard
              title="Most Game Goals"
              value={most_game_goals}
              change={most_game_goals_date ? { value: most_game_goals_date, isPositive: true } : undefined}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                </svg>
              }
            />
          </div>
          <div className="flex-[1_1_calc(50%-12px)]">
            <StatsCard
              title="Most Season Goals"
              value={most_season_goals}
              change={most_season_goals_year ? { value: most_season_goals_year, isPositive: true } : undefined}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5M8 8v8m8-16l-8 4-8-4 8-4 8 4z" />
                </svg>
              }
            />
          </div>
          <div className="flex-[1_1_calc(50%-12px)]">
            <StatsCard
              title="Win Streak"
              value={win_streak}
              change={win_streak_dates ? { value: win_streak_dates, isPositive: true } : undefined}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              }
            />
          </div>
          <div className="flex-[1_1_calc(50%-12px)]">
            <StatsCard
              title="Undefeated Streak"
              value={undefeated_streak}
              change={undefeated_streak_dates ? { value: undefeated_streak_dates, isPositive: true } : undefined}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              }
            />
          </div>
          <div className="flex-[1_1_calc(50%-12px)]">
            <StatsCard
              title="Losing Streak"
              value={losing_streak}
              change={losing_streak_dates ? { value: losing_streak_dates, isPositive: false } : undefined}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              }
            />
          </div>
          <div className="flex-[1_1_calc(50%-12px)]">
            <StatsCard
              title="Winless Streak"
              value={winless_streak}
              change={winless_streak_dates ? { value: winless_streak_dates, isPositive: false } : undefined}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              }
            />
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="w-full max-w-full px-3">
        <div className="relative z-20 flex flex-col min-w-0 max-w-[1000px] break-words bg-white border-0 border-solid dark:bg-gray-950 border-black-125 shadow-soft-xl dark:shadow-soft-dark-xl rounded-2xl bg-clip-border">
          <div className="p-6 pb-0">
            <h6 className="dark:text-white mb-4">Performance Overview</h6>
            <NavPills
              className="mb-6"
              items={statOptions.map(stat => ({
                label: stat,
                value: stat
              }))}
              activeTab={selectedStat}
              onTabChange={(value) => setSelectedStat(value)}
            />
          </div>
          <div className="flex-auto p-6 pt-0">
            <p className="leading-normal text-sm mb-4 dark:text-white/60">
              Showing {selectedStat.toLowerCase()} over time
            </p>
            <div className="h-[350px]">
              <Chart
                title=""
                data={yearlyPerformanceData || []}
                type="line"
                dataKey={selectedStat.toLowerCase().replace(/\s+/g, '_')}
                gradient={{ from: 'purple-700', to: 'pink-500' }}
                reverseYAxis={selectedStat === 'Minutes Per Goal'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile; 