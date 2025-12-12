/**
 * useVotingResults Hook
 * 
 * Fetches voting results for a match with automatic caching and deduplication
 * Used by: VotingResults component, MatchReport (for copy text)
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { useMatchReport } from '@/hooks/queries/useMatchReport.hook';
import { apiFetch } from '@/lib/apiConfig';

export interface VotingAwardWinner {
  playerId: number;
  playerName: string;
  voteCount: number;
  isCoWinner: boolean;
}

export interface VotingCategoryResults {
  winners: VotingAwardWinner[];
  totalVotes: number;
}

export interface VotingResultsData {
  hasWinners: boolean;
  votingOpen: boolean;
  enabledCategories: string[];
  results: Record<string, VotingCategoryResults>;
  closedAt?: string;
}

async function fetchVotingResults(matchId: number | undefined): Promise<VotingResultsData | null> {
  if (!matchId) {
    return null;
  }
  
  try {
    const response = await apiFetch(`/voting/results/${matchId}`);
    const data = await response.json();
    
    if (data.success && !data.votingOpen && data.hasWinners) {
      return {
        hasWinners: data.hasWinners,
        votingOpen: data.votingOpen,
        enabledCategories: data.enabledCategories || [],
        results: data.results,
        closedAt: data.closedAt
      };
    }
    
    return null;
  } catch (err) {
    console.error('Failed to fetch voting results:', err);
    return null;
  }
}

export function useVotingResults() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  // Get match_id from the same hook used by MatchReport
  const { data: matchData } = useMatchReport();
  const matchId = matchData?.matchInfo?.match_id;
  
  return useQuery({
    queryKey: ['votingResults', tenantId, matchId],
    queryFn: () => fetchVotingResults(matchId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!matchId, // Only fetch when we have a matchId
  });
}

