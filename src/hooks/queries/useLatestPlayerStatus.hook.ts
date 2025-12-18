import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { apiFetch } from '@/lib/apiConfig';

// Individual voting award holder
export interface VotingAwardHolder {
  player_id: string;
  is_co_winner: boolean;
}

// Voting awards by category
export interface VotingAwards {
  mom: VotingAwardHolder[];
  dod: VotingAwardHolder[];
  mia: VotingAwardHolder[];
}

export interface LatestPlayerStatus {
  on_fire_player_id: string | null;
  grim_reaper_player_id: string | null;
  voting_awards: VotingAwards;
  voting_enabled: boolean; // Whether voting feature is enabled in config
}

const EMPTY_VOTING_AWARDS: VotingAwards = {
  mom: [],
  dod: [],
  mia: [],
};

async function fetchLatestPlayerStatus(tenantId: string | null): Promise<LatestPlayerStatus> {
  // Gracefully handle missing tenantId - return empty data
  if (!tenantId) {
    return {
      on_fire_player_id: null,
      grim_reaper_player_id: null,
      voting_awards: EMPTY_VOTING_AWARDS,
      voting_enabled: false,
    };
  }
  
  const response = await apiFetch('/latest-player-status');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch player status: ${response.status}`);
  }
  
  const result = await response.json();
  // Ensure voting_awards is always present (backwards compatibility)
  return {
    ...result,
    voting_awards: result.voting_awards || EMPTY_VOTING_AWARDS,
    voting_enabled: result.voting_enabled ?? true, // Default to true for backwards compatibility
  };
}

export function useLatestPlayerStatus() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.latestPlayerStatus(tenantId),
    queryFn: () => fetchLatestPlayerStatus(tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes - status doesn't change often
  });
}

