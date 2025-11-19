/**
 * React Query Hook: Join Requests (Admin)
 * 
 * Fetches pending join requests for admin approval.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { apiFetch } from '@/lib/apiConfig';

export interface JoinRequest {
  id: string; // UUID from player_join_requests table
  phone: string;
  phone_number: string; // Alias for component compatibility
  name: string;
  display_name: string; // Alias for component compatibility
  selected_club: any;
  created_at: string;
}

async function fetchJoinRequests(tenantId: string | null): Promise<JoinRequest[]> {
  if (!tenantId) return [];

  const response = await apiFetch('/admin/join-requests');

  if (!response.ok) {
    throw new Error(`Failed to fetch join requests: ${response.statusText}`);
  }

  const result = await response.json();
  const requests = result.data || [];
  
  // Map API response to include aliases for component compatibility
  return requests.map((req: any) => ({
    ...req,
    phone_number: req.phone,
    display_name: req.name
  }));
}

export function useJoinRequests() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useQuery({
    queryKey: queryKeys.joinRequests(tenantId),
    queryFn: () => fetchJoinRequests(tenantId),
    staleTime: 30 * 1000, // 30 seconds (new requests come in frequently)
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutation hook for approving join requests
export function useApproveJoinRequest() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useMutation({
    mutationFn: async (data: { requestId: string; clubOverride?: any }) => {
      const response = await apiFetch('/admin/join-requests/approve', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to approve request');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate join requests list
      queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests(tenantId) });
      // Also invalidate players list (new player added)
      queryClient.invalidateQueries({ queryKey: queryKeys.players(tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playersAdmin(tenantId, false, false) });
    },
  });
}

// Mutation hook for rejecting join requests
export function useRejectJoinRequest() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile.tenantId;

  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiFetch('/admin/join-requests/reject', {
        method: 'POST',
        body: JSON.stringify({ requestId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to reject request');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate join requests list
      queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests(tenantId) });
    },
  });
}



