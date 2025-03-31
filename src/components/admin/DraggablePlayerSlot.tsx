import React, { useState } from 'react';

interface Player {
  id: string;
  name: string;
  goalscoring?: number;
  defending?: number;
  stamina_pace?: number;
  control?: number;
  teamwork?: number;
  resilience?: number;
  is_ringer?: boolean;
  is_retired?: boolean;
  [key: string]: any;
}

interface DraggablePlayerSlotProps {
  slotNumber: number;
  player: Player | undefined;
  players: Player[];
  onSelect: (slotIndex: number, playerId: string) => Promise<void>;
  onDragStart: (slotNumber: number, player: Player) => void;
  onDragOver: (e: React.DragEvent, slotNumber: number) => void;
  onDrop: (e: React.DragEvent, targetSlotNumber: number) => void;
  disabled: boolean;
  stats: string;
  position: string;
  highlighted: boolean;
  teamColor: 'orange' | 'green';
}

const DraggablePlayerSlot: React.FC<DraggablePlayerSlotProps> = ({
  slotNumber,
  player,
  players,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  disabled,
  stats,
  position,
  highlighted,
  teamColor
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleEditClick = () => {
    setShowDropdown(true);
  };

  const handleSelectChange = async (playerId: string) => {
    await onSelect(slotNumber, playerId);
    setShowDropdown(false);
  };

  const handleRemoveClick = async () => {
    await onSelect(slotNumber, '');
  };

  const colorClass = teamColor === 'orange' ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50';
  const highlightClass = highlighted ? 'ring-2 ring-blue-500' : '';

  return (
    <div 
      className={`relative rounded-md border p-2 mb-2 ${colorClass} ${highlightClass}`}
      draggable={!!player}
      onDragStart={player ? (e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(slotNumber, player);
      } : undefined}
      onDragOver={(e) => onDragOver(e, slotNumber)}
      onDrop={(e) => onDrop(e, slotNumber)}
    >
      {player ? (
        // Player assigned to slot
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="font-medium">{player.name}</div>
          </div>
          <div className="flex space-x-1">
            <button 
              onClick={handleEditClick}
              className="text-blue-500 hover:text-blue-700 p-1"
              disabled={disabled}
              title="Edit player"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button 
              onClick={handleRemoveClick}
              className="text-red-500 hover:text-red-700 p-1"
              disabled={disabled}
              title="Remove player"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        // Empty slot
        <div className="flex justify-between items-center">
          <div className="text-gray-400 italic">Empty {position}</div>
          <button 
            onClick={handleEditClick}
            className="text-green-500 hover:text-green-700 p-1"
            disabled={disabled}
            title="Add player"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}

      {/* Player selection dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 w-full z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <select
            value={player?.id || ''}
            onChange={(e) => handleSelectChange(e.target.value)}
            className="w-full p-2 rounded-md"
            autoFocus
            onBlur={() => setShowDropdown(false)}
          >
            <option value="">Select player</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default DraggablePlayerSlot; 