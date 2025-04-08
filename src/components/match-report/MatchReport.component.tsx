'use client';
import React, { useState, useEffect } from 'react';
import { Button, Card } from '@/components/ui-kit';

interface MatchInfo {
  match_date: string;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string[];
  team_b_players: string[];
  team_a_scorers?: string;
  team_b_scorers?: string;
}

interface Milestone {
  name: string;
  games_played?: number;
  total_games?: number;
  total_goals?: number;
}

interface Streak {
  name: string;
  streak_count: number;
  streak_type: 'win' | 'loss' | 'unbeaten' | 'winless';
}

interface GoalStreak {
  name: string;
  matches_with_goals: number;
  goals_in_streak: number;
}

interface LeaderData {
  change_type: 'new_leader' | 'tied' | 'remains' | 'overtake';
  new_leader: string;
  previous_leader?: string;
  new_leader_goals?: number;
  new_leader_points?: number;
  previous_leader_goals?: number;
  previous_leader_points?: number;
}

interface TimelineItem {
  type: 'game_milestone' | 'goal_milestone' | 'form_streak' | 'goal_streak' | 'leader_change';
  player: string;
  content: string;
  subtext?: string;
  icon: 'trophy' | 'goal' | 'fire' | 'chart' | 'soccer' | 'crown';
  date?: string;
}

interface MatchReport {
  matchInfo: MatchInfo;
  gamesMilestones?: Milestone[];
  goalsMilestones?: Milestone[];
  streaks?: Streak[];
  goalStreaks?: GoalStreak[];
  halfSeasonGoalLeaders?: LeaderData[];
  halfSeasonFantasyLeaders?: LeaderData[];
  seasonGoalLeaders?: LeaderData[];
  seasonFantasyLeaders?: LeaderData[];
}

// Error Boundary Component
class MatchReportErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MatchReport Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="text-center">
          <div className="text-xl font-semibold text-error-600 mb-element">Something went wrong</div>
          <p className="text-neutral-600 mb-element">We're sorry, but there was an error loading the match report.</p>
          <Button
            onClick={() => window.location.reload()}
            variant="primary"
            size="sm"
          >
            Reload Page
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="space-y-section">
    <Card className="animate-pulse">
      <div className="h-8 bg-neutral-200 rounded w-3/4 mx-auto mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-grid">
        <div className="h-32 bg-neutral-200 rounded"></div>
        <div className="h-32 bg-neutral-200 rounded"></div>
      </div>
    </Card>
    <Card className="animate-pulse">
      <div className="h-8 bg-neutral-200 rounded w-1/2 mx-auto mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-grid">
        <div className="h-40 bg-neutral-200 rounded"></div>
        <div className="h-40 bg-neutral-200 rounded"></div>
      </div>
    </Card>
  </div>
);

