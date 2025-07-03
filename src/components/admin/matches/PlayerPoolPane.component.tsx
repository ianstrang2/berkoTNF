'use client';

import React, { useState, useEffect } from 'react';
import { PlayerInPool } from '@/types/player.types';
import PlayerPool from '@/components/team/PlayerPool.component';
import Button from '@/components/ui-kit/Button.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';

interface PlayerPoolPaneProps {
  matchId: string;
  teamSize: number;
  initialPlayers: PlayerInPool[];
  onSelectionChange: (playerIds: string[]) => void;
}

const PlayerPoolPane = ({ matchId, teamSize, initialPlayers, onSelectionChange }: PlayerPoolPaneProps) => {
  const [allPlayers, setAllPlayers] = useState<PlayerInPool[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerInPool[]>([]);
  const [pendingPlayerToggles, setPendingPlayerToggles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

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
      } catch (err) {
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
    onSelectionChange(selectedPlayers.map(p => p.id));
  }, [selectedPlayers, onSelectionChange]);

  const handleTogglePlayer = async (player: PlayerInPool) => {
    if (pendingPlayerToggles.has(player.id)) return;

    setPendingPlayerToggles(prev => new Set(prev).add(player.id));
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
        next.delete(player.id);
        return next;
      });
    }
  };

  const handleClearPool = async () => {
    setIsClearConfirmOpen(false);
    
    try {
      // Remove all selected players from the pool
      await Promise.all(
        selectedPlayers.map(player => 
          fetch(`/api/admin/match-player-pool?match_id=${matchId}&player_id=${player.id}`, { 
            method: 'DELETE' 
          })
        )
      );
      
      // Clear the local state
      setSelectedPlayers([]);
    } catch (err) {
      setError('Failed to clear pool. Please try again.');
    }
  };

  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (isLoading && allPlayers.length === 0) return <div className="p-4 text-center">Loading players...</div>;

  return (
    <>
      <div className="bg-white rounded-xl shadow-soft-xl">
        <div className="p-4">
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
        {selectedPlayers.length > 0 && (
          <div className="p-3 border-t border-gray-200 flex justify-start">
            <Button 
              variant="secondary" 
              onClick={() => setIsClearConfirmOpen(true)} 
              className="shadow-soft-sm"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <SoftUIConfirmationModal 
        isOpen={isClearConfirmOpen} 
        onClose={() => setIsClearConfirmOpen(false)} 
        onConfirm={handleClearPool} 
        title="Clear Pool" 
        message="Are you sure you want to clear all pool assignments? This cannot be undone." 
        confirmText="Clear Pool" 
        cancelText="Cancel"
        icon="warning"
      />
    </>
  );
};

export default PlayerPoolPane;
