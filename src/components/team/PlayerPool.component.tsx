import React, { useState, useMemo, useRef } from 'react';
import { PlayerProfile, PlayerInPool } from '@/types/player.types';

interface PlayerPoolProps {
  allPlayers: PlayerProfile[];
  selectedPlayers: PlayerInPool[];
  onTogglePlayer: (player: PlayerProfile | PlayerInPool) => void;
  teamSize: number;
  onBalanceTeams: () => void;
  isBalancing: boolean;
  maxPlayers?: number;
  pendingPlayers?: Set<string>;
}

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
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Maximum allowed players
  const maxAllowedPlayers = maxPlayers || teamSize * 2;
  
  // Filter players based on search and exclude already selected players
  const availablePlayers = useMemo(() => {
    return allPlayers
      .filter(player => 
        // Not retired, matches search term, and not already selected
        !player.isRetired && 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !selectedPlayers.some(p => p.id === player.id)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allPlayers, searchTerm, selectedPlayers]);
  
  // Wrapper to clear search when adding a player (but not when removing)
  const handleAddPlayer = (player: PlayerProfile | PlayerInPool) => {
    // Only clear search if adding (player not already selected)
    const isAdding = !selectedPlayers.some(p => p.id === player.id);
    onTogglePlayer(player);
    if (isAdding) {
      setSearchTerm('');
      // Return focus to search input for quick successive additions
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  };
  
  // Check if we have the right number of players for the match format
  const hasCorrectPlayerCount = selectedPlayers.length === maxAllowedPlayers;
  
  // Check if we've reached max players allowed
  const hasReachedMaxPlayers = selectedPlayers.length >= maxAllowedPlayers;

  // Calculate percentage for progress indicator
  const playerCountPercentage = (selectedPlayers.length / maxAllowedPlayers) * 100;
  
  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-700">Player Pool</h2>
          <div className="inline-flex items-center gap-2">
            <div className="text-xs font-semibold text-slate-700">{selectedPlayers.length}/{maxAllowedPlayers}</div>
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${hasCorrectPlayerCount ? 'bg-gradient-to-tl from-purple-700 to-pink-500' : 'bg-gradient-to-tl from-purple-400 to-pink-300'}`}
                style={{ width: `${playerCountPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Panel 1: Selected Players */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-700 mb-2">Selected Players</h3>
        
        {selectedPlayers.length === 0 ? (
          <div className="text-slate-500 text-sm italic">No players selected yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedPlayers.map(player => (
              <div 
                key={player.id} 
                className={`flex items-center bg-white rounded-lg shadow-soft-sm text-slate-700 border border-gray-200 px-4 py-2 font-sans max-w-40 ${pendingPlayers.has(player.id) ? 'opacity-50' : ''}`}
              >
                <span className="truncate flex-1 text-sm">{player.name}</span>
                <button 
                  className="ml-1.5 text-slate-400 hover:text-slate-700 flex-shrink-0 transition-colors"
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
      <div className={`${hasReachedMaxPlayers ? 'opacity-50' : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-slate-700">Add Players</h3>
        </div>
        
        {/* Search input */}
        <div className="mb-3">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={hasReachedMaxPlayers ? "Maximum players reached" : `Search ${allPlayers.filter(p => !p.isRetired && !selectedPlayers.some(s => s.id === p.id)).length} available players...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 text-sm text-slate-600"
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
        <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 divide-y shadow-soft-xs">
          {availablePlayers.length > 0 && !hasReachedMaxPlayers ? (
            availablePlayers.map(player => (
              <div 
                key={player.id}
                className={`flex items-center justify-between p-3 hover:bg-gray-50 ${pendingPlayers.has(player.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !hasReachedMaxPlayers && !pendingPlayers.has(player.id) && handleAddPlayer(player)}
              >
                <div className="flex items-center">
                  <span className="bg-white rounded-lg shadow-soft-sm text-slate-700 border border-gray-200 px-4 py-2 font-sans text-sm max-w-40">{player.name}</span>
                </div>
                <button 
                  className="focus:outline-none transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasReachedMaxPlayers && !pendingPlayers.has(player.id)) handleAddPlayer(player);
                  }}
                  disabled={hasReachedMaxPlayers || pendingPlayers.has(player.id)}
                  aria-label={`Add ${player.name}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id="purple-gradient-plus" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="url(#purple-gradient-plus)" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            ))
          ) : searchTerm ? (
            <div className="p-3 text-center text-slate-500 text-sm">
              No matching players found
            </div>
          ) : hasReachedMaxPlayers ? (
            <div className="p-3 text-center text-slate-500 text-sm">
              Maximum players reached
            </div>
          ) : (
            <div className="p-3 text-center text-slate-500 text-sm">
              All players have been added
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerPool; 