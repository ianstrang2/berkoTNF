'use client';
import React from 'react';

interface PointsGoalsToggleProps {
  viewMode: 'points' | 'goals';
  onToggle: (mode: 'points' | 'goals') => void;
  className?: string;
}

export const PointsGoalsToggle: React.FC<PointsGoalsToggleProps> = ({
  viewMode,
  onToggle,
  className = ''
}) => {
  return (
    <div className={`inline-flex bg-gray-100 rounded-lg p-1 ${className}`}>
      <button
        onClick={() => onToggle('points')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'points'
            ? 'bg-white text-slate-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Points
      </button>
      <button
        onClick={() => onToggle('goals')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'goals'
            ? 'bg-white text-slate-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Goals
      </button>
    </div>
  );
}; 