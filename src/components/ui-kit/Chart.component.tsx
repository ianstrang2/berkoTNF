import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';

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
}

const Chart: React.FC<ChartProps> = ({
  title,
  subtitle,
  data,
  type,
  dataKey,
  height = 300,
  gradient = { from: 'purple-700', to: 'pink-500' },
  reverseYAxis = false
}) => {
  return (
    <div className="h-[350px] -ml-4">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-current text-gray-200 dark:text-gray-600" />
            <XAxis 
              dataKey="year" 
              className="text-sm fill-current text-gray-600 dark:text-gray-400"
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-sm fill-current text-gray-600 dark:text-gray-400"
              reversed={reverseYAxis}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E0E0E0',
                borderRadius: '0.375rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            />
            <Legend />
            <Bar
              dataKey={dataKey}
              fill={`url(#gradient-${dataKey})`}
              radius={[4, 4, 0, 0]}
            />
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(--tw-gradient-from, ${gradient.from})`} />
                <stop offset="100%" stopColor={`var(--tw-gradient-to, ${gradient.to})`} />
              </linearGradient>
            </defs>
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-current text-gray-200 dark:text-gray-600" />
            <XAxis 
              dataKey="year" 
              className="text-sm fill-current text-gray-600 dark:text-gray-400"
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-sm fill-current text-gray-600 dark:text-gray-400"
              reversed={reverseYAxis}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E0E0E0',
                borderRadius: '0.375rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={`url(#gradient-${dataKey})`}
              strokeWidth={3}
              dot={{ fill: 'white', stroke: `var(--tw-gradient-from, ${gradient.from})`, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(--tw-gradient-from, ${gradient.from})`} />
                <stop offset="100%" stopColor={`var(--tw-gradient-to, ${gradient.to})`} />
              </linearGradient>
            </defs>
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default Chart; 