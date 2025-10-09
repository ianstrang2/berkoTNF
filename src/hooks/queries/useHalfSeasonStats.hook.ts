/**
 * useHalfSeasonStats Hook
 * 
 * Fetches half-season statistics with automatic caching and deduplication
 * Used by: CurrentHalfSeason component
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { PlayerWithStats, PlayerWithGoalStats } from '@/types/player.types';

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

async function fetchHalfSeasonStats(): Promise<HalfSeasonStatsData> {
  const response = await fetch('/api/stats/half-season', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Half-season stats API returned ${response.status}`);
  }
  
  const result: HalfSeasonStatsResponse = await response.json();
  
  return result.data;
}

export function useHalfSeasonStats() {
  return useQuery({
    queryKey: queryKeys.halfSeasonStats(),
    queryFn: fetchHalfSeasonStats,
    staleTime: 5 * 60 * 1000, // 5 minutes - stats don't change that often
  });
}

