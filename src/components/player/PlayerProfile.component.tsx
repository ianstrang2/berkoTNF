'use client';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, ReferenceLine, LabelList } from 'recharts';
import Card from '@/components/ui-kit/Card.component';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table.component';
import { CardHeader, CardTitle, CardContent } from '@/components/ui-kit/Card.component';
import StatsCard from '@/components/ui-kit/StatsCard.component';
import Chart from '@/components/ui-kit/Chart.component';
import NavPills from '@/components/ui-kit/NavPills.component';
import MatchPerformance from './MatchPerformance.component';
import PowerRatingGauge from './PowerRatingGauge.component';
import PowerSlider from './PowerSlider.component';
import { 
  normalizePowerRatings, 
  normalizeStreaks, 
  decimalToNumber 
} from '@/utils/powerRatingNormalization.util';

interface ClubInfo {
  id: string;
  name: string;
  league: string;
  search: string;
  country: string;
  filename: string;
}

interface YearlyStats {
  year: number;
  games_played: number;
  goals_scored: number;
  fantasy_points: number;
}

interface TeammateStat {
  player_id: number;
  name: string;
  games_played_with?: number;
  average_fantasy_points_with?: number;
}

interface TeammateChemistryStat {
  player_id: number;
  name: string;
  games_played_with: number;
  average_fantasy_points_with: number;
}

interface PowerRatings {
  trend_rating: number | null;
  trend_goal_threat: number | null;
  trend_participation: number | null;
  league_avg_goal_threat: number;
  league_avg_participation: number;
  updated_at: string | null;
}

interface LeagueNormalization {
  powerRating: { min: number; max: number; average: number };
  goalThreat: { min: number; max: number; average: number };
  participation: { min: number; max: number; average: number };
  winStreak: { min: number; max: number; average: number };
  undefeatedStreak: { min: number; max: number; average: number };
  losingStreak: { min: number; max: number; average: number };
  winlessStreak: { min: number; max: number; average: number };
  attendanceStreak: { min: number; max: number; average: number };
}

interface StreakRecords {
  winStreak: number;
  undefeatedStreak: number;
  losingStreak: number;
  winlessStreak: number;
  attendanceStreak: number;
  scoringStreak: number;
}

interface TrendData {
  current_metrics: {
    trend_rating: number | null;
    trend_goal_threat: number | null;
    trend_participation: number | null;
    league_avg_goal_threat: number;
    league_avg_participation: number;
  };
  current_percentiles: {
    power_rating: number | null;
    goal_threat: number | null;
    participation: number | null;
  };
  sparkline_data: Array<{
    period: string;
    start_date: string;
    end_date: string;
    power_rating: number;
    goal_threat: number;
    participation: number;
    power_rating_percentile: number;
    goal_threat_percentile: number;
    participation_percentile: number;
    games_played: number;
  }>;
  league_distribution: {
    power_rating: { p10: number; p90: number; avg: number };
    goal_threat: { p10: number; p90: number; avg: number };
    participation: { p10: number; p90: number; avg: number };
  };
  league_maximums: {
    power_rating: number;
    goal_threat: number;
    participation: number;
  };
  data_quality: {
    historical_blocks_count: number;
    sparkline_points: number;
    qualified_players_in_league: number;
  };
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
  selected_club?: any;
  yearly_stats: YearlyStats[];
  attendance_streak?: number;
  teammate_chemistry_all?: TeammateChemistryStat[];
  last_updated?: string;
  power_ratings?: PowerRatings | null;
  league_normalization?: LeagueNormalization;
  streak_records?: StreakRecords;
}

interface YearlyPerformanceData {
  year: string;
  games_played: number;
  goals_scored: number;
  minutes_per_goal: number;
  points_per_game: number;
  fantasy_points: number;
}

interface PlayerProfileProps {
  id?: number;
}

// Helper function to calculate percentiles for display
const calculatePercentile = (value: number, min: number, max: number): number => {
  if (max <= min) return 50; // Default to 50% if no range
  const percentile = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, percentile));
};

