/**
 * Utility functions for normalizing power rating and streak data to 0-100% scale
 * Used by PowerSlider and PowerRatingGauge components
 */

export interface NormalizationData {
  min: number;
  max: number;
  average: number;
}

/**
 * Normalizes a value to 0-100% scale based on min/max range
 * Handles edge cases for insufficient data variance
 */
export function normalizeToPercentage(
  value: number,
  min: number,
  max: number
): number {
  // Handle edge case: no variance in league data
  if (max === min) {
    return 50; // Default to middle if no range (insufficient league data)
  }
  
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Converts Prisma Decimal to number safely
 */
export function decimalToNumber(decimal: any): number {
  if (decimal === null || decimal === undefined) return 0;
  if (typeof decimal === 'number') return decimal;
  if (typeof decimal === 'string') return parseFloat(decimal);
  if (decimal.toNumber) return decimal.toNumber();
  return parseFloat(decimal.toString());
}

/**
 * Determines context text for a normalized value vs league average
 * Handles edge cases for insufficient data
 */
export function getContextText(
  normalizedValue: number,
  normalizedAverage: number,
  type: 'rating' | 'positive' | 'negative' = 'rating',
  hasVariance: boolean = true
): string {
  // Handle insufficient league data
  if (!hasVariance) {
    return 'Insufficient league data';
  }
  
  const diff = normalizedValue - normalizedAverage;
  const threshold = 5; // 5% threshold for "average"
  
  if (Math.abs(diff) <= threshold) {
    return 'Average';
  }
  
  if (type === 'negative') {
    // For negative metrics (losing streaks), lower is better
    return diff < 0 ? 'Better than Average' : 'Worse than Average';
  }
  
  // For positive metrics (power rating, win streaks), higher is better
  return diff > 0 ? 'Above Average' : 'Below Average';
}

/**
 * Formats streak dates from database format to display format
 * @param dates - Date range string from DB (e.g., "2023-12-01 to 2024-01-15")
 * @param compact - If true, uses compact format: "12/01/23 → 01/15/24" (default: true)
 */
export function formatStreakDates(dates: string | null, compact: boolean = true): string {
  if (!dates) return '';
  
  try {
    // Expected format from DB: "2023-12-01 to 2024-01-15"
    const parts = dates.split(' to ');
    if (parts.length !== 2) return dates;
    
    const startDate = new Date(parts[0]);
    const endDate = new Date(parts[1]);
    
    if (compact) {
      // Compact format: MM/DD/YY → MM/DD/YY
      const formatCompact = (date: Date): string => {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${month}/${day}/${year}`;
      };
      
      return `${formatCompact(startDate)} → ${formatCompact(endDate)}`;
    }
    
    // Legacy format with parentheses
    const formatDate = (date: Date): string => {
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return `(${formatDate(startDate)} to ${formatDate(endDate)})`;
  } catch (error) {
    console.warn('Error formatting streak dates:', dates, error);
    return dates || '';
  }
}

/**
 * Normalizes power rating data from database
 * Updated to use 2-metric system: trend_rating, trend_goal_threat, participation_percentage
 */
export function normalizePowerRatings(
  playerRating: number,
  playerGoalThreat: number,
  playerParticipation: number,
  leagueData: {
    rating: NormalizationData;
    goalThreat: NormalizationData;
    participation: NormalizationData;
  }
) {
  // Check for data variance
  const ratingHasVariance = leagueData.rating.max !== leagueData.rating.min;
  const goalThreatHasVariance = leagueData.goalThreat.max !== leagueData.goalThreat.min;
  const participationHasVariance = leagueData.participation.max !== leagueData.participation.min;
  
  return {
    rating: normalizeToPercentage(playerRating, leagueData.rating.min, leagueData.rating.max),
    goalThreat: normalizeToPercentage(playerGoalThreat, leagueData.goalThreat.min, leagueData.goalThreat.max),
    participation: normalizeToPercentage(playerParticipation, leagueData.participation.min, leagueData.participation.max),
    
    // Context text with variance checking
    ratingContext: getContextText(
      normalizeToPercentage(playerRating, leagueData.rating.min, leagueData.rating.max),
      normalizeToPercentage(leagueData.rating.average, leagueData.rating.min, leagueData.rating.max),
      'rating',
      ratingHasVariance
    ),
    goalThreatContext: getContextText(
      normalizeToPercentage(playerGoalThreat, leagueData.goalThreat.min, leagueData.goalThreat.max),
      normalizeToPercentage(leagueData.goalThreat.average, leagueData.goalThreat.min, leagueData.goalThreat.max),
      'positive',
      goalThreatHasVariance
    ),
    participationContext: getContextText(
      normalizeToPercentage(playerParticipation, leagueData.participation.min, leagueData.participation.max),
      normalizeToPercentage(leagueData.participation.average, leagueData.participation.min, leagueData.participation.max),
      'positive',
      participationHasVariance
    ),
    
    // Variance flags for UI handling
    hasVariance: {
      rating: ratingHasVariance,
      goalThreat: goalThreatHasVariance,
      participation: participationHasVariance
    }
  };
}

/**
 * Normalizes streak data from database
 * Includes variance checking for edge cases
 */
export function normalizeStreaks(
  playerStreaks: {
    winStreak: number;
    winStreakDates: string | null;
    undefeatedStreak: number;
    undefeatedStreakDates: string | null;
    losingStreak: number;
    losingStreakDates: string | null;
    winlessStreak: number;
    winlessStreakDates: string | null;
    attendanceStreak: number;
    attendanceStreakDates?: string | null;
    scoringStreak?: number;
    scoringStreakDates?: string | null;
  },
  leagueData: {
    winStreak: NormalizationData;
    undefeatedStreak: NormalizationData;
    losingStreak: NormalizationData;
    winlessStreak: NormalizationData;
    attendanceStreak: NormalizationData;
  },
  streakRecords?: {
    winStreak: number;
    undefeatedStreak: number;
    losingStreak: number;
    winlessStreak: number;
    attendanceStreak: number;
    scoringStreak: number;
  }
) {
  // Use streak records as max values when available
  const normalizeWithRecords = (value: number, type: keyof typeof leagueData) => {
    const recordsMax = streakRecords ? (streakRecords[type as keyof typeof streakRecords] as any)?.max : undefined;
    const max = recordsMax || leagueData[type].max;
    const min = leagueData[type].min;
    return normalizeToPercentage(value, min, max);
  };

  // Check variance for each streak type
  const hasVariance = {
    winStreak: leagueData.winStreak.max !== leagueData.winStreak.min,
    undefeatedStreak: leagueData.undefeatedStreak.max !== leagueData.undefeatedStreak.min,
    losingStreak: leagueData.losingStreak.max !== leagueData.losingStreak.min,
    winlessStreak: leagueData.winlessStreak.max !== leagueData.winlessStreak.min,
    attendanceStreak: leagueData.attendanceStreak.max !== leagueData.attendanceStreak.min,
    scoringStreak: true // Always show scoring streak if available
  };
  
  return {
    // Positive streaks
    winStreak: {
      value: playerStreaks.winStreak,
      percentage: normalizeWithRecords(playerStreaks.winStreak, 'winStreak'),
      dates: formatStreakDates(playerStreaks.winStreakDates),
      hasVariance: hasVariance.winStreak
    },
    undefeatedStreak: {
      value: playerStreaks.undefeatedStreak,
      percentage: normalizeWithRecords(playerStreaks.undefeatedStreak, 'undefeatedStreak'),
      dates: formatStreakDates(playerStreaks.undefeatedStreakDates),
      hasVariance: hasVariance.undefeatedStreak
    },
    attendanceStreak: {
      value: playerStreaks.attendanceStreak,
      percentage: normalizeWithRecords(playerStreaks.attendanceStreak, 'attendanceStreak'),
      dates: playerStreaks.attendanceStreakDates || 'No dates available',
      hasVariance: hasVariance.attendanceStreak
    },
    
    // Scoring streak
    scoringStreak: {
      value: playerStreaks.scoringStreak || 0,
      percentage: streakRecords ? normalizeToPercentage(playerStreaks.scoringStreak || 0, 0, (streakRecords.scoringStreak as any)?.max || 10) : 0,
      dates: formatStreakDates(playerStreaks.scoringStreakDates || null),
      hasVariance: hasVariance.scoringStreak
    },
    
    // Negative streaks
    losingStreak: {
      value: playerStreaks.losingStreak,
      percentage: normalizeWithRecords(playerStreaks.losingStreak, 'losingStreak'),
      dates: formatStreakDates(playerStreaks.losingStreakDates),
      hasVariance: hasVariance.losingStreak
    },
    winlessStreak: {
      value: playerStreaks.winlessStreak,
      percentage: normalizeWithRecords(playerStreaks.winlessStreak, 'winlessStreak'),
      dates: formatStreakDates(playerStreaks.winlessStreakDates),
      hasVariance: hasVariance.winlessStreak
    }
  };
} 