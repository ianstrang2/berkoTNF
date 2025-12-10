'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Player {
  id: number;
  name: string;
}

interface ChatInputProps {
  onSend: (content: string, mentions: number[]) => Promise<void>;
  players: Player[];
  disabled?: boolean;
}

const MAX_MESSAGE_LENGTH = 500;
const MAX_MENTIONS = 10;

const ChatInput: React.FC<ChatInputProps> = ({ onSend, players, disabled }) => {
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<number[]>([]);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionPickerRef = useRef<HTMLDivElement>(null);

  // Filter players for mention picker
  const filteredPlayers = players.filter(player => 
    player.name.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 8); // Limit to 8 suggestions

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Close mention picker on Escape
    if (e.key === 'Escape' && showMentionPicker) {
      setShowMentionPicker(false);
      return;
    }

    // Navigate mention picker with arrow keys
    if (showMentionPicker && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      // Could implement highlight navigation here
    }
  };

  // Detect @ for mention trigger
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setContent(value);

    // Check if we should show mention picker
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Show picker if @ is at start or after whitespace, and no space in search
      const charBeforeAt = textBeforeCursor[lastAtIndex - 1];
      if ((lastAtIndex === 0 || /\s/.test(charBeforeAt || '')) && !/\s/.test(textAfterAt)) {
        setMentionSearch(textAfterAt);
        setMentionCursorPos(lastAtIndex);
        setShowMentionPicker(true);
        return;
      }
    }
    
    setShowMentionPicker(false);
  };

  // Insert mention
  const insertMention = useCallback((player: Player) => {
    const beforeMention = content.slice(0, mentionCursorPos);
    const afterCursor = content.slice(mentionCursorPos + mentionSearch.length + 1);
    const newContent = `${beforeMention}@${player.name} ${afterCursor}`;
    
    setContent(newContent);
    
    // Add to mentions array if not already there and under limit
    if (!mentions.includes(player.id) && mentions.length < MAX_MENTIONS) {
      setMentions([...mentions, player.id]);
    }
    
    setShowMentionPicker(false);
    setMentionSearch('');
    
    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus();
      const newCursorPos = beforeMention.length + player.name.length + 2;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content, mentionCursorPos, mentionSearch, mentions]);

  // Send message
  const handleSend = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || sending || disabled) return;

    setSending(true);
    try {
      await onSend(trimmedContent, mentions);
      setContent('');
      setMentions([]);
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    } finally {
      setSending(false);
    }
  };

  // Toggle mention picker via button
  const toggleMentionPicker = () => {
    if (showMentionPicker) {
      setShowMentionPicker(false);
    } else {
      // Insert @ at cursor position
      const cursorPos = inputRef.current?.selectionStart || content.length;
      const newContent = content.slice(0, cursorPos) + '@' + content.slice(cursorPos);
      setContent(newContent);
      setMentionCursorPos(cursorPos);
      setMentionSearch('');
      setShowMentionPicker(true);
      
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(cursorPos + 1, cursorPos + 1);
      }, 0);
    }
  };

  const charsRemaining = MAX_MESSAGE_LENGTH - content.length;
  const isOverLimit = charsRemaining < 0;

  return (
    <div className="relative border-t border-gray-200 bg-white">
      {/* Mention picker dropdown */}
      {showMentionPicker && filteredPlayers.length > 0 && (
        <div 
          ref={mentionPickerRef}
          className="absolute bottom-full left-0 right-0 mb-1 mx-4 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-50"
        >
          <div className="p-2">
            <p className="text-xs text-gray-500 px-2 pb-2">Mention a player</p>
            {filteredPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => insertMention(player)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-purple-50 transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-sm font-semibold">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-900">{player.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center gap-2 p-3">
        {/* @ Mention button */}
        <button
          type="button"
          onClick={toggleMentionPicker}
          disabled={disabled}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            showMentionPicker
              ? 'bg-pink-100 text-pink-600'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="text-lg font-bold">@</span>
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled || sending}
            rows={1}
            className={`w-full px-4 py-2.5 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-colors ${
              isOverLimit ? 'ring-2 ring-red-500' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ maxHeight: '120px' }}
          />
          
          {/* Character count (show when getting close to limit) */}
          {content.length > MAX_MESSAGE_LENGTH - 50 && (
            <div className={`absolute right-3 bottom-2 text-xs ${
              isOverLimit ? 'text-red-500 font-semibold' : 'text-gray-400'
            }`}>
              {charsRemaining}
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!content.trim() || isOverLimit || sending || disabled}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            content.trim() && !isOverLimit && !sending && !disabled
              ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md hover:shadow-lg hover:scale-105 active:scale-95'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {sending ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;

