'use client';
import React, { useState, useEffect } from 'react';
import Card from '@/components/ui-kit/Card.component';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table.component';

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
        <span className="ml-related text-primary-600">
          {sortConfig.direction === 'desc' ? '▼' : '▲'}
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="text-center">
        <div className="text-xl font-semibold text-primary-600 mb-element">Loading...</div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-section">
      <h2 className="text-2xl font-bold text-center text-primary-600 tracking-tight">All-Time Stats</h2>
      <Card>
        <div className="overflow-x-auto">
          <Table responsive>
            <TableHead>
              <TableRow>
                <TableCell isHeader onClick={() => sortData('name')} className="min-w-[150px] cursor-pointer hover:text-primary-600">
                  Player {getSortIndicator('name')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('fantasy_points')} className="w-20 cursor-pointer hover:text-primary-600">
                  Pts {getSortIndicator('fantasy_points')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('games_played')} className="w-16 cursor-pointer hover:text-primary-600">
                  P {getSortIndicator('games_played')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('wins')} className="w-16 cursor-pointer hover:text-primary-600">
                  W {getSortIndicator('wins')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('draws')} className="w-16 cursor-pointer hover:text-primary-600">
                  D {getSortIndicator('draws')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('losses')} className="w-16 cursor-pointer hover:text-primary-600">
                  L {getSortIndicator('losses')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('goals')} className="w-16 cursor-pointer hover:text-primary-600">
                  G {getSortIndicator('goals')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('win_percentage')} className="w-20 cursor-pointer hover:text-primary-600">
                  Win% {getSortIndicator('win_percentage')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('minutes_per_goal')} className="w-20 cursor-pointer hover:text-primary-600">
                  MPG {getSortIndicator('minutes_per_goal')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('heavy_wins')} className="w-16 cursor-pointer hover:text-primary-600">
                  HW {getSortIndicator('heavy_wins')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('heavy_win_percentage')} className="w-20 cursor-pointer hover:text-primary-600">
                  HW% {getSortIndicator('heavy_win_percentage')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('heavy_losses')} className="w-16 cursor-pointer hover:text-primary-600">
                  HL {getSortIndicator('heavy_losses')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('heavy_loss_percentage')} className="w-20 cursor-pointer hover:text-primary-600">
                  HL% {getSortIndicator('heavy_loss_percentage')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('clean_sheets')} className="w-16 cursor-pointer hover:text-primary-600">
                  CS {getSortIndicator('clean_sheets')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('clean_sheet_percentage')} className="w-20 cursor-pointer hover:text-primary-600">
                  CS% {getSortIndicator('clean_sheet_percentage')}
                </TableCell>
                <TableCell isHeader onClick={() => sortData('points_per_game')} className="w-20 cursor-pointer hover:text-primary-600">
                  PPG {getSortIndicator('points_per_game')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.map((player, index) => {
                const isRetired = player.is_retired;
                const wins = player.wins || 0;
                const losses = player.losses || 0;
                const heavyWins = player.heavy_wins || 0;
                const heavyLosses = player.heavy_losses || 0;
                const cleanSheets = player.clean_sheets || 0;

                return (
                  <TableRow key={index} className={isRetired ? 'text-neutral-500' : ''}>
                    <TableCell className={`font-medium ${isRetired ? 'text-neutral-500' : 'text-primary-600'}`}>
                      {player.name}
                    </TableCell>
                    <TableCell className="font-medium text-primary-600">{player.fantasy_points}</TableCell>
                    <TableCell>{player.games_played}</TableCell>
                    <TableCell>{wins}</TableCell>
                    <TableCell>{player.draws}</TableCell>
                    <TableCell>{losses}</TableCell>
                    <TableCell>{player.goals}</TableCell>
                    <TableCell>{Math.round(player.win_percentage)}%</TableCell>
                    <TableCell className={player.minutes_per_goal <= 90 ? 'text-success-600 font-medium' : ''}>
                      {Math.round(player.minutes_per_goal)}
                    </TableCell>
                    <TableCell>{heavyWins}</TableCell>
                    <TableCell>{Math.round(player.heavy_win_percentage)}%</TableCell>
                    <TableCell>{heavyLosses}</TableCell>
                    <TableCell>{Math.round(player.heavy_loss_percentage)}%</TableCell>
                    <TableCell>{cleanSheets}</TableCell>
                    <TableCell>{Math.round(player.clean_sheet_percentage)}%</TableCell>
                    <TableCell>{player.points_per_game}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default AllTimeStats; 