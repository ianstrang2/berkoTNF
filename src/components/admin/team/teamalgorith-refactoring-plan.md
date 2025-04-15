# TeamAlgorithm Component Refactoring Plan

## Overview

This document outlines a comprehensive, incremental refactoring plan for the TeamAlgorithm component. The goal is to improve performance, usability, and code organization while preserving 100% of the existing functionality and business logic.

## Key Principles

1. **Preserve ALL existing business logic**
2. **Make incremental changes** that can be tested at each step
3. **No file deletion** - only create new files and modify existing ones
4. **Maintain backward compatibility** with all API endpoints
5. **Keep the slot-based player assignment system** intact

## Current Component Analysis

The current TeamAlgorithm component:
- Manages team creation and balancing for football/soccer teams
- Uses a slot-based system (slots 1-9 for Orange team, 10-18 for Green team)
- Allows manual player assignment and automatic team balancing
- Includes position-specific assignments (defenders, midfielders, attackers)
- Supports drag-and-drop player movement between slots
- Calculates and displays team balance metrics
- Interacts with several API endpoints for data persistence

## Phase 1: Extract Types (Non-Destructive)

### Create a new file: `types/team-algorithm.types.ts`

Move all TypeScript interfaces to this file:
- Player
- PlayerSlotProps
- Slot
- TeamStructure
- SlotInfo
- TeamCharacteristics
- WarningMessage
- PositionGroup
- Match
- RingerForm
- NewMatchData
- StatBarProps
- Stats

**Important**: Do not delete any types from the original file yet. This allows for a non-destructive transition.

## Phase 2: Extract Constants (Non-Destructive)

### Create a new file: `constants/team-algorithm.constants.ts`

Move constant values to this file:
- TEAM_STRUCTURE
- INITIAL_SLOTS
- Any other hardcoded constants

Again, keep the original constants in place for now.

## Phase 3: Extract Helper Functions (Non-Destructive)

### Create a new file: `utils/team-algorithm.utils.ts`

Move pure helper functions:
- formatDateSafely
- getSlotInfo
- getWarningMessage
- calculateTeamResilience
- calculateTeamCharacteristics
- getCurrentDateString
- createCopyModal
- determinePositionGroups

Leave the original functions in place for compatibility.

## Phase 4: Create Smaller UI Components

### Create: `components/team/PlayerSlot.tsx`

Extract the PlayerSlot component:
```typescript
import React from 'react';
import { Player, PlayerSlotProps } from '@/types/team-algorithm.types';

const PlayerSlot: React.FC<PlayerSlotProps> = ({ 
  slotNumber, 
  player, 
  players, 
  onSelect, 
  disabled, 
  stats, 
  position, 
  highlighted 
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-neutral-500 w-6">•</span>
      <select
        value={player?.id || ''}
        onChange={(e) => onSelect(slotNumber, e.target.value)}
        className="flex-1 rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        disabled={disabled}
      >
        <option value="">Select player</option>
        {players.map(p => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PlayerSlot;

Create: components/team/StatBar.tsx
Extract the StatBar component:

import React from 'react';
import { StatBarProps } from '@/types/team-algorithm.types';

const StatBar: React.FC<StatBarProps> = ({ 
  label, 
  value, 
  maxValue = 5, 
  color = 'green' 
}) => {
  const percentage = (value / maxValue) * 100;
  const colorClasses: Record<string, string> = {
    green: 'bg-green-500',
    orange: 'bg-orange-500'
  };
  
  return (
    <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
      <span className="text-xs sm:text-sm text-neutral-700 w-16 sm:w-20">{label}</span>
      <div className="flex-1 bg-neutral-200 h-4 sm:h-6 rounded-md overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <span className="text-xs sm:text-sm text-neutral-700 w-10 sm:w-12 text-right">{value.toFixed(1)}</span>
    </div>
  );
};

export default StatBar;

Create: components/team/PlayerPool.tsx
Create a new component for player selection:
import React from 'react';
import { Player } from '@/types/team-algorithm.types';

interface PlayerPoolProps {
  allPlayers: Player[];
  selectedPlayers: Player[];
  onTogglePlayer: (player: Player) => void;
  teamSize: number;
  onBalanceTeams: () => void;
  isBalancing: boolean;
}

const PlayerPool: React.FC<PlayerPoolProps> = ({
  allPlayers,
  selectedPlayers,
  onTogglePlayer,
  teamSize,
  onBalanceTeams,
  isBalancing
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  // Filter players based on search
  const filteredPlayers = allPlayers
    .filter(player => player.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const exactPlayerCount = teamSize * 2;
  const isBalanceEnabled = selectedPlayers.length === exactPlayerCount && !isBalancing;
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-xl font-bold mb-3">Player Pool</h2>
      
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>
      
      {/* Selected count and button */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium">
          {selectedPlayers.length} of {exactPlayerCount} players needed
        </span>
        
        <button 
          onClick={onBalanceTeams}
          className={`px-4 py-2 rounded-md text-white
            ${isBalanceEnabled
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-gray-400 cursor-not-allowed'}`}
          disabled={!isBalanceEnabled}
        >
          {isBalancing ? 'Balancing...' : 'Balance Teams'}
        </button>
      </div>
      
      {/* Player list */}
      <div className="border rounded-md max-h-80 overflow-y-auto">
        {filteredPlayers.map(player => (
          <div 
            key={player.id}
            onClick={() => onTogglePlayer(player)}
            className={`flex items-center px-4 py-2 border-b cursor-pointer hover:bg-gray-50
              ${selectedPlayers.some(p => p.id === player.id) 
                ? 'bg-blue-50' 
                : 'bg-white'}`}
          >
            <input
              type="checkbox"
              checked={selectedPlayers.some(p => p.id === player.id)}
              onChange={() => {}}
              className="mr-3"
            />
            <span className="flex-grow">{player.name}</span>
            
            {/* Player stats summary */}
            <span className="text-xs text-gray-500">
              G:{player.goalscoring || 3} D:{player.defending || 3} S:{player.stamina_pace || 3}
            </span>
          </div>
        ))}
      </div>
      
      {/* Helper text */}
      {selectedPlayers.length !== exactPlayerCount && (
        <p className="text-sm text-orange-600 mt-2">
          You need exactly {exactPlayerCount} players to balance teams.
          {selectedPlayers.length > exactPlayerCount ? 
            ` Please remove ${selectedPlayers.length - exactPlayerCount} players.` : 
            ` Please add ${exactPlayerCount - selectedPlayers.length} more players.`}
        </p>
      )}
    </div>
  );
};

