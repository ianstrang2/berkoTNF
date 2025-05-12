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
  consecutive_goals_streak?: StreakHolder[];
  biggest_victory?: BiggestVictory[];
  streaks?: {
    'Win Streak'?: {
      holders: StreakHolder[];
    };
    'Loss Streak'?: {
      holders: StreakHolder[];
    };
    'Winless Streak'?: {
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
              consecutive_goals_streak: recordsData?.consecutive_goals_streak,
              most_goals_in_game: recordsData?.most_goals_in_game,
              biggest_victory: recordsData?.biggest_victory,
              streaks: {
                'Win Streak': recordsData?.streaks?.['Win Streak'],
                'Loss Streak': recordsData?.streaks?.['Loss Streak'],
                'Winless Streak': recordsData?.streaks?.['Winless Streak'],
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

  // Helper function to format names, moved outside renderRecords
    const formatNames = (records: Array<{name: string}>) => {
      return records.map(record => record.name).join(', ');
    };

  const renderRecords = () => {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border w-fit">
        <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4 pb-0">
          <h5 className="mb-0">Feats & Record Breakers</h5>
        </div>
        <div>
          <div className="overflow-x-auto p-4">
            <table className="mb-0 align-top border-gray-200 text-slate-500 relative">
              <thead className="align-bottom sticky top-0 z-30 bg-white shadow-sm">
                <tr>
                  <th className="sticky left-0 z-10 p-2 font-bold uppercase align-middle bg-white border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[150px]">
                    Record
                  </th>
                  <th className="sticky left-[160px] z-10 px-2 py-3 font-bold uppercase align-middle bg-white border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70"></th>
                  <th className="p-2 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[200px] max-w-[300px]">
                    Player(s) / Team(s)
                  </th>
                  <th className="p-2 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[100px]">
                    Details
                  </th>
                  <th className="p-2 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[180px]">
                    Date / Period
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.records && (
                  <>
                    {data.records.most_goals_in_game && (
                      <tr className="hover:bg-gray-50">
                        <td className="sticky left-0 z-10 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[150px]">
                          <span className="font-normal leading-normal text-sm">Most Goals in a Game</span>
                        </td>
                        <td className="sticky left-[160px] z-10 p-2 align-middle bg-white border-b whitespace-nowrap">
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </td>
                        <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                          <div className="px-2 py-1">
                            <div className="flex flex-col justify-center">
                              <h6 className="mb-0 leading-normal text-sm font-semibold break-words">
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

                    {data.records.streaks && Object.entries(data.records.streaks).map(([streakType, streakData], streakIndex) => 
                      streakData && (
                        <tr key={streakType} className="hover:bg-gray-50">
                          <td className="sticky left-0 z-10 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[150px]">
                            <span className="font-normal leading-normal text-sm">
                              {streakType === 'Win Streak' ? 'Win Streak' :
                              streakType === 'Loss Streak' ? 'Losing Streak' :
                              streakType === 'Winless Streak' ? 'Winless Streak' :
                              'Undefeated Streak'}
                            </span>
                          </td>
                          <td className="sticky left-[160px] z-10 p-2 align-middle bg-white border-b whitespace-nowrap">
                            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </td>
                          <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                            <div className="px-2 py-1">
                              <div className="flex flex-col justify-center">
                                <h6 className="mb-0 leading-normal text-sm font-semibold break-words">
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

                    {data.records.consecutive_goals_streak && (
                      <tr className="hover:bg-gray-50">
                        <td className="sticky left-0 z-10 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[150px]">
                          <span className="font-normal leading-normal text-sm">Consecutive Games Scoring</span>
                        </td>
                        <td className="sticky left-[160px] z-10 p-2 align-middle bg-white border-b whitespace-nowrap">
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </td>
                        <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                          <div className="px-2 py-1">
                            <div className="flex flex-col justify-center">
                              <h6 className="mb-0 leading-normal text-sm font-semibold break-words">
                                {formatNames(data.records.consecutive_goals_streak)}
                              </h6>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-normal leading-normal text-sm">
                            {data.records.consecutive_goals_streak[0].streak} games
                          </span>
                        </td>
                        <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                          {data.records.consecutive_goals_streak.map((holder, index) => (
                            <div key={`consecutive-${index}`} className="mb-1 text-sm" suppressHydrationWarning>
                              {holder.name}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                              {new Date(holder.end_date).toLocaleDateString()}
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}

                    {data.records.biggest_victory && data.records.biggest_victory[0] && (
                      <tr className="hover:bg-gray-50">
                        <td className="sticky left-0 z-10 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[150px]">
                          <span className="font-normal leading-normal text-sm">Biggest Victory</span>
                        </td>
                        <td className="sticky left-[160px] z-10 p-2 align-middle bg-white border-b whitespace-nowrap">
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </td>
                        <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                          <div className="px-2 py-1">
                            {data.records.biggest_victory[0].winning_team === 'A' ? (
                              <>
                                <div className="mb-1 text-sm font-semibold break-words">
                                  Team A ({data.records.biggest_victory[0].team_a_score}): {data.records.biggest_victory[0].team_a_players}
                                </div>
                                <div className="mb-0 text-sm break-words">
                                  Team B ({data.records.biggest_victory[0].team_b_score}): {data.records.biggest_victory[0].team_b_players}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="mb-1 text-sm font-semibold break-words">
                                  Team B ({data.records.biggest_victory[0].team_b_score}): {data.records.biggest_victory[0].team_b_players}
                                </div>
                                <div className="mb-0 text-sm break-words">
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
      <div className="flex flex-wrap justify-start -mx-3">
        <div className="w-full max-w-full px-3 flex-none">
          <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
            <div className="text-center">
              <h6 className="mb-2 text-lg">Loading...</h6>
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap -mx-3">
      <div className="w-full max-w-full px-3 flex-none">
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border w-fit">
          <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4 pb-0">
            <h5 className="mb-0">Feats & Record Breakers</h5>
          </div>
          <div>
            <div className="overflow-x-auto p-4">
              <table className="mb-0 align-top border-gray-200 text-slate-500 relative">
                <thead className="align-bottom sticky top-0 z-30 bg-white shadow-sm">
                  <tr>
                    <th className="sticky left-0 z-10 p-2 font-bold uppercase align-middle bg-white border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[150px]">
                      Record
                    </th>
                    <th className="sticky left-[160px] z-10 px-2 py-3 font-bold uppercase align-middle bg-white border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70"></th>
                    <th className="p-2 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[200px] max-w-[300px]">
                      Player(s) / Team(s)
                    </th>
                    <th className="p-2 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[100px]">
                      Details
                    </th>
                    <th className="p-2 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[180px]">
                      Date / Period
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.records && (
                    <>
                      {data.records.most_goals_in_game && (
                        <tr className="hover:bg-gray-50">
                          <td className="sticky left-0 z-10 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[150px]">
                            <span className="font-normal leading-normal text-sm">Most Goals in a Game</span>
                          </td>
                          <td className="sticky left-[160px] z-10 p-2 align-middle bg-white border-b whitespace-nowrap">
                            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </td>
                          <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                            <div className="px-2 py-1">
                              <div className="flex flex-col justify-center">
                                <h6 className="mb-0 leading-normal text-sm font-semibold break-words">
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

                      {data.records.streaks && Object.entries(data.records.streaks).map(([streakType, streakData], streakIndex) => 
                        streakData && (
                          <tr key={streakType} className="hover:bg-gray-50">
                            <td className="sticky left-0 z-10 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[150px]">
                              <span className="font-normal leading-normal text-sm">
                                {streakType === 'Win Streak' ? 'Win Streak' :
                                streakType === 'Loss Streak' ? 'Losing Streak' :
                                streakType === 'Winless Streak' ? 'Winless Streak' :
                                'Undefeated Streak'}
                              </span>
                            </td>
                            <td className="sticky left-[160px] z-10 p-2 align-middle bg-white border-b whitespace-nowrap">
                              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                            </td>
                            <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                              <div className="px-2 py-1">
                                <div className="flex flex-col justify-center">
                                  <h6 className="mb-0 leading-normal text-sm font-semibold break-words">
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

                      {data.records.consecutive_goals_streak && (
                        <tr className="hover:bg-gray-50">
                          <td className="sticky left-0 z-10 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[150px]">
                            <span className="font-normal leading-normal text-sm">Consecutive Games Scoring</span>
                          </td>
                          <td className="sticky left-[160px] z-10 p-2 align-middle bg-white border-b whitespace-nowrap">
                            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </td>
                          <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                            <div className="px-2 py-1">
                              <div className="flex flex-col justify-center">
                                <h6 className="mb-0 leading-normal text-sm font-semibold break-words">
                                  {formatNames(data.records.consecutive_goals_streak)}
                                </h6>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                            <span className="font-normal leading-normal text-sm">
                              {data.records.consecutive_goals_streak[0].streak} games
                            </span>
                          </td>
                          <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                            {data.records.consecutive_goals_streak.map((holder, index) => (
                              <div key={`consecutive-${index}`} className="mb-1 text-sm" suppressHydrationWarning>
                                {holder.name}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                                {new Date(holder.end_date).toLocaleDateString()}
                              </div>
                            ))}
                          </td>
                        </tr>
                      )}

                      {data.records.biggest_victory && data.records.biggest_victory[0] && (
                        <tr className="hover:bg-gray-50">
                          <td className="sticky left-0 z-10 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[150px]">
                            <span className="font-normal leading-normal text-sm">Biggest Victory</span>
                          </td>
                          <td className="sticky left-[160px] z-10 p-2 align-middle bg-white border-b whitespace-nowrap">
                            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </td>
                          <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                            <div className="px-2 py-1">
                              {data.records.biggest_victory[0].winning_team === 'A' ? (
                                <>
                                  <div className="mb-1 text-sm font-semibold break-words">
                                    Team A ({data.records.biggest_victory[0].team_a_score}): {data.records.biggest_victory[0].team_a_players}
                                  </div>
                                  <div className="mb-0 text-sm break-words">
                                    Team B ({data.records.biggest_victory[0].team_b_score}): {data.records.biggest_victory[0].team_b_players}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="mb-1 text-sm font-semibold break-words">
                                    Team B ({data.records.biggest_victory[0].team_b_score}): {data.records.biggest_victory[0].team_b_players}
                                  </div>
                                  <div className="mb-0 text-sm break-words">
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
      </div>
    </div>
  );
};

export default Feats; 