'use client';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

interface PlayerRaceData {
  player_id: number;
  name: string;
  cumulative_data: Array<{
    date: string;
    points: number;
    match_number: number;
  }>;
}

interface SeasonRaceData {
  players: PlayerRaceData[];
  lastUpdated: string | null;
}

const PLAYER_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink  
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
];

const SeasonRaceGraph: React.FC = () => {
  const [data, setData] = useState<SeasonRaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/season-race-data');
        if (!response.ok) {
          throw new Error('Failed to fetch season race data');
        }
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }
        
        setData(result.data);
      } catch (err) {
        console.error('Error fetching season race data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Transform data for Recharts
  const { chartData, sortedPlayers } = React.useMemo(() => {
    if (!data || !data.players || data.players.length === 0) {
      return { chartData: [], sortedPlayers: [] };
    }

    // Sort players by their final points (current standings order)
    const playersWithFinalPoints = data.players.map(player => ({
      ...player,
      finalPoints: player.cumulative_data.length > 0 
        ? player.cumulative_data[player.cumulative_data.length - 1].points 
        : 0
    }));

    const sortedPlayers = playersWithFinalPoints.sort((a, b) => b.finalPoints - a.finalPoints);

    // Create 52-week timeline (full season from January 1st)
    const currentYear = new Date().getFullYear();
    const seasonStart = new Date(currentYear, 0, 1); // January 1st
    const seasonEnd = new Date(currentYear, 11, 31); // December 31st
    
    // Generate weekly dates for the full season
    const weeklyDates: string[] = [];
    const currentDate = new Date(seasonStart);
    
    while (currentDate <= seasonEnd) {
      weeklyDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 7); // Add 7 days
    }

    // Create a map of actual match data by date
    const matchDataByDate: Record<string, Record<string, number>> = {};
    let latestMatchDate = '';
    
    sortedPlayers.forEach(player => {
      player.cumulative_data.forEach(point => {
        if (!matchDataByDate[point.date]) {
          matchDataByDate[point.date] = {};
        }
        matchDataByDate[point.date][player.name] = point.points;
        // Track the latest match date across all players
        if (point.date > latestMatchDate) {
          latestMatchDate = point.date;
        }
      });
    });

    // Track last known values for each player (carry-forward logic)
    const lastKnownValues: Record<string, number> = {};
    
    // Initialize all players to 0
    sortedPlayers.forEach(player => {
      lastKnownValues[player.name] = 0;
    });

    // Create chart data points for the full 52-week timeline
    const chartData = weeklyDates.map(weekDate => {
      const dataPoint: any = { date: weekDate };
      
      // Only show player data up to the latest match date
      if (weekDate <= latestMatchDate) {
        // Check if there's any match data for this week or earlier
        const matchDatesThisWeek = Object.keys(matchDataByDate).filter(matchDate => matchDate <= weekDate);
        
        sortedPlayers.forEach(player => {
          // Find the latest match data for this player up to this week
          let latestPoints = lastKnownValues[player.name];
          
          matchDatesThisWeek.forEach(matchDate => {
            if (matchDataByDate[matchDate][player.name] !== undefined) {
              latestPoints = Math.max(latestPoints, matchDataByDate[matchDate][player.name]);
            }
          });
          
          lastKnownValues[player.name] = latestPoints;
          dataPoint[player.name] = latestPoints;
        });
      } else {
        // For future dates, set player values to null so lines don't continue
        sortedPlayers.forEach(player => {
          dataPoint[player.name] = null;
        });
      }

      return dataPoint;
    });

    return { chartData, sortedPlayers };
  }, [data]);

  // Calculate half-season date (closest weekly date to June 30th)
  const currentYear = new Date().getFullYear();
  const june30 = new Date(currentYear, 5, 30); // June 30th
  
  // Find the closest weekly date to June 30th from our chart data
  const halfSeasonDate = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return `${currentYear}-06-30`;
    
    const june30Str = june30.toISOString().split('T')[0];
    
    // Find the closest date in our weekly data
    const closestDate = chartData.reduce((closest, dataPoint) => {
      const currentDiff = Math.abs(new Date(dataPoint.date).getTime() - june30.getTime());
      const closestDiff = Math.abs(new Date(closest.date).getTime() - june30.getTime());
      return currentDiff < closestDiff ? dataPoint : closest;
    });
    
    return closestDate.date;
  }, [chartData, currentYear]);

  if (loading) {
    return (
      <div className="w-full px-3">
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
          <div className="text-center">
            <h6 className="mb-2 text-lg">Loading season race graph...</h6>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-3">
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
          <div className="text-center py-4">
            <h5 className="mb-2 text-red-600">Error Loading Graph</h5>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.players || data.players.length === 0) {
    return (
      <div className="w-full px-3">
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
          <div className="text-center py-4">
            <h5 className="mb-2">No Data Available</h5>
            <p className="text-sm text-gray-600">Season race data is not yet available.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-3">
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6">
        <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
          <h5 className="mb-0">Race for the Season Title</h5>
          <p className="text-sm text-gray-600 mt-1">Spotlight on the current top 5 contenders</p>
        </div>
        <div className="p-4">
          <div className="h-[30rem] sm:h-96 lg:h-[32rem] xl:h-[36rem]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                <defs>
                  <linearGradient id="halfSeasonGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-current text-gray-200" />
                <XAxis 
                  dataKey="date" 
                  className="text-sm fill-current text-gray-600"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: '2-digit' 
                  })}
                />
                <YAxis 
                  className="text-sm fill-current text-gray-600"
                  label={{ value: 'Points', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E0E0E0',
                    borderRadius: '0.375rem',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric'
                  })}
                />
                <Legend />
                
                {/* Half-season reference line */}
                <ReferenceLine 
                  x={halfSeasonDate} 
                  stroke="#6B7280"
                  strokeWidth={1}
                />
                
                {/* Player lines */}
                {sortedPlayers.map((player, index) => (
                  <Line
                    key={player.player_id}
                    type="monotone"
                    dataKey={player.name}
                    stroke={PLAYER_COLORS[index % PLAYER_COLORS.length]}
                    strokeWidth={3}
                    dot={{ 
                      fill: 'white', 
                      stroke: PLAYER_COLORS[index % PLAYER_COLORS.length], 
                      strokeWidth: isDesktop ? 1.5 : 1, 
                      r: isDesktop ? 2.5 : 1.5 // Bigger dots on desktop
                    }}
                    activeDot={{ r: isDesktop ? 6 : 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonRaceGraph; 