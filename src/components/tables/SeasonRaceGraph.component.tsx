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
    
    // Debug: show final points from database
    console.log('Final points from database:');
    sortedPlayers.forEach(player => {
      const lastPoint = player.cumulative_data[player.cumulative_data.length - 1];
      console.log(`${player.name}: ${lastPoint?.points} points (last match: ${lastPoint?.date})`);
    });

    // Get all unique match dates from all players (these are exact match dates)
    const allMatchDates = new Set<string>();
    sortedPlayers.forEach(player => {
      player.cumulative_data.forEach(point => {
        allMatchDates.add(point.date);
      });
    });
    
    // Sort the match dates chronologically
    const sortedMatchDates = Array.from(allMatchDates).sort();
    
    console.log(`Found ${sortedMatchDates.length} unique match dates from ${sortedMatchDates[0]} to ${sortedMatchDates[sortedMatchDates.length - 1]}`);

    // Create chart data using actual match dates (not synthetic weekly timeline)
    const chartData = sortedMatchDates.map(matchDate => {
      const dataPoint: any = { date: matchDate };
      
      sortedPlayers.forEach(player => {
        // Find the exact cumulative total for this player on this date
        const matchPoint = player.cumulative_data.find(point => point.date === matchDate);
        
        if (matchPoint) {
          // Player played on this date - use their cumulative total
          dataPoint[player.name] = matchPoint.points;
        } else {
          // Player didn't play on this date - find their last known total before this date
          let lastKnownPoints = 0;
          for (let i = player.cumulative_data.length - 1; i >= 0; i--) {
            if (player.cumulative_data[i].date < matchDate) {
              lastKnownPoints = player.cumulative_data[i].points;
              break;
            }
          }
          dataPoint[player.name] = lastKnownPoints;
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
      sortedPlayers.forEach(player => {
        const chartFinal = lastDataPoint[player.name];
        const dbFinal = player.finalPoints;
        if (chartFinal !== dbFinal) {
          console.error(`MISMATCH for ${player.name}: chart=${chartFinal}, database=${dbFinal}`);
        }
      });
    }

    return { chartData, sortedPlayers };
  }, [data]);

  // Calculate half-season date (June 30th exactly)
  const halfSeasonDate = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-06-30`;
  }, []);

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
            {period === 'current_half' ? 'Race for the Half Season' : 'Race for the Season Title'}
          </h5>
          <p className="text-sm text-gray-600 mt-1">Spotlight on the current top 5 contenders</p>
        </div>
        <div className="p-4">
          <div className="h-[30rem] sm:h-96 lg:h-[32rem] xl:h-[36rem]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
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
                {showHalfSeasonLine && (
                  <ReferenceLine 
                    x={halfSeasonDate} 
                    stroke="#6B7280"
                    strokeWidth={1}
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
                      connectNulls={false} // Don't connect across null values - creates gaps
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