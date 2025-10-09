/**
 * useCurrentStats Hook
 * 
 * Fetches current/whole season statistics with automatic caching and deduplication
 * Used by: OverallSeasonPerformance component
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { PlayerWithStats, PlayerWithGoalStats } from '@/types/player.types';

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

async function fetchCurrentStats(year: number): Promise<CurrentStatsData> {
  const response = await fetch('/api/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    }),
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Current stats API returned ${response.status}`);
  }
  
  const result: CurrentStatsResponse = await response.json();
  
  return result.data;
}

export function useCurrentStats(year: number) {
  return useQuery({
    queryKey: queryKeys.currentStats(year),
    queryFn: () => fetchCurrentStats(year),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!year, // Only fetch if year is provided
  });
}

