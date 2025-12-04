/**
 * Authentication Hook
 * 
 * Provides current user's authentication state and profile information
 * Now uses React Query for caching and deduplication!
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
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

  // Listen for auth changes including token refresh
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Log auth events for debugging session issues
      console.log(`[AUTH_EVENT] ${event}`, { 
        hasSession: !!session,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
      });
      
      // On auth events, invalidate and refetch
      // TOKEN_REFRESHED is CRITICAL - ensures app recognizes refreshed sessions
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: queryKeys.authProfile() });
      }
      
      // Log warning if session refresh fails
      if (event === 'SIGNED_OUT' && session === null) {
        console.warn('[AUTH_WARNING] Session ended - user will need to re-authenticate');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

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
