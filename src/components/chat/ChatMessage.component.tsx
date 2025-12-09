'use client';

import React, { useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';

// Types for chat messages
export interface MessageAuthor {
  id: number;
  name: string;
  selectedClub?: string | null;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  playerIds: number[];
}

export interface ChatMessageData {
  id: string;
  content: string;
  isDeleted: boolean;
  isSystemMessage: boolean;
  author: MessageAuthor | null;
  mentions: number[];
  createdAt: string;
  reactions: MessageReaction[];
}

interface ChatMessageProps {
  message: ChatMessageData;
  currentPlayerId: number;
  isAdmin: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  playerMap: Map<number, string>; // player_id -> name mapping for mentions
}

const ALLOWED_EMOJIS = ['👍', '😂', '🔥', '❤️', '😮', '👎'];
const DELETE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  currentPlayerId,
  isAdmin,
  onReact,
  onDelete,
  playerMap,
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwnMessage = message.author?.id === currentPlayerId;
  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  const canDelete = isAdmin || (isOwnMessage && messageAge < DELETE_WINDOW_MS);

  // Format relative time
  const timeAgo = formatDistanceToNow(new Date(message.createdAt), { addSuffix: false });
  const formattedTime = timeAgo.replace('about ', '').replace('less than a minute', '1m');

  // Parse content for @mentions and render them highlighted
  const renderContent = (content: string) => {
    if (message.isDeleted) {
      return <span className="italic text-gray-400">[This message was deleted]</span>;
    }

    // Simple mention pattern: @PlayerName
    const parts = content.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const mentionName = part.slice(1);
        // Check if this is a valid mentioned player
        const isMentioned = Array.from(playerMap.entries()).some(
          ([id, name]) => message.mentions.includes(id) && name.toLowerCase().includes(mentionName.toLowerCase())
        );
        if (isMentioned) {
          return (
            <span key={index} className="text-purple-600 font-medium bg-purple-100 px-1 rounded">
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  // Handle long press for mobile
  const handleTouchStart = () => {
    if (message.isSystemMessage || message.isDeleted) return;
    longPressTimer.current = setTimeout(() => {
      setShowReactionPicker(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Handle click for desktop
  const handleClick = (e: React.MouseEvent) => {
    if (message.isSystemMessage || message.isDeleted) return;
    // Don't open picker if clicking on reactions
    if ((e.target as HTMLElement).closest('.reactions-bar')) return;
    setShowMenu(!showMenu);
  };

  // System message styling
  if (message.isSystemMessage) {
    return (
      <div className="flex justify-center my-3">
        <div className="text-gray-500 text-sm text-center bg-gray-100 px-4 py-2 rounded-lg max-w-[80%]">
          {message.content}
        </div>
      </div>
    );
  }

  // Check if current user has reacted with specific emoji
  const hasReacted = (emoji: string) => {
    const reaction = message.reactions.find(r => r.emoji === emoji);
    return reaction?.playerIds.includes(currentPlayerId) ?? false;
  };

  return (
    <div 
      className={`group flex gap-3 px-4 py-2 hover:bg-gray-50 transition-colors ${isOwnMessage ? 'flex-row-reverse' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
          isOwnMessage 
            ? 'bg-gradient-to-br from-purple-600 to-pink-500' 
            : 'bg-gradient-to-br from-slate-500 to-slate-600'
        }`}>
          {message.author?.name?.charAt(0).toUpperCase() || '?'}
        </div>
      </div>

      {/* Message content */}
      <div className={`flex-1 min-w-0 ${isOwnMessage ? 'text-right' : ''}`}>
        {/* Author and time */}
        <div className={`flex items-baseline gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
          <span className="font-semibold text-sm text-gray-900">
            {message.author?.name || 'Unknown'}
          </span>
          <span className="text-xs text-gray-400">
            {formattedTime}
          </span>
        </div>

        {/* Message bubble */}
        <div className={`inline-block max-w-full ${isOwnMessage ? 'text-left' : ''}`}>
          <div className={`inline-block px-3 py-2 rounded-2xl ${
            message.isDeleted 
              ? 'bg-gray-100' 
              : isOwnMessage 
                ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white' 
                : 'bg-gray-100 text-gray-900'
          }`}>
            <p className="text-sm break-words whitespace-pre-wrap">
              {renderContent(message.content)}
            </p>
          </div>

          {/* Reactions bar */}
          {message.reactions.length > 0 && !message.isDeleted && (
            <div className={`reactions-bar flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : ''}`}>
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact(message.id, reaction.emoji);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                    hasReacted(reaction.emoji)
                      ? 'bg-purple-100 border border-purple-300 text-purple-700'
                      : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action menu (shows on click/long-press) */}
        {showMenu && !message.isDeleted && (
          <div 
            ref={menuRef}
            className={`mt-2 ${isOwnMessage ? 'flex flex-col items-end' : ''}`}
          >
            {/* Quick reaction row */}
            <div className="inline-flex bg-white rounded-full shadow-lg border border-gray-200 p-1 gap-1">
              {ALLOWED_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact(message.id, emoji);
                    setShowMenu(false);
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-lg ${
                    hasReacted(emoji) ? 'bg-purple-100' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
              
              {/* Delete button (if allowed) */}
              {canDelete && (
                <>
                  <div className="w-px bg-gray-200 mx-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(message.id);
                      setShowMenu(false);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }} 
        />
      )}
    </div>
  );
};

export default ChatMessage;

