/**
 * Authentication Hook
 * 
 * Provides current user's authentication state and profile information.
 * Uses React Query for caching and deduplication.
 * 
 * NOTE: The auth state change listener is in AuthContext.tsx (runs once only).
 * Do NOT add onAuthStateChange here - it would multiply with each hook call!
 */

'use client';

import { useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthProfile } from './queries/useAuthProfile.hook';
import { useQueryClient } from '@tanstack/react-query';

export interface UserProfile {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperadmin: boolean;
  isPlayer: boolean;
  userRole: 'superadmin' | 'admin' | 'player' | null;
  tenantId: string | null;
  tenantName: string | null;
  clubCode: string | null;
  displayName: string | null;
  linkedPlayerId: number | null;
  canSwitchRoles: boolean;
  userId: string | null;
  email: string | null;
  phone: string | null;
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  // Use React Query hook for profile fetching - automatic deduplication!
  const { data: authData, isLoading, refetch } = useAuthProfile();

  // Transform API response to UserProfile format
  const profile = useMemo<UserProfile>(() => {
    if (!authData) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        isSuperadmin: false,
        isPlayer: false,
        userRole: null,
        tenantId: null,
        tenantName: null,
        clubCode: null,
        displayName: null,
        linkedPlayerId: null,
        canSwitchRoles: false,
        userId: null,
        email: null,
        phone: null,
      };
    }

    const userRole = authData.profile.isAdmin
      ? authData.profile.adminRole
      : authData.user.phone
      ? 'player'
      : null;

    return {
      isAuthenticated: true,
      isAdmin: authData.profile.isAdmin,
      isSuperadmin: authData.profile.adminRole === 'superadmin',
      isPlayer: !authData.profile.isAdmin && !!authData.user.phone,
      userRole,
      tenantId: authData.profile.tenantId,
      tenantName: authData.profile.tenantName,
      clubCode: authData.profile.clubCode,
      displayName: authData.profile.displayName,
      linkedPlayerId: authData.profile.linkedPlayerId,
      canSwitchRoles: authData.profile.canSwitchRoles,
      userId: authData.user.id,
      email: authData.user.email,
      phone: authData.user.phone,
    };
  }, [authData]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('userProfile');
    queryClient.clear(); // Clear all queries on logout
  }, [queryClient]);

  const handleRefetch = useCallback(() => refetch(), [refetch]);

  return useMemo(() => ({
    profile,
    loading: isLoading,
    logout,
    refetch: handleRefetch,
  }), [profile, isLoading, logout, handleRefetch]);
}
