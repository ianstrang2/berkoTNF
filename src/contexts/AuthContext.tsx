/**
 * Authentication Context
 * 
 * Provides authentication state across the app without refetching.
 * The auth state change listener is ONLY set up here (once), not in useAuth.
 */

'use client';

import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useAuth, UserProfile } from '@/hooks/useAuth.hook';
import { QueryObserverResult, useQueryClient } from '@tanstack/react-query';
import { AuthProfileData } from '@/hooks/queries/useAuthProfile.hook';
import { supabase } from '@/lib/supabaseClient';
import { queryKeys } from '@/lib/queryKeys';

interface AuthContextType {
  profile: UserProfile;
  loading: boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<QueryObserverResult<AuthProfileData | null, Error>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const lastInvalidationRef = useRef(0);

  // Listen for auth changes including token refresh - ONLY ONCE in the provider
  useEffect(() => {
    const DEBOUNCE_MS = 1000; // Don't invalidate more than once per second
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // On auth events, invalidate and refetch profile
      // TOKEN_REFRESHED is CRITICAL - ensures app recognizes refreshed sessions
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        const now = Date.now();
        if (now - lastInvalidationRef.current > DEBOUNCE_MS) {
          lastInvalidationRef.current = now;
          queryClient.invalidateQueries({ queryKey: queryKeys.authProfile() });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

