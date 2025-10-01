/**
 * Authentication Hook
 * 
 * Provides current user's authentication state and profile information
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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
  const [profile, setProfile] = useState<UserProfile>({
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
  });
  const [loading, setLoading] = useState(true);

  const supabase = createClientComponentClient();
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    // Check for cached profile first
    const cachedProfile = localStorage.getItem('userProfile');
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        setProfile(parsed);
        setLoading(false);
      } catch (e) {
        // Invalid cache, ignore
      }
    }

    // Only fetch if we haven't already
    if (!hasFetched) {
      fetchProfile();
      setHasFetched(true);
    }

    // Listen for auth changes (login/logout only, not on every navigation)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // Only refetch on actual auth events, not session refresh
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        fetchProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hasFetched]);

  const fetchProfile = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setProfile({
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
        });
        setLoading(false);
        return;
      }

      // Fetch full profile from API (only once per session)
      const response = await fetch('/api/auth/profile', {
        cache: 'no-store', // Don't cache API calls
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();

      const userRole = data.profile.isAdmin
        ? data.profile.adminRole
        : data.user.phone
        ? 'player'
        : null;

      const newProfile = {
        isAuthenticated: true,
        isAdmin: data.profile.isAdmin,
        isSuperadmin: data.profile.adminRole === 'superadmin',
        isPlayer: !data.profile.isAdmin && !!data.user.phone,
        userRole,
        tenantId: data.profile.tenantId,
        displayName: data.profile.displayName,
        linkedPlayerId: data.profile.linkedPlayerId,
        canSwitchRoles: data.profile.canSwitchRoles,
        userId: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
      };
      
      setProfile(newProfile);
      
      // Cache profile to prevent flickering on navigation
      localStorage.setItem('userProfile', JSON.stringify(newProfile));
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('userProfile');
    setProfile({
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
    });
  };

  return {
    profile,
    loading,
    logout,
    refetch: fetchProfile,
  };
}
