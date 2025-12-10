'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PlayerInPool } from '@/types/player.types';
import { deriveTemplate } from '@/utils/teamFormation.util';
import { useUpcomingMatchDetails } from '@/hooks/queries/useUpcomingMatchDetails.hook';
import { useLatestPlayerStatus } from '@/hooks/queries/useLatestPlayerStatus.hook';
import { useAppConfig } from '@/hooks/queries/useAppConfig.hook';

interface UpcomingMatch {
  upcoming_match_id: number;
  match_date: string;
  state: string;
  _count: {
    players: number;
  };
  team_size: number;
  actual_size_a?: number;
  actual_size_b?: number;
  teams_saved_at?: string | null;
}

interface UpcomingMatchCardProps {
  match: UpcomingMatch;
}

const UpcomingMatchCard: React.FC<UpcomingMatchCardProps> = ({ match }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // React Query hooks - automatic caching and deduplication!
  // Only fetch match details when expanded
  const { data: expandedMatch, isLoading: matchLoading } = useUpcomingMatchDetails(
    isExpanded ? match.upcoming_match_id : null
  );
  const { data: playerStatus } = useLatestPlayerStatus();
  const { data: configData = [] } = useAppConfig({ groups: ['club_team_names'] });

  // Extract config values
  const teamAName = useMemo(() => {
    const config = configData.find(c => c.config_key === 'team_a_name');
    return config?.config_value || 'Orange';
  }, [configData]);

  const teamBName = useMemo(() => {
    const config = configData.find(c => c.config_key === 'team_b_name');
    return config?.config_value || 'Green';
  }, [configData]);

  const onFirePlayerId = playerStatus?.on_fire_player_id || null;
  const grimReaperPlayerId = playerStatus?.grim_reaper_player_id || null;

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
    // Truncate name to 14 characters max
    const displayName = player.name.length > 14 ? player.name.substring(0, 14) : player.name;
    
    return (
      <div 
        key={player.id} 
        className="inline-flex items-center justify-between bg-white rounded-lg shadow-soft-sm text-slate-700 border border-gray-200 px-3 py-2 font-sans w-[170px]"
      >
        <span className="text-sm font-medium truncate flex-1">{displayName}</span>
        <div className="ml-2 flex items-center gap-1">
          {onFirePlayerId === player.id && <span>🔥</span>}
          {grimReaperPlayerId === player.id && <span>💀</span>}
        </div>
      </div>
    );
  };

  const renderPlayerPool = () => {
    if (!expandedMatch) return null;
    
    const unassignedPlayers = expandedMatch.players.filter(p => p.team === 'Unassigned');
    
    return (
      <div>
        <div className="mb-3">
          <h2 className="font-bold text-slate-700 text-lg">Player Pool</h2>
        </div>
        <div className="flex flex-wrap gap-2 min-h-[120px] content-start">
          {unassignedPlayers.length > 0 
            ? unassignedPlayers.map(p => renderPlayerCard(p)) 
            : <p className="w-full text-center text-slate-500 pt-4 text-sm">All players assigned to teams</p>}
        </div>
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
    const { def: defenders, mid: midfielders, att: attackers } = template;
    
    const displayTeamName = teamName === 'A' ? teamAName : teamBName;
    
    return (
      <div className="space-y-1">
        <h3 className="font-bold text-slate-700 text-lg text-center mb-3">
          {displayTeamName}
        </h3>
        {slots.map((slotIndex) => {
          const currentSlot = slotIndex + 1;
          const playerInSlot = teamPlayers.find(p => p.slot_number === currentSlot);
          const showLineAfter = currentSlot === defenders || currentSlot === defenders + midfielders;
          
          return (
            <React.Fragment key={slotIndex}>
              <div className="h-[44px] w-[170px] flex items-center justify-center rounded-lg mx-auto">
                {playerInSlot ? renderPlayerCard(playerInSlot) : (
                  <div className="h-[44px] w-[170px] flex items-center justify-center rounded-lg bg-gray-50 border-2 border-gray-200">
                    <span className="text-xs text-gray-400 font-medium">Empty slot</span>
                  </div>
                )}
              </div>
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
    const hasTeamAssignments = expandedMatch.players.some(p => p.team === 'A' || p.team === 'B');
    
    // If teams exist but not saved yet, show "finalizing" message
    if (hasTeamAssignments && !teamsSaved) {
      return (
        <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="text-center text-amber-700">
            <p className="font-medium">Teams being finalised...</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="mt-4 space-y-4">
        {hasTeamAssignments && teamsSaved ? renderTeams() : renderPlayerPool()}
      </div>
    );
  };

  return (
    <div className="block bg-white hover:shadow-lg transition-shadow duration-300 rounded-xl shadow-soft-xl border">
      <div className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <p className="font-semibold text-slate-700">{format(new Date(match.match_date), 'EEEE, MMMM d, yyyy')}</p>
            <p className="text-sm text-slate-500">Players in pool: {match._count.players}</p>
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
