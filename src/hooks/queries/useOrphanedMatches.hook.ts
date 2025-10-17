/**
 * React Query Hook: Orphaned Matches (Admin)
 * 
 * Fetches matches that aren't covered by any season.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { apiFetch } from '@/lib/apiConfig';

interface OrphanedMatch {
  match_id: number;
  match_date: string;
  team_a_score: number;
  team_b_score: number;
  days_from_nearest_season: number;
}

async function fetchOrphanedMatches(tenantId: string | null): Promise<OrphanedMatch[]> {
  if (!tenantId) return [];

  const response = await apiFetch('/matches/orphaned');

  if (!response.ok) {
    throw new Error(`Failed to fetch orphaned matches: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || [];
}

export function useOrphanedMatches() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useQuery({
    queryKey: queryKeys.orphanedMatches(tenantId),
    queryFn: () => fetchOrphanedMatches(tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes (changes when seasons updated)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}




