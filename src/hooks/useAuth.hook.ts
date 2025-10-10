/**
 * Authentication Hook
 * 
 * Provides current user's authentication state and profile information
 * Now uses React Query for caching and deduplication!
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuthProfile } from './queries/useAuthProfile.hook';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface UserProfile {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperadmin: boolean;
  isPlayer: boolean;
  userRole: 'superadmin' | 'admin' | 'player' | null;
  tenantId: string | null;
  displayName: string | null;
  linkedPlayerId: number | null;
  canSwitchRoles: boolean;
  userId: string | null;
  email: string | null;
  phone: string | null;
}

export function useAuth() {
  const supabase = createClientComponentClient();
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
      displayName: authData.profile.displayName,
      linkedPlayerId: authData.profile.linkedPlayerId,
      canSwitchRoles: authData.profile.canSwitchRoles,
      userId: authData.user.id,
      email: authData.user.email,
      phone: authData.user.phone,
    };
  }, [authData]);

  // Listen for auth changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // On auth events, invalidate and refetch
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        queryClient.invalidateQueries({ queryKey: queryKeys.authProfile() });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, queryClient]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('userProfile');
    queryClient.clear(); // Clear all queries on logout
  }, [supabase, queryClient]);

  const handleRefetch = useCallback(() => refetch(), [refetch]);

  return useMemo(() => ({
    profile,
    loading: isLoading,
    logout,
    refetch: handleRefetch,
  }), [profile, isLoading, logout, handleRefetch]);
}
