'use client';

import { useState, useEffect, useCallback } from 'react';
import { differenceInHours } from 'date-fns';
import { Player } from '@/types/team-algorithm.types';

// Define the shape of the match data based on API response
interface MatchPlayer {
  player_id: number;
  name: string;
  team?: 'A' | 'B' | 'Unassigned';
  // ... other player attributes
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface MatchState {
  state: 'Draft' | 'PoolLocked' | 'TeamsBalanced' | 'Completed' | 'Cancelled' | 'Loading';
  stateVersion: number;
  team_size: number;
  players: Player[];
  isBalanced: boolean;
  updated_at: string; // For checking "Undo" eligibility
  match_date: string;
}

/**
 * Hook to manage match lifecycle state.
 * @param matchId The ID of the match being managed.
 */
export const useMatchState = (matchId: number | string) => {
  const [matchData, setMatchData] = useState<MatchState>({ 
    state: 'Loading', 
    stateVersion: 0, 
    team_size: 0, 
    players: [],
    isBalanced: false,
    updated_at: new Date().toISOString(),
    match_date: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'], action?: ToastState['action']) => {
    setToast({ message, type, action });
    setTimeout(() => setToast(null), 8000); // Increased duration for action
  };

  const fetchMatchState = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/admin/upcoming-matches?matchId=${matchId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch match data');
      }
      const result = await response.json();
      if (result.success) {
        setMatchData({
          state: result.data.state,
          stateVersion: result.data.state_version,
          team_size: result.data.team_size,
          players: result.data.players || [],
          isBalanced: result.data.is_balanced || false,
          updated_at: result.data.updated_at,
          match_date: result.data.match_date,
        });
      } else {
        throw new Error(result.error || 'Unknown error fetching match data');
      }
    } catch (err: any) {
      setError(err.message);
      setMatchData(prev => ({ ...prev, state: 'Draft' })); // Fallback state
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
        const playerIds = matchData.players.map(p => p.player_id);
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
  }, [matchId, matchData.players, fetchMatchState]);

  const createApiAction = (url: string, method: 'PATCH' | 'POST') => async (actionBody?: Record<string, any>) => {
    try {
      const finalBody = { ...actionBody, state_version: matchData.stateVersion };
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
      } else {
        showToast(responseData.message || 'Action successful!', 'success');
      }

      await fetchMatchState();
    } catch (err: any) {
      setError(err.message);
      console.error(err.message);
    }
  };

  const can = useCallback((action: 'unlockPool' | 'unlockTeams' | 'undoComplete') => {
    const { state } = matchData;
    switch (action) {
      case 'unlockPool':
        return state === 'PoolLocked';
      case 'unlockTeams':
        return state === 'TeamsBalanced';
      case 'undoComplete':
        return state === 'Completed'; // Removed 48h check
      default:
        return false;
    }
  }, [matchData]);

  return {
    state: matchData.state,
    stateVersion: matchData.stateVersion,
    teamSize: matchData.team_size,
    players: matchData.players,
    isBalanced: matchData.isBalanced,
    matchDate: matchData.match_date,
    error,
    toast,
    can,
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