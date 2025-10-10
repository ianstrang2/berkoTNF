/**
 * React Query Hook: Team Templates
 * 
 * Fetches team formation templates for a given team size.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';

interface TeamTemplate {
  defenders: number;
  midfielders: number;
  attackers: number;
}

async function fetchTeamTemplate(
  tenantId: string | null,
  teamSize: number | undefined
): Promise<TeamTemplate | null> {
  if (!tenantId || !teamSize) {
    return null;
  }

  const response = await fetch(`/api/admin/team-templates?teamSize=${teamSize}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    console.warn('Team template not found, using fallback');
    // Return default 4-3-2 formation as fallback
    return {
      defenders: Math.ceil(teamSize / 2),
      midfielders: Math.floor(teamSize / 3),
      attackers: Math.max(1, teamSize - Math.ceil(teamSize / 2) - Math.floor(teamSize / 3))
    };
  }

  const result = await response.json();
  
  if (result.success && result.data) {
    return {
      defenders: result.data.defenders,
      midfielders: result.data.midfielders,
      attackers: result.data.attackers
    };
  }

  // Fallback formation
  return {
    defenders: Math.ceil(teamSize / 2),
    midfielders: Math.floor(teamSize / 3),
    attackers: Math.max(1, teamSize - Math.ceil(teamSize / 2) - Math.floor(teamSize / 3))
  };
}

export function useTeamTemplate(teamSize: number | undefined) {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useQuery({
    queryKey: queryKeys.teamTemplate(tenantId, teamSize),
    queryFn: () => fetchTeamTemplate(tenantId, teamSize),
    staleTime: 30 * 60 * 1000, // 30 minutes (templates rarely change)
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: !!teamSize, // Only fetch if teamSize is provided
  });
}

