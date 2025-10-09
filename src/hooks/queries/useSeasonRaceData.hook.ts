/**
 * useSeasonRaceData Hook
 * 
 * Fetches season race graph data with automatic caching and deduplication
 * Used by: SeasonRaceGraph component
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface PlayerRaceData {
  player_id: number;
  name: string;
  cumulative_data: Array<{
    date: string;
    points: number;
  }>;
}

interface SeasonRaceData {
  players: PlayerRaceData[];
  lastUpdated: string | null;
  periodType: string;
}

interface SeasonRaceDataResponse {
  success: boolean;
  data: SeasonRaceData;
  error?: string;
}

async function fetchSeasonRaceData(period: 'whole_season' | 'current_half'): Promise<SeasonRaceData> {
  const response = await fetch(`/api/season-race-data?period=${period}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Season race data API returned ${response.status}`);
  }
  
  const result: SeasonRaceDataResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch season race data');
  }
  
  return result.data;
}

export function useSeasonRaceData(period: 'whole_season' | 'current_half' = 'whole_season') {
  return useQuery({
    queryKey: queryKeys.seasonRaceData(period),
    queryFn: () => fetchSeasonRaceData(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

