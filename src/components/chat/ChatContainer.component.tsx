'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/apiConfig';
import { queryKeys } from '@/lib/queryKeys';
import ChatMessage, { ChatMessageData, MessageReaction } from './ChatMessage.component';
import ChatInput from './ChatInput.component';

interface Player {
  id: number;
  name: string;
}

const MESSAGES_PER_PAGE = 50;

/**
 * Format date for WhatsApp-style date separator
 * - Today: "Today"
 * - Yesterday: "Yesterday"
 * - Within last 7 days: Day name (e.g., "Friday")
 * - Older: Full date (e.g., "Wed, 3 Dec")
 */
const formatDateSeparator = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  
  // Reset times to midnight for date comparison
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffDays = Math.floor((today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    // Day name for within last week
    return date.toLocaleDateString('en-GB', { weekday: 'long' });
  } else {
    // Full date for older messages
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
};

/**
 * Check if two dates are on the same calendar day
 */
const isSameDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

/**
 * Represents either a single message or a collapsed group of deleted messages
 */
type MessageOrCollapsed = 
  | { type: 'message'; message: ChatMessageData }
  | { type: 'collapsed'; count: number; createdAt: string; id: string };

/**
 * Process messages to collapse consecutive deleted messages
 * Groups of 2+ consecutive deleted messages become a single "[X messages deleted]" entry
 */
const collapseDeletedMessages = (messages: ChatMessageData[]): MessageOrCollapsed[] => {
  const result: MessageOrCollapsed[] = [];
  let i = 0;
  
  while (i < messages.length) {
    const current = messages[i];
    
    if (current.isDeleted) {
      // Count consecutive deleted messages
      let count = 1;
      while (i + count < messages.length && messages[i + count].isDeleted) {
        count++;
      }
      
      if (count >= 2) {
        // Collapse into single entry
        result.push({
          type: 'collapsed',
          count,
          createdAt: current.createdAt,
          id: `collapsed-${current.id}`
        });
        i += count;
      } else {
        // Single deleted message, show normally
        result.push({ type: 'message', message: current });
        i++;
      }
    } else {
      // Normal message
      result.push({ type: 'message', message: current });
      i++;
    }
  }
  
  return result;
};

const ChatContainer: React.FC = () => {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerMap, setPlayerMap] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewMessagesBanner, setShowNewMessagesBanner] = useState(false);
  
  // Get current player ID from auth context (no extra API call needed!)
  const currentPlayerId = profile.linkedPlayerId;
  const tenantId = profile.tenantId;
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const isNearBottomRef = useRef(true);
  const fetchingRef = useRef(false);
  const playersLoadingRef = useRef(false);

  // Fetch players for mentions (only once, with loading guard)
  useEffect(() => {
    // Skip if already have players or already loading
    if (players.length > 0 || playersLoadingRef.current) return;
    playersLoadingRef.current = true;
    
    const fetchPlayers = async () => {
      try {
        const response = await apiFetch('/players?activeOnly=true');
        const data = await response.json();
        // API returns { data: [...] } format
        const playersArray = data.data || data.players || [];
        if (playersArray.length > 0) {
          const playerList = playersArray.map((p: any) => ({
            id: parseInt(p.player_id || p.id, 10),
            name: p.name
          }));
          setPlayers(playerList);
          setPlayerMap(new Map(playerList.map((p: Player) => [p.id, p.name])));
        }
      } catch (err) {
        console.error('Failed to fetch players:', err);
      } finally {
        playersLoadingRef.current = false;
      }
    };
    
    fetchPlayers();
  }, [players.length]);

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

  // Initial load (only once, with loading guard)
  useEffect(() => {
    // Skip if already have messages or already fetching
    if (messages.length > 0 || fetchingRef.current) return;
    fetchingRef.current = true;
    
    const loadInitialMessages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { messages: newMessages, hasMore: more } = await fetchMessages();
        // Reverse to show oldest first (API returns newest first)
        setMessages(newMessages.reverse());
        setHasMore(more);
        
        // Mark as read and invalidate badge (fire and forget)
        apiFetch('/chat/mark-read', { method: 'POST' })
          .then(() => {
            if (tenantId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.chatUnreadCount(tenantId) });
            }
          })
          .catch(err => console.error('Failed to mark as read:', err));
      } catch (err: any) {
        setError(err.message || 'Failed to load messages');
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };
    
    loadInitialMessages();
  }, [fetchMessages, tenantId, queryClient, messages.length]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [loading, messages.length]);

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
            
            // Mark as read immediately since we're viewing the chat
            apiFetch('/chat/mark-read', { method: 'POST' })
              .then(() => {
                if (tenantId) {
                  queryClient.invalidateQueries({ queryKey: queryKeys.chatUnreadCount(tenantId) });
                }
              })
              .catch(err => console.error('Failed to mark as read:', err));
            
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
                deletedByPlayerId: payload.new.deleted_by_player_id || null,
                content: payload.new.deleted_at ? '' : m.content
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
        async (payload: any) => {
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
                const updated = newMessagesMap.get(m.id) as ChatMessageData | undefined;
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
      
      // Update optimistically - include deletedByPlayerId for "You deleted" display
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return { 
            ...m, 
            isDeleted: true, 
            deletedByPlayerId: currentPlayerId,
            content: '', 
            reactions: [] 
          };
        }
        return m;
      }));
      
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Chat background style - WhatsApp-like doodle pattern
  // backgroundSize controls tile size - smaller = more tiles
  const chatBgStyle = {
    backgroundColor: '#ECE5DD',
    backgroundImage: 'url(/img/chat-bg.webp)',
    backgroundRepeat: 'repeat' as const,
    backgroundSize: '300px 300px'  // Adjust this to change tile density
  };

  // Loading state - WhatsApp-like background
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={chatBgStyle}>
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent" />
          <p className="mt-2 text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Error state - WhatsApp-like background
  if (error && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6" style={chatBgStyle}>
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
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-tl from-purple-700 to-pink-500 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state - WhatsApp-like background
  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full" style={chatBgStyle}>
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
    <div className="flex flex-col h-full">
      {/* Messages list - WhatsApp-like doodle background */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
        style={chatBgStyle}
      >
        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-3">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-purple-600 border-r-transparent" />
          </div>
        )}
        
        {/* No more messages indicator - WhatsApp style: centered, grey, subtle */}
        {!hasMore && messages.length > 0 && (
          <div className="text-center py-3 text-[12px] text-[#9da3aa]">
            Beginning of chat history
          </div>
        )}
        
        {/* Messages - tighter vertical padding */}
        {/* Pre-process to collapse consecutive deleted messages */}
        <div className="py-1">
          {collapseDeletedMessages(messages).map((item, index, items) => {
            // Handle collapsed deleted messages
            if (item.type === 'collapsed') {
              const prevItem = index > 0 ? items[index - 1] : null;
              const prevCreatedAt = prevItem?.type === 'message' 
                ? prevItem.message.createdAt 
                : prevItem?.createdAt;
              const showDateSeparator = !prevCreatedAt || !isSameDay(item.createdAt, prevCreatedAt);
              
              return (
                <React.Fragment key={item.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-3">
                      <div className="bg-white text-gray-900 text-[12px] font-medium px-3 py-1 rounded-lg shadow-sm">
                        {formatDateSeparator(item.createdAt)}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-center my-2">
                    <div className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-400 text-[14px] italic px-3 py-1.5 rounded-xl shadow-sm">
                      {/* Trash icon with gradient */}
                      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                        <defs>
                          <linearGradient id="collapsedDeleteIconGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#7c3aed" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                        </defs>
                        <path 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                          stroke="url(#collapsedDeleteIconGradient)" 
                          strokeWidth="1.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                      {item.count} messages deleted
                    </div>
                  </div>
                </React.Fragment>
              );
            }
            
            // Normal message handling
            const message = item.message;
            
            // Calculate grouping: messages from same author within 5 minutes
            const prevItem = index > 0 ? items[index - 1] : null;
            const nextItem = index < items.length - 1 ? items[index + 1] : null;
            
            const prevMessage = prevItem?.type === 'message' ? prevItem.message : null;
            const nextMessage = nextItem?.type === 'message' ? nextItem.message : null;
            
            const GROUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
            
            // Check if we need a date separator (different day from previous message)
            const prevCreatedAt = prevItem?.type === 'message' 
              ? prevItem.message.createdAt 
              : prevItem?.createdAt;
            const showDateSeparator = !prevCreatedAt || !isSameDay(message.createdAt, prevCreatedAt);
            
            const isSameAuthorAsPrev = prevMessage && 
              prevMessage.author?.id === message.author?.id &&
              !prevMessage.isSystemMessage && !message.isSystemMessage &&
              !prevMessage.isDeleted && !message.isDeleted &&
              (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) < GROUP_WINDOW_MS;
            
            const isSameAuthorAsNext = nextMessage && 
              nextMessage.author?.id === message.author?.id &&
              !nextMessage.isSystemMessage && !message.isSystemMessage &&
              !nextMessage.isDeleted && !message.isDeleted &&
              (new Date(nextMessage.createdAt).getTime() - new Date(message.createdAt).getTime()) < GROUP_WINDOW_MS;
            
            // If there's a date separator, this is always first in group
            const isFirstInGroup = !isSameAuthorAsPrev || showDateSeparator;
            const isLastInGroup = !isSameAuthorAsNext;
            
            return (
              <React.Fragment key={message.id}>
                {/* Date separator - matches incoming bubble styling */}
                {showDateSeparator && (
                  <div className="flex justify-center my-3">
                    <div className="bg-white text-gray-900 text-[12px] font-medium px-3 py-1 rounded-lg shadow-sm">
                      {formatDateSeparator(message.createdAt)}
                    </div>
                  </div>
                )}
                
                <ChatMessage
                  message={message}
                  currentPlayerId={currentPlayerId || 0}
                  isAdmin={profile.isAdmin}
                  onReact={handleReact}
                  onDelete={handleDelete}
                  playerMap={playerMap}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  showAvatar={isLastInGroup && !message.isDeleted}
                  showName={isFirstInGroup && !message.isDeleted}
                />
              </React.Fragment>
            );
          })}
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

