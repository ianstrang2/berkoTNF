import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { apiFetch } from '@/lib/apiConfig';

interface UpcomingMatch {
  upcoming_match_id: number;
  match_date: string;
  state: string;
  _count: {
    upcoming_match_players: number;
  };
  team_size: number;
  actual_size_a?: number;
  actual_size_b?: number;
  teams_saved_at?: string | null;
}

async function fetchUpcomingMatches(tenantId: string | null): Promise<UpcomingMatch[]> {
  // Gracefully handle missing tenantId - return empty data
  if (!tenantId) return [];
  
  const response = await apiFetch('/upcoming', { 
    cache: 'no-store'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch upcoming matches: ${response.status}`);
  }
  
  const result = await response.json();
  return result.data || [];
}

export function useUpcomingMatches() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.upcoming(tenantId),
    queryFn: () => fetchUpcomingMatches(tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes - matches don't change often
  });
}

