'use client';

import { useState, useEffect, useCallback } from 'react';
import { differenceInHours } from 'date-fns';
import { PlayerInPool } from '@/types/player.types';

interface ToastState {
  message: string;
  type: 'success' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface MatchCompletedModalState {
  isOpen: boolean;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
}

interface MatchData {
  state: 'Draft' | 'PoolLocked' | 'TeamsBalanced' | 'Completed' | 'Cancelled';
  stateVersion: number;
  teamSize: number;
  players: PlayerInPool[];
  isBalanced: boolean;
  updatedAt: string;
  matchDate: string;
  teamAName?: string;
  teamBName?: string;
}

/**
 * Hook to manage match lifecycle state.
 * @param matchId The ID of the match being managed.
 */
export const useMatchState = (matchId: number | string) => {
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [matchCompletedModal, setMatchCompletedModal] = useState<MatchCompletedModalState>({
    isOpen: false,
    teamAName: 'Orange',
    teamBName: 'Green',
    teamAScore: 0,
    teamBScore: 0
  });

  const showToast = (message: string, type: ToastState['type'], action?: ToastState['action']) => {
    setToast({ message, type, action });
    setTimeout(() => setToast(null), 8000); // Increased duration for action
  };

  const showMatchCompletedModal = (teamAName: string, teamBName: string, teamAScore: number, teamBScore: number) => {
    setMatchCompletedModal({
      isOpen: true,
      teamAName,
      teamBName,
      teamAScore,
      teamBScore
    });
  };

  const closeMatchCompletedModal = () => {
    setMatchCompletedModal(prev => ({ ...prev, isOpen: false }));
  };

  const fetchMatchState = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/upcoming-matches?matchId=${matchId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const transformedData: MatchData = {
          state: result.data.state,
          stateVersion: result.data.state_version,
          teamSize: result.data.team_size,
          players: result.data.players || [],
          isBalanced: result.data.is_balanced,
          updatedAt: result.data.updated_at,
          matchDate: result.data.match_date,
          teamAName: result.data.team_a_name || 'Orange',
          teamBName: result.data.team_b_name || 'Green',
        };
        setMatchData(transformedData);
      } else {
        throw new Error(result.error || 'Unknown error fetching match data');
      }
    } catch (err: any) {
      setError(err.message);
      setMatchData(null);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (matchId) {
      fetchMatchState();
    }
  }, [matchId, fetchMatchState]);
  
  const balanceTeams = useCallback(async (method: 'ability' | 'performance' | 'random') => {
    setError(null);
    let response;
    try {
      // Per user request: Refetch state right before balancing to ensure data is not stale.
      await fetchMatchState();

      if (method === 'ability' || method === 'performance') {
        const playerIds = matchData?.players.map(p => p.id) || [];
        const apiMethod = method === 'ability' ? 'balanceByRating' : 'balanceByPerformance';
        response = await fetch(`/api/admin/balance-teams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, playerIds, method: apiMethod })
        });
      } else { // random
        response = await fetch(`/api/admin/random-balance-match?matchId=${matchId}`, { method: 'POST' });
      }
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Balancing failed with method: ${method}`);
      }
      
      await fetchMatchState(); // Refresh data again to get new teams and is_balanced state
    } catch (err: any) {
      console.error(`Error balancing teams with method ${method}:`, err);
      setError(err.message);
      throw err; // Re-throw to allow component to handle loading state
    }
  }, [matchId, fetchMatchState, matchData?.players]);

  const createApiAction = (url: string, method: 'PATCH' | 'POST') => async (actionBody?: Record<string, any>) => {
    try {
      const finalBody = { ...actionBody, state_version: matchData?.stateVersion || 0 };
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalBody),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          // If it's a conflict, check for specific error messages
          if (responseData.error.includes('Player count mismatch')) {
            // This is the silent-fail case. Refresh state and stop.
            await fetchMatchState();
            return; // Exit without showing a toast
          }
          // For other conflicts, show a toast
          showToast(responseData.error || 'Conflict: This match was updated by someone else.', 'error');
        }
        throw new Error(responseData.error || `API action failed: ${method} ${url}`);
      }

      if (url.includes('/complete')) {
        // Show match completed modal instead of toast
        const teamAName = matchData?.teamAName || 'Orange';
        const teamBName = matchData?.teamBName || 'Green';
        const teamAScore = actionBody?.score?.team_a || 0;
        const teamBScore = actionBody?.score?.team_b || 0;
        
        showMatchCompletedModal(teamAName, teamBName, teamAScore, teamBScore);
        await fetch('/api/admin/trigger-stats-update', { method: 'POST' });
      }

      await fetchMatchState();
    } catch (err: any) {
      // Avoid showing a generic error for the handled 409 case
      if (!err.message.includes('Player count mismatch')) {
        setError(err.message);
        console.error(err.message);
      }
    }
  };

  const can = useCallback((action: 'unlockPool' | 'unlockTeams' | 'undoComplete') => {
    if (!matchData) return false;
    const { state } = matchData;
    switch (action) {
      case 'unlockPool':
        return state === 'PoolLocked';
      case 'unlockTeams':
        return state === 'TeamsBalanced';
      case 'undoComplete':
        return state === 'Completed';
      default:
        return false;
    }
  }, [matchData]);

  const markAsUnbalanced = useCallback(async () => {
    if (!matchData || !matchData.isBalanced) return;

    try {
      await fetch(`/api/admin/upcoming-matches`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            upcoming_match_id: matchId,
            is_balanced: false
        }),
      });
      await fetchMatchState();
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to mark as unbalanced:', err.message);
    }
  }, [matchData, fetchMatchState, matchId]);

  const clearAssignments = useCallback(async () => {
    if (!matchData) return;

    try {
      // The API now handles both clearing assignments and setting is_balanced,
      // so we only need to make one call.
      await fetch(`/api/admin/upcoming-match-players/clear?matchId=${matchId}`, {
        method: 'POST',
      });

      // Refresh the state to show the cleared teams.
      await fetchMatchState();

    } catch (err: any) {
      setError(err.message);
      console.error('Failed to clear team assignments:', err.message);
      throw err; // rethrow to be caught by the component
    }
  }, [matchData, fetchMatchState, matchId]);

  return {
    isLoading,
    error,
    toast,
    matchCompletedModal,
    closeMatchCompletedModal,
    can,
    matchData,
    showToast,
    actions: {
      lockPool: createApiAction(`/api/admin/upcoming-matches/${matchId}/lock-pool`, 'PATCH'),
      confirmTeams: createApiAction(`/api/admin/upcoming-matches/${matchId}/confirm-teams`, 'PATCH'),
      completeMatch: (scoreData: any) => createApiAction(`/api/admin/upcoming-matches/${matchId}/complete`, 'POST')(scoreData),
      revalidate: fetchMatchState,
      balanceTeams: balanceTeams,
      unlockPool: createApiAction(`/api/admin/upcoming-matches/${matchId}/unlock-pool`, 'PATCH'),
      unlockTeams: createApiAction(`/api/admin/upcoming-matches/${matchId}/unlock-teams`, 'PATCH'),
      undoComplete: createApiAction(`/api/admin/upcoming-matches/${matchId}/undo`, 'PATCH'),
      markAsUnbalanced: markAsUnbalanced,
      clearAssignments: clearAssignments,
    }
  };
};

export default useMatchState; 