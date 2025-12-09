'use client';

import React from 'react';
import { ChatContainer } from '@/components/chat';

export default function ChatPage() {
  // Note: mark-read is handled inside ChatContainer after initial load
  // Badge invalidation is handled via useChatUnreadCount hook's invalidation

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Chat container - takes full height minus bottom nav */}
      <ChatContainer />
    </div>
  );
}
