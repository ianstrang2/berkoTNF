/**
 * useAuthProfile Hook
 * 
 * Fetches user authentication profile with automatic caching and deduplication
 * Used by: useAuth hook, AuthContext
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface AuthProfileData {
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
    linkedPlayerId: number | null;
    canSwitchRoles: boolean;
  };
}

async function fetchAuthProfile(): Promise<AuthProfileData | null> {
  const response = await fetch('/api/auth/profile', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Not authenticated - return null
      return null;
    }
    throw new Error(`Auth profile API returned ${response.status}`);
  }
  
  const result: AuthProfileData = await response.json();
  
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


