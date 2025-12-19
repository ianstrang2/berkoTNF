import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiConfig';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface PlayerConfigData {
  config_key: string;
  config_value: string;
  config_group: string;
}

interface UsePlayerConfigOptions {
  groups?: string[];
}

/**
 * Hook for fetching player-accessible config (read-only)
 * 
 * Uses /api/player/config which is faster than /api/admin/app-config
 * because it skips admin role checks (2 fewer DB queries).
 * 
 * Only returns whitelisted config groups: club_team_names, match_report
 */
export function usePlayerConfig(options: UsePlayerConfigOptions = {}): ReturnType<typeof useQuery<PlayerConfigData[]>> {
  const { profile } = useAuth();
  const { groups } = options;
  
  return useQuery({
    queryKey: queryKeys.playerConfig(groups),
    enabled: !!profile.tenantId,
    queryFn: async () => {
      let queryParams = '';
      if (groups && groups.length > 0) {
        queryParams = `groups=${encodeURIComponent(groups.join(','))}`;
      }
  
      const response = await apiFetch(`/player/config${queryParams ? `?${queryParams}` : ''}`);
  
      if (!response.ok) {
        throw new Error('Failed to fetch configuration settings');
      }
  
      const result = await response.json();
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error(result.error || 'Failed to fetch valid configuration settings data');
      }
  
      return result.data as PlayerConfigData[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - config doesn't change often
  });
}
