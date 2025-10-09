/**
 * usePlayers Hook
 * 
 * Fetches all players with automatic caching and deduplication
 * Used by: MatchReport, PersonalBests, Milestones, CurrentForm components
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { PlayerProfile } from '@/types/player.types';

interface PlayersResponse {
  data: PlayerProfile[];
}

async function fetchPlayers(): Promise<PlayerProfile[]> {
  const response = await fetch('/api/players', {
    credentials: 'include', // Important: include cookies for auth
  });
  
  if (!response.ok) {
    throw new Error(`Players API returned ${response.status}`);
  }
  
  const result: PlayersResponse = await response.json();
  
  return result.data || [];
}

export function usePlayers() {
  return useQuery({
    queryKey: queryKeys.players(),
    queryFn: fetchPlayers,
    staleTime: 10 * 60 * 1000, // 10 minutes - players don't change often
  });
}

