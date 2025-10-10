import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface LatestPlayerStatus {
  on_fire_player_id: string | null;
  grim_reaper_player_id: string | null;
}

async function fetchLatestPlayerStatus(tenantId: string | null): Promise<LatestPlayerStatus> {
  // Gracefully handle missing tenantId - return empty data
  if (!tenantId) {
    return {
      on_fire_player_id: null,
      grim_reaper_player_id: null
    };
  }
  
  const response = await fetch('/api/latest-player-status', { 
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch player status: ${response.status}`);
  }
  
  const result = await response.json();
  return result;
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

