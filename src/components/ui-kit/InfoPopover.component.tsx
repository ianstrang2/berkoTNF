'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface InfoPopoverProps {
  content: string;
  className?: string;
}

const InfoPopover: React.FC<InfoPopoverProps> = ({ content, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceAbove = buttonRect.top;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      
      // Position below if not enough space above
      if (spaceAbove < 150 && spaceBelow > spaceAbove) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        buttonRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
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

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-4 h-4 ml-1 text-slate-400 hover:text-purple-600 transition-colors"
        aria-label="More information"
      >
        <Info className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-50 w-64 px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg shadow-soft-xl
            ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} 
            left-1/2 -translate-x-1/2`}
          style={{
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {/* Arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-slate-200 transform rotate-45
              ${position === 'top' ? 'bottom-[-5px] border-b border-r' : 'top-[-5px] border-t border-l'}`}
          />
          
          {/* Content */}
          <div className="relative z-10">
            {content}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(${position === 'top' ? '4px' : '-4px'});
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default InfoPopover;

