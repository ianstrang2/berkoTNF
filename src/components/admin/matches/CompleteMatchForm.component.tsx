'use client';

import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import Button from '@/components/ui-kit/Button.component';
import Card from '@/components/ui-kit/Card.component';
import { Plus, Minus } from 'lucide-react';
import { PlayerInPool } from '@/types/player.types';
import { apiFetch } from '@/lib/apiConfig';

interface PlayerGoalStat {
  player_id: number;
  goals: number;
  actual_team?: string;
}

interface CompleteMatchFormProps {
  matchId: string;
  players: PlayerInPool[];
  completeMatchAction: (payload: { score: { team_a: number; team_b: number }, own_goals: { team_a: number; team_b: number }, player_stats: PlayerGoalStat[] }) => Promise<void>;
  isCompleted: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
}

export type CompleteFormHandle = {
  submit: () => void;
};

const CompleteMatchForm = forwardRef<CompleteFormHandle, CompleteMatchFormProps>(
  ({ matchId, players, completeMatchAction, isCompleted, onLoadingChange }, ref) => {
  const [playerGoals, setPlayerGoals] = useState<Map<string, number>>(new Map());
  const [ownGoalsA, setOwnGoalsA] = useState(0);
  const [ownGoalsB, setOwnGoalsB] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistoricalData, setIsLoadingHistoricalData] = useState(false);
  const [hasLoadedHistoricalData, setHasLoadedHistoricalData] = useState(false);
  const [noShowPlayers, setNoShowPlayers] = useState<Set<string>>(new Set());
  const [teamSwaps, setTeamSwaps] = useState<Map<string, string>>(new Map()); // player_id -> 'A' or 'B'

  const { teamA, teamB } = useMemo(() => {
    const a: PlayerInPool[] = [];
    const b: PlayerInPool[] = [];
    players.forEach(p => {
      // Check if player has been swapped to different team
      const actualTeam = teamSwaps.get(p.id) || p.team;
      
      if (actualTeam === 'A') {
        a.push(p);
      } else if (actualTeam === 'B') {
        b.push(p);
      } else if (p.team) {
        console.warn(`Player with unexpected team found in CompleteMatchForm: ${p.id} - ${p.team}`);
      }
    });
    return { teamA: a, teamB: b };
  }, [players, teamSwaps]);

  // Track which matchId we've loaded data for (prevents double-fetch in StrictMode)
  const loadedMatchIdRef = React.useRef<string | null>(null);

  // Load historical match data for completed matches OR matches with historical data (undone matches)
  useEffect(() => {
    // Skip if already loaded for this match
    if (!matchId || loadedMatchIdRef.current === matchId) return;
    
    // Reset state for new match
    setPlayerGoals(new Map());
    setOwnGoalsA(0);
    setOwnGoalsB(0);
    setNoShowPlayers(new Set());
    setTeamSwaps(new Map());
    setError(null);
    setHasLoadedHistoricalData(false);
    
    loadedMatchIdRef.current = matchId;

    const loadHistoricalData = async () => {
      setIsLoadingHistoricalData(true);
      try {
        const response = await apiFetch(`/admin/upcoming-matches/${matchId}/historical-data`);
        
        // 404 is expected for new matches (no historical data yet)
        if (response.status === 404) {
          setHasLoadedHistoricalData(true);
          setIsLoadingHistoricalData(false);
          return;
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          const historicalMatch = result.data;
          const goalMap = new Map<string, number>();
          const playedPlayerIds = new Set<string>();
          const swaps = new Map<string, string>();
          
          historicalMatch.player_matches.forEach((pm: any) => {
            const playerIdStr = pm.player_id.toString();
            goalMap.set(playerIdStr, pm.goals || 0);
            playedPlayerIds.add(playerIdStr);
            
            if (pm.actual_team && pm.actual_team !== pm.team) {
              swaps.set(playerIdStr, pm.actual_team);
            }
          });
          
          const noShows = new Set<string>();
          players.forEach(player => {
            if (!playedPlayerIds.has(player.id)) {
              noShows.add(player.id);
            }
          });
          
          setPlayerGoals(goalMap);
          setOwnGoalsA(historicalMatch.team_a_own_goals || 0);
          setOwnGoalsB(historicalMatch.team_b_own_goals || 0);
          setNoShowPlayers(noShows);
          setTeamSwaps(swaps);
          setHasLoadedHistoricalData(true);
        } else {
          setHasLoadedHistoricalData(true);
        }
      } catch (err: any) {
        console.error('Failed to load historical match data:', err);
        setError('Failed to load match results. Please refresh the page.');
        setHasLoadedHistoricalData(true);
      } finally {
        setIsLoadingHistoricalData(false);
      }
    };
    
    loadHistoricalData();
  }, [matchId, players]);

  // Notify parent of loading state changes
  useEffect(() => {
    onLoadingChange?.(isSubmitting);
  }, [isSubmitting, onLoadingChange]);

  const handleGoalChange = (playerId: string, delta: number) => {
    setPlayerGoals(prev => {
      const newGoals = new Map(prev);
      const currentGoals = newGoals.get(playerId) || 0;
      newGoals.set(playerId, Math.max(0, currentGoals + delta));
      return newGoals;
    });
  };

  const toggleNoShow = (playerId: string) => {
    setNoShowPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
        // Clear goals when marking as no-show
        setPlayerGoals(prevGoals => {
          const newGoals = new Map(prevGoals);
          newGoals.set(playerId, 0);
          return newGoals;
        });
      }
      return newSet;
    });
  };

  const handleTeamSwap = (playerId: string, originalTeam: string) => {
    setTeamSwaps(prev => {
      const newSwaps = new Map(prev);
      const currentSwap = newSwaps.get(playerId);
      
      if (currentSwap) {
        // Already swapped - toggle back to original team
        newSwaps.delete(playerId);
      } else {
        // Not swapped - swap to opposite team
        const targetTeam = originalTeam === 'A' ? 'B' : 'A';
        newSwaps.set(playerId, targetTeam);
      }
      
      return newSwaps;
    });
  };
  
  const validateAndSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Calculate final scores (excluding no-shows)
      const teamAGoalsTotal = teamA
        .filter(p => !noShowPlayers.has(p.id))
        .reduce((sum, p) => sum + (playerGoals.get(p.id) || 0), 0);
      const teamBGoalsTotal = teamB
        .filter(p => !noShowPlayers.has(p.id))
        .reduce((sum, p) => sum + (playerGoals.get(p.id) || 0), 0);
      const finalTeamAScore = teamAGoalsTotal + ownGoalsA;
      const finalTeamBScore = teamBGoalsTotal + ownGoalsB;
      
      // Build player_stats ONLY for players who actually played (checkbox controls row creation)
      const player_stats = [...teamA, ...teamB]
        .filter(player => !noShowPlayers.has(player.id))  // Only save players who played
        .map(player => {
          const actualTeam = teamSwaps.get(player.id) || player.team;
          
          return {
            player_id: Number(player.id),
            goals: playerGoals.get(player.id) || 0,
            actual_team: actualTeam
          };
        });
        
      const payload = {
        score: { team_a: finalTeamAScore, team_b: finalTeamBScore },
        own_goals: { team_a: ownGoalsA, team_b: ownGoalsB },
        player_stats: player_stats,
      };
      
      await completeMatchAction(payload as any);
    } catch (err: any) {
      setError(err.message || 'Failed to submit results.');
      setIsSubmitting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    submit: validateAndSubmit,
  }));

  // Track which team is currently visible
  const [focusedTeam, setFocusedTeam] = useState<'A' | 'B'>('A');

  const renderPlayerRow = (player: PlayerInPool | { id: string; name: string; isSynthetic?: boolean; team?: string }, isOwnGoal = false, teamId?: 'A' | 'B') => {
    const goals = isOwnGoal 
      ? (player.id === 'own-goal-a' ? ownGoalsA : ownGoalsB)
      : (playerGoals.get(player.id) || 0);
    const isSynthetic = 'isSynthetic' in player && player.isSynthetic;
    const isNoShow = !isOwnGoal && noShowPlayers.has(player.id);
    
    return (
      <div 
        key={player.id} 
        className={`flex items-center justify-between bg-white rounded shadow-soft-sm border border-gray-200 px-2 py-1.5 ${
          isSynthetic ? 'bg-gray-50' : ''
        } ${isNoShow ? 'opacity-50' : ''}`}
      >
        {/* Played checkbox (only for real players, not OG row) */}
        {!isOwnGoal && (
          <button
            type="button"
            onClick={() => toggleNoShow(player.id)}
            disabled={isSubmitting || isCompleted}
            className={`w-4 h-4 mr-1.5 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${
              isNoShow 
                ? 'border-gray-300 bg-white' 
                : 'border-transparent bg-gradient-to-tl from-purple-700 to-pink-500'
            } disabled:opacity-50`}
            title={isNoShow ? "Mark as played" : "Mark as no-show"}
          >
            {!isNoShow && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        )}
        
        <div className="flex items-center flex-1 min-w-0">
          {/* Team swap arrow (only for real players) */}
          {!isOwnGoal && teamId && (
            <button
              type="button"
              onClick={() => handleTeamSwap(player.id, player.team || '')}
              disabled={isSubmitting || isCompleted || isNoShow}
              className="w-5 h-5 mr-1.5 flex-shrink-0 rounded-full flex items-center justify-center bg-gray-100 text-gray-400 hover:text-purple-600 disabled:opacity-30"
              title={`Move to Team ${teamId === 'A' ? 'B' : 'A'}`}
            >
              <span className="text-xs font-bold">{teamId === 'A' ? '→' : '←'}</span>
            </button>
          )}
          
          <span className={`text-sm ${
            isSynthetic ? 'text-gray-500' : 
            isNoShow ? 'text-gray-400 line-through' : 'text-slate-700'
          }`}>
            {player.name}
            {isNoShow && <span className="text-xs ml-1 text-slate-400">(NS)</span>}
          </span>
        </div>
        
        {/* Goal buttons - hidden for no-shows */}
        {(!isNoShow || isOwnGoal) && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button 
              type="button"
              onClick={() => isOwnGoal 
                ? (player.id === 'own-goal-a' ? setOwnGoalsA(Math.max(0, ownGoalsA - 1)) : setOwnGoalsB(Math.max(0, ownGoalsB - 1)))
                : handleGoalChange(player.id, -1)
              } 
              disabled={isSubmitting || isCompleted || goals === 0}
              className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center hover:border-purple-400 hover:bg-purple-50 disabled:opacity-30 active:bg-purple-100"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id={`minus-grad-${player.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <rect x="5" y="10.5" width="14" height="3" rx="1.5" fill={`url(#minus-grad-${player.id})`} />
              </svg>
            </button>
            <span className="font-bold text-sm w-5 text-center text-slate-800">
              {goals}
            </span>
            <button 
              type="button"
              onClick={() => isOwnGoal
                ? (player.id === 'own-goal-a' ? setOwnGoalsA(ownGoalsA + 1) : setOwnGoalsB(ownGoalsB + 1))
                : handleGoalChange(player.id, 1)
              } 
              disabled={isSubmitting || isCompleted}
              className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center hover:border-purple-400 hover:bg-purple-50 disabled:opacity-30 active:bg-purple-100"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id={`plus-grad-${player.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <path d="M12 5v14M5 12h14" stroke={`url(#plus-grad-${player.id})`} strokeWidth="3" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Calculate scores
  const scoreA = useMemo(() => {
    return teamA.filter(p => !noShowPlayers.has(p.id)).reduce((sum, p) => sum + (playerGoals.get(p.id) || 0), 0) + ownGoalsA;
  }, [teamA, playerGoals, noShowPlayers, ownGoalsA]);
  
  const scoreB = useMemo(() => {
    return teamB.filter(p => !noShowPlayers.has(p.id)).reduce((sum, p) => sum + (playerGoals.get(p.id) || 0), 0) + ownGoalsB;
  }, [teamB, playerGoals, noShowPlayers, ownGoalsB]);

  const renderTeamCard = (team: PlayerInPool[], teamId: 'A' | 'B') => {
    return (
      <Card>
        <div className="p-2">
          <div className="space-y-1.5">
            {team.map(player => renderPlayerRow(player, false, teamId))}
            
            {/* Own Goal Row */}
            {renderPlayerRow(
              { 
                id: `own-goal-${teamId.toLowerCase()}`, 
                name: 'OG / Unknown', 
                isSynthetic: true 
              }, 
              true
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      {/* Sticky Score Bar - Always visible */}
      <div className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-xl p-3 shadow-soft-md">
        <div className="flex items-center justify-center gap-6">
          <button 
            onClick={() => setFocusedTeam('A')}
            className={`text-center transition-all ${focusedTeam === 'A' ? 'opacity-100' : 'opacity-60'}`}
          >
            <div className="text-xs text-gray-400 uppercase tracking-wide">Orange</div>
            <div className="text-3xl font-bold text-white">{scoreA}</div>
          </button>
          <div className="text-gray-500 text-xl font-light">–</div>
          <button 
            onClick={() => setFocusedTeam('B')}
            className={`text-center transition-all ${focusedTeam === 'B' ? 'opacity-100' : 'opacity-60'}`}
          >
            <div className="text-xs text-gray-400 uppercase tracking-wide">Green</div>
            <div className="text-3xl font-bold text-white">{scoreB}</div>
          </button>
        </div>
        {/* Warning if playing teams unbalanced (excluding no-shows) */}
        {(() => {
          const playingA = teamA.filter(p => !noShowPlayers.has(p.id)).length;
          const playingB = teamB.filter(p => !noShowPlayers.has(p.id)).length;
          return playingA !== playingB ? (
            <div className="text-center mt-2 text-xs text-amber-400">
              ⚠️ Uneven: {playingA} vs {playingB}
            </div>
          ) : null;
        })()}
      </div>

      {isLoadingHistoricalData && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700 text-sm">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading...</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Team toggle hint */}
      <p className="text-center text-xs text-gray-400">
        Tap score above to switch teams
      </p>

      {/* Team Card - Show one at a time, toggle with score bar */}
      <div>
        {focusedTeam === 'A' ? renderTeamCard(teamA, 'A') : renderTeamCard(teamB, 'B')}
      </div>
    </div>
  );
});

CompleteMatchForm.displayName = 'CompleteMatchForm';

export default CompleteMatchForm; 