/**
 * useHonourRoll Hook
 * 
 * Fetches honour roll data (season winners, top scorers, records) 
 * with automatic caching and deduplication
 * Used by: Legends and Feats components
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { apiFetch } from '@/lib/apiConfig';

export interface Runner {
  name: string;
  points?: number;
  goals?: number;
  selected_club?: {
    name: string;
    filename: string;
  } | null;
}

export interface SeasonWinner {
  season_id: number;
  season_name: string;
  winners: {
    winner: string;
    winner_points: number;
    selected_club?: {
      name: string;
      filename: string;
    } | null;
    runners_up?: Runner[];
  };
}

export interface TopScorer {
  season_id: number;
  season_name: string;
  scorers: {
    winner: string;
    winner_goals: number;
    selected_club?: {
      name: string;
      filename: string;
    } | null;
    runners_up?: Runner[];
  };
}

export interface StreakHolder {
  name: string;
  streak: number;
  start_date: string;
  end_date: string;
  selected_club?: {
    name: string;
    filename: string;
  } | null;
}

export interface GoalRecord {
  name: string;
  goals: number;
  date: string;
  selected_club?: {
    name: string;
    filename: string;
  } | null;
}

export interface BiggestVictory {
  date: string;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string;
  team_b_players: string;
  winning_team: 'A' | 'B';
}

export interface Records {
  most_goals_in_game?: GoalRecord[];
  consecutive_goals_streak?: StreakHolder[];
  attendance_streak?: StreakHolder[];
  biggest_victory?: BiggestVictory[];
  streaks?: {
    'Win Streak'?: {
      holders: StreakHolder[];
    };
    'Losing Streak'?: {
      holders: StreakHolder[];
    };
    'Winless Streak'?: {
      holders: StreakHolder[];
    };
    'Undefeated Streak'?: {
      holders: StreakHolder[];
    };
  };
}

export interface HonourRollData {
  seasonWinners: SeasonWinner[];
  topScorers: TopScorer[];
  records: Array<{ records: Records }>;
}

interface HonourRollResponse {
  data: HonourRollData;
}

async function fetchHonourRoll(tenantId: string | null): Promise<HonourRollData> {
  // Gracefully handle missing tenantId
  if (!tenantId) {
    return { seasonWinners: [], topScorers: [], records: [] };
  }
  
  const response = await apiFetch('/honourroll');
  
  if (!response.ok) {
    throw new Error(`Honour roll API returned ${response.status}`);
  }
  
  const result: HonourRollResponse = await response.json();
  
  return result.data;
}

export function useHonourRoll() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.honourRoll(tenantId),
    queryFn: () => fetchHonourRoll(tenantId),
    staleTime: 10 * 60 * 1000, // 10 minutes - honour roll updates infrequently
    // NO enabled condition - queryFn handles missing tenantId gracefully
  });
}

