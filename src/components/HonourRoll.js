'use client';
import React, { useState, useEffect } from 'react';

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-6">Season Winners</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-base">
            <thead>
              <tr>
                <th className="w-[70px]">Year</th>
                <th className="w-[120px]">Champion</th>
                <th className="w-[70px]">Points</th>
                <th className="min-w-[180px]">Runners Up</th>
              </tr>
            </thead>
            <tbody>
              {data.seasonWinners.map((season) => (
                <tr key={season.year}>
                  <td>{season.year}</td>
                  <td className="font-medium text-primary-600">{season.winners.winner}</td>
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

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-6">Top Scorers</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-base">
            <thead>
              <tr>
                <th className="w-[70px]">Year</th>
                <th className="w-[120px]">Player</th>
                <th className="w-[70px]">Goals</th>
                <th className="min-w-[180px]">Runners Up</th>
              </tr>
            </thead>
            <tbody>
              {data.topScorers.map((season) => (
                <tr key={season.year}>
                  <td>{season.year}</td>
                  <td className="font-medium text-primary-600">{season.scorers.winner}</td>
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-6">TNF Records</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-base">
            <thead>
              <tr>
                <th className="w-[120px]">Record</th>
                <th className="w-[200px]">Player(s)</th>
                <th className="w-[80px]">Details</th>
                <th className="w-[100px]">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.records && (
                <>
                  {data.records.most_goals_in_game && (
                    <tr>
                      <td>Most Goals in a Game</td>
                      <td className="font-medium text-primary-600">
                        {formatNames(data.records.most_goals_in_game)}
                      </td>
                      <td>
                        {data.records.most_goals_in_game[0].goals} goals
                      </td>
                      <td className="text-sm">
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
                      <td className="font-medium text-primary-600">
                        {formatNames(streakData.holders)}
                      </td>
                      <td>{streakData.holders[0].streak} games</td>
                      <td className="text-sm">
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
                      <td className="font-medium text-primary-600">
                        {formatNames(data.records.consecutive_goals.holders)}
                      </td>
                      <td>{data.records.consecutive_goals.holders[0].streak} games</td>
                      <td className="text-sm">
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
                      <td className="font-medium text-primary-600 whitespace-normal">
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
                      <td className="text-sm">
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
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-primary-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-600">Hall of Fame</h2>
      
      {/* Desktop view */}
      <div className="hidden md:flex flex-col gap-6">
        {renderSeasonalHonours()}
        {renderRecords()}
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <div className="flex rounded-lg bg-neutral-100 p-1 mb-6">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'seasonal' 
                ? 'bg-white text-primary-600 shadow-sm' 
                : 'text-neutral-600 hover:text-primary-600'
            }`}
            onClick={() => setActiveTab('seasonal')}
          >
            Season Honours
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'records' 
                ? 'bg-white text-primary-600 shadow-sm' 
                : 'text-neutral-600 hover:text-primary-600'
            }`}
            onClick={() => setActiveTab('records')}
          >
            TNF Records
          </button>
        </div>
        
        {activeTab === 'seasonal' ? renderSeasonalHonours() : renderRecords()}
      </div>
    </div>
  );
};

export default HonourRoll;