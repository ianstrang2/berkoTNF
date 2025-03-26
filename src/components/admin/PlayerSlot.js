console.log('PlayerSlot.js was loaded - this might be an unused file');

// This file appears to be unused. The PlayerSlot component is defined directly in TeamAlgorithm.js
// Create a dummy component for compatibility
const PlayerSlot = ({ slotNumber, currentPlayerId, availablePlayers, onSelectPlayer, isLoading }) => {
  console.log('PlayerSlot component was rendered - if you see this, this file is actually being used');
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-neutral-500 w-6">•</span>
      <select
        value={currentPlayerId || ''}
        onChange={(e) => onSelectPlayer(e.target.value)}
        className="flex-1 rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        disabled={isLoading}
      >
        <option value="">Select player</option>
        {availablePlayers?.map(player => (
          <option key={player.id} value={player.id}>
            {player.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PlayerSlot; 