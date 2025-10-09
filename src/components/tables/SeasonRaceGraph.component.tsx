'use client';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { format, addWeeks, startOfWeek } from 'date-fns';
import { useSeasonTitles } from '@/hooks/useSeasonTitles.hook';
import { useSeasonRaceData } from '@/hooks/queries/useSeasonRaceData.hook';

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
  let currentWeek = startOfWeek(startDate, { weekStartsOn: 1 });
  
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
  const { halfSeasonTitle, wholeSeasonTitle } = useSeasonTitles();
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // React Query hook - automatic caching and deduplication!
  const { data, isLoading: loading, error: queryError } = useSeasonRaceData(period);
  const error = queryError ? (queryError as Error).message : null;

  useEffect(() => {
    setIsMounted(true);
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsDesktop(width >= 1024);
      setIsMobile(width < 600);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Transform data for time-based Recharts with weekly ticks
  const { chartData, sortedPlayers, xAxisDomain, weeklyTicks, mobileTicksFiltered } = React.useMemo(() => {
    if (!data || !data.players || data.players.length === 0) {
      return { chartData: [], sortedPlayers: [], xAxisDomain: [0, 1], weeklyTicks: [], mobileTicksFiltered: [] };
    }

    // Sort players by their final points
    const playersWithFinalPoints = data.players.map(player => ({
      ...player,
      finalPoints: player.cumulative_data.length > 0 
        ? player.cumulative_data[player.cumulative_data.length - 1].points 
        : 0
    }));

    const sortedPlayers = playersWithFinalPoints.sort((a, b) => b.finalPoints - a.finalPoints);

    // Calculate period dates
    const currentYear = new Date().getFullYear();
    let startDate: Date, endDate: Date;
    
    if (period === 'current_half') {
      const isFirstHalf = new Date() <= new Date(currentYear, 5, 30);
      if (isFirstHalf) {
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 5, 30);
      } else {
        startDate = new Date(currentYear, 6, 1);
        endDate = new Date(currentYear, 11, 31);
      }
    } else {
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31);
    }

    const xAxisDomain = [startDate.getTime(), endDate.getTime()];
    const weeklyTicks = generateWeeklyTicks(startDate, endDate);
    const mobileTicksFiltered = weeklyTicks.filter((_, index) => index % 4 === 0);

    // Transform player data to include starting points and timestamps
    const transformedPlayers = sortedPlayers.map(player => {
      const playerData = player.cumulative_data.map(point => ({
        date: new Date(point.date).getTime(),
        dateString: point.date,
        points: point.points
      }));

      // Add starting point at 0 if needed
      const periodStartStr = startDate.toISOString().split('T')[0];
      const hasStartingPoint = player.cumulative_data.some(point => point.date === periodStartStr);
      
      if (!hasStartingPoint && playerData.length > 0) {
        playerData.unshift({
          date: startDate.getTime(),
          dateString: periodStartStr,
          points: 0
        });
      }

      playerData.sort((a, b) => a.date - b.date);

      return {
        ...player,
        transformedData: playerData
      };
    });

    // Get all unique timestamps
    const allTimestamps = new Set<number>();
    transformedPlayers.forEach(player => {
      player.transformedData.forEach(point => {
        allTimestamps.add(point.date);
      });
    });
    
    const sortedTimestamps = Array.from(allTimestamps).sort();

    // Create chart data
    const chartData = sortedTimestamps.map(timestamp => {
      const dataPoint: any = { date: timestamp };
      
      transformedPlayers.forEach(player => {
        const exactPoint = player.transformedData.find(point => point.date === timestamp);
        
        if (exactPoint) {
          dataPoint[player.name] = exactPoint.points;
        } else {
          let lastKnownPoints: number | null = null;
          for (let i = player.transformedData.length - 1; i >= 0; i--) {
            if (player.transformedData[i].date < timestamp) {
              lastKnownPoints = player.transformedData[i].points;
              break;
            }
          }
          
          if (lastKnownPoints !== null) {
            dataPoint[player.name] = lastKnownPoints;
          }
        }
      });

      return dataPoint;
    });

    // Verify chart data accuracy
    if (chartData.length > 0) {
      const lastDataPoint = chartData[chartData.length - 1];
      transformedPlayers.forEach(player => {
        const chartFinal = lastDataPoint[player.name];
        const dbFinal = player.finalPoints;
        if (chartFinal && chartFinal !== dbFinal) {
          console.error(`MISMATCH for ${player.name}: chart=${chartFinal}, database=${dbFinal}`);
        }
      });
    }

    return { chartData, sortedPlayers, xAxisDomain, weeklyTicks, mobileTicksFiltered };
  }, [data, period]);

  // Calculate half-season date as timestamp
  const halfSeasonDate = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear, 5, 30);
    return date.getTime();
  }, [showHalfSeasonLine, period]);

  // Mobile tick formatter
  const mobileTickFormatter = (timestamp: number): string => {
    const date = new Date(timestamp);
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const weekNumber = Math.ceil(((date.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24) + 1) / 7);
    return `W${weekNumber}`;
  };

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
              ? `Top 5 Race (${halfSeasonTitle})`
              : `Top 5 Race (${wholeSeasonTitle})`
            }
          </h5>
        </div>
        <div className="p-4">
          <div className={`${isMounted && isMobile ? 'overflow-x-auto' : ''}`}>
            <div 
              className="h-[30rem] sm:h-96 lg:h-[32rem] xl:h-[36rem]"
              style={{
                minWidth: isMounted && isMobile ? '1000px' : 'auto'
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-current text-gray-200" />
                  <XAxis 
                    dataKey="date"
                    type="number"
                    scale="time"
                    domain={xAxisDomain}
                    ticks={isMounted && isMobile ? mobileTicksFiltered : weeklyTicks}
                    tickFormatter={isMounted && isMobile ? mobileTickFormatter : (timestamp) => format(new Date(timestamp), 'dd/MM')}
                    interval={0}
                    className="text-sm fill-current text-gray-600"
                    angle={isMounted && isMobile ? 0 : -45}
                    textAnchor={isMounted && isMobile ? 'middle' : 'end'}
                    height={60}
                    tick={{ fontSize: isMounted && isMobile ? 10 : 12 }}
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
                  
                  {showHalfSeasonLine && period === 'whole_season' && (
                    <ReferenceLine 
                      x={halfSeasonDate} 
                      className="stroke-current text-gray-200"
                      strokeDasharray="3 3"
                    />
                  )}
                  
                  {sortedPlayers.map((player, index) => {
                    const playerColor = PLAYER_COLORS[index % PLAYER_COLORS.length];
                    return (
                      <Line
                        key={player.player_id}
                        type="monotone"
                        dataKey={player.name}
                        stroke={playerColor}
                        strokeWidth={3}
                        connectNulls={false}
                        isAnimationActive={false}
                        dot={{ 
                          fill: 'white', 
                          stroke: playerColor, 
                          strokeWidth: isMounted && isDesktop ? 1.5 : 1, 
                          r: isMounted && isDesktop ? 2.5 : 1.5
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
    </div>
  );
};

export default SeasonRaceGraph;
