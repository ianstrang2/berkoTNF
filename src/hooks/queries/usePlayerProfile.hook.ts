/**
 * React Query Hook: Player Profile
 * 
 * Fetches comprehensive player profile data including:
 * - Career statistics
 * - Personal records
 * - Yearly performance
 * - Teammate chemistry
 * - Current streaks
 * - League normalization data
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface PlayerProfileData {
  name: string;
  games_played: number;
  fantasy_points: number;
  most_game_goals: number;
  most_game_goals_date: string;
  most_season_goals: number;
  most_season_goals_year: string;
  win_streak: number;
  win_streak_dates: string;
  losing_streak: number;
  losing_streak_dates: string;
  undefeated_streak: number;
  undefeated_streak_dates: string;
  winless_streak: number;
  winless_streak_dates: string;
  selected_club: any;
  yearly_stats: any[];
  teammate_chemistry: any[];
  current_streaks: any;
  league_normalization: any;
  streak_records: any;
  power_ratings: any;
  profile_text: string | null;
  profile_generated_at: string | null;
  is_retired: boolean;
}

async function fetchPlayerProfile(
  playerId: number | null | undefined,
  tenantId: string | null
): Promise<PlayerProfileData | null> {
  if (!playerId || !tenantId) {
    return null;
  }

  const response = await fetch(`/api/playerprofile?id=${playerId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export function usePlayerProfile(playerId: number | null | undefined) {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useQuery({
    queryKey: queryKeys.playerProfile(tenantId, playerId),
    queryFn: () => fetchPlayerProfile(playerId, tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes (profile data doesn't change often)
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
  });
}

