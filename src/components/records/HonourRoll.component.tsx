'use client';
import React, { useState, useEffect } from 'react';
import Card from '@/components/ui-kit/Card.component';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui-kit/Table.component';
import { Tabs, Tab } from '@/components/ui-kit/Tabs.component';

interface Runner {
  name: string;
  points?: number;
  goals?: number;
}

interface SeasonWinner {
  year: number;
  winners: {
    winner: string;
    winner_points: number;
    runners_up?: Runner[];
  };
}

interface TopScorer {
  year: number;
  scorers: {
    winner: string;
    winner_goals: number;
    runners_up?: Runner[];
  };
}

interface StreakHolder {
  name: string;
  streak: number;
  start_date: string;
  end_date: string;
}

interface GoalRecord {
  name: string;
  goals: number;
  date: string;
}

interface BiggestVictory {
  date: string;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string;
  team_b_players: string;
  winning_team: 'A' | 'B';
}

interface Records {
  most_goals_in_game?: GoalRecord[];
  consecutive_goals?: {
    holders: StreakHolder[];
  };
  biggest_victory?: BiggestVictory[];
  streaks?: {
    'Win Streak'?: {
      holders: StreakHolder[];
    };
    'Loss Streak'?: {
      holders: StreakHolder[];
    };
    'No Win Streak'?: {
      holders: StreakHolder[];
    };
    'Undefeated Streak'?: {
      holders: StreakHolder[];
    };
  };
}

interface HonourRollData {
  seasonWinners: SeasonWinner[];
  topScorers: TopScorer[];
  records: Records | null;
}

