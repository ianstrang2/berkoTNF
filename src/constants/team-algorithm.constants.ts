// team-algorithm.constants.ts
import { TeamStructure } from '../types/team-algorithm.types';

// Team structure constants
export const TEAM_STRUCTURE: Record<string, TeamStructure> = {
  ORANGE: {
    name: 'Orange',
    slots: {
      defenders: [1, 2, 3],
      midfielders: [4, 5, 6, 7],
      attackers: [8, 9]
    }
  },
  GREEN: {
    name: 'Green',
    slots: {
      defenders: [10, 11, 12],
      midfielders: [13, 14, 15, 16],
      attackers: [17, 18]
    }
  }
};

// Initial slots setup - used when creating a new team
export const INITIAL_SLOTS = Array(18).fill(null).map((_, i) => ({
  slot_number: i + 1,
  player_id: null
}));

// Quality thresholds for balance assessment
export const BALANCE_QUALITY_THRESHOLDS = {
  EXCELLENT: 0.2,
  GOOD: 0.3,
  NOT_GREAT: 0.4
};

// Default form values
export const DEFAULT_RINGER_FORM = {
  name: '',
  goalscoring: 3,
  defending: 3,
  stamina_pace: 3,
  control: 3,
  teamwork: 3,
  resilience: 3
};

// API endpoints
export const API_ENDPOINTS = {
  PLAYERS: '/api/admin/players',
  UPCOMING_MATCHES: '/api/admin/upcoming-matches',
  MATCH_PLAYERS: '/api/admin/upcoming-match-players',
  CLEAR_MATCH_PLAYERS: '/api/admin/upcoming-match-players/clear',
  CLEAR_ACTIVE_MATCH: '/api/admin/clear-active-match',
  CREATE_PLANNED_MATCH: '/api/admin/create-planned-match',
  ADD_RINGER: '/api/admin/add-ringer',
  RECENT_MATCHES: '/api/admin/matches',
  SETTINGS: '/api/admin/settings'
};

// Default team sizes
export const DEFAULT_TEAM_SIZE = 9;

// Toast display durations
export const TOAST_DURATION = 2000;

// Balance progress timings
export const BALANCE_STEPS = {
  INITIAL: 0,
  PREPARING: 25,
  PROCESSING: 50,
  FINALIZING: 75,
  COMPLETE: 100
};

// Player positions
export const POSITIONS = {
  DEFENDER: 'defender',
  MIDFIELDER: 'midfielder',
  ATTACKER: 'attacker'
};

// Team types
export const TEAM_TYPES = {
  ORANGE: 'a',
  GREEN: 'b'
};

// Team mapping
export const TEAM_MAP = {
  a: 'A',
  b: 'B'
}; 