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

const CurrentHalfSeason = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    seasonStats: [],
    goalStats: [],
    formData: []
  });

  const getCurrentHalf = () => {
    // Temporarily subtract one year for testing - REMOVE THIS LINE LATER
    const now = new Date(new Date().setFullYear(new Date().getFullYear()));
    const year = now.getFullYear();
    const isFirstHalf = now.getMonth() < 6; // Before July (0-based months)
    
    return {
      year,
      half: isFirstHalf ? 1 : 2,
      startDate: isFirstHalf ? `${year}-01-01` : `${year}-07-01`,
      endDate: isFirstHalf ? `${year}-06-30` : `${year}-12-31`,
      description: `${isFirstHalf ? 'First' : 'Second'} Half ${year}`
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentPeriod = getCurrentHalf();
        console.log('Current period:', currentPeriod);

        const response = await fetch('/api/stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDate: currentPeriod.startDate,
            endDate: currentPeriod.endDate
          })
        });
        
        console.log('API Response:', response.status);
        const result = await response.json();
        console.log('API Data:', result);
        
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
  }, []);

  const renderMainStats = () => (
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
            <TableHead>Last 5</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.seasonStats.map((player, index) => {
const form = stats.formData.find(f => f.name === player.name)
              ?.last_5_games?.split(', ') || [];
            const losses = player.games_played - player.wins - player.draws;
            
            return (
              <TableRow key={index}>
                <TableCell className="font-medium">{player.name}</TableCell>
                <TableCell className="text-center">{player.games_played}</TableCell>
                <TableCell className={`text-center bg-green-${player.wins >= 10 ? '600' : 
                  player.wins >= 7 ? '500' : 
                  player.wins >= 4 ? '400' : 
                  player.wins >= 1 ? '300' : '200'}`}>
                  {player.wins}
                </TableCell>
                <TableCell className="text-center">{player.draws}</TableCell>
                <TableCell className={`text-center bg-red-${losses >= 10 ? '600' : 
                  losses >= 7 ? '500' : 
                  losses >= 4 ? '400' : 
                  losses >= 1 ? '300' : '200'}`}>
                  {losses}
                </TableCell>
                <TableCell className="text-center">{player.goals}</TableCell>
                <TableCell className={`text-center bg-green-${player.heavy_wins >= 5 ? '600' : 
                  player.heavy_wins >= 3 ? '500' : 
                  player.heavy_wins >= 1 ? '400' : '200'}`}>
                  {player.heavy_wins}
                </TableCell>
                <TableCell className={`text-center bg-red-${player.heavy_losses >= 5 ? '600' : 
                  player.heavy_losses >= 3 ? '500' : 
                  player.heavy_losses >= 1 ? '400' : '200'}`}>
                  {player.heavy_losses}
                </TableCell>
                <TableCell className={`text-center bg-green-${player.clean_sheets >= 5 ? '600' : 
                  player.clean_sheets >= 3 ? '500' : 
                  player.clean_sheets >= 1 ? '400' : '200'}`}>
                  {player.clean_sheets}
                </TableCell>
                <TableCell className="text-center">{player.win_percentage}%</TableCell>
                <TableCell className="text-center font-bold">{player.fantasy_points}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {form.map((result, i) => (
                      <span
                        key={i}
                        className={`inline-block w-6 h-6 text-center rounded ${
                          result.includes('W') ? 'bg-green-500' :
                          result === 'D' ? 'bg-yellow-500' :
                          'bg-red-500'
                        } text-white`}
                      >
                        {result.replace('H', '')}
                      </span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const renderGoalStats = () => (
    <div>
      <h3 className="text-xl font-semibold mb-4">Goalscoring Leaderboard</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead className="text-center">Goals</TableHead>
            <TableHead className="text-center">MPG</TableHead>
            <TableHead className="text-center w-48">Last 5</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.goalStats.map((player, index) => (
            <TableRow key={index}>
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
              <TableCell>
                <div className="flex gap-1">
                  {player.last_five_games?.split(',').map((goals, i) => {
                    const goalCount = parseInt(goals);
                    const maxGoals = Math.max(...stats.goalStats.map(p => p.max_goals_in_game));
                    
                    return (
                      <span
                        key={i}
                        className={`inline-block w-6 h-6 text-center rounded ${
                          goalCount === 0 ? 'bg-gray-200' :
                          goalCount === maxGoals ? 'bg-yellow-500' :
                          goalCount === maxGoals - 1 ? 'bg-yellow-400' :
                          goalCount === maxGoals - 2 ? 'bg-yellow-300' :
                          'bg-yellow-200'
                        } text-black`}
                      >
                        {goals || ''}
                      </span>
                    );
                  })}
                </div>
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
      <h2 className="text-2xl font-bold mb-6">
        Current Half-Season Performance - {getCurrentHalf().description}
      </h2>
      
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

export default CurrentHalfSeason;