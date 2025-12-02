'use client';
import React from 'react';
import Link from 'next/link';
import { PlayerProfile } from '@/types/player.types';
import { useHonourRoll, type Records } from '@/hooks/queries/useHonourRoll.hook';
import { usePlayers } from '@/hooks/queries/usePlayers.hook';

const Feats: React.FC = () => {
  const { data: honourRollData, isLoading: honourRollLoading } = useHonourRoll();
  const { data: allPlayers = [], isLoading: playersLoading } = usePlayers();
  const loading = honourRollLoading || playersLoading;

  // Extract records from honour roll data
  const recordsData = honourRollData?.records?.[0]?.records;
  const records: Records | null = recordsData ? {
    consecutive_goals_streak: recordsData.consecutive_goals_streak,
    most_goals_in_game: recordsData.most_goals_in_game,
    attendance_streak: recordsData.attendance_streak,
    biggest_victory: recordsData.biggest_victory,
    streaks: {
      'Win Streak': recordsData.streaks?.['Win Streak'],
      'Losing Streak': recordsData.streaks?.['Losing Streak'],
      'Winless Streak': recordsData.streaks?.['Winless Streak'],
      'Undefeated Streak': recordsData.streaks?.['Undefeated Streak']
    }
  } : null;

  const getPlayerIdByName = (name: string): string | undefined => {
    if (!name) return undefined;
    const player = allPlayers.find(p => p.name.toLowerCase() === name.toLowerCase().trim());
    return player?.id;
  };

  // New helper function to render linked player names
  const renderLinkedPlayerNames = (
    namesInput: Array<{ name: string }> | string | undefined
  ): JSX.Element[] => {
    if (!namesInput) return [<></>];

    let namesArray: string[] = [];
    if (typeof namesInput === 'string') {
      namesArray = namesInput.split(',').map(name => name.trim());
    } else if (Array.isArray(namesInput)) {
      namesArray = namesInput.map(item => item.name.trim());
    }

    return namesArray.map((name, index) => {
      const cleanNameForIdLookup = name.replace(/\s*\(\d+\)$/, '').trim();
      const playerId = getPlayerIdByName(cleanNameForIdLookup);

      const content = playerId ? (
        <Link href={`/player/profiles/${playerId}`} className="hover:underline">
          {name}
        </Link>
      ) : (
        name
      );
      return (
        <React.Fragment key={index}>
          {content}
          {index < namesArray.length - 1 && ', '}
        </React.Fragment>
      );
    });
  };
  
  // Helper to render a single player name with a link
  const renderSinglePlayerLink = (name: string) => {
    const cleanNameForIdLookup = name.replace(/\s*\(\d+\)$/, '').trim();
    const playerId = getPlayerIdByName(cleanNameForIdLookup);

    if (playerId) {
      return (
        <Link href={`/player/profiles/${playerId}`} className="hover:underline">
          {name}
        </Link>
      );
    }
    return <>{name}</>;
  };

  // Helper function to get the record value for joint winners display
  const getRecordValue = (records: any[], valueKey: string): any => {
    if (!records || records.length === 0) return null;
    // For joint winners, they should all have the same value, so we can safely take the first one
    return records[0][valueKey];
  };

  const renderRecords = () => {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border lg:w-fit">
        <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4 pb-0">
          <h5 className="mb-0">All-Time Feats</h5>
        </div>
        {/* Container for horizontal scrolling only */}
        <div className="overflow-x-auto p-4">
          <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500 relative">
            <thead className="align-bottom">
              <tr>
                {/* Sticky Headers */}
                <th className="sticky left-0 z-30 px-2 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[120px]">
                  Record
                </th>
                <th className="sticky left-[120px] z-30 px-1 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-10"></th>
                {/* Scrollable Headers */}
                <th className="px-6 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[200px] max-w-[300px]">
                  Player(s) / Team(s)
                </th>
                <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[100px]">
                  Details
                </th>
                <th className="px-6 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[180px]">
                  Date / Period
                </th>
              </tr>
            </thead>
            <tbody>
              {records && (
                <>
                  {records.most_goals_in_game && (
                    <tr className="hover:bg-gray-50">
                      <td className="sticky left-0 z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[120px]">
                        <span className="font-semibold leading-normal text-sm text-slate-700">Goals in a Game</span>
                      </td>
                      <td className="sticky left-[120px] z-20 p-2 align-middle bg-white border-b whitespace-nowrap w-10">
                        {records.most_goals_in_game[0]?.selected_club ? (
                          <img
                            src={`/club-logos-40px/${records.most_goals_in_game[0].selected_club.filename}`}
                            alt={records.most_goals_in_game[0].selected_club.name}
                            className="w-8 h-8"
                          />
                        ) : (
                          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        )}
                      </td>
                      <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                        <div className="px-2 py-1">
                          <div className="flex flex-col justify-center">
                            <h6 className="mb-0 leading-normal text-sm font-semibold break-words">
                              {renderLinkedPlayerNames(records.most_goals_in_game)}
                            </h6>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-normal leading-normal text-sm">
                          {getRecordValue(records.most_goals_in_game, 'goals')} goals
                        </span>
                      </td>
                      <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                        {records.most_goals_in_game.map((record, index) => (
                          <div key={`game-${index}`} className="mb-1 text-sm" suppressHydrationWarning>
                            {renderSinglePlayerLink(record.name)}: {new Date(record.date).toLocaleDateString()}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}

                  {records.streaks && Object.entries(records.streaks).map(([streakType, streakData], streakIndex) => 
                    streakData && streakData.holders && streakData.holders.length > 0 && (
                      <tr key={streakType} className="hover:bg-gray-50">
                        <td className="sticky left-0 z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[120px]">
                          <span className="font-semibold leading-normal text-sm text-slate-700">
                            {streakType}
                          </span>
                        </td>
                        <td className="sticky left-[120px] z-20 p-2 align-middle bg-white border-b whitespace-nowrap w-10">
                          {streakData.holders[0]?.selected_club ? (
                            <img
                              src={`/club-logos-40px/${streakData.holders[0].selected_club.filename}`}
                              alt={streakData.holders[0].selected_club.name}
                              className="w-8 h-8"
                            />
                          ) : (
                            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          )}
                        </td>
                        <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                          <div className="px-2 py-1">
                            <div className="flex flex-col justify-center">
                              <h6 className="mb-0 leading-normal text-sm font-semibold break-words">
                                {renderLinkedPlayerNames(streakData.holders)}
                              </h6>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-normal leading-normal text-sm">
                            {getRecordValue(streakData.holders, 'streak')} games
                          </span>
                        </td>
                        <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                          {streakData.holders.map((holder, index) => (
                            <div key={`streak-${index}`} className="mb-1 text-sm" suppressHydrationWarning>
                              {renderSinglePlayerLink(holder.name)}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                              {new Date(holder.end_date).toLocaleDateString()}
                            </div>
                          ))}
                        </td>
                      </tr>
                    )
                  )}

                  {records.consecutive_goals_streak && records.consecutive_goals_streak.length > 0 && (
                    <tr className="hover:bg-gray-50">
                      <td className="sticky left-0 z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[120px]">
                        <span className="font-semibold leading-normal text-sm text-slate-700">Games Scoring</span>
                      </td>
                      <td className="sticky left-[120px] z-20 p-2 align-middle bg-white border-b whitespace-nowrap w-10">
                        {records.consecutive_goals_streak[0]?.selected_club ? (
                          <img
                            src={`/club-logos-40px/${records.consecutive_goals_streak[0].selected_club.filename}`}
                            alt={records.consecutive_goals_streak[0].selected_club.name}
                            className="w-8 h-8"
                          />
                        ) : (
                          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        )}
                      </td>
                      <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                        <div className="px-2 py-1">
                          <div className="flex flex-col justify-center">
                            <h6 className="mb-0 leading-normal text-sm font-semibold break-words">
                              {renderLinkedPlayerNames(records.consecutive_goals_streak)}
                            </h6>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-normal leading-normal text-sm">
                          {getRecordValue(records.consecutive_goals_streak, 'streak')} games
                        </span>
                      </td>
                      <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                        {records.consecutive_goals_streak.map((holder, index) => (
                          <div key={`consecutive-${index}`} className="mb-1 text-sm" suppressHydrationWarning>
                            {renderSinglePlayerLink(holder.name)}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                            {new Date(holder.end_date).toLocaleDateString()}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}

                  {records.attendance_streak && records.attendance_streak.length > 0 && (
                    <tr className="hover:bg-gray-50">
                      <td className="sticky left-0 z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[120px]">
                        <span className="font-semibold leading-normal text-sm text-slate-700">Attendance Streak</span>
                      </td>
                      <td className="sticky left-[120px] z-20 p-2 align-middle bg-white border-b whitespace-nowrap w-10">
                        {records.attendance_streak[0]?.selected_club ? (
                          <img
                            src={`/club-logos-40px/${records.attendance_streak[0].selected_club.filename}`}
                            alt={records.attendance_streak[0].selected_club.name}
                            className="w-8 h-8"
                          />
                        ) : (
                          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        )}
                      </td>
                      <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                        <div className="px-2 py-1">
                          <div className="flex flex-col justify-center">
                            <h6 className="mb-0 leading-normal text-sm font-semibold break-words">
                              {renderLinkedPlayerNames(records.attendance_streak)}
                            </h6>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-normal leading-normal text-sm">
                          {getRecordValue(records.attendance_streak, 'streak')} games
                        </span>
                      </td>
                      <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                        {records.attendance_streak.map((holder, index) => (
                          <div key={`attendance-${index}`} className="mb-1 text-sm" suppressHydrationWarning>
                            {renderSinglePlayerLink(holder.name)}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                            {new Date(holder.end_date).toLocaleDateString()}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}

                  {records.biggest_victory && records.biggest_victory.length > 0 && (
                    <tr className="hover:bg-gray-50">
                      <td className="sticky left-0 z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[120px]">
                        <span className="font-semibold leading-normal text-sm text-slate-700">Biggest Victory</span>
                      </td>
                      <td className="sticky left-[120px] z-20 p-2 align-middle bg-white border-b whitespace-nowrap w-10">
                        <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" clipRule="evenodd" />
                        </svg>
                      </td>
                      <td className="p-2 align-middle bg-transparent border-b min-w-[200px] max-w-[300px] break-words">
                        <div className="px-2 py-1">
                          {records.biggest_victory[0].winning_team === 'A' ? (
                            <>
                              <div className="mb-1 text-sm break-words">
                                Team A ({records.biggest_victory[0].team_a_score}): {renderLinkedPlayerNames(records.biggest_victory[0].team_a_players)}
                              </div>
                              <div className="mb-0 text-sm break-words">
                                Team B ({records.biggest_victory[0].team_b_score}): {renderLinkedPlayerNames(records.biggest_victory[0].team_b_players)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="mb-1 text-sm break-words">
                                Team B ({records.biggest_victory[0].team_b_score}): {renderLinkedPlayerNames(records.biggest_victory[0].team_b_players)}
                              </div>
                              <div className="mb-0 text-sm break-words">
                                Team A ({records.biggest_victory[0].team_a_score}): {renderLinkedPlayerNames(records.biggest_victory[0].team_a_players)}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-normal leading-normal text-sm">
                          {records.biggest_victory[0].team_a_score}-{records.biggest_victory[0].team_b_score}
                        </span>
                      </td>
                      <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="text-sm text-slate-400" suppressHydrationWarning>
                          {new Date(records.biggest_victory[0].date).toLocaleDateString()}
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
        {renderRecords()}
      </div>
    </div>
  );
};

export default Feats; 