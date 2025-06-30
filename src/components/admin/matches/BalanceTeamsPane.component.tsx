'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Button from '@/components/ui-kit/Button.component';
import { PlayerInPool } from '@/types/player.types';
import Card from '@/components/ui-kit/Card.component';
import { GripVertical, Copy, Trash2 } from 'lucide-react';
import BalanceOptionsModal from './BalanceOptionsModal.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';

type Team = 'A' | 'B' | 'Unassigned';

interface TeamTemplate {
  defenders: number;
  midfielders: number;
  attackers: number;
}

interface BalanceTeamsPaneProps {
  matchId: string;
  teamSize: number;
  players: PlayerInPool[];
  isBalanced: boolean;
  balanceTeamsAction: (method: 'ability' | 'performance' | 'random') => Promise<void>;
  clearTeamsAction: () => Promise<void>;
  onShowToast: (message: string, type: 'success' | 'error') => void;
  markAsUnbalanced: () => Promise<void>;
}

const useTeamDragAndDrop = (
  setPlayers: React.Dispatch<React.SetStateAction<PlayerInPool[]>>,
  markAsUnbalanced: () => Promise<void>,
  matchId: string
) => {
  const [draggedPlayer, setDraggedPlayer] = useState<PlayerInPool | null>(null);

  const updatePlayerAssignment = async (player: PlayerInPool, targetTeam: Team, targetSlot?: number) => {
    // Optimistically update the UI
    setPlayers(currentPlayers => {
      const newPlayers = [...currentPlayers];
      const idx = newPlayers.findIndex(p => p.id === player.id);
      if (idx > -1) {
        newPlayers[idx] = {
          ...newPlayers[idx],
          team: targetTeam,
          slot_number: targetTeam !== 'Unassigned' ? targetSlot : undefined,
        };
      }
      return newPlayers;
    });

    // Then, send the update to the server
    try {
      await fetch('/api/admin/upcoming-match-players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upcoming_match_id: parseInt(matchId, 10),
          player_id: parseInt(player.id, 10),
          team: targetTeam,
          slot_number: targetTeam !== 'Unassigned' ? targetSlot : null,
        }),
      });
      // After successfully updating the player, mark the match as unbalanced
      await markAsUnbalanced();
    } catch (error) {
      console.error("Failed to update player assignment:", error);
      // Optional: Add logic to revert the optimistic UI update on failure
    }
  };

  const handleDragStart = (player: PlayerInPool) => setDraggedPlayer(player);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (targetTeam: Team, targetSlot?: number) => {
    if (!draggedPlayer) return;

    // Call the new update function
    updatePlayerAssignment(draggedPlayer, targetTeam, targetSlot);

    setDraggedPlayer(null);
  };

  return { handleDragStart, handleDragOver, handleDrop };
};

