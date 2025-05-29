'use client';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Card from '@/components/ui-kit/Card.component';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table.component';
import { CardHeader, CardTitle, CardContent } from '@/components/ui-kit/Card.component';
import StatsCard from '@/components/ui-kit/StatsCard.component';
import Chart from '@/components/ui-kit/Chart.component';
import NavPills from '@/components/ui-kit/NavPills.component';
import MatchPerformance from './MatchPerformance.component';

interface ClubInfo {
  id: string;
  name: string;
  league: string;
  search: string;
  country: string;
  filename: string;
}

interface PlayerProfileProps {
  id?: number;
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
  selected_club?: string;
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

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) {
        setProfile(null);
        setLoading(false);
        setError("No player ID provided.");
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/playerprofile?id=${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.statusText} for player ID ${id}`);
        }
        const data = await response.json();
        console.log("[PlayerProfile] API Response Data:", data); // DEBUG LOG
        if (data && data.profile) {
          const profileData: ProfileData = {
            ...data.profile,
            yearly_stats: data.profile.yearly_stats || [],
          };
          console.log("[PlayerProfile] Processed Profile Data:", profileData); // DEBUG LOG
          setProfile(profileData);
          if (profileData.yearly_stats.length > 0) {
            setSelectedYear(profileData.yearly_stats[0].year);
          }
        } else {
          setProfile(null);
          throw new Error('Invalid data structure: profile not found in response');
        }
      } catch (err) {
        console.error('[PlayerProfile] Error fetching profile:', err);
        setError((err as Error).message);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  const getStreakColor = (streak: number): string => {
    return 'text-neutral-900';
  };

  const statOptions: string[] = [
    'Games',
    'Goals',
    'MPG',
    'PPG',
    'Points'
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
    winless_streak_dates,
    yearly_stats,
    name,
    selected_club
  } = profile;

  // DEBUG LOG for profile in render phase
  // console.log("[PlayerProfile] Profile object in render:", profile);
  // console.log("[PlayerProfile] Selected Club String from profile:", selected_club);

  // Parse clubInfo
  let clubInfo: ClubInfo | null = null;
  if (selected_club) {
    if (typeof selected_club === 'object' && selected_club !== null) {
      clubInfo = selected_club as ClubInfo;
      console.log("[PlayerProfile] ClubInfo (already an object):", clubInfo);
    } else if (typeof selected_club === 'string') {
      // Fallback for safety, though logs indicate it's an object
      try {
        clubInfo = JSON.parse(selected_club);
        console.log("[PlayerProfile] Parsed ClubInfo (from string fallback):", clubInfo);
      } catch (e) {
        console.error("[PlayerProfile] Failed to parse selected_club JSON (from string fallback):", e);
      }
    } else {
      console.warn("[PlayerProfile] selected_club is not an object or a string:", selected_club);
    }
  } else {
    console.log("[PlayerProfile] selected_club is undefined, null, or empty in profile object."); // DEBUG LOG
  }

  // Extract years for the MatchPerformance component
  const availableYearsForMatchPerformance = yearly_stats.map(stat => stat.year).sort((a, b) => b - a);

  return (
    <div className="flex flex-wrap -mx-3">
      {/* Player Name and Club Logo */}
      {name && (
        <div className="w-full max-w-full px-3 mb-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="flex items-center">
              {clubInfo && clubInfo.filename && (
                <img
                  src={`/club-logos/${clubInfo.filename}`}
                  alt={clubInfo.name ? `${clubInfo.name} logo` : 'Club logo'}
                  className="h-10 w-10 mr-3"
                  style={{ objectFit: 'contain' }}
                />
              )}
              <h2 className="text-xl font-semibold text-slate-700 font-sans">
                {name}
              </h2>
            </div>
          </div>
        </div>
      )}
      {/* Stats Cards */}
      <div className="w-full max-w-full px-3 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[1000px] mx-auto">
          <div>
            <StatsCard
              title="Games"
              value={games_played}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
          </div>
          <div>
            <StatsCard
              title="Points"
              value={fantasy_points}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
          </div>
          <div>
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
          <div>
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
          <div>
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
          <div>
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
          <div>
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
          <div>
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
        <div className="relative z-20 flex flex-col min-w-0 max-w-[1000px] break-words bg-white border-0 border-solid dark:bg-gray-950 border-black-125 shadow-soft-xl dark:shadow-soft-dark-xl rounded-2xl bg-clip-border mx-auto">
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
              Showing {
                selectedStat === 'Games' ? 'games played' : 
                selectedStat === 'Goals' ? 'goals scored' : 
                selectedStat === 'MPG' ? 'minutes per goal' : 
                selectedStat === 'PPG' ? 'points per game' : 
                'fantasy points'
              } over time
            </p>
            <div className="h-[250px] sm:h-[300px] md:h-[350px]">
              <Chart
                title=""
                data={yearlyPerformanceData || []}
                type="line"
                dataKey={
                  selectedStat === 'Games' ? 'games_played' : 
                  selectedStat === 'Goals' ? 'goals_scored' : 
                  selectedStat === 'MPG' ? 'minutes_per_goal' : 
                  selectedStat === 'PPG' ? 'points_per_game' : 
                  'fantasy_points'
                }
                gradient={{ from: 'purple-700', to: 'pink-500' }}
                reverseYAxis={selectedStat === 'MPG'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add MatchPerformance component here */}
      {id && availableYearsForMatchPerformance.length > 0 && (
        <div className="w-full max-w-full px-3 mt-6">
          <MatchPerformance 
            playerId={id} 
            availableYears={availableYearsForMatchPerformance} 
          />
        </div>
      )}

    </div>
  );
};

export default PlayerProfile; 