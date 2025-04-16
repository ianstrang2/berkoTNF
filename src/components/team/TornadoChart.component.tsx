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
    team?: Record<string, number>;
  };
}

const TornadoChart: React.FC<TornadoChartProps> = ({ teamAStats, teamBStats, weights }) => {
  if (!teamAStats || !teamBStats) return null;
  
  // Default weights (as fallback)
  const defaultWeights = {
    defense: { defending: 0.5, stamina_pace: 0.3, control: 0.2 },
    midfield: { control: 0.4, stamina_pace: 0.3, goalscoring: 0.3 },
    attack: { goalscoring: 0.5, stamina_pace: 0.3, control: 0.2 },
    team: { resilience: 1.0, teamwork: 1.0 }
  };
  
  // Merge provided weights with defaults
  const mergedWeights = {
    defense: { ...defaultWeights.defense, ...(weights?.defense || {}) },
    midfield: { ...defaultWeights.midfield, ...(weights?.midfield || {}) },
    attack: { ...defaultWeights.attack, ...(weights?.attack || {}) },
    team: { ...defaultWeights.team, ...(weights?.team || {}) }
  };
  
  // Calculate position-based metrics for Team A using weights
  const teamADefense = 
    teamAStats.defending * mergedWeights.defense.defending + 
    teamAStats.stamina_pace * mergedWeights.defense.stamina_pace + 
    teamAStats.control * mergedWeights.defense.control;
    
  const teamAMidfield = 
    teamAStats.control * mergedWeights.midfield.control + 
    teamAStats.stamina_pace * mergedWeights.midfield.stamina_pace + 
    teamAStats.goalscoring * mergedWeights.midfield.goalscoring;
    
  const teamAAttacking = 
    teamAStats.goalscoring * mergedWeights.attack.goalscoring + 
    teamAStats.stamina_pace * mergedWeights.attack.stamina_pace + 
    teamAStats.control * mergedWeights.attack.control;
  
  // Calculate position-based metrics for Team B using weights
  const teamBDefense = 
    teamBStats.defending * mergedWeights.defense.defending + 
    teamBStats.stamina_pace * mergedWeights.defense.stamina_pace + 
    teamBStats.control * mergedWeights.defense.control;
    
  const teamBMidfield = 
    teamBStats.control * mergedWeights.midfield.control + 
    teamBStats.stamina_pace * mergedWeights.midfield.stamina_pace + 
    teamBStats.goalscoring * mergedWeights.midfield.goalscoring;
    
  const teamBAttacking = 
    teamBStats.goalscoring * mergedWeights.attack.goalscoring + 
    teamBStats.stamina_pace * mergedWeights.attack.stamina_pace + 
    teamBStats.control * mergedWeights.attack.control;
  
  // Calculate differences (Team B - Team A)
  const defenseDiff = teamBDefense - teamADefense;
  const midfieldDiff = teamBMidfield - teamAMidfield;
  const attackingDiff = teamBAttacking - teamAAttacking;
  const teamworkDiff = teamBStats.teamwork - teamAStats.teamwork;
  const resilienceDiff = teamBStats.resilience - teamAStats.resilience;
  
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
    return diff > 0 ? 'bg-emerald-500' : 'bg-orange-500';
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
    <div className="bg-white rounded-md shadow p-4">
      {categories.map((category, index) => (
        <div key={index} className="mb-3">
          {/* Category row with label and bar */}
          <div className="flex items-center">
            {/* Bar container with center line */}
            <div className="flex-1 relative h-7 bg-gray-100">
              {/* Center line */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-300"></div>
              
              {/* Bar for the difference */}
              <div 
                className={`absolute top-0 bottom-0 ${getBarPosition(category.diff)} ${getBarColor(category.diff)}`}
                style={{ 
                  width: getBarWidth(category.diff),
                  ...(category.diff < 0 ? { right: '50%' } : { left: '50%' })
                }}
              ></div>
              
              {/* Category label */}
              <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                {category.label}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TornadoChart; 