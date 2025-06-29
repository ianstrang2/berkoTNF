'use client';

import React, { useState, useMemo } from 'react';
import Button from '@/components/ui-kit/Button.component';

type BalanceMethod = 'ability' | 'performance' | 'random';

interface MatchPlayer {
  player_id: number;
  name: string;
  team?: 'A' | 'B' | 'Unassigned';
}

interface BalanceTeamsPaneProps {
  matchId: string;
  teamSize: number;
  lockedPlayers: MatchPlayer[];
  isBalanced: boolean;
  balanceTeamsAction: (method: BalanceMethod) => Promise<void>;
  confirmTeamsAction: () => Promise<void>;
}

const BalanceTeamsPane = ({ matchId, teamSize, lockedPlayers, isBalanced, balanceTeamsAction, confirmTeamsAction }: BalanceTeamsPaneProps) => {
  const [balanceMethod, setBalanceMethod] = useState<BalanceMethod>('ability');
  const [isBalancing, setIsBalancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { teamA, teamB } = useMemo(() => {
    const a: MatchPlayer[] = [];
    const b: MatchPlayer[] = [];
    if (isBalanced) {
      lockedPlayers.forEach(p => {
        if (p.team === 'A') a.push(p);
        else if (p.team === 'B') b.push(p);
      });
    } else {
      const half = Math.ceil(lockedPlayers.length / 2);
      return { teamA: lockedPlayers.slice(0, half), teamB: lockedPlayers.slice(half) };
    }
    return { teamA: a, teamB: b };
  }, [lockedPlayers, isBalanced]);

  const handleBalance = async () => {
    setIsBalancing(true);
    setError(null);
    try {
      await balanceTeamsAction(balanceMethod);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during balancing.');
    } finally {
      setIsBalancing(false);
    }
  };
  
  const handleConfirm = async () => {
      setIsBalancing(true); // Also show loading for confirm
      try {
        await confirmTeamsAction();
        // The parent component will re-render with the new 'TeamsBalanced' state
      } catch(err: any) {
        setError(err.message || 'Failed to confirm teams.');
        setIsBalancing(false);
      }
  }

  const renderTeamColumn = (team: MatchPlayer[], teamName: string) => (
    <div className="flex-1 bg-gray-800/50 p-4 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-3 border-b border-gray-700 pb-2">{teamName} ({team.length} Players)</h3>
      <ul className="space-y-2">
        {team.map(player => (
          <li key={player.player_id} className="bg-gray-700 p-2 rounded-md text-gray-200">
            {player.name}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Balance Teams</h2>
      
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {renderTeamColumn(teamA, 'Team A')}
        {renderTeamColumn(teamB, 'Team B')}
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Balancing Options</h3>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1 space-y-2">
            <p className="text-sm text-gray-400">Select your preferred balancing method.</p>
            <div className="flex gap-2 rounded-lg bg-gray-900/50 p-1">
              {(['ability', 'performance', 'random'] as BalanceMethod[]).map(method => (
                <button
                  key={method}
                  onClick={() => setBalanceMethod(method)}
                  className={`flex-1 p-2 rounded-md text-sm capitalize transition-colors ${
                    balanceMethod === method ? 'bg-orange-600 text-white font-semibold' : 'bg-transparent text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
             <Button onClick={handleBalance} disabled={isBalancing} variant="secondary">
                {isBalancing ? 'Balancing...' : `Balance with ${balanceMethod}`}
              </Button>
            {/* The Global CTA bar will replace this button */}
            {/*
            <Button onClick={handleConfirm} disabled={!isBalanced || isBalancing} variant="primary">
              Confirm Teams
            </Button>
            */}
          </div>
        </div>
         {!isBalanced && (
            <p className="text-xs text-amber-500 mt-3">You must balance the teams before you can confirm them.</p>
        )}
      </div>
    </div>
  );
};

export default BalanceTeamsPane; 