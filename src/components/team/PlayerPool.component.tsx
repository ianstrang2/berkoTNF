import React, { useState, useMemo } from 'react';
import { PlayerPoolProps, Player } from '@/types/team-algorithm.types';

const PlayerPool: React.FC<PlayerPoolProps> = ({
  allPlayers,
  selectedPlayers,
  onTogglePlayer,
  teamSize,
  onBalanceTeams,
  isBalancing,
  maxPlayers,
  pendingPlayers = new Set() // Default to empty set if not provided
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Maximum allowed players
  const maxAllowedPlayers = maxPlayers || teamSize * 2;
  
  // Filter players based on search and exclude already selected players
  const availablePlayers = useMemo(() => {
    return allPlayers
      .filter(player => 
        // Not retired, matches search term, and not already selected
        !player.is_retired && 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !selectedPlayers.some(p => p.id === player.id)
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10); // Limit to 10 results for performance
  }, [allPlayers, searchTerm, selectedPlayers]);
  
  // Check if we have the right number of players for the match format
  const hasCorrectPlayerCount = selectedPlayers.length === maxAllowedPlayers;
  
  // Check if we've reached max players allowed
  const hasReachedMaxPlayers = selectedPlayers.length >= maxAllowedPlayers;
  
  return (
    <div className="bg-white rounded-md shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">Player Pool</h2>
        
        {/* Player count indicator */}
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm ${hasCorrectPlayerCount ? 'text-green-600' : 'text-amber-600'}`}>
            {selectedPlayers.length} / {maxAllowedPlayers} players
          </span>
        </div>
      </div>
      
      {/* Panel 1: Selected Players */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Players</h3>
        
        {selectedPlayers.length === 0 ? (
          <div className="text-gray-500 text-sm italic">No players selected yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {selectedPlayers.map(player => (
              <div 
                key={player.id} 
                className={`flex items-center bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1 ${pendingPlayers.has(player.id) ? 'opacity-50' : ''}`}
              >
                <span className="truncate flex-1 text-sm">{player.name}</span>
                <button 
                  className="ml-1.5 text-blue-500 hover:text-blue-700 flex-shrink-0"
                  onClick={() => !pendingPlayers.has(player.id) && onTogglePlayer(player)}
                  aria-label={`Remove ${player.name}`}
                  disabled={pendingPlayers.has(player.id)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Panel 2: Search and Available Players */}
      <div className={`p-4 ${hasReachedMaxPlayers ? 'opacity-50' : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-700">Add Players</h3>
        </div>
        
        {/* Search input */}
        <div className="mb-3">
          <div className="relative">
            <input
              type="text"
              placeholder={hasReachedMaxPlayers ? "Maximum players reached" : "Search players..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-md pr-10"
              disabled={hasReachedMaxPlayers}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* List of available players */}
        <div className="max-h-72 overflow-y-auto rounded-md border divide-y">
          {availablePlayers.length > 0 && !hasReachedMaxPlayers ? (
            availablePlayers.map(player => (
              <div 
                key={player.id}
                className={`flex items-center justify-between p-3 hover:bg-gray-50 ${pendingPlayers.has(player.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !hasReachedMaxPlayers && !pendingPlayers.has(player.id) && onTogglePlayer(player)}
              >
                <div className="flex items-center">
                  <span>{player.name}</span>
                </div>
                <button 
                  className="text-green-500 hover:text-green-700 focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasReachedMaxPlayers && !pendingPlayers.has(player.id)) onTogglePlayer(player);
                  }}
                  disabled={hasReachedMaxPlayers || pendingPlayers.has(player.id)}
                  aria-label={`Add ${player.name}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            ))
          ) : searchTerm ? (
            <div className="p-3 text-center text-gray-500">
              No matching players found
            </div>
          ) : hasReachedMaxPlayers ? (
            <div></div>
          ) : (
            <div className="p-3 text-center text-gray-500">
              All players have been added
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerPool; 