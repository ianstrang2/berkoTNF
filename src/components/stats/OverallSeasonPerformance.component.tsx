'use client';
import React, { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui-kit/Card.component';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table.component';
import { Tabs, Tab } from '@/components/ui-kit/Tabs.component';

interface PlayerStats {
  name: string;
  games_played: number;
  wins: number;
  draws: number;
  goals: number;
  heavy_wins: number;
  heavy_losses: number;
  clean_sheets: number;
  win_percentage: number;
  fantasy_points: number;
}

interface GoalStats {
  name: string;
  total_goals: number;
  minutes_per_goal: number;
}

interface FormData {
  name: string;
  last_5_games?: string;
}

interface StatsData {
  seasonStats: PlayerStats[];
  goalStats: GoalStats[];
  formData: FormData[];
}

const OverallSeasonPerformance: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<StatsData>({
    seasonStats: [],
    goalStats: [],
    formData: []
  });
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [activeTab, setActiveTab] = useState<string>("performance");
  const yearOptions: number[] = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011];
  const isMounted = useRef(true); // Track component mount state

  useEffect(() => {
    // Set isMounted ref to true when component mounts
    isMounted.current = true;
    
    // Clean up function that runs when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false; // For preventing race conditions
    
    const fetchData = async () => {
      try {
        // Early return if component is unmounting
        if (!isMounted.current) return;
        
        setLoading(true);
        
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
        
        // Early return if component is unmounting or request was cancelled
        if (!isMounted.current || isCancelled) return;
        
        const result = await response.json();
        
        if (result.data && result.data.seasonStats && result.data.seasonStats.length > 0) {
          // Only update state if component is still mounted
          if (isMounted.current && !isCancelled) {
            setStats(result.data);
          }
        } else {
          console.log('No data received from API');
          if (isMounted.current && !isCancelled) {
            setStats({
              seasonStats: [],
              goalStats: [],
              formData: []
            });
          }
        }
        
        if (isMounted.current && !isCancelled) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        if (isMounted.current && !isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isCancelled = true;
    };
  }, [selectedYear]);

  const renderMainStats = () => {
    return (
      <Card>
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-section tracking-tight">Points Leaderboard</h3>
        <Table responsive>
          <TableHead>
            <TableRow>
              <TableCell isHeader className="min-w-[150px]">Player</TableCell>
              <TableCell isHeader className="w-20">Points</TableCell>
              <TableCell isHeader className="w-16">P</TableCell>
              <TableCell isHeader className="w-16">W</TableCell>
              <TableCell isHeader className="w-16">D</TableCell>
              <TableCell isHeader className="w-16">L</TableCell>
              <TableCell isHeader className="w-16">G</TableCell>
              <TableCell isHeader className="w-16">HW</TableCell>
              <TableCell isHeader className="w-16">HL</TableCell>
              <TableCell isHeader className="w-20">CS</TableCell>
              <TableCell isHeader className="w-20">Win %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats.seasonStats.map((player, index) => {
              const losses = player.games_played - player.wins - player.draws;
              
              return (
                <TableRow key={index}>
                  <TableCell className="font-medium text-primary-600">{player.name}</TableCell>
                  <TableCell className="font-bold">{player.fantasy_points}</TableCell>
                  <TableCell>{player.games_played}</TableCell>
                  <TableCell>{player.wins}</TableCell>
                  <TableCell>{player.draws}</TableCell>
                  <TableCell>{losses}</TableCell>
                  <TableCell>{player.goals}</TableCell>
                  <TableCell>{player.heavy_wins}</TableCell>
                  <TableCell>{player.heavy_losses}</TableCell>
                  <TableCell>{player.clean_sheets}</TableCell>
                  <TableCell>{Math.round(player.win_percentage)}%</TableCell>
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

  // Client-side only rendering for select dropdown to avoid hydration mismatch
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);

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
      <div className="flex flex-col items-center gap-element mb-6">
        <div className="inline-block relative w-40">
          {isBrowser ? (
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="block appearance-none w-full bg-white border border-neutral-300 hover:border-neutral-400 px-4 py-2 pr-8 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-center"
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          ) : (
            <div className="block w-full bg-white border border-neutral-300 px-4 py-2 pr-8 rounded-md shadow-sm text-center">
              {selectedYear}
            </div>
          )}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>

      {stats.seasonStats.length === 0 ? (
        <Card className="text-center">
          <div className="text-xl font-semibold text-primary-600 mb-element">No stats available for {selectedYear}</div>
        </Card>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default OverallSeasonPerformance; 