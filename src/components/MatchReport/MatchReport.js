'use client';
import React, { useState, useEffect } from 'react';

const MatchReport = () => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

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
          {report.scoringLeaders?.length > 0 && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="font-semibold text-lg text-primary-600 mb-3">📈 Goalscoring Charts</div>
              <div className="space-y-2">
                {report.scoringLeaders.map((change, index) => (
                  <div key={index} className="text-sm text-success-600 bg-success-50 p-2 rounded">
                    {change.new_leader} {
                      change.previous_leader_goals === change.new_leader_goals ?
                      `joined ${change.previous_leader} at the top of the goalscoring charts with ${change.new_leader_goals} goals` :
                      `moved to the top of the goalscoring charts with ${change.new_leader_goals} goals, overtaking ${change.previous_leader} (${change.previous_leader_goals})`
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
      <h2 className="text-2xl font-bold text-center text-primary-600">
        Latest Match Report - {new Date(report.matchInfo.match_date).toLocaleDateString()}
      </h2>
      {renderMatchInfo()}
      {renderStatDeepDive()}
    </div>
  );
};

export default MatchReport; 