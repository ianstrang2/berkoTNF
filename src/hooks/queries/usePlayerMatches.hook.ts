/**
 * React Query Hook: Player Matches
 * 
 * Fetches complete match history for a player.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface Match {
  date: string;
  goals: number;
  result: 'win' | 'loss' | 'draw';
}

async function fetchPlayerMatches(
  playerId: number | null | undefined,
  tenantId: string | null
): Promise<Match[]> {
  if (!playerId || !tenantId) {
    return [];
  }

  const response = await fetch(`/api/player/${playerId}/allmatches`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch match data: ${response.statusText}`);
  }

  const data = await response.json();
  return data.matches || [];
}

export function usePlayerMatches(playerId: number | null | undefined) {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useQuery({
    queryKey: queryKeys.playerMatches(tenantId, playerId),
    queryFn: () => fetchPlayerMatches(playerId, tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}




