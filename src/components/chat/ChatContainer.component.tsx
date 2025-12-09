'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { useAuthContext } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/apiConfig';
import ChatMessage, { ChatMessageData, MessageReaction } from './ChatMessage.component';
import ChatInput from './ChatInput.component';

interface Player {
  id: number;
  name: string;
}

const MESSAGES_PER_PAGE = 50;

const ChatContainer: React.FC = () => {
  const { profile } = useAuthContext();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerMap, setPlayerMap] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewMessagesBanner, setShowNewMessagesBanner] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<number | null>(null);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const isNearBottomRef = useRef(true);
  const initialLoadDoneRef = useRef(false);

  // Fetch current player ID
  useEffect(() => {
    const fetchCurrentPlayer = async () => {
      try {
        const response = await apiFetch('/auth/profile');
        const data = await response.json();
        if (data.success && data.profile?.linkedPlayerId) {
          setCurrentPlayerId(data.profile.linkedPlayerId);
        }
      } catch (err) {
        console.error('Failed to fetch current player:', err);
      }
    };
    
    if (profile.isAuthenticated) {
      fetchCurrentPlayer();
    }
  }, [profile.isAuthenticated]);

  // Fetch players for mentions
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await apiFetch('/players?activeOnly=true');
        const data = await response.json();
        if (data.success && data.players) {
          const playerList = data.players.map((p: any) => ({
            id: p.player_id || p.id,
            name: p.name
          }));
          setPlayers(playerList);
          setPlayerMap(new Map(playerList.map((p: Player) => [p.id, p.name])));
        }
      } catch (err) {
        console.error('Failed to fetch players:', err);
      }
    };
    
    fetchPlayers();
  }, []);

  // Fetch initial messages
  const fetchMessages = useCallback(async (before?: string) => {
    try {
      const url = before 
        ? `/chat/messages?limit=${MESSAGES_PER_PAGE}&before=${before}`
        : `/chat/messages?limit=${MESSAGES_PER_PAGE}`;
      
      const response = await apiFetch(url);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch messages');
      }
      
      return {
        messages: data.messages as ChatMessageData[],
        hasMore: data.hasMore as boolean
      };
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadInitialMessages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { messages: newMessages, hasMore: more } = await fetchMessages();
        // Reverse to show oldest first (API returns newest first)
        setMessages(newMessages.reverse());
        setHasMore(more);
        initialLoadDoneRef.current = true;
        
        // Mark as read
        await apiFetch('/chat/mark-read', { method: 'POST' });
      } catch (err: any) {
        setError(err.message || 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialMessages();
  }, [fetchMessages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && initialLoadDoneRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [loading]);

  // Setup Supabase Realtime subscription
  useEffect(() => {
    if (!profile.tenantId) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables not set');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${profile.tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `tenant_id=eq.${profile.tenantId}`
        },
        async (payload) => {
          // Fetch the full message with author info
          const response = await apiFetch(`/chat/messages?limit=1`);
          const data = await response.json();
          
          if (data.success && data.messages.length > 0) {
            const newMessage = data.messages[0];
            
            setMessages(prev => {
              // Check if message already exists
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
            
            // Show banner if not scrolled to bottom
            if (!isNearBottomRef.current) {
              setShowNewMessagesBanner(true);
            } else {
              // Auto-scroll to new message
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `tenant_id=eq.${profile.tenantId}`
        },
        (payload) => {
          // Handle message updates (e.g., soft delete)
          setMessages(prev => prev.map(m => {
            if (m.id === payload.new.id) {
              return {
                ...m,
                isDeleted: !!payload.new.deleted_at,
                content: payload.new.deleted_at ? '[This message was deleted]' : m.content
              };
            }
            return m;
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_reactions',
          filter: `tenant_id=eq.${profile.tenantId}`
        },
        async (payload) => {
          // Refetch reactions for the affected message
          const messageId = payload.new?.message_id || payload.old?.message_id;
          if (!messageId) return;
          
          // Simple approach: refetch the message to get updated reactions
          // Could optimize by updating in place
          const response = await apiFetch(`/chat/messages?limit=${MESSAGES_PER_PAGE}`);
          const data = await response.json();
          
          if (data.success) {
            setMessages(prev => {
              const newMessagesMap = new Map(data.messages.map((m: ChatMessageData) => [m.id, m]));
              return prev.map(m => {
                const updated = newMessagesMap.get(m.id);
                return updated ? { ...m, reactions: updated.reactions } : m;
              });
            });
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [profile.tenantId]);

  // Handle scroll for infinite load and new message detection
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if near bottom
    const threshold = 100;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    isNearBottomRef.current = isNearBottom;
    
    if (isNearBottom) {
      setShowNewMessagesBanner(false);
    }

    // Load more when scrolled to top
    if (container.scrollTop < 50 && hasMore && !loadingMore && messages.length > 0) {
      loadMoreMessages();
    }
  }, [hasMore, loadingMore, messages.length]);

  // Load older messages
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    
    setLoadingMore(true);
    const oldestMessage = messages[0];
    const scrollContainer = messagesContainerRef.current;
    const scrollHeightBefore = scrollContainer?.scrollHeight || 0;
    
    try {
      const { messages: olderMessages, hasMore: more } = await fetchMessages(oldestMessage.id);
      
      if (olderMessages.length > 0) {
        // Prepend older messages (reversed since API returns newest first)
        setMessages(prev => [...olderMessages.reverse(), ...prev]);
        setHasMore(more);
        
        // Maintain scroll position
        setTimeout(() => {
          if (scrollContainer) {
            const scrollHeightAfter = scrollContainer.scrollHeight;
            scrollContainer.scrollTop = scrollHeightAfter - scrollHeightBefore;
          }
        }, 0);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMessagesBanner(false);
  };

  // Send message
  const handleSend = async (content: string, mentions: number[]) => {
    try {
      const response = await apiFetch('/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ content, mentions })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send message');
      }
      
      // Message will appear via Realtime subscription
      // But also add optimistically for immediate feedback
      const newMessage: ChatMessageData = {
        id: data.message.id,
        content: data.message.content,
        isDeleted: false,
        isSystemMessage: false,
        author: data.message.author,
        mentions: data.message.mentions,
        createdAt: data.message.createdAt,
        reactions: []
      };
      
      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      
      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message');
    }
  };

  // React to message
  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const response = await apiFetch(`/chat/messages/${messageId}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to react');
      }
      
      // Update will come via Realtime, but update optimistically
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId || !currentPlayerId) return m;
        
        const reactions = [...m.reactions];
        const existingIdx = reactions.findIndex(r => r.emoji === emoji);
        
        if (data.action === 'added') {
          if (existingIdx >= 0) {
            reactions[existingIdx] = {
              ...reactions[existingIdx],
              count: reactions[existingIdx].count + 1,
              playerIds: [...reactions[existingIdx].playerIds, currentPlayerId]
            };
          } else {
            reactions.push({ emoji, count: 1, playerIds: [currentPlayerId] });
          }
        } else {
          if (existingIdx >= 0) {
            const newCount = reactions[existingIdx].count - 1;
            if (newCount === 0) {
              reactions.splice(existingIdx, 1);
            } else {
              reactions[existingIdx] = {
                ...reactions[existingIdx],
                count: newCount,
                playerIds: reactions[existingIdx].playerIds.filter(id => id !== currentPlayerId)
              };
            }
          }
        }
        
        return { ...m, reactions };
      }));
      
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  // Delete message
  const handleDelete = async (messageId: string) => {
    try {
      const response = await apiFetch(`/chat/messages/${messageId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete message');
      }
      
      // Update optimistically
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return { ...m, isDeleted: true, content: '[This message was deleted]', reactions: [] };
        }
        return m;
      }));
      
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent" />
          <p className="mt-2 text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load chat</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No chat yet?</h3>
            <p className="text-gray-500 mb-4">Be the first to say something!</p>
          </div>
        </div>
        
        <ChatInput 
          onSend={handleSend} 
          players={players}
          disabled={!currentPlayerId}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages list */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-purple-600 border-r-transparent" />
          </div>
        )}
        
        {/* No more messages indicator */}
        {!hasMore && messages.length > 0 && (
          <div className="text-center py-4 text-sm text-gray-400">
            Beginning of chat history
          </div>
        )}
        
        {/* Messages */}
        <div className="py-2">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              currentPlayerId={currentPlayerId || 0}
              isAdmin={profile.isAdmin}
              onReact={handleReact}
              onDelete={handleDelete}
              playerMap={playerMap}
            />
          ))}
        </div>
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* New messages banner */}
      {showNewMessagesBanner && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={scrollToBottom}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-full shadow-lg hover:bg-purple-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            New messages
          </button>
        </div>
      )}

      {/* Input area */}
      <ChatInput 
        onSend={handleSend} 
        players={players}
        disabled={!currentPlayerId}
      />
    </div>
  );
};

export default ChatContainer;

