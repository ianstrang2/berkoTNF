/**
 * useSeasons Hook
 * 
 * Fetches seasons list with automatic caching and deduplication
 * Used by: OverallSeasonPerformance component
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { Season, SeasonsListResponse } from '@/types/season.types';
import { apiFetch } from '@/lib/apiConfig';

async function fetchSeasons(tenantId: string | null): Promise<Season[]> {
  // Gracefully handle missing tenantId
  if (!tenantId) {
    return [];
  }
  
  const response = await apiFetch('/seasons');
  
  if (!response.ok) {
    throw new Error(`Seasons API returned ${response.status}`);
  }
  
  const result: SeasonsListResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch seasons');
  }
  
  return result.data || [];
}

export function useSeasons() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.seasons(tenantId),
    queryFn: () => fetchSeasons(tenantId),
    staleTime: 10 * 60 * 1000, // 10 minutes - seasons don't change often
    // NO enabled condition - queryFn handles missing tenantId gracefully
  });
}

