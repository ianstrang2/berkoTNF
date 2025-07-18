'use client';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, ReferenceLine } from 'recharts';
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

interface PowerRatings {
  rating: number;
  goal_threat: number;
  defensive_shield: number;
  updated_at: string;
}

interface LeagueNormalization {
  powerRating: { min: number; max: number; average: number };
  goalThreat: { min: number; max: number; average: number };
  defensiveShield: { min: number; max: number; average: number };
  streaks: {
    winStreak: { min: number; max: number; average: number };
    undefeatedStreak: { min: number; max: number; average: number };
    losingStreak: { min: number; max: number; average: number };
    winlessStreak: { min: number; max: number; average: number };
    attendanceStreak: { min: number; max: number; average: number };
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
  teammate_frequency_top5?: TeammateStat[];
  teammate_performance_high_top5?: TeammateStat[];
  teammate_performance_low_top5?: TeammateStat[];
  last_updated?: string;
  power_ratings?: PowerRatings | null;
  league_normalization?: LeagueNormalization;
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

const PlayerProfile: React.FC<PlayerProfileProps> = ({ id }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedStat, setSelectedStat] = useState<string>('PPG');
  const [leagueAverages, setLeagueAverages] = useState<any[]>([]);

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
        console.log("[PlayerProfile] API Response Data:", data);
        if (data && data.profile) {
          const profileData: ProfileData = {
            ...data.profile,
            yearly_stats: data.profile.yearly_stats || [],
          };
          console.log("[PlayerProfile] Processed Profile Data:", profileData);
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
        console.error('Error fetching league averages:', err);
        setLeagueAverages([]);
      }
    };

