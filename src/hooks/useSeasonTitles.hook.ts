import { useMemo } from 'react';
import { getSeasonTitles, SeasonTitleData } from '@/utils/seasonTitles.util';
import { useCurrentSeason } from './queries/useCurrentSeason.hook';

interface UseSeasonTitlesResult extends SeasonTitleData {
  loading: boolean;
  error: string | null;
  season: any | null;
}

/**
 * Hook to fetch current season and generate dynamic table titles
 * Now uses React Query for caching and deduplication!
 */
export const useSeasonTitles = (): UseSeasonTitlesResult => {
  // Use React Query hook instead of manual fetch
  const { data: season, isLoading: loading, error: queryError } = useCurrentSeason();
  const error = queryError ? (queryError as Error).message : null;

  // Generate titles based on current season or fallback
  const titleData = useMemo(() => getSeasonTitles(
    season?.startDate,
    season?.halfDate,
    season?.endDate
  ), [season]);

  return {
    ...titleData,
    loading,
    error,
    season
  };
};
