/**
 * useCurrentStats Hook
 * 
 * Fetches current/whole season statistics with automatic caching and deduplication
 * Used by: OverallSeasonPerformance component
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

interface CurrentStatsData {
  seasonStats: PlayerWithStats[];
  goalStats: PlayerWithGoalStats[];
  formData: FormData[];
}

interface CurrentStatsResponse {
  data: CurrentStatsData;
}

async function fetchCurrentStats(year: number, tenantId: string | null): Promise<CurrentStatsData> {
  // Gracefully handle missing tenantId - return empty data
  if (!tenantId || !year) {
    return { seasonStats: [], goalStats: [], formData: [] };
  }
  
  const response = await apiFetch('/stats', {
    method: 'POST',
    body: JSON.stringify({
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Current stats API returned ${response.status}`);
  }
  
  const result: CurrentStatsResponse = await response.json();
  
  return result.data;
}

export function useCurrentStats(year: number) {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.currentStats(tenantId, year),
    queryFn: () => fetchCurrentStats(year, tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    // NO enabled condition - queryFn handles missing tenantId gracefully
  });
}

