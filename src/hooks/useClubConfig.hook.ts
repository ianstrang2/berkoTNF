'use client';
import { useMemo } from 'react';
import { useAppConfig } from './queries/useAppConfig.hook';

interface ClubConfig {
  clubName: string;
  isLoading: boolean;
  error: string | null;
}

export const useClubConfig = (): ClubConfig => {
  // Use React Query hook - automatic caching and deduplication!
  const { data: configData = [], isLoading, error: queryError } = useAppConfig('match_settings');
  
  // Extract club name from config
  const clubName = useMemo(() => {
    // Skip if on superadmin platform pages (no tenant context)
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/superadmin')) {
      return 'Capo';
    }
    
    const clubNameConfig = configData.find(config => config.config_key === 'club_name');
    
    if (clubNameConfig && clubNameConfig.config_value) {
      // Trim whitespace and limit length for UI safety
      const cleanName = clubNameConfig.config_value.trim();
      if (cleanName.length > 0 && cleanName.length <= 50) {
        return cleanName;
      } else if (cleanName.length > 50) {
        console.warn(`Club name too long (${cleanName.length} chars), using truncated version`);
        return cleanName.substring(0, 50);
      }
    }
    
    return 'Capo'; // Default fallback
  }, [configData]);

  return { 
    clubName, 
    isLoading, 
    error: queryError ? (queryError as Error).message : null 
  };
};
