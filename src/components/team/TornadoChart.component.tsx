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
}

const TornadoChart: React.FC<TornadoChartProps> = ({ teamAStats, teamBStats, weights }) => {
  if (!teamAStats || !teamBStats) return null;
  
  // Default weights (as fallback)
  const defaultWeights = {
    defense: { 
      defending: 0.5, 
      stamina_pace: 0.2, 
      control: 0.1, 
      teamwork: 0.1, 
      resilience: 0.1 
    },
    midfield: { 
      control: 0.3, 
      stamina_pace: 0.2, 
      goalscoring: 0.3, 
      teamwork: 0.1, 
      resilience: 0.1 
    },
    attack: { 
      goalscoring: 0.5, 
      stamina_pace: 0.2, 
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
  
  // Helper function to calculate bar width percentage (scale differences for visualization)
  const getBarWidth = (diff: number) => {
    // Scale the differences to percentages with a max width of 45% per side
    // Use a max possible difference of 2.0 for scaling
    const maxDiff = 2.0;
    const percentage = Math.min(Math.abs(diff) / maxDiff * 45, 45);
    return `${percentage}%`;
  };
  
  // Helper for determining the color based on difference
  const getBarColor = (diff: number) => {
    return diff > 0 
      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500' 
      : 'bg-gradient-to-r from-fuchsia-500 to-purple-600';
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
                
                {/* Bar for the difference */}
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