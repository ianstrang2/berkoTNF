import React from 'react';
import { ComparativeStatsProps } from '@/types/team-algorithm.types';

const ComparativeStats: React.FC<ComparativeStatsProps> = ({ stats }) => {
  if (!stats) return null;
  
  const { diffs, balanceScore } = stats;
  
  // Calculate percentage (0 is worst, 1 is best - convert to 0-100%)
  // Lower balanceScore is better, so we invert it: 100% - (balanceScore * 100)
  // With a maximum cap at 100% and minimum at 0%
  const balancePercentage = Math.min(100, Math.max(0, Math.round(100 - (balanceScore * 100))));
  
  // Keep the same color scheme based on score
  const qualityColorClass = 
    balanceScore <= 0.2 ? 'text-emerald-600' :
    balanceScore <= 0.3 ? 'text-blue-600' :
    balanceScore <= 0.4 ? 'text-amber-600' : 'text-red-600';
  
  return (
    <div className="bg-white rounded-md shadow p-3 mt-4">
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-neutral-700">Balance Score:</span>
          <span className={`font-semibold ${qualityColorClass}`}>
            {balancePercentage}%
          </span>
        </div>
        
        <div className="relative h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-blue-500"
            style={{ 
              width: `${balancePercentage}%`,
              transition: 'width 0.5s ease-out'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ComparativeStats; 