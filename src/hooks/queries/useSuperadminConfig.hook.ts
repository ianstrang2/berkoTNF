import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiConfig';

// Types
export interface SuperadminConfigData {
  config_id: number;
  config_key: string;
  config_value: string;
  config_description: string | null;
  display_name: string;
  display_group: string;
  sort_order: number;
}

interface UpdateConfigItem {
  config_key: string;
  config_value: string;
}

// Query keys
export const superadminConfigKeys = {
  all: ['superadmin-config'] as const,
  byGroup: (group: string) => ['superadmin-config', group] as const,
};

/**
 * Fetch superadmin config data
 */
async function fetchSuperadminConfig(group?: string): Promise<SuperadminConfigData[]> {
  const url = group 
    ? `/superadmin/settings?group=${encodeURIComponent(group)}`
    : '/superadmin/settings';
    
  const response = await apiFetch(url);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch superadmin config');
  }
  
  return data.data;
}

/**
 * Update superadmin config values
 */
async function updateSuperadminConfig(updates: UpdateConfigItem[]): Promise<void> {
  const response = await apiFetch('/superadmin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to update superadmin config');
  }
}

/**
 * Hook to fetch superadmin config
 */
export function useSuperadminConfig(options?: { group?: string }) {
  const { group } = options || {};
  
  return useQuery({
    queryKey: group ? superadminConfigKeys.byGroup(group) : superadminConfigKeys.all,
    queryFn: () => fetchSuperadminConfig(group),
    staleTime: 5 * 60 * 1000, // 5 minutes - these don't change often
  });
}

/**
 * Hook to update superadmin config
 */
export function useUpdateSuperadminConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateSuperadminConfig,
    onSuccess: () => {
      // Invalidate all superadmin config queries
      queryClient.invalidateQueries({ queryKey: superadminConfigKeys.all });
    },
  });
}

