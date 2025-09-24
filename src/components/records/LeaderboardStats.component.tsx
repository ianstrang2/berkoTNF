'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlayerWithStats, PlayerProfile, Club } from '@/types/player.types';

interface SortConfig {
  key: keyof PlayerWithStats;
  direction: 'asc' | 'desc';
}

const LeaderboardStats: React.FC = () => {
  const [stats, setStats] = useState<PlayerWithStats[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'fantasyPoints',
    direction: 'desc'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, playersResponse] = await Promise.all([
          fetch('/api/allTimeStats'),
          fetch('/api/players')
        ]);

        const result = await statsResponse.json();
        if (result.data) {
          // No transformation needed, API provides canonical PlayerWithStats
          setStats(result.data);
        }

        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          // No transformation needed, API provides canonical PlayerProfile
          setAllPlayers(playersData.data || []);
        } else {
          console.warn('Failed to fetch players for LeaderboardStats component');
          setAllPlayers([]);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  const sortData = (key: keyof PlayerWithStats) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...stats].sort((a, b) => {
      if (a[key] === null || a[key] === undefined) return 1;
      if (b[key] === null || b[key] === undefined) return -1;

      const numericFields: (keyof PlayerWithStats)[] = [
        'fantasyPoints', 'gamesPlayed', 'wins', 'draws', 'losses', 
        'goals', 'winPercentage', 'minutesPerGoal', 'heavyWins', 
        'heavyWinPercentage', 'heavyLosses', 'heavyLossPercentage', 
        'cleanSheets', 'cleanSheetPercentage', 'pointsPerGame'
      ];
      
      if (numericFields.includes(key)) {
        const valueA = parseFloat(String(a[key]));
        const valueB = parseFloat(String(b[key]));
        return direction === 'asc' ? valueA - valueB : valueB - valueA;
      }
      
      if (typeof a[key] === 'string' && typeof b[key] === 'string') {
        const valueA = (a[key] as string).toLowerCase();
        const valueB = (b[key] as string).toLowerCase();
        
        if (direction === 'asc') {
          return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        }
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
      
      if (direction === 'asc') {
        return (a[key] as any) > (b[key] as any) ? 1 : (a[key] as any) < (b[key] as any) ? -1 : 0;
      }
      return (a[key] as any) < (b[key] as any) ? 1 : (a[key] as any) > (b[key] as any) ? -1 : 0;
    });
    
    setStats(sortedData);
  };

  const getSortIndicator = (key: keyof PlayerWithStats) => {
    if (sortConfig.key === key) {
      return (
        <span className="ml-1 text-slate-700">
          {sortConfig.direction === 'desc' ? '▼' : '▲'}
        </span>
      );
    }
    return null;
  };

  const getPlayerByName = (name: string) => {
    return allPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
  };

  const getPlayerIdByName = (name: string): string | undefined => {
    const player = getPlayerByName(name);
    return player?.id;
  };

  if (loading) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
        <div className="text-center">
          <h6 className="mb-2 text-lg">Loading...</h6>
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border lg:w-fit">
      <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
        <h5 className="mb-0">All-Time Leaderboard</h5>
      </div>
      {/* Container for horizontal scrolling only */}
      <div className="overflow-x-auto">
        <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500 relative">
          <thead className="align-bottom">
            <tr>
              <th className="sticky left-0 z-40 px-1 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-8 text-center">#</th>
              <th className="sticky left-8 z-40 px-1 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-10"></th>
              <th 
                onClick={() => sortData('name')}
                className="sticky left-[4.5rem] z-40 px-2 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 text-left min-w-[120px]"
              >
                Player {getSortIndicator('name')}
              </th>
              <th 
                onClick={() => sortData('fantasyPoints')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[50px]"
              >
                Pts {getSortIndicator('fantasyPoints')}
              </th>
              <th 
                onClick={() => sortData('gamesPlayed')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[40px]"
              >
                P {getSortIndicator('gamesPlayed')}
              </th>
              <th 
                onClick={() => sortData('wins')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[40px]"
              >
                W {getSortIndicator('wins')}
              </th>
              <th 
                onClick={() => sortData('draws')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[40px]"
              >
                D {getSortIndicator('draws')}
              </th>
              <th 
                onClick={() => sortData('losses')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[40px]"
              >
                L {getSortIndicator('losses')}
              </th>
              <th 
                onClick={() => sortData('goals')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[40px]"
              >
                G {getSortIndicator('goals')}
              </th>
              <th 
                onClick={() => sortData('winPercentage')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[50px]"
              >
                Win% {getSortIndicator('winPercentage')}
              </th>
              <th 
                onClick={() => sortData('minutesPerGoal')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[50px]"
              >
                MPG {getSortIndicator('minutesPerGoal')}
              </th>
              <th 
                onClick={() => sortData('heavyWins')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[40px]"
              >
                HW {getSortIndicator('heavyWins')}
              </th>
              <th 
                onClick={() => sortData('heavyWinPercentage')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[50px]"
              >
                HW% {getSortIndicator('heavyWinPercentage')}
              </th>
              <th 
                onClick={() => sortData('heavyLosses')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[40px]"
              >
                HL {getSortIndicator('heavyLosses')}
              </th>
              <th 
                onClick={() => sortData('heavyLossPercentage')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[50px]"
              >
                HL% {getSortIndicator('heavyLossPercentage')}
              </th>
              <th 
                onClick={() => sortData('cleanSheets')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[40px]"
              >
                CS {getSortIndicator('cleanSheets')}
              </th>
              <th 
                onClick={() => sortData('cleanSheetPercentage')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[50px]"
              >
                CS% {getSortIndicator('cleanSheetPercentage')}
              </th>
              <th 
                onClick={() => sortData('pointsPerGame')}
                className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700 min-w-[50px]"
              >
                PPG {getSortIndicator('pointsPerGame')}
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map((player, index) => {
              const isRetired = player.isRetired;
              const actualPlayer = getPlayerByName(player.name);
              const isRinger = actualPlayer?.isRinger;
              const wins = player.wins || 0;
              const losses = (player.gamesPlayed || 0) - (player.wins || 0) - (player.draws || 0);
              const heavyWins = player.heavyWins || 0;
              const heavyLosses = player.heavyLosses || 0;
              const cleanSheets = player.cleanSheets || 0;
              const playerId = getPlayerIdByName(player.name);

              return (
                <tr key={index} className={`${isRetired ? 'opacity-60' : ''} hover:bg-gray-50`}>
                  {/* Sticky Data */}
                  <td className="sticky left-0 z-20 p-2 align-middle bg-white border-b whitespace-nowrap text-center w-8">
                    <span className="font-normal leading-normal text-sm">{index + 1}</span>
                  </td>
                  <td className="sticky left-8 z-20 p-2 align-middle bg-white border-b whitespace-nowrap w-10">
                    {player.club ? (
                      <img
                        src={`/club-logos-40px/${player.club.filename}`}
                        alt={player.club.name}
                        className="w-8 h-8"
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </td>
                  <td className="sticky left-[4.5rem] z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[120px]">
                    <div className="flex px-2 py-1">
                      <div className="flex flex-col justify-center">
                        <h6 className={`mb-0 leading-normal text-sm ${isRetired ? 'text-slate-400' : ''}`}>
                          {playerId && !isRinger ? (
                            <Link href={`/players/${playerId}`} className="hover:underline">
                              {player.name}
                            </Link>
                          ) : (
                            player.name
                          )}
                        </h6>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-semibold leading-normal text-sm">{player.fantasyPoints}</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{player.gamesPlayed}</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{wins}</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{player.draws}</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{losses}</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{player.goals}</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{Math.round(player.winPercentage)}%</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className={`leading-normal text-sm ${player.minutesPerGoal <= 90 ? 'text-green-500 font-semibold' : ''}`}>
                      {Math.round(player.minutesPerGoal)}
                    </span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{heavyWins}</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{Math.round(player.heavyWinPercentage)}%</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{heavyLosses}</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{Math.round(player.heavyLossPercentage)}%</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{cleanSheets}</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{Math.round(player.cleanSheetPercentage)}%</span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">{parseFloat(String(player.pointsPerGame)).toFixed(1)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardStats; 