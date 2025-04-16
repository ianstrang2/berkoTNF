import { useState, useEffect, useCallback } from 'react';
import { Player, PoolPlayer } from '@/types/team-algorithm.types';
import { TeamAPIService } from '@/services/TeamAPI.service';

export const usePlayerPool = (matchId?: string) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [poolPlayers, setPoolPlayers] = useState<PoolPlayer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load all players and player pool
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!matchId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch all players and player pool in parallel
        const [allPlayersResponse, poolPlayersResponse] = await Promise.all([
          fetch('/api/admin/players'),
          TeamAPIService.fetchPlayerPool(matchId)
        ]);
        
        // Process all players
        if (!allPlayersResponse.ok) {
          throw new Error(`Failed to fetch players: ${allPlayersResponse.status}`);
        }
        
        const allPlayersData = await allPlayersResponse.json();
        if (!allPlayersData.success) {
          throw new Error(allPlayersData.error || 'Failed to fetch players');
        }
        
        // Format player data and sort alphabetically
        const formattedPlayers = allPlayersData.data
          .filter((p: any) => !p.is_retired)
          .map((p: any) => ({
            id: p.player_id.toString(),
            name: p.name,
            goalscoring: p.goalscoring,
            defending: p.defender,
            stamina_pace: p.stamina_pace,
            control: p.control,
            teamwork: p.teamwork,
            resilience: p.resilience,
            is_ringer: p.is_ringer,
            is_retired: p.is_retired
          }))
          .sort((a: Player, b: Player) => a.name.localeCompare(b.name));
        
        setPlayers(formattedPlayers);
        setPoolPlayers(poolPlayersResponse);
      } catch (error) {
        console.error('Error fetching players:', error);
        setError(`Failed to load players: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlayers();
  }, [matchId]);
  
  // Add player to pool
  const addPlayerToPool = useCallback(async (playerId: string) => {
    if (!matchId) return;
    
    try {
      setError(null);
      await TeamAPIService.addPlayerToPool(matchId, playerId);
      
      // Find the player in the players list
      const playerToAdd = players.find(p => p.id === playerId);
      if (!playerToAdd) return;
      
      // Add to pool players
      setPoolPlayers(prev => [...prev, { ...playerToAdd, response_status: 'IN' }]);
    } catch (error) {
      setError(`Failed to add player: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [matchId, players]);
  
  // Remove player from pool
  const removePlayerFromPool = useCallback(async (playerId: string) => {
    if (!matchId) return;
    
    try {
      setError(null);
      await TeamAPIService.removePlayerFromPool(matchId, playerId);
      
      // Remove from pool players
      setPoolPlayers(prev => prev.filter(p => p.id !== playerId));
    } catch (error) {
      setError(`Failed to remove player: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [matchId]);
  
  // Add ringer and add to pool
  const addRinger = useCallback(async (ringerData: any) => {
    if (!matchId) return;
    
    try {
      setError(null);
      // Add the ringer player
      const newRinger = await TeamAPIService.addRinger(ringerData);
      
      // Add to all players
      const ringerPlayer: Player = {
        id: newRinger.id.toString(),
        name: newRinger.name,
        goalscoring: newRinger.goalscoring,
        defending: newRinger.defending,
        stamina_pace: newRinger.stamina_pace,
        control: newRinger.control,
        teamwork: newRinger.teamwork,
        resilience: newRinger.resilience,
        is_ringer: true
      };
      
      setPlayers(prev => [...prev, ringerPlayer].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Add to pool automatically
      await addPlayerToPool(ringerPlayer.id);
      
      return ringerPlayer;
    } catch (error) {
      setError(`Failed to add ringer: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }, [matchId, addPlayerToPool]);
  
  // Refresh player pool data
  const refreshPool = useCallback(async () => {
    if (!matchId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch updated pool data
      const updatedPool = await TeamAPIService.fetchPlayerPool(matchId);
      setPoolPlayers(updatedPool);
    } catch (error) {
      setError(`Failed to refresh player pool: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);
  
  return {
    players,
    poolPlayers,
    isLoading,
    error,
    addPlayerToPool,
    removePlayerFromPool,
    addRinger,
    refreshPool
  };
}; 