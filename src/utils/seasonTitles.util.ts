// Utility functions for dynamic season-based table titles

export interface SeasonTitleData {
  halfSeasonTitle: string;
  wholeSeasonTitle: string;
  currentHalf: 'first' | 'second';
}

/**
 * Convert a date to short month name (Jan, Feb, Mar, etc.)
 */
export const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short' });
};

/**
 * Generate season-based titles from season dates
 */
export const generateSeasonTitles = (
  startDate: string,
  halfDate: string,
  endDate: string
): SeasonTitleData => {
  const start = new Date(startDate);
  const half = new Date(halfDate);
  const end = new Date(endDate);
  const today = new Date();

  // Convert dates to month names
  const startMonth = getMonthName(start);
  const halfMonth = getMonthName(half);
  const endMonth = getMonthName(end);
  
  // Determine if we're in first or second half of season
  const currentHalf: 'first' | 'second' = today <= half ? 'first' : 'second';
  
  // Generate titles
  const firstHalfTitle = `${startMonth} - ${halfMonth}`;
  const secondHalfTitle = `${getMonthName(new Date(half.getTime() + 24 * 60 * 60 * 1000))} - ${endMonth}`;
  const wholeSeasonTitle = `${startMonth} - ${endMonth}`;
  
  return {
    halfSeasonTitle: currentHalf === 'first' ? firstHalfTitle : secondHalfTitle,
    wholeSeasonTitle,
    currentHalf
  };
};

/**
 * Generate fallback titles when no season is available
 */
export const getFallbackTitles = (): SeasonTitleData => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  // Default to calendar year behavior
  const isFirstHalf = currentMonth < 6; // Jan-May = first half, Jun-Dec = second half
  
  return {
    halfSeasonTitle: isFirstHalf ? 'Jan - Jun' : 'Jul - Dec',
    wholeSeasonTitle: 'Jan - Dec',
    currentHalf: isFirstHalf ? 'first' : 'second'
  };
};

/**
 * Hook-like function to get season titles (can be used in components)
 */
export const getSeasonTitles = (
  startDate?: string,
  halfDate?: string,
  endDate?: string
): SeasonTitleData => {
  if (!startDate || !halfDate || !endDate) {
    return getFallbackTitles();
  }
  
  return generateSeasonTitles(startDate, halfDate, endDate);
};
