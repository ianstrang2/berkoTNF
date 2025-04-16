import React from 'react';
import { DraggablePlayerSlotProps } from '@/types/team-algorithm.types';

const DraggablePlayerSlot: React.FC<DraggablePlayerSlotProps> = ({
  slotNumber,
  player,
  players,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onTap,
  disabled,
  stats,
  position,
  highlighted,
  teamColor,
  isReadOnly = false
}) => {
  // Handle selection in edit mode
  const handleClick = () => {
    if (!isReadOnly && !player && players.length > 0) {
      onTap(slotNumber); // The parent component will handle selection UI
    }
  };
  
  // Add highlight if needed
  const highlightClass = highlighted 
    ? 'ring-2 ring-blue-400' 
    : '';
    
  // Opacity for disabled state
  const disabledClass = disabled ? 'opacity-60' : '';
  
  return (
    <div 
      className={`mb-2 ${highlightClass} ${disabledClass}`}
      onClick={handleClick}
      onDragOver={e => onDragOver(e, slotNumber)}
      onDrop={e => onDrop(e, slotNumber)}
    >
      {player ? (
        <div
          className="flex items-center justify-between px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md cursor-grab"
          draggable={!disabled}
          onDragStart={() => onDragStart(slotNumber, player)}
        >
          <span className="truncate text-sm">{player.name}</span>
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      ) : (
        <div className="h-8 flex items-center justify-center text-gray-400 text-sm border border-gray-200 rounded-md">Empty slot</div>
      )}
    </div>
  );
};

export default DraggablePlayerSlot; 