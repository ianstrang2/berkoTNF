import React, { useState, useEffect } from 'react';
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
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="bg-dark text-white">
            <tr>
              <th style={{ width: '80px' }}>Year</th>
              <th style={{ minWidth: '150px' }}>Champion</th>
              <th style={{ width: '80px' }}>Points</th>
              <th style={{ minWidth: '200px' }}>Runners Up</th>
              <th style={{ minWidth: '150px' }}>Top Scorer</th>
              <th style={{ width: '80px' }}>Goals</th>
            </tr>
          </thead>
          <tbody>
            {data.seasonWinners.map((season) => {
              const scorerData = data.topScorers.find(s => s.year === season.year)?.scorers;
              return (
                <tr key={season.year}>
                  <td>{season.year}</td>
                  <td className="font-bold">{season.winners.winner}</td>
                  <td>{season.winners.winner_points}</td>
                  <td>
                    {season.winners.runners_up?.map(runner => 
                      `${runner.name} (${runner.points})`).join(', ')}
                  </td>
                  <td className="font-bold">{scorerData?.winner}</td>
                  <td>{scorerData?.winner_goals}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRecords = () => {
    const formatNames = (records) => {
      return records.map(record => record.name).join(', ');
    };

    return (
      <div>
        <h3 className="text-xl font-semibold mb-4">TNF Records</h3>
        <div className="table-responsive">
          <table className="table table-hover">
            <thead className="bg-dark text-white">
              <tr>
                <th style={{ minWidth: '150px' }}>Record</th>
                <th style={{ minWidth: '150px' }}>Player(s)</th>
                <th style={{ width: '100px' }}>Details</th>
                <th style={{ minWidth: '200px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.records && (
                <>
                  {data.records.most_goals_in_game && (
                    <tr>
                      <td>Most Goals in a Game</td>
                      <td className="font-bold">
                        {formatNames(data.records.most_goals_in_game)}
                      </td>
                      <td>
                        {data.records.most_goals_in_game[0].goals} goals
                      </td>
                      <td>
                        {data.records.most_goals_in_game.map((record, index) => (
                          <div key={index}>
                            {record.name}: {new Date(record.date).toLocaleDateString()}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}

                  {Object.entries(data.records.streaks || {}).map(([streakType, streakData]) => (
                    <tr key={streakType}>
                      <td>
                        {streakType === 'Win Streak' ? 'Longest Win Streak' :
                         streakType === 'Loss Streak' ? 'Longest Losing Streak' :
                         streakType === 'No Win Streak' ? 'Longest Streak Without a Win' :
                         'Longest Undefeated Streak'}
                      </td>
                      <td className="font-bold">
                        {formatNames(streakData.holders)}
                      </td>
                      <td>{streakData.holders[0].streak} games</td>
                      <td>
                        {streakData.holders.map((holder, index) => (
                          <div key={index}>
                            {holder.name}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                            {new Date(holder.end_date).toLocaleDateString()}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}

                  {data.records.consecutive_goals && (
                    <tr>
                      <td>Most Consecutive Games Scoring</td>
                      <td className="font-bold">
                        {formatNames(data.records.consecutive_goals.holders)}
                      </td>
                      <td>{data.records.consecutive_goals.holders[0].streak} games</td>
                      <td>
                        {data.records.consecutive_goals.holders.map((holder, index) => (
                          <div key={index}>
                            {holder.name}: {new Date(holder.start_date).toLocaleDateString()} - {' '}
                            {new Date(holder.end_date).toLocaleDateString()}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
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