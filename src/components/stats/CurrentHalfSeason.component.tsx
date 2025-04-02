'use client';
import React, { useState, useEffect } from 'react';
import Card from '@/components/ui-kit/Card.component';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table.component';
import { Tabs, Tab } from '@/components/ui-kit/Tabs.component';

// First, let's check the actual props for TableCell
interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  isHeader?: boolean;
  clickable?: boolean;
  onClick?: () => void; // Make onClick optional
}

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
  last_five_games?: string;
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

interface HalfSeasonPeriod {
  year: number;
  half: number;
  startDate: string;
  endDate: string;
  description: string;
}

const CurrentHalfSeason: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<StatsData>({
    seasonStats: [],
    goalStats: [],
    formData: []
  });

  const [activeTab, setActiveTab] = useState<string>("performance");

  const getCurrentHalf = (): HalfSeasonPeriod => {
    const now = new Date(new Date().setFullYear(new Date().getFullYear()));
    const year = now.getFullYear();
    const isFirstHalf = now.getMonth() < 6;

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

        const response = await fetch('/api/stats/half-season', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        console.log('API Response:', response.status);
        const result = await response.json();
        console.log('API Data:', result);

        if (result.data && result.data.seasonStats && result.data.seasonStats.length > 0) {
          setStats(result.data);
        } else {
          console.log('No data received from API');
          setStats({
            seasonStats: [],
            goalStats: [],
            formData: []
          });
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
            <TableCell isHeader className="w-36">Last 5</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stats.seasonStats.map((player, index) => {
            const form = stats.formData.find(f => f.name === player.name)?.last_5_games?.split(', ') || [];
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
                <TableCell>
                  <div className="flex gap-related">
                    {form.map((result, i) => (
                      <span 
                        key={i} 
                        className={`px-1.5 py-0.5 rounded text-sm font-medium ${
                          result.includes('W') 
                            ? 'bg-success-50 text-success-600' 
                            : result === 'D' 
                              ? 'bg-warning-50 text-warning-600' 
                              : 'bg-error-50 text-error-600'
                        }`}
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
    </Card>
  );

  const renderGoalStats = () => (
    <Card>
      <h3 className="text-xl font-semibold text-center text-primary-600 mb-section tracking-tight">Goalscoring Leaderboard</h3>
      <Table responsive>
        <TableHead>
          <TableRow>
            <TableCell isHeader className="min-w-[150px]">Player</TableCell>
            <TableCell isHeader className="w-20">Goals</TableCell>
            <TableCell isHeader className="w-20">MPG</TableCell>
            <TableCell isHeader className="w-36">Last 5</TableCell>
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
              <TableCell>
                <div className="flex gap-related">
                  {player.last_five_games?.split(',').map((goals, i) => {
                    const goalCount = parseInt(goals);
                    return (
                      <span 
                        key={i} 
                        className={`px-1.5 py-0.5 rounded text-sm font-medium ${
                          goalCount > 0 
                            ? 'bg-success-50 text-success-600' 
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {goalCount}
                      </span>
                    );
                  })}
                </div>
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
      <h2 className="text-2xl font-bold text-center text-neutral-900 tracking-tight">
        Current Half-Season Performance - {getCurrentHalf().description}
      </h2>

      {stats.seasonStats.length === 0 ? (
        <Card className="text-center">
          <div className="text-xl font-semibold text-primary-600 mb-element">No stats available for this period</div>
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

export default CurrentHalfSeason; 