const BalanceTeamsPane = ({ 
  matchId, 
  teamSize, 
  players: initialPlayers, 
  isBalanced, 
  balanceTeamsAction, 
  clearTeamsAction, 
  onShowToast, 
  markAsUnbalanced 
}: BalanceTeamsPaneProps) => {
  const [players, setPlayers] = useState(initialPlayers);
  const [isBalancing, setIsBalancing] = useState(false);
  const [teamTemplate, setTeamTemplate] = useState<TeamTemplate | null>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  useEffect(() => {
    setPlayers(initialPlayers);
  }, [initialPlayers]);

  useEffect(() => {
    const fetchTemplate = async () => {
        try {
            const response = await fetch(`/api/admin/team-templates?team_size=${teamSize}`);
            const result = await response.json();
            if (result.success && result.data.length > 0) setTeamTemplate(result.data[0]);
            else setTeamTemplate({ defenders: 3, midfielders: 3, attackers: 3 });
        } catch (error) { setTeamTemplate({ defenders: 3, midfielders: 3, attackers: 3 }); }
    };
    fetchTemplate();
  }, [teamSize]);

  const { handleDragStart, handleDragOver, handleDrop } = useTeamDragAndDrop(
    setPlayers,
    markAsUnbalanced,
    matchId
  );

  const { teamA, teamB, unassigned } = useMemo(() => {
    const a: PlayerInPool[] = [], b: PlayerInPool[] = [], u: PlayerInPool[] = [];
    players.forEach(p => {
      if (p.team === 'A') a.push(p); else if (p.team === 'B') b.push(p); else u.push(p);
    });
    a.sort((x, y) => (x.slot_number || 0) - (y.slot_number || 0));
    b.sort((x, y) => (x.slot_number || 0) - (y.slot_number || 0));
    return { teamA: a, teamB: b, unassigned: u };
  }, [players]);

  const handleBalanceConfirm = async (method: 'ability' | 'performance' | 'random') => {
    setIsBalanceModalOpen(false);
    setIsBalancing(true);
    try {
      await balanceTeamsAction(method);
    } catch(e: any) { onShowToast(e.message || "Balancing failed", "error"); }
    finally { setIsBalancing(false); }
  };

  const handleClearTeams = async () => {
    setIsClearConfirmOpen(false);
    try {
      await clearTeamsAction();
    } catch (error: any) {
      onShowToast(error.message || "Failed to clear teams", 'error');
    }
  };

  const handleCopyTeams = () => {
    const formatTeam = (team: PlayerInPool[], name: string) => `${name}\n${team.map(p => p.name).join('\n')}`;
    const textToCopy = `${formatTeam(teamA, 'Team Orange')}\n\n${formatTeam(teamB, 'Team Green')}`;
    navigator.clipboard.writeText(textToCopy);
    onShowToast("Teams copied to clipboard!", 'success');
  };

  const renderPlayer = (player: PlayerInPool) => (
      <div key={player.id} draggable onDragStart={() => handleDragStart(player)} className="inline-flex items-center bg-white rounded-lg shadow-soft-sm text-slate-700 border border-gray-200 px-3 py-2 font-sans transition-all duration-200 ease-in-out cursor-grab active:cursor-grabbing">
          <span className="truncate text-sm">{player.name}</span>
          <GripVertical className="ml-2 text-slate-400" size={16} />
      </div>
  );
  
  const renderTeamSlot = (team: 'A' | 'B', slotIndex: number) => {
    // For Team B, the slot number needs to be offset by the team size.
    const actualSlotNumber = team === 'A' ? slotIndex + 1 : slotIndex + 1 + teamSize;
    const playerInSlot = (team === 'A' ? teamA : teamB).find(p => p.slot_number === actualSlotNumber);
    
    return (
      <div key={actualSlotNumber} onDragOver={handleDragOver} onDrop={() => handleDrop(team, actualSlotNumber)} className="h-[52px] w-[190px] flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 hover:border-purple-400 hover:bg-gray-50 transition-colors p-1 mx-auto">
        {playerInSlot ? renderPlayer(playerInSlot) : null}
      </div>
    );
  };
  
  const renderTeamColumn = (teamName: 'A' | 'B') => {
    if (!teamTemplate) return <div className="p-4"><div className="w-full h-96 bg-gray-200 animate-pulse rounded-lg"></div></div>;
    // Loop from 0 to teamSize-1 to get the correct index for the slot
    const slots = Array.from({ length: teamSize }, (_, i) => i);
    const { defenders, midfielders } = teamTemplate;
    return (
      <div className="space-y-2">
        <h3 className="font-bold text-slate-700 text-lg text-center">
          {teamName === 'A' ? 'Orange' : 'Green'}
        </h3>
        {slots.map((slotIndex) => (
            <React.Fragment key={slotIndex}>
                {renderTeamSlot(teamName, slotIndex)}
                {(slotIndex + 1 === defenders || slotIndex + 1 === defenders + midfielders) && (
                     <div className="h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent my-1" />
                )}
            </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Card: Player Pool */}
        <div className="w-full">
          <Card>
            <div className="p-3 border-b border-gray-200">
                <h2 className="font-bold text-slate-700 text-lg">Player Pool</h2>
            </div>
            <div className="p-4" onDragOver={handleDragOver} onDrop={() => handleDrop('Unassigned')}>
                <div className="flex flex-wrap gap-2 min-h-[120px] content-start">
                    {unassigned.length > 0 
                        ? unassigned.map(p => renderPlayer(p)) 
                        : <p className="w-full text-center text-slate-500 pt-4 text-sm">All players assigned</p>}
                </div>
            </div>
            <div className="p-3 border-t border-gray-200 flex justify-end">
                <Button variant="primary" onClick={() => setIsBalanceModalOpen(true)} disabled={isBalancing || unassigned.length === 0}>
                    Auto Assign
                </Button>
            </div>
          </Card>
        </div>

        {/* Right Card: Teams */}
        <div className="w-full">
            <Card>
                <div className="flex justify-between items-center p-3 border-b border-gray-200">
                    <h2 className="font-bold text-slate-700 text-lg">Teams</h2>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                    {renderTeamColumn('A')}
                    {renderTeamColumn('B')}
                </div>
                <div className="p-3 border-t border-gray-200 flex justify-start gap-2">
                    <Button variant="secondary" onClick={() => setIsClearConfirmOpen(true)} className="shadow-soft-sm">Clear</Button>
                    <Button variant="secondary" onClick={handleCopyTeams} disabled={unassigned.length > 0} className="shadow-soft-sm">Copy</Button>
                </div>
            </Card>
        </div>
      </div>

      <BalanceOptionsModal isOpen={isBalanceModalOpen} onClose={() => setIsBalanceModalOpen(false)} onConfirm={handleBalanceConfirm} isLoading={isBalancing} />
      <SoftUIConfirmationModal 
        isOpen={isClearConfirmOpen} 
        onClose={() => setIsClearConfirmOpen(false)} 
        onConfirm={handleClearTeams} 
        title="Clear Teams" 
        message="Are you sure you want to clear all team assignments? This cannot be undone." 
        confirmText="Clear Teams" 
        cancelText="Cancel"
        icon="warning"
      />
    </>
  );
};

export default BalanceTeamsPane; 