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
 */
export function formatStreakDates(dates: string | null): string {
  if (!dates) return '';
  
  try {
    // Expected format from DB: "2023-12-01 to 2024-01-15"
    const parts = dates.split(' to ');
    if (parts.length !== 2) return dates;
    
    const startDate = new Date(parts[0]);
    const endDate = new Date(parts[1]);
    
    const formatDate = (date: Date): string => {
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${year}-${month}`;
    };
    
    return `(${formatDate(startDate)} to ${formatDate(endDate)})`;
  } catch (error) {
    console.warn('Error formatting streak dates:', dates, error);
    return dates || '';
  }
}

/**
 * Normalizes power rating data from database
 * Updated to use correct SQL field names: rating_numeric, goal_threat_numeric, defensive_shield_numeric
 */
export function normalizePowerRatings(
  playerRating: number,
  playerGoalThreat: number,
  playerDefensiveShield: number,
  leagueData: {
    rating: NormalizationData;
    goalThreat: NormalizationData;
    defensiveShield: NormalizationData;
  }
) {
  // Check for data variance
  const ratingHasVariance = leagueData.rating.max !== leagueData.rating.min;
  const goalThreatHasVariance = leagueData.goalThreat.max !== leagueData.goalThreat.min;
  const defensiveShieldHasVariance = leagueData.defensiveShield.max !== leagueData.defensiveShield.min;
  
  return {
    rating: normalizeToPercentage(playerRating, leagueData.rating.min, leagueData.rating.max),
    goalThreat: normalizeToPercentage(playerGoalThreat, leagueData.goalThreat.min, leagueData.goalThreat.max),
    defensiveShield: normalizeToPercentage(playerDefensiveShield, leagueData.defensiveShield.min, leagueData.defensiveShield.max),
    
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
    defensiveShieldContext: getContextText(
      normalizeToPercentage(playerDefensiveShield, leagueData.defensiveShield.min, leagueData.defensiveShield.max),
      normalizeToPercentage(leagueData.defensiveShield.average, leagueData.defensiveShield.min, leagueData.defensiveShield.max),
      'positive',
      defensiveShieldHasVariance
    ),
    
    // Variance flags for UI handling
    hasVariance: {
      rating: ratingHasVariance,
      goalThreat: goalThreatHasVariance,
      defensiveShield: defensiveShieldHasVariance
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
  },
  leagueData: {
    winStreak: NormalizationData;
    undefeatedStreak: NormalizationData;
    losingStreak: NormalizationData;
    winlessStreak: NormalizationData;
    attendanceStreak: NormalizationData;
  }
) {
  // Check variance for each streak type
  const hasVariance = {
    winStreak: leagueData.winStreak.max !== leagueData.winStreak.min,
    undefeatedStreak: leagueData.undefeatedStreak.max !== leagueData.undefeatedStreak.min,
    losingStreak: leagueData.losingStreak.max !== leagueData.losingStreak.min,
    winlessStreak: leagueData.winlessStreak.max !== leagueData.winlessStreak.min,
    attendanceStreak: leagueData.attendanceStreak.max !== leagueData.attendanceStreak.min
  };
  
  return {
    // Positive streaks
    winStreak: {
      value: playerStreaks.winStreak,
      percentage: normalizeToPercentage(playerStreaks.winStreak, leagueData.winStreak.min, leagueData.winStreak.max),
      leagueAverage: normalizeToPercentage(leagueData.winStreak.average, leagueData.winStreak.min, leagueData.winStreak.max),
      dates: formatStreakDates(playerStreaks.winStreakDates),
      context: getContextText(
        normalizeToPercentage(playerStreaks.winStreak, leagueData.winStreak.min, leagueData.winStreak.max),
        normalizeToPercentage(leagueData.winStreak.average, leagueData.winStreak.min, leagueData.winStreak.max),
        'positive',
        hasVariance.winStreak
      ),
      hasVariance: hasVariance.winStreak
    },
    undefeatedStreak: {
      value: playerStreaks.undefeatedStreak,
      percentage: normalizeToPercentage(playerStreaks.undefeatedStreak, leagueData.undefeatedStreak.min, leagueData.undefeatedStreak.max),
      leagueAverage: normalizeToPercentage(leagueData.undefeatedStreak.average, leagueData.undefeatedStreak.min, leagueData.undefeatedStreak.max),
      dates: formatStreakDates(playerStreaks.undefeatedStreakDates),
      context: getContextText(
        normalizeToPercentage(playerStreaks.undefeatedStreak, leagueData.undefeatedStreak.min, leagueData.undefeatedStreak.max),
        normalizeToPercentage(leagueData.undefeatedStreak.average, leagueData.undefeatedStreak.min, leagueData.undefeatedStreak.max),
        'positive',
        hasVariance.undefeatedStreak
      ),
      hasVariance: hasVariance.undefeatedStreak
    },
    attendanceStreak: {
      value: playerStreaks.attendanceStreak,
      percentage: normalizeToPercentage(playerStreaks.attendanceStreak, leagueData.attendanceStreak.min, leagueData.attendanceStreak.max),
      leagueAverage: normalizeToPercentage(leagueData.attendanceStreak.average, leagueData.attendanceStreak.min, leagueData.attendanceStreak.max),
      dates: '', // No dates for attendance streak
      context: getContextText(
        normalizeToPercentage(playerStreaks.attendanceStreak, leagueData.attendanceStreak.min, leagueData.attendanceStreak.max),
        normalizeToPercentage(leagueData.attendanceStreak.average, leagueData.attendanceStreak.min, leagueData.attendanceStreak.max),
        'positive',
        hasVariance.attendanceStreak
      ),
      hasVariance: hasVariance.attendanceStreak
    },
    
    // Negative streaks
    losingStreak: {
      value: playerStreaks.losingStreak,
      percentage: normalizeToPercentage(playerStreaks.losingStreak, leagueData.losingStreak.min, leagueData.losingStreak.max),
      leagueAverage: normalizeToPercentage(leagueData.losingStreak.average, leagueData.losingStreak.min, leagueData.losingStreak.max),
      dates: formatStreakDates(playerStreaks.losingStreakDates),
      context: getContextText(
        normalizeToPercentage(playerStreaks.losingStreak, leagueData.losingStreak.min, leagueData.losingStreak.max),
        normalizeToPercentage(leagueData.losingStreak.average, leagueData.losingStreak.min, leagueData.losingStreak.max),
        'negative',
        hasVariance.losingStreak
      ),
      hasVariance: hasVariance.losingStreak
    },
    winlessStreak: {
      value: playerStreaks.winlessStreak,
      percentage: normalizeToPercentage(playerStreaks.winlessStreak, leagueData.winlessStreak.min, leagueData.winlessStreak.max),
      leagueAverage: normalizeToPercentage(leagueData.winlessStreak.average, leagueData.winlessStreak.min, leagueData.winlessStreak.max),
      dates: formatStreakDates(playerStreaks.winlessStreakDates),
      context: getContextText(
        normalizeToPercentage(playerStreaks.winlessStreak, leagueData.winlessStreak.min, leagueData.winlessStreak.max),
        normalizeToPercentage(leagueData.winlessStreak.average, leagueData.winlessStreak.min, leagueData.winlessStreak.max),
        'negative',
        hasVariance.winlessStreak
      ),
      hasVariance: hasVariance.winlessStreak
    }
  };
} 