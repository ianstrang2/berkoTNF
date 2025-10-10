/**
 * React Query Keys Factory
 * 
 * Centralized query key management for consistent caching and deduplication
 * Each key is unique and typed for type safety
 * 
 * CRITICAL: All keys MUST include tenantId for multi-tenant isolation!
 * This prevents cached data from one tenant being served to another tenant.
 */

export const queryKeys = {
  // Match Report API - used by multiple dashboard components
  matchReport: (tenantId: string | null) => ['matchReport', tenantId] as const,
  
  // Players API - used by all dashboard components
  players: (tenantId: string | null) => ['players', tenantId] as const,
  
  // Personal Bests API - used by MatchReport and PersonalBests components
  personalBests: (tenantId: string | null) => ['personalBests', tenantId] as const,
  
  // App Config API - parameterized by group
  appConfig: (tenantId: string | null, group?: string) => 
    group ? ['appConfig', tenantId, group] as const : ['appConfig', tenantId] as const,
  
  // Stats API - used by various components
  stats: (tenantId: string | null) => ['stats', tenantId] as const,
  
  // All-Time Stats API
  allTimeStats: (tenantId: string | null) => ['allTimeStats', tenantId] as const,
  
  // Seasons API
  seasons: (tenantId: string | null) => ['seasons', tenantId] as const,
  
  // Season Race Data API
  seasonRaceData: (tenantId: string | null) => ['seasonRaceData', tenantId] as const,
  
  // Honour Roll API
  honourRoll: (tenantId: string | null) => ['honourRoll', tenantId] as const,
  
  // Upcoming Matches API
  upcoming: (tenantId: string | null) => ['upcoming', tenantId] as const,
  upcomingMatchDetails: (tenantId: string | null, matchId: number | null) => 
    ['upcomingMatchDetails', tenantId, matchId] as const,
  
  // Latest Player Status API
  latestPlayerStatus: (tenantId: string | null) => ['latestPlayerStatus', tenantId] as const,
  
  // Player Profile API - parameterized by player ID
  playerProfile: (tenantId: string | null, playerId: string) => ['playerProfile', tenantId, playerId] as const,
  
  // Cache Metadata API
  cacheMetadata: (tenantId: string | null) => ['cacheMetadata', tenantId] as const,
  
  // Auth APIs - NO tenant_id (auth is global)
  authProfile: () => ['authProfile'] as const,
  
  // Table/Season Stats APIs
  halfSeasonStats: (tenantId: string | null) => ['halfSeasonStats', tenantId] as const,
  currentStats: (tenantId: string | null, year: number) => ['currentStats', tenantId, year] as const,
  currentSeason: (tenantId: string | null) => ['currentSeason', tenantId] as const,
  seasonRaceData: (tenantId: string | null, period: 'whole_season' | 'current_half') => ['seasonRaceData', tenantId, period] as const,
  
  // Records Screen APIs
  allTimeStats: (tenantId: string | null) => ['allTimeStats', tenantId] as const,
  honourRoll: (tenantId: string | null) => ['honourRoll', tenantId] as const,
} as const;

// Export type for TypeScript autocomplete
export type QueryKeys = typeof queryKeys;

