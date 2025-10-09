/**
 * useAllTimeStats Hook
 * 
 * Fetches all-time player statistics with automatic caching and deduplication
 * Used by: LeaderboardStats component
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { PlayerWithStats } from '@/types/player.types';
import { useAuth } from '@/hooks/useAuth.hook';

interface AllTimeStatsResponse {
  data: PlayerWithStats[];
}

async function fetchAllTimeStats(tenantId: string | null): Promise<PlayerWithStats[]> {
  // Gracefully handle missing tenantId
  if (!tenantId) {
    return [];
  }
  
  const response = await fetch('/api/allTimeStats', {
    credentials: 'include', // Important: include cookies for auth
  });
  
  if (!response.ok) {
    throw new Error(`All-time stats API returned ${response.status}`);
  }
  
  const result: AllTimeStatsResponse = await response.json();
  
  return result.data || [];
}

export function useAllTimeStats() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.allTimeStats(tenantId),
    queryFn: () => fetchAllTimeStats(tenantId),
    staleTime: 10 * 60 * 1000, // 10 minutes - stats update infrequently
    // NO enabled condition - queryFn handles missing tenantId gracefully
  });
}

