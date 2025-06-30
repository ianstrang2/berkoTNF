import React from 'react';
import { PlayerSlotProps } from '@/types/team-algorithm.types';

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