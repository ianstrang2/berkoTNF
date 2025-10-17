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

  const { teamA, teamB } = useMemo(() => {
    const a: PlayerInPool[] = [];
    const b: PlayerInPool[] = [];
    players.forEach(p => {
      if (p.team === 'A') {
        a.push(p);
      } else if (p.team === 'B') {
        b.push(p);
      } else if (p.team) {
        console.warn(`Player with unexpected team found in CompleteMatchForm: ${p.id} - ${p.team}`);
      }
    });
    return { teamA: a, teamB: b };
  }, [players]);

  // Load historical match data for completed matches OR matches with historical data (undone matches)
  useEffect(() => {
    if (matchId && !hasLoadedHistoricalData) {
      console.log('CompleteMatchForm: Starting historical data load for match', matchId, 'isCompleted:', isCompleted);
      
      const loadHistoricalData = async () => {
        setIsLoadingHistoricalData(true);
        try {
          // Fetch historical match data for this specific match (optimized endpoint)
          const response = await apiFetch(`/admin/upcoming-matches/${matchId}/historical-data`);
          
          // 404 is expected for new matches (no historical data yet)
          if (response.status === 404) {
            console.log('No historical data found (normal for new match):', matchId);
            setHasLoadedHistoricalData(true);
            setIsLoadingHistoricalData(false);
            return;
          }
          
          const result = await response.json();
          
          if (result.success && result.data) {
            const historicalMatch = result.data;
            
            // Create a map of player goals from historical data
            const goalMap = new Map<string, number>();
            
            // Load player goals directly from historical player_matches data
            // (Don't try to match with current team assignments - use historical data as-is)
            historicalMatch.player_matches.forEach((pm: any) => {
              goalMap.set(pm.player_id.toString(), pm.goals || 0);
            });
            
            // Load actual own goals from database
            const actualOwnGoalsA = historicalMatch.team_a_own_goals || 0;
            const actualOwnGoalsB = historicalMatch.team_b_own_goals || 0;
            
            // Update state with historical data
            setPlayerGoals(goalMap);
            setOwnGoalsA(actualOwnGoalsA);
            setOwnGoalsB(actualOwnGoalsB);
            setHasLoadedHistoricalData(true);
            
            console.log('Successfully loaded historical data:', {
              playerGoals: Object.fromEntries(goalMap),
              ownGoalsA: actualOwnGoalsA,
              ownGoalsB: actualOwnGoalsB,
              matchId: historicalMatch.match_id
            });
          } else {
            console.log('No history data in response');
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
    }
  }, [matchId, hasLoadedHistoricalData]); // Removed isCompleted dependency

  // Reset historical data flag only when match ID changes (different match)
  useEffect(() => {
    console.log('CompleteMatchForm: matchId changed to', matchId);
    // Reset state when switching to a completely different match
    setHasLoadedHistoricalData(false);
    setPlayerGoals(new Map());
    setOwnGoalsA(0);
    setOwnGoalsB(0);
    setError(null);
  }, [matchId]); // Only depend on matchId, not isCompleted

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
  
  const validateAndSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Calculate final scores
      const teamAGoalsTotal = teamA.reduce((sum, p) => sum + (playerGoals.get(p.id) || 0), 0);
      const teamBGoalsTotal = teamB.reduce((sum, p) => sum + (playerGoals.get(p.id) || 0), 0);
      const finalTeamAScore = teamAGoalsTotal + ownGoalsA;
      const finalTeamBScore = teamBGoalsTotal + ownGoalsB;
      
      const player_stats = Array.from(playerGoals.entries())
        .map(([id, goals]) => ({ player_id: Number(id), goals }))
        .filter(p => p.goals > 0);
        
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

  const renderPlayerRow = (player: PlayerInPool | { id: string; name: string; isSynthetic?: boolean }, isOwnGoal = false) => {
    const goals = isOwnGoal 
      ? (player.id === 'own-goal-a' ? ownGoalsA : ownGoalsB)
      : (playerGoals.get(player.id) || 0);
    const displayName = player.name.length > 14 ? player.name.substring(0, 14) : player.name;
    const isSynthetic = 'isSynthetic' in player && player.isSynthetic;
    
    return (
      <div 
        key={player.id} 
        className={`flex items-center justify-between bg-white rounded-lg shadow-soft-sm border border-gray-200 px-3 py-2 transition-all duration-200 hover:shadow-soft-md ${
          isSynthetic ? 'bg-gray-50' : ''
        }`}
      >
        <span className={`font-medium text-sm flex-1 ${
          isSynthetic ? 'text-gray-500' : 'text-slate-700'
        }`}>
          {displayName}
        </span>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => isOwnGoal 
              ? (player.id === 'own-goal-a' ? setOwnGoalsA(Math.max(0, ownGoalsA - 1)) : setOwnGoalsB(Math.max(0, ownGoalsB - 1)))
              : handleGoalChange(player.id, -1)
            } 
            size="sm" 
            variant="outline" 
            disabled={isSubmitting || isCompleted || goals === 0}
            className="w-7 h-7 p-0 rounded-full border-slate-300 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
          >
            <svg width="12" height="12" viewBox="0 0 24 24">
              <defs>
                <linearGradient id={`minus-gradient-${player.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <rect x="6" y="11" width="12" height="2" rx="1" fill={`url(#minus-gradient-${player.id})`} />
            </svg>
          </Button>
          <span className="font-bold text-sm w-6 text-center text-slate-800">
            {goals}
          </span>
          <Button 
            onClick={() => isOwnGoal
              ? (player.id === 'own-goal-a' ? setOwnGoalsA(ownGoalsA + 1) : setOwnGoalsB(ownGoalsB + 1))
              : handleGoalChange(player.id, 1)
            } 
            size="sm" 
            variant="outline" 
            disabled={isSubmitting || isCompleted}
            className="w-7 h-7 p-0 rounded-full border-slate-300 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
              <defs>
                <linearGradient id={`plus-gradient-${player.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" stroke={`url(#plus-gradient-${player.id})`} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </Button>
        </div>
      </div>
    );
  };

  const renderTeamColumn = (team: PlayerInPool[], teamName: string, teamId: 'A' | 'B') => {
    // Calculate auto score
    const playerGoalsTotal = team.reduce((sum, p) => sum + (playerGoals.get(p.id) || 0), 0);
    const ownGoals = teamId === 'A' ? ownGoalsA : ownGoalsB;
    const calculatedScore = playerGoalsTotal + ownGoals;
    
    return (
      <div className="flex-1">
        <Card>
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-bold text-slate-700 text-lg text-center">
              {teamName}
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3 mb-4">
              {team.map(player => renderPlayerRow(player))}
              
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
            
            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-semibold text-slate-700 mb-3 block">Final Score</label>
              <div className="relative">
                <input
                  type="number"
                  value={calculatedScore}
                  readOnly
                  className="w-full px-4 py-3 text-lg font-bold text-center rounded-lg border-2 border-gray-200 text-slate-600 shadow-soft-sm cursor-not-allowed"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {isCompleted ? 'Match Result' : 'Enter Match Results'}
        </h2>
        <p className="text-slate-600">
          {isCompleted ? 'This match has been completed and saved.' : 'Record goals for each player and enter the final scores.'}
        </p>
      </div>
      
      {isLoadingHistoricalData && (
        <Card>
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3 text-blue-700">
              <div className="flex-shrink-0">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="font-medium">Loading match results...</p>
            </div>
          </div>
        </Card>
      )}
      
      {error && (
        <Card>
          <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3 text-red-700">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
              <div>
                <p className="font-medium">Error saving results</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTeamColumn(teamA, 'Orange', 'A')}
        {renderTeamColumn(teamB, 'Green', 'B')}
      </div>
    </div>
  );
});

CompleteMatchForm.displayName = 'CompleteMatchForm';

export default CompleteMatchForm; 