'use client';
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table/table";

const AllTimeStats = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({
    key: 'fantasy_points', // Default sort by Fantasy Points
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

  const getGamesPlayedColor = (games) => {
    if (games >= 400) return 'bg-green-600';
    if (games >= 300) return 'bg-green-500';
    if (games >= 200) return 'bg-green-400';
    if (games >= 100) return 'bg-yellow-200';
    return '';
  };

  const getGoalsColor = (goals) => {
    if (goals >= 300) return 'bg-green-600';
    if (goals >= 200) return 'bg-green-500';
    if (goals >= 100) return 'bg-green-400';
    if (goals >= 50) return 'bg-yellow-200';
    return '';
  };

  const getMPGColor = (mpg) => {
    if (mpg <= 60) return 'bg-green-600';
    if (mpg <= 90) return 'bg-green-500';
    if (mpg <= 120) return 'bg-green-400';
    return '';
  };

  const sortData = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...stats].sort((a, b) => {
      // Handle null or undefined values
      if (a[key] === null || a[key] === undefined) return 1;
      if (b[key] === null || b[key] === undefined) return -1;
      
      // Handle percentage values
      if (key.includes('percentage')) {
        const valueA = parseFloat(a[key]);
        const valueB = parseFloat(b[key]);
        if (direction === 'asc') {
          return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        }
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
      
      // Handle numeric and string values differently
      const valueA = typeof a[key] === 'string' ? a[key].toLowerCase() : a[key];
      const valueB = typeof b[key] === 'string' ? b[key].toLowerCase() : b[key];
      
      if (direction === 'asc') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      }
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    });
    
    setStats(sortedData);
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return (
        <span className="ml-2 inline-block text-xs font-bold">
          {sortConfig.direction === 'desc' ? '▼' : '▲'}
        </span>
      );
    }
    return null;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">All-Time Stats</h2>
      <div className="max-h-[calc(100vh-200px)] border rounded-lg">
        <div className="relative overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  onClick={() => sortData('name')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    Player {getSortIndicator('name')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('games_played')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    P {getSortIndicator('games_played')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('wins')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    W {getSortIndicator('wins')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('draws')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    D {getSortIndicator('draws')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('losses')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    L {getSortIndicator('losses')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('goals')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    Goals {getSortIndicator('goals')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('win_percentage')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    Win % {getSortIndicator('win_percentage')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('minutes_per_goal')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    MPG {getSortIndicator('minutes_per_goal')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('heavy_wins')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    Heavy W {getSortIndicator('heavy_wins')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('heavy_win_percentage')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    Heavy W % {getSortIndicator('heavy_win_percentage')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('heavy_losses')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    Heavy L {getSortIndicator('heavy_losses')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('heavy_loss_percentage')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    Heavy L % {getSortIndicator('heavy_loss_percentage')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('clean_sheets')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    Clean Sheets {getSortIndicator('clean_sheets')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('clean_sheet_percentage')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    Clean Sheet % {getSortIndicator('clean_sheet_percentage')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('fantasy_points')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    Points {getSortIndicator('fantasy_points')}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => sortData('points_per_game')} 
                  className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-50 text-center"
                >
                  <div className="flex items-center justify-center">
                    PPG {getSortIndicator('points_per_game')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((player, index) => {
                const isRetired = player.is_retired; // Ensure this field is correctly mapped
                const playerName = isRetired ? `${player.name} (r)` : player.name;

                return (
                  <TableRow key={index}>
                    <TableCell className={`font-medium ${isRetired ? 'text-red-600' : ''}`}>
                      {playerName}
                    </TableCell>
                    <TableCell className={`text-center ${getGamesPlayedColor(player.games_played)}`}>
                      {player.games_played}
                    </TableCell>
                    <TableCell className="text-center">{player.wins}</TableCell>
                    <TableCell className="text-center">{player.draws}</TableCell>
                    <TableCell className="text-center">{player.losses}</TableCell>
                    <TableCell className={`text-center ${getGoalsColor(player.goals)}`}>
                      {player.goals}
                    </TableCell>
                    <TableCell className="text-center">{player.win_percentage}%</TableCell>
                    <TableCell className={`text-center ${getMPGColor(player.minutes_per_goal)}`}>
                      {player.minutes_per_goal}
                    </TableCell>
                    <TableCell className="text-center">{player.heavy_wins}</TableCell>
                    <TableCell className="text-center">{player.heavy_win_percentage}%</TableCell>
                    <TableCell className="text-center">{player.heavy_losses}</TableCell>
                    <TableCell className="text-center">{player.heavy_loss_percentage}%</TableCell>
                    <TableCell className="text-center">{player.clean_sheets}</TableCell>
                    <TableCell className="text-center">{player.clean_sheet_percentage}%</TableCell>
                    <TableCell className="text-center font-bold">{player.fantasy_points}</TableCell>
                    <TableCell className="text-center">
                      {player.points_per_game}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AllTimeStats;