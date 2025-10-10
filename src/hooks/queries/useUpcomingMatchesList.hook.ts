/**
 * React Query Hook: Upcoming Matches List (Admin)
 * 
 * Fetches all upcoming/active matches for admin match management page.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface ActiveMatch {
  upcoming_match_id: number;
  match_date: string;
  state: string;
  _count: {
    upcoming_match_players: number;
  };
}

async function fetchUpcomingMatches(
  tenantId: string | null
): Promise<ActiveMatch[]> {
  if (!tenantId) return [];

  const response = await fetch('/api/admin/upcoming-matches', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch upcoming matches: ${response.statusText}`);
  }

  const result = await response.json();
  // Filter out completed matches
  return result.data?.filter((m: ActiveMatch) => m.state !== 'Completed') || [];
}

export function useUpcomingMatchesList() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useQuery({
    queryKey: queryKeys.upcomingMatchesList(tenantId),
    queryFn: () => fetchUpcomingMatches(tenantId),
    staleTime: 30 * 1000, // 30 seconds (changes frequently in admin)
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutation hook for creating new matches
export function useCreateMatch() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useMutation({
    mutationFn: async (data: { match_date: string; team_size: number }) => {
      const response = await fetch('/api/admin/upcoming-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create match');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch upcoming matches list
      queryClient.invalidateQueries({ queryKey: queryKeys.upcomingMatchesList(tenantId) });
    },
  });
}

// Mutation hook for deleting matches
export function useDeleteMatch() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useMutation({
    mutationFn: async ({ matchId, isHistorical }: { matchId: number; isHistorical: boolean }) => {
      const endpoint = isHistorical 
        ? `/api/matches/history?matchId=${matchId}`
        : `/api/admin/upcoming-matches?id=${matchId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete match');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate both lists
      queryClient.invalidateQueries({ queryKey: queryKeys.upcomingMatchesList(tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matchHistory(tenantId) });
    },
  });
}

