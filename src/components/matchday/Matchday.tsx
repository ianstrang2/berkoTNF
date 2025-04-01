'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui-kit';
import { format } from 'date-fns';

interface Player {
  player_id: number | string;
  name?: string;
  team?: string;
  [key: string]: any;
}

interface MatchData {
  match_date: string;
  team_size: number;
  is_balanced: boolean;
  players?: Player[];
  [key: string]: any;
}

const Matchday: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  
  useEffect(() => {
    async function fetchMatchData() {
      try {
        const response = await fetch('/api/admin/upcoming-matches?active=true');
        if (!response.ok) return;
        
        const result = await response.json();
        if (!result.success || !result.data) return;
        
        const match = result.data;
        setMatchData(match);
        
        if (match.players && Array.isArray(match.players)) {
          setPlayers(match.players);
        }
      } catch (error) {
        console.error('Error fetching match data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMatchData();
  }, []);
  
  // Helper function to sort players alphabetically
  const sortByName = (players: Player[]) => {
    return [...players].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };
  
  // Split players into teams
  const teamA = sortByName(players.filter(p => p.team === 'A'));
  const teamB = sortByName(players.filter(p => p.team === 'B'));
  
  // For unbalanced view, sort all players alphabetically
  const allSorted = sortByName(players);
  
  if (isLoading) {
    return (
      <Card>
        <div className="flex justify-center items-center p-12">
          <div className="w-12 h-12 border-4 border-neutral-300 border-t-primary-500 rounded-full animate-spin"></div>
        </div>
      </Card>
    );
  }
  
  if (!matchData) {
    return (
      <Card>
        <div className="flex justify-center items-center p-12">
          <div className="text-center">
            <svg 
              className="w-16 h-16 mx-auto text-neutral-300 mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <h2 className="text-xl font-semibold text-neutral-700 mb-2">No Upcoming Match</h2>
            <p className="text-neutral-500 max-w-md mx-auto">
              There is no upcoming match currently scheduled. Check back soon.
            </p>
          </div>
        </div>
      </Card>
    );
  }
  
  // Format date nicely
  const formattedDate = matchData.match_date 
    ? format(new Date(matchData.match_date), 'EEEE, MMMM do yyyy')
    : 'Date not set';
  
  return (
    <Card>
      <div className="flex flex-col items-center mb-8">
        <div className="text-center mb-2 mt-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{formattedDate}</h2>
          <p className="text-lg text-neutral-600">Format: {matchData.team_size}v{matchData.team_size}</p>
        </div>
      </div>
      
      {matchData.is_balanced ? (
        <div className="grid grid-cols-2 gap-8">
          {/* Orange Team */}
          <div>
            <h3 className="text-lg font-medium text-orange-600 mb-4">Orange Team</h3>
            <div className="space-y-2.5">
              {teamA.map(player => (
                <div key={player.player_id} className="text-sm">
                  {player.name}
                </div>
              ))}
              {Array(matchData.team_size - teamA.length).fill(0).map((_, i) => (
                <div key={`empty-a-${i}`} className="text-sm text-neutral-400">
                  Player slot
                </div>
              ))}
            </div>
          </div>
          
          {/* Green Team */}
          <div>
            <h3 className="text-lg font-medium text-green-600 mb-4">Green Team</h3>
            <div className="space-y-2.5">
              {teamB.map(player => (
                <div key={player.player_id} className="text-sm">
                  {player.name}
                </div>
              ))}
              {Array(matchData.team_size - teamB.length).fill(0).map((_, i) => (
                <div key={`empty-b-${i}`} className="text-sm text-neutral-400">
                  Player slot
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-medium mb-4">Confirmed Players</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-8 gap-y-2.5">
            {allSorted.map(player => (
              <div key={player.player_id} className="text-sm">
                {player.name}
              </div>
            ))}
            {players.length < matchData.team_size * 2 && 
              Array(matchData.team_size * 2 - players.length).fill(0).map((_, i) => (
                <div key={`empty-${i}`} className="text-sm text-neutral-400">
                  Player slot
                </div>
              ))
            }
          </div>
        </div>
      )}
    </Card>
  );
};

export default Matchday; 