import React from 'react';
import { TeamStatsProps } from '@/types/team-algorithm.types';
import StatBar from './StatBar.component';

const TeamStats: React.FC<TeamStatsProps> = ({ teamType, stats }) => {
  if (!stats) return null;
  
  const teamColor = teamType === 'a' ? 'orange' : 'green';
  
  // Calculate position-based metrics using weighted attributes
  const defenseScore = stats.defending * 0.5 + stats.stamina_pace * 0.3 + stats.control * 0.2;
  const midfieldScore = stats.control * 0.4 + stats.stamina_pace * 0.3 + stats.goalscoring * 0.3;
  const attackingScore = stats.goalscoring * 0.5 + stats.stamina_pace * 0.3 + stats.control * 0.2;
  
  return (
    <div className="bg-white rounded-md shadow p-3 mb-4">
      <div>
        <StatBar label="Defense" value={defenseScore} color={teamColor} />
        <StatBar label="Midfield" value={midfieldScore} color={teamColor} />
        <StatBar label="Attacking" value={attackingScore} color={teamColor} />
        <StatBar label="Teamwork" value={stats.teamwork} color={teamColor} />
        <StatBar label="Resilience" value={stats.resilience} color={teamColor} />
      </div>
    </div>
  );
};

export default TeamStats; 