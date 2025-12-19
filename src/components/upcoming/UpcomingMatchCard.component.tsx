'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PlayerInPool } from '@/types/player.types';
import { deriveTemplate } from '@/utils/teamFormation.util';
import { useUpcomingMatchDetails } from '@/hooks/queries/useUpcomingMatchDetails.hook';
import { useLatestPlayerStatus } from '@/hooks/queries/useLatestPlayerStatus.hook';
import { usePlayerConfig } from '@/hooks/queries/usePlayerConfig.hook';

interface UpcomingMatch {
  upcoming_match_id: number;
  match_date: string;
  state: string;
  _count: {
    upcoming_match_players: number;
  };
  team_size: number;
  actual_size_a?: number;
  actual_size_b?: number;
  teams_saved_at?: string | null;
}

interface UpcomingMatchCardProps {
  match: UpcomingMatch;
  autoExpand?: boolean;
}

const UpcomingMatchCard: React.FC<UpcomingMatchCardProps> = ({ match, autoExpand = false }) => {
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  
  // Update expanded state if autoExpand prop changes
  useEffect(() => {
    if (autoExpand) {
      setIsExpanded(true);
    }
  }, [autoExpand]);

  // React Query hooks - automatic caching and deduplication!
  // Only fetch match details when expanded
  const { data: expandedMatch, isLoading: matchLoading } = useUpcomingMatchDetails(
    isExpanded ? match.upcoming_match_id : null
  );
  const { data: playerStatus } = useLatestPlayerStatus();
  const { data: configData = [] } = usePlayerConfig({ groups: ['club_team_names', 'match_report'] });

  // Extract config values
  const teamAName = useMemo(() => {
    const config = configData.find(c => c.config_key === 'team_a_name');
    return config?.config_value || 'Orange';
  }, [configData]);

  const teamBName = useMemo(() => {
    const config = configData.find(c => c.config_key === 'team_b_name');
    return config?.config_value || 'Green';
  }, [configData]);

  const showOnFireConfig = useMemo(() => {
    const config = configData.find(c => c.config_key === 'show_on_fire');
    return config?.config_value !== 'false';
  }, [configData]);

  const showGrimReaperConfig = useMemo(() => {
    const config = configData.find(c => c.config_key === 'show_grim_reaper');
    return config?.config_value !== 'false';
  }, [configData]);

  const onFirePlayerId = playerStatus?.on_fire_player_id || null;
  const grimReaperPlayerId = playerStatus?.grim_reaper_player_id || null;
  
  // Extract voting awards (MoM, DoD, MiA)
  const votingAwards = playerStatus?.voting_awards || { mom: [], dod: [], mia: [] };
  const momPlayerIds = votingAwards.mom?.map(a => a.player_id) || [];
  const dodPlayerIds = votingAwards.dod?.map(a => a.player_id) || [];
  const miaPlayerIds = votingAwards.mia?.map(a => a.player_id) || [];

  // Helper function to format state display text
  // For players, show BUILDING until teams are actually saved/visible
  const formatStateDisplay = (state: string, teamsSavedAt?: string | null) => {
    switch (state) {
      case 'Draft':
      case 'DRAFT':
        return 'BUILDING';
      case 'PoolLocked':
      case 'POOLLOCKED':
        // Players see BUILDING until teams are saved, then TEAMS SET
        return teamsSavedAt ? 'TEAMS SET' : 'BUILDING';
      case 'TeamsBalanced':
      case 'TEAMSBALANCED':
        return 'READY';
      case 'Completed':
      case 'COMPLETED':
        return 'COMPLETE';
      default:
        return state.toUpperCase();
    }
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const renderPlayerCard = (player: PlayerInPool) => {
    // Check for all 5 awards
    const hasOnFire = showOnFireConfig && onFirePlayerId === player.id;
    const hasGrimReaper = showGrimReaperConfig && grimReaperPlayerId === player.id;
    const hasMom = momPlayerIds.includes(player.id);
    const hasDod = dodPlayerIds.includes(player.id);
    const hasMia = miaPlayerIds.includes(player.id);
    const hasAnyAward = hasOnFire || hasGrimReaper || hasMom || hasDod || hasMia;
    
    return (
      <div 
        key={player.id} 
        className="inline-flex items-center justify-between bg-white rounded shadow-soft-sm text-slate-700 border border-gray-200 px-2 py-1 font-sans w-full max-w-[155px]"
      >
        <span className="text-xs font-medium truncate flex-1">{player.name}</span>
        {hasAnyAward && (
          <div className="ml-1 flex items-center gap-0.5 flex-shrink-0">
            {hasOnFire && <span className="text-xs">🔥</span>}
            {hasGrimReaper && <span className="text-xs">💀</span>}
            {hasMom && <span className="text-xs">💪</span>}
            {hasDod && <span className="text-xs">🫏</span>}
            {hasMia && <span className="text-xs">🦝</span>}
          </div>
        )}
      </div>
    );
  };

  const renderPlayerPool = () => {
    if (!expandedMatch) return null;
    
    const unassignedPlayers = expandedMatch.players.filter(p => p.team === 'Unassigned');
    
    // If no unassigned players (all balanced but not saved), show all players as flat list
    // This way players still see who's playing, just not which team yet
    const playersToShow = unassignedPlayers.length > 0 
      ? unassignedPlayers 
      : expandedMatch.players;
    
    if (playersToShow.length === 0) {
      return (
        <p className="text-center text-slate-500 py-4 text-sm">No players yet</p>
      );
    }
    
    // Sort alphabetically for consistent display
    const sortedPlayers = [...playersToShow].sort((a, b) => a.name.localeCompare(b.name));
    
    return (
      <div className="flex flex-wrap gap-1.5 min-h-[80px] content-start">
        {sortedPlayers.map(p => renderPlayerCard(p))}
      </div>
    );
  };

  const renderTeamColumn = (teamName: 'A' | 'B') => {
    if (!expandedMatch) return null;

    const teamPlayers = expandedMatch.players.filter(p => p.team === teamName);
    const actualTeamSize = teamName === 'A' 
      ? (expandedMatch.actual_size_a || expandedMatch.team_size) 
      : (expandedMatch.actual_size_b || expandedMatch.team_size);
    
    // Get formation template for this team size
    const template = deriveTemplate(actualTeamSize);
    const slots = Array.from({ length: actualTeamSize }, (_, i) => i);
    const { def: defenders, mid: midfielders } = template;
    
    const displayTeamName = teamName === 'A' ? teamAName : teamBName;
    
    return (
      <div className="space-y-0.5">
        <h3 className="font-semibold text-slate-700 text-sm text-center mb-2">
          {displayTeamName}
        </h3>
        {slots.map((slotIndex) => {
          const currentSlot = slotIndex + 1;
          const playerInSlot = teamPlayers.find(p => p.slot_number === currentSlot);
          const showLineAfter = currentSlot === defenders || currentSlot === defenders + midfielders;
          
          return (
            <React.Fragment key={slotIndex}>
              <div className="h-[32px] w-full max-w-[155px] flex items-center justify-center rounded mx-auto">
                {playerInSlot ? renderPlayerCard(playerInSlot) : (
                  <div className="h-[32px] w-full max-w-[155px] flex items-center justify-center rounded bg-gray-50 border border-dashed border-gray-300">
                    <span className="text-[10px] text-gray-400">Empty slot</span>
                  </div>
                )}
              </div>
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

  const renderTeams = () => {
    if (!expandedMatch) return null;
    
    return (
      <div className="grid grid-cols-2 gap-4">
        {renderTeamColumn('A')}
        {renderTeamColumn('B')}
      </div>
    );
  };

  const renderExpandedContent = () => {
    if (matchLoading) {
      return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center text-slate-500">Loading match details...</div>
        </div>
      );
    }

    if (!expandedMatch) return null;

    // Check if teams are saved (visible to players)
    const teamsSaved = expandedMatch.teams_saved_at !== null && expandedMatch.teams_saved_at !== undefined;
    
    // Only show teams if they've been saved - otherwise show the pool
    if (teamsSaved) {
      return (
        <div className="mt-4 space-y-4">
          {renderTeams()}
        </div>
      );
    }
    
    // Not saved yet - show the pool (unassigned players only)
    return (
      <div className="mt-4 space-y-4">
        {renderPlayerPool()}
      </div>
    );
  };

  // Determine if teams are visible (saved)
  const teamsVisible = match.teams_saved_at !== null && match.teams_saved_at !== undefined;
  
  // Calculate team sizes for display
  const teamASizeDisplay = match.actual_size_a || match.team_size;
  const teamBSizeDisplay = match.actual_size_b || match.team_size;
  
  // Generate subtitle text based on state
  const getSubtitleText = () => {
    if (teamsVisible) {
      // Teams are set - show "8 v 7" format
      return `${teamASizeDisplay} v ${teamBSizeDisplay}`;
    } else {
      // Building stage - show player count
      const playerCount = match._count?.upcoming_match_players ?? 0;
      return `Players in pool: ${playerCount}`;
    }
  };
  
  // Handle click on card - expand only (not collapse)
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't expand if clicking on the purple button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    // Only expand, don't collapse
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  return (
    <div 
      className={`block bg-white hover:shadow-lg transition-shadow duration-300 rounded-xl shadow-soft-xl border ${!isExpanded ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <div className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <p className="font-semibold text-slate-700">{format(new Date(match.match_date), 'EEEE, MMMM d, yyyy')}</p>
            <p className="text-sm text-slate-500">{getSubtitleText()}</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-xs font-medium uppercase py-1 px-3 rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-soft-sm">
              {formatStateDisplay(match.state, match.teams_saved_at)}
            </span>
            <button
              onClick={handleToggleExpand}
              className="w-8 h-8 rounded-full bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md flex items-center justify-center hover:scale-105 transition-transform"
              title={isExpanded ? "Collapse details" : "Expand details"}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>
        
        {isExpanded && renderExpandedContent()}
      </div>
    </div>
  );
};

export default UpcomingMatchCard;
