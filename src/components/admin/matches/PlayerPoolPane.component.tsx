'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '@/types/team-algorithm.types';
import PlayerPool from '@/components/team/PlayerPool.component';

interface PlayerPoolPaneProps {
  matchId: string;
  teamSize: number;
  initialPlayers: Player[];
  onSelectionChange: (playerIds: number[]) => void;
  lockPoolAction?: (args: { playerIds: number[] }) => Promise<void>;
}

const PlayerPoolPane = ({ matchId, teamSize, initialPlayers, onSelectionChange }: PlayerPoolPaneProps) => {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [pendingPlayerToggles, setPendingPlayerToggles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllPlayers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/players');
        const result = await response.json();
        if (result.data) {
          setAllPlayers(result.data);
        } else {
          throw new Error('No player data returned from API.');
        }
      } catch (err: any) {
        setError("Failed to fetch the list of available players.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllPlayers();
  }, []);

  useEffect(() => {
    setSelectedPlayers(initialPlayers);
  }, [matchId, initialPlayers]);

  useEffect(() => {
    onSelectionChange(selectedPlayers.map(p => Number(p.id)));
  }, [selectedPlayers, onSelectionChange]);

  const handleTogglePlayer = async (player: Player) => {
    const playerIdStr = player.id.toString();
    if (pendingPlayerToggles.has(playerIdStr)) return;

    setPendingPlayerToggles(prev => new Set(prev).add(playerIdStr));
    const isSelected = selectedPlayers.some(p => p.id === player.id);
    
    setSelectedPlayers(prev => 
      isSelected ? prev.filter(p => p.id !== player.id) : [...prev, player]
    );

    try {
      if (isSelected) {
        await fetch(`/api/admin/match-player-pool?match_id=${matchId}&player_id=${player.id}`, { method: 'DELETE' });
      } else {
        await fetch('/api/admin/match-player-pool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ match_id: matchId, player_id: player.id })
        });
      }
    } catch (err) {
      setError('Failed to update player selection. Please try again.');
      setSelectedPlayers(prev => 
        isSelected ? [...prev, player] : prev.filter(p => p.id !== player.id)
      );
    } finally {
      setPendingPlayerToggles(prev => {
        const next = new Set(prev);
        next.delete(playerIdStr);
        return next;
      });
    }
  };

  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (isLoading && allPlayers.length === 0) return <div className="p-4 text-center">Loading players...</div>;

  return (
    <div className="bg-white rounded-xl shadow-soft-xl p-4">
      <PlayerPool
        allPlayers={allPlayers}
        selectedPlayers={selectedPlayers}
        onTogglePlayer={handleTogglePlayer}
        teamSize={teamSize}
        maxPlayers={teamSize * 2}
        pendingPlayers={pendingPlayerToggles}
        onBalanceTeams={() => {}}
        isBalancing={false}
      />
    </div>
  );
};

export default PlayerPoolPane;
