/**
 * useVotingActive Hook
 * 
 * Fetches active voting/survey status with automatic caching and deduplication.
 * Used by: VotingBanner, VotingModal components
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiConfig';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthContext } from '@/contexts/AuthContext';

// Matches the API response from /api/voting/active
export interface VotingActiveSurvey {
  id: number;
  matchId: number;
  matchDate?: string;
  matchScore?: {
    teamA: number;
    teamB: number;
  };
  enabledCategories?: string[];
  eligiblePlayers?: Array<{
    id: number;
    name: string;
    selectedClub?: string;
  }>;
  userVotes?: Record<string, number | null>;
  hasVoted: boolean;
  totalVoters?: number;
  totalEligible?: number;
  votingClosesAt: string;
  timeRemainingMs?: number;
  message?: string; // When not eligible
}

export interface VotingActiveData {
  success: boolean;
  hasActiveSurvey: boolean;
  isEligible?: boolean;
  survey: VotingActiveSurvey | null;
  error?: string;
}

async function fetchVotingActive(): Promise<VotingActiveData> {
  const response = await apiFetch('/voting/active');
  const data = await response.json();
  
  if (!data.success) {
    // Return a valid structure with no active survey
    return {
      success: true,
      hasActiveSurvey: false,
      isEligible: false,
      survey: null,
    };
  }
  
  return data;
}

export function useVotingActive() {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.votingActive(profile.tenantId),
    queryFn: fetchVotingActive,
    enabled: profile.isAuthenticated && !!profile.tenantId,
    staleTime: 30 * 1000, // 30 seconds - voting status doesn't change often
    refetchOnWindowFocus: false, // Don't spam on tab focus
  });
  
  return {
    ...query,
    // Helper to invalidate/refetch after voting
    invalidate: () => queryClient.invalidateQueries({ 
      queryKey: queryKeys.votingActive(profile.tenantId) 
    }),
  };
}

