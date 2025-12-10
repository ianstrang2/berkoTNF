'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiConfig';
import { useAuthContext } from '@/contexts/AuthContext';

interface HomeBadgeResponse {
  success: boolean;
  hasNewReport: boolean;
  latestMatchId?: number;
  lastViewedMatchId?: number | null;
  error?: string;
}

// Separate query key for home badge (not in queryKeys.ts to keep it simple)
const HOME_BADGE_KEY = ['homeBadge'] as const;

/**
 * Hook to check if there's a new match report to view (for Home badge).
 * Polls every 60 seconds when the user is authenticated.
 */
export function useHomeBadge() {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...HOME_BADGE_KEY, profile.tenantId],
    queryFn: async () => {
      const response = await apiFetch('/home/badge');
      const data: HomeBadgeResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to check home badge');
      }
      
      return data.hasNewReport;
    },
    enabled: profile.isAuthenticated && !!profile.tenantId,
    refetchInterval: 60000, // Poll every 60 seconds (less frequent than chat)
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  return {
    hasNewReport: data ?? false,
    isLoading,
    error,
    refetch,
    clearBadge: () => {
      // Optimistically clear the badge in cache
      queryClient.setQueryData([...HOME_BADGE_KEY, profile.tenantId], false);
    }
  };
}

/**
 * Hook to mark the dashboard as viewed (clears Home badge).
 * Call this when the Dashboard component mounts.
 */
export function useMarkHomeViewed() {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();
  const markedRef = useRef(false);

  useEffect(() => {
    // Only run once per mount and when authenticated
    if (!profile.isAuthenticated || !profile.tenantId || markedRef.current) {
      return;
    }
    
    markedRef.current = true;

    const markViewed = async () => {
      try {
        const response = await apiFetch('/home/mark-viewed', {
          method: 'POST'
        });
        
        if (response.ok) {
          // Clear the badge in cache
          queryClient.setQueryData([...HOME_BADGE_KEY, profile.tenantId], false);
        }
      } catch (error) {
        // Silently fail - don't break the dashboard
        console.error('Failed to mark home as viewed:', error);
      }
    };

    markViewed();
  }, [profile.isAuthenticated, profile.tenantId, queryClient]);
}

