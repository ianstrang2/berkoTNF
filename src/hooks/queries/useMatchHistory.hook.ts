/**
 * React Query Hook: Match History (Admin)
 * 
 * Fetches historical/completed matches for admin viewing.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface HistoricalMatch {
  match_id: number;
  upcoming_match_id: number;
  match_date: string;
  team_a_score: number;
  team_b_score: number;
}

async function fetchMatchHistory(
  tenantId: string | null
): Promise<HistoricalMatch[]> {
  if (!tenantId) return [];

  const response = await fetch('/api/matches/history', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch match history: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || [];
}

export function useMatchHistory() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useQuery({
    queryKey: queryKeys.matchHistory(tenantId),
    queryFn: () => fetchMatchHistory(tenantId),
    staleTime: 60 * 1000, // 1 minute (history doesn't change as often)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

