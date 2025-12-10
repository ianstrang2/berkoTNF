'use client';

import React, { useState, useRef } from 'react';

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
  // Grouping props
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showAvatar?: boolean;
  showName?: boolean;
}

const ALLOWED_EMOJIS = ['👍', '😂', '🔥', '❤️', '😮', '👎'];
const DELETE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Format time as exact time: "2:45" or "14:30"
const formatExactTime = (dateString: string): string => {
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // 12-hour format without AM/PM
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${displayHours}:${displayMinutes}`;
};

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  currentPlayerId,
  isAdmin,
  onReact,
  onDelete,
  playerMap,
  isFirstInGroup = true,
  isLastInGroup = true,
  showAvatar = true,
  showName = true,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwnMessage = message.author?.id === currentPlayerId;
  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  const canDelete = isAdmin || (isOwnMessage && messageAge < DELETE_WINDOW_MS);
  const formattedTime = formatExactTime(message.createdAt);

  // Parse content for @mentions and render them highlighted
  const renderContent = (content: string) => {
    if (message.isDeleted) {
      return <span className="italic opacity-60">[Message deleted]</span>;
    }

    // Simple mention pattern: @PlayerName (handles multi-word names)
    const mentionRegex = /@([A-Za-z]+(?:\s[A-Za-z]+)*)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      
      const mentionName = match[1];
      // Check if this is a valid mentioned player
      const isMentioned = Array.from(playerMap.entries()).some(
        ([id, name]) => message.mentions.includes(id) && 
          name.toLowerCase() === mentionName.toLowerCase()
      );
      
      if (isMentioned) {
        parts.push(
          <span 
            key={match.index} 
            className={`font-semibold px-1.5 py-0.5 rounded ${
              isOwnMessage 
                ? 'bg-white/25 text-white' 
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            @{mentionName}
          </span>
        );
      } else {
        parts.push(match[0]);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

  // Handle long press for mobile
  const handleTouchStart = () => {
    if (message.isSystemMessage || message.isDeleted) return;
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true);
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
    if ((e.target as HTMLElement).closest('.reactions-bar')) return;
    setShowMenu(!showMenu);
  };

  // System message styling
  if (message.isSystemMessage) {
    return (
      <div className="flex justify-center my-4 px-4">
        <div className="text-gray-500 text-xs text-center bg-gray-100 px-4 py-2 rounded-full">
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

  // Spacing based on grouping
  // Tighter spacing - timestamp provides the visual break between groups
  const verticalPadding = isFirstInGroup ? 'pt-2' : 'pt-0.5';
  const bottomPadding = isLastInGroup ? 'pb-0.5' : 'pb-0';

  // Build bubble border-radius classes for the "spine" effect
  // The group should look like one continuous unit with only outermost corners rounded
  // 
  // For right-aligned (own) messages:
  //   First: BR flat (connects down), all others rounded
  //   Middle: TR flat (connects up), BR flat (connects down)
  //   Last: TR flat (connects up), BR rounded (closes group)
  //   Single: All rounded
  //
  // For left-aligned (others) messages:
  //   First: BL flat (connects down), all others rounded
  //   Middle: TL flat (connects up), BL flat (connects down)
  //   Last: TL flat (connects up), BL rounded (closes group)
  //   Single: All rounded
  
  const getBubbleClasses = () => {
    // Compact padding: px-3 (12px horizontal), pt-2 pb-1.5 for balanced spacing
    const base = 'inline-block px-3 pt-2 pb-1.5';
    const color = message.isDeleted 
      ? 'bg-gray-100 text-gray-400' 
      : isOwnMessage 
        ? 'bg-[#A855F7] text-white' 
        : 'bg-[#FFFFFF] text-gray-900 border border-gray-200';
    
    // Radius: 18px for outer corners, 4px for connecting corners
    let radius = '';
    if (isOwnMessage) {
      // Right-side stacking
      if (isFirstInGroup && isLastInGroup) {
        // Single message - all corners rounded
        radius = 'rounded-[18px]';
      } else if (isFirstInGroup) {
        // Top of group - BR flat to connect down
        radius = 'rounded-[18px] rounded-br-[4px]';
      } else if (isLastInGroup) {
        // Bottom of group - TR flat to connect up, BR rounded to close
        radius = 'rounded-[18px] rounded-tr-[4px]';
      } else {
        // Middle - TR and BR flat
        radius = 'rounded-[18px] rounded-tr-[4px] rounded-br-[4px]';
      }
    } else {
      // Left-side stacking
      if (isFirstInGroup && isLastInGroup) {
        // Single message - all corners rounded
        radius = 'rounded-[18px]';
      } else if (isFirstInGroup) {
        // Top of group - BL flat to connect down
        radius = 'rounded-[18px] rounded-bl-[4px]';
      } else if (isLastInGroup) {
        // Bottom of group - TL flat to connect up, BL rounded to close
        radius = 'rounded-[18px] rounded-tl-[4px]';
      } else {
        // Middle - TL and BL flat
        radius = 'rounded-[18px] rounded-tl-[4px] rounded-bl-[4px]';
      }
    }
    
    return `${base} ${color} ${radius}`;
  };

  return (
    <div 
      className={`relative ${verticalPadding} ${bottomPadding}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      <div className={`flex gap-2 px-4 ${isOwnMessage ? 'flex-row-reverse justify-start' : 'flex-row'} ${isLastInGroup ? 'items-end' : 'items-start'}`}>
        {/* Avatar - only show for OTHER users */}
        {!isOwnMessage && (
          <div className="flex-shrink-0 w-6 self-end">
            {showAvatar && isLastInGroup && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold bg-purple-400">
                {message.author?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
        )}

        {/* Message content */}
        <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {/* Message bubble */}
          <div className={getBubbleClasses()}>
            {/* Author name - only show for OTHER users on first message - INSIDE bubble at top-left */}
            {showName && isFirstInGroup && !isOwnMessage && (
              <div className="mb-1">
                <span className="text-xs font-bold text-gray-700">
                  {message.author?.name || 'Unknown'}
                </span>
              </div>
            )}
            
            <p className="text-sm break-words whitespace-pre-wrap leading-tight mb-0">
              {renderContent(message.content)}
            </p>
            {/* Timestamp inside bubble - aligned right, minimal padding */}
            <div className={`text-[10px] mt-0.5 text-right ${isOwnMessage ? 'text-white/70' : 'text-gray-400'}`}>
              {formattedTime}
            </div>
          </div>

          {/* Reactions bar - WhatsApp style: tucked near bubble edge */}
          {message.reactions.length > 0 && !message.isDeleted && (
            <div className={`reactions-bar flex flex-wrap gap-1 -mt-2 ${isOwnMessage ? 'justify-end mr-2' : 'justify-start ml-2'}`}>
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact(message.id, reaction.emoji);
                  }}
                  className={`inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded-full text-xs transition-all bg-[#FFFFFF] border ${
                    hasReacted(reaction.emoji)
                      ? 'border-purple-300 shadow-md'
                      : 'border-gray-300 shadow-sm hover:shadow-md'
                  }`}
                >
                  <span className="text-sm leading-none">{reaction.emoji}</span>
                  <span className="font-semibold text-xs leading-none text-gray-700">{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action menu (shows on click/long-press) */}
      {showMenu && !message.isDeleted && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
            }} 
          />
          
          {/* Menu */}
          <div 
            ref={menuRef}
            className={`absolute z-50 mt-1 ${isOwnMessage ? 'right-4' : 'left-14'}`}
          >
            <div className="inline-flex bg-white rounded-full shadow-lg border border-gray-100 p-1 gap-0.5">
              {ALLOWED_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact(message.id, emoji);
                    setShowMenu(false);
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-lg ${
                    hasReacted(emoji) ? 'bg-purple-50' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
              
              {/* Delete button (if allowed) */}
              {canDelete && (
                <>
                  <div className="w-px bg-gray-200 mx-0.5" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(message.id);
                      setShowMenu(false);
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatMessage;
