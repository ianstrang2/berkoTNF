import { useState, useEffect, useCallback } from 'react';
import { Match, NewMatchData } from '@/types/team-algorithm.types';
import { API_ENDPOINTS } from '@/constants/team-algorithm.constants';
import { getCurrentDateString, validateMatchData } from '@/utils/teamAlgorithm.util';

export const useMatchData = () => {
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultMatchDate, setDefaultMatchDate] = useState<string>(getCurrentDateString());
  const [createMatchError, setCreateMatchError] = useState<string | null>(null);
  
  // Fetch active match
  const fetchActiveMatch = useCallback(async () => {
    try {
      setIsLoadingMatch(true);
      setError(null);
      
      const response = await fetch(`${API_ENDPOINTS.UPCOMING_MATCHES}?active=true`);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error(`Error fetching match data (${response.status}): ${responseText}`);
        throw new Error(`Failed to fetch match: ${response.status} ${responseText.substring(0, 100)}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data) {
        console.info('No active match found');
        setActiveMatch(null);
        return null;
      }
      
      // Set the active match
      const match = data.data;
      
      // Ensure date field is valid
      if (match.date) {
        // Validate date format
        const dateObj = new Date(match.date);
        if (isNaN(dateObj.getTime())) {
          console.warn('Invalid date format received:', match.date);
          // Try to fix common date format issues
          if (typeof match.date === 'string') {
            // If date is in format DD/MM/YYYY, convert to YYYY-MM-DD
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(match.date)) {
              const [day, month, year] = match.date.split('/');
              match.date = `${year}-${month}-${day}`;
            }
          }
        }
      } else if (match.match_date) {
        // Use match_date as a fallback
        match.date = match.match_date;
      }
      
      // For backward compatibility, ensure match_id exists
      if (match.upcoming_match_id && !match.match_id) {
        match.match_id = match.upcoming_match_id;
      }
      
      setActiveMatch(match);
      return match;
    } catch (error) {
      console.error('Error fetching active match:', error);
      setError(`Failed to fetch match: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    } finally {
      setIsLoadingMatch(false);
    }
  }, []);
  
  // Create new match
  const createMatch = useCallback(async (matchData: NewMatchData): Promise<Match | null> => {
    try {
      // Validate match data
      const validationError = validateMatchData(matchData);
      if (validationError) {
        setCreateMatchError(validationError);
        return null;
      }
      
      setIsLoadingMatch(true);
      setCreateMatchError(null);
      setError(null);
      
      // Format date for API
      const formattedDate = matchData.date;
      
      // Call API to create match
      const response = await fetch(API_ENDPOINTS.CREATE_PLANNED_MATCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: formattedDate,
          team_size: matchData.team_size
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create match');
      }
      
      // Refresh active match to get the new match
      return await fetchActiveMatch();
    } catch (error) {
      console.error('Error creating match:', error);
      setCreateMatchError(`Failed to create match: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    } finally {
      setIsLoadingMatch(false);
    }
  }, [fetchActiveMatch]);
  
  // Update match
  const updateMatch = useCallback(async (matchData: NewMatchData & { match_id: string }): Promise<Match | null> => {
    try {
      // Validate match data
      const validationError = validateMatchData(matchData);
      if (validationError) {
        setCreateMatchError(validationError);
        return null;
      }
      
      setIsLoadingMatch(true);
      setCreateMatchError(null);
      setError(null);
      
      // Call API to update match
      const response = await fetch(API_ENDPOINTS.UPCOMING_MATCHES, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          match_id: matchData.match_id,
          match_date: matchData.date,
          team_size: matchData.team_size
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update match');
      }
      
      // Refresh active match to get the updated match
      return await fetchActiveMatch();
    } catch (error) {
      console.error('Error updating match:', error);
      setCreateMatchError(`Failed to update match: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    } finally {
      setIsLoadingMatch(false);
    }
  }, [fetchActiveMatch]);
  
  // Clear active match
  const clearActiveMatch = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoadingMatch(true);
      setError(null);
      
      // Call API to clear active match
      const response = await fetch(API_ENDPOINTS.CLEAR_ACTIVE_MATCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear active match');
      }
      
      setActiveMatch(null);
      return true;
    } catch (error) {
      console.error('Error clearing active match:', error);
      setError(`Failed to clear active match: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      setIsLoadingMatch(false);
    }
  }, []);
  
  // Load settings for default match date
  const loadMatchSettings = useCallback(async () => {
    try {
      const [lastMatchResponse, settingsResponse] = await Promise.all([
        fetch(`${API_ENDPOINTS.RECENT_MATCHES}?limit=1`),
        fetch(API_ENDPOINTS.SETTINGS)
      ]);
      
      let nextDefaultDate = new Date();
      
      if (lastMatchResponse.ok && settingsResponse.ok) {
        const lastMatchData = await lastMatchResponse.json();
        const settingsData = await settingsResponse.json();
        
        if (lastMatchData.success && lastMatchData.data.length > 0 && 
            settingsData.success && settingsData.data) {
          
          const lastMatch = lastMatchData.data[0];
          const daysBetweenMatches = parseInt(settingsData.data.days_between_matches) || 7;
          
          const lastMatchDate = new Date(lastMatch.match_date);
          if (!isNaN(lastMatchDate.getTime())) {
            nextDefaultDate = new Date(lastMatchDate);
            nextDefaultDate.setDate(nextDefaultDate.getDate() + daysBetweenMatches);
          }
        }
      }
      
      const formattedDefaultDate = nextDefaultDate.toISOString().split('T')[0];
      setDefaultMatchDate(formattedDefaultDate);
      return formattedDefaultDate;
    } catch (error) {
      console.warn('Error loading settings:', error);
      const defaultDate = getCurrentDateString();
      setDefaultMatchDate(defaultDate);
      return defaultDate;
    }
  }, []);
  
  // Initialize data
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        fetchActiveMatch(),
        loadMatchSettings()
      ]);
    };
    
    initialize();
  }, [fetchActiveMatch, loadMatchSettings]);
  
  return {
    activeMatch,
    isLoadingMatch,
    error,
    setError,
    createMatchError,
    setCreateMatchError,
    defaultMatchDate,
    fetchActiveMatch,
    createMatch,
    updateMatch,
    clearActiveMatch
  };
}; 