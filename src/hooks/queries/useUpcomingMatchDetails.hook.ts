import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { PlayerInPool } from '@/types/player.types';
import { apiFetch } from '@/lib/apiConfig';

interface UpcomingMatchWithPlayers {
  upcoming_match_id: number;
  match_date: string;
  state: string;
  team_size: number;
  actual_size_a?: number;
  actual_size_b?: number;
  players: PlayerInPool[];
}

async function fetchUpcomingMatchDetails(
  tenantId: string | null,
  matchId: number | null
): Promise<UpcomingMatchWithPlayers | null> {
  // Gracefully handle missing tenantId or matchId
  if (!tenantId || !matchId) return null;
  
  const response = await apiFetch(`/upcoming?matchId=${matchId}`, { 
    cache: 'no-store'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch match details: ${response.status}`);
  }
  
  const result = await response.json();
  return result.data || null;
}

export function useUpcomingMatchDetails(matchId: number | null) {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.upcomingMatchDetails(tenantId, matchId),
    queryFn: () => fetchUpcomingMatchDetails(tenantId, matchId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!matchId, // Only fetch when matchId is provided
  });
}

