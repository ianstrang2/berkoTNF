'use client';
import { useState, useEffect } from 'react';

interface ClubConfig {
  clubName: string;
  isLoading: boolean;
  error: string | null;
}

export const useClubConfig = (): ClubConfig => {
  const [clubName, setClubName] = useState('BerkoTNF'); // Default fallback
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClubConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/admin/app-config?groups=match_settings');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          // Find the club_name config
          const clubNameConfig = result.data.find((config: any) => 
            config.config_key === 'club_name'
          );
          
          if (clubNameConfig && clubNameConfig.config_value) {
            // Trim whitespace and limit length for UI safety
            const cleanName = clubNameConfig.config_value.trim();
            if (cleanName.length > 0 && cleanName.length <= 50) {
              setClubName(cleanName);
            } else if (cleanName.length > 50) {
              console.warn(`Club name too long (${cleanName.length} chars), using truncated version`);
              setClubName(cleanName.substring(0, 50));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching club config:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch club config');
        // Keep default fallback value on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchClubConfig();
  }, []);

  return { clubName, isLoading, error };
};
