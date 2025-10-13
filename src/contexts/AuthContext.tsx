/**
 * Authentication Context
 * 
 * Provides authentication state across the app without refetching
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, UserProfile } from '@/hooks/useAuth.hook';
import { QueryObserverResult } from '@tanstack/react-query';
import { AuthProfileData } from '@/hooks/queries/useAuthProfile.hook';

interface AuthContextType {
  profile: UserProfile;
  loading: boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<QueryObserverResult<AuthProfileData | null, Error>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();

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

