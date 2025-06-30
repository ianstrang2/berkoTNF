import { useState, useEffect, useCallback } from 'react';
import { PlayerProfile } from '@/types/player.types';
import { PlayerFormData } from '@/types/team-algorithm.types';
import { API_ENDPOINTS } from '@/constants/team-algorithm.constants';
import { toPlayerProfile } from '@/lib/transform/player.transform';

export const usePlayerData = () => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load players from API
  const fetchPlayers = useCallback(async () => {
    try {
      setIsLoadingPlayers(true);
      setError(null);
      
      const response = await fetch(`${API_ENDPOINTS.PLAYERS}?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch players');
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch players');
      
      // Process players into the canonical format
      const transformedPlayers = data.data.map(toPlayerProfile);
      
      const sortedPlayers = transformedPlayers
        .filter((p: PlayerProfile) => !p.isRetired)
        .sort((a: PlayerProfile, b: PlayerProfile) => a.name.localeCompare(b.name));
      
      setPlayers(sortedPlayers);
      return sortedPlayers;
    } catch (error) {
      console.error('Error fetching players:', error);
      setError(`Failed to load players: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    } finally {
      setIsLoadingPlayers(false);
    }
  }, []);
  
  // Add a ringer player
  const addRinger = useCallback(async (ringerData: PlayerFormData) => {
    try {
      setError(null);
      
      const response = await fetch(API_ENDPOINTS.ADD_RINGER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ringerData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data?.error || 'Failed to add ringer. An unknown error occurred.';
        console.error('API error when adding ringer:', data);
        throw new Error(errorMessage);
      }
      
      const newPlayer = toPlayerProfile(data.data);

      setPlayers(prevPlayers => 
        [...prevPlayers, newPlayer].sort((a, b) => a.name.localeCompare(b.name))
      );
      
      return newPlayer;
    } catch (error) {
      console.error('Error in addRinger (usePlayerData):', error);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred while adding ringer.';
      setError(message);
      throw error;
    }
  }, [setPlayers]);
  
  // Load players on mount
  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);
  
  return {
    players,
    isLoadingPlayers,
    error,
    setError,
    fetchPlayers,
    addRinger
  };
}; 