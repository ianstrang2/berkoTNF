'use client';
import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/card';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { Tabs, Tab } from '@/components/ui/Tabs';

const OverallSeasonPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    seasonStats: [],
    goalStats: [],
    formData: []
  });
  const [selectedYear, setSelectedYear] = useState(2025);
  const [activeTab, setActiveTab] = useState("performance");
  const yearOptions = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011];

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
    return (
      <Card>
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-section tracking-tight">Points Leaderboard</h3>
        <Table responsive>
          <TableHead>
            <TableRow>
              <TableCell isHeader className="min-w-[150px]">Player</TableCell>
              <TableCell isHeader className="w-16">P</TableCell>
              <TableCell isHeader className="w-16">W</TableCell>
              <TableCell isHeader className="w-16">D</TableCell>
              <TableCell isHeader className="w-16">L</TableCell>
              <TableCell isHeader className="w-16">G</TableCell>
              <TableCell isHeader className="w-16">HW</TableCell>
              <TableCell isHeader className="w-16">HL</TableCell>
              <TableCell isHeader className="w-20">CS</TableCell>
              <TableCell isHeader className="w-20">Win %</TableCell>
              <TableCell isHeader className="w-20">Points</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats.seasonStats.map((player, index) => {
              const losses = player.games_played - player.wins - player.draws;
              
              return (
                <TableRow key={index}>
                  <TableCell className="font-medium text-primary-600">{player.name}</TableCell>
                  <TableCell>{player.games_played}</TableCell>
                  <TableCell>{player.wins}</TableCell>
                  <TableCell>{player.draws}</TableCell>
                  <TableCell>{losses}</TableCell>
                  <TableCell>{player.goals}</TableCell>
                  <TableCell>{player.heavy_wins}</TableCell>
                  <TableCell>{player.heavy_losses}</TableCell>
                  <TableCell>{player.clean_sheets}</TableCell>
                  <TableCell>{Math.round(player.win_percentage)}%</TableCell>
                  <TableCell className="font-bold">{player.fantasy_points}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    );
  };

  const renderGoalStats = () => (
    <Card>
      <h3 className="text-xl font-semibold text-center text-primary-600 mb-section tracking-tight">Goalscoring Leaderboard</h3>
      <Table responsive>
        <TableHead>
          <TableRow>
            <TableCell isHeader className="min-w-[150px]">Player</TableCell>
            <TableCell isHeader className="w-20">Goals</TableCell>
            <TableCell isHeader className="w-20">MPG</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stats.goalStats
            .filter(player => player.total_goals > 0)
            .map((player, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium text-primary-600">{player.name}</TableCell>
              <TableCell>{player.total_goals}</TableCell>
              <TableCell className={player.total_goals > 0 && player.minutes_per_goal <= 90 ? 'text-success-600 font-medium' : ''}>
                {player.minutes_per_goal}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

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
      <div className="flex flex-wrap items-center gap-element">
        <h2 className="text-2xl font-bold text-primary-600 tracking-tight">Overall Season Performance</h2>
        <select 
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="form-select rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
        >
          {yearOptions.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Desktop view */}
      <div className="hidden md:grid md:grid-cols-2 gap-grid">
        {renderMainStats()}
        {renderGoalStats()}
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <Tabs 
          defaultTab={activeTab === 'performance' ? 0 : 1} 
          onChange={(index) => setActiveTab(index === 0 ? 'performance' : 'goals')}
          variant="pills"
        >
          <Tab label="Points">
            {renderMainStats()}
          </Tab>
          <Tab label="Goals">
            {renderGoalStats()}
          </Tab>
        </Tabs>
      </div>
    </div>
  );
};

export default OverallSeasonPerformance;