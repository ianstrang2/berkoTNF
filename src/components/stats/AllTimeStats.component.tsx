'use client';
import React, { useState, useEffect } from 'react';

interface PlayerStats {
  name: string;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  win_percentage: number;
  minutes_per_goal: number;
  heavy_wins: number;
  heavy_win_percentage: number;
  heavy_losses: number;
  heavy_loss_percentage: number;
  clean_sheets: number;
  clean_sheet_percentage: number;
  fantasy_points: number;
  points_per_game: number;
  is_retired?: boolean;
}

interface SortConfig {
  key: keyof PlayerStats;
  direction: 'asc' | 'desc';
}

const AllTimeStats: React.FC = () => {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'fantasy_points',
    direction: 'desc'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/allTimeStats');
        const result = await response.json();
        
        if (result.data) {
          setStats(result.data);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  const sortData = (key: keyof PlayerStats) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...stats].sort((a, b) => {
      // Handle null or undefined values
      if (a[key] === null || a[key] === undefined) return 1;
      if (b[key] === null || b[key] === undefined) return -1;

      // Numerical fields: always convert to numbers for comparison
      const numericFields: (keyof PlayerStats)[] = [
        'fantasy_points', 'games_played', 'wins', 'draws', 'losses', 
        'goals', 'win_percentage', 'minutes_per_goal', 'heavy_wins', 
        'heavy_win_percentage', 'heavy_losses', 'heavy_loss_percentage', 
        'clean_sheets', 'clean_sheet_percentage', 'points_per_game'
      ];
      
      if (numericFields.includes(key)) {
        const valueA = parseFloat(String(a[key]));
        const valueB = parseFloat(String(b[key]));
        return direction === 'asc' ? valueA - valueB : valueB - valueA;
      }
      
      // String fields
      if (typeof a[key] === 'string' && typeof b[key] === 'string') {
        const valueA = (a[key] as string).toLowerCase();
        const valueB = (b[key] as string).toLowerCase();
        
        if (direction === 'asc') {
          return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        }
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
      
      // Boolean and other types
      if (direction === 'asc') {
        return a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0;
      }
      return a[key] < b[key] ? 1 : a[key] > b[key] ? -1 : 0;
    });
    
    setStats(sortedData);
  };

  const getSortIndicator = (key: keyof PlayerStats) => {
    if (sortConfig.key === key) {
      return (
        <span className="ml-1 text-slate-700">
          {sortConfig.direction === 'desc' ? '▼' : '▲'}
        </span>
      );
    }
    return null;
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
      <div className="w-auto flex-none">
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
            <h5 className="mb-0">All-Time Leaderboard</h5>
          </div>
          <div className="overflow-x-auto px-0 pt-0 pb-2">
            <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500">
              <thead className="align-bottom">
                <tr>
                  <th 
                    onClick={() => sortData('name')}
                    className="px-6 py-3 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    Player {getSortIndicator('name')}
                  </th>
                  <th 
                    onClick={() => sortData('fantasy_points')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    Pts {getSortIndicator('fantasy_points')}
                  </th>
                  <th 
                    onClick={() => sortData('games_played')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    P {getSortIndicator('games_played')}
                  </th>
                  <th 
                    onClick={() => sortData('wins')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    W {getSortIndicator('wins')}
                  </th>
                  <th 
                    onClick={() => sortData('draws')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    D {getSortIndicator('draws')}
                  </th>
                  <th 
                    onClick={() => sortData('losses')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    L {getSortIndicator('losses')}
                  </th>
                  <th 
                    onClick={() => sortData('goals')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    G {getSortIndicator('goals')}
                  </th>
                  <th 
                    onClick={() => sortData('win_percentage')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    Win% {getSortIndicator('win_percentage')}
                  </th>
                  <th 
                    onClick={() => sortData('minutes_per_goal')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    MPG {getSortIndicator('minutes_per_goal')}
                  </th>
                  <th 
                    onClick={() => sortData('heavy_wins')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    HW {getSortIndicator('heavy_wins')}
                  </th>
                  <th 
                    onClick={() => sortData('heavy_win_percentage')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    HW% {getSortIndicator('heavy_win_percentage')}
                  </th>
                  <th 
                    onClick={() => sortData('heavy_losses')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    HL {getSortIndicator('heavy_losses')}
                  </th>
                  <th 
                    onClick={() => sortData('heavy_loss_percentage')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    HL% {getSortIndicator('heavy_loss_percentage')}
                  </th>
                  <th 
                    onClick={() => sortData('clean_sheets')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    CS {getSortIndicator('clean_sheets')}
                  </th>
                  <th 
                    onClick={() => sortData('clean_sheet_percentage')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    CS% {getSortIndicator('clean_sheet_percentage')}
                  </th>
                  <th 
                    onClick={() => sortData('points_per_game')}
                    className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-pointer hover:text-slate-700"
                  >
                    PPG {getSortIndicator('points_per_game')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.map((player, index) => {
                  const isRetired = player.is_retired;
                  const wins = player.wins || 0;
                  const losses = player.losses || 0;
                  const heavyWins = player.heavy_wins || 0;
                  const heavyLosses = player.heavy_losses || 0;
                  const cleanSheets = player.clean_sheets || 0;

                  return (
                    <tr key={index} className={isRetired ? 'opacity-60' : ''}>
                      <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                        <div className="flex px-2 py-1">
                          <div className="flex flex-col justify-center">
                            <h6 className={`mb-0 leading-normal text-sm ${isRetired ? 'text-slate-400' : ''}`}>{player.name}</h6>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-semibold leading-normal text-sm">{player.fantasy_points}</span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-normal leading-normal text-sm">{player.games_played}</span>
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
                        <span className="font-normal leading-normal text-sm">{Math.round(player.win_percentage)}%</span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className={`leading-normal text-sm ${player.minutes_per_goal <= 90 ? 'text-green-500 font-semibold' : ''}`}>
                          {Math.round(player.minutes_per_goal)}
                        </span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-normal leading-normal text-sm">{heavyWins}</span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-normal leading-normal text-sm">{Math.round(player.heavy_win_percentage)}%</span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-normal leading-normal text-sm">{heavyLosses}</span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-normal leading-normal text-sm">{Math.round(player.heavy_loss_percentage)}%</span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-normal leading-normal text-sm">{cleanSheets}</span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-normal leading-normal text-sm">{Math.round(player.clean_sheet_percentage)}%</span>
                      </td>
                      <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                        <span className="font-normal leading-normal text-sm">{parseFloat(String(player.points_per_game)).toFixed(1)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllTimeStats; 