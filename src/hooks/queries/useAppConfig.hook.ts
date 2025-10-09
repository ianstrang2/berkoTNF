/**
 * useAppConfig Hook
 * 
 * Fetches app configuration with automatic caching and deduplication
 * Used by: MatchReport, CurrentForm components
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

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

async function fetchAppConfig(group?: string): Promise<AppConfigItem[]> {
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
  return useQuery({
    queryKey: queryKeys.appConfig(group),
    queryFn: () => fetchAppConfig(group),
    staleTime: 10 * 60 * 1000, // 10 minutes - config doesn't change often
  });
}

