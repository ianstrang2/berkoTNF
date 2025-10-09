/**
 * useSeasons Hook
 * 
 * Fetches seasons list with automatic caching and deduplication
 * Used by: OverallSeasonPerformance component
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface Season {
  season_id: number;
  year: number;
  startDate: string;
  endDate: string;
  description?: string;
}

interface SeasonsResponse {
  success: boolean;
  data: Season[];
  error?: string;
}

async function fetchSeasons(): Promise<Season[]> {
  const response = await fetch('/api/seasons', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Seasons API returned ${response.status}`);
  }
  
  const result: SeasonsResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch seasons');
  }
  
  return result.data || [];
}

export function useSeasons() {
  return useQuery({
    queryKey: queryKeys.seasons(),
    queryFn: fetchSeasons,
    staleTime: 10 * 60 * 1000, // 10 minutes - seasons don't change often
  });
}

