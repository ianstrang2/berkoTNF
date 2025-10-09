/**
 * useCurrentSeason Hook
 * 
 * Fetches current season with automatic caching and deduplication
 * Used by: useSeasonTitles hook, table components
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface CurrentSeasonData {
  id: string;
  startDate: string;
  halfDate: string;
  endDate: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

interface CurrentSeasonResponse {
  success: boolean;
  data: CurrentSeasonData | null;
  error?: string;
}

async function fetchCurrentSeason(tenantId: string | null): Promise<CurrentSeasonData | null> {
  // Gracefully handle missing tenantId
  if (!tenantId) {
    return null;
  }
  
  const response = await fetch('/api/seasons/current', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Current season API returned ${response.status}`);
  }
  
  const result: CurrentSeasonResponse = await response.json();
  
  if (!result.success) {
    // No current season - return null (not an error)
    return null;
  }
  
  return result.data;
}

export function useCurrentSeason() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.currentSeason(tenantId),
    queryFn: () => fetchCurrentSeason(tenantId),
    staleTime: 10 * 60 * 1000, // 10 minutes - current season doesn't change often
    // NO enabled condition - queryFn handles missing tenantId gracefully
  });
}

