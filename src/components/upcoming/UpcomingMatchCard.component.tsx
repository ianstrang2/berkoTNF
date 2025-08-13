'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PlayerInPool } from '@/types/player.types';
import { deriveTemplate } from '@/utils/teamFormation.util';

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
}

interface UpcomingMatchWithPlayers {
  upcoming_match_id: number;
  match_date: string;
  state: string;
  team_size: number;
  actual_size_a?: number;
  actual_size_b?: number;
  players: PlayerInPool[];
}

interface UpcomingMatchCardProps {
  match: UpcomingMatch;
}

interface TeamTemplate {
  defenders: number;
  midfielders: number;
  attackers: number;
}

const UpcomingMatchCard: React.FC<UpcomingMatchCardProps> = ({ match }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState<UpcomingMatchWithPlayers | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [onFirePlayerId, setOnFirePlayerId] = useState<string | null>(null);
  const [grimReaperPlayerId, setGrimReaperPlayerId] = useState<string | null>(null);
  const [teamAName, setTeamAName] = useState<string>('Orange');
  const [teamBName, setTeamBName] = useState<string>('Green');

  // Helper function to format state display text
  const formatStateDisplay = (state: string) => {
    switch (state) {
      case 'PoolLocked':
      case 'POOLLOCKED':
        return 'POOL LOCKED';
      case 'TeamsBalanced':
      case 'TEAMSBALANCED':
        return 'TEAMS BALANCED';
      default:
        return state.toUpperCase();
    }
  };

  // Fetch special player status and team names
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
            
            if (teamAConfig?.config_value) setTeamAName(teamAConfig.config_value);
            if (teamBConfig?.config_value) setTeamBName(teamBConfig.config_value);
          }
        }

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setOnFirePlayerId(statusData.on_fire_player_id ? String(statusData.on_fire_player_id) : null);
          setGrimReaperPlayerId(statusData.grim_reaper_player_id ? String(statusData.grim_reaper_player_id) : null);
        }
      } catch (error) {
        console.error('Error fetching config data:', error);
      }
    };

    fetchConfigData();
  }, []);

  const handleToggleExpand = async () => {
    if (!isExpanded) {
      // Expanding - fetch detailed match data
      setIsLoading(true);
      try {
        const response = await fetch(`/api/upcoming?matchId=${match.upcoming_match_id}`);
        const result = await response.json();
        if (result.success) {
          setExpandedMatch(result.data);
        }
      } catch (error) {
        console.error('Error fetching match details:', error);
      } finally {
        setIsLoading(false);
      }
    }
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
    if (isLoading) {
      return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center text-slate-500">Loading match details...</div>
        </div>
      );
    }

    if (!expandedMatch) return null;

    // Check if teams are balanced or just pool locked
    const hasTeamAssignments = expandedMatch.players.some(p => p.team === 'A' || p.team === 'B');
    
    return (
      <div className="mt-4 space-y-4">
        {hasTeamAssignments ? renderTeams() : renderPlayerPool()}
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
              {formatStateDisplay(match.state)}
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
