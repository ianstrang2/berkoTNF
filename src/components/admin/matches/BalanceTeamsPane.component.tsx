'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Button from '@/components/ui-kit/Button.component';
import { PlayerInPool } from '@/types/player.types';
import Card from '@/components/ui-kit/Card.component';
import { GripVertical, Copy, Trash2 } from 'lucide-react';
import BalanceOptionsModal from './BalanceOptionsModal.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import TornadoChart from '@/components/team/TornadoChart.component';
import PerformanceTornadoChart from '@/components/team/PerformanceTornadoChart.component';
import { calculateTeamStatsFromPlayers, calculatePerformanceTeamStats } from '@/utils/teamStatsCalculation.util';
import { deriveTemplate, formationToTemplate } from '@/utils/teamFormation.util';

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
    
    // Optimistically update the UI
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

    // Send updates to the server
    try {
      if (conflictPlayer) {
        // Use atomic swap endpoint for any conflicts (either true swap or displacement to pool)
        const response = await fetch('/api/admin/upcoming-match-players/swap', {
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
        const response = await fetch('/api/admin/upcoming-match-players', {
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
  actualSizeA,
  actualSizeB,
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
  const [teamTemplateA, setTeamTemplateA] = useState<TeamTemplate | null>(null);
  const [teamTemplateB, setTeamTemplateB] = useState<TeamTemplate | null>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  
  // New state for TornadoChart integration
  const [balanceWeights, setBalanceWeights] = useState<any>(null);
  const [performanceWeightsState, setPerformanceWeightsState] = useState<any>(null);
  const [balanceMethod, setBalanceMethod] = useState<'ability' | 'performance' | 'random' | null>(null);
  const [isTeamsModified, setIsTeamsModified] = useState<boolean>(false);

  // Copy functionality states
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [teamAName, setTeamAName] = useState<string>('Team A');
  const [teamBName, setTeamBName] = useState<string>('Team B');
  const [onFirePlayerId, setOnFirePlayerId] = useState<string | null>(null);
  const [grimReaperPlayerId, setGrimReaperPlayerId] = useState<string | null>(null);
  const [showOnFireConfig, setShowOnFireConfig] = useState<boolean>(true);
  const [showGrimReaperConfig, setShowGrimReaperConfig] = useState<boolean>(true);

  useEffect(() => {
    setPlayers(initialPlayers);
  }, [initialPlayers]);

  useEffect(() => {
    const fetchTemplate = async () => {
        // Check if we have uneven teams
        const isUneven = actualSizeA && actualSizeB && actualSizeA !== actualSizeB;
        const isSimplified = actualSizeA === 4 && actualSizeB === 4;
        

        

        
        if (isUneven || isSimplified) {
            // Use derived templates for uneven teams
            const sizeA = actualSizeA || teamSize;
            const sizeB = actualSizeB || teamSize;
            
            // Only use simplified (all midfielders) for true 4v4 matches
            const formationA = deriveTemplate(sizeA, isSimplified);
            const formationB = deriveTemplate(sizeB, isSimplified);
            
            setTeamTemplateA(formationToTemplate(formationA));
            setTeamTemplateB(formationToTemplate(formationB));
            
            // For legacy compatibility, set teamTemplate to team A
            setTeamTemplate(formationToTemplate(formationA));
        } else {
            // Use database template for even teams (original behavior)
            try {
                // For even teams, use individual team size (actualSizeA or actualSizeB)
                const individualTeamSize = actualSizeA || teamSize;
                const response = await fetch(`/api/admin/team-templates?teamSize=${individualTeamSize}`);
                const result = await response.json();

                

                
                if (result.success && result.data.length > 0) {
                    const template = result.data[0];
                    setTeamTemplate(template);
                    setTeamTemplateA(template);
                    setTeamTemplateB(template);
                } else {
                    // Use appropriate fallback based on team size
                    const fallback = getFallbackTemplate(teamSize);
                    setTeamTemplate(fallback);
                    setTeamTemplateA(fallback);
                    setTeamTemplateB(fallback);
                }
            } catch (error) { 
                const fallback = getFallbackTemplate(teamSize);
                setTeamTemplate(fallback);
                setTeamTemplateA(fallback);
                setTeamTemplateB(fallback);
            }
        }
    };
    fetchTemplate();
  }, [teamSize, actualSizeA, actualSizeB]);

  // Fetch team names and special player data
  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        const [configResponse, statusResponse] = await Promise.all([
          fetch('/api/admin/app-config?group=match_settings'),
          fetch('/api/latest-player-status')
        ]);

        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.success) {
            const teamAConfig = configData.data.find((config: any) => config.config_key === 'team_a_name');
            const teamBConfig = configData.data.find((config: any) => config.config_key === 'team_b_name');
            const showOnFire = configData.data.find((config: any) => config.config_key === 'show_on_fire');
            const showGrimReaper = configData.data.find((config: any) => config.config_key === 'show_grim_reaper');
            
            if (teamAConfig?.config_value) setTeamAName(teamAConfig.config_value);
            if (teamBConfig?.config_value) setTeamBName(teamBConfig.config_value);
            setShowOnFireConfig(showOnFire?.config_value !== 'false');
            setShowGrimReaperConfig(showGrimReaper?.config_value !== 'false');
          }
        }

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          // API returns data directly, not wrapped in success/data structure
          setOnFirePlayerId(statusData.on_fire_player_id ? String(statusData.on_fire_player_id) : null);
          setGrimReaperPlayerId(statusData.grim_reaper_player_id ? String(statusData.grim_reaper_player_id) : null);
        }
      } catch (error) {
        console.error('Error fetching config data:', error);
      }
    };

    fetchConfigData();
  }, []);

  // Fetch balance weights for TornadoChart
  useEffect(() => {
    const fetchWeights = async () => {
      try {
        // Fetch rating algorithm weights
        const balanceResponse = await fetch('/api/admin/balance-algorithm');
        const balanceResult = await balanceResponse.json();
        
        if (balanceResult.success && balanceResult.data) {
          // Transform to TornadoChart format
          const formattedWeights = {
            defense: {},
            midfield: {},
            attack: {}
          };
          
          balanceResult.data.forEach((weight: any) => {
            const group = weight.description;     // ✅ Use 'description' field
            const attribute = weight.name;        // ✅ Use 'name' field
            if (group && attribute && formattedWeights[group as keyof typeof formattedWeights]) {
              formattedWeights[group as keyof typeof formattedWeights][attribute] = weight.weight;
            }
          });
          
          setBalanceWeights(formattedWeights);
        }

        // Fetch performance algorithm weights
        const performanceResponse = await fetch('/api/admin/performance-weights');
        const performanceResult = await performanceResponse.json();
        
        if (performanceResult.success && performanceResult.data) {
          setPerformanceWeightsState(performanceResult.data);
        }
        
      } catch (error) {
        console.error('Error fetching algorithm weights:', error);
      }
    };
    
    fetchWeights();
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

  const handleCopyTeams = async () => {
    if (teamA.length === 0 && teamB.length === 0) {
      onShowToast('No teams to copy.', 'error');
      return;
    }

    const formatTeam = (team: PlayerInPool[]) => {
      return team
        .map(player => {
          let playerName = player.name;
          
          if (showOnFireConfig && player.id === onFirePlayerId) {
            playerName += ' 🔥';
          }
          if (showGrimReaperConfig && player.id === grimReaperPlayerId) {
            playerName += ' 💀';
          }
          
          return playerName;
        })
        .join('\n');
    };

    const finalTeamAName = teamAName || 'Team A';
    const finalTeamBName = teamBName || 'Team B';

    const textToCopy = `--- ${finalTeamAName.toUpperCase()} ---\n${formatTeam(teamA)}\n\n--- ${finalTeamBName.toUpperCase()} ---\n${formatTeam(teamB)}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy teams: ', err);
      onShowToast('Failed to copy teams. Please try again.', 'error');
    }
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
    // Both teams use slot numbers 1-N within their team
    const actualSlotNumber = slotIndex + 1;
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
    // Use team-specific templates for uneven teams
    const currentTemplate = teamName === 'A' ? (teamTemplateA || teamTemplate) : (teamTemplateB || teamTemplate);
    
    if (!currentTemplate) return <div className="p-4"><div className="w-full h-96 bg-gray-200 animate-pulse rounded-lg"></div></div>;
    
    // Use actual team sizes if available, otherwise fall back to teamSize
    const actualTeamSize = teamName === 'A' 
      ? (actualSizeA || teamSize) 
      : (actualSizeB || teamSize);
    
    // Loop from 0 to actualTeamSize-1 to get the correct index for the slot
    const slots = Array.from({ length: actualTeamSize }, (_, i) => i);
    const { defenders, midfielders, attackers } = currentTemplate;
    

    
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

          {/* Performance TornadoChart - Desktop Only (Below Player Pool) */}
          {balanceMethod === 'performance' && performanceStatsData && (
            <div className="hidden md:block">
              <Card>
                <div className="p-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="font-bold text-slate-700 text-lg">Performance Balance Analysis</h2>
                    {isTeamsModified && (
                      <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                        ⚠️ Teams Modified
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="bg-gradient-to-tl from-gray-900 to-slate-800 rounded-xl p-4">
                    <PerformanceTornadoChart 
                      teamAStats={performanceStatsData.teamAStats} 
                      teamBStats={performanceStatsData.teamBStats} 
                      weights={performanceWeights}
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
                    <Button 
                      variant={copySuccess ? "primary" : "secondary"}
                      className={copySuccess ? "bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md" : "shadow-soft-sm"}
                      onClick={handleCopyTeams} 
                      disabled={unassigned.length > 0}
                    >
                      {copySuccess ? 'Copied!' : 'Copy'}
                    </Button>
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

      {/* Performance TornadoChart Analysis - Mobile Only (Full Width at Bottom) */}
      {balanceMethod === 'performance' && performanceStatsData && (
        <div className="md:hidden w-full mt-6">
          <Card>
            <div className="p-3 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-slate-700 text-lg">Performance Balance Analysis</h2>
                {isTeamsModified && (
                  <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                    ⚠️ Teams Modified
                  </span>
                )}
              </div>
            </div>
            <div className="p-4">
              <div className="bg-gradient-to-tl from-gray-900 to-slate-800 rounded-xl p-4">
                <PerformanceTornadoChart 
                  teamAStats={performanceStatsData.teamAStats} 
                  teamBStats={performanceStatsData.teamBStats} 
                  weights={performanceWeights}
                  teamSize={teamSize}
                  isModified={isTeamsModified}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      <BalanceOptionsModal 
        isOpen={isBalanceModalOpen} 
        onClose={() => setIsBalanceModalOpen(false)} 
        onConfirm={handleBalanceConfirm} 
        isLoading={isBalancing}
        actualSizeA={actualSizeA}
        actualSizeB={actualSizeB}
      />
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