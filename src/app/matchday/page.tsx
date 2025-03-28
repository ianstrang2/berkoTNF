'use client';
import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
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

export default function MatchdayPage() {
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
  
  // For unbalanced view, show all players in alphabetical order
  const allSorted = sortByName(players);
  const leftCol = allSorted.slice(0, Math.ceil(allSorted.length / 2));
  const rightCol = allSorted.slice(Math.ceil(allSorted.length / 2));
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="py-6">
          <div className="flex justify-center items-center p-12">
            <div className="w-12 h-12 border-4 border-neutral-300 border-t-primary-500 rounded-full animate-spin"></div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (!matchData) {
    return (
      <MainLayout>
        <div className="py-6">
          <div className="bg-white rounded-xl shadow-card p-6">
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
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="py-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {matchData.match_date ? format(new Date(matchData.match_date), 'EEEE, MMMM do yyyy') : 'Date not set'}
                </h2>
                <p className="text-neutral-600">
                  Format: {matchData.team_size}v{matchData.team_size}
                </p>
              </div>
              <div className="mt-2 md:mt-0 px-4 py-2 bg-neutral-100 rounded-md text-sm">
                {players.length}/{matchData.team_size * 2} players confirmed
              </div>
            </div>
          </div>
          
          {matchData.is_balanced ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Orange Team */}
              <div className="bg-white rounded-xl shadow-card">
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-orange-600 mb-4">Orange Team</h3>
                  <div className="space-y-2">
                    {teamA.map(player => (
                      <div key={player.player_id} className="p-2 bg-neutral-50 rounded-md">
                        <span className="text-sm font-medium">{player.name}</span>
                      </div>
                    ))}
                    {Array(matchData.team_size - teamA.length).fill(0).map((_, i) => (
                      <div key={`empty-a-${i}`} className="p-2 bg-neutral-50 rounded-md border border-dashed border-neutral-200">
                        <span className="text-sm text-neutral-400">Player slot available</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Green Team */}
              <div className="bg-white rounded-xl shadow-card">
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-green-600 mb-4">Green Team</h3>
                  <div className="space-y-2">
                    {teamB.map(player => (
                      <div key={player.player_id} className="p-2 bg-neutral-50 rounded-md">
                        <span className="text-sm font-medium">{player.name}</span>
                      </div>
                    ))}
                    {Array(matchData.team_size - teamB.length).fill(0).map((_, i) => (
                      <div key={`empty-b-${i}`} className="p-2 bg-neutral-50 rounded-md border border-dashed border-neutral-200">
                        <span className="text-sm text-neutral-400">Player slot available</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold mb-2">Confirmed Players</h2>
              <p className="text-neutral-600 mb-6">Players confirmed for the next match</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-2">
                  {leftCol.map(player => (
                    <div key={player.player_id} className="p-2 bg-neutral-50 rounded-md">
                      <span className="text-sm font-medium">{player.name}</span>
                    </div>
                  ))}
                  {players.length < matchData.team_size * 2 && 
                    Array(Math.min(Math.ceil(matchData.team_size), matchData.team_size * 2 - players.length)).fill(0).map((_, i) => (
                      <div key={`empty-left-${i}`} className="p-2 bg-neutral-50 rounded-md border border-dashed border-neutral-200">
                        <span className="text-sm text-neutral-400">Player slot available</span>
                      </div>
                    ))
                  }
                </div>
                
                {/* Right Column */}
                <div className="space-y-2">
                  {rightCol.map(player => (
                    <div key={player.player_id} className="p-2 bg-neutral-50 rounded-md">
                      <span className="text-sm font-medium">{player.name}</span>
                    </div>
                  ))}
                  {players.length < matchData.team_size * 2 && 
                    Array(Math.max(0, matchData.team_size * 2 - players.length - Math.min(Math.ceil(matchData.team_size), matchData.team_size * 2 - players.length))).fill(0).map((_, i) => (
                      <div key={`empty-right-${i}`} className="p-2 bg-neutral-50 rounded-md border border-dashed border-neutral-200">
                        <span className="text-sm text-neutral-400">Player slot available</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
} 