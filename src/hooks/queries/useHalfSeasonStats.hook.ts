/**
 * useHalfSeasonStats Hook
 * 
 * Fetches half-season statistics with automatic caching and deduplication
 * Used by: CurrentHalfSeason component
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { PlayerWithStats, PlayerWithGoalStats } from '@/types/player.types';
import { useAuth } from '@/hooks/useAuth.hook';
import { apiFetch } from '@/lib/apiConfig';

interface FormData {
  name: string;
  last_5_games?: string;
}

interface HalfSeasonStatsData {
  seasonStats: PlayerWithStats[];
  goalStats: PlayerWithGoalStats[];
  formData: FormData[];
}

interface HalfSeasonStatsResponse {
  data: HalfSeasonStatsData;
}

async function fetchHalfSeasonStats(tenantId: string | null): Promise<HalfSeasonStatsData> {
  // Gracefully handle missing tenantId - return empty data
  if (!tenantId) {
    return { seasonStats: [], goalStats: [], formData: [] };
  }
  
  const response = await apiFetch('/stats/half-season', {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Half-season stats API returned ${response.status}`);
  }
  
  const result: HalfSeasonStatsResponse = await response.json();
  
  return result.data;
}

export function useHalfSeasonStats() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.halfSeasonStats(tenantId),
    queryFn: () => fetchHalfSeasonStats(tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes - stats don't change that often
    // NO enabled condition - queryFn handles missing tenantId gracefully
  });
}

