'use client';

import React, { useState, useEffect } from 'react';
import { PlayerInPool } from '@/types/player.types';
import { PlayerFormData } from '@/types/player.types';
import PlayerPool from '@/components/team/PlayerPool.component';
import PlayerFormModal from '@/components/admin/player/PlayerFormModal.component';
import Button from '@/components/ui-kit/Button.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth.hook';
import { queryKeys } from '@/lib/queryKeys';
// React Query hook for automatic deduplication
import { usePlayers } from '@/hooks/queries/usePlayers.hook';

interface PlayerPoolPaneProps {
  matchId: string;
  teamSize: number;
  initialPlayers: PlayerInPool[];
  onSelectionChange: (playerIds: string[]) => void;
}

const PlayerPoolPane = ({ matchId, teamSize, initialPlayers, onSelectionChange }: PlayerPoolPaneProps) => {
  // Use React Query hook - automatic deduplication and caching!
  const { data: allPlayers = [], isLoading, error: queryError } = usePlayers();
  const queryErrorMessage = queryError ? (queryError as Error).message : null;
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerInPool[]>([]);
  const [pendingPlayerToggles, setPendingPlayerToggles] = useState<Set<string>>(new Set());
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Add Player Modal states
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAddPlayer = async (playerData: PlayerFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create the new player
      const response = await fetch('/api/admin/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...playerData,
          is_ringer: playerData.isRinger,
          is_retired: playerData.isRetired,
          stamina_pace: playerData.staminaPace,
          selected_club: playerData.club,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add player');
      }

      const newPlayer = result.data;

      // 2. Add player to current match pool
      await fetch('/api/admin/match-player-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, player_id: newPlayer.id })
      });

      // 3. Update local states and invalidate cache
      const newPlayerInPool: PlayerInPool = {
        ...newPlayer,
        responseStatus: 'IN' as const
      };
      
      // Invalidate players query to refetch with new player
      queryClient.invalidateQueries({ queryKey: queryKeys.players(profile.tenantId) });
      setSelectedPlayers(prev => [...prev, newPlayerInPool]);
      
      setIsPlayerModalOpen(false);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      throw error; // Let the modal handle the error display
    } finally {
      setIsSubmitting(false);
    }
  };

  if (queryErrorMessage) return <div className="p-4 text-center text-red-500">{queryErrorMessage}</div>;
  if (isLoading && allPlayers.length === 0) return <div className="p-4 text-center">Loading players...</div>;

  const maxAllowedPlayers = teamSize * 2;
  const hasReachedMaxPlayers = selectedPlayers.length >= maxAllowedPlayers;

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
        <div className="p-3 border-t border-gray-200 flex justify-end gap-3">
          {selectedPlayers.length > 0 && (
            <Button 
              variant="secondary" 
              onClick={() => setIsClearConfirmOpen(true)} 
              className="shadow-soft-sm"
            >
              Clear
            </Button>
          )}
          
          <Button 
            variant="secondary"
            className="rounded-lg shadow-soft-sm"
            onClick={() => setIsPlayerModalOpen(true)}
            disabled={hasReachedMaxPlayers}
          >
            Create Player
          </Button>
        </div>
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

      <PlayerFormModal 
        isOpen={isPlayerModalOpen}
        onClose={() => {
          setIsPlayerModalOpen(false);
          setError(null);
        }}
        onSubmit={handleAddPlayer}
        isProcessing={isSubmitting}
        initialData={{
          isRinger: true, 
          goalscoring: 3, 
          defending: 3, 
          staminaPace: 3, 
          control: 3, 
          teamwork: 3, 
          resilience: 3, 
          club: null
        }}
        title="Add New Player"
        submitButtonText="Create Player"
      />
    </>
  );
};

export default PlayerPoolPane;
