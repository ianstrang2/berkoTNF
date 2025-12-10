import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { PlayerProfile, PlayerInPool } from '@/types/player.types';
import { format } from 'date-fns';

interface PlayerPoolProps {
  allPlayers: PlayerProfile[];
  selectedPlayers: PlayerInPool[];
  onTogglePlayer: (player: PlayerProfile | PlayerInPool) => void;
  teamSize: number;
  onBalanceTeams: () => void;
  isBalancing: boolean;
  maxPlayers?: number;
  pendingPlayers?: Set<string>;
  matchDate?: string;
}

const PlayerPool: React.FC<PlayerPoolProps> = ({
  allPlayers,
  selectedPlayers,
  onTogglePlayer,
  teamSize,
  onBalanceTeams,
  isBalancing,
  maxPlayers,
  pendingPlayers = new Set(), // Default to empty set if not provided
  matchDate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const shouldFocusRef = useRef(false);
  
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
  
  // Focus after React has finished rendering (fixes alternating focus bug)
  useEffect(() => {
    if (shouldFocusRef.current) {
      shouldFocusRef.current = false;
      // Use requestAnimationFrame to ensure DOM is fully painted
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [selectedPlayers]); // Trigger when selectedPlayers changes
  
  // Wrapper to clear search when adding a player (but not when removing)
  const handleAddPlayer = useCallback((player: PlayerProfile | PlayerInPool) => {
    // Only clear search if adding (player not already selected)
    const isAdding = !selectedPlayers.some(p => p.id === player.id);
    onTogglePlayer(player);
    if (isAdding) {
      setSearchTerm('');
      // Set flag to focus after next render
      shouldFocusRef.current = true;
    }
  }, [selectedPlayers, onTogglePlayer]);
  
  // Check if we have the right number of players for the match format
  const hasCorrectPlayerCount = selectedPlayers.length === maxAllowedPlayers;
  
  // Check if we've reached max players allowed
  const hasReachedMaxPlayers = selectedPlayers.length >= maxAllowedPlayers;

  // Calculate percentage for progress indicator
  const playerCountPercentage = (selectedPlayers.length / maxAllowedPlayers) * 100;
  
  // Format the date for display
  const formattedDate = matchDate ? format(new Date(matchDate), 'dd-MMM-yy') : null;

  return (
    <div>
      <div className="mb-3">
        {/* All on same row with baseline alignment */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-slate-700">Player Pool</span>
          {formattedDate && (
            <span className="text-xs font-medium text-slate-500">{formattedDate}</span>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-slate-700">{selectedPlayers.length}/{maxAllowedPlayers}</span>
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden self-center">
              <div 
                className={`h-full ${hasCorrectPlayerCount ? 'bg-gradient-to-tl from-purple-700 to-pink-500' : 'bg-gradient-to-tl from-purple-400 to-pink-300'}`}
                style={{ width: `${playerCountPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Selected Players - compact pills */}
      <div className="mb-3">
        {selectedPlayers.length === 0 ? (
          <div className="text-slate-500 text-sm italic">No players selected yet.</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selectedPlayers.map(player => (
              <div 
                key={player.id} 
                className={`flex items-center bg-white rounded shadow-soft-sm text-slate-700 border border-gray-200 px-2 py-0.5 font-sans max-w-32 ${pendingPlayers.has(player.id) ? 'opacity-50' : ''}`}
              >
                <span className="truncate flex-1 text-xs">{player.name}</span>
                <button 
                  className="ml-1 text-slate-400 hover:text-slate-700 flex-shrink-0 transition-colors"
                  onClick={() => !pendingPlayers.has(player.id) && onTogglePlayer(player)}
                  aria-label={`Remove ${player.name}`}
                  disabled={pendingPlayers.has(player.id)}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Search and Available Players */}
      <div className={`${hasReachedMaxPlayers ? 'opacity-50' : ''}`}>
        {/* Search input */}
        <div className="mb-2">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={hasReachedMaxPlayers ? "Maximum reached" : `Add players (${allPlayers.filter(p => !p.isRetired && !selectedPlayers.some(s => s.id === p.id)).length} available)`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 text-sm text-slate-600"
              disabled={hasReachedMaxPlayers}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* List of available players - compact height for ~4 rows */}
        <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 divide-y shadow-soft-xs">
          {availablePlayers.length > 0 && !hasReachedMaxPlayers ? (
            availablePlayers.map(player => (
              <div 
                key={player.id}
                className={`flex items-center justify-between px-2.5 py-2 hover:bg-gray-50 ${pendingPlayers.has(player.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !hasReachedMaxPlayers && !pendingPlayers.has(player.id) && handleAddPlayer(player)}
              >
                <div className="flex items-center">
                  <span className="bg-white rounded-md shadow-soft-sm text-slate-700 border border-gray-200 px-2.5 py-1 font-sans text-xs max-w-36">{player.name}</span>
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
            <div className="p-2.5 text-center text-slate-500 text-xs">
              No matching players found
            </div>
          ) : hasReachedMaxPlayers ? (
            <div className="p-2.5 text-center text-slate-500 text-xs">
              Maximum players reached
            </div>
          ) : (
            <div className="p-2.5 text-center text-slate-500 text-xs">
              All players have been added
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerPool; 