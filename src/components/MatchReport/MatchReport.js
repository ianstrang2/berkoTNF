'use client';
import React, { useState, useEffect } from 'react';
import styles from './MatchReport.module.css';

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
      <div className={styles.arcadeContainer}>
        <h3 className={styles.arcadeTitle}>Match Result</h3>
        <div className={styles.matchResult}>
          Team A {matchInfo.team_a_score} - {matchInfo.team_b_score} Team B
        </div>
        
        <div className={styles.teamInfo}>
          <div className={styles.teamName}>Team A</div>
          <div className={styles.playerList}>
            {matchInfo.team_a_players.join(', ')}
          </div>
          {matchInfo.team_a_scorers && (
            <div className={styles.scorers}>
              Scorers: {matchInfo.team_a_scorers}
            </div>
          )}
        </div>

        <div className={styles.teamInfo}>
          <div className={styles.teamName}>Team B</div>
          <div className={styles.playerList}>
            {matchInfo.team_b_players.join(', ')}
          </div>
          {matchInfo.team_b_scorers && (
            <div className={styles.scorers}>
              Scorers: {matchInfo.team_b_scorers}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStatDeepDive = () => {
    return (
      <div className={styles.arcadeContainer}>
        <h3 className={styles.arcadeTitle}>Random Stats</h3>

        {/* Games Played Milestones */}
        {report.gamesMilestones?.length > 0 && (
          <div className={styles.statSection}>
            <div className={styles.statTitle}>🏆 Milestones</div>
            {report.gamesMilestones.map((milestone, index) => (
              <div key={index} className={styles.statItem}>
                {milestone.name} played their {milestone.total_games}th game
              </div>
            ))}
          </div>
        )}

        {/* Goals Milestones */}
        {report.goalsMilestones?.length > 0 && (
          <div className={styles.statSection}>
            <div className={styles.statTitle}>⚽ Goal Milestones</div>
            {report.goalsMilestones.map((milestone, index) => (
              <div key={index} className={styles.statItem}>
                {milestone.name} scored their {milestone.total_goals}th goal
              </div>
            ))}
          </div>
        )}

        {/* Streaks */}
        {report.streaks?.length > 0 && (
          <div className={styles.statSection}>
            <div className={styles.statTitle}>🔥 Hot Streaks</div>
            {report.streaks.map((streak, index) => (
              <div key={index} className={`${styles.statItem} ${
                streak.streak_type === 'win' || streak.streak_type === 'unbeaten' ? styles.success :
                streak.streak_type === 'loss' || streak.streak_type === 'winless' ? styles.danger :
                styles.warning
              }`}>
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
        )}

        {/* Scoring Leaders Changes */}
        {report.scoringLeaders?.length > 0 && (
          <div className={styles.statSection}>
            <div className={styles.statTitle}>📈 Goalscoring Charts</div>
            {report.scoringLeaders.map((change, index) => (
              <div key={index} className={`${styles.statItem} ${styles.success}`}>
                {change.new_leader} {
                  change.previous_leader_goals === change.new_leader_goals ?
                  `joined ${change.previous_leader} at the top of the goalscoring charts with ${change.new_leader_goals} goals` :
                  `moved to the top of the goalscoring charts with ${change.new_leader_goals} goals, overtaking ${change.previous_leader} (${change.previous_leader_goals})`
                }
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className={`${styles.arcadeContainer} text-center`}>
      <div className={styles.arcadeTitle}>Loading Match Report...</div>
    </div>;
  }

  if (!report) {
    return <div className={`${styles.arcadeContainer} text-center`}>
      <div className={styles.arcadeTitle}>No match report available</div>
    </div>;
  }

  return (
    <div className="p-4">
      <h2 className={styles.arcadeTitle}>
        Latest Match Report - {new Date(report.matchInfo.match_date).toLocaleDateString()}
      </h2>
      <div className="flex flex-col gap-8">
        {renderMatchInfo()}
        {renderStatDeepDive()}
      </div>
    </div>
  );
};

export default MatchReport; 