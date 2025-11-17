/**
 * React Query Hook: Player Trends
 * 
 * Fetches EWMA-based performance trends and percentiles for a player.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { apiFetch } from '@/lib/apiConfig';

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

  const response = await apiFetch(`/player/trends/${playerId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch trends: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success || !result.data) {
    console.warn('[usePlayerTrends] No trend data returned from API');
    return null;
  }

  // API returns snake_case field names from toPlayerWithTrend transform
  const trendData = {
    power_rating_percentile: result.data.power_rating_percentile ?? null,
    goal_threat_percentile: result.data.goal_threat_percentile ?? null,
    participation_percentile: result.data.participation_percentile ?? null,
  };
  
  console.log('[usePlayerTrends] Trend data:', trendData);
  return trendData;
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