const MatchReport: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<MatchReport | null>(null);
  const [showCopyToast, setShowCopyToast] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Helper function to get the correct ordinal suffix for numbers
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) {
      return num + "st";
    }
    if (j === 2 && k !== 12) {
      return num + "nd";
    }
    if (j === 3 && k !== 13) {
      return num + "rd";
    }
    return num + "th";
  };

  // Add this helper function after getOrdinalSuffix
  const formatDateSafely = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      // Use toLocaleDateString with explicit locale for consistency
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching match report...');
      
      const response = await fetch('/api/matchReport');
      console.log('Match report response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API error: ${response.status} - ${errorText || 'No details'}`);
      }
      
      const result = await response.json();
      console.log('Match report data received:', result);
      
      if (result.success) {
        setReport(result.data);
        setLastUpdated(new Date());
      } else {
        setError(new Error(result.error || 'Failed to fetch match report'));
      }
    } catch (error) {
      console.error('Error in fetchReport:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch match report'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const renderMatchInfo = () => {
    if (!report) return null;
    
    const { matchInfo } = report;
    return (
      <Card className="mt-section">
        <div className="flex flex-col items-center">
          <div className="text-2xl sm:text-3xl font-bold text-center mb-2 tracking-tight">
            Team A ({matchInfo.team_a_score}) - ({matchInfo.team_b_score}) Team B
          </div>
          <div className="text-center text-lg text-neutral-600 mb-section" suppressHydrationWarning>
            {formatDateSafely(matchInfo.match_date)}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-grid">
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="font-semibold text-lg text-primary-600 mb-element">Team A ({matchInfo.team_a_score})</div>
            <div className="text-sm text-neutral-700 leading-relaxed">
              {matchInfo.team_a_players.join(', ')}
            </div>
            {matchInfo.team_a_scorers && (
              <div className="text-sm text-primary-600 font-medium mt-element flex items-center">
                <span className="mr-related">⚽</span> {matchInfo.team_a_scorers}
              </div>
            )}
          </div>

          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="font-semibold text-lg text-primary-600 mb-element">Team B ({matchInfo.team_b_score})</div>
            <div className="text-sm text-neutral-700 leading-relaxed">
              {matchInfo.team_b_players.join(', ')}
            </div>
            {matchInfo.team_b_scorers && (
              <div className="text-sm text-primary-600 font-medium mt-element flex items-center">
                <span className="mr-related">⚽</span> {matchInfo.team_b_scorers}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderStatDeepDive = () => {
    if (!report) return null;
    
    // Get match date string
    const matchDate = report.matchInfo.match_date ? formatDateSafely(report.matchInfo.match_date) : '';
    
    // Create a unified timeline of all stats/achievements
    const timelineItems: TimelineItem[] = [];
    
    // Add game milestones to timeline
    if (report.gamesMilestones && report.gamesMilestones.length > 0) {
      report.gamesMilestones.forEach(milestone => {
        timelineItems.push({
          type: 'game_milestone',
          player: milestone.name,
          content: `Played ${getOrdinalSuffix(milestone.total_games || 0)} game`,
          icon: 'trophy',
          date: matchDate
        });
      });
    }
    
    // Add goal milestones to timeline
    if (report.goalsMilestones && report.goalsMilestones.length > 0) {
      report.goalsMilestones.forEach(milestone => {
        timelineItems.push({
          type: 'goal_milestone',
          player: milestone.name,
          content: `Scored ${getOrdinalSuffix(milestone.total_goals || 0)} goal`,
          icon: 'goal',
          date: matchDate
        });
      });
    }
    
    // Add form streaks to timeline
    if (report.streaks && report.streaks.length > 0) {
      report.streaks.forEach(streak => {
        const streakType = 
          streak.streak_type === 'win' ? 'winning' :
          streak.streak_type === 'loss' ? 'losing' :
          streak.streak_type === 'unbeaten' ? 'unbeaten' : 'winless';
        
        timelineItems.push({
          type: 'form_streak',
          player: streak.name,
          content: `${streak.streak_count} game ${streakType} streak`,
          icon: streak.streak_type === 'win' || streak.streak_type === 'unbeaten' ? 'fire' : 'chart',
          date: matchDate
        });
      });
    }
    
    // Add goal streaks to timeline
    if (report.goalStreaks && report.goalStreaks.length > 0) {
      report.goalStreaks.forEach(streak => {
        timelineItems.push({
          type: 'goal_streak',
          player: streak.name,
          content: `Scored in ${streak.matches_with_goals} consecutive matches`,
          subtext: `${streak.goals_in_streak} goals total`,
          icon: 'soccer',
          date: matchDate
        });
      });
    }
    
    // Add current leader changes
    if (report.halfSeasonGoalLeaders?.[0]) {
      const leaderData = report.halfSeasonGoalLeaders[0];
      timelineItems.push({
        type: 'leader_change',
        player: leaderData.new_leader,
        content: formatLeaderText(leaderData, 'goals', 'current Half-Season'),
        icon: 'crown',
        date: matchDate
      });
    }
    
    if (report.halfSeasonFantasyLeaders?.[0]) {
      const leaderData = report.halfSeasonFantasyLeaders[0];
      timelineItems.push({
        type: 'leader_change',
        player: leaderData.new_leader,
        content: formatLeaderText(leaderData, 'points', 'current Half-Season'),
        icon: 'crown',
        date: matchDate
      });
    }
    
    if (report.seasonGoalLeaders?.[0]) {
      const leaderData = report.seasonGoalLeaders[0];
      timelineItems.push({
        type: 'leader_change',
        player: leaderData.new_leader,
        content: formatLeaderText(leaderData, 'goals', new Date().getFullYear() + ' Season'),
        icon: 'crown',
        date: matchDate
      });
    }
    
    if (report.seasonFantasyLeaders?.[0]) {
      const leaderData = report.seasonFantasyLeaders[0];
      timelineItems.push({
        type: 'leader_change',
        player: leaderData.new_leader,
        content: formatLeaderText(leaderData, 'points', new Date().getFullYear() + ' Season'),
        icon: 'crown',
        date: matchDate
      });
    }
    
    // Only render if we have items
    if (timelineItems.length === 0) {
      return null;
    }
    
    // Render the timeline
    return (
      <Card className="mt-section">
        <div className="relative">
          {/* Timeline connector line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-neutral-200"></div>
          
          {/* Timeline items */}
          <div className="space-y-6">
            {timelineItems.map((item, index) => (
              <div key={`timeline-${index}`} className="flex items-start gap-4 relative">
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center z-10 ${
                  item.type === 'form_streak' && (item.icon === 'fire') ? 'bg-orange-100 text-orange-600' :
                  item.type === 'goal_streak' ? 'bg-blue-100 text-blue-600' :
                  item.type === 'game_milestone' ? 'bg-green-100 text-green-600' :
                  item.type === 'goal_milestone' ? 'bg-purple-100 text-purple-600' :
                  item.type === 'leader_change' ? 'bg-amber-100 text-amber-600' :
                  'bg-neutral-100 text-neutral-600'
                }`}>
                  {item.icon === 'trophy' && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  )}
                  {item.icon === 'goal' && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                  {item.icon === 'fire' && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                  )}
                  {item.icon === 'chart' && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  )}
                  {item.icon === 'soccer' && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
                    </svg>
                  )}
                  {item.icon === 'crown' && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-grow pt-2">
                  <h3 className="font-semibold text-neutral-800">{item.player}</h3>
                  <p className="text-neutral-700">{item.content}</p>
                  {item.subtext && (
                    <p className="text-sm text-neutral-500">{item.subtext}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  };
  
  const renderLeadershipText = (leaderData: LeaderData, metric: 'goals' | 'points', period: string) => {
    const { change_type, new_leader, previous_leader, new_leader_goals, new_leader_points, previous_leader_goals, previous_leader_points } = leaderData;
    const value = metric === 'goals' ? new_leader_goals : new_leader_points;
    const prevValue = metric === 'goals' ? previous_leader_goals : previous_leader_points;
    
    switch (change_type) {
      case 'new_leader':
        return (
          <p>{new_leader} <span className="font-semibold">leads</span> the {period} charts with {value} {metric}</p>
        );
      case 'tied':
        return (
          <p>{new_leader} <span className="font-semibold">tied</span> with {previous_leader} at {value} {metric}</p>
        );
      case 'remains':
        return (
          <p>{new_leader} <span className="font-semibold">remains top</span> with {value} {metric}</p>
        );
      case 'overtake':
        return (
          <p>{new_leader} <span className="font-semibold">overtook</span> {previous_leader} ({prevValue} {metric}) with {value} {metric}</p>
        );
      default:
        return null;
    }
  };

  const formatReportForCopy = () => {
    if (!report) return '';
    
    const { matchInfo, gamesMilestones, goalsMilestones, streaks, goalStreaks } = report;
    
    // Create sections array with type annotation
    const sections: string[] = [];
    
    // Basic match info
    sections.push(
      `Match Result - ${formatDateSafely(matchInfo.match_date)}\n` +
      `Team A ${matchInfo.team_a_score} - ${matchInfo.team_b_score} Team B\n\n` +
      `Team A: ${matchInfo.team_a_players.join(', ')}\n` +
      (matchInfo.team_a_scorers ? `Scorers: ${matchInfo.team_a_scorers}\n` : '') +
      `\nTeam B: ${matchInfo.team_b_players.join(', ')}\n` +
      (matchInfo.team_b_scorers ? `Scorers: ${matchInfo.team_b_scorers}\n` : '')
    );
    
    // Milestones
    if ((gamesMilestones && gamesMilestones.length > 0) || (goalsMilestones && goalsMilestones.length > 0)) {
      sections.push(
        `\nMilestones:\n` +
        (gamesMilestones?.map(m => `${m.name} played their ${getOrdinalSuffix(m.total_games || 0)} game`).join('\n') || '') +
        (gamesMilestones && gamesMilestones.length > 0 && goalsMilestones && goalsMilestones.length > 0 ? '\n' : '') +
        (goalsMilestones?.map(m => `${m.name} scored their ${getOrdinalSuffix(m.total_goals || 0)} goal`).join('\n') || '')
      );
    }
    
    // Form Streaks
    if (streaks && streaks.length > 0) {
      sections.push(
        `\nForm Streaks:\n` +
        streaks.map(s => `${s.name} is on a ${s.streak_count} game ${
          s.streak_type === 'win' ? 'winning' : 
          s.streak_type === 'loss' ? 'losing' : 
          s.streak_type === 'unbeaten' ? 'unbeaten' : 'winless'
        } streak`).join('\n')
      );
    }
    
    // Goal Streaks
    if (goalStreaks && goalStreaks.length > 0) {
      sections.push(
        `\nScoring Streaks:\n` +
        goalStreaks.map(s => `${s.name} has scored in ${s.matches_with_goals} consecutive matches (${s.goals_in_streak} goals total)`).join('\n')
      );
    }
    
    // Leaders
    const { halfSeasonGoalLeaders, halfSeasonFantasyLeaders, seasonGoalLeaders, seasonFantasyLeaders } = report;
    
    if (halfSeasonGoalLeaders?.[0] || halfSeasonFantasyLeaders?.[0] || seasonGoalLeaders?.[0] || seasonFantasyLeaders?.[0]) {
      const leadersSection: string[] = [];
      
      if (halfSeasonGoalLeaders?.[0] || halfSeasonFantasyLeaders?.[0]) {
        leadersSection.push('Current Leaders:');
        
        if (halfSeasonGoalLeaders?.[0]) {
          const leader = halfSeasonGoalLeaders[0];
          leadersSection.push(`Goals: ${formatLeaderText(leader, 'goals', 'current Half-Season')}`);
        }
        
        if (halfSeasonFantasyLeaders?.[0]) {
          const leader = halfSeasonFantasyLeaders[0];
          leadersSection.push(`Fantasy Points: ${formatLeaderText(leader, 'points', 'current Half-Season')}`);
        }
      }
      
      if (seasonGoalLeaders?.[0] || seasonFantasyLeaders?.[0]) {
        leadersSection.push('\nSeason Leaders:');
        
        if (seasonGoalLeaders?.[0]) {
          const leader = seasonGoalLeaders[0];
          leadersSection.push(`Goals: ${formatLeaderText(leader, 'goals', new Date().getFullYear() + ' Season')}`);
        }
        
        if (seasonFantasyLeaders?.[0]) {
          const leader = seasonFantasyLeaders[0];
          leadersSection.push(`Fantasy Points: ${formatLeaderText(leader, 'points', new Date().getFullYear() + ' Season')}`);
        }
      }
      
      sections.push(`\n${leadersSection.join('\n')}`);
    }
    
    return sections.join('\n');
  };
  
  // Helper function for formatting leader text in copy format
  const formatLeaderText = (leaderData: LeaderData, metric: 'goals' | 'points', period: string) => {
    const { change_type, new_leader, previous_leader, new_leader_goals, new_leader_points, previous_leader_goals, previous_leader_points } = leaderData;
    const value = metric === 'goals' ? new_leader_goals : new_leader_points;
    const prevValue = metric === 'goals' ? previous_leader_goals : previous_leader_points;
    
    switch (change_type) {
      case 'new_leader':
        return `${new_leader} leads the ${period} charts with ${value} ${metric}`;
      case 'tied':
        return `${new_leader} tied with ${previous_leader} at ${value} ${metric}`;
      case 'remains':
        return `${new_leader} remains top with ${value} ${metric}`;
      case 'overtake':
        return `${new_leader} overtook ${previous_leader} (${prevValue} ${metric}) with ${value} ${metric}`;
      default:
        return '';
    }
  };

  const handleCopyReport = async () => {
    const reportText = formatReportForCopy();
    
    try {
      await navigator.clipboard.writeText(reportText);
      setShowCopyToast(true);
      setTimeout(() => {
        setShowCopyToast(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy report:', err);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Card className="text-center">
        <div className="text-xl font-semibold text-error-600 mb-element">Error Loading Match Report</div>
        <p className="text-neutral-600 mb-element">{error.message}</p>
        <Button
          onClick={fetchReport}
          variant="primary"
          size="sm"
        >
          Try Again
        </Button>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="text-center">
        <div className="text-xl font-semibold text-error-600 mb-element">No match report found</div>
        <p className="text-neutral-600 mb-element">Please check back later for the latest match report.</p>
        <Button
          onClick={fetchReport}
          variant="secondary"
          size="sm"
        >
          Refresh
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-section relative">
      {/* Copy Toast */}
      {showCopyToast && (
        <div className="toast toast-success fixed bottom-4 right-4 px-4 py-2 rounded-lg z-50 shadow-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Copied to clipboard!</span>
          </div>
        </div>
      )}
      
      {/* Match Info */}
      {renderMatchInfo()}
      
      {/* Stat Deep Dive */}
      {renderStatDeepDive()}
      
      {/* Copy Report Button at the bottom */}
      <div className="flex justify-end mt-4">
        <Button
          onClick={handleCopyReport}
          variant="secondary"
          size="sm"
          className="text-sm"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        >
          Copy Report
        </Button>
      </div>
    </div>
  );
};

// Wrap the component with error boundary
const MatchReportWithErrorBoundary: React.FC = () => (
  <MatchReportErrorBoundary>
    <MatchReport />
  </MatchReportErrorBoundary>
);

export default MatchReportWithErrorBoundary; 