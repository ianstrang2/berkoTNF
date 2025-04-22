import React, { useState, useEffect } from 'react';
import { TeamSectionProps } from '@/types/team-algorithm.types';
import DraggablePlayerSlot from './DraggablePlayerSlot.component';
import { getPositionFromSlot, getPlayerStats } from '@/utils/team-algorithm.utils';

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
  getAvailablePlayers,
  isReadOnly = false
}) => {
  const [teamAName, setTeamAName] = useState<string>('Team A');
  const [teamBName, setTeamBName] = useState<string>('Team B');
  const playerIdPrefix = teamType === 'a' ? 'teamA-player-' : 'teamB-player-';
  
  useEffect(() => {
    const fetchTeamNames = async () => {
      try {
        const response = await fetch('/api/admin/app-config?group=match_settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const teamAConfig = data.data.find((config: any) => config.config_key === 'team_a_name');
            const teamBConfig = data.data.find((config: any) => config.config_key === 'team_b_name');
            
            if (teamAConfig && teamAConfig.config_value) {
              setTeamAName(teamAConfig.config_value);
            }
            
            if (teamBConfig && teamBConfig.config_value) {
              setTeamBName(teamBConfig.config_value);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching team names:', error);
        // Fall back to default names if fetch fails
      }
    };
    
    fetchTeamNames();
  }, []);
  
  const teamName = teamType === 'a' ? teamAName : teamBName;
  
  return (
    <div className="mb-4 w-full">
      <h3 className="text-base font-bold text-slate-700 mb-3">
        {teamName}
      </h3>
      
      {positionGroups.map(group => {
        const positionSlots = slots.filter(
          slot => slot.slot_number >= group.startSlot && slot.slot_number <= group.endSlot
        );
        
        return (
          <div key={`${teamType}-${group.position}`} className="mb-4">
            {/* Soft divider line instead of text header */}
            {group.position !== positionGroups[0].position && (
              <div className="h-0.5 bg-gradient-to-r from-purple-50 via-purple-200 to-purple-50 my-4"></div>
            )}
            
            {/* Single column layout for players */}
            <div className="grid grid-cols-1 gap-2">
              {positionSlots.map(slot => {
                const player = players.find(p => p.id === slot.player_id);
                const position = getPositionFromSlot(slot.slot_number);
                const playerStats = getPlayerStats(player, position);
                const availablePlayers = isReadOnly ? [] : getAvailablePlayers(slot);
                
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
                    teamColor={teamType === 'a' ? 'a' : 'b'}
                    isReadOnly={isReadOnly}
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