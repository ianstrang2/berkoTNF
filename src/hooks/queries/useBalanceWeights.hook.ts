/**
 * React Query Hook: Balance Algorithm Weights
 * 
 * Fetches team balance algorithm weights for the Match Control Center.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface BalanceWeight {
  name: string;
  description: string;
  weight: number;
}

interface BalanceWeights {
  defense: Record<string, number>;
  midfield: Record<string, number>;
  attack: Record<string, number>;
}

interface PerformanceWeights {
  power_weight: number;
  goal_weight: number;
}

async function fetchBalanceAlgorithm(tenantId: string | null): Promise<BalanceWeights> {
  if (!tenantId) {
    return { defense: {}, midfield: {}, attack: {} };
  }

  const response = await fetch('/api/admin/balance-algorithm', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch balance algorithm: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success || !result.data) {
    return { defense: {}, midfield: {}, attack: {} };
  }

  // Transform to TornadoChart format
  const formattedWeights: BalanceWeights = {
    defense: {},
    midfield: {},
    attack: {}
  };

  result.data.forEach((weight: BalanceWeight) => {
    const group = weight.description;
    const attribute = weight.name;
    if (group && attribute && formattedWeights[group as keyof BalanceWeights]) {
      formattedWeights[group as keyof BalanceWeights][attribute] = weight.weight;
    }
  });

  return formattedWeights;
}

async function fetchPerformanceWeights(tenantId: string | null): Promise<PerformanceWeights> {
  if (!tenantId) {
    return { power_weight: 0.5, goal_weight: 0.5 };
  }

  const response = await fetch('/api/admin/performance-weights', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch performance weights: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success || !result.data) {
    return { power_weight: 0.5, goal_weight: 0.5 };
  }

  return result.data;
}

export function useBalanceAlgorithm() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useQuery({
    queryKey: queryKeys.balanceAlgorithm(tenantId),
    queryFn: () => fetchBalanceAlgorithm(tenantId),
    staleTime: 10 * 60 * 1000, // 10 minutes (rarely changes)
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function usePerformanceWeights() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useQuery({
    queryKey: queryKeys.performanceWeights(tenantId),
    queryFn: () => fetchPerformanceWeights(tenantId),
    staleTime: 10 * 60 * 1000, // 10 minutes (rarely changes)
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

