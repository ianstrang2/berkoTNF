import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiConfig';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

export interface Weight {
  attribute_id: string;
  name: string;
  description: string;
  weight: number;
}

export function useBalanceAlgorithm() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.balanceAlgorithm(),
    enabled: !!profile.tenantId,
    queryFn: async () => {
      const response = await apiFetch('/admin/balance-algorithm');
      
      if (!response.ok) {
        throw new Error('Failed to fetch balance weights');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data as Weight[];
      }
      
      throw new Error(data.error || 'Failed to fetch balance weights');
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
}

export function useUpdateBalanceAlgorithm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (weights: Weight[]) => {
      const response = await apiFetch('/admin/balance-algorithm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save balance weights');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.balanceAlgorithm() });
    },
  });
}

export function useResetBalanceAlgorithm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiFetch('/admin/balance-algorithm/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to reset balance weights');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.balanceAlgorithm() });
    },
  });
}

