/**
 * React Query Configuration
 * 
 * Centralized query client with optimized defaults for performance
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 5 minutes - no refetch during this time
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // Cache retained for 10 minutes after last use
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      
      // Retry failed requests once
      retry: 1,
      
      // Don't refetch on window focus (reduces unnecessary requests)
      refetchOnWindowFocus: false,
      
      // Don't refetch on reconnect unless data is stale
      refetchOnReconnect: 'always',
      
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

