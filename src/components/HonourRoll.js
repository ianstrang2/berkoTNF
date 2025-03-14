import React, { useState, useEffect } from 'react';
import styles from './HonourRoll.module.css';

const HonourRoll = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    seasonWinners: [],
    topScorers: [],
    records: null
  });
  const [activeTab, setActiveTab] = useState("seasonal");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/honourroll');
        const result = await response.json();
        
        if (result.data) {
          const recordsData = result.data.records[0]?.records;
          
          const modifiedData = {
            ...result.data,
            records: {
              consecutive_goals: recordsData?.consecutive_goals,
              most_goals_in_game: recordsData?.most_goals_in_game,
              biggest_victory: recordsData?.biggest_victory,
              streaks: {
                'Win Streak': recordsData?.streaks?.['Win Streak'],
                'Loss Streak': recordsData?.streaks?.['Loss Streak'],
                'No Win Streak': recordsData?.streaks?.['No Win Streak'],
                'Undefeated Streak': recordsData?.streaks?.['Undefeated Streak']
              }
            }
          };
          setData(modifiedData);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching honour roll:', error);
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  const renderSeasonalHonours = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className={styles.arcadeContainer}>
        <h3 className={styles.arcadeTitle}>Season Winners</h3>
        <div className="table-responsive">
          <table className={styles.arcadeTable}>
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Year</th>
                <th style={{ width: '120px' }}>Champion</th>
                <th style={{ width: '70px' }}>Points</th>
                <th style={{ minWidth: '180px' }}>Runners Up</th>
              </tr>
            </thead>
            <tbody>
              {data.seasonWinners.map((season) => (
                <tr key={season.year}>
                  <td>{season.year}</td>
                  <td className={styles.playerName}>{season.winners.winner}</td>
                  <td>{season.winners.winner_points}</td>
                  <td>
                    {season.winners.runners_up?.map(runner => 
                      `${runner.name} (${runner.points})`).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.arcadeContainer}>
        <h3 className={styles.arcadeTitle}>Top Scorers</h3>
        <div className="table-responsive">
          <table className={styles.arcadeTable}>
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Year</th>
                <th style={{ width: '120px' }}>Player</th>
                <th style={{ width: '70px' }}>Goals</th>
                <th style={{ minWidth: '180px' }}>Runners Up</th>
              </tr>
            </thead>
            <tbody>
              {data.topScorers.map((season) => (
                <tr key={season.year}>
                  <td>{season.year}</td>
                  <td className={styles.playerName}>{season.scorers.winner}</td>
                  <td>{season.scorers.winner_goals}</td>
                  <td>
                    {season.scorers.runners_up?.map(runner => 
                      `${runner.name} (${runner.goals})`).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderRecords = () => {
    const formatNames = (records) => {
      return records.map(record => record.name).join(', ');
    };

    return (
      <div className={styles.arcadeContainer}>
        <h3 className={styles.arcadeTitle}>TNF Records</h3>
        <div className="table-responsive">
          <table className={styles.arcadeTable}>
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Record</th>
                <th style={{ width: '200px' }}>Player(s)</th>
                <th style={{ width: '80px' }}>Details</th>
                <th style={{ width: '100px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.records && (
                <>
                  {data.records.most_goals_in_game && (
                    <tr>
                      <td>Most Goals in a Game</td>
                      <td className={styles.playerName}>
                        {formatNames(data.records.most_goals_in_game)}
                      </td>
                      <td>
                        {data.records.most_goals_in_game[0].goals} goals
                      </td>
                      <td className={styles.dateText}>
                        {data.records.most_goals_in_game.map((record, index) => (
                          <div key={index}>
                            {record.name}: {new Date(record.date).toLocaleDateString()}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}

                  {Object.entries(data.records.streaks || {}).map(([streakType, streakData]) => (
                    <tr key={streakType}>
                      <td>
                        {streakType === 'Win Streak' ? 'Longest Win Streak' :
                         streakType === 'Loss Streak' ? 'Longest Losing Streak' :
                         streakType === 'No Win Streak' ? 'Longest Streak Without a Win' :
                         'Longest Undefeated Streak'}
                      </td>
                      <td className={styles.playerName}>
                        {formatNames(streakData.holders)}
                      </td>
                      <td>{streakData.holders[0].streak} games</td>
                      <td className={styles.dateText}>
                        {streakData.holders.map((holder, index) => (
                          <div key={index}>
                            {holder.name}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                            {new Date(holder.end_date).toLocaleDateString()}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}

                  {data.records.consecutive_goals && (
                    <tr>
                      <td>Most Consecutive Games Scoring</td>
                      <td className={styles.playerName}>
                        {formatNames(data.records.consecutive_goals.holders)}
                      </td>
                      <td>{data.records.consecutive_goals.holders[0].streak} games</td>
                      <td className={styles.dateText}>
                        {data.records.consecutive_goals.holders.map((holder, index) => (
                          <div key={index}>
                            {holder.name}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                            {new Date(holder.end_date).toLocaleDateString()}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}

                  {data.records.biggest_victory && data.records.biggest_victory[0] && (
                    <tr>
                      <td>Biggest Victory</td>
                      <td className={`${styles.playerName} ${styles.wrapText}`}>
                        {data.records.biggest_victory[0].winning_team === 'A' ? (
                          <>
                            Team A ({data.records.biggest_victory[0].team_a_score}): {data.records.biggest_victory[0].team_a_players}
                            <br />
                            Team B ({data.records.biggest_victory[0].team_b_score}): {data.records.biggest_victory[0].team_b_players}
                          </>
                        ) : (
                          <>
                            Team B ({data.records.biggest_victory[0].team_b_score}): {data.records.biggest_victory[0].team_b_players}
                            <br />
                            Team A ({data.records.biggest_victory[0].team_a_score}): {data.records.biggest_victory[0].team_a_players}
                          </>
                        )}
                      </td>
                      <td>
                        {data.records.biggest_victory[0].team_a_score}-{data.records.biggest_victory[0].team_b_score}
                      </td>
                      <td className={styles.dateText}>
                        {new Date(data.records.biggest_victory[0].date).toLocaleDateString()}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className={`${styles.arcadeContainer} text-center`}>
      <div className={styles.arcadeTitle}>Loading...</div>
    </div>;
  }

  return (
    <div className="p-4">
      <h2 className={styles.arcadeTitle}>Hall of Fame</h2>
      
      {/* Desktop view */}
      <div className="hidden md:flex flex-col gap-8">
        {renderSeasonalHonours()}
        {renderRecords()}
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <div className={styles.arcadeTabs}>
          <button
            className={`${styles.arcadeTab} ${activeTab === 'seasonal' ? styles.active : ''}`}
            onClick={() => setActiveTab('seasonal')}
          >
            Season Honours
          </button>
          <button
            className={`${styles.arcadeTab} ${activeTab === 'records' ? styles.active : ''}`}
            onClick={() => setActiveTab('records')}
          >
            Records
          </button>
        </div>
        <div>
          {activeTab === 'seasonal' ? renderSeasonalHonours() : renderRecords()}
        </div>
      </div>
    </div>
  );
};

export default HonourRoll;