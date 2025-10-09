/**
 * useAppConfig Hook
 * 
 * Fetches app configuration with automatic caching and deduplication
 * Used by: MatchReport, CurrentForm components
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface AppConfigItem {
  config_key: string;
  config_value: string;
  config_group?: string;
}

interface AppConfigResponse {
  success: boolean;
  data: AppConfigItem[];
  error?: string;
}

async function fetchAppConfig(tenantId: string | null, group?: string): Promise<AppConfigItem[]> {
  // Gracefully handle missing tenantId
  if (!tenantId) {
    return [];
  }
  
  const url = group 
    ? `/api/admin/app-config?group=${encodeURIComponent(group)}`
    : '/api/admin/app-config';
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`App config API returned ${response.status}`);
  }
  
  const result: AppConfigResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch app config');
  }
  
  return result.data || [];
}

export function useAppConfig(group?: string) {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.appConfig(tenantId, group),
    queryFn: () => fetchAppConfig(tenantId, group),
    staleTime: 10 * 60 * 1000, // 10 minutes - config doesn't change often
    // NO enabled condition - queryFn handles missing tenantId gracefully
  });
}

