import React from 'react';
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
  const teamName = teamType === 'a' ? 'Team A' : 'Team B';
  const playerIdPrefix = teamType === 'a' ? 'teamA-player-' : 'teamB-player-';
  
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