export const CACHE_TAGS = {
  // Aggregated Stats
  ALL_TIME_STATS: 'all_time_stats',
  SEASON_STATS: 'season_stats',
  HALF_SEASON_STATS: 'half_season_stats',
  
  // Player-Specific
  PLAYER_PROFILE: 'player_profile_stats',
  PERSONAL_BESTS: 'personal_bests',
  PLAYER_POWER_RATING: 'player_power_rating',
  
  // Records & Honours
  HALL_OF_FAME: 'hall_of_fame',
  HONOUR_ROLL: 'season_honours', // Note: from update_aggregated_season_honours_and_records.sql
  
  // Match-related
  MATCH_REPORT: 'match_report',
  RECENT_PERFORMANCE: 'recent_performance',
  
  // Admin & Config
  UPCOMING_MATCH: 'upcoming_match',
};

// A list of all tags that should be invalidated when a match is updated
export const ALL_MATCH_RELATED_TAGS = [
  CACHE_TAGS.ALL_TIME_STATS,
  CACHE_TAGS.SEASON_STATS,
  CACHE_TAGS.HALF_SEASON_STATS,
  CACHE_TAGS.PLAYER_PROFILE,
  CACHE_TAGS.PERSONAL_BESTS,
  CACHE_TAGS.PLAYER_POWER_RATING,
  CACHE_TAGS.HALL_OF_FAME,
  CACHE_TAGS.HONOUR_ROLL,
  CACHE_TAGS.MATCH_REPORT,
  CACHE_TAGS.RECENT_PERFORMANCE,
]; 