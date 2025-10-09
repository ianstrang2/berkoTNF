/**
 * React Query Keys Factory
 * 
 * Centralized query key management for consistent caching and deduplication
 * Each key is unique and typed for type safety
 */

export const queryKeys = {
  // Match Report API - used by multiple dashboard components
  matchReport: () => ['matchReport'] as const,
  
  // Players API - used by all dashboard components
  players: () => ['players'] as const,
  
  // Personal Bests API - used by MatchReport and PersonalBests components
  personalBests: () => ['personalBests'] as const,
  
  // App Config API - parameterized by group
  appConfig: (group?: string) => 
    group ? ['appConfig', group] as const : ['appConfig'] as const,
  
  // Stats API - used by various components
  stats: () => ['stats'] as const,
  
  // All-Time Stats API
  allTimeStats: () => ['allTimeStats'] as const,
  
  // Seasons API
  seasons: () => ['seasons'] as const,
  
  // Season Race Data API
  seasonRaceData: () => ['seasonRaceData'] as const,
  
  // Honour Roll API
  honourRoll: () => ['honourRoll'] as const,
  
  // Upcoming Matches API
  upcoming: () => ['upcoming'] as const,
  
  // Latest Player Status API
  latestPlayerStatus: () => ['latestPlayerStatus'] as const,
  
  // Player Profile API - parameterized by player ID
  playerProfile: (playerId: string) => ['playerProfile', playerId] as const,
  
  // Cache Metadata API
  cacheMetadata: () => ['cacheMetadata'] as const,
  
  // Table/Season Stats APIs
  halfSeasonStats: () => ['halfSeasonStats'] as const,
  currentStats: (year: number) => ['currentStats', year] as const,
  seasons: () => ['seasons'] as const,
  seasonRaceData: (period: 'whole_season' | 'current_half') => ['seasonRaceData', period] as const,
} as const;

// Export type for TypeScript autocomplete
export type QueryKeys = typeof queryKeys;

