'use client';

import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChatContainer } from '@/components/chat';
import { apiFetch } from '@/lib/apiConfig';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthContext } from '@/contexts/AuthContext';

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  
  // Mark messages as read when page loads and invalidate unread count
  useEffect(() => {
    const markAsRead = async () => {
      try {
        await apiFetch('/chat/mark-read', { method: 'POST' });
        // Invalidate the unread count to update the badge
        queryClient.invalidateQueries({ queryKey: queryKeys.chatUnreadCount(profile.tenantId) });
      } catch (err) {
        console.error('Failed to mark messages as read:', err);
      }
    };
    
    if (profile.isAuthenticated && profile.tenantId) {
      markAsRead();
    }
  }, [queryClient, profile.isAuthenticated, profile.tenantId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">Team Chat</h1>
      </div>
      
      {/* Chat container - takes remaining height */}
      <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 60px - 80px)' }}>
        <ChatContainer />
      </div>
    </div>
  );
}
