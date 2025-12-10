'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface StreakBarProps {
  label: string;
  value: number;
  maxValue: number; // All-time max for this streak type
  dates?: string; // Date range for the streak
  variant: 'positive' | 'negative';
  className?: string;
}

/**
 * Compact horizontal bar visualization for streaks
 * - Bar fills relative to the all-time max
 * - Info icon reveals date range on tap/hover (using InfoPopover pattern)
 * - Green for positive streaks, Red for negative
 */
const StreakBar: React.FC<StreakBarProps> = ({
  label,
  value,
  maxValue,
  dates,
  variant,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate percentage (0-100) of bar fill
  const percentage = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;

  // Color classes based on variant
  const barColorClass = variant === 'positive'
    ? 'bg-gradient-to-r from-green-400 to-green-500'
    : 'bg-gradient-to-r from-red-400 to-red-500';

  // Handle click outside to close popover (matches InfoPopover pattern)
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
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-3">
        {/* Label */}
        <span className="text-sm font-medium text-slate-700 w-24 shrink-0">
          {label}
        </span>

        {/* Bar container */}
        <div className="flex-1 relative">
          {/* Background track */}
          <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden">
            {/* Filled bar */}
            <div
              className={`h-full ${barColorClass} rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2`}
              style={{ width: `${Math.max(percentage, 12)}%` }} // Min 12% width to show value
            >
              {/* Value inside bar */}
              <span className="text-xs font-bold text-white drop-shadow-sm">
                {value}
              </span>
            </div>
          </div>
        </div>

        {/* Info icon with popover - matches InfoPopover pattern */}
        {dates && (
          <div className="relative shrink-0">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center w-5 h-5 text-slate-400 hover:text-purple-600 transition-colors"
              aria-label={`More info about ${label} streak`}
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Popover - matches InfoPopover styling */}
            {isOpen && (
              <div
                ref={popoverRef}
                className="absolute z-50 w-48 px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg shadow-soft-xl bottom-full mb-2 right-0"
                style={{ animation: 'fadeIn 0.2s ease-out' }}
              >
                {/* Arrow */}
                <div className="absolute right-2 bottom-[-5px] w-2 h-2 bg-white border-slate-200 border-b border-r transform rotate-45" />
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="font-medium text-slate-700 mb-1">{dates}</div>
                  <div className="text-slate-500">League Max: {maxValue}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
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

export default StreakBar;

