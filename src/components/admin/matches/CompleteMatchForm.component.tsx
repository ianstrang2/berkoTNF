'use client';

import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import Button from '@/components/ui-kit/Button.component';
import Card from '@/components/ui-kit/Card.component';
import { CheckCircle, Plus, Minus } from 'lucide-react';
import { PlayerInPool } from '@/types/player.types';

interface PlayerGoalStat {
  player_id: number;
  goals: number;
}

interface CompleteMatchFormProps {
  matchId: string;
  players: PlayerInPool[];
  completeMatchAction: (payload: { score: { team_a: number; team_b: number }, player_stats: PlayerGoalStat[] }) => Promise<void>;
  isCompleted: boolean;
}

export type CompleteFormHandle = {
  submit: () => void;
};

const CompleteMatchForm = forwardRef<CompleteFormHandle, CompleteMatchFormProps>(
  ({ matchId, players, completeMatchAction, isCompleted }, ref) => {
  const [playerGoals, setPlayerGoals] = useState<Map<string, number>>(new Map());
  const [ownGoalsA, setOwnGoalsA] = useState(0);
  const [ownGoalsB, setOwnGoalsB] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    // Calculate final scores
    const teamAGoalsTotal = teamA.reduce((sum, p) => sum + (playerGoals.get(p.id) || 0), 0);
    const teamBGoalsTotal = teamB.reduce((sum, p) => sum + (playerGoals.get(p.id) || 0), 0);
    const finalTeamAScore = teamAGoalsTotal + ownGoalsA;
    const finalTeamBScore = teamBGoalsTotal + ownGoalsB;
    
    setIsSubmitting(true);
    try {
      const player_stats = Array.from(playerGoals.entries())
        .map(([id, goals]) => ({ player_id: Number(id), goals }))
        .filter(p => p.goals > 0);
        
      const payload = {
        score: { team_a: finalTeamAScore, team_b: finalTeamBScore },
        player_stats: player_stats,
      };
      
      await completeMatchAction(payload as any);
      // On success, the parent component will switch the view.
    } catch (err: any) {
        setError(err.message || 'Failed to submit results.');
    } finally {
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
            <Minus size={12} />
          </Button>
          <span className="font-bold text-sm w-6 text-center text-slate-800 bg-gray-50 rounded py-0.5">
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
            <Plus size={12} />
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
                  className="w-full px-4 py-3 text-lg font-bold text-center rounded-lg border-2 border-gray-200 bg-gray-50 text-slate-600 shadow-soft-sm cursor-not-allowed"
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
      
      {isCompleted && (
        <Card>
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3 text-green-700">
              <div className="flex-shrink-0">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <p className="font-medium">Match completed successfully and results have been saved.</p>
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