/**
 * React Query Hook: Players (Admin with Match Counts)
 * 
 * Fetches all players with optional match counts and retired filter.
 * Used by admin screens that need player management.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { PlayerProfile } from '@/types/player.types';

async function fetchPlayersAdmin(
  tenantId: string | null,
  includeMatchCounts: boolean = false,
  showRetired: boolean = false
): Promise<PlayerProfile[]> {
  if (!tenantId) return [];

  const params = new URLSearchParams();
  if (includeMatchCounts) params.append('include_match_counts', 'true');
  if (showRetired) params.append('show_retired', 'true');

  const response = await fetch(`/api/admin/players?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch players: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || [];
}

export function usePlayersAdmin(includeMatchCounts = false, showRetired = false) {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useQuery({
    queryKey: queryKeys.playersAdmin(tenantId, includeMatchCounts, showRetired),
    queryFn: () => fetchPlayersAdmin(tenantId, includeMatchCounts, showRetired),
    staleTime: 2 * 60 * 1000, // 2 minutes (player list changes occasionally)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

