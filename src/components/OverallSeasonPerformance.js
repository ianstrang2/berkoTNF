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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "./ui/tabs";

const OverallSeasonPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    seasonStats: [],
    goalStats: [],
    formData: []
  });
  const [selectedYear, setSelectedYear] = useState(2025);
  const yearOptions = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011];

  const getGreenColor = (value, max) => {
    const percentage = value / max;
    if (percentage > 0.8) return 'bg-green-600';
    if (percentage > 0.6) return 'bg-green-500';
    if (percentage > 0.4) return 'bg-green-400';
    if (percentage > 0.2) return 'bg-green-300';
    return 'bg-green-200';
  };

  const getRedColor = (value, max) => {
    const percentage = value / max;
    if (percentage > 0.8) return 'bg-red-600';
    if (percentage > 0.6) return 'bg-red-500';
    if (percentage > 0.4) return 'bg-red-400';
    if (percentage > 0.2) return 'bg-red-300';
    return 'bg-red-200';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDate: `${selectedYear}-01-01`,
            endDate: `${selectedYear}-12-31`
          })
        });
        
        const result = await response.json();
        
        if (result.data) {
          setStats(result.data);
        } else {
          console.error('No data received from API');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  const renderMainStats = () => {
    const maxWins = Math.max(...stats.seasonStats.map(p => p.wins), 1);
    const maxHeavyWins = Math.max(...stats.seasonStats.map(p => p.heavy_wins), 1);
    const maxCleanSheets = Math.max(...stats.seasonStats.map(p => p.clean_sheets), 1);
    const maxLosses = Math.max(...stats.seasonStats.map(p => 
      p.games_played - p.wins - p.draws), 1);
    const maxHeavyLosses = Math.max(...stats.seasonStats.map(p => p.heavy_losses), 1);

    return (
      <div>
        <h3 className="text-xl font-semibold mb-4">Points Leaderboard</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead className="text-center">P</TableHead>
              <TableHead className="text-center">W</TableHead>
              <TableHead className="text-center">D</TableHead>
              <TableHead className="text-center">L</TableHead>
              <TableHead className="text-center">Goals</TableHead>
              <TableHead className="text-center">Heavy W</TableHead>
              <TableHead className="text-center">Heavy L</TableHead>
              <TableHead className="text-center">Clean Sheet</TableHead>
              <TableHead className="text-center">Win %</TableHead>
              <TableHead className="text-center">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.seasonStats.map((player, index) => {
              const losses = player.games_played - player.wins - player.draws;
              
              return (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell className="text-center">{player.games_played}</TableCell>
                  <TableCell className={`text-center ${getGreenColor(player.wins, maxWins)}`}>
                    {player.wins}
                  </TableCell>
                  <TableCell className="text-center">{player.draws}</TableCell>
                  <TableCell className={`text-center ${getRedColor(losses, maxLosses)}`}>
                    {losses}
                  </TableCell>
                  <TableCell className="text-center">{player.goals}</TableCell>
                  <TableCell className={`text-center ${getGreenColor(player.heavy_wins, maxHeavyWins)}`}>
                    {player.heavy_wins}
                  </TableCell>
                  <TableCell className={`text-center ${getRedColor(player.heavy_losses, maxHeavyLosses)}`}>
                    {player.heavy_losses}
                  </TableCell>
                  <TableCell className={`text-center ${getGreenColor(player.clean_sheets, maxCleanSheets)}`}>
                    {player.clean_sheets}
                  </TableCell>
                  <TableCell className="text-center">{player.win_percentage}%</TableCell>
                  <TableCell className="text-center font-bold">{player.fantasy_points}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderGoalStats = () => (
    <div>
      <h3 className="text-xl font-semibold mb-4">Goalscoring Leaderboard</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead className="text-center">Goals</TableHead>
            <TableHead className="text-center">MPG</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.goalStats.map((player, index) => (
            <TableRow key={index} className="hover:bg-gray-50">
              <TableCell className="font-medium">{player.name}</TableCell>
              <TableCell className="text-center">{player.total_goals}</TableCell>
              <TableCell 
                className={`text-center ${
                  player.minutes_per_goal <= 60 ? 'bg-green-600' :
                  player.minutes_per_goal <= 90 ? 'bg-green-500' :
                  player.minutes_per_goal <= 120 ? 'bg-green-300' :
                  ''
                }`}
              >
                {player.minutes_per_goal}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
<div className="p-4">
  <div className="flex flex-wrap items-center gap-4 mb-6">
    <h2 className="text-2xl font-bold">Overall Season Performance</h2>
    <select 
      value={selectedYear}
      onChange={(e) => setSelectedYear(Number(e.target.value))}
      className="border rounded-md px-3 py-2 bg-white shadow hover:bg-gray-50"
    >
      {yearOptions.map(year => (
        <option key={year} value={year}>{year}</option>
      ))}
    </select>
  </div>

      
      {/* Desktop view - side by side */}
      <div className="hidden md:flex gap-8">
        <div className="flex-1">
          {renderMainStats()}
        </div>
        <div className="flex-1">
          {renderGoalStats()}
        </div>
      </div>

      {/* Mobile view - tabs */}
      <div className="md:hidden">
        <Tabs defaultValue="performance">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="performance">Points</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
          </TabsList>
          <TabsContent value="performance">
            {renderMainStats()}
          </TabsContent>
          <TabsContent value="goals">
            {renderGoalStats()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OverallSeasonPerformance;