export default PlayerPool;

Create: components/team/TeamSection.tsx
Extract the team display logic:

import React from 'react';
import { Player, Slot, PositionGroup } from '@/types/team-algorithm.types';
import DraggablePlayerSlot from './DraggablePlayerSlot.component';

interface TeamSectionProps {
  teamType: 'a' | 'b';
  slots: Slot[];
  players: Player[];
  positionGroups: PositionGroup[];
  onSelect: (slotIndex: number, playerId: string) => Promise<void>;
  onDragStart: (slotNumber: number, player: Player) => void;
  onDragOver: (e: React.DragEvent, slotNumber: number) => void;
  onDrop: (e: React.DragEvent, slotNumber: number) => void;
  onTap: (slotNumber: number) => void;
  isLoading: boolean;
  highlightedSlot: number | null;
  selectedSlot: number | null;
  getAvailablePlayers: (slot: Slot) => Player[];
}

const TeamSection: React.FC<TeamSectionProps> = ({
  teamType,
  slots,
  players,
  positionGroups,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onTap,
  isLoading,
  highlightedSlot,
  selectedSlot,
  getAvailablePlayers
}) => {
  const teamClass = teamType === 'a' ? 'text-orange-600' : 'text-emerald-600';
  const teamName = teamType === 'a' ? 'Orange' : 'Green';
  const playerIdPrefix = teamType === 'a' ? 'teamA-player-' : 'teamB-player-';
  
  const getPositionFromSlot = (slotNumber: number): string => {
    if (slotNumber <= 3 || (slotNumber >= 10 && slotNumber <= 12)) return 'defender';
    if (slotNumber <= 7 || (slotNumber >= 13 && slotNumber <= 16)) return 'midfielder';
    return 'attacker';
  };
  
  const getPlayerStats = (player: Player | undefined, role: string): string => {
    if (!player) return '';
    
    switch (role) {
      case 'defender':
        return `G:${player.goalscoring} | S&P:${player.stamina_pace} | C:${player.control}`;
      case 'midfielder':
        return `C:${player.control} | S&P:${player.stamina_pace} | G:${player.goalscoring}`;
      case 'attacker':
        return `G:${player.goalscoring} | S&P:${player.stamina_pace} | C:${player.control}`;
      default:
        return '';
    }
  };
  
  return (
    <div className="mb-4">
      <h3 className={`text-xl font-bold ${teamClass}`}>{teamName}</h3>
      
      {positionGroups.map((group) => {
        const positionSlots = slots.filter(
          slot => slot.slot_number >= group.startSlot && slot.slot_number <= group.endSlot
        );
        
        const assignedSlots = positionSlots.filter(slot => slot.player_id !== null);
        
        return (
          <div key={`${teamType}-${group.position}`} className="my-2 p-2 bg-white rounded-md shadow">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-md">{group.title}</h4>
              {assignedSlots.length > 0 && (
                <div className="text-sm text-neutral-500">
                  {assignedSlots.length}/{positionSlots.length}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {positionSlots.map(slot => {
                const player = players.find(p => p.id === slot.player_id);
                const position = getPositionFromSlot(slot.slot_number);
                const playerStats = getPlayerStats(player, position);
                const availablePlayers = getAvailablePlayers(slot);
                
                return (
                  <DraggablePlayerSlot
                    key={`${playerIdPrefix}${slot.slot_number}`}
                    slotNumber={slot.slot_number}
                    player={player}
                    players={availablePlayers}
                    onSelect={onSelect}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onTap={onTap}
                    disabled={isLoading}
                    stats={playerStats}
                    position={position}
                    highlighted={highlightedSlot === slot.slot_number || selectedSlot === slot.slot_number}
                    teamColor={teamType === 'a' ? 'orange' : 'green'}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TeamSection;

Create: components/team/TeamStats.tsx
Extract the team stats display:

import React from 'react';
import StatBar from './StatBar';

interface TeamStatsProps {
  teamType: 'a' | 'b';
  stats: {
    playerCount: number;
    goalscoring: number;
    defending: number;
    stamina_pace: number;
    control: number;
    teamwork: number;
    resilience: number;
  } | null;
}

const TeamStats: React.FC<TeamStatsProps> = ({ teamType, stats }) => {
  if (!stats) return null;
  
  const teamColor = teamType === 'a' ? 'orange' : 'green';
  const teamName = teamType === 'a' ? 'Team Orange' : 'Team Green';
  
  return (
    <div className="bg-white rounded-md shadow p-3 mb-4">
      <h3 className={`text-lg font-bold ${teamType === 'a' ? 'text-orange-600' : 'text-emerald-600'}`}>
        {teamName} ({stats.playerCount} players)
      </h3>
      <div className="mt-2">
        <StatBar label="Goalscoring" value={stats.goalscoring} color={teamColor} />
        <StatBar label="Defending" value={stats.defending} color={teamColor} />
        <StatBar label="Stamina/Pace" value={stats.stamina_pace} color={teamColor} />
        <StatBar label="Control" value={stats.control} color={teamColor} />
        <StatBar label="Teamwork" value={stats.teamwork} color={teamColor} />
        <StatBar label="Resilience" value={stats.resilience} color={teamColor} />
      </div>
    </div>
  );
};

export default TeamStats;

Create: components/team/ComparativeStats.tsx
Extract the comparative stats display:

import React from 'react';
import { Stats } from '@/types/team-algorithm.types';

interface ComparativeStatsProps {
  stats: Stats | null;
}

const ComparativeStats: React.FC<ComparativeStatsProps> = ({ stats }) => {
  if (!stats) return null;
  
  const { diffs, balanceScore, balanceQuality } = stats;
  
  const qualityColorClass = 
    balanceQuality === 'Excellent' ? 'text-emerald-600' :
    balanceQuality === 'Good' ? 'text-blue-600' :
    balanceQuality === 'Fair' ? 'text-amber-600' : 'text-red-600';
  
  const getBalanceColor = (score: number) => {
    if (score <= 0.3) return "bg-emerald-500";
    if (score <= 0.6) return "bg-blue-500";
    if (score <= 0.9) return "bg-amber-500";
    return "bg-red-500";
  };
  
  return (
    <div className="bg-white rounded-md shadow p-3 mt-4">
      <h3 className="text-lg font-bold text-neutral-800">Team Balance Analysis</h3>
      
      <div className="mb-2 mt-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-neutral-700">Balance Quality:</span>
          <span className={`font-semibold ${qualityColorClass}`}>
            {balanceQuality}
          </span>
        </div>
        
        <div className="relative h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full ${getBalanceColor(balanceScore)}`}
            style={{ 
              width: `${Math.max(0, 100 - (balanceScore * 100))}%`,
              transition: 'width 0.5s ease-out'
            }}
          />
        </div>
      </div>
      
      <div className="mt-3">
        <div className="text-sm text-neutral-600 mb-1">Attribute Differences:</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(diffs).map(([key, value]) => {
            const label = key.charAt(0).toUpperCase() + key.replace('_', '/').slice(1);
            const diffClass = 
              value <= 0.3 ? 'text-emerald-600' :
              value <= 0.6 ? 'text-blue-600' :
              value <= 0.9 ? 'text-amber-600' : 'text-red-600';
            
            return (
              <div key={key} className="flex justify-between">
                <span className="text-sm">{label}:</span>
                <span className={`text-sm font-medium ${diffClass}`}>{value.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ComparativeStats;

Phase 5: Create Custom Hooks
Create: hooks/useMatchState.ts
Extract the core match state logic:

import { useState, useCallback, useEffect } from 'react';
import { Player, Slot, Match } from '@/types/team-algorithm.types';
import { TeamBalanceService } from '@/services/TeamBalanceService';
import { INITIAL_SLOTS } from '@/constants/team-algorithm.constants';

export const useMatchState = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentSlots, setCurrentSlots] = useState<Slot[]>(INITIAL_SLOTS);
  const [isBalanced, setIsBalanced] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [usingPlannedMatch, setUsingPlannedMatch] = useState<boolean>(false);
  
  // Refreshes match data from the server
  const refreshMatchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch updated match data
      const matchResponse = await fetch('/api/admin/upcoming-matches?active=true');
      
      if (!matchResponse.ok) {
        const responseText = await matchResponse.text();
        console.error(`Error fetching match data (${matchResponse.status}): ${responseText}`);
        throw new Error(`Failed to fetch updated match: ${matchResponse.status} ${responseText.substring(0, 100)}`);
      }
      
      const matchData = await matchResponse.json();
      
      if (!matchData.success || !matchData.data) {
        console.error('No active match data found:', matchData);
        // Clear active match if none found
        setActiveMatch(null);
        setCurrentSlots([]);
        setIsBalanced(false);
        setUsingPlannedMatch(false);
        return;
      }
      
      // Extract and process match data
      // [Include existing implementation details here]
      
    } catch (error) {
      console.error('Error refreshing match data:', error);
      setError(`Failed to refresh match data: ${error instanceof Error ? error.message : String(error)}`);
      
      // Keep the UI in a usable state
      setCurrentSlots(prevSlots => prevSlots.length > 0 ? prevSlots : []);
      setUsingPlannedMatch(false);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch players
        const playersResponse = await fetch(`/api/admin/players?t=${Date.now()}`);
        if (!playersResponse.ok) throw new Error('Failed to fetch players');
        const playersData = await playersResponse.json();
        if (!playersData.success) throw new Error(playersData.error || 'Failed to fetch players');
        
        // Process players
        const sortedPlayers = playersData.data
          .filter((p: any) => !p.is_retired)
          .map((p: any) => ({
            id: p.player_id,
            ...p
          }))
          .sort((a: Player, b: Player) => a.name.localeCompare(b.name));
        
        setPlayers(sortedPlayers);
        
        // Check for active match
        // [Include existing implementation details here]
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(`Failed to load data: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [refreshMatchData]);
  
  // Handle player selection
  const handlePlayerSelect = async (slotIndex: number, playerId: string) => {
    try {
      setError(null);
      
      // Get the correct match ID (prioritize upcoming_match_id)
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      
      if (!matchId) {
        throw new Error('No active match selected');
      }
      
      // [Include existing implementation details here]
      
    } catch (error) {
      console.error('Error selecting player:', error);
      setError(`Failed to update player assignment: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Balance teams
  const handleBalanceTeams = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the correct match ID
      const matchId = activeMatch?.upcoming_match_id || activeMatch?.match_id;
      
      if (!matchId) {
        throw new Error('No active match selected');
      }
      
      // Count players assigned
      const assignedPlayerCount = currentSlots.filter(slot => slot.player_id !== null).length;
      
      if (assignedPlayerCount < 2) {
        throw new Error('Please assign at least 2 players before balancing');
      }
      
      // Use the TeamBalanceService
      await TeamBalanceService.balanceTeams(matchId);
      
      // Mark as balanced
      setIsBalanced(true);
      
      // Refresh data
      await refreshMatchData();
      
    } catch (error) {
      console.error('Error balancing teams:', error);
      setError(`Failed to balance teams: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle drag and drop
  const [draggedItem, setDraggedItem] = useState<{ slotNumber: number, player: Player } | null>(null);
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  
  const handleDragStart = (slotNumber: number, player: Player) => {
    setDraggedItem({ slotNumber, player });
  };
  
  const handleDragOver = (e: React.DragEvent, slotNumber: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHighlightedSlot(slotNumber);
  };
  
  const handleDrop = async (e: React.DragEvent, targetSlotNumber: number) => {
    // [Include existing implementation details here]
  };
  
  const handleSlotTap = async (slotNumber: number) => {
    // [Include existing implementation details here]
  };
  
  // Available players helper
  const getAvailablePlayers = useCallback((currentSlot: Slot): Player[] => {
    if (!players.length) return [];
    
    // Get IDs of players assigned to other slots
    const takenPlayerIds = new Set(
      currentSlots
        .filter(s => s.slot_number !== currentSlot.slot_number && s.player_id !== null)
        .map(s => s.player_id)
    );

    // Get current player in this slot
    const currentPlayerId = currentSlots.find(s => s.slot_number === currentSlot.slot_number)?.player_id;

    // Return available players (only unassigned + current player in this slot)
    return players
      .filter(p => !takenPlayerIds.has(p.id) || p.id === currentPlayerId)
      .sort((a, b) => {
        if (a.id === currentPlayerId) return -1; // Current player first
        if (b.id === currentPlayerId) return 1;
        return a.name.localeCompare(b.name); // Then alphabetical
      });
  }, [players, currentSlots]);
  
  return {
    // State
    players,
    currentSlots,
    isBalanced,
    isLoading,
    error,
    activeMatch,
    usingPlannedMatch,
    draggedItem,
    highlightedSlot,
    selectedSlot,
    
    // Actions
    setCurrentSlots,
    setIsBalanced,
    setError,
    setDraggedItem,
    setHighlightedSlot,
    setSelectedSlot,
    
    // Handler functions
    refreshMatchData,
    handlePlayerSelect,
    handleBalanceTeams,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleSlotTap,
    getAvailablePlayers
  };
};

Phase 6: Create the Refactored Main Component
Create: components/team/NewTeamAlgorithm.tsx
Create a refactored version of the main component:

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMatchState } from '@/hooks/useMatchState';
import PlayerPool from './PlayerPool';
import TeamSection from './TeamSection';
import TeamStats from './TeamStats';
import ComparativeStats from './ComparativeStats';
import { TeamBalanceService } from '@/services/TeamBalanceService';
import { Player } from '@/types/team-algorithm.types';

// Import constants
import { TEAM_STRUCTURE } from '@/constants/team-algorithm.constants';

const NewTeamAlgorithm: React.FC = () => {
  // Use our custom hook
  const {
    players,
    currentSlots,
    isBalanced,
    isLoading,
    error,
    activeMatch,
    usingPlannedMatch,
    draggedItem,
    highlightedSlot,
    selectedSlot,
    refreshMatchData,
    handlePlayerSelect,
    handleBalanceTeams,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleSlotTap,
    getAvailablePlayers
  } = useMatchState();
  
  // Local state for selected players in the pool
  const [selectedPoolPlayers, setSelectedPoolPlayers] = useState<Player[]>([]);
  
  // Format teams for copying
  const formatTeamsForCopy = () => {
    const formatTeam = (teamSlots: typeof currentSlots) => {
      return teamSlots
        .filter(slot => slot.player_id)
        .map(slot => {
          const player = players.find(p => p.id === slot.player_id);
          return player ? player.name : '';
        })
        .filter(name => name)
        .sort()
        .join('\n');
    };

    const teamASlots = currentSlots.filter(s => s.slot_number <= 9);
    const teamBSlots = currentSlots.filter(s => s.slot_number > 9);

    return `Orange\n${formatTeam(teamASlots)}\n\nGreen\n${formatTeam(teamBSlots)}`;
  };
  
  // Handle copying teams
  const handleCopyTeams = async () => {
    try {
      const teams = formatTeamsForCopy();
      
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(teams);
      } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = teams;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err);
          throw new Error('Failed to copy text');
        } finally {
          textArea.remove();
        }
      }
      
      // Show success notification
      // [Include implementation]
      
    } catch (error) {
      console.error('Failed to copy teams:', error);
      // Show error
      // [Include implementation]
    }
  };
  
  // Handle clearing slots
  const handleClearSlots = async () => {
    try {
      // [// Handle clearing slots
  const handleClearSlots = async () => {
    try {
      if (!activeMatch) {
        // Just clear the local state if no active match
        const clearedSlots = currentSlots.map(slot => ({ ...slot, player_id: null }));
        setCurrentSlots(clearedSlots);
        setIsBalanced(false);
        return;
      }
      
      const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
      
      // Call API to clear slots
      const response = await fetch(`/api/admin/upcoming-match-players/clear?matchId=${matchId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear slots');
      }
      
      // Refresh match data to get updated state
      refreshMatchData();
      
    } catch (error) {
      console.error('Error clearing slots:', error);
      setError(`Failed to clear slots: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Handle toggling a player in the pool
  const handleTogglePoolPlayer = (player: Player) => {
    setSelectedPoolPlayers(prev => {
      const isSelected = prev.some(p => p.id === player.id);
      if (isSelected) {
        return prev.filter(p => p.id !== player.id);
      } else {
        return [...prev, player];
      }
    });
  };
  
  // Handle assigning pool players to teams
  const handleAssignPoolPlayers = async () => {
    if (selectedPoolPlayers.length === 0 || !activeMatch) return;
    
    try {
      const teamSize = activeMatch.team_size || 9;
      let assignedCount = 0;
      
      // Get free slots
      const orangeFreeSlots = currentSlots
        .filter(s => s.slot_number <= teamSize && s.player_id === null)
        .sort((a, b) => a.slot_number - b.slot_number);
        
      const greenFreeSlots = currentSlots
        .filter(s => s.slot_number > teamSize && s.player_id === null)
        .sort((a, b) => a.slot_number - b.slot_number);
      
      // Assign evenly to both teams
      const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
      
      for (const player of selectedPoolPlayers) {
        // Alternate between teams
        const targetSlot = assignedCount % 2 === 0 && orangeFreeSlots.length > 0
          ? orangeFreeSlots.shift()
          : greenFreeSlots.shift();
        
        if (!targetSlot) break;
        
        // Assign player to slot
        await fetch('/api/admin/upcoming-match-players', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            upcoming_match_id: matchId,
            player_id: player.id,
            team: targetSlot.slot_number <= teamSize ? 'A' : 'B',
            slot_number: targetSlot.slot_number
          })
        });
        
        assignedCount++;
      }
      
      // Clear selection and refresh
      setSelectedPoolPlayers([]);
      refreshMatchData();
      
    } catch (error) {
      console.error('Error assigning players:', error);
      setError(`Failed to assign players: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Position group calculations
  const determinePositionGroups = useCallback((teamSize: number, team: string): any[] => {
    const isOrange = team.toLowerCase() === 'orange';
    const startingSlot = isOrange ? 1 : teamSize + 1;
    
    // Adjust position distribution based on team size
    let positions = [];
    
    if (teamSize <= 5) {
      // 5-a-side: 2 defenders, 2 midfielders, 1 attacker
      positions = [
        { 
          title: 'Defenders', 
          slots: [startingSlot, startingSlot + 1],
          position: 'Defenders',
          startSlot: startingSlot,
          endSlot: startingSlot + 1
        },
        { 
          title: 'Midfielders', 
          slots: [startingSlot + 2, startingSlot + 3],
          position: 'Midfielders',
          startSlot: startingSlot + 2,
          endSlot: startingSlot + 3
        },
        { 
          title: 'Attackers', 
          slots: [startingSlot + 4],
          position: 'Attackers',
          startSlot: startingSlot + 4,
          endSlot: startingSlot + 4
        }
      ];
    } else if (teamSize <= 7) {
      // 6/7-a-side: 2 defenders, 3 midfielders, 2 attackers
      const attackerCount = Math.max(0, teamSize - 5);
      const attackerSlots = Array.from({ length: attackerCount }, (_, i) => startingSlot + 5 + i);
      positions = [
        { 
          title: 'Defenders', 
          slots: [startingSlot, startingSlot + 1],
          position: 'Defenders',
          startSlot: startingSlot,
          endSlot: startingSlot + 1
        },
        { 
          title: 'Midfielders', 
          slots: [startingSlot + 2, startingSlot + 3, startingSlot + 4],
          position: 'Midfielders',
          startSlot: startingSlot + 2,
          endSlot: startingSlot + 4
        },
        { 
          title: 'Attackers', 
          slots: attackerSlots,
          position: 'Attackers',
          startSlot: startingSlot + 5,
          endSlot: startingSlot + teamSize - 1
        }
      ];
    } else if (teamSize <= 9) {
      // 8/9-a-side: 3 defenders, 4 midfielders, 2 attackers
      const attackerCount = Math.max(0, teamSize - 7);
      const attackerSlots = Array.from({ length: attackerCount }, (_, i) => startingSlot + 7 + i);
      positions = [
        { 
          title: 'Defenders', 
          slots: [startingSlot, startingSlot + 1, startingSlot + 2],
          position: 'Defenders',
          startSlot: startingSlot,
          endSlot: startingSlot + 2
        },
        { 
          title: 'Midfielders', 
          slots: [startingSlot + 3, startingSlot + 4, startingSlot + 5, startingSlot + 6],
          position: 'Midfielders',
          startSlot: startingSlot + 3,
          endSlot: startingSlot + 6
        },
        { 
          title: 'Attackers', 
          slots: attackerSlots,
          position: 'Attackers',
          startSlot: startingSlot + 7,
          endSlot: startingSlot + teamSize - 1
        }
      ];
    } else {
      // 10/11-a-side: 4 defenders, 4 midfielders, 3 attackers
      const attackerCount = Math.max(0, teamSize - 8);
      const attackerSlots = Array.from({ length: attackerCount }, (_, i) => startingSlot + 8 + i);
      positions = [
        { 
          title: 'Defenders', 
          slots: [startingSlot, startingSlot + 1, startingSlot + 2, startingSlot + 3],
          position: 'Defenders',
          startSlot: startingSlot,
          endSlot: startingSlot + 3
        },
        { 
          title: 'Midfielders', 
          slots: [startingSlot + 4, startingSlot + 5, startingSlot + 6, startingSlot + 7],
          position: 'Midfielders',
          startSlot: startingSlot + 4,
          endSlot: startingSlot + 7
        },
        { 
          title: 'Attackers', 
          slots: attackerSlots,
          position: 'Attackers',
          startSlot: startingSlot + 8,
          endSlot: startingSlot + teamSize - 1
        }
      ];
    }
    
    return positions;
  }, []);
  
  // Create memoized position groups
  const orangePositionGroups = useMemo(() => {
    return activeMatch ? determinePositionGroups(activeMatch.team_size, 'orange') : [];
  }, [activeMatch, determinePositionGroups]);

  const greenPositionGroups = useMemo(() => {
    return activeMatch ? determinePositionGroups(activeMatch.team_size, 'green') : [];
  }, [activeMatch, determinePositionGroups]);
  
  // Calculate team statistics
  const calculateTeamStats = (teamSlots: typeof currentSlots) => {
    return TeamBalanceService.calculateTeamStats(teamSlots, players);
  };
  
  // Calculate comparative statistics
  const calculateComparativeStats = () => {
    const teamASlots = currentSlots.filter(s => s.slot_number <= 9);
    const teamBSlots = currentSlots.filter(s => s.slot_number > 9);
    
    return TeamBalanceService.calculateComparativeStats(teamASlots, teamBSlots, players);
  };
  
  // Memoized team stats
  const orangeTeamStats = useMemo(() => {
    const teamSlots = currentSlots.filter(s => s.slot_number <= 9);
    return calculateTeamStats(teamSlots);
  }, [currentSlots, players]);
  
  const greenTeamStats = useMemo(() => {
    const teamSlots = currentSlots.filter(s => s.slot_number > 9);
    return calculateTeamStats(teamSlots);
  }, [currentSlots, players]);
  
  // Memoized comparative stats
  const comparativeStats = useMemo(() => {
    return calculateComparativeStats();
  }, [currentSlots, players]);
  
  return (
    <div className="flex flex-col max-w-7xl">
      {/* Main content area */}
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6">
        {/* Header information */}
        {activeMatch && (
          <div className="p-4 border-b">
            <div className="text-lg font-semibold">
              Match: {formatDateSafely(activeMatch.match_date)}
            </div>
            <div className="text-sm text-gray-600">
              Format: {activeMatch.team_size}v{activeMatch.team_size}
            </div>
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <div className="m-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="p-4 flex flex-wrap gap-2">
          <button 
            onClick={handleClearSlots}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
          >
            Clear
          </button>
          
          <button 
            onClick={handleCopyTeams}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
          >
            Copy
          </button>
          
          <button 
            onClick={() => {/* Open create player modal */}}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
          >
            Create Player
          </button>
          
          <button 
            onClick={handleBalanceTeams}
            disabled={isLoading}
            className={`px-4 py-2 rounded text-white ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            Balance
          </button>
        </div>
        
        {/* Player pool */}
        <PlayerPool 
          allPlayers={players}
          selectedPlayers={selectedPoolPlayers}
          onTogglePlayer={handleTogglePoolPlayer}
          teamSize={activeMatch?.team_size || 9}
          onBalanceTeams={handleAssignPoolPlayers}
          isBalancing={isLoading}
        />
        
        {/* Teams display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
          {/* Orange Team */}
          <div>
            <TeamSection 
              teamType="a"
              slots={currentSlots.filter(s => s.slot_number <= (activeMatch?.team_size || 9))}
              players={players}
              positionGroups={orangePositionGroups}
              onSelect={handlePlayerSelect}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTap={handleSlotTap}
              isLoading={isLoading}
              highlightedSlot={highlightedSlot}
              selectedSlot={selectedSlot}
              getAvailablePlayers={getAvailablePlayers}
            />
            
            {orangeTeamStats && (
              <TeamStats teamType="a" stats={orangeTeamStats} />
            )}
          </div>
          
          {/* Green Team */}
          <div>
            <TeamSection 
              teamType="b"
              slots={currentSlots.filter(s => s.slot_number > (activeMatch?.team_size || 9))}
              players={players}
              positionGroups={greenPositionGroups}
              onSelect={handlePlayerSelect}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTap={handleSlotTap}
              isLoading={isLoading}
              highlightedSlot={highlightedSlot}
              selectedSlot={selectedSlot}
              getAvailablePlayers={getAvailablePlayers}
            />
            
            {greenTeamStats && (
              <TeamStats teamType="b" stats={greenTeamStats} />
            )}
          </div>
        </div>
        
        {/* Comparative stats */}
        {comparativeStats && (
          <div className="p-4">
            <ComparativeStats stats={comparativeStats} />
          </div>
        )}
      </div>
    </div>
  );
};

export default NewTeamAlgorithm;

Continuing with the detailed TeamAlgorithm refactoring plan:
markdown  // Handle clearing slots
  const handleClearSlots = async () => {
    try {
      if (!activeMatch) {
        // Just clear the local state if no active match
        const clearedSlots = currentSlots.map(slot => ({ ...slot, player_id: null }));
        setCurrentSlots(clearedSlots);
        setIsBalanced(false);
        return;
      }
      
      const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
      
      // Call API to clear slots
      const response = await fetch(`/api/admin/upcoming-match-players/clear?matchId=${matchId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear slots');
      }
      
      // Refresh match data to get updated state
      refreshMatchData();
      
    } catch (error) {
      console.error('Error clearing slots:', error);
      setError(`Failed to clear slots: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Handle toggling a player in the pool
  const handleTogglePoolPlayer = (player: Player) => {
    setSelectedPoolPlayers(prev => {
      const isSelected = prev.some(p => p.id === player.id);
      if (isSelected) {
        return prev.filter(p => p.id !== player.id);
      } else {
        return [...prev, player];
      }
    });
  };
  
  // Handle assigning pool players to teams
  const handleAssignPoolPlayers = async () => {
    if (selectedPoolPlayers.length === 0 || !activeMatch) return;
    
    try {
      const teamSize = activeMatch.team_size || 9;
      let assignedCount = 0;
      
      // Get free slots
      const orangeFreeSlots = currentSlots
        .filter(s => s.slot_number <= teamSize && s.player_id === null)
        .sort((a, b) => a.slot_number - b.slot_number);
        
      const greenFreeSlots = currentSlots
        .filter(s => s.slot_number > teamSize && s.player_id === null)
        .sort((a, b) => a.slot_number - b.slot_number);
      
      // Assign evenly to both teams
      const matchId = activeMatch.upcoming_match_id || activeMatch.match_id;
      
      for (const player of selectedPoolPlayers) {
        // Alternate between teams
        const targetSlot = assignedCount % 2 === 0 && orangeFreeSlots.length > 0
          ? orangeFreeSlots.shift()
          : greenFreeSlots.shift();
        
        if (!targetSlot) break;
        
        // Assign player to slot
        await fetch('/api/admin/upcoming-match-players', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            upcoming_match_id: matchId,
            player_id: player.id,
            team: targetSlot.slot_number <= teamSize ? 'A' : 'B',
            slot_number: targetSlot.slot_number
          })
        });
        
        assignedCount++;
      }
      
      // Clear selection and refresh
      setSelectedPoolPlayers([]);
      refreshMatchData();
      
    } catch (error) {
      console.error('Error assigning players:', error);
      setError(`Failed to assign players: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Position group calculations
  const determinePositionGroups = useCallback((teamSize: number, team: string): any[] => {
    const isOrange = team.toLowerCase() === 'orange';
    const startingSlot = isOrange ? 1 : teamSize + 1;
    
    // Adjust position distribution based on team size
    let positions = [];
    
    if (teamSize <= 5) {
      // 5-a-side: 2 defenders, 2 midfielders, 1 attacker
      positions = [
        { 
          title: 'Defenders', 
          slots: [startingSlot, startingSlot + 1],
          position: 'Defenders',
          startSlot: startingSlot,
          endSlot: startingSlot + 1
        },
        { 
          title: 'Midfielders', 
          slots: [startingSlot + 2, startingSlot + 3],
          position: 'Midfielders',
          startSlot: startingSlot + 2,
          endSlot: startingSlot + 3
        },
        { 
          title: 'Attackers', 
          slots: [startingSlot + 4],
          position: 'Attackers',
          startSlot: startingSlot + 4,
          endSlot: startingSlot + 4
        }
      ];
    } else if (teamSize <= 7) {
      // 6/7-a-side: 2 defenders, 3 midfielders, 2 attackers
      const attackerCount = Math.max(0, teamSize - 5);
      const attackerSlots = Array.from({ length: attackerCount }, (_, i) => startingSlot + 5 + i);
      positions = [
        { 
          title: 'Defenders', 
          slots: [startingSlot, startingSlot + 1],
          position: 'Defenders',
          startSlot: startingSlot,
          endSlot: startingSlot + 1
        },
        { 
          title: 'Midfielders', 
          slots: [startingSlot + 2, startingSlot + 3, startingSlot + 4],
          position: 'Midfielders',
          startSlot: startingSlot + 2,
          endSlot: startingSlot + 4
        },
        { 
          title: 'Attackers', 
          slots: attackerSlots,
          position: 'Attackers',
          startSlot: startingSlot + 5,
          endSlot: startingSlot + teamSize - 1
        }
      ];
    } else if (teamSize <= 9) {
      // 8/9-a-side: 3 defenders, 4 midfielders, 2 attackers
      const attackerCount = Math.max(0, teamSize - 7);
      const attackerSlots = Array.from({ length: attackerCount }, (_, i) => startingSlot + 7 + i);
      positions = [
        { 
          title: 'Defenders', 
          slots: [startingSlot, startingSlot + 1, startingSlot + 2],
          position: 'Defenders',
          startSlot: startingSlot,
          endSlot: startingSlot + 2
        },
        { 
          title: 'Midfielders', 
          slots: [startingSlot + 3, startingSlot + 4, startingSlot + 5, startingSlot + 6],
          position: 'Midfielders',
          startSlot: startingSlot + 3,
          endSlot: startingSlot + 6
        },
        { 
          title: 'Attackers', 
          slots: attackerSlots,
          position: 'Attackers',
          startSlot: startingSlot + 7,
          endSlot: startingSlot + teamSize - 1
        }
      ];
    } else {
      // 10/11-a-side: 4 defenders, 4 midfielders, 3 attackers
      const attackerCount = Math.max(0, teamSize - 8);
      const attackerSlots = Array.from({ length: attackerCount }, (_, i) => startingSlot + 8 + i);
      positions = [
        { 
          title: 'Defenders', 
          slots: [startingSlot, startingSlot + 1, startingSlot + 2, startingSlot + 3],
          position: 'Defenders',
          startSlot: startingSlot,
          endSlot: startingSlot + 3
        },
        { 
          title: 'Midfielders', 
          slots: [startingSlot + 4, startingSlot + 5, startingSlot + 6, startingSlot + 7],
          position: 'Midfielders',
          startSlot: startingSlot + 4,
          endSlot: startingSlot + 7
        },
        { 
          title: 'Attackers', 
          slots: attackerSlots,
          position: 'Attackers',
          startSlot: startingSlot + 8,
          endSlot: startingSlot + teamSize - 1
        }
      ];
    }
    
    return positions;
  }, []);
  
  // Create memoized position groups
  const orangePositionGroups = useMemo(() => {
    return activeMatch ? determinePositionGroups(activeMatch.team_size, 'orange') : [];
  }, [activeMatch, determinePositionGroups]);

  const greenPositionGroups = useMemo(() => {
    return activeMatch ? determinePositionGroups(activeMatch.team_size, 'green') : [];
  }, [activeMatch, determinePositionGroups]);
  
  // Calculate team statistics
  const calculateTeamStats = (teamSlots: typeof currentSlots) => {
    return TeamBalanceService.calculateTeamStats(teamSlots, players);
  };
  
  // Calculate comparative statistics
  const calculateComparativeStats = () => {
    const teamASlots = currentSlots.filter(s => s.slot_number <= 9);
    const teamBSlots = currentSlots.filter(s => s.slot_number > 9);
    
    return TeamBalanceService.calculateComparativeStats(teamASlots, teamBSlots, players);
  };
  
  // Memoized team stats
  const orangeTeamStats = useMemo(() => {
    const teamSlots = currentSlots.filter(s => s.slot_number <= 9);
    return calculateTeamStats(teamSlots);
  }, [currentSlots, players]);
  
  const greenTeamStats = useMemo(() => {
    const teamSlots = currentSlots.filter(s => s.slot_number > 9);
    return calculateTeamStats(teamSlots);
  }, [currentSlots, players]);
  
  // Memoized comparative stats
  const comparativeStats = useMemo(() => {
    return calculateComparativeStats();
  }, [currentSlots, players]);
  
  return (
    <div className="flex flex-col max-w-7xl">
      {/* Main content area */}
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6">
        {/* Header information */}
        {activeMatch && (
          <div className="p-4 border-b">
            <div className="text-lg font-semibold">
              Match: {formatDateSafely(activeMatch.match_date)}
            </div>
            <div className="text-sm text-gray-600">
              Format: {activeMatch.team_size}v{activeMatch.team_size}
            </div>
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <div className="m-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="p-4 flex flex-wrap gap-2">
          <button 
            onClick={handleClearSlots}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
          >
            Clear
          </button>
          
          <button 
            onClick={handleCopyTeams}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
          >
            Copy
          </button>
          
          <button 
            onClick={() => {/* Open create player modal */}}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
          >
            Create Player
          </button>
          
          <button 
            onClick={handleBalanceTeams}
            disabled={isLoading}
            className={`px-4 py-2 rounded text-white ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            Balance
          </button>
        </div>
        
        {/* Player pool */}
        <PlayerPool 
          allPlayers={players}
          selectedPlayers={selectedPoolPlayers}
          onTogglePlayer={handleTogglePoolPlayer}
          teamSize={activeMatch?.team_size || 9}
          onBalanceTeams={handleAssignPoolPlayers}
          isBalancing={isLoading}
        />
        
        {/* Teams display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
          {/* Orange Team */}
          <div>
            <TeamSection 
              teamType="a"
              slots={currentSlots.filter(s => s.slot_number <= (activeMatch?.team_size || 9))}
              players={players}
              positionGroups={orangePositionGroups}
              onSelect={handlePlayerSelect}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTap={handleSlotTap}
              isLoading={isLoading}
              highlightedSlot={highlightedSlot}
              selectedSlot={selectedSlot}
              getAvailablePlayers={getAvailablePlayers}
            />
            
            {orangeTeamStats && (
              <TeamStats teamType="a" stats={orangeTeamStats} />
            )}
          </div>
          
          {/* Green Team */}
          <div>
            <TeamSection 
              teamType="b"
              slots={currentSlots.filter(s => s.slot_number > (activeMatch?.team_size || 9))}
              players={players}
              positionGroups={greenPositionGroups}
              onSelect={handlePlayerSelect}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTap={handleSlotTap}
              isLoading={isLoading}
              highlightedSlot={highlightedSlot}
              selectedSlot={selectedSlot}
              getAvailablePlayers={getAvailablePlayers}
            />
            
            {greenTeamStats && (
              <TeamStats teamType="b" stats={greenTeamStats} />
            )}
          </div>
        </div>
        
        {/* Comparative stats */}
        {comparativeStats && (
          <div className="p-4">
            <ComparativeStats stats={comparativeStats} />
          </div>
        )}
      </div>
    </div>
  );
};

export default NewTeamAlgorithm;
Phase 7: Migration Strategy

Keep both components temporarily

Rename the original to components/team/LegacyTeamAlgorithm.component.tsx
Place the new one at components/team/TeamAlgorithm.component.tsx


Test thoroughly with real data

Verify all functionality works exactly as before
Check edge cases (empty teams, full teams, etc.)
Test all API interactions


Make the switch in the parent component or route

Update imports to use the new component
Keep the legacy component as a fallback



Phase 8: Clean Up (Only After Successful Testing)
Once the new component is working correctly:

Remove redundant code from the original component
Document the new component structure
Remove the legacy component

Important Safeguards

No file deletion until after successful testing
Back up the original component before making any changes
Make changes incrementally and test after each step
Document any API assumptions or dependencies
Maintain the same prop interface to avoid breaking changes

Testing Checklist

 Players load correctly
 Match data loads correctly
 Team balancing works as expected
 Drag and drop works properly
 Player selection/deselection works
 Team stats display correctly
 Copy teams functionality works
 Clear teams functionality works
 Balance button behavior matches original
 Position distribution is preserved
 API interactions are maintained
 Error states are handled properly