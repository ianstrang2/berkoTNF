'use client';

import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import Button from '@/components/ui-kit/Button.component';
import { CheckCircle } from 'lucide-react';
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
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [playerGoals, setPlayerGoals] = useState<Map<string, number>>(new Map());
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
    const teamAGoalsTotal = teamA.reduce((sum, p) => sum + (playerGoals.get(p.id) || 0), 0);
    const teamBGoalsTotal = teamB.reduce((sum, p) => sum + (playerGoals.get(p.id) || 0), 0);

    if (teamAGoalsTotal !== teamAScore || teamBGoalsTotal !== teamBScore) {
      const message = `The player goal totals do not match the final scores.\n\n` +
                      `Team A: Players scored ${teamAGoalsTotal}, but final score is ${teamAScore}.\n` +
                      `Team B: Players scored ${teamBGoalsTotal}, but final score is ${teamBScore}.\n\n` +
                      `Do you want to save anyway?`;
      if (!window.confirm(message)) {
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      const player_stats = Array.from(playerGoals.entries())
        .map(([id, goals]) => ({ player_id: Number(id), goals }))
        .filter(p => p.goals > 0);
        
      const payload = {
        score: { team_a: teamAScore, team_b: teamBScore },
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

  const renderPlayerRow = (player: PlayerInPool) => (
    <div key={player.id} className="flex items-center justify-between bg-gray-700 p-2 rounded-md">
      <span className="text-gray-200">{player.name}</span>
      <div className="flex items-center gap-2">
        <Button onClick={() => handleGoalChange(player.id, -1)} size="sm" variant="secondary" disabled={isSubmitting || isCompleted}>-</Button>
        <span className="font-bold w-6 text-center">{playerGoals.get(player.id) || 0}</span>
        <Button onClick={() => handleGoalChange(player.id, 1)} size="sm" variant="secondary" disabled={isSubmitting || isCompleted}>+</Button>
      </div>
    </div>
  );

  const renderTeamColumn = (team: PlayerInPool[], teamName: string, score: number, setScore: (s: number) => void) => (
    <div className="flex-1 bg-gray-800/50 p-4 rounded-lg flex flex-col">
      <h3 className="text-lg font-bold text-white mb-3 border-b border-gray-700 pb-2">{teamName}</h3>
      <div className="flex-grow space-y-2 mb-4">
        {team.map(renderPlayerRow)}
      </div>
       <div className="mt-auto">
          <label className="text-sm font-semibold mb-2 block">Final Score for {teamName}</label>
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(parseInt(e.target.value, 10) || 0)}
            className="w-full p-2 rounded-md bg-gray-900 border border-gray-700 focus:ring-orange-500 focus:border-orange-500"
            disabled={isSubmitting || isCompleted}
          />
        </div>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {isCompleted ? 'Match Result' : 'Enter Match Results'}
      </h2>
      
      {isCompleted && (
        <div className="bg-green-900/50 border border-green-700 text-green-300 p-4 rounded-lg mb-6 flex items-center gap-3">
          <CheckCircle size={20} />
          <p>This match has been completed and the result is saved.</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {renderTeamColumn(teamA, 'Team A', teamAScore, setTeamAScore)}
        {renderTeamColumn(teamB, 'Team B', teamBScore, setTeamBScore)}
      </div>

      {!isCompleted && (
        <div className="flex justify-end">
          {/* The Global CTA bar will replace this button */}
          {/*
          <Button onClick={validateAndSubmit} disabled={isSubmitting} variant="primary">
            {isSubmitting ? 'Saving...' : 'Save Final Result'}
          </Button>
          */}
        </div>
      )}
    </div>
  );
});

CompleteMatchForm.displayName = 'CompleteMatchForm';

export default CompleteMatchForm; 