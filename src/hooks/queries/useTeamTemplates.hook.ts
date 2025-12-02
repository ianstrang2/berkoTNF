/**
 * React Query Hook: Team Templates
 * 
 * Fetches team formation templates for a given team size.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { apiFetch } from '@/lib/apiConfig';

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

  const response = await apiFetch(`/admin/team-templates?teamSize=${teamSize}`);

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
  
  // API returns array of templates - use the first one
  if (result.success && result.data && result.data.length > 0) {
    const template = result.data[0];
    return {
      defenders: template.defenders,
      midfielders: template.midfielders,
      attackers: template.attackers
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




