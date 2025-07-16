'use client';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { format, addWeeks, startOfWeek } from 'date-fns';

interface PlayerRaceData {
  player_id: number;
  name: string;
  cumulative_data: Array<{
    date: string;
    points: number;
  }>;
}

interface SeasonRaceData {
  players: PlayerRaceData[];
  lastUpdated: string | null;
  periodType: string;
}

interface SeasonRaceGraphProps {
  period?: 'whole_season' | 'current_half';
  showHalfSeasonLine?: boolean;
}

const PLAYER_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink  
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
];

// Generate weekly ticks for the given date range
const generateWeeklyTicks = (startDate: Date, endDate: Date): number[] => {
  const ticks: number[] = [];
  let currentWeek = startOfWeek(startDate, { weekStartsOn: 1 }); // Start on Monday
  
  while (currentWeek <= endDate) {
    ticks.push(currentWeek.getTime());
    currentWeek = addWeeks(currentWeek, 1);
  }
  
  return ticks;
};

const SeasonRaceGraph: React.FC<SeasonRaceGraphProps> = ({ 
  period = 'whole_season',
  showHalfSeasonLine = true 
}) => {
  const [data, setData] = useState<SeasonRaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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
        
        const response = await fetch(`/api/season-race-data?period=${period}`);
        if (!response.ok) {
          throw new Error('Failed to fetch season race data');
        }
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }
        
        console.log(`Raw API data for ${period}:`, result.data);
        setData(result.data);
      } catch (err) {
        console.error('Error fetching season race data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  // Transform data for time-based Recharts with weekly ticks
  const { chartData, sortedPlayers, xAxisDomain, weeklyTicks } = React.useMemo(() => {
    if (!data || !data.players || data.players.length === 0) {
      return { chartData: [], sortedPlayers: [], xAxisDomain: [0, 1], weeklyTicks: [] };
    }

    // Sort players by their final points (current standings order)
    const playersWithFinalPoints = data.players.map(player => ({
      ...player,
      finalPoints: player.cumulative_data.length > 0 
        ? player.cumulative_data[player.cumulative_data.length - 1].points 
        : 0
    }));

    const sortedPlayers = playersWithFinalPoints.sort((a, b) => b.finalPoints - a.finalPoints);
    
    // Debug: show final points from database
    console.log('Final points from database:');
    sortedPlayers.forEach(player => {
      const lastPoint = player.cumulative_data[player.cumulative_data.length - 1];
      console.log(`${player.name}: ${lastPoint?.points} points (last match: ${lastPoint?.date})`);
    });

    // Calculate period dates
    const currentYear = new Date().getFullYear();
    let startDate: Date, endDate: Date;
    
    if (period === 'current_half') {
      // Determine which half we're in
      const isFirstHalf = new Date() <= new Date(currentYear, 5, 30); // June 30th
      if (isFirstHalf) {
        startDate = new Date(currentYear, 0, 1); // January 1st
        endDate = new Date(currentYear, 5, 30); // June 30th
      } else {
        startDate = new Date(currentYear, 6, 1); // July 1st
        endDate = new Date(currentYear, 11, 31); // December 31st
      }
    } else {
      startDate = new Date(currentYear, 0, 1); // January 1st
      endDate = new Date(currentYear, 11, 31); // December 31st
    }

    const xAxisDomain = [startDate.getTime(), endDate.getTime()];
    const weeklyTicks = generateWeeklyTicks(startDate, endDate);

    console.log(`Period: ${period}, Start: ${startDate.toISOString().split('T')[0]}, End: ${endDate.toISOString().split('T')[0]}`);
    console.log(`Generated ${weeklyTicks.length} weekly ticks`);

    // Transform player data to include starting points and timestamps
    const transformedPlayers = sortedPlayers.map(player => {
      const playerData = player.cumulative_data.map(point => ({
        date: new Date(point.date).getTime(),
        dateString: point.date,
        points: point.points
      }));

      // Add starting point at 0 if player doesn't have data from period start
      const periodStartStr = startDate.toISOString().split('T')[0];
      const hasStartingPoint = player.cumulative_data.some(point => point.date === periodStartStr);
      
      if (!hasStartingPoint && playerData.length > 0) {
        // Add a 0-point starting entry
        playerData.unshift({
          date: startDate.getTime(),
          dateString: periodStartStr,
          points: 0
        });
      }

      // Sort by date to ensure chronological order
      playerData.sort((a, b) => a.date - b.date);

      return {
        ...player,
        transformedData: playerData
      };
    });

    // Get all unique timestamps from all players
    const allTimestamps = new Set<number>();
    transformedPlayers.forEach(player => {
      player.transformedData.forEach(point => {
        allTimestamps.add(point.date);
      });
    });
    
    // Sort timestamps chronologically
    const sortedTimestamps = Array.from(allTimestamps).sort();
    
    console.log(`Found ${sortedTimestamps.length} unique timestamps`);

    // Create chart data using timestamps for time-based plotting
    const chartData = sortedTimestamps.map(timestamp => {
      const dataPoint: any = { date: timestamp };
      
      transformedPlayers.forEach(player => {
        // Find the exact cumulative total for this player at this timestamp
        const exactPoint = player.transformedData.find(point => point.date === timestamp);
        
        if (exactPoint) {
          // Player has data at this exact timestamp
          dataPoint[player.name] = exactPoint.points;
        } else {
          // Find the last known value before this timestamp
          let lastKnownPoints: number | null = null;
          for (let i = player.transformedData.length - 1; i >= 0; i--) {
            if (player.transformedData[i].date < timestamp) {
              lastKnownPoints = player.transformedData[i].points;
              break;
            }
          }
          
          // Only set a value if we have a known point before this timestamp
          // This prevents forward-filling into the future
          if (lastKnownPoints !== null) {
            dataPoint[player.name] = lastKnownPoints;
          }
          // If lastKnownPoints is null, we don't set a value, creating a gap in the line
        }
      });

      return dataPoint;
    });

    // Debug: verify chart data accuracy
    console.log('Chart data verification:');
    if (chartData.length > 0) {
      const lastDataPoint = chartData[chartData.length - 1];
      console.log('Final chart values:', lastDataPoint);
      
      // Compare with database final values
      transformedPlayers.forEach(player => {
        const chartFinal = lastDataPoint[player.name];
        const dbFinal = player.finalPoints;
        if (chartFinal && chartFinal !== dbFinal) {
          console.error(`MISMATCH for ${player.name}: chart=${chartFinal}, database=${dbFinal}`);
        }
      });
    }

    return { chartData, sortedPlayers, xAxisDomain, weeklyTicks };
  }, [data, period]);

  // Calculate half-season date as timestamp
  const halfSeasonDate = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear, 5, 30); // June 30th
    const timestamp = date.getTime();
    console.log(`Half-season timestamp: ${timestamp} (${date.toISOString().split('T')[0]}), showLine: ${showHalfSeasonLine}, period: ${period}`);
    return timestamp;
  }, [showHalfSeasonLine, period]);

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
          <h5 className="mb-0">
            {period === 'current_half' 
              ? `Top 5 Race (${new Date() <= new Date(new Date().getFullYear(), 5, 30) ? 'Jan - Jun' : 'Jul - Dec'})`
              : `Top 5 Race (${new Date().getFullYear()})`
            }
          </h5>
        </div>
        <div className="p-4">
          <div className="h-[30rem] sm:h-96 lg:h-[32rem] xl:h-[36rem]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-current text-gray-200" />
                <XAxis 
                  dataKey="date"
                  type="number"
                  scale="time"
                  domain={xAxisDomain}
                  ticks={weeklyTicks}
                  tickFormatter={(timestamp) => format(new Date(timestamp), 'dd/MM')}
                  interval={0}
                  className="text-sm fill-current text-gray-600"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 12 }}
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
                  labelFormatter={(timestamp) => format(new Date(timestamp), 'dd/MM/yyyy')}
                />
                <Legend />
                
                {/* Half-season reference line */}
                {showHalfSeasonLine && period === 'whole_season' && (
                  <ReferenceLine 
                    x={halfSeasonDate} 
                    className="stroke-current text-gray-200"
                    strokeDasharray="3 3"
                  />
                )}
                
                {/* Player lines */}
                {sortedPlayers.map((player, index) => {
                  const playerColor = PLAYER_COLORS[index % PLAYER_COLORS.length];
                  return (
                    <Line
                      key={player.player_id}
                      type="monotone"
                      dataKey={player.name}
                      stroke={playerColor}
                      strokeWidth={3}
                      connectNulls={false} // Critical: Don't connect across gaps - prevents future lines
                      isAnimationActive={false} // Disable animation for cleaner rendering
                      dot={{ 
                        fill: 'white', 
                        stroke: playerColor, 
                        strokeWidth: isMounted && isDesktop ? 1.5 : 1, 
                        r: isMounted && isDesktop ? 2.5 : 1.5 // Bigger dots on desktop
                      }}
                      activeDot={{ r: isMounted && isDesktop ? 6 : 4 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonRaceGraph; 