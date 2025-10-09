/**
 * useMatchReport Hook
 * 
 * Fetches match report data with automatic caching and deduplication
 * Used by: MatchReport, PersonalBests, Milestones, CurrentForm components
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface MatchInfo {
  match_date: string;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string[];
  team_b_players: string[];
  team_a_scorers?: string;
  team_b_scorers?: string;
}

interface Milestone {
  name: string;
  games_played?: number;
  total_games?: number;
  total_goals?: number;
  value?: number;
}

interface Streak {
  name: string;
  streak_count: number;
  streak_type: 'win' | 'loss' | 'unbeaten' | 'winless';
}

interface GoalStreak {
  name: string;
  matches_with_goals: number;
  goals_in_streak: number;
}

interface LeaderData {
  change_type: 'new_leader' | 'tied' | 'remains' | 'overtake';
  new_leader: string;
  previous_leader?: string;
  new_leader_goals?: number;
  new_leader_points?: number;
  previous_leader_goals?: number;
  previous_leader_points?: number;
  value?: number;
}

interface FeatBreakingItem {
  player_id: number | string;
  player_name: string;
  feat_type: string;
  status: 'broken' | 'equaled';
  new_value: number;
  current_record: number;
}

export interface MatchReportData {
  matchInfo: MatchInfo;
  gamesMilestones?: Milestone[];
  goalsMilestones?: Milestone[];
  streaks?: Streak[];
  goalStreaks?: GoalStreak[];
  halfSeasonGoalLeaders?: LeaderData[];
  halfSeasonFantasyLeaders?: LeaderData[];
  seasonGoalLeaders?: LeaderData[];
  seasonFantasyLeaders?: LeaderData[];
  on_fire_player_id?: string | null;
  grim_reaper_player_id?: string | null;
  featBreakingData?: FeatBreakingItem[];
}

interface MatchReportResponse {
  success: boolean;
  data: MatchReportData | null;
  error?: string;
}

async function fetchMatchReport(tenantId: string | null): Promise<MatchReportData | null> {
  // Gracefully handle missing tenantId
  if (!tenantId) {
    return null;
  }
  
  const response = await fetch('/api/matchReport');
  
  if (!response.ok) {
    // Don't throw error for 404 - new tenants may not have data yet
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Match report API returned ${response.status}`);
  }
  
  const result: MatchReportResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch match report');
  }
  
  return result.data;
}

export function useMatchReport() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.matchReport(tenantId),
    queryFn: () => fetchMatchReport(tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    // NO enabled condition - queryFn handles missing tenantId gracefully
  });
}

