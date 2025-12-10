'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Share2, MessageCircle, Mail, Copy, Check, X } from 'lucide-react';
import {
  shareText,
  shareToWhatsApp,
  shareToSMS,
  shareToEmail,
  copyToClipboard,
  isCapacitorNative,
  canUseWebShare,
} from '@/utils/share.util';

export interface ShareMenuProps {
  /** The text content to share */
  text: string;
  /** Context for email subject (e.g., "teams" -> "Teams for tonight") */
  context?: 'teams' | 'match-report' | 'custom';
  /** Custom email subject (overrides context-based subject) */
  emailSubject?: string;
  /** Custom title for native share sheet */
  title?: string;
  /** Additional CSS classes for the button */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Callback when share succeeds (copy specifically) */
  onCopySuccess?: () => void;
}

interface ShareOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  successState?: boolean;
}

const ShareMenu: React.FC<ShareMenuProps> = ({
  text,
  context = 'custom',
  emailSubject,
  title,
  className = '',
  size = 'sm',
  disabled = false,
  onCopySuccess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get email subject based on context
  const getEmailSubject = (): string => {
    if (emailSubject) return emailSubject;
    switch (context) {
      case 'teams':
        return 'Teams for tonight';
      case 'match-report':
        return 'Match Report';
      default:
        return 'Shared from Capo';
    }
  };

  // Get share title based on context
  const getShareTitle = (): string => {
    if (title) return title;
    switch (context) {
      case 'teams':
        return 'Teams';
      case 'match-report':
        return 'Match Report';
      default:
        return 'Share';
    }
  };

  // Calculate position to avoid overflow
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const menuHeight = 200; // Approximate menu height
      
      if (spaceBelow < menuHeight) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle native share (Capacitor or Web Share API)
  const handleNativeShare = async () => {
    const success = await shareText({
      text,
      title: getShareTitle(),
      subject: getEmailSubject(),
    });
    if (success) {
      setIsOpen(false);
    }
  };

  // Handle WhatsApp share
  const handleWhatsApp = () => {
    shareToWhatsApp(text);
    setIsOpen(false);
  };

  // Handle SMS share
  const handleSMS = () => {
    shareToSMS(text);
    setIsOpen(false);
  };

  // Handle Email share
  const handleEmail = () => {
    shareToEmail(text, getEmailSubject());
    setIsOpen(false);
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess(true);
      onCopySuccess?.();
      setTimeout(() => {
        setCopySuccess(false);
        setIsOpen(false);
      }, 1500);
    }
  };

  // Build share options
  const shareOptions: ShareOption[] = [];

  // Add native share option on capable devices
  if (isCapacitorNative() || canUseWebShare()) {
    shareOptions.push({
      id: 'native',
      label: 'Share...',
      icon: <Share2 className="w-4 h-4" />,
      onClick: handleNativeShare,
    });
  }

  shareOptions.push(
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      ),
      onClick: handleWhatsApp,
    },
    {
      id: 'sms',
      label: 'SMS',
      icon: <MessageCircle className="w-4 h-4" />,
      onClick: handleSMS,
    },
    {
      id: 'email',
      label: 'Email',
      icon: <Mail className="w-4 h-4" />,
      onClick: handleEmail,
    },
    {
      id: 'copy',
      label: copySuccess ? 'Copied!' : 'Copy',
      icon: copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />,
      onClick: handleCopy,
      successState: copySuccess,
    }
  );

  // Button size classes - match the original Button component sizing
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  // Icon sizes
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  return (
    <div className="relative inline-block">
      {/* Share Button - icon only to match original compact style */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center font-medium transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500
          rounded shadow-soft-sm
          ${isOpen 
            ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md' 
            : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${sizeClasses[size]}
          ${className}
        `}
        aria-label="Share options"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Share"
      >
        <Share2 className={iconSizes[size]} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          className={`
            absolute z-50 w-44 bg-white rounded-xl shadow-soft-xl border border-gray-100
            ring-1 ring-black ring-opacity-5 focus:outline-none
            ${position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'}
            right-0
          `}
          style={{
            animation: 'shareMenuFadeIn 0.15s ease-out',
          }}
        >
          {/* Close button for mobile */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 sm:hidden"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="py-1">
            {shareOptions.map((option) => (
              <React.Fragment key={option.id}>
                {/* Divider before Copy */}
                {option.id === 'copy' && (
                  <div className="my-0.5 border-t border-gray-100" />
                )}
                <button
                  type="button"
                  onClick={option.onClick}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors
                    hover:bg-gray-50 active:bg-gray-100
                    ${option.successState ? 'bg-purple-50' : ''}
                  `}
                  role="menuitem"
                >
                  {/* Icon with purple gradient */}
                  <span className={`${option.successState ? 'text-purple-600' : 'text-purple-500'}`}>
                    {option.icon}
                  </span>
                  {/* Label in slate gray */}
                  <span className={`font-medium ${option.successState ? 'text-purple-700' : 'text-slate-700'}`}>
                    {option.label}
                  </span>
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style jsx>{`
        @keyframes shareMenuFadeIn {
          from {
            opacity: 0;
            transform: translateY(${position === 'bottom' ? '-4px' : '4px'});
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ShareMenu;