    fetchLeagueAverages();
  }, []);

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
      decimalToNumber(profile.power_ratings.rating),
      decimalToNumber(profile.power_ratings.goal_threat),
      decimalToNumber(profile.power_ratings.defensive_shield),
      {
        rating: profile.league_normalization.powerRating,
        goalThreat: profile.league_normalization.goalThreat,
        defensiveShield: profile.league_normalization.defensiveShield
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
        attendanceStreak: profile.attendance_streak || 0
      },
      profile.league_normalization.streaks
    ) : null;

  // Process teammate chemistry scatter plot data
  const teammateScatterData = React.useMemo(() => {
    if (!profile?.teammate_frequency_top5 || !profile?.teammate_performance_high_top5 || !profile?.teammate_performance_low_top5) {
      return { best: [], worst: [], frequent: [] };
    }

    // Create maps for easy lookup
    const frequencyMap = new Map();
    profile.teammate_frequency_top5.forEach(tm => {
      frequencyMap.set(tm.player_id, { name: tm.name, games: tm.games_played_with || 0 });
    });

    const bestChemistry: any[] = [];
    const worstChemistry: any[] = [];
    const mostFrequent: any[] = [];
    
    // Process high chemistry teammates (green dots)
    profile.teammate_performance_high_top5.forEach(tm => {
      if (tm.average_fantasy_points_with !== undefined) {
        const freqData = frequencyMap.get(tm.player_id);
        const games = freqData?.games || 5; // Default minimum if not found
        
        if (games >= 5) {
          bestChemistry.push({
            name: tm.name,
            games: games,
            performance: tm.average_fantasy_points_with,
            player_id: tm.player_id
          });
        }
      }
    });

    // Process low chemistry teammates (red dots)
    profile.teammate_performance_low_top5.forEach(tm => {
      if (tm.average_fantasy_points_with !== undefined) {
        const freqData = frequencyMap.get(tm.player_id);
        const games = freqData?.games || 5; // Default minimum if not found
        
        if (games >= 5) {
          worstChemistry.push({
            name: tm.name,
            games: games,
            performance: tm.average_fantasy_points_with,
            player_id: tm.player_id
          });
        }
      }
    });

    // Process most frequent teammates (blue dots) - only if not already in high/low
    profile.teammate_frequency_top5.forEach(tm => {
      if (tm.games_played_with && tm.games_played_with >= 5) {
        const alreadyInBest = bestChemistry.some(point => point.player_id === tm.player_id);
        const alreadyInWorst = worstChemistry.some(point => point.player_id === tm.player_id);
        
        if (!alreadyInBest && !alreadyInWorst) {
          // For frequent teammates without explicit performance data, assume neutral performance
          const avgPerformance = profile.fantasy_points / (profile.games_played || 1); // Use player's own average as baseline
          
          mostFrequent.push({
            name: tm.name,
            games: tm.games_played_with,
            performance: avgPerformance, // Use player's average as neutral baseline
            player_id: tm.player_id
          });
        }
      }
    });

    return { 
      best: bestChemistry,
      worst: worstChemistry, 
      frequent: mostFrequent 
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
        console.error("[PlayerProfile] Failed to parse selected_club JSON:", e);
      }
    }
  }

  // Extract years for the MatchPerformance component
  const availableYearsForMatchPerformance = profile.yearly_stats.map(stat => stat.year).sort((a, b) => b - a);

  return (
    <div className="flex flex-wrap -mx-3">
      {/* Player Name and Club Logo */}
      {profile.name && (
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
      )}

      {/* NEW: Power Rating Section */}
      <div className="w-full max-w-full px-3 mb-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Power Rating Gauge */}
              <div className="flex justify-center items-center">
                <PowerRatingGauge 
                  rating={powerRatingsNormalized?.rating || 50}
                  size="lg"
                />
              </div>
              
              {/* Right: Goal Threat and Defensive Shield Sliders */}
              <div className="space-y-4">
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
                  label="Defensive Shield"
                  value={profile.power_ratings?.defensive_shield || 0}
                  percentage={powerRatingsNormalized?.defensiveShield || 50}
                  leagueAverage={powerRatingsNormalized ? 50 : undefined}
                  variant="neutral"
                  hasVariance={powerRatingsNormalized?.hasVariance.defensiveShield !== false}
                  showPercentage={true}
                  showValue={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Streaks Section */}
      <div className="w-full max-w-full px-3 mb-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="p-6 pb-0">
            <h6 className="mb-4 text-lg font-semibold text-slate-700">Streaks</h6>
          </div>
          <div className="p-6 pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Positive Streaks */}
              <div className="space-y-4">
                {streaksNormalized && (
                  <>
                    <PowerSlider
                      label="Attendance"
                      value={streaksNormalized.attendanceStreak.value}
                      percentage={streaksNormalized.attendanceStreak.percentage}
                      leagueAverage={streaksNormalized.attendanceStreak.leagueAverage}
                      contextText={streaksNormalized.attendanceStreak.dates}
                      variant="positive"
                      hasVariance={streaksNormalized.attendanceStreak.hasVariance}
                      showPercentage={false}
                      showValue={true}
                    />
                    
                    <PowerSlider
                      label="Win"
                      value={streaksNormalized.winStreak.value}
                      percentage={streaksNormalized.winStreak.percentage}
                      leagueAverage={streaksNormalized.winStreak.leagueAverage}
                      contextText={streaksNormalized.winStreak.dates}
                      variant="positive"
                      hasVariance={streaksNormalized.winStreak.hasVariance}
                      showPercentage={false}
                      showValue={true}
                    />
                    
                    <PowerSlider
                      label="Unbeaten"
                      value={streaksNormalized.undefeatedStreak.value}
                      percentage={streaksNormalized.undefeatedStreak.percentage}
                      leagueAverage={streaksNormalized.undefeatedStreak.leagueAverage}
                      contextText={streaksNormalized.undefeatedStreak.dates}
                      variant="positive"
                      hasVariance={streaksNormalized.undefeatedStreak.hasVariance}
                      showPercentage={false}
                      showValue={true}
                    />
                  </>
                )}
              </div>
              
              {/* Negative Streaks */}
              <div className="space-y-4">
                {streaksNormalized && (
                  <>
                    <PowerSlider
                      label="Losing"
                      value={streaksNormalized.losingStreak.value}
                      percentage={streaksNormalized.losingStreak.percentage}
                      leagueAverage={streaksNormalized.losingStreak.leagueAverage}
                      contextText={streaksNormalized.losingStreak.dates}
                      variant="negative"
                      hasVariance={streaksNormalized.losingStreak.hasVariance}
                      showPercentage={false}
                      showValue={true}
                    />
                    
                    <PowerSlider
                      label="Winless"
                      value={streaksNormalized.winlessStreak.value}
                      percentage={streaksNormalized.winlessStreak.percentage}
                      leagueAverage={streaksNormalized.winlessStreak.leagueAverage}
                      contextText={streaksNormalized.winlessStreak.dates}
                      variant="negative"
                      hasVariance={streaksNormalized.winlessStreak.hasVariance}
                      showPercentage={false}
                      showValue={true}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="w-full max-w-full px-3">
        <div className="relative z-20 flex flex-col min-w-0 break-words bg-white border-0 border-solid dark:bg-gray-950 border-black-125 shadow-soft-xl dark:shadow-soft-dark-xl rounded-2xl bg-clip-border mx-auto">
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

      {/* Match Performance Dots - Keep As-Is */}
      {id && availableYearsForMatchPerformance.length > 0 && (
        <div className="w-full max-w-full px-3 mt-6">
          <div className="mx-auto">
            <MatchPerformance 
              playerId={id} 
              availableYears={availableYearsForMatchPerformance} 
            />
          </div>
        </div>
      )}

      {/* NEW: Teammate Chemistry Scatter Plot */}
      <div className="w-full max-w-full px-3 mt-6 mb-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="p-6 pb-0">
            <h6 className="mb-4 text-lg font-semibold text-slate-700">Teammate Chemistry (Min 5 games played)</h6>
          </div>
          <div className="p-6 pt-0">
            {(teammateScatterData.best.length > 0 || teammateScatterData.worst.length > 0 || teammateScatterData.frequent.length > 0) ? (
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      type="number" 
                      dataKey="games" 
                      name="Games Together"
                      domain={[5, 'dataMax']}
                      className="text-sm"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      label={{ value: 'Games Played Together', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fontSize: '12px', fill: '#64748b' } }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="performance" 
                      name="Performance"
                      domain={['dataMin - 2', 'dataMax + 2']}
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
                    
                    {/* League Average Reference Line */}
                    <ReferenceLine 
                      y={profile ? profile.fantasy_points / (profile.games_played || 1) : 0} 
                      stroke="#9ca3af" 
                      strokeDasharray="5 5" 
                      strokeWidth={1}
                      label={{ value: "Player Average", position: "insideTopRight" }}
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
                    
                    {/* Most Frequent - Blue dots */}
                    {teammateScatterData.frequent.length > 0 && (
                      <Scatter 
                        name="Most Frequent" 
                        data={teammateScatterData.frequent} 
                        fill="#3b82f6"
                        strokeWidth={2}
                        stroke="#2563eb"
                      />
                    )}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No teammate chemistry data available</p>
                <p className="text-sm">Requires at least 5 games played together</p>
              </div>
            )}
            
            {/* Legend */}
            {(teammateScatterData.best.length > 0 || teammateScatterData.worst.length > 0 || teammateScatterData.frequent.length > 0) && (
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
                {teammateScatterData.frequent.length > 0 && (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 border border-blue-600"></div>
                    <span>Most Frequent</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile; 