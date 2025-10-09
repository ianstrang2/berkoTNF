/**
 * usePersonalBests Hook
 * 
 * Fetches personal bests data with automatic caching and deduplication
 * Used by: MatchReport, PersonalBests components
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { PersonalBestsAPIResponseData } from '@/types/personal-bests.types';

interface PersonalBestsResponse {
  success: boolean;
  data: PersonalBestsAPIResponseData | null;
  error?: string;
}

async function fetchPersonalBests(): Promise<PersonalBestsAPIResponseData | null> {
  const response = await fetch('/api/personal-bests');
  
  if (!response.ok) {
    // Don't throw error for 404 - new tenants may not have data yet
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Personal bests API returned ${response.status}`);
  }
  
  const result: PersonalBestsResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch personal bests');
  }
  
  return result.data;
}

export function usePersonalBests() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.personalBests(tenantId),
    queryFn: () => fetchPersonalBests(tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    // NO enabled condition - queryFn handles missing tenantId gracefully
  });
}

