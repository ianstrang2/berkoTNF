/**
 * React Query Hook: Player Trends
 * 
 * Fetches EWMA-based performance trends and percentiles for a player.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface PlayerTrendData {
  power_rating_percentile: number | null;
  goal_threat_percentile: number | null;
  participation_percentile: number | null;
}

async function fetchPlayerTrends(
  playerId: number | null | undefined,
  tenantId: string | null
): Promise<PlayerTrendData | null> {
  if (!playerId || !tenantId) {
    return null;
  }

  const response = await fetch(`/api/player/trends/${playerId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch trends: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success || !result.data) {
    return null;
  }

  return {
    power_rating_percentile: result.data.powerRatingPercentile ?? null,
    goal_threat_percentile: result.data.goalThreatPercentile ?? null,
    participation_percentile: result.data.participationPercentile ?? null,
  };
}

export function usePlayerTrends(playerId: number | null | undefined) {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useQuery({
    queryKey: queryKeys.playerTrends(tenantId, playerId),
    queryFn: () => fetchPlayerTrends(playerId, tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}




