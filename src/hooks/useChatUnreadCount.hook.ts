'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiConfig';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthContext } from '@/contexts/AuthContext';

interface UnreadCountResponse {
  success: boolean;
  unreadCount: number;
  error?: string;
}

/**
 * Hook to fetch unread chat message count for badge display.
 * Polls every 30 seconds when the user is authenticated.
 */
export function useChatUnreadCount() {
  const { profile } = useAuthContext();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.chatUnreadCount(profile.tenantId),
    queryFn: async () => {
      const response = await apiFetch('/chat/unread-count');
      const data: UnreadCountResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch unread count');
      }
      
      return data.unreadCount;
    },
    enabled: profile.isAuthenticated && !!profile.tenantId,
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  return {
    unreadCount: data ?? 0,
    isLoading,
    error,
    refetch,
  };
}

