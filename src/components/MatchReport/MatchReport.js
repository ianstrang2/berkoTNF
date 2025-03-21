'use client';
import React, { useState, useEffect } from 'react';

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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-6">Match Result</h3>
        <div className="text-2xl sm:text-3xl font-bold text-center mb-8">
          Team A ({matchInfo.team_a_score} - {matchInfo.team_b_score}) Team B
        </div>
        
        <div className="space-y-6">
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="font-semibold text-lg text-primary-600 mb-2">Team A ({matchInfo.team_a_score})</div>
            <div className="text-sm text-neutral-600">
              {matchInfo.team_a_players.join(', ')}
            </div>
            {matchInfo.team_a_scorers && (
              <div className="text-sm text-success-600 mt-2">
                Scorers: {matchInfo.team_a_scorers}
              </div>
            )}
          </div>

          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="font-semibold text-lg text-primary-600 mb-2">Team B ({matchInfo.team_b_score})</div>
            <div className="text-sm text-neutral-600">
              {matchInfo.team_b_players.join(', ')}
            </div>
            {matchInfo.team_b_scorers && (
              <div className="text-sm text-success-600 mt-2">
                Scorers: {matchInfo.team_b_scorers}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStatDeepDive = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-6">Random Stats</h3>

        <div className="space-y-6">
          {/* Games Played Milestones */}
          {report.gamesMilestones?.length > 0 && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="font-semibold text-lg text-primary-600 mb-3">🏆 Milestones</div>
              <div className="space-y-2">
                {report.gamesMilestones.map((milestone, index) => (
                  <div key={index} className="text-sm text-neutral-600">
                    {milestone.name} played their {milestone.total_games}th game
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goals Milestones */}
          {report.goalsMilestones?.length > 0 && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="font-semibold text-lg text-primary-600 mb-3">⚽ Goal Milestones</div>
              <div className="space-y-2">
                {report.goalsMilestones.map((milestone, index) => (
                  <div key={index} className="text-sm text-neutral-600">
                    {milestone.name} scored their {milestone.total_goals}th goal
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streaks */}
          {report.streaks?.length > 0 && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="font-semibold text-lg text-primary-600 mb-3">🔥 Hot Streaks</div>
              <div className="space-y-2">
                {report.streaks.map((streak, index) => (
                  <div 
                    key={index} 
                    className={`text-sm p-2 rounded ${
                      streak.streak_type === 'win' || streak.streak_type === 'unbeaten' ? 'text-success-600 bg-success-50' :
                      streak.streak_type === 'loss' || streak.streak_type === 'winless' ? 'text-error-600 bg-error-50' :
                      'text-primary-600 bg-primary-50'
                    }`}
                  >
                    {streak.name} {
                      streak.streak_type === 'win' ? `is on a ${streak.streak_count} game winning streak` :
                      streak.streak_type === 'loss' ? `is on a ${streak.streak_count} game losing streak` :
                      streak.streak_type === 'unbeaten' ? `is unbeaten in ${streak.streak_count} games` :
                      streak.streak_type === 'winless' ? `hasn't won in ${streak.streak_count} games` :
                      `has scored in ${streak.streak_count} consecutive games`
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scoring Leaders Changes */}
          {(report.halfSeasonGoalLeaders?.[0] || report.halfSeasonFantasyLeaders?.[0] || 
            report.seasonGoalLeaders?.[0] || report.seasonFantasyLeaders?.[0]) && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="font-semibold text-lg text-primary-600 mb-3">📈 Scoring Leaders</div>
              <div className="space-y-2">
                {/* Half-Season Goal Leaders */}
                {report.halfSeasonGoalLeaders?.[0] && (
                  <div className="text-sm text-success-600 bg-success-50 p-2 rounded">
                    {report.halfSeasonGoalLeaders[0].change_type === 'new_leader' ? 
                      `${report.halfSeasonGoalLeaders[0].new_leader} leads the current Half-Season goal-scoring charts with ${report.halfSeasonGoalLeaders[0].new_leader_goals} goals` :
                    report.halfSeasonGoalLeaders[0].change_type === 'tied' ?
                      `${report.halfSeasonGoalLeaders[0].new_leader} joined ${report.halfSeasonGoalLeaders[0].previous_leader} at the top of the current half-season goalscoring charts with ${report.halfSeasonGoalLeaders[0].new_leader_goals} goals` :
                    report.halfSeasonGoalLeaders[0].change_type === 'remains' ?
                      `${report.halfSeasonGoalLeaders[0].new_leader} remains at the top of the current half-season goalscoring charts with ${report.halfSeasonGoalLeaders[0].new_leader_goals} goals` :
                      `${report.halfSeasonGoalLeaders[0].new_leader} moved to the top of the current Half-Season goal-scoring charts with ${report.halfSeasonGoalLeaders[0].new_leader_goals} goals, overtaking ${report.halfSeasonGoalLeaders[0].previous_leader} (${report.halfSeasonGoalLeaders[0].previous_leader_goals} goals)`
                    }
                  </div>
                )}

                {/* Half-Season Fantasy Leaders */}
                {report.halfSeasonFantasyLeaders?.[0] && (
                  <div className="text-sm text-success-600 bg-success-50 p-2 rounded">
                    {report.halfSeasonFantasyLeaders[0].change_type === 'new_leader' ? 
                      `${report.halfSeasonFantasyLeaders[0].new_leader} leads the current Half-Season fantasy points charts with ${report.halfSeasonFantasyLeaders[0].new_leader_points} points` :
                    report.halfSeasonFantasyLeaders[0].change_type === 'tied' ?
                      `${report.halfSeasonFantasyLeaders[0].new_leader} joined ${report.halfSeasonFantasyLeaders[0].previous_leader} at the top of the current half-season fantasy points charts with ${report.halfSeasonFantasyLeaders[0].new_leader_points} points` :
                    report.halfSeasonFantasyLeaders[0].change_type === 'remains' ?
                      `${report.halfSeasonFantasyLeaders[0].new_leader} remains at the top of the current half-season fantasy points charts with ${report.halfSeasonFantasyLeaders[0].new_leader_points} points` :
                      `${report.halfSeasonFantasyLeaders[0].new_leader} moved to the top of the current Half-Season fantasy points charts with ${report.halfSeasonFantasyLeaders[0].new_leader_points} points, overtaking ${report.halfSeasonFantasyLeaders[0].previous_leader} (${report.halfSeasonFantasyLeaders[0].previous_leader_points} points)`
                    }
                  </div>
                )}

                {/* Overall Season Goal Leaders */}
                {report.seasonGoalLeaders?.[0] && (
                  <div className="text-sm text-success-600 bg-success-50 p-2 rounded">
                    {report.seasonGoalLeaders[0].change_type === 'new_leader' ? 
                      `${report.seasonGoalLeaders[0].new_leader} leads the ${new Date().getFullYear()} Season goal-scoring charts with ${report.seasonGoalLeaders[0].new_leader_goals} goals` :
                    report.seasonGoalLeaders[0].change_type === 'tied' ?
                      `${report.seasonGoalLeaders[0].new_leader} joined ${report.seasonGoalLeaders[0].previous_leader} at the top of the ${new Date().getFullYear()} Season goalscoring charts with ${report.seasonGoalLeaders[0].new_leader_goals} goals` :
                    report.seasonGoalLeaders[0].change_type === 'remains' ?
                      `${report.seasonGoalLeaders[0].new_leader} remains at the top of the ${new Date().getFullYear()} Season goalscoring charts with ${report.seasonGoalLeaders[0].new_leader_goals} goals` :
                      `${report.seasonGoalLeaders[0].new_leader} moved to the top of the ${new Date().getFullYear()} Season goal-scoring charts with ${report.seasonGoalLeaders[0].new_leader_goals} goals, overtaking ${report.seasonGoalLeaders[0].previous_leader} (${report.seasonGoalLeaders[0].previous_leader_goals} goals)`
                    }
                  </div>
                )}

                {/* Overall Season Fantasy Leaders */}
                {report.seasonFantasyLeaders?.[0] && (
                  <div className="text-sm text-success-600 bg-success-50 p-2 rounded">
                    {report.seasonFantasyLeaders[0].change_type === 'new_leader' ? 
                      `${report.seasonFantasyLeaders[0].new_leader} leads the ${new Date().getFullYear()} Season fantasy points charts with ${report.seasonFantasyLeaders[0].new_leader_points} points` :
                    report.seasonFantasyLeaders[0].change_type === 'tied' ?
                      `${report.seasonFantasyLeaders[0].new_leader} joined ${report.seasonFantasyLeaders[0].previous_leader} at the top of the ${new Date().getFullYear()} Season fantasy points charts with ${report.seasonFantasyLeaders[0].new_leader_points} points` :
                    report.seasonFantasyLeaders[0].change_type === 'remains' ?
                      `${report.seasonFantasyLeaders[0].new_leader} remains at the top of the ${new Date().getFullYear()} Season fantasy points charts with ${report.seasonFantasyLeaders[0].new_leader_points} points` :
                      `${report.seasonFantasyLeaders[0].new_leader} moved to the top of the ${new Date().getFullYear()} Season fantasy points charts with ${report.seasonFantasyLeaders[0].new_leader_points} points, overtaking ${report.seasonFantasyLeaders[0].previous_leader} (${report.seasonFantasyLeaders[0].previous_leader_points} points)`
                    }
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const formatReportForCopy = () => {
    if (!report) return '';

    const { matchInfo, gamesMilestones, goalsMilestones, streaks, halfSeasonGoalLeaders, halfSeasonFantasyLeaders, seasonGoalLeaders, seasonFantasyLeaders } = report;
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
    if (gamesMilestones?.length > 0) {
      sections.push(
        '\n🏆 Milestones\n' +
        gamesMilestones.map(m => `${m.name} played their ${m.total_games}th game`).join('\n')
      );
    }

    // Goal Milestones
    if (goalsMilestones?.length > 0) {
      sections.push(
        '\n⚽ Goal Milestones\n' +
        goalsMilestones.map(m => `${m.name} scored their ${m.total_goals}th goal`).join('\n')
      );
    }

    // Streaks
    if (streaks?.length > 0) {
      sections.push(
        '\n🔥 Hot Streaks\n' +
        streaks.map(streak => {
          const streakText = 
            streak.streak_type === 'win' ? `is on a ${streak.streak_count} game winning streak` :
            streak.streak_type === 'loss' ? `is on a ${streak.streak_count} game losing streak` :
            streak.streak_type === 'unbeaten' ? `is unbeaten in ${streak.streak_count} games` :
            streak.streak_type === 'winless' ? `hasn't won in ${streak.streak_count} games` :
            `has scored in ${streak.streak_count} consecutive games`;
          return `${streak.name} ${streakText}`;
        }).join('\n')
      );
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
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-primary-600">Loading Match Report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-primary-600">No match report available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary-600">
          Latest Match Report - {new Date(report.matchInfo.match_date).toLocaleDateString()}
        </h2>
        <button
          onClick={handleCopyReport}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Copy Report
        </button>
      </div>
      {renderMatchInfo()}
      {renderStatDeepDive()}
      
      {/* Copy Toast Notification */}
      {showCopyToast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300">
          Report copied to clipboard
        </div>
      )}
    </div>
  );
};

export default MatchReport; 