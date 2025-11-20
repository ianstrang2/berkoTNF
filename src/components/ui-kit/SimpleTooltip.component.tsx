/**
 * Simple Tooltip Component
 * 
 * Lightweight tooltip that appears on click (for mobile) or hover (for desktop)
 * Just shows text with a small X to close
 */

'use client';

import React from 'react';

interface SimpleTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

const SimpleTooltip: React.FC<SimpleTooltipProps> = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - click to close */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Small tooltip popup */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-soft-xl border border-gray-200 px-4 py-3 max-w-xs">
        <div className="flex items-start gap-3">
          <span className="text-sm text-slate-700 font-medium flex-1">
            {message}
          </span>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-purple-50 transition-colors"
            aria-label="Close"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="url(#gradient)">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#7c3aed', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default SimpleTooltip;

