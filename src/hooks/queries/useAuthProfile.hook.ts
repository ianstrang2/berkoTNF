/**
 * useAuthProfile Hook
 * 
 * Fetches user authentication profile with automatic caching and deduplication
 * Used by: useAuth hook, AuthContext
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { apiFetch } from '@/lib/apiConfig';

export interface AuthProfileData {
  user: {
    id: string;
    email: string | null;
    phone: string | null;
  };
  profile: {
    isAuthenticated: boolean;
    isAdmin: boolean;
    isSuperadmin: boolean;
    adminRole: 'superadmin' | 'admin' | null;
    displayName: string | null;
    tenantId: string | null;
    tenantName: string | null;
    clubCode: string | null;
    linkedPlayerId: number | null;
    canSwitchRoles: boolean;
  };
}

async function fetchAuthProfile(): Promise<AuthProfileData | null> {
  console.log('[AUTH_PROFILE] Fetching auth profile...');
  const response = await apiFetch('/auth/profile');
  
  if (!response.ok) {
    if (response.status === 401) {
      // Not authenticated - return null
      console.log('[AUTH_PROFILE] Not authenticated (401)');
      return null;
    }
    console.error(`[AUTH_PROFILE] API error: ${response.status}`);
    throw new Error(`Auth profile API returned ${response.status}`);
  }
  
  const result: AuthProfileData = await response.json();
  console.log('[AUTH_PROFILE] Profile loaded successfully', { 
    userId: result.user.id,
    isAdmin: result.profile.isAdmin,
    tenantId: result.profile.tenantId 
  });
  
  return result;
}

export function useAuthProfile() {
  return useQuery({
    queryKey: queryKeys.authProfile(),
    queryFn: fetchAuthProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes - profile doesn't change often
    retry: false, // Don't retry auth failures
  });
}