const PlayerProfile: React.FC<PlayerProfileProps> = ({ id }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedStat, setSelectedStat] = useState<string>('PPG');
  const [leagueAverages, setLeagueAverages] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [trendLoading, setTrendLoading] = useState<boolean>(false);

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
        if (data && data.success && data.data) {
          const profileData: ProfileData = {
            ...data.data,
            yearly_stats: data.data.yearly_stats || [],
          };
          setProfile(profileData);
          if (profileData.yearly_stats.length > 0) {
            setSelectedYear(profileData.yearly_stats[0].year);
          }
        } else {
          setProfile(null);
          throw new Error('Invalid data structure: profile not found in response');
        }
      } catch (err) {
        setError((err as Error).message);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  // Fetch league averages for reference lines
  useEffect(() => {
    const fetchLeagueAverages = async () => {
      try {
        const response = await fetch('/api/stats/league-averages');
        if (response.ok) {
          const data = await response.json();
          setLeagueAverages(data.averages || []);
        }
      } catch (err) {
        // League averages fetch failed - not critical
        setLeagueAverages([]);
      }
    };

    fetchLeagueAverages();
  }, []);

  // Fetch trend data for 6-month block analysis
  useEffect(() => {
    const fetchTrendData = async () => {
      if (!id) {
        return;
      }
      
      setTrendLoading(true);
      try {
        const response = await fetch(`/api/player/trends/${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTrendData(data.data);
          }
        }
      } catch (err) {
        // Fail silently for trends - not critical for profile display
      } finally {
        setTrendLoading(false);
      }
    };

    fetchTrendData();
  }, [id]);

  const statOptions: string[] = [
    'Games',
    'Goals',
    'MPG',
    'PPG'
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

  // Process power ratings and streaks if available
  const powerRatingsNormalized = profile?.power_ratings && profile?.league_normalization ? 
    normalizePowerRatings(
      decimalToNumber(profile.power_ratings.trend_rating),
      decimalToNumber(profile.power_ratings.trend_goal_threat),
      decimalToNumber(profile.power_ratings.trend_participation),
      {
        rating: profile.league_normalization.powerRating,
        goalThreat: profile.league_normalization.goalThreat,
        participation: profile.league_normalization.participation
      }
    ) : null;

  const streaksNormalized = profile?.league_normalization ? 
    normalizeStreaks(
      {
        winStreak: profile.win_streak || 0,
        winStreakDates: profile.win_streak_dates,
        undefeatedStreak: profile.undefeated_streak || 0,
        undefeatedStreakDates: profile.undefeated_streak_dates,
        losingStreak: profile.losing_streak || 0,
        losingStreakDates: profile.losing_streak_dates,
        winlessStreak: profile.winless_streak || 0,
        winlessStreakDates: profile.winless_streak_dates,
        attendanceStreak: profile.attendance_streak || 0,
        attendanceStreakDates: (profile as any).attendance_streak_dates,
        scoringStreak: (profile as any).scoring_streak || 0,
        scoringStreakDates: (profile as any).scoring_streak_dates
      },
      {
        winStreak: profile.league_normalization.winStreak,
        undefeatedStreak: profile.league_normalization.undefeatedStreak,
        losingStreak: profile.league_normalization.losingStreak,
        winlessStreak: profile.league_normalization.winlessStreak,
        attendanceStreak: profile.league_normalization.attendanceStreak
      },
      profile.streak_records
    ) : null;

  // Helper function to create tooltip text for streaks
  const createStreakTooltip = (playerValue: number, allTimeRecord: number | undefined) => {
    return `Player Streak: ${playerValue}\nAll-Time Record: ${allTimeRecord || 'N/A'}`;
  };

  // Process teammate chemistry scatter plot data
  const teammateScatterData = React.useMemo(() => {
    if (!profile?.teammate_chemistry_all || !Array.isArray(profile.teammate_chemistry_all) || profile.teammate_chemistry_all.length === 0) {
      return { best: [], worst: [], regular: [] };
    }

    // All teammates with 10+ games, sorted by performance (already sorted by SQL)
    const allTeammates = profile.teammate_chemistry_all.map(tm => ({
      name: tm.name,
      games: tm.games_played_with,
      performance: tm.average_fantasy_points_with,
      player_id: tm.player_id
    }));

    // Identify top 5 and bottom 5 by performance
    const totalCount = allTeammates.length;
    const top5Count = Math.min(5, totalCount);
    const bottom5Count = Math.min(5, totalCount);

    const bestChemistry = allTeammates.slice(0, top5Count);
    const worstChemistry = allTeammates.slice(-bottom5Count);
    
    // Regular (purple) dots - everyone else not in top/bottom 5
    const regularChemistry = totalCount > 10 
      ? allTeammates.slice(top5Count, totalCount - bottom5Count)
      : []; // If 10 or fewer teammates, only show best/worst

    return { 
      best: bestChemistry,
      worst: worstChemistry, 
      regular: regularChemistry 
    };
  }, [profile]);

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

  // Parse clubInfo
  let clubInfo: ClubInfo | null = null;
  if (profile.selected_club) {
    if (typeof profile.selected_club === 'object' && profile.selected_club !== null) {
      clubInfo = {
        id: profile.selected_club.id || '',
        name: profile.selected_club.name || 'Unknown Club',
        league: profile.selected_club.league || '',
        search: profile.selected_club.search || '',
        country: profile.selected_club.country || '',
        filename: profile.selected_club.filename || ''
      };
    } else if (typeof profile.selected_club === 'string') {
      try {
        const parsedClub = JSON.parse(profile.selected_club);
        clubInfo = {
          id: parsedClub.id || '',
          name: parsedClub.name || 'Unknown Club',
          league: parsedClub.league || '',
          search: parsedClub.search || '',
          country: parsedClub.country || '',
          filename: parsedClub.filename || ''
        };
      } catch (e) {
        // Failed to parse club data - use fallback
      }
    }
  }

  // Extract years for the MatchPerformance component
  const availableYearsForMatchPerformance = profile.yearly_stats.map(stat => stat.year).sort((a, b) => b - a);

  return (
    <div className="flex flex-wrap -mx-3">
      {/* COMMENTED OUT - Legacy Components */}
      {/* Player Name and Club Logo */}
      {/* {profile.name && (
        <div className="w-full max-w-full px-3 mb-6">
          <div className="mx-auto">
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
                {profile.name}
              </h2>
            </div>
          </div>
        </div>
      )} */}

      {/* COMMENTED OUT - Legacy Power Rating Section */}
      {/* <div className="w-full max-w-full px-3 mb-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="p-4 lg:p-6">
            <div className="flex justify-center items-center mb-6">
              <PowerRatingGauge 
                rating={powerRatingsNormalized?.rating || 50}
                size="lg"
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              <PowerSlider
                label="Goal Threat"
                value={profile.power_ratings?.goal_threat || 0}
                percentage={powerRatingsNormalized?.goalThreat || 50}
                leagueAverage={powerRatingsNormalized ? 50 : undefined}
                variant="neutral"
                hasVariance={powerRatingsNormalized?.hasVariance.goalThreat !== false}
                showPercentage={true}
                showValue={false}
              />
              
              <PowerSlider
                label="Participation"
                value={profile.power_ratings?.trend_participation || 0}
                percentage={powerRatingsNormalized?.participation || 50}
                leagueAverage={powerRatingsNormalized ? 50 : undefined}
                variant="neutral"
                hasVariance={powerRatingsNormalized?.hasVariance.participation !== false}
                showPercentage={true}
                showValue={false}
              />
            </div>
          </div>
        </div>
      </div> */}

      {/* NEW: Player Profile with Trend Analysis */}
      <div className="w-full max-w-full px-3 mb-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="p-4 lg:p-6 pb-0">
            {/* Player Name and Club Logo */}
            {profile.name && (
              <div className="flex items-center justify-center mb-10">
                {clubInfo && clubInfo.filename && (
                  <img
                    src={`/club-logos/${clubInfo.filename}`}
                    alt={clubInfo.name ? `${clubInfo.name} logo` : 'Club logo'}
                    className="h-12 w-12 mr-4"
                    style={{ objectFit: 'contain' }}
                  />
                )}
                <h2 className="text-2xl font-semibold text-slate-700 font-sans">
                  {profile.name}
                </h2>
              </div>
            )}
          </div>
          <div className="p-4 lg:p-6 pt-0">
            {trendLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                </div>
              </div>
            ) : trendData ? (
              <>
                <div className="grid grid-cols-3 gap-1 sm:gap-3 lg:gap-6 mb-0 px-2 sm:px-0">
                {/* Power Rating */}
                <div className="flex flex-col items-center">
                  <div className="scale-75 sm:scale-90 lg:scale-100 transform">
                    <PowerRatingGauge 
                      rating={trendData.current_percentiles.power_rating ?? 0}
                      size="md"
                      label="Power Rating"
                    />
                  </div>
                </div>

                {/* Goal Threat */}
                <div className="flex flex-col items-center">
                  <div className="scale-75 sm:scale-90 lg:scale-100 transform">
                    <PowerRatingGauge 
                      rating={trendData.current_percentiles.goal_threat ?? 0}
                      size="md"
                      label="Goal Threat"
                    />
                  </div>
                </div>

                {/* Participation */}
                <div className="flex flex-col items-center">
                  <div className="scale-75 sm:scale-90 lg:scale-100 transform">
                    <PowerRatingGauge 
                      rating={trendData.current_percentiles.participation ?? 0}
                      size="md"
                      label="Participation"
                    />
                  </div>
                </div>
              </div>

              {/* Trend Sparklines Section */}
              {trendData && trendData.sparkline_data && trendData.sparkline_data.length > 0 && (
                <div className="grid grid-cols-3 gap-1 sm:gap-3 lg:gap-6 mt-3 px-2 sm:px-0">
                  {/* Power Rating Sparkline */}
                  <div className="flex flex-col items-center">
                    <div className="scale-75 sm:scale-90 lg:scale-100 transform w-full flex justify-center">
                      <div className="w-[160px] h-[60px] border border-gray-200 rounded bg-gray-50">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData.sparkline_data} margin={{ top: 10, right: 5, left: 5, bottom: 10 }}>
                            <Line 
                              type="monotone" 
                              dataKey="power_rating_percentile" 
                              stroke="#6B48FF" 
                              strokeWidth={2}
                              dot={{ fill: '#6B48FF', strokeWidth: 2, r: 2 }}
                              activeDot={{ r: 4, fill: '#A880FF' }}
                            />
                            <YAxis domain={[0, 100]} hide />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white p-1.5 border rounded shadow-sm text-xs" style={{ fontSize: '10px !important', lineHeight: '1.2' }}>
                                      <p className="font-medium text-xs" style={{ fontSize: '10px !important' }}>{data.period}</p>
                                      <p className="text-xs" style={{ fontSize: '10px !important' }}>Rating: {data.power_rating_percentile}%</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Goal Threat Sparkline */}
                  <div className="flex flex-col items-center">
                    <div className="scale-75 sm:scale-90 lg:scale-100 transform w-full flex justify-center">
                      <div className="w-[160px] h-[60px] border border-gray-200 rounded bg-gray-50">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData.sparkline_data} margin={{ top: 10, right: 5, left: 5, bottom: 10 }}>
                            <Line 
                              type="monotone" 
                              dataKey="goal_threat_percentile" 
                              stroke="#6B48FF" 
                              strokeWidth={2}
                              dot={{ fill: '#6B48FF', strokeWidth: 2, r: 2 }}
                              activeDot={{ r: 4, fill: '#A880FF' }}
                            />
                            <YAxis domain={[0, 100]} hide />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white p-1.5 border rounded shadow-sm text-xs" style={{ fontSize: '10px !important', lineHeight: '1.2' }}>
                                      <p className="font-medium text-xs" style={{ fontSize: '10px !important' }}>{data.period}</p>
                                      <p className="text-xs" style={{ fontSize: '10px !important' }}>Threat: {data.goal_threat_percentile}%</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Participation Sparkline */}
                  <div className="flex flex-col items-center">
                    <div className="scale-75 sm:scale-90 lg:scale-100 transform w-full flex justify-center">
                      <div className="w-[160px] h-[60px] border border-gray-200 rounded bg-gray-50">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData.sparkline_data} margin={{ top: 10, right: 5, left: 5, bottom: 10 }}>
                            <Line 
                              type="monotone" 
                              dataKey="participation_percentile" 
                              stroke="#6B48FF" 
                              strokeWidth={2}
                              dot={{ fill: '#6B48FF', strokeWidth: 2, r: 2 }}
                              activeDot={{ r: 4, fill: '#A880FF' }}
                            />
                            <YAxis domain={[0, 100]} hide />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white p-1.5 border rounded shadow-sm text-xs" style={{ fontSize: '10px !important', lineHeight: '1.2' }}>
                                      <p className="font-medium text-xs" style={{ fontSize: '10px !important' }}>{data.period}</p>
                                      <p className="text-xs" style={{ fontSize: '10px !important' }}>Participation: {data.participation_percentile}%</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No trend data available</p>
                <p className="text-xs mt-1">Trend analysis requires match history</p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* NEW: Streaks Section */}
      <div className="w-full max-w-full px-3 mb-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="p-4 lg:p-6 pb-0">
            <h6 className="mb-3 lg:mb-4 text-base font-semibold leading-[26px]" style={{ color: '#344767' }}>Streaks</h6>
          </div>
          <div className="p-4 lg:p-6 pt-0">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {streaksNormalized && (
                <>
                  <PowerSlider
                    label="Attendance"
                    value={streaksNormalized.attendanceStreak.value}
                    percentage={streaksNormalized.attendanceStreak.percentage}
                    contextText={streaksNormalized.attendanceStreak.dates || 'No dates available'}
                    variant="positive"
                    hasVariance={streaksNormalized.attendanceStreak.hasVariance}
                    showPercentage={false}
                    showValue={true}
                    showTooltip={true}
                    tooltipText={createStreakTooltip(
                      streaksNormalized.attendanceStreak.value,
                      (profile.streak_records?.attendanceStreak as any)?.max
                    )}
                  />
                  
                  <PowerSlider
                    label="Unbeaten"
                    value={streaksNormalized.undefeatedStreak.value}
                    percentage={streaksNormalized.undefeatedStreak.percentage}
                    contextText={streaksNormalized.undefeatedStreak.dates}
                    variant="positive"
                    hasVariance={streaksNormalized.undefeatedStreak.hasVariance}
                    showPercentage={false}
                    showValue={true}
                    showTooltip={true}
                    tooltipText={createStreakTooltip(
                      streaksNormalized.undefeatedStreak.value,
                      (profile.streak_records?.undefeatedStreak as any)?.max
                    )}
                  />
                  
                  <PowerSlider
                    label="Win"
                    value={streaksNormalized.winStreak.value}
                    percentage={streaksNormalized.winStreak.percentage}
                    contextText={streaksNormalized.winStreak.dates}
                    variant="positive"
                    hasVariance={streaksNormalized.winStreak.hasVariance}
                    showPercentage={false}
                    showValue={true}
                    showTooltip={true}
                    tooltipText={createStreakTooltip(
                      streaksNormalized.winStreak.value,
                      (profile.streak_records?.winStreak as any)?.max
                    )}
                  />
                  
                  <PowerSlider
                    label="Scoring"
                    value={streaksNormalized.scoringStreak.value}
                    percentage={streaksNormalized.scoringStreak.percentage}
                    contextText={streaksNormalized.scoringStreak.dates || 'Current streak'}
                    variant="positive"
                    hasVariance={streaksNormalized.scoringStreak.hasVariance}
                    showPercentage={false}
                    showValue={true}
                    showTooltip={true}
                    tooltipText={createStreakTooltip(
                      streaksNormalized.scoringStreak.value,
                      (profile.streak_records?.scoringStreak as any)?.max
                    )}
                  />

                  <PowerSlider
                    label="Losing"
                    value={streaksNormalized.losingStreak.value}
                    percentage={streaksNormalized.losingStreak.percentage}
                    contextText={streaksNormalized.losingStreak.dates}
                    variant="negative"
                    hasVariance={streaksNormalized.losingStreak.hasVariance}
                    showPercentage={false}
                    showValue={true}
                    showTooltip={true}
                    tooltipText={createStreakTooltip(
                      streaksNormalized.losingStreak.value,
                      (profile.streak_records?.losingStreak as any)?.max
                    )}
                  />

                  <PowerSlider
                    label="Winless"
                    value={streaksNormalized.winlessStreak.value}
                    percentage={streaksNormalized.winlessStreak.percentage}
                    contextText={streaksNormalized.winlessStreak.dates}
                    variant="negative"
                    hasVariance={streaksNormalized.winlessStreak.hasVariance}
                    showPercentage={false}
                    showValue={true}
                    showTooltip={true}
                    tooltipText={createStreakTooltip(
                      streaksNormalized.winlessStreak.value,
                      (profile.streak_records?.winlessStreak as any)?.max
                    )}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="w-full max-w-full px-3">
        <div className="relative z-20 flex flex-col min-w-0 break-words bg-white border-0 border-solid dark:bg-gray-950 border-black-125 shadow-soft-xl dark:shadow-soft-dark-xl rounded-2xl bg-clip-border">
          <div className="p-6 pb-0">
            <h6 className="mb-4 text-base font-semibold leading-[26px]" style={{ color: '#344767' }}>Performance Overview</h6>
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
                'performance data'
              } over time
            </p>
            <div className="h-[250px] sm:h-[300px] md:h-[350px]">
              {yearlyPerformanceData && yearlyPerformanceData.length > 0 ? (
              <Chart
                title=""
                data={yearlyPerformanceData || []}
                  type={selectedStat === 'Games' || selectedStat === 'Goals' ? 'bar' : 'line'}
                dataKey={
                  selectedStat === 'Games' ? 'games_played' : 
                  selectedStat === 'Goals' ? 'goals_scored' : 
                  selectedStat === 'MPG' ? 'minutes_per_goal' : 
                  selectedStat === 'PPG' ? 'points_per_game' : 
                    'points_per_game'
                }
                gradient={{ from: 'purple-700', to: 'pink-500' }}
                reverseYAxis={selectedStat === 'MPG'}
                  leagueAverages={leagueAverages}
                  selectedMetric={selectedStat}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <p className="text-lg mb-2">No performance history</p>
                    <p className="text-sm">Performance data will appear after playing matches</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* NEW: Teammate Chemistry Scatter Plot */}
      <div className="w-full max-w-full px-3 mb-6 mt-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="p-6 pb-0">
            <h6 className="mb-4 text-base font-semibold leading-[26px]" style={{ color: '#344767' }}>Teammate Chemistry</h6>
          </div>
          <div className="flex-auto p-6 pt-0">
            {(teammateScatterData.best.length > 0 || teammateScatterData.worst.length > 0 || teammateScatterData.regular.length > 0) ? (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis 
                      type="number" 
                      dataKey="games" 
                      name="Games Together"
                      domain={[10, 'dataMax']}
                      className="text-sm"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      label={{ value: 'Games Played Together', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fontSize: '12px', fill: '#64748b' } }}
                    />
                  <YAxis 
                    type="number" 
                    dataKey="performance" 
                    name="Performance"
                    domain={['dataMin', 'dataMax']}
                    className="text-sm"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    label={{ value: 'Avg Fantasy Points Together', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '12px', fill: '#64748b' } }}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-semibold text-slate-700">{data.name}</p>
                            <p className="text-sm text-slate-600">
                              {data.games} games together
                            </p>
                            <p className="text-sm text-slate-600">
                              {data.performance?.toFixed(1)} avg fantasy points
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Player Average Reference Line */}
                  <ReferenceLine 
                    y={profile ? profile.fantasy_points / (profile.games_played || 1) : 0} 
                    stroke="#9ca3af" 
                    strokeDasharray="5 5" 
                    strokeWidth={1}
                    label={{ value: "Avg", position: "insideTopRight", style: { fontSize: '12px', fill: '#64748b' } }}
                  />
                  
                  {/* Best Chemistry - Green dots */}
                  {teammateScatterData.best.length > 0 && (
                    <Scatter 
                      name="Best Chemistry" 
                      data={teammateScatterData.best} 
                      fill="#10b981"
                      strokeWidth={2}
                      stroke="#059669"
                    />
                  )}
                  
                  {/* Worst Chemistry - Red dots */}
                  {teammateScatterData.worst.length > 0 && (
                    <Scatter 
                      name="Worst Chemistry" 
                      data={teammateScatterData.worst} 
                      fill="#ef4444"
                      strokeWidth={2}
                      stroke="#dc2626"
                    />
                  )}
                  
                  {/* Regular Chemistry - Purple dots */}
                  {teammateScatterData.regular.length > 0 && (
                    <Scatter 
                      name="Regular Chemistry" 
                      data={teammateScatterData.regular} 
                      fill="#8b5cf6"
                      strokeWidth={2}
                      stroke="#7c3aed"
                    />
                  )}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No teammate chemistry data available</p>
                <p className="text-sm">Requires at least 10 games played together</p>
              </div>
            )}
            
            {/* Legend */}
            {(teammateScatterData.best.length > 0 || teammateScatterData.worst.length > 0 || teammateScatterData.regular.length > 0) && (
              <div className="flex justify-center mt-4 space-x-6 text-sm">
                {teammateScatterData.best.length > 0 && (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2 border border-green-600"></div>
                    <span>Best Chemistry</span>
                  </div>
                )}
                {teammateScatterData.worst.length > 0 && (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2 border border-red-600"></div>
                    <span>Worst Chemistry</span>
                  </div>
                )}
                {teammateScatterData.regular.length > 0 && (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2 border border-purple-600"></div>
                    <span>Regular Chemistry</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Match Performance Dots - Keep As-Is */}
      {id && availableYearsForMatchPerformance.length > 0 && (
        <div className="w-full max-w-full px-3 mb-6">
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