const HonourRoll: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<HonourRollData>({
    seasonWinners: [],
    topScorers: [],
    records: null
  });
  const [activeTab, setActiveTab] = useState<string>("seasonal");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/honourroll');
        const result = await response.json();
        
        if (result.data) {
          const recordsData = result.data.records[0]?.records;
          
          const modifiedData = {
            ...result.data,
            records: {
              consecutive_goals: recordsData?.consecutive_goals,
              most_goals_in_game: recordsData?.most_goals_in_game,
              biggest_victory: recordsData?.biggest_victory,
              streaks: {
                'Win Streak': recordsData?.streaks?.['Win Streak'],
                'Loss Streak': recordsData?.streaks?.['Loss Streak'],
                'No Win Streak': recordsData?.streaks?.['No Win Streak'],
                'Undefeated Streak': recordsData?.streaks?.['Undefeated Streak']
              }
            }
          };
          setData(modifiedData);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching honour roll:', error);
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  const renderSeasonalHonours = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-grid">
      <Card>
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-section tracking-tight">Season Winners</h3>
        <Table responsive>
          <TableHead>
            <TableRow>
              <TableCell isHeader className="w-20">Year</TableCell>
              <TableCell isHeader className="w-32">Champion</TableCell>
              <TableCell isHeader className="w-20">Points</TableCell>
              <TableCell isHeader className="min-w-[180px]">Runners Up</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.seasonWinners.map((season) => (
              <TableRow key={season.year}>
                <TableCell>{season.year}</TableCell>
                <TableCell className="font-medium text-primary-600">{season.winners.winner}</TableCell>
                <TableCell>{season.winners.winner_points}</TableCell>
                <TableCell>
                  {season.winners.runners_up?.map(runner => 
                    `${runner.name} (${runner.points})`).join(', ')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-section tracking-tight">Top Scorers</h3>
        <Table responsive>
          <TableHead>
            <TableRow>
              <TableCell isHeader className="w-20">Year</TableCell>
              <TableCell isHeader className="w-32">Player</TableCell>
              <TableCell isHeader className="w-20">Goals</TableCell>
              <TableCell isHeader className="min-w-[180px]">Runners Up</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.topScorers.map((season) => (
              <TableRow key={season.year}>
                <TableCell>{season.year}</TableCell>
                <TableCell className="font-medium text-primary-600">{season.scorers.winner}</TableCell>
                <TableCell>{season.scorers.winner_goals}</TableCell>
                <TableCell>
                  {season.scorers.runners_up?.map(runner => 
                    `${runner.name} (${runner.goals})`).join(', ')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );

  const renderRecords = () => {
    const formatNames = (records: Array<{name: string}>) => {
      return records.map(record => record.name).join(', ');
    };

    return (
      <Card>
        <h3 className="text-xl font-semibold text-center text-primary-600 mb-section tracking-tight">TNF Records</h3>
        <Table responsive>
          <TableHead>
            <TableRow>
              <TableCell isHeader className="w-32">Record</TableCell>
              <TableCell isHeader className="w-48">Player(s)</TableCell>
              <TableCell isHeader className="w-24">Details</TableCell>
              <TableCell isHeader className="w-28">Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.records && (
              <>
                {data.records.most_goals_in_game && (
                  <TableRow>
                    <TableCell>Most Goals in a Game</TableCell>
                    <TableCell className="font-medium text-primary-600">
                      {formatNames(data.records.most_goals_in_game)}
                    </TableCell>
                    <TableCell>
                      {data.records.most_goals_in_game[0].goals} goals
                    </TableCell>
                    <TableCell className="text-sm">
                      {data.records.most_goals_in_game.map((record, index) => (
                        <div key={index}>
                          {record.name}: {new Date(record.date).toLocaleDateString()}
                        </div>
                      ))}
                    </TableCell>
                  </TableRow>
                )}

                {data.records.streaks && Object.entries(data.records.streaks).map(([streakType, streakData]) => 
                  streakData && (
                    <TableRow key={streakType}>
                      <TableCell>
                        {streakType === 'Win Streak' ? 'Longest Win Streak' :
                        streakType === 'Loss Streak' ? 'Longest Losing Streak' :
                        streakType === 'No Win Streak' ? 'Longest Streak Without a Win' :
                        'Longest Undefeated Streak'}
                      </TableCell>
                      <TableCell className="font-medium text-primary-600">
                        {formatNames(streakData.holders)}
                      </TableCell>
                      <TableCell>{streakData.holders[0].streak} games</TableCell>
                      <TableCell className="text-sm">
                        {streakData.holders.map((holder, index) => (
                          <div key={index}>
                            {holder.name}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                            {new Date(holder.end_date).toLocaleDateString()}
                          </div>
                        ))}
                      </TableCell>
                    </TableRow>
                  )
                )}

                {data.records.consecutive_goals && (
                  <TableRow>
                    <TableCell>Most Consecutive Games Scoring</TableCell>
                    <TableCell className="font-medium text-primary-600">
                      {formatNames(data.records.consecutive_goals.holders)}
                    </TableCell>
                    <TableCell>{data.records.consecutive_goals.holders[0].streak} games</TableCell>
                    <TableCell className="text-sm">
                      {data.records.consecutive_goals.holders.map((holder, index) => (
                        <div key={index}>
                          {holder.name}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                          {new Date(holder.end_date).toLocaleDateString()}
                        </div>
                      ))}
                    </TableCell>
                  </TableRow>
                )}

                {data.records.biggest_victory && data.records.biggest_victory[0] && (
                  <TableRow>
                    <TableCell>Biggest Victory</TableCell>
                    <TableCell className="font-medium text-primary-600 whitespace-normal">
                      {data.records.biggest_victory[0].winning_team === 'A' ? (
                        <>
                          Team A ({data.records.biggest_victory[0].team_a_score}): {data.records.biggest_victory[0].team_a_players}
                          <br />
                          Team B ({data.records.biggest_victory[0].team_b_score}): {data.records.biggest_victory[0].team_b_players}
                        </>
                      ) : (
                        <>
                          Team B ({data.records.biggest_victory[0].team_b_score}): {data.records.biggest_victory[0].team_b_players}
                          <br />
                          Team A ({data.records.biggest_victory[0].team_a_score}): {data.records.biggest_victory[0].team_a_players}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      {data.records.biggest_victory[0].team_a_score}-{data.records.biggest_victory[0].team_b_score}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(data.records.biggest_victory[0].date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </Card>
    );
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
      <h2 className="text-2xl font-bold text-center text-primary-600 tracking-tight">Hall of Fame</h2>
      
      {/* Desktop view */}
      <div className="hidden md:flex flex-col gap-section">
        {renderSeasonalHonours()}
        {renderRecords()}
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <Tabs 
          defaultTab={activeTab === 'seasonal' ? 0 : 1} 
          onChange={(index) => setActiveTab(index === 0 ? 'seasonal' : 'records')}
          variant="pills"
        >
          <Tab label="Seasonal Honours">
            {renderSeasonalHonours()}
          </Tab>
          <Tab label="Records">
            {renderRecords()}
          </Tab>
        </Tabs>
      </div>
    </div>
  );
};

export default HonourRoll; 