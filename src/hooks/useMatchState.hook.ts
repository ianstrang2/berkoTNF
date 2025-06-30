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

interface MatchData {
  state: 'Draft' | 'PoolLocked' | 'TeamsBalanced' | 'Completed' | 'Cancelled';
  stateVersion: number;
  teamSize: number;
  players: PlayerInPool[];
  isBalanced: boolean;
  updatedAt: string;
  matchDate: string;
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

  const showToast = (message: string, type: ToastState['type'], action?: ToastState['action']) => {
    setToast({ message, type, action });
    setTimeout(() => setToast(null), 8000); // Increased duration for action
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
      if (method === 'ability') {
        response = await fetch(`/api/admin/balance-planned-match?matchId=${matchId}`, { method: 'POST' });
      } else if (method === 'performance') {
        const playerIds = matchData?.players.map(p => p.id) || [];
        response = await fetch(`/api/admin/balance-by-past-performance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, playerIds })
        });
      } else { // random
        response = await fetch(`/api/admin/random-balance-match?matchId=${matchId}`, { method: 'POST' });
      }
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Balancing failed with method: ${method}`);
      }
      
      await fetchMatchState(); // Refresh data to get new teams and is_balanced state
    } catch (err: any) {
      console.error(`Error balancing teams with method ${method}:`, err);
      setError(err.message);
      throw err; // Re-throw to allow component to handle loading state
    }
  }, [matchId, matchData?.players, fetchMatchState]);

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
          showToast(responseData.error || 'Conflict: This match was updated by someone else.', 'error');
        }
        throw new Error(responseData.error || `API action failed: ${method} ${url}`);
      }

      if (url.includes('/complete')) {
        showToast('Match saved. Stats recalculating (~45s)...', 'success', {
          label: 'Undo',
          onClick: () => createApiAction(`/api/admin/upcoming-matches/${matchId}/undo`, 'PATCH')()
        });
        await fetch('/api/admin/trigger-stats-update', { method: 'POST' });
      }

      await fetchMatchState();
    } catch (err: any) {
      setError(err.message);
      console.error(err.message);
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

  return {
    isLoading,
    error,
    toast,
    can,
    matchData,
    actions: {
      lockPool: createApiAction(`/api/admin/upcoming-matches/${matchId}/lock-pool`, 'PATCH'),
      confirmTeams: createApiAction(`/api/admin/upcoming-matches/${matchId}/confirm-teams`, 'PATCH'),
      completeMatch: (scoreData: any) => createApiAction(`/api/admin/upcoming-matches/${matchId}/complete`, 'POST')(scoreData),
      revalidate: fetchMatchState,
      balanceTeams: balanceTeams,
      unlockPool: createApiAction(`/api/admin/upcoming-matches/${matchId}/unlock-pool`, 'PATCH'),
      unlockTeams: createApiAction(`/api/admin/upcoming-matches/${matchId}/unlock-teams`, 'PATCH'),
      undoComplete: createApiAction(`/api/admin/upcoming-matches/${matchId}/undo`, 'PATCH'),
    }
  };
};

export default useMatchState; 