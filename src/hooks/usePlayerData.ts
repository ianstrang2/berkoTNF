import { useState, useEffect, useCallback } from 'react';
import { Player } from '@/types/team-algorithm.types';
import { API_ENDPOINTS } from '@/constants/team-algorithm.constants';

export const usePlayerData = () => {
  const [players, setPlayers] = useState<Player[]>([]);
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
      
      // Process players into the format we need
      const sortedPlayers = data.data
        .filter((p: any) => !p.is_retired)
        .map((p: any) => ({
          id: p.player_id,
          ...p
        }))
        .sort((a: Player, b: Player) => a.name.localeCompare(b.name));
      
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
  const addRinger = useCallback(async (ringerData: Omit<Player, 'id'>) => {
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
        throw new Error(data.error || 'Failed to add ringer');
      }
      
      // Add the new player to the local state
      setPlayers(prevPlayers => [...prevPlayers, data.data]);
      
      return data.data;
    } catch (error) {
      console.error('Error adding ringer:', error);
      setError(`Failed to add ringer: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }, []);
  
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