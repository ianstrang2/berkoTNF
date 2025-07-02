'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Button from '@/components/ui-kit/Button.component';
import { PlayerInPool } from '@/types/player.types';
import Card from '@/components/ui-kit/Card.component';
import { GripVertical, Copy, Trash2 } from 'lucide-react';
import BalanceOptionsModal from './BalanceOptionsModal.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import TornadoChart from '@/components/team/TornadoChart.component';
import { calculateTeamStatsFromPlayers } from '@/utils/teamStatsCalculation.util';

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
  matchId: string,
  onTeamModified?: () => void,
  currentPlayers?: PlayerInPool[]
) => {
  const [draggedPlayer, setDraggedPlayer] = useState<PlayerInPool | null>(null);

  const updatePlayerAssignment = async (player: PlayerInPool, targetTeam: Team, targetSlot?: number) => {
    // Store original state for potential reversion
    const originalPlayers = currentPlayers ? [...currentPlayers] : [];
    
    // Check for slot conflicts BEFORE optimistic update
    let conflictPlayer: PlayerInPool | null = null;
    let originalPlayerTeam: Team | undefined = undefined;
    let originalPlayerSlot: number | undefined = undefined;
    
    if (targetTeam !== 'Unassigned' && targetSlot) {
      // Find the dragged player's current position
      const draggedPlayer = originalPlayers.find(p => p.id === player.id);
      if (draggedPlayer) {
        originalPlayerTeam = draggedPlayer.team;
        originalPlayerSlot = draggedPlayer.slot_number;
      }
      
      // Find any player currently in the target slot
      conflictPlayer = originalPlayers.find(p => 
        p.team === targetTeam && p.slot_number === targetSlot && p.id !== player.id
      ) || null;
    }
    
    // Optimistically update the UI
    setPlayers(currentPlayers => {
      const newPlayers = [...currentPlayers];
      const draggedPlayerIdx = newPlayers.findIndex(p => p.id === player.id);
      
      if (draggedPlayerIdx === -1) return currentPlayers; // Player not found
      
      // If there's a conflict, move that player to the dragged player's old position
      if (conflictPlayer && originalPlayerTeam && originalPlayerSlot) {
        const conflictPlayerIdx = newPlayers.findIndex(p => p.id === conflictPlayer!.id);
        if (conflictPlayerIdx > -1) {
          newPlayers[conflictPlayerIdx] = {
            ...newPlayers[conflictPlayerIdx],
            team: originalPlayerTeam,
            slot_number: originalPlayerSlot,
          };
        }
      }
      
      // Update the dragged player
      newPlayers[draggedPlayerIdx] = {
        ...newPlayers[draggedPlayerIdx],
        team: targetTeam,
        slot_number: targetTeam !== 'Unassigned' ? targetSlot : undefined,
      };
      
      return newPlayers;
    });

    // Send updates to the server
    try {
      // First, update the dragged player
      const response1 = await fetch('/api/admin/upcoming-match-players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upcoming_match_id: parseInt(matchId, 10),
          player_id: parseInt(player.id, 10),
          team: targetTeam,
          slot_number: targetTeam !== 'Unassigned' ? targetSlot : null,
        }),
      });
      
      if (!response1.ok) {
        throw new Error(`Server responded with ${response1.status} for main player`);
      }
      
      // If there was a conflict, update the displaced player
      if (conflictPlayer && originalPlayerTeam && originalPlayerSlot) {
        const response2 = await fetch('/api/admin/upcoming-match-players', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upcoming_match_id: parseInt(matchId, 10),
            player_id: parseInt(conflictPlayer.id, 10),
            team: originalPlayerTeam,
            slot_number: originalPlayerTeam !== 'Unassigned' ? originalPlayerSlot : null,
          }),
        });
        
        if (!response2.ok) {
          throw new Error(`Server responded with ${response2.status} for conflict player`);
        }
      }
      
      // After successfully updating all players, mark the match as unbalanced
      await markAsUnbalanced();
      // Track team modification
      onTeamModified?.();
    } catch (error) {
      console.error("Failed to update player assignment:", error);
      // Revert the optimistic UI update on failure
      setPlayers(originalPlayers);
      // You could also show a toast notification here if available
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
  
  // New state for TornadoChart integration
  const [balanceWeights, setBalanceWeights] = useState<any>(null);
  const [balanceMethod, setBalanceMethod] = useState<'ability' | 'performance' | 'random' | null>(null);
  const [isTeamsModified, setIsTeamsModified] = useState<boolean>(false);

  useEffect(() => {
    setPlayers(initialPlayers);
  }, [initialPlayers]);

  useEffect(() => {
    const fetchTemplate = async () => {
        try {
            const response = await fetch(`/api/admin/team-templates?teamSize=${teamSize}`);
            const result = await response.json();
            
            if (result.success && result.data.length > 0) {
                setTeamTemplate(result.data[0]);
            } else {
                setTeamTemplate({ defenders: 3, midfielders: 4, attackers: 2 });
            }
        } catch (error) { 
            setTeamTemplate({ defenders: 3, midfielders: 4, attackers: 2 }); 
        }
    };
    fetchTemplate();
  }, [teamSize]);

  // Fetch balance weights for TornadoChart
  useEffect(() => {
    const fetchBalanceWeights = async () => {
      try {
        const response = await fetch('/api/admin/balance-algorithm');
        const result = await response.json();
        
        if (result.success && result.data) {
          // Transform to TornadoChart format
          const formattedWeights = {
            defense: {},
            midfield: {},
            attack: {}
          };
          
          result.data.forEach((weight: any) => {
            const group = weight.description;     // ✅ Use 'description' field
            const attribute = weight.name;        // ✅ Use 'name' field
            if (group && attribute && formattedWeights[group as keyof typeof formattedWeights]) {
              formattedWeights[group as keyof typeof formattedWeights][attribute] = weight.weight;
            }
          });
          
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            console.log('Fetched balance weights:', formattedWeights);
          }
          
          setBalanceWeights(formattedWeights);
        }
      } catch (error) {
        console.error('Error fetching balance weights:', error);
      }
    };
    
    fetchBalanceWeights();
  }, []);

  const { handleDragStart, handleDragOver, handleDrop } = useTeamDragAndDrop(
    setPlayers,
    markAsUnbalanced,
    matchId,
    () => setIsTeamsModified(true),
    players
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

  // Calculate team stats for TornadoChart - keep calculating even after teams are modified
  const teamStatsData = useMemo(() => {
    if (!teamTemplate) {
      return null;
    }
    
    // Hide chart if teams are incomplete (players moved to pool)
    if (teamA.length !== teamSize || teamB.length !== teamSize) {
      return null;
    }
    
    // Show stats if originally balanced with ability method OR currently balanced
    const shouldCalculate = balanceMethod === 'ability' || isBalanced;
    if (!shouldCalculate) return null;
    
    const teamAStats = calculateTeamStatsFromPlayers(teamA, teamTemplate, teamSize);
    const teamBStats = calculateTeamStatsFromPlayers(teamB, teamTemplate, teamSize);
    
    return { teamAStats, teamBStats };
  }, [isBalanced, balanceMethod, teamA, teamB, teamTemplate, teamSize, players]);

  const handleBalanceConfirm = async (method: 'ability' | 'performance' | 'random') => {
    setIsBalanceModalOpen(false);
    setIsBalancing(true);
    setBalanceMethod(method);  // ✅ Track method used
    setIsTeamsModified(false); // ✅ Reset modification state
    try {
      await balanceTeamsAction(method);
    } catch(e: any) { onShowToast(e.message || "Balancing failed", "error"); }
    finally { setIsBalancing(false); }
  };

  const handleClearTeams = async () => {
    setIsClearConfirmOpen(false);
    try {
      await clearTeamsAction();
      // Reset TornadoChart state when teams are cleared
      setBalanceMethod(null);
      setIsTeamsModified(false);
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

  const renderPlayer = (player: PlayerInPool) => {
    // Truncate name to 14 characters max
    const displayName = player.name.length > 14 ? player.name.substring(0, 14) : player.name;
    
    return (
      <div 
        key={player.id} 
        draggable 
        onDragStart={() => handleDragStart(player)} 
        className="inline-flex items-center justify-between bg-white rounded-lg shadow-soft-sm text-slate-700 border border-gray-200 px-3 py-2 font-sans transition-all duration-200 ease-in-out cursor-grab active:cursor-grabbing w-[170px]"
      >
          <span className="text-sm font-medium truncate flex-1">{displayName}</span>
          <GripVertical className="ml-2 text-slate-400 flex-shrink-0" size={16} />
      </div>
    );
  };
  
  const renderTeamSlot = (team: 'A' | 'B', slotIndex: number) => {
    // For Team B, the slot number needs to be offset by the team size.
    const actualSlotNumber = team === 'A' ? slotIndex + 1 : slotIndex + 1 + teamSize;
    const playerInSlot = (team === 'A' ? teamA : teamB).find(p => p.slot_number === actualSlotNumber);
    
    return (
      <div 
        key={actualSlotNumber} 
        onDragOver={handleDragOver} 
        onDrop={() => handleDrop(team, actualSlotNumber)} 
        className={`h-[44px] w-[170px] flex items-center justify-center rounded-lg transition-all duration-200 ease-in-out mx-auto ${
          playerInSlot 
            ? 'bg-transparent' 
            : 'bg-gray-50 border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 hover:shadow-soft-sm'
        }`}
      >
        {playerInSlot ? renderPlayer(playerInSlot) : (
          <span className="text-xs text-gray-400 font-medium">Drop player here</span>
        )}
      </div>
    );
  };
  
  const renderTeamColumn = (teamName: 'A' | 'B') => {
    if (!teamTemplate) return <div className="p-4"><div className="w-full h-96 bg-gray-200 animate-pulse rounded-lg"></div></div>;
    // Loop from 0 to teamSize-1 to get the correct index for the slot
    const slots = Array.from({ length: teamSize }, (_, i) => i);
    const { defenders, midfielders, attackers } = teamTemplate;
    
    return (
      <div className="space-y-1">
        <h3 className="font-bold text-slate-700 text-lg text-center mb-3">
          {teamName === 'A' ? 'Orange' : 'Green'}
        </h3>
        {slots.map((slotIndex) => {
          const currentSlot = slotIndex + 1;
          const showLineAfter = currentSlot === defenders || currentSlot === defenders + midfielders;
          
          return (
            <React.Fragment key={slotIndex}>
                {renderTeamSlot(teamName, slotIndex)}
                {showLineAfter && (
                     <div className="py-2 flex items-center justify-center">
                       <div className="h-0.5 w-24 bg-gradient-to-r from-pink-400 via-purple-500 to-pink-400 rounded-full shadow-sm opacity-75"></div>
                     </div>
                )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column: Player Pool + TornadoChart (Desktop) */}
        <div className="w-full space-y-6">
          {/* Player Pool Card */}
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
                <Button 
                    variant="primary" 
                    onClick={() => setIsBalanceModalOpen(true)} 
                    disabled={isBalancing}
                >
                    {unassigned.length === 0 ? 'Re-Balance Teams' : 'Auto Assign'}
                </Button>
            </div>
          </Card>

          {/* TornadoChart - Desktop Only (Below Player Pool) */}
          {balanceMethod === 'ability' && teamStatsData && balanceWeights && (
            <div className="hidden md:block">
              <Card>
                <div className="p-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="font-bold text-slate-700 text-lg">Team Balance Analysis</h2>
                    {isTeamsModified && (
                      <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                        ⚠️ Teams Modified
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="bg-gradient-to-tl from-gray-900 to-slate-800 rounded-xl p-4">
                    <TornadoChart 
                      teamAStats={teamStatsData.teamAStats} 
                      teamBStats={teamStatsData.teamBStats} 
                      weights={balanceWeights}
                      teamSize={teamSize}
                      isModified={isTeamsModified}
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column: Teams */}
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

      {/* TornadoChart Analysis - Mobile Only (Full Width at Bottom) */}
      {balanceMethod === 'ability' && teamStatsData && balanceWeights && (
        <div className="md:hidden w-full mt-6">
          <Card>
            <div className="p-3 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-slate-700 text-lg">Team Balance Analysis</h2>
                {isTeamsModified && (
                  <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                    ⚠️ Teams Modified
                  </span>
                )}
              </div>
            </div>
            <div className="p-4">
              <div className="bg-gradient-to-tl from-gray-900 to-slate-800 rounded-xl p-4">
                <TornadoChart 
                  teamAStats={teamStatsData.teamAStats} 
                  teamBStats={teamStatsData.teamBStats} 
                  weights={balanceWeights}
                  teamSize={teamSize}
                  isModified={isTeamsModified}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

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