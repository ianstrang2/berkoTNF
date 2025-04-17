import React from 'react';
import { TeamStatsProps } from '@/types/team-algorithm.types';
import StatBar from './StatBar.component';

const TeamStats: React.FC<TeamStatsProps> = ({ teamType, stats }) => {
  if (!stats) return null;
  
  const teamColor = teamType === 'a' ? 'orange' : 'green';
  
  // Helper to calculate weighted position score
  const calculatePositionScore = (positionStats: any, weights: Record<string, number>) => {
    return Object.entries(weights).reduce((score, [attr, weight]) => {
      return score + (positionStats[attr] || 0) * weight;
    }, 0);
  };
  
  // Weights for each position group
  const defenseWeights = {
    defending: 0.5,
    stamina_pace: 0.3,
    control: 0.2
  };
  
  const midfieldWeights = {
    control: 0.4,
    stamina_pace: 0.3,
    goalscoring: 0.3
  };
  
  const attackWeights = {
    goalscoring: 0.5,
    stamina_pace: 0.3,
    control: 0.2
  };
  
  // Calculate position scores using weighted attributes
  const defenseScore = calculatePositionScore(stats.defense, defenseWeights);
  const midfieldScore = calculatePositionScore(stats.midfield, midfieldWeights);
  const attackingScore = calculatePositionScore(stats.attack, attackWeights);
  
  // Calculate average teamwork and resilience across all positions
  const teamworkScore = (stats.defense.teamwork + stats.midfield.teamwork + stats.attack.teamwork) / 3;
  const resilienceScore = (stats.defense.resilience + stats.midfield.resilience + stats.attack.resilience) / 3;
  
  return (
    <div className="bg-white rounded-md shadow p-3 mb-4">
      <div>
        <StatBar label="Defense" value={defenseScore} color={teamColor} />
        <StatBar label="Midfield" value={midfieldScore} color={teamColor} />
        <StatBar label="Attacking" value={attackingScore} color={teamColor} />
        <StatBar label="Teamwork" value={teamworkScore} color={teamColor} />
        <StatBar label="Resilience" value={resilienceScore} color={teamColor} />
      </div>
    </div>
  );
};

export default TeamStats; 