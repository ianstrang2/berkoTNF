export interface LeaderData {
  change_type: 'new_leader' | 'tied' | 'remains' | 'overtake';
  new_leader: string;
  previous_leader?: string;
  new_leader_goals?: number;
  new_leader_points?: number;
  previous_leader_goals?: number;
  previous_leader_points?: number;
  value?: number;
}

export const formatLeaderText = (leaderData: LeaderData, metric: 'goals' | 'points', period: string): string => {
  if (!leaderData || !leaderData.new_leader) {
    console.error('Invalid leader data:', leaderData);
    return `Unknown leader in ${metric}`;
  }
  
  const { change_type, new_leader, previous_leader } = leaderData;
  
  const value = metric === 'goals' 
    ? (leaderData.new_leader_goals || leaderData.value || 0) 
    : (leaderData.new_leader_points || leaderData.value || 0);
        
  if (!change_type && new_leader) {
    return `${new_leader} leads ${period} ${metric} with ${value}`;
  }
  
  switch (change_type) {
    case 'new_leader':
      return `${new_leader} now leads ${period} ${metric} with ${value}`;
    case 'tied':
      return `${new_leader} tied with ${previous_leader} at ${value} for ${period} ${metric}`;
    case 'remains':
      return `${new_leader} still leads ${period} ${metric} with ${value}`;
    case 'overtake':
      return `${new_leader} overtook ${previous_leader} to lead ${period} ${metric} with ${value}`;
    default:
      return `${new_leader} leads ${period} ${metric} with ${value}`;
  }
}; 