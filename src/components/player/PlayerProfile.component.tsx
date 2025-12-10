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
import PowerSlider from './PowerSlider.component';
import StreakBar from './StreakBar.component';
import CompactGauge from './CompactGauge.component';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { 
  normalizePowerRatings, 
  normalizeStreaks, 
  decimalToNumber,
  formatStreakDates
} from '@/utils/powerRatingNormalization.util';
// React Query hooks for automatic deduplication and caching
import { usePlayerProfile } from '@/hooks/queries/usePlayerProfile.hook';
import { useLeagueAverages } from '@/hooks/queries/useLeagueAverages.hook';
import { usePlayerTrends } from '@/hooks/queries/usePlayerTrends.hook';
import { useAuth } from '@/hooks/useAuth.hook';

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
  power_rating_percentile: number | null;
  goal_threat_percentile: number | null;
  participation_percentile: number | null;
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
  profile_text?: string;
  profile_generated_at?: string;
  is_retired?: boolean;
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
  // Check auth state first to avoid race condition
  const { profile: authProfile, loading: authLoading } = useAuth();
  
  // React Query hooks - automatic deduplication and caching!
  const { data: profileData, isLoading: loading, error: profileError } = usePlayerProfile(id);
  const { data: leagueAverages = [] } = useLeagueAverages();
  const { data: trendData = null, isLoading: trendLoading } = usePlayerTrends(id);
  
  // Local state for UI only
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedStat, setSelectedStat] = useState<string>('PPG');
  const [isProfileExpanded, setIsProfileExpanded] = useState<boolean>(false);
  const [isMatchHistoryExpanded, setIsMatchHistoryExpanded] = useState<boolean>(false);
  
  // Transform profile data
  const profile = profileData || null;
  const error = profileError ? (profileError as Error).message : null;

  // Helper function to truncate profile text
  const truncateProfileText = (text: string, maxChars: number = 150): { truncated: string; needsTruncation: boolean } => {
    if (text.length <= maxChars) {
      return { truncated: text, needsTruncation: false };
    }
    
    // Find a good breaking point (end of sentence or word)
    const truncatedAt = text.lastIndexOf('.', maxChars);
    const fallbackAt = text.lastIndexOf(' ', maxChars);
    
    let breakPoint = maxChars;
    if (truncatedAt > maxChars * 0.7) {
      // If we found a sentence ending within 70% of max chars, use it
      breakPoint = truncatedAt + 1;
    } else if (fallbackAt > maxChars * 0.7) {
      // Otherwise use word boundary if within 70% of max chars
      breakPoint = fallbackAt;
    }
    
    return {
      truncated: text.substring(0, breakPoint).trim(),
      needsTruncation: true
    };
  };

  // Set initial selected year when profile loads
  useEffect(() => {
    if (profile?.yearly_stats && profile.yearly_stats.length > 0 && !selectedYear) {
      setSelectedYear(profile.yearly_stats[0].year);
    }
  }, [profile, selectedYear]);

  const statOptions: string[] = [
    'Games',
    'Goals',
    'MPG',
    'PPG'
  ];

  const yearlyPerformanceData: YearlyPerformanceData[] | undefined = profile?.yearly_stats?.map(year => {
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
  })?.reverse();

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

  // Wait for auth to load first to avoid race condition
  if (authLoading) {
    return (
      <div className="py-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white dark:bg-gray-950 shadow-soft-xl dark:shadow-soft-dark-xl rounded-2xl bg-clip-border">
          <div className="text-center">
            <h6 className="mb-2 text-lg">Loading authentication...</h6>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if we have a tenant context
  if (!authProfile.tenantId) {
    return (
      <div className="py-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white dark:bg-gray-950 shadow-soft-xl dark:shadow-soft-dark-xl rounded-2xl bg-clip-border">
          <div className="text-center text-red-500 p-6">
            <h6 className="mb-2 text-lg font-semibold">No Tenant Context</h6>
            <p className="text-sm">
              {authProfile.isSuperadmin 
                ? 'Please select a tenant using the dropdown in the header.'
                : 'Your account is not associated with a club. Please contact support.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white dark:bg-gray-950 shadow-soft-xl dark:shadow-soft-dark-xl rounded-2xl bg-clip-border">
          <div className="text-center">
            <h6 className="mb-2 text-lg">Loading player profile...</h6>
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
  const availableYearsForMatchPerformance = profile?.yearly_stats?.map(stat => stat.year).sort((a, b) => b - a) || [];

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
          {profile.is_retired ? (
            // Compact version for retired players - just name and club logo
            <div className="p-4 lg:p-6">
              {profile.name && (
                <div className="flex items-center justify-center">
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
                  <span className="ml-3 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    Retired
                  </span>
                </div>
              )}
            </div>
          ) : (
            // Full version for active players
            <>
              <div className="p-4 lg:p-6 pb-2">
                {/* Player Name and Club Logo */}
                {profile.name && (
                  <div className="flex items-center justify-center mb-4">
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
                )}
              </div>
              <div className="px-4 lg:px-6 pb-4 lg:pb-6">
                {trendLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                    </div>
                  </div>
                ) : trendData ? (
                  <>
                    {/* Compact Three-Column Gauge Layout */}
                  <div className="flex justify-center gap-6 sm:gap-10 lg:gap-14">
                    <CompactGauge 
                      percentage={trendData.power_rating_percentile ?? 0}
                          label="Power Rating"
                        />
                    <CompactGauge 
                      percentage={trendData.goal_threat_percentile ?? 0}
                          label="Goal Threat"
                        />
                    <CompactGauge 
                      percentage={trendData.participation_percentile ?? 0}
                          label="Participation"
                        />
                  </div>


                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No trend data available</p>
                    <p className="text-xs mt-1">Trend analysis requires match history</p>
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </div>

      {/* AI-Generated Player Bio */}
      {profile.profile_text && (
        <div className="w-full max-w-full px-3 mb-6">
          <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
            <div className="p-4 lg:p-6 pb-0">
              <h6 className="mb-3 lg:mb-4 text-base font-semibold leading-[26px]" style={{ color: '#344767' }}>Player Profile</h6>
            </div>
            <div className="p-4 lg:p-6 pt-0">
              <div className="prose prose-sm max-w-none" style={{ color: '#344767' }}>
                {(() => {
                  const { truncated, needsTruncation } = truncateProfileText(profile.profile_text);
                  
                  if (!needsTruncation) {
                    // Show full text if no truncation needed
                    return profile.profile_text.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="mb-3 text-sm leading-relaxed">
                        {paragraph}
                      </p>
                    ));
                  }
                  
                  if (isProfileExpanded) {
                    // Show full text with "Read less" button
                    return (
                      <>
                        {profile.profile_text.split('\n\n').map((paragraph, index) => (
                          <p key={index} className="mb-3 text-sm leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                        <button
                          onClick={() => setIsProfileExpanded(false)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded transition-colors duration-200"
                        >
                          Read less
                        </button>
                      </>
                    );
                  }
                  
                  // Show truncated text with inline "... Read more"
                  return (
                    <p className="mb-3 text-sm leading-relaxed">
                      {truncated}
                      <span className="text-gray-500">... </span>
                      <button
                        onClick={() => setIsProfileExpanded(true)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded transition-colors duration-200"
                      >
                        Read more
                      </button>
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Streaks Section - Compact Relative Bar Design */}
      <div className="w-full max-w-full px-3 mb-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="p-4 lg:p-6 pb-2">
            <h6 className="text-base font-semibold leading-[26px]" style={{ color: '#344767' }}>Streaks</h6>
          </div>
          <div className="px-4 lg:px-6 pb-4 lg:pb-6">
              {streaksNormalized && (
              <div className="space-y-1.5">
                {/* Positive Streaks */}
                <StreakBar
                    label="Attendance"
                    value={streaksNormalized.attendanceStreak.value}
                  maxValue={(profile.streak_records?.attendanceStreak as any)?.max || 80}
                  dates={formatStreakDates((profile as any).attendance_streak_dates, true) || undefined}
                    variant="positive"
                />
                <StreakBar
                    label="Unbeaten"
                    value={streaksNormalized.undefeatedStreak.value}
                  maxValue={(profile.streak_records?.undefeatedStreak as any)?.max || 20}
                  dates={formatStreakDates(profile.undefeated_streak_dates, true) || undefined}
                    variant="positive"
                />
                <StreakBar
                    label="Win"
                    value={streaksNormalized.winStreak.value}
                  maxValue={(profile.streak_records?.winStreak as any)?.max || 10}
                  dates={formatStreakDates(profile.win_streak_dates, true) || undefined}
                    variant="positive"
                />
                <StreakBar
                    label="Scoring"
                    value={streaksNormalized.scoringStreak.value}
                  maxValue={(profile.streak_records?.scoringStreak as any)?.max || 10}
                  dates={formatStreakDates((profile as any).scoring_streak_dates, true) || undefined}
                    variant="positive"
                />
                
                {/* Separator */}
                <div className="border-t border-slate-100 my-1" />
                
                {/* Negative Streaks */}
                <StreakBar
                    label="Losing"
                    value={streaksNormalized.losingStreak.value}
                  maxValue={(profile.streak_records?.losingStreak as any)?.max || 10}
                  dates={formatStreakDates(profile.losing_streak_dates, true) || undefined}
                    variant="negative"
                />
                <StreakBar
                    label="Winless"
                    value={streaksNormalized.winlessStreak.value}
                  maxValue={(profile.streak_records?.winlessStreak as any)?.max || 15}
                  dates={formatStreakDates(profile.winless_streak_dates, true) || undefined}
                    variant="negative"
                  />
              </div>
              )}
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



      {/* Teammate Chemistry Scatter Plot */}
      <div className="w-full max-w-full px-3 mb-6 mt-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="p-4 lg:p-6 pb-0">
            <h6 className="mb-2 text-base font-semibold leading-[26px]" style={{ color: '#344767' }}>Teammate Chemistry</h6>
          </div>
          <div className="flex-auto px-2 pb-4 lg:px-4">
            {(teammateScatterData.best.length > 0 || teammateScatterData.worst.length > 0 || teammateScatterData.regular.length > 0) ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      type="number" 
                      dataKey="games" 
                      name="Games Together"
                      domain={[10, 'dataMax']}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      label={{ value: 'Games Together', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fontSize: '10px', fill: '#64748b' } }}
                    />
                  <YAxis 
                    type="number" 
                    dataKey="performance" 
                    name="Performance"
                    domain={['dataMin', 'dataMax']}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    width={35}
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
            
            {/* Legend - compact single line */}
            {(teammateScatterData.best.length > 0 || teammateScatterData.worst.length > 0 || teammateScatterData.regular.length > 0) && (
              <div className="flex justify-center items-center gap-4 mt-2 text-xs text-slate-600">
                {teammateScatterData.best.length > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                    <span>Best</span>
                  </div>
                )}
                {teammateScatterData.worst.length > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                    <span>Worst</span>
                  </div>
                )}
                {teammateScatterData.regular.length > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full"></div>
                    <span>Regular</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Match History - Collapsible Section */}
      {id && availableYearsForMatchPerformance.length > 0 && (
        <div className="w-full max-w-full px-3 mb-6">
          <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
            {/* Collapsible Header */}
            <button
              onClick={() => setIsMatchHistoryExpanded(!isMatchHistoryExpanded)}
              className="w-full flex items-center justify-between p-4 lg:p-6 hover:bg-slate-50 transition-colors rounded-2xl focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <h6 className="text-base font-semibold leading-[26px]" style={{ color: '#344767' }}>
                  Full Match History
                </h6>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {availableYearsForMatchPerformance.length} {availableYearsForMatchPerformance.length === 1 ? 'year' : 'years'}
                </span>
              </div>
              {isMatchHistoryExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            
            {/* Collapsible Content */}
            {isMatchHistoryExpanded && (
              <div className="border-t border-slate-100">
          <MatchPerformance 
            playerId={id} 
            availableYears={availableYearsForMatchPerformance} 
          />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerProfile; 