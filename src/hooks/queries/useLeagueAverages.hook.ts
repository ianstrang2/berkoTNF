/**
 * React Query Hook: League Averages
 * 
 * Fetches league-wide performance averages for player profile normalization.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface YearlyAverage {
  year: number;
  games_played_avg: number;
  goals_scored_avg: number;
  minutes_per_goal_avg: number;
  points_per_game_avg: number;
}

interface LeagueAveragesData {
  averages: YearlyAverage[];
  totalPlayers: number;
  yearsWithData: number;
}

async function fetchLeagueAverages(
  tenantId: string | null
): Promise<YearlyAverage[]> {
  if (!tenantId) {
    return [];
  }

  const response = await fetch('/api/stats/league-averages', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch league averages: ${response.statusText}`);
  }

  const data: LeagueAveragesData = await response.json();
  return data.averages || [];
}

export function useLeagueAverages() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useQuery({
    queryKey: queryKeys.leagueAverages(tenantId),
    queryFn: () => fetchLeagueAverages(tenantId),
    staleTime: 10 * 60 * 1000, // 10 minutes (changes infrequently)
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}



