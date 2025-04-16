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
  const teamClass = teamType === 'a' ? 'text-orange-600' : 'text-emerald-600';
  const teamName = teamType === 'a' ? 'Orange' : 'Green';
  const playerIdPrefix = teamType === 'a' ? 'teamA-player-' : 'teamB-player-';
  
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
            </div>
            
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
                    teamColor={teamType === 'a' ? 'orange' : 'green'}
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