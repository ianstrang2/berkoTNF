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
    ? 'ring-2 ring-purple-400' 
    : '';
    
  // Opacity for disabled state
  const disabledClass = disabled ? 'opacity-60' : '';
  
  // Team-specific styling with purple/fuchsia variations
  const teamColorClass = teamColor === 'a' 
    ? 'from-fuchsia-50 to-pink-50 text-fuchsia-700 border-fuchsia-200'
    : 'from-purple-50 to-violet-50 text-purple-700 border-purple-200';
  
  return (
    <div 
      className={`${highlightClass} ${disabledClass}`}
      onClick={handleClick}
      onDragOver={e => onDragOver(e, slotNumber)}
      onDrop={e => onDrop(e, slotNumber)}
    >
      {player ? (
        <div
          className="flex items-center bg-white rounded-lg shadow-soft-sm text-slate-700 border border-gray-200 px-4 py-2 w-full font-sans"
          draggable={!disabled}
          onDragStart={() => onDragStart(slotNumber, player)}
        >
          <span className="truncate flex-1 text-sm">{player.name}</span>
          <svg className="w-4 h-4 flex-shrink-0 ml-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      ) : (
        <div className="h-10 flex items-center justify-center text-slate-500 text-sm border border-gray-200 bg-white rounded-lg shadow-soft-sm w-full font-sans">
          {isReadOnly ? 'Empty slot' : (players.length > 0 ? 'Tap to add player' : 'No players available')}
        </div>
      )}
    </div>
  );
};

export default DraggablePlayerSlot; 