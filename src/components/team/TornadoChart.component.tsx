import React from 'react';
import { TeamStats } from '@/types/team-algorithm.types';

// Add weights to the props interface
interface TornadoChartProps {
  teamAStats: TeamStats | null;
  teamBStats: TeamStats | null;
  weights?: {
    defense?: Record<string, number>;
    midfield?: Record<string, number>;
    attack?: Record<string, number>;
  };
  teamSize?: number;           // Add for dynamic sizing
  isModified?: boolean;        // Add for status indication
}

const TornadoChart: React.FC<TornadoChartProps> = ({ teamAStats, teamBStats, weights, teamSize, isModified }) => {
  if (!teamAStats || !teamBStats) return null;
  
  // Default weights (as fallback)
  const defaultWeights = {
    defense: { 
      defending: 0.4,        // ✅ Correct: 'defending' from PlayerProfile
      staminaPace: 0.3,      // ✅ Correct: 'staminaPace' from PlayerProfile  
      control: 0.1, 
      teamwork: 0.1, 
      resilience: 0.1 
    },
    midfield: { 
      control: 0.3, 
      staminaPace: 0.2, 
      goalscoring: 0.3, 
      teamwork: 0.1, 
      resilience: 0.1 
    },
    attack: { 
      goalscoring: 0.5, 
      staminaPace: 0.2, 
      control: 0.1, 
      teamwork: 0.1, 
      resilience: 0.1 
    }
  };
  
  // Merge provided weights with defaults
  const mergedWeights = {
    defense: { ...defaultWeights.defense, ...(weights?.defense || {}) },
    midfield: { ...defaultWeights.midfield, ...(weights?.midfield || {}) },
    attack: { ...defaultWeights.attack, ...(weights?.attack || {}) }
  };
  
  // Calculate position-based metrics for Team A using weights
  const calculatePositionScore = (stats: TeamStats, position: 'defense' | 'midfield' | 'attack') => {
    const posStats = stats[position];
    const posWeights = mergedWeights[position];
    
    return Object.entries(posWeights).reduce((score, [attr, weight]) => {
      return score + (posStats[attr as keyof typeof posStats] || 0) * weight;
    }, 0);
  };
  
  // Calculate scores for each position group
  const teamADefense = calculatePositionScore(teamAStats, 'defense');
  const teamAMidfield = calculatePositionScore(teamAStats, 'midfield');
  const teamAAttacking = calculatePositionScore(teamAStats, 'attack');
  
  const teamBDefense = calculatePositionScore(teamBStats, 'defense');
  const teamBMidfield = calculatePositionScore(teamBStats, 'midfield');
  const teamBAttacking = calculatePositionScore(teamBStats, 'attack');
  
  // Calculate differences (Team B - Team A)
  const defenseDiff = teamBDefense - teamADefense;
  const midfieldDiff = teamBMidfield - teamAMidfield;
  const attackingDiff = teamBAttacking - teamAAttacking;
  
  // Calculate teamwork and resilience differences by averaging across positions
  const getAttributeAvg = (stats: TeamStats, attr: 'teamwork' | 'resilience') => {
    return (stats.defense[attr] + stats.midfield[attr] + stats.attack[attr]) / 3;
  };
  
  const teamATeamworkAvg = getAttributeAvg(teamAStats, 'teamwork');
  const teamBTeamworkAvg = getAttributeAvg(teamBStats, 'teamwork');
  const teamworkDiff = teamBTeamworkAvg - teamATeamworkAvg;
  
  const teamAResilienceAvg = getAttributeAvg(teamAStats, 'resilience');
  const teamBResilienceAvg = getAttributeAvg(teamBStats, 'resilience');
  const resilienceDiff = teamBResilienceAvg - teamAResilienceAvg;

  // Calculate weighted balance score using the SAME algorithm as balanceByRating
  const calculateWeightedBalanceScore = () => {
    if (!weights) return null;
    
    let totalDifference = 0;
    const positionGroups: ('defense' | 'midfield' | 'attack')[] = ['defense', 'midfield', 'attack'];
    
    for (const group of positionGroups) {
      const statsA = teamAStats[group];
      const statsB = teamBStats[group];
      const groupWeights = weights[group] || {};
      
      // Calculate weighted differences for each attribute
      Object.keys(statsA).forEach(attribute => {
        const weight = groupWeights[attribute] || 0;
        const diff = Math.abs(statsA[attribute] - statsB[attribute]);
        const weightedDiff = diff * weight;
        totalDifference += weightedDiff;
      });
    }
    
    return totalDifference;
  };

  const balanceScore = calculateWeightedBalanceScore();
  
  // Convert to percentage (0-100%, higher is better)
  const balancePercentage = balanceScore !== null 
    ? Math.min(100, Math.max(0, Math.round(100 - (balanceScore * 25))))
    : null;
  
  // Helper function to calculate bar width percentage (scale differences for visualization)
  const getBarWidth = (diff: number) => {
    // Scale the differences to percentages with a max width of 45% per side
    // Use a max possible difference of 2.0 for scaling
    const maxDiff = 2.0;
    const percentage = Math.min(Math.abs(diff) / maxDiff * 45, 45);
    return `${percentage}%`;
  };
  
  // Helper for determining the color based on difference - consistent purple/pink
  const getBarColor = (diff: number) => {
    return 'bg-gradient-to-r from-pink-500 to-purple-700';
  };
  
  // Helper for positioning the bar (left or right of center)
  const getBarPosition = (diff: number) => {
    return diff > 0 ? 'left-1/2' : 'right-1/2';
  };
  
  // Categories to display
  const categories = [
    { label: 'Defense', diff: defenseDiff },
    { label: 'Midfield', diff: midfieldDiff },
    { label: 'Attacking', diff: attackingDiff },
    { label: 'Teamwork', diff: teamworkDiff },
    { label: 'Resilience', diff: resilienceDiff }
  ];
  
  return (
    <div className="rounded-xl overflow-hidden">
      {/* Balance Score Display */}
      {balancePercentage !== null && (
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
      )}

      {/* Tornado Chart */}
      <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <div className="space-y-5 pt-2">
          {categories.map((category, index) => (
            <div key={index} className="mb-3">
              {/* Category label */}
              <div className="flex items-center mb-1">
                <span className="text-xs font-medium text-slate-400">{category.label}</span>
              </div>
              
              {/* Bar container with center line */}
              <div className="flex-1 relative h-2 bg-slate-700 rounded-full overflow-hidden">
                {/* Center line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-600"></div>
                
                {/* Current bar */}
                <div 
                  className={`absolute top-0 bottom-0 ${getBarPosition(category.diff)} ${getBarColor(category.diff)} rounded-full shadow-soft-md`}
                  style={{ 
                    width: getBarWidth(category.diff),
                    ...(category.diff < 0 ? { right: '50%' } : { left: '50%' })
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TornadoChart; 