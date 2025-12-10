import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ReferenceLine, ComposedChart } from 'recharts';

interface ChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  type: 'bar' | 'line';
  dataKey: string;
  height?: number;
  gradient?: {
    from: string;
    to: string;
  };
  reverseYAxis?: boolean;
  leagueAverages?: any[];
  selectedMetric?: string;
  careerTotals?: {
    games_played: number;
    goals_scored: number;
    minutes_per_goal: number;
    points_per_game: number;
  };
}

const Chart: React.FC<ChartProps> = ({
  title,
  subtitle,
  data,
  type,
  dataKey,
  height = 300,
  gradient = { from: 'purple-700', to: 'pink-500' },
  reverseYAxis = false,
  leagueAverages = [],
  selectedMetric,
  careerTotals
}) => {
  // Find league average for the selected metric
  const getLeagueAverageForYear = React.useCallback((year: string) => {
    if (!leagueAverages || leagueAverages.length === 0) return null;
    
    const yearData = leagueAverages.find(avg => avg.year.toString() === year);
    if (!yearData) return null;
    
    return selectedMetric === 'Games' ? yearData.games_played_avg :
           selectedMetric === 'Goals' ? yearData.goals_scored_avg :
           selectedMetric === 'MPG' ? yearData.minutes_per_goal_avg :
           selectedMetric === 'PPG' ? yearData.points_per_game_avg : null;
  }, [leagueAverages, selectedMetric]);

  // Add league averages to data
  const enhancedData = React.useMemo(() => {
    const baseData = [...data].map(yearData => {
      // Add league average for this year
      const leagueAvgForYear = getLeagueAverageForYear(yearData.year);
      return {
        ...yearData,
        leagueAverage: leagueAvgForYear
      };
    });
    
    return baseData;
  }, [data, getLeagueAverageForYear]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = payload[0].value;
      const leagueAvg = data?.leagueAverage;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-700">
            {label}
          </p>
          <p className="text-sm text-slate-600">
            {selectedMetric}: {typeof value === 'number' ? value.toFixed(selectedMetric === 'MPG' || selectedMetric === 'PPG' ? 1 : 0) : value}
          </p>
          {leagueAvg && typeof leagueAvg === 'number' && (
            <p className="text-xs text-slate-500">
              League Avg: {leagueAvg.toFixed(selectedMetric === 'MPG' || selectedMetric === 'PPG' ? 1 : 0)}
            </p>
          )}
          {!leagueAvg && (
            <p className="text-xs text-slate-400">
              No league data for {label}
            </p>
          )}
        </div>
      );
    }
    return null;
  };
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <ComposedChart data={enhancedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-current text-gray-200 dark:text-gray-600" />
            <XAxis 
              dataKey="year" 
              className="text-sm fill-current text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 10 }}
              tickMargin={4}
              interval={enhancedData.length > 5 ? 1 : 0}
            />
            <YAxis 
              className="text-sm fill-current text-gray-600 dark:text-gray-400"
              reversed={reverseYAxis}
              label={{ 
                value: selectedMetric === 'Games' || selectedMetric === 'Goals' ? 'Count' : 'Rate', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip content={customTooltip} />
            
            <Bar
              dataKey={dataKey}
              fill="url(#gradient-bar)"
              radius={[4, 4, 0, 0]}
            />
            
            {/* League Average Line */}
            {leagueAverages && leagueAverages.length > 0 && (
              <Line
                type="monotone"
                dataKey="leagueAverage"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
                name="League Avg"
              />
            )}
            
            <defs>
              <linearGradient id="gradient-bar" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </ComposedChart>
        ) : (
          <LineChart data={enhancedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-current text-gray-200 dark:text-gray-600" />
            <XAxis 
              dataKey="year" 
              className="text-sm fill-current text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 10 }}
              tickMargin={4}
              interval={enhancedData.length > 5 ? 1 : 0}
            />
            <YAxis 
              className="text-sm fill-current text-gray-600 dark:text-gray-400"
              reversed={reverseYAxis}
              label={{ 
                value: selectedMetric === 'Games' || selectedMetric === 'Goals' ? 'Count' : 'Rate', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip content={customTooltip} />
            
            {/* League Average Line */}
            {leagueAverages && leagueAverages.length > 0 && (
              <Line
                type="monotone"
                dataKey="leagueAverage"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
                name="League Avg"
              />
            )}
            
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="url(#gradient-line)"
              strokeWidth={3}
              dot={{ fill: 'white', stroke: '#ec4899', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#ec4899' }}
            />
            <defs>
              <linearGradient id="gradient-line" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default Chart; 