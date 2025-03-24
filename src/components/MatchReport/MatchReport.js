'use client';
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/card';

const MatchReport = () => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [showCopyToast, setShowCopyToast] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch('/api/matchReport');
        const result = await response.json();
        
        if (result.success) {
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
    const { matchInfo } = report;
    return (
      <Card className="mt-6">
        <div className="text-2xl sm:text-3xl font-bold text-center mb-8">
          Team A ({matchInfo.team_a_score}) - ({matchInfo.team_b_score}) Team B
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-50 rounded-lg p-5">
            <div className="font-semibold text-lg text-primary-600 mb-3">Team A ({matchInfo.team_a_score})</div>
            <div className="text-sm text-neutral-700 leading-relaxed">
              {matchInfo.team_a_players.join(', ')}
            </div>
            {matchInfo.team_a_scorers && (
              <div className="text-sm text-primary-600 font-medium mt-3 flex items-center">
                <span className="mr-2">⚽</span> {matchInfo.team_a_scorers}
              </div>
            )}
          </div>

          <div className="bg-neutral-50 rounded-lg p-5">
            <div className="font-semibold text-lg text-primary-600 mb-3">Team B ({matchInfo.team_b_score})</div>
            <div className="text-sm text-neutral-700 leading-relaxed">
              {matchInfo.team_b_players.join(', ')}
            </div>
            {matchInfo.team_b_scorers && (
              <div className="text-sm text-primary-600 font-medium mt-3 flex items-center">
                <span className="mr-2">⚽</span> {matchInfo.team_b_scorers}
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
      <Card className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Games & Goals Milestones */}
          {(report.gamesMilestones?.length > 0 || report.goalsMilestones?.length > 0) && (
            <div className="bg-neutral-50 rounded-lg p-5">
              <div className="font-semibold text-lg text-primary-600 mb-3">
                Milestones
              </div>
              <div className="space-y-2">
                {report.gamesMilestones?.map((milestone, i) => (
                  <p key={`game-${i}`} className="text-neutral-700">
                    {milestone.name} played their <span className="font-semibold">{milestone.games_played}th</span> game
                  </p>
                ))}
                {report.goalsMilestones?.map((milestone, i) => (
                  <p key={`goal-${i}`} className="text-neutral-700">
                    {milestone.name} scored their <span className="font-semibold">{milestone.total_goals}th</span> goal
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Streaks */}
          {report.streaks?.length > 0 && (
            <div className="bg-neutral-50 rounded-lg p-5">
              <div className="font-semibold text-lg text-primary-600 mb-3">
                Form Streaks
              </div>
              <div className="space-y-2">
                {report.streaks.map((streak, i) => (
                  <p key={`streak-${i}`} className="text-neutral-700">
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
          {report.goalStreaks?.length > 0 && (
            <div className="bg-neutral-50 rounded-lg p-5">
              <div className="font-semibold text-lg text-primary-600 mb-3">
                Scoring Streaks
              </div>
              <div className="space-y-2">
                {report.goalStreaks.map((streak, i) => (
                  <p key={`goal-streak-${i}`} className="text-neutral-700">
                    {streak.name} has scored in <span className="font-semibold">{streak.matches_with_goals} consecutive</span> matches 
                    <span className="text-sm text-neutral-500 ml-1">
                      ({streak.goals_in_streak} goals total)
                    </span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Half-Season Leaders */}
          {(report.halfSeasonGoalLeaders?.[0] || report.halfSeasonFantasyLeaders?.[0]) && (
            <div className="bg-neutral-50 rounded-lg p-5">
              <div className="font-semibold text-lg text-primary-600 mb-3">
                Current Leaders
              </div>
              <div className="space-y-3">
                {/* Half-Season Goal Leaders */}
                {report.halfSeasonGoalLeaders?.[0] && (
                  <div className="text-neutral-700">
                    <p className="font-medium text-neutral-800 mb-1">Goals</p>
                    {renderLeadershipText(report.halfSeasonGoalLeaders[0], 'goals', 'current Half-Season')}
                  </div>
                )}

                {/* Half-Season Fantasy Leaders */}
                {report.halfSeasonFantasyLeaders?.[0] && (
                  <div className="text-neutral-700 mt-2">
                    <p className="font-medium text-neutral-800 mb-1">Fantasy Points</p>
                    {renderLeadershipText(report.halfSeasonFantasyLeaders[0], 'points', 'current Half-Season')}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Season Leaders */}
          {(report.seasonGoalLeaders?.[0] || report.seasonFantasyLeaders?.[0]) && (
            <div className="bg-neutral-50 rounded-lg p-5">
              <div className="font-semibold text-lg text-primary-600 mb-3">
                Season Leaders
              </div>
              <div className="space-y-3">
                {/* Season Goal Leaders */}
                {report.seasonGoalLeaders?.[0] && (
                  <div className="text-neutral-700">
                    <p className="font-medium text-neutral-800 mb-1">Goals</p>
                    {renderLeadershipText(report.seasonGoalLeaders[0], 'goals', new Date().getFullYear() + ' Season')}
                  </div>
                )}

                {/* Season Fantasy Leaders */}
                {report.seasonFantasyLeaders?.[0] && (
                  <div className="text-neutral-700 mt-2">
                    <p className="font-medium text-neutral-800 mb-1">Fantasy Points</p>
                    {renderLeadershipText(report.seasonFantasyLeaders[0], 'points', new Date().getFullYear() + ' Season')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };
  
  const renderLeadershipText = (leaderData, metric, period) => {
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

    const {
      matchInfo,
      gamesMilestones,
      goalsMilestones,
      streaks,
      goalStreaks,
      halfSeasonGoalLeaders,
      halfSeasonFantasyLeaders,
      seasonGoalLeaders,
      seasonFantasyLeaders
    } = report;
    
    const sections = [];

    // Match Result
    sections.push(
      `Match Result - ${new Date(matchInfo.match_date).toLocaleDateString()}\n` +
      `Team A ${matchInfo.team_a_score} - ${matchInfo.team_b_score} Team B\n\n` +
      `Team A (${matchInfo.team_a_score})\n` +
      `Players: ${matchInfo.team_a_players.join(', ')}\n` +
      (matchInfo.team_a_scorers ? `Scorers: ${matchInfo.team_a_scorers}\n` : '') +
      `\nTeam B (${matchInfo.team_b_score})\n` +
      `Players: ${matchInfo.team_b_players.join(', ')}\n` +
      (matchInfo.team_b_scorers ? `Scorers: ${matchInfo.team_b_scorers}\n` : '')
    );

    // Milestones
    if (gamesMilestones?.length > 0 || goalsMilestones?.length > 0) {
      sections.push('\n🏆 Milestones');
      gamesMilestones?.forEach(milestone => {
        sections.push(`${milestone.name} played their ${milestone.games_played}th game for The Monks`);
      });
      goalsMilestones?.forEach(milestone => {
        sections.push(`${milestone.name} scored their ${milestone.total_goals}th goal for The Monks`);
      });
    }

    // Streaks
    if (streaks?.length > 0) {
      sections.push('\n🔥 Streaks');
      streaks.forEach(streak => {
        sections.push(`${streak.name} is on a ${streak.streak_count} game ${streak.streak_type === 'win' ? 'winning' : streak.streak_type === 'loss' ? 'losing' : streak.streak_type === 'unbeaten' ? 'unbeaten' : 'winless'} streak`);
      });
    }

    // Goal-scoring Streaks
    if (goalStreaks?.length > 0) {
      sections.push('\n⚽ Goal Streaks');
      goalStreaks.forEach(streak => {
        sections.push(`${streak.name} has scored in ${streak.matches_with_goals} consecutive matches (${streak.goals_in_streak} goals in ${streak.matches_with_goals} games)`);
      });
    }

    // Scoring Leaders
    if (halfSeasonGoalLeaders?.[0] || halfSeasonFantasyLeaders?.[0] || seasonGoalLeaders?.[0] || seasonFantasyLeaders?.[0]) {
      sections.push('\n📈 Scoring Leaders');

      // Half-Season Goal Leaders
      if (halfSeasonGoalLeaders?.[0]) {
        sections.push(
          halfSeasonGoalLeaders[0].change_type === 'new_leader' ? 
            `${halfSeasonGoalLeaders[0].new_leader} leads the current Half-Season goal-scoring charts with ${halfSeasonGoalLeaders[0].new_leader_goals} goals` :
          halfSeasonGoalLeaders[0].change_type === 'tied' ?
            `${halfSeasonGoalLeaders[0].new_leader} joined ${halfSeasonGoalLeaders[0].previous_leader} at the top of the current half-season goalscoring charts with ${halfSeasonGoalLeaders[0].new_leader_goals} goals` :
          halfSeasonGoalLeaders[0].change_type === 'remains' ?
            `${halfSeasonGoalLeaders[0].new_leader} remains at the top of the current half-season goalscoring charts with ${halfSeasonGoalLeaders[0].new_leader_goals} goals` :
            `${halfSeasonGoalLeaders[0].new_leader} moved to the top of the current Half-Season goal-scoring charts with ${halfSeasonGoalLeaders[0].new_leader_goals} goals, overtaking ${halfSeasonGoalLeaders[0].previous_leader} (${halfSeasonGoalLeaders[0].previous_leader_goals} goals)`
        );
      }

      // Half-Season Fantasy Leaders
      if (halfSeasonFantasyLeaders?.[0]) {
        sections.push(
          halfSeasonFantasyLeaders[0].change_type === 'new_leader' ? 
            `${halfSeasonFantasyLeaders[0].new_leader} leads the current Half-Season fantasy points charts with ${halfSeasonFantasyLeaders[0].new_leader_points} points` :
          halfSeasonFantasyLeaders[0].change_type === 'tied' ?
            `${halfSeasonFantasyLeaders[0].new_leader} joined ${halfSeasonFantasyLeaders[0].previous_leader} at the top of the current half-season fantasy points charts with ${halfSeasonFantasyLeaders[0].new_leader_points} points` :
          halfSeasonFantasyLeaders[0].change_type === 'remains' ?
            `${halfSeasonFantasyLeaders[0].new_leader} remains at the top of the current half-season fantasy points charts with ${halfSeasonFantasyLeaders[0].new_leader_points} points` :
            `${halfSeasonFantasyLeaders[0].new_leader} moved to the top of the current Half-Season fantasy points charts with ${halfSeasonFantasyLeaders[0].new_leader_points} points, overtaking ${halfSeasonFantasyLeaders[0].previous_leader} (${halfSeasonFantasyLeaders[0].previous_leader_points} points)`
        );
      }

      // Overall Season Goal Leaders
      if (seasonGoalLeaders?.[0]) {
        sections.push(
          seasonGoalLeaders[0].change_type === 'new_leader' ? 
            `${seasonGoalLeaders[0].new_leader} leads the ${new Date().getFullYear()} Season goal-scoring charts with ${seasonGoalLeaders[0].new_leader_goals} goals` :
          seasonGoalLeaders[0].change_type === 'tied' ?
            `${seasonGoalLeaders[0].new_leader} joined ${seasonGoalLeaders[0].previous_leader} at the top of the ${new Date().getFullYear()} Season goalscoring charts with ${seasonGoalLeaders[0].new_leader_goals} goals` :
          seasonGoalLeaders[0].change_type === 'remains' ?
            `${seasonGoalLeaders[0].new_leader} remains at the top of the ${new Date().getFullYear()} Season goalscoring charts with ${seasonGoalLeaders[0].new_leader_goals} goals` :
            `${seasonGoalLeaders[0].new_leader} moved to the top of the ${new Date().getFullYear()} Season goal-scoring charts with ${seasonGoalLeaders[0].new_leader_goals} goals, overtaking ${seasonGoalLeaders[0].previous_leader} (${seasonGoalLeaders[0].previous_leader_goals} goals)`
        );
      }

      // Overall Season Fantasy Leaders
      if (seasonFantasyLeaders?.[0]) {
        sections.push(
          seasonFantasyLeaders[0].change_type === 'new_leader' ? 
            `${seasonFantasyLeaders[0].new_leader} leads the ${new Date().getFullYear()} Season fantasy points charts with ${seasonFantasyLeaders[0].new_leader_points} points` :
          seasonFantasyLeaders[0].change_type === 'tied' ?
            `${seasonFantasyLeaders[0].new_leader} joined ${seasonFantasyLeaders[0].previous_leader} at the top of the ${new Date().getFullYear()} Season fantasy points charts with ${seasonFantasyLeaders[0].new_leader_points} points` :
          seasonFantasyLeaders[0].change_type === 'remains' ?
            `${seasonFantasyLeaders[0].new_leader} remains at the top of the ${new Date().getFullYear()} Season fantasy points charts with ${seasonFantasyLeaders[0].new_leader_points} points` :
            `${seasonFantasyLeaders[0].new_leader} moved to the top of the ${new Date().getFullYear()} Season fantasy points charts with ${seasonFantasyLeaders[0].new_leader_points} points, overtaking ${seasonFantasyLeaders[0].previous_leader} (${seasonFantasyLeaders[0].previous_leader_points} points)`
        );
      }
    }

    return sections.join('\n');
  };

  const handleCopyReport = async () => {
    try {
      const reportText = formatReportForCopy();
      await navigator.clipboard.writeText(reportText);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    } catch (error) {
      console.error('Failed to copy report:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-xl font-semibold text-primary-600">Loading Match Report...</div>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-xl font-semibold text-gray-700">No match report available</div>
        <p className="mt-2 text-gray-500">There are no recent matches to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-primary-600">
          Latest Match Report
          <span className="block sm:inline text-lg font-normal text-neutral-600 mt-1 sm:mt-0 sm:ml-2">
            {new Date(report.matchInfo.match_date).toLocaleDateString()}
          </span>
        </h2>
        <Button
          variant="secondary"
          onClick={handleCopyReport}
        >
          Copy Report
        </Button>
      </div>
      
      {renderMatchInfo()}
      {renderStatDeepDive()}
      
      {/* Copy Toast Notification */}
      {showCopyToast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-neutral-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2">
          <span>Report copied to clipboard</span>
        </div>
      )}
    </div>
  );
};

export default MatchReport; 