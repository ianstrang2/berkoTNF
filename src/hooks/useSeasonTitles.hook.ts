import { useState, useEffect } from 'react';
import { getSeasonTitles, SeasonTitleData } from '@/utils/seasonTitles.util';
import { CurrentSeasonResponse } from '@/types/season.types';

interface UseSeasonTitlesResult extends SeasonTitleData {
  loading: boolean;
  error: string | null;
  season: any | null;
}

/**
 * Hook to fetch current season and generate dynamic table titles
 */
export const useSeasonTitles = (): UseSeasonTitlesResult => {
  const [season, setSeason] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentSeason = async () => {
      try {
        const response = await fetch('/api/seasons/current');
        const data: CurrentSeasonResponse = await response.json();
        
        if (data.success && data.data) {
          setSeason(data.data);
        } else {
          // No current season - will use fallback titles
          setSeason(null);
        }
      } catch (err) {
        console.error('Error fetching current season:', err);
        setError('Failed to load season data');
        setSeason(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentSeason();
  }, []);

  // Generate titles based on current season or fallback
  const titleData = getSeasonTitles(
    season?.startDate,
    season?.halfDate,
    season?.endDate
  );

  return {
    ...titleData,
    loading,
    error,
    season
  };
};
