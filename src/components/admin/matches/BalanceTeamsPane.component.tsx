'use client';

import React, { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import Button from '@/components/ui-kit/Button.component';
import { PlayerInPool } from '@/types/player.types';
import Card from '@/components/ui-kit/Card.component';
import { GripVertical } from 'lucide-react';
import ShareMenu from '@/components/ui-kit/ShareMenu.component';
import BalanceOptionsModal from './BalanceOptionsModal.component';
import TornadoChart from '@/components/team/TornadoChart.component';
import PerformanceTornadoChart from '@/components/team/PerformanceTornadoChart.component';
import { calculateTeamStatsFromPlayers, calculatePerformanceTeamStats } from '@/utils/teamStatsCalculation.util';
import { deriveTemplate, formationToTemplate } from '@/utils/teamFormation.util';
// React Query hooks for automatic deduplication
import { useAppConfig } from '@/hooks/queries/useAppConfig.hook';
import { apiFetch } from '@/lib/apiConfig';
import { useLatestPlayerStatus } from '@/hooks/queries/useLatestPlayerStatus.hook';
import { useTeamTemplate } from '@/hooks/queries/useTeamTemplates.hook';
import { useBalanceAlgorithm, usePerformanceWeights } from '@/hooks/queries/useBalanceWeights.hook';

// Fallback templates based on database values
function getFallbackTemplate(teamSize: number) {
  switch (teamSize) {
    case 5: return { defenders: 1, midfielders: 2, attackers: 2 };
    case 6: return { defenders: 2, midfielders: 2, attackers: 2 };
    case 7: return { defenders: 2, midfielders: 3, attackers: 2 };
    case 8: return { defenders: 3, midfielders: 3, attackers: 2 };
    case 9: return { defenders: 3, midfielders: 4, attackers: 2 };
    case 10: return { defenders: 4, midfielders: 3, attackers: 3 };
    case 11: return { defenders: 4, midfielders: 4, attackers: 3 };
    default: return { defenders: 3, midfielders: 4, attackers: 2 }; // 9-player fallback
  }
}

type Team = 'A' | 'B' | 'Unassigned';

interface TeamTemplate {
  defenders: number;
  midfielders: number;
  attackers: number;
}

interface BalanceTeamsPaneProps {
  matchId: string;
  teamSize: number;
  actualSizeA?: number;
  actualSizeB?: number;
  players: PlayerInPool[];
  isBalanced: boolean;
  balanceTeamsAction: (method: 'ability' | 'performance' | 'random') => Promise<void>;
  onShowToast: (message: string, type: 'success' | 'error') => void;
  markAsUnbalanced: () => Promise<void>;
  onPlayersUpdated?: () => Promise<void>;
  teamsSavedAt: string | null;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  initialBalanceMethod?: 'ability' | 'performance' | 'random' | null;
}

export interface BalanceTeamsPaneHandle {
  getCurrentPlayers: () => PlayerInPool[];
}

const useTeamDragAndDrop = (
  setPlayers: React.Dispatch<React.SetStateAction<PlayerInPool[]>>,
  markAsUnbalanced: () => Promise<void>,
  matchId: string,
  onTeamModified?: () => void,
  currentPlayers?: PlayerInPool[],
  onPlayersUpdated?: () => Promise<void>,
  localOnly: boolean = true  // NEW: When true, only update local state (don't persist to DB)
) => {
  const [draggedPlayer, setDraggedPlayer] = useState<PlayerInPool | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [draggedElement, setDraggedElement] = useState<HTMLElement | null>(null);

  const updatePlayerAssignment = async (player: PlayerInPool, targetTeam: Team, targetSlot?: number) => {
    // Store original state for potential reversion
    const originalPlayers = currentPlayers ? [...currentPlayers] : [];
    
    // Check for slot conflicts BEFORE optimistic update
    let conflictPlayer: PlayerInPool | null = null;
    let originalPlayerTeam: Team | undefined = undefined;
    let originalPlayerSlot: number | undefined = undefined;
    
    // Find the dragged player's current position
    const draggedPlayer = originalPlayers.find(p => p.id === player.id);
    if (draggedPlayer) {
      originalPlayerTeam = draggedPlayer.team;
      originalPlayerSlot = draggedPlayer.slot_number;
    }
    
    if (targetTeam !== 'Unassigned' && targetSlot) {
      // Find any player currently in the target slot
      conflictPlayer = originalPlayers.find(p => 
        p.team === targetTeam && p.slot_number === targetSlot && p.id !== player.id
      ) || null;
    }
    
    // Update the local UI state
    setPlayers(currentPlayers => {
      const newPlayers = [...currentPlayers];
      const draggedPlayerIdx = newPlayers.findIndex(p => p.id === player.id);
      
      if (draggedPlayerIdx === -1) return currentPlayers; // Player not found
      
      // If there's a conflict, move that player to the dragged player's old position or to Unassigned
      if (conflictPlayer) {
        const conflictPlayerIdx = newPlayers.findIndex(p => p.id === conflictPlayer!.id);
        if (conflictPlayerIdx > -1) {
          if (originalPlayerTeam && originalPlayerSlot) {
            // Swap: move conflict player to dragged player's old position
            newPlayers[conflictPlayerIdx] = {
              ...newPlayers[conflictPlayerIdx],
              team: originalPlayerTeam,
              slot_number: originalPlayerSlot,
            };
          } else {
            // Dragged player came from pool: move conflict player to pool
            newPlayers[conflictPlayerIdx] = {
              ...newPlayers[conflictPlayerIdx],
              team: 'Unassigned',
              slot_number: undefined,
            };
          }
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

    // Track team modification (for unsaved changes indicator)
    onTeamModified?.();

    // If localOnly mode, skip API calls - changes will be saved via save-teams API
    if (localOnly) {
      return;
    }

    // Legacy mode: Send updates to the server immediately
    try {
      if (conflictPlayer) {
        // Use atomic swap endpoint for any conflicts (either true swap or displacement to pool)
        const response = await apiFetch('/admin/upcoming-match-players/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upcoming_match_id: parseInt(matchId, 10),
            playerA: {
              player_id: parseInt(player.id, 10),
              team: targetTeam,
              slot_number: targetTeam !== 'Unassigned' ? targetSlot : null,
            },
            playerB: {
              player_id: parseInt(conflictPlayer.id, 10),
              team: originalPlayerTeam || 'Unassigned',
              slot_number: (originalPlayerTeam && originalPlayerTeam !== 'Unassigned') ? originalPlayerSlot : null,
            },
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status} for player swap`);
        }
      } else {
        // Single player move (no conflict)
        const response = await apiFetch('/admin/upcoming-match-players', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upcoming_match_id: parseInt(matchId, 10),
            player_id: parseInt(player.id, 10),
            team: targetTeam,
            slot_number: targetTeam !== 'Unassigned' ? targetSlot : null,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status} for player move`);
        }
      }
      
      // After successfully updating all players, mark the match as unbalanced
      await markAsUnbalanced();
      // Notify parent component that players have been updated
      onPlayersUpdated?.();
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

  // Touch event handlers for mobile
  const handleTouchStart = (player: PlayerInPool, e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setDraggedPlayer(player);
    setDraggedElement(e.currentTarget as HTMLElement);
    
    // Add visual feedback
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggedPlayer) return;
    // Note: scrolling is prevented via CSS touch-action: none (touch-none class)
    
    // Update dragged element position for visual feedback
    if (draggedElement) {
      draggedElement.style.opacity = '0.5';
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!draggedPlayer) return;

    // Reset visual feedback
    if (draggedElement) {
      draggedElement.style.opacity = '1';
    }

    // Get the element at the touch end position
    const touch = e.changedTouches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (!targetElement) {
      setDraggedPlayer(null);
      setTouchStartPos(null);
      setDraggedElement(null);
      return;
    }

    // Find the closest drop zone element (could be the element itself or a parent)
    const dropZone = targetElement.closest('[data-drop-zone]');
    
    if (dropZone) {
      const team = dropZone.getAttribute('data-team') as Team;
      const slot = dropZone.getAttribute('data-slot');
      
      if (team) {
        updatePlayerAssignment(draggedPlayer, team, slot ? parseInt(slot) : undefined);
      }
    }

    setDraggedPlayer(null);
    setTouchStartPos(null);
    setDraggedElement(null);
  };

  return { 
    handleDragStart, 
    handleDragOver, 
    handleDrop,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd 
  };
};

const BalanceTeamsPane = forwardRef<BalanceTeamsPaneHandle, BalanceTeamsPaneProps>(({ 
  matchId, 
  teamSize, 
  actualSizeA,
  actualSizeB,
  players: initialPlayers, 
  isBalanced, 
  balanceTeamsAction, 
  onShowToast, 
  markAsUnbalanced,
  onPlayersUpdated,
  teamsSavedAt,
  onUnsavedChangesChange,
  initialBalanceMethod = null
}, ref) => {
  // React Query hooks - automatic deduplication and caching!
  const { data: teamTemplate = null } = useTeamTemplate(teamSize);
  const { data: configData = [] } = useAppConfig({ groups: ['match_report', 'club_team_names'] });
  const { data: playerStatus = null } = useLatestPlayerStatus();
  const { data: balanceWeights = null } = useBalanceAlgorithm();
  const { data: performanceWeightsState = null } = usePerformanceWeights();
  
  // Local state
  const [players, setPlayers] = useState(initialPlayers);
  const [isBalancing, setIsBalancing] = useState(false);
  const [teamTemplateA, setTeamTemplateA] = useState<TeamTemplate | null>(null);
  const [teamTemplateB, setTeamTemplateB] = useState<TeamTemplate | null>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  // Initialize with method from Lock & Balance (for tornado chart), or null
  const [balanceMethod, setBalanceMethod] = useState<'ability' | 'performance' | 'random' | null>(initialBalanceMethod);
  const [isTeamsModified, setIsTeamsModified] = useState<boolean>(false);

  // No longer need copySuccess state - ShareMenu handles it internally
  
  // Extract config values from React Query hook
  const teamAName = useMemo(() => {
    const config = configData.find((c: any) => c.config_key === 'team_a_name');
    return config?.config_value || 'Team A';
  }, [configData]);
  
  const teamBName = useMemo(() => {
    const config = configData.find((c: any) => c.config_key === 'team_b_name');
    return config?.config_value || 'Team B';
  }, [configData]);
  
  const showOnFireConfig = useMemo(() => {
    const config = configData.find((c: any) => c.config_key === 'show_on_fire');
    return config?.config_value !== 'false';
  }, [configData]);
  
  const showGrimReaperConfig = useMemo(() => {
    const config = configData.find((c: any) => c.config_key === 'show_grim_reaper');
    return config?.config_value !== 'false';
  }, [configData]);
  
  // Extract player status from React Query hook
  const onFirePlayerId = playerStatus?.on_fire_player_id || null;
  const grimReaperPlayerId = playerStatus?.grim_reaper_player_id || null;
  
  // Extract current voting award holders
  const votingAwards = playerStatus?.voting_awards || { mom: [], dod: [], mia: [] };
  const momPlayerIds = votingAwards.mom.map(a => a.player_id);
  const dodPlayerIds = votingAwards.dod.map(a => a.player_id);
  const miaPlayerIds = votingAwards.mia.map(a => a.player_id);

  // Track saved state for comparison (what players see)
  const [savedPlayers, setSavedPlayers] = useState(initialPlayers);
  
  // Sync local players state when initialPlayers changes
  useEffect(() => {
    setPlayers(initialPlayers);
    setSavedPlayers(initialPlayers);
  }, [initialPlayers]);

  // Check if there are unsaved changes by comparing current players to saved players
  const hasUnsavedChanges = useMemo(() => {
    if (players.length !== savedPlayers.length) return true;
    return players.some((player, index) => {
      const savedPlayer = savedPlayers.find(sp => sp.id === player.id);
      if (!savedPlayer) return true;
      return player.team !== savedPlayer.team || player.slot_number !== savedPlayer.slot_number;
    });
  }, [players, savedPlayers]);

  // Notify parent of unsaved changes
  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  // Expose getCurrentPlayers method to parent via ref
  useImperativeHandle(ref, () => ({
    getCurrentPlayers: () => players
  }), [players]);

  // NOTE: We intentionally don't auto-detect balance method on mount.
  // The user can click "Re-Balance" to choose a method and see the appropriate chart.
  // This avoids showing misleading charts (e.g., performance chart for randomly balanced teams).

  // Handle uneven team templates (React Query provides base template)
  // Use useMemo to ensure templates are computed synchronously and don't flicker
  const { computedTemplateA, computedTemplateB } = useMemo(() => {
    const isUneven = actualSizeA && actualSizeB && actualSizeA !== actualSizeB;
    const isSimplified = actualSizeA === 4 && actualSizeB === 4;
    
    if (isUneven || isSimplified) {
      // Use derived templates for uneven teams
      const sizeA = actualSizeA || teamSize;
      const sizeB = actualSizeB || teamSize;
      
      const formationA = deriveTemplate(sizeA, isSimplified);
      const formationB = deriveTemplate(sizeB, isSimplified);
      
      return {
        computedTemplateA: formationToTemplate(formationA),
        computedTemplateB: formationToTemplate(formationB)
      };
    } else {
      // Even teams - use template from React Query or fallback
      const template = teamTemplate || getFallbackTemplate(teamSize);
      return {
        computedTemplateA: template,
        computedTemplateB: template
      };
    }
  }, [teamSize, actualSizeA, actualSizeB, teamTemplate]);
  
  // Sync computed templates to state (for any components that need state)
  useEffect(() => {
    setTeamTemplateA(computedTemplateA);
    setTeamTemplateB(computedTemplateB);
  }, [computedTemplateA, computedTemplateB]);

  const { handleDragStart, handleDragOver, handleDrop, handleTouchStart, handleTouchMove, handleTouchEnd } = useTeamDragAndDrop(
    setPlayers,
    markAsUnbalanced,
    matchId,
    () => setIsTeamsModified(true),
    players,
    onPlayersUpdated,
    true  // localOnly: Only update local state, save via save-teams API
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
    // For uneven teams, check against actual team sizes
    const expectedSizeA = actualSizeA || teamSize;
    const expectedSizeB = actualSizeB || teamSize;
    
    if (teamA.length !== expectedSizeA || teamB.length !== expectedSizeB) {
      return null;
    }
    
    // Show stats for ability method when teams are complete (regardless of isBalanced flag)
    const shouldCalculate = balanceMethod === 'ability';
    if (!shouldCalculate) return null;
    
    const teamAStats = calculateTeamStatsFromPlayers(teamA, teamTemplate, teamSize);
    const teamBStats = calculateTeamStatsFromPlayers(teamB, teamTemplate, teamSize);
    
    return { teamAStats, teamBStats };
  }, [balanceMethod, teamA, teamB, teamTemplate, teamSize, actualSizeA, actualSizeB]);

  // Calculate performance-based team stats for Performance algorithm tornado chart
  const performanceStatsData = useMemo(() => {
    // Hide chart if teams are incomplete (players moved to pool)
    // For uneven teams, check against actual team sizes
    const expectedSizeA = actualSizeA || teamSize;
    const expectedSizeB = actualSizeB || teamSize;
    
    if (teamA.length !== expectedSizeA || teamB.length !== expectedSizeB) {
      return null;
    }

    // Show performance stats only for performance method when teams are complete
    const shouldCalculate = balanceMethod === 'performance';
    if (!shouldCalculate) return null;

    const teamAStats = calculatePerformanceTeamStats(teamA);
    const teamBStats = calculatePerformanceTeamStats(teamB);

    return { teamAStats, teamBStats };
  }, [balanceMethod, teamA, teamB, actualSizeA, actualSizeB]);

  // Performance weights - use fetched values or defaults
  const performanceWeights = useMemo(() => {
    if (performanceWeightsState) {
      return {
        performance: {
          powerRating: performanceWeightsState.power_weight || 0.5,
          goalThreat: performanceWeightsState.goal_weight || 0.5
        }
      };
    }
    // Default values if not loaded yet
    return {
      performance: {
        powerRating: 0.5,
        goalThreat: 0.5
      }
    };
  }, [performanceWeightsState]);

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

  // Generate teams text for sharing
  const generateTeamsText = (): string => {
    if (teamA.length === 0 && teamB.length === 0) {
      return '';
    }

    const formatTeam = (team: PlayerInPool[]) => {
      return team
        .map(player => {
          let playerName = player.name;
          
          // System-generated status icons
          if (showOnFireConfig && player.id === onFirePlayerId) {
            playerName += ' 🔥';
          }
          if (showGrimReaperConfig && player.id === grimReaperPlayerId) {
            playerName += ' 💀';
          }
          
          // Voting award icons (current holders from latest completed survey)
          if (momPlayerIds.includes(player.id)) {
            playerName += ' 💪';
          }
          if (dodPlayerIds.includes(player.id)) {
            playerName += ' 🫏';
          }
          if (miaPlayerIds.includes(player.id)) {
            playerName += ' 🦝';
          }
          
          return playerName;
        })
        .join('\n');
    };

    const finalTeamAName = teamAName || 'Team A';
    const finalTeamBName = teamBName || 'Team B';

    return `--- ${finalTeamAName.toUpperCase()} ---\n${formatTeam(teamA)}\n\n--- ${finalTeamBName.toUpperCase()} ---\n${formatTeam(teamB)}`;
  };

  const teamsText = generateTeamsText();

  const renderPlayer = (player: PlayerInPool) => {
    return (
      <div 
        key={player.id} 
        draggable 
        onDragStart={() => handleDragStart(player)}
        onTouchStart={(e) => handleTouchStart(player, e)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="inline-flex items-center justify-between bg-white rounded shadow-soft-sm text-slate-700 border border-gray-200 px-2 py-1 font-sans transition-all duration-200 ease-in-out cursor-grab active:cursor-grabbing w-full max-w-[155px] touch-none"
      >
          <span className="text-xs font-medium truncate flex-1">{player.name}</span>
          <GripVertical className="ml-1 text-slate-400 flex-shrink-0" size={14} />
      </div>
    );
  };
  
  const renderTeamSlot = (team: 'A' | 'B', slotIndex: number) => {
    // Both teams use slot numbers 1-N within their team
    const actualSlotNumber = slotIndex + 1;
    const playerInSlot = (team === 'A' ? teamA : teamB).find(p => p.slot_number === actualSlotNumber);
    
    return (
      <div 
        key={actualSlotNumber} 
        data-drop-zone="true"
        data-team={team}
        data-slot={actualSlotNumber}
        onDragOver={handleDragOver} 
        onDrop={() => handleDrop(team, actualSlotNumber)}
        className={`h-[32px] w-full max-w-[155px] flex items-center justify-center rounded transition-all duration-200 ease-in-out mx-auto ${
          playerInSlot 
            ? 'bg-transparent' 
            : 'bg-gray-50 border border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50'
        }`}
      >
        {playerInSlot ? renderPlayer(playerInSlot) : (
          <span className="text-[10px] text-gray-400">Swap here</span>
        )}
      </div>
    );
  };
  
  const renderTeamColumn = (teamName: 'A' | 'B') => {
    // Use team-specific templates - prefer state, fall back to computed, then to hook value
    const currentTemplate = teamName === 'A' 
      ? (teamTemplateA || computedTemplateA || teamTemplate) 
      : (teamTemplateB || computedTemplateB || teamTemplate);
    
    if (!currentTemplate) return <div className="p-2"><div className="w-full h-48 bg-gray-200 animate-pulse rounded-lg"></div></div>;
    
    // Use actual team sizes if available, otherwise fall back to teamSize
    const actualTeamSize = teamName === 'A' 
      ? (actualSizeA || teamSize) 
      : (actualSizeB || teamSize);
    
    // Loop from 0 to actualTeamSize-1 to get the correct index for the slot
    const slots = Array.from({ length: actualTeamSize }, (_, i) => i);
    const { defenders, midfielders, attackers } = currentTemplate;
    
    return (
      <div className="space-y-0.5">
        <h3 className="font-semibold text-slate-700 text-sm text-center mb-2">
          {teamName === 'A' ? 'Orange' : 'Green'}
        </h3>
        {slots.map((slotIndex) => {
          const currentSlot = slotIndex + 1;
          const showLineAfter = currentSlot === defenders || currentSlot === defenders + midfielders;
          
          return (
            <React.Fragment key={slotIndex}>
                {renderTeamSlot(teamName, slotIndex)}
                {showLineAfter && (
                     <div className="py-1 flex items-center justify-center">
                       <div className="h-0.5 w-16 bg-gradient-to-r from-pink-400 via-purple-500 to-pink-400 rounded-full shadow-sm opacity-75"></div>
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
      {/* Single column layout - teams are now the main focus */}
      <div className="w-full space-y-4">
        {/* Teams Card - Full Width */}
        <Card>
          <div className="flex justify-between items-center p-3 border-b border-gray-200">
            <h2 className="font-bold text-slate-700 text-lg">Set Teams</h2>
            <div className="flex items-center gap-2">
              {/* Discard button - only show when there are unsaved changes */}
              {hasUnsavedChanges && (
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => {
                    setPlayers(savedPlayers);
                    setIsTeamsModified(false);
                  }}
                  className="bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-sm"
                >
                  Discard
                </Button>
              )}
              {/* Share Teams - only show when saved AND no unsaved changes */}
              {teamsSavedAt && !hasUnsavedChanges && teamsText && (
                <ShareMenu
                  text={teamsText}
                  context="teams"
                  size="sm"
                  disabled={unassigned.length > 0}
                />
              )}
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setIsBalanceModalOpen(true)} 
                disabled={isBalancing}
                className="shadow-soft-sm"
              >
                {isBalancing ? 'Balancing...' : 'Re-Balance'}
              </Button>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            {renderTeamColumn('A')}
            {renderTeamColumn('B')}
          </div>
        </Card>

        {/* TornadoChart - Ability Balance Analysis */}
        {balanceMethod === 'ability' && teamStatsData && balanceWeights && (
          <div className="bg-gradient-to-tl from-gray-900 to-slate-800 rounded-xl p-4">
            <TornadoChart 
              teamAStats={teamStatsData.teamAStats} 
              teamBStats={teamStatsData.teamBStats} 
              weights={balanceWeights}
              teamSize={teamSize}
              isModified={isTeamsModified}
            />
          </div>
        )}

        {/* Performance TornadoChart - Performance Balance Analysis */}
        {balanceMethod === 'performance' && performanceStatsData && (
          <div className="bg-gradient-to-tl from-gray-900 to-slate-800 rounded-xl p-4">
            <PerformanceTornadoChart 
              teamAStats={performanceStatsData.teamAStats} 
              teamBStats={performanceStatsData.teamBStats} 
              weights={performanceWeights}
              teamSize={teamSize}
              isModified={isTeamsModified}
            />
          </div>
        )}
      </div>

      <BalanceOptionsModal 
        isOpen={isBalanceModalOpen} 
        onClose={() => setIsBalanceModalOpen(false)} 
        onConfirm={handleBalanceConfirm} 
        isLoading={isBalancing}
        actualSizeA={actualSizeA}
        actualSizeB={actualSizeB}
      />
    </>
  );
});

BalanceTeamsPane.displayName = 'BalanceTeamsPane';

export default BalanceTeamsPane; 