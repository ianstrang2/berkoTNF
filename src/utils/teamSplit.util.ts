// Team split utility functions for uneven teams support
// Single source of truth for all team size limits and calculations

export const MIN_PLAYERS = 8;
export const MAX_PLAYERS = 22;
export const MIN_TEAM = 4;
export const MIN_CHART_PLAYERS = 10; // Minimum for TornadoChart display

export function splitSizesFromPool(poolSize: number): { a: number; b: number } {
  return { 
    a: Math.floor(poolSize / 2), 
    b: Math.ceil(poolSize / 2) 
  };
}

// Unified CTA enablement logic using constants
export function getPoolValidation(poolSize: number) {
  const disabled = poolSize > MAX_PLAYERS;  // only hard-cap disables button
  const blocked = poolSize < MIN_PLAYERS;   // handled by the single modal
  return { disabled, blocked };
}

// Type safety for team assignments
export type Team = 'Unassigned' | 'A' | 'B';

export const COPY_CONSTANTS = {
  ABILITY_RESTRICTION: 'Not available for 4v4/uneven teams. Use Performance or Random.',
  PERFORMANCE_RANDOM_ONLY: 'Performance/Random only'
} as const;

export const TEAM_LABELS = {
  A: 'Orange',
  B: 'Green'
} as const;