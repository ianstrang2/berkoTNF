import React from 'react';
import { PerformanceTeamStats } from '@/utils/teamStatsCalculation.util';

interface PerformanceTornadoChartProps {
  teamAStats: PerformanceTeamStats | null;
  teamBStats: PerformanceTeamStats | null;
  weights?: {
    performance?: Record<string, number>;
  };
  teamSize?: number;
  isModified?: boolean;
}

const PerformanceTornadoChart: React.FC<PerformanceTornadoChartProps> = ({ 
  teamAStats, 
  teamBStats, 
  weights, 
  teamSize, 
  isModified 
}) => {
  if (!teamAStats || !teamBStats) return null;

  // Default weights (equal weighting)
  const defaultWeights = {
    performance: {
      powerRating: 0.5,
      goalThreat: 0.5
    }
  };

  // Merge provided weights with defaults
  const mergedWeights = {
    performance: { ...defaultWeights.performance, ...(weights?.performance || {}) }
  };

  // Calculate differences for each metric
  const powerRatingDiff = teamAStats.powerRating - teamBStats.powerRating;
  const goalThreatDiff = teamAStats.goalThreat - teamBStats.goalThreat;

  // Calculate weighted balance score
  const calculateWeightedBalanceScore = () => {
    let totalDifference = 0;
    
    // Power Rating difference
    const powerWeight = mergedWeights.performance.powerRating || 0;
    const powerDiff = Math.abs(powerRatingDiff);
    const weightedPowerDiff = powerDiff * powerWeight;
    totalDifference += weightedPowerDiff;

    // Goal Threat difference  
    const goalWeight = mergedWeights.performance.goalThreat || 0;
    const goalDiff = Math.abs(goalThreatDiff);
    const weightedGoalDiff = goalDiff * goalWeight;
    totalDifference += weightedGoalDiff;

    return totalDifference;
  };

  const balanceScore = calculateWeightedBalanceScore();
  
  // Convert to percentage (0-100%, higher is better)
  // Scale based on typical performance metric ranges
  const balancePercentage = Math.min(100, Math.max(0, Math.round(100 - (balanceScore * 50))));

  // Helper function to calculate bar width percentage
  const getBarWidth = (diff: number) => {
    // Scale the differences to percentages with a max width of 45% per side
    // Use different max values for different metrics
    const maxDiff = Math.abs(diff) > 2 ? 4.0 : 2.0; // Adaptive scaling
    const percentage = Math.min(Math.abs(diff) / maxDiff * 45, 45);
    return `${percentage}%`;
  };

  // Helper for bar color - consistent purple/pink gradient
  const getBarColor = () => {
    return 'bg-gradient-to-r from-pink-500 to-purple-700';
  };

  // Helper for positioning the bar (left or right of center)
  const getBarPosition = (diff: number) => {
    return diff > 0 ? 'left-1/2' : 'right-1/2';
  };

  // Categories to display (only 2 for performance)
  const categories = [
    { label: 'Power Rating', diff: powerRatingDiff },
    { label: 'Goal Threat', diff: goalThreatDiff }
  ];

  return (
    <div className="rounded-xl overflow-hidden">
      {/* Balance Score Display */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-300">Balance Score</p>
          <span className="text-sm font-semibold text-white">{balancePercentage}%</span>
        </div>
        <div className="h-1.5 flex overflow-hidden rounded-lg bg-slate-700">
          <div
            className="duration-600 ease-soft flex h-full flex-col justify-center overflow-hidden whitespace-nowrap rounded-lg text-center text-white transition-all bg-gradient-to-br from-pink-500 to-purple-700"
            style={{ width: `${balancePercentage}%` }}
            role="progressbar" 
            aria-valuenow={balancePercentage} 
            aria-valuemin={0} 
            aria-valuemax={100}
          ></div>
        </div>
      </div>

      {/* Tornado Chart */}
      <div className="px-4 pb-4">
        <div className="space-y-3">
          {categories.map((category, index) => (
            <div key={index} className="relative">
              {/* Category Label */}
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-300">{category.label}</span>
                <span className="text-xs text-slate-400">
                  {category.diff > 0 ? 'Team A' : 'Team B'} +{Math.abs(category.diff).toFixed(2)}
                </span>
              </div>
              
              {/* Tornado Bar Container */}
              <div className="relative h-4 bg-slate-700 rounded-lg overflow-hidden">
                {/* Center Line */}
                <div className="absolute top-0 left-1/2 w-0.5 h-full bg-slate-600 z-10"></div>
                
                {/* Bar */}
                <div 
                  className={`absolute top-0 h-full ${getBarColor()} ${getBarPosition(category.diff)}`}
                  style={{ width: getBarWidth(category.diff) }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Team Labels */}
        <div className="flex justify-between mt-3 px-1">
          <span className="text-xs font-medium text-slate-400">Team A</span>
          <span className="text-xs font-medium text-slate-400">Team B</span>
        </div>
        
        {/* Modified Indicator */}
        {isModified && (
          <div className="mt-3 pt-2 border-t border-slate-600">
            <div className="flex items-center justify-center">
              <span className="text-xs text-amber-400 bg-amber-400 bg-opacity-10 px-2 py-1 rounded-full border border-amber-400 border-opacity-20">
                ⚠️ Teams Modified - Results may differ from original balance
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceTornadoChart; 