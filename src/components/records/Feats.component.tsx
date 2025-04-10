'use client';
import React, { useState, useEffect } from 'react';

interface StreakHolder {
  name: string;
  streak: number;
  start_date: string;
  end_date: string;
}

interface GoalRecord {
  name: string;
  goals: number;
  date: string;
}

interface BiggestVictory {
  date: string;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string;
  team_b_players: string;
  winning_team: 'A' | 'B';
}

interface Records {
  most_goals_in_game?: GoalRecord[];
  consecutive_goals?: {
    holders: StreakHolder[];
  };
  biggest_victory?: BiggestVictory[];
  streaks?: {
    'Win Streak'?: {
      holders: StreakHolder[];
    };
    'Loss Streak'?: {
      holders: StreakHolder[];
    };
    'No Win Streak'?: {
      holders: StreakHolder[];
    };
    'Undefeated Streak'?: {
      holders: StreakHolder[];
    };
  };
}

interface FeatsData {
  records: Records | null;
}

const Feats: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<FeatsData>({
    records: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/honourroll');
        const result = await response.json();
        
        if (result.data) {
          const recordsData = result.data.records[0]?.records;
          
          const modifiedData = {
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
        console.error('Error fetching feats:', error);
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  const renderRecords = () => {
    const formatNames = (records: Array<{name: string}>) => {
      return records.map(record => record.name).join(', ');
    };

    return (
      <div className="w-auto flex-none">
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
            <h5 className="mb-0">Record Breakers</h5>
          </div>
          <div className="overflow-x-auto px-0 pt-0 pb-2">
            <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500">
              <thead className="align-bottom">
                <tr>
                  <th className="px-6 py-3 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">
                    Record
                  </th>
                  <th className="px-6 py-3 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-48">
                    Player(s)
                  </th>
                  <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">
                    Details
                  </th>
                  <th className="px-6 py-3 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.records && (
                  <>
                    {data.records.most_goals_in_game && (
                      <tr>
                        <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-normal leading-normal text-sm">Most Goals in a Game</span>
                        </td>
                        <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                          <div className="flex px-2 py-1">
                            <div className="flex flex-col justify-center">
                              <h6 className="mb-0 leading-normal text-sm font-semibold">
                                {formatNames(data.records.most_goals_in_game)}
                              </h6>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-normal leading-normal text-sm">
                            {data.records.most_goals_in_game[0].goals} goals
                          </span>
                        </td>
                        <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                          {data.records.most_goals_in_game.map((record, index) => (
                            <div key={`game-${index}`} className="mb-1 text-sm" suppressHydrationWarning>
                              {record.name}: {new Date(record.date).toLocaleDateString()}
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}

                    {data.records.streaks && Object.entries(data.records.streaks).map(([streakType, streakData]) => 
                      streakData && (
                        <tr key={streakType}>
                          <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                            <span className="font-normal leading-normal text-sm">
                              {streakType === 'Win Streak' ? 'Longest Win Streak' :
                              streakType === 'Loss Streak' ? 'Longest Losing Streak' :
                              streakType === 'No Win Streak' ? 'Longest Streak Without a Win' :
                              'Longest Undefeated Streak'}
                            </span>
                          </td>
                          <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                            <div className="flex px-2 py-1">
                              <div className="flex flex-col justify-center">
                                <h6 className="mb-0 leading-normal text-sm font-semibold">
                                  {formatNames(streakData.holders)}
                                </h6>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                            <span className="font-normal leading-normal text-sm">
                              {streakData.holders[0].streak} games
                            </span>
                          </td>
                          <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                            {streakData.holders.map((holder, index) => (
                              <div key={`streak-${index}`} className="mb-1 text-sm" suppressHydrationWarning>
                                {holder.name}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                                {new Date(holder.end_date).toLocaleDateString()}
                              </div>
                            ))}
                          </td>
                        </tr>
                      )
                    )}

                    {data.records.consecutive_goals && (
                      <tr>
                        <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-normal leading-normal text-sm">Most Consecutive Games Scoring</span>
                        </td>
                        <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                          <div className="flex px-2 py-1">
                            <div className="flex flex-col justify-center">
                              <h6 className="mb-0 leading-normal text-sm font-semibold">
                                {formatNames(data.records.consecutive_goals.holders)}
                              </h6>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-normal leading-normal text-sm">
                            {data.records.consecutive_goals.holders[0].streak} games
                          </span>
                        </td>
                        <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                          {data.records.consecutive_goals.holders.map((holder, index) => (
                            <div key={`consecutive-${index}`} className="mb-1 text-sm" suppressHydrationWarning>
                              {holder.name}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                              {new Date(holder.end_date).toLocaleDateString()}
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}

                    {data.records.biggest_victory && data.records.biggest_victory[0] && (
                      <tr>
                        <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-normal leading-normal text-sm">Biggest Victory</span>
                        </td>
                        <td className="p-2 align-middle bg-transparent border-b">
                          <div className="flex-col px-2 py-1">
                            {data.records.biggest_victory[0].winning_team === 'A' ? (
                              <>
                                <div className="mb-1 text-sm font-semibold">
                                  Team A ({data.records.biggest_victory[0].team_a_score}): {data.records.biggest_victory[0].team_a_players}
                                </div>
                                <div className="mb-0 text-sm">
                                  Team B ({data.records.biggest_victory[0].team_b_score}): {data.records.biggest_victory[0].team_b_players}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="mb-1 text-sm font-semibold">
                                  Team B ({data.records.biggest_victory[0].team_b_score}): {data.records.biggest_victory[0].team_b_players}
                                </div>
                                <div className="mb-0 text-sm">
                                  Team A ({data.records.biggest_victory[0].team_a_score}): {data.records.biggest_victory[0].team_a_players}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-normal leading-normal text-sm">
                            {data.records.biggest_victory[0].team_a_score}-{data.records.biggest_victory[0].team_b_score}
                          </span>
                        </td>
                        <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="text-sm text-slate-400" suppressHydrationWarning>
                            {new Date(data.records.biggest_victory[0].date).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl">
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
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

  return (
    <div className="max-w-7xl">
      {renderRecords()}
    </div>
  );
};

export default Feats; 