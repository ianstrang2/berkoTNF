'use client';

import React, { useState, useRef } from 'react';

// Types for chat messages
export interface MessageAuthor {
  id: number;
  name: string;
  selectedClub?: { id: string; name: string; filename: string } | null;
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
  deletedByPlayerId?: number | null;
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
  playerMap: Map<number, string>;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showAvatar?: boolean;
  showName?: boolean;
}

const ALLOWED_EMOJIS = ['👍', '😂', '🔥', '❤️', '😮', '👎'];
const DELETE_WINDOW_MS = 5 * 60 * 1000;

const formatExactTime = (dateString: string): string => {
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
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
  const [showReactorsModal, setShowReactorsModal] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwnMessage = message.author?.id === currentPlayerId;
  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  const canDelete = isAdmin || (isOwnMessage && messageAge < DELETE_WINDOW_MS);
  const formattedTime = formatExactTime(message.createdAt);
  const hasReactions = message.reactions.length > 0 && !message.isDeleted;

  // Determine deleted message text based on who deleted
  const getDeletedMessageContent = () => {
    const wasDeletedBySelf = message.deletedByPlayerId === currentPlayerId;
    const text = wasDeletedBySelf ? 'You deleted this message' : 'This message was deleted';
    
    return (
      <span className="inline-flex items-center gap-1.5 italic text-gray-400">
        {/* Trash icon with gradient */}
        <svg 
          className="w-3.5 h-3.5 flex-shrink-0" 
          viewBox="0 0 24 24" 
          fill="none"
        >
          <defs>
            <linearGradient id="deleteIconGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <path 
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
            stroke="url(#deleteIconGradient)" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        {text}
      </span>
    );
  };

  // Parse content for @mentions
  const renderContent = (content: string) => {
    if (message.isDeleted) {
      return getDeletedMessageContent();
    }

    const mentionRegex = /@([A-Za-z]+(?:\s[A-Za-z]+)*)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      
      const mentionName = match[1];
      const isMentioned = Array.from(playerMap.entries()).some(
        ([id, name]) => message.mentions.includes(id) && 
          name.toLowerCase() === mentionName.toLowerCase()
      );
      
      if (isMentioned) {
        parts.push(
          <span 
            key={match.index} 
            className={`font-semibold px-1 py-0.5 rounded ${
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
    
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

  const handleTouchStart = () => {
    if (message.isSystemMessage || message.isDeleted) return;
    longPressTimer.current = setTimeout(() => setShowMenu(true), 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (message.isSystemMessage || message.isDeleted) return;
    if ((e.target as HTMLElement).closest('.reactions-bar')) return;
    setShowMenu(!showMenu);
  };

  // System message - solid pink with white text, extra vertical spacing to stand out
  if (message.isSystemMessage) {
    return (
      <div className="flex justify-center my-6 px-4">
        <div className="text-white text-[12px] text-center bg-pink-500 px-3 py-1.5 rounded-lg shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const hasReacted = (emoji: string) => {
    const reaction = message.reactions.find(r => r.emoji === emoji);
    return reaction?.playerIds.includes(currentPlayerId) ?? false;
  };

  // Single tap on reactions bar to show who reacted (WhatsApp pattern)
  const handleReactionsBarClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setShowReactorsModal(true);
  };

  // Get player name from ID
  const getPlayerName = (playerId: number): string => {
    return playerMap.get(playerId) || 'Unknown';
  };

  // ===========================================
  // LAYOUT LOGIC - CLEAR AND SIMPLE
  // ===========================================
  
  // Vertical spacing between messages
  // - Different sender: 8px gap
  // - Same sender: 2px gap
  const rowGap = isFirstInGroup ? 'mt-2' : 'mt-0.5';
  
  // Extra margin below when reactions present
  // Chip is 24px tall, positioned at bottom-[-21px], so extends 21px below bubble
  // Need mb-6 (24px) to clear it with small gap
  const reactionClearance = hasReactions ? 'mb-6' : '';

  // Horizontal layout - simple edge padding, let bubble max-width handle sizing
  // - Incoming: 8px from left edge
  // - Outgoing: 8px from right edge
  const rowLayout = isOwnMessage 
    ? 'flex-row-reverse pr-2'  // outgoing: 8px right padding
    : 'flex-row pl-2';          // incoming: 8px left padding

  // Bubble styling - simple, consistent
  // Note: bubbles get a subtle shadow to pop against beige background (WhatsApp style)
  // Deleted messages use inline-block to shrink-wrap content
  const bubbleColor = message.isDeleted 
    ? 'bg-gray-50 text-gray-400 shadow-sm' 
    : isOwnMessage 
      ? 'bg-[#A855F7] text-white shadow-sm' 
      : 'bg-white text-gray-900 shadow-sm';
  
  // For deleted messages, use inline-block so bubble shrinks to content
  const bubbleDisplay = message.isDeleted ? 'inline-block' : '';

  return (
    <div className={`relative ${rowGap} ${reactionClearance}`}>
      {/* Row: avatar + bubble */}
      <div className={`flex ${rowLayout} items-end gap-1`}>
        
        {/* Avatar - only for incoming messages */}
        {!isOwnMessage && (
          <div className="flex-shrink-0 w-6 self-end">
            {showAvatar && (
              message.author?.selectedClub?.filename ? (
                <img 
                  src={`/club-logos-40px/${message.author.selectedClub.filename}`}
                  alt={message.author.selectedClub.name || "Club badge"}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )
            )}
          </div>
        )}

        {/* Bubble - max 80% width, leaves 20% for opposite side */}
        {/* Deleted messages shrink to fit with inline-block */}
        {/* Click/touch handlers on bubble for reaction picker */}
        <div 
          className={`relative ${message.isDeleted ? '' : 'max-w-[80%]'} px-3 py-1.5 rounded-xl ${bubbleColor} ${bubbleDisplay} ${!message.isSystemMessage && !message.isDeleted ? 'cursor-pointer' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleClick}
        >
          
          {/* Sender name - only first message in group from others, not for deleted */}
          {showName && isFirstInGroup && !isOwnMessage && !message.isDeleted && (
            <div className="text-[15px] font-semibold text-purple-700 mb-0.5">
              {message.author?.name || 'Unknown'}
            </div>
          )}
          
          {/* Message text + timestamp on same line when possible */}
          {/* Slightly looser line-height for multi-line paragraphs */}
          {/* For deleted messages: no timestamp, just the deleted text */}
          <div className={message.isDeleted ? 'text-[14px]' : 'text-[15px]'} style={{ lineHeight: '1.4' }}>
            <span className="break-words whitespace-pre-wrap">
              {renderContent(message.content)}
            </span>
            {!message.isDeleted && (
              <span className={`text-[11px] ml-2 whitespace-nowrap align-bottom ${
                isOwnMessage ? 'text-white/60' : 'text-gray-400'
              }`}>
                {formattedTime}
              </span>
            )}
          </div>
          
          {/* Reaction chip - overlaps bubble bottom by ~3px 
              Chip is 24px tall (h-6). For 3px overlap, chip TOP at bubble bottom - 3px.
              So chip BOTTOM at: bubble bottom - 3px + 24px = bubble bottom + 21px
              Therefore: bottom-[-21px]
              Single tap on reaction chip → toggle your reaction
              Single tap on reactions bar (between chips) → show who reacted
              Double-tap or long-press on chip → show who reacted */}
          {hasReactions && (
            <div 
              className={`reactions-bar absolute bottom-[-21px] ${isOwnMessage ? 'right-2' : 'left-2'} flex gap-0.5`}
              onClick={handleReactionsBarClick}
            >
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Single tap toggles reaction, but also opens modal to show who reacted
                    // This matches WhatsApp: tap to see details, tap your emoji to toggle
                    setShowReactorsModal(true);
                  }}
                  className={`inline-flex items-center justify-center gap-0.5 min-w-[24px] h-6 px-1.5 rounded-full text-[11px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] ${
                    hasReacted(reaction.emoji) ? 'ring-1 ring-purple-300' : ''
                  }`}
                >
                  <span className="text-[14px] leading-none">{reaction.emoji}</span>
                  {reaction.count > 1 && (
                    <span className="font-medium text-[10px] leading-none text-gray-600">{reaction.count}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action menu */}
      {showMenu && !message.isDeleted && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
            }} 
          />
          <div 
            ref={menuRef}
            className={`absolute z-50 mt-1 ${isOwnMessage ? 'right-4' : 'left-10'}`}
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
                  className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-lg ${
                    hasReacted(emoji) ? 'bg-purple-50' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
              {canDelete && (
                <>
                  <div className="w-px bg-gray-200 mx-0.5" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(message.id);
                      setShowMenu(false);
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 text-red-500"
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

      {/* "Who Reacted" Modal - shows on tap of reactions bar */}
      {showReactorsModal && hasReactions && (
        <>
          {/* Backdrop - high z-index to cover everything */}
          <div 
            className="fixed inset-0 bg-black/40"
            style={{ zIndex: 9999 }}
            onClick={(e) => {
              e.stopPropagation();
              setShowReactorsModal(false);
            }}
          />
          {/* Modal - positioned above bottom nav (80px + safe area) */}
          <div 
            className="fixed left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[50vh] overflow-hidden animate-slide-up"
            style={{ 
              zIndex: 10000,
              bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-[16px] font-semibold text-gray-900">Reactions</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReactorsModal(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Reactions list - horizontal layout */}
            <div className="px-4 py-3 overflow-y-auto max-h-[calc(50vh-60px)]">
              {/* Emoji tabs in a row */}
              <div className="flex flex-wrap gap-3 mb-4">
                {message.reactions.map((reaction) => (
                  <div 
                    key={reaction.emoji} 
                    className="flex flex-col items-center"
                  >
                    {/* Emoji with count */}
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-[24px]">{reaction.emoji}</span>
                      <span className="text-[14px] font-medium text-gray-500">{reaction.count}</span>
                    </div>
                    {/* Names as pills below each emoji */}
                    <div className="flex flex-col gap-1">
                      {reaction.playerIds.map((playerId) => (
                        <span
                          key={playerId}
                          className={`inline-block px-3 py-1 rounded-full text-[13px] text-center ${
                            playerId === currentPlayerId
                              ? 'bg-purple-100 text-purple-700 font-medium'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {playerId === currentPlayerId ? 'You' : getPlayerName(playerId)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatMessage;
