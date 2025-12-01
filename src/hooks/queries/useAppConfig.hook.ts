import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiConfig';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

export interface AppConfigData {
  config_id: number;
  config_key: string;
  config_value: string;
  config_description: string;
  config_group: string;
  display_name: string;
  display_group: string;
  sort_order: number;
  complexity_level?: string;
}

interface UseAppConfigOptions {
  groups?: string[];
  complexity?: 'standard' | 'advanced';
}

export function useAppConfig(options: UseAppConfigOptions = {}) {
  const { groups, complexity } = options;
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.appConfig(groups, complexity),
    enabled: !!profile.tenantId,
    queryFn: async () => {
      let queryParams = '';
      if (groups && groups.length > 0) {
        queryParams = `groups=${encodeURIComponent(groups.join(','))}`;
      }
      if (complexity) {
        queryParams += (queryParams ? '&' : '') + `complexity=${complexity}`;
      }
      
      const response = await apiFetch(`/admin/app-config${queryParams ? `?${queryParams}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch configuration settings');
      }
      
      const result = await response.json();
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error(result.error || 'Failed to fetch valid configuration settings data');
      }
      
      return result.data as AppConfigData[];
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
}

export function useUpdateAppConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (configs: Array<{ config_key: string; config_value: string }>) => {
      const response = await apiFetch('/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save settings');
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate all app-config queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
    },
  });
}

export function useResetAppConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (group: string) => {
      const response = await apiFetch('/admin/app-config/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reset settings');
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate all app-config queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
    },
  });
}
