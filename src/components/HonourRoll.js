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

const HonourRoll = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    seasonWinners: [],
    topScorers: [],
    records: null
  });
  const [activeTab, setActiveTab] = useState("seasonal");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/honourroll');
        const result = await response.json();
        
        if (result.data) {
          // Get the inner records object and flatten the structure
          const recordsData = result.data.records[0]?.records;
          
          // Modify streaks to match the component's expected format
          const modifiedData = {
            ...result.data,
            records: {
              consecutive_goals: recordsData?.consecutive_goals,
              most_goals_in_game: recordsData?.most_goals_in_game,
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
    <div>
      <h3 className="text-xl font-semibold mb-4">Season Winners</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Year</TableHead>
            <TableHead>Champion</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Runners Up</TableHead>
            <TableHead>Top Scorer</TableHead>
            <TableHead>Goals</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.seasonWinners.map((season) => {
            const scorerData = data.topScorers.find(s => s.year === season.year)?.scorers;
            return (
              <TableRow key={season.year} className="hover:bg-gray-50">
                <TableCell className="font-medium">{season.year}</TableCell>
                <TableCell className="font-bold">{season.winners.winner}</TableCell>
                <TableCell>{season.winners.winner_points}</TableCell>
                <TableCell>
                  {season.winners.runners_up?.map(runner => 
                    `${runner.name} (${runner.points})`).join(', ')}
                </TableCell>
                <TableCell className="font-bold">{scorerData?.winner}</TableCell>
                <TableCell>{scorerData?.winner_goals}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const renderRecords = () => {
    const formatNames = (records) => {
      return records.map(record => record.name).join(', ');
    };

    const formatDates = (records) => {
      return records.map(record => (
        `${new Date(record.start_date).toLocaleDateString()} - ${new Date(record.end_date).toLocaleDateString()}`
      )).join('\n');
    };

    return (
      <div>
        <h3 className="text-xl font-semibold mb-4">TNF Records</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Record</TableHead>
              <TableHead>Player(s)</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.records && (
              <>
{data.records.most_goals_in_game && (
                  <TableRow className="hover:bg-gray-50">
                    <TableCell className="font-medium">Most Goals in a Game</TableCell>
                    <TableCell className="font-bold">
                      {formatNames(data.records.most_goals_in_game)}
                    </TableCell>
                    <TableCell>
                      {data.records.most_goals_in_game[0].goals} goals
                    </TableCell>
                    <TableCell>
                      {data.records.most_goals_in_game.map((record, index) => (
                        <div key={index}>
                          {record.name}: {new Date(record.date).toLocaleDateString()}
                        </div>
                      ))}
                    </TableCell>
                  </TableRow>
                )}

                {Object.entries(data.records.streaks || {}).map(([streakType, streakData]) => (
                  <TableRow key={streakType} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {streakType === 'Win Streak' ? 'Longest Win Streak' :
                       streakType === 'Loss Streak' ? 'Longest Losing Streak' :
                       streakType === 'No Win Streak' ? 'Longest Streak Without a Win' :
                       'Longest Undefeated Streak'}
                    </TableCell>
                    <TableCell className="font-bold">
                      {formatNames(streakData.holders)}
                    </TableCell>
                    <TableCell>{streakData.holders[0].streak} games</TableCell>
                    <TableCell>
                      {streakData.holders.map((holder, index) => (
                        <div key={index}>
                          {holder.name}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                          {new Date(holder.end_date).toLocaleDateString()}
                        </div>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}

                {data.records.consecutive_goals && (
                  <TableRow className="hover:bg-gray-50">
                    <TableCell className="font-medium">Most Consecutive Games Scoring</TableCell>
                    <TableCell className="font-bold">
                      {formatNames(data.records.consecutive_goals.holders)}
                    </TableCell>
                    <TableCell>{data.records.consecutive_goals.holders[0].streak} games</TableCell>
                    <TableCell>
                      {data.records.consecutive_goals.holders.map((holder, index) => (
                        <div key={index}>
                          {holder.name}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                          {new Date(holder.end_date).toLocaleDateString()}
                        </div>
                      ))}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Hall of Fame</h2>
      
      {/* Desktop view */}
      <div className="hidden md:flex flex-col gap-8">
        {renderSeasonalHonours()}
        {renderRecords()}
      </div>

      {/* Mobile view - using controlled tabs pattern */}
      <div className="md:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger triggerValue="seasonal">Season Honours</TabsTrigger>
            <TabsTrigger triggerValue="records">Records</TabsTrigger>
          </TabsList>
          <TabsContent triggerValue="seasonal">
            {renderSeasonalHonours()}
          </TabsContent>
          <TabsContent triggerValue="records">
            {renderRecords()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HonourRoll;