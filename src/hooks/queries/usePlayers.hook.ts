/**
 * usePlayers Hook
 * 
 * Fetches all players with automatic caching and deduplication
 * Used by: MatchReport, PersonalBests, Milestones, CurrentForm components
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { PlayerProfile } from '@/types/player.types';
import { useAuth } from '@/hooks/useAuth.hook';

interface PlayersResponse {
  data: PlayerProfile[];
}

async function fetchPlayers(tenantId: string | null): Promise<PlayerProfile[]> {
  // Gracefully handle missing tenantId
  if (!tenantId) {
    return [];
  }
  
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
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.players(tenantId),
    queryFn: () => fetchPlayers(tenantId),
    staleTime: 10 * 60 * 1000, // 10 minutes - players don't change often
    // NO enabled condition - queryFn handles missing tenantId gracefully
  });
}

