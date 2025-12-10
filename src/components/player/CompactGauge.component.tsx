'use client';
import React from 'react';

interface CompactGaugeProps {
  percentage: number; // 0-100
  label: string;
  className?: string;
}

/**
 * Compact donut/ring gauge for displaying percentages
 * - Vertical layout: Percentage → Ring → Label
 * - Pink/purple gradient fill
 * - Minimal vertical height for mobile-first design
 */
const CompactGauge: React.FC<CompactGaugeProps> = ({
  percentage,
  label,
  className = ''
}) => {
  // Clamp percentage to 0-100 range
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  // Ring configuration
  const size = 44; // Ring outer diameter
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;
  
  // Unique gradient ID to avoid conflicts when multiple instances render
  const gradientId = `compactGaugeGradient-${label.replace(/\s+/g, '-')}`;
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Percentage - Top */}
      <span 
        className="text-lg font-bold leading-tight"
        style={{ color: 'rgb(52, 71, 103)' }}
      >
        {Math.round(clampedPercentage)}%
      </span>
      
      {/* Ring Chart - Middle */}
      <div className="my-1">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Gradient Definition - matches from-purple-700 to-pink-500 pattern */}
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          
          {/* Background Ring (unfilled) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          
          {/* Progress Ring (filled with gradient) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
      </div>
      
      {/* Label - Bottom */}
      <span 
        className="text-xs font-medium leading-tight text-center"
        style={{ color: 'rgb(52, 71, 103)' }}
      >
        {label}
      </span>
    </div>
  );
};

export default CompactGauge;

