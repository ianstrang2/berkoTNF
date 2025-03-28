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

const MatchReport: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<MatchReport | null>(null);
  const [showCopyToast, setShowCopyToast] = useState<boolean>(false);

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

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch('/api/matchReport');
        const result = await response.json();
        
        if (result.success) {
          console.log('Match report data:', result.data);
          if (result.data.gamesMilestones) {
            console.log('Game milestones:', result.data.gamesMilestones);
          }
          setReport(result.data);
        } else {
          console.error('Failed to fetch match report:', result.error);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching match report:', error);
        setLoading(false);
      }
    };

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
          <div className="text-center text-lg text-neutral-600 mb-section">
            {new Date(matchInfo.match_date).toLocaleDateString()}
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
    
    return (
      <Card className="mt-section">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-grid">
          {/* Games & Goals Milestones */}
          {((report.gamesMilestones && report.gamesMilestones.length > 0) || 
            (report.goalsMilestones && report.goalsMilestones.length > 0)) && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="font-semibold text-lg text-primary-600 mb-element">
                Milestones
              </div>
              <div className="space-y-related">
                {report.gamesMilestones?.map((milestone, i) => {
                  console.log(`Milestone ${i}:`, milestone);
                  return (
                    <p key={`game-${i}`} className="text-sm text-neutral-700">
                      {milestone.name} played their <span className="font-semibold">
                        {getOrdinalSuffix(milestone.total_games || 0)}
                      </span> game
                    </p>
                  );
                })}
                {report.goalsMilestones?.map((milestone, i) => (
                  <p key={`goal-${i}`} className="text-sm text-neutral-700">
                    {milestone.name} scored their <span className="font-semibold">{getOrdinalSuffix(milestone.total_goals || 0)}</span> goal
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Streaks */}
          {report.streaks && report.streaks.length > 0 && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="font-semibold text-lg text-primary-600 mb-element">
                Form Streaks
              </div>
              <div className="space-y-related">
                {report.streaks.map((streak, i) => (
                  <p key={`streak-${i}`} className="text-sm text-neutral-700">
                    {streak.name} is on a <span className="font-semibold">{streak.streak_count} game</span> {
                      streak.streak_type === 'win' ? 'winning' :
                      streak.streak_type === 'loss' ? 'losing' :
                      streak.streak_type === 'unbeaten' ? 'unbeaten' : 'winless'
                    } streak
                  </p>
                ))}
              </div>
            </div>
          )}
          
          {/* Goal-scoring Streaks */}
          {report.goalStreaks && report.goalStreaks.length > 0 && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="font-semibold text-lg text-primary-600 mb-element">
                Scoring Streaks
              </div>
              <div className="space-y-related">
                {report.goalStreaks.map((streak, i) => (
                  <p key={`goal-streak-${i}`} className="text-sm text-neutral-700">
                    {streak.name} has scored in <span className="font-semibold">{streak.matches_with_goals} consecutive</span> matches 
                    <span className="text-sm text-neutral-500 ml-related">
                      ({streak.goals_in_streak} goals total)
                    </span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Half-Season Leaders */}
          {(report.halfSeasonGoalLeaders?.[0] || report.halfSeasonFantasyLeaders?.[0]) && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="font-semibold text-lg text-primary-600 mb-element">
                Current Leaders
              </div>
              <div className="space-y-element">
                {/* Half-Season Goal Leaders */}
                {report.halfSeasonGoalLeaders?.[0] && (
                  <div className="text-neutral-700">
                    <p className="font-medium text-neutral-800 mb-related text-sm">Goals</p>
                    <div className="text-sm">
                      {renderLeadershipText(report.halfSeasonGoalLeaders[0], 'goals', 'current Half-Season')}
                    </div>
                  </div>
                )}

                {/* Half-Season Fantasy Leaders */}
                {report.halfSeasonFantasyLeaders?.[0] && (
                  <div className="text-neutral-700 mt-element">
                    <p className="font-medium text-neutral-800 mb-related text-sm">Fantasy Points</p>
                    <div className="text-sm">
                      {renderLeadershipText(report.halfSeasonFantasyLeaders[0], 'points', 'current Half-Season')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Season Leaders */}
          {(report.seasonGoalLeaders?.[0] || report.seasonFantasyLeaders?.[0]) && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="font-semibold text-lg text-primary-600 mb-element">
                Season Leaders
              </div>
              <div className="space-y-element">
                {/* Season Goal Leaders */}
                {report.seasonGoalLeaders?.[0] && (
                  <div className="text-neutral-700">
                    <p className="font-medium text-neutral-800 mb-related text-sm">Goals</p>
                    <div className="text-sm">
                      {renderLeadershipText(report.seasonGoalLeaders[0], 'goals', new Date().getFullYear() + ' Season')}
                    </div>
                  </div>
                )}

                {/* Season Fantasy Leaders */}
                {report.seasonFantasyLeaders?.[0] && (
                  <div className="text-neutral-700 mt-element">
                    <p className="font-medium text-neutral-800 mb-related text-sm">Fantasy Points</p>
                    <div className="text-sm">
                      {renderLeadershipText(report.seasonFantasyLeaders[0], 'points', new Date().getFullYear() + ' Season')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
      `Match Result - ${new Date(matchInfo.match_date).toLocaleDateString()}\n` +
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
    return (
      <Card className="text-center">
        <div className="text-xl font-semibold text-primary-600 mb-element">Loading...</div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="text-center">
        <div className="text-xl font-semibold text-error-600 mb-element">No match report found</div>
        <p className="text-neutral-600">Please check back later for the latest match report.</p>
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
      
      <h2 className="text-2xl font-bold text-center text-primary-600 tracking-tight">Match Report</h2>
      
      {/* Copy Report Button */}
      <div className="flex justify-end">
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
      
      {/* Match Info */}
      {renderMatchInfo()}
      
      {/* Stat Deep Dive */}
      {renderStatDeepDive()}
    </div>
  );
};

export default MatchReport; 