'use client';
import React from 'react';

interface PowerSliderProps {
  label: string;
  value: number;
  percentage: number; // 0-100 normalized value
  leagueAverage?: number; // 0-100 normalized league average
  contextText?: string; // e.g., "Above Average" or dates
  variant?: 'positive' | 'negative' | 'neutral';
  className?: string;
  showTooltip?: boolean;
  tooltipText?: string;
  hasVariance?: boolean; // Whether there's sufficient league data variance
  showPercentage?: boolean; // Whether to show percentage (default: true for neutral, false for others)
  showValue?: boolean; // Whether to show the raw value (default: true for streaks, false for power ratings)
}

const PowerSlider: React.FC<PowerSliderProps> = ({
  label,
  value,
  percentage,
  leagueAverage,
  contextText,
  variant = 'neutral',
  className = '',
  showTooltip = false,
  tooltipText,
  hasVariance = true,
  showPercentage = variant === 'neutral', // Show percentage only for power ratings by default
  showValue = variant !== 'neutral' // Show value only for streaks by default
}) => {
  // Clamp percentage to 0-100 range
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const clampedLeagueAvg = leagueAverage ? Math.max(0, Math.min(100, leagueAverage)) : undefined;
  
  // Variant styling
  const variantClasses = {
    positive: {
      container: 'border-l-4 border-green-400',
      fill: hasVariance ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-soft-md' : 'bg-gray-300',
      accent: hasVariance ? 'text-green-600' : 'text-gray-500'
    },
    negative: {
      container: 'border-l-4 border-red-400', 
      fill: hasVariance ? 'bg-gradient-to-r from-red-400 to-red-500 shadow-soft-md' : 'bg-gray-300',
      accent: hasVariance ? 'text-red-600' : 'text-gray-500'
    },
    neutral: {
      container: 'border-l-4 border-purple-400',
      fill: hasVariance ? 'bg-gradient-to-r from-pink-500 to-purple-700 shadow-soft-md' : 'bg-gray-300',
      accent: hasVariance ? 'text-purple-600' : 'text-gray-500'
    }
  };
  
  const currentVariant = variantClasses[variant];
  
  return (
    <div className={`relative p-4 ${className}`}>
      {/* Label and Value */}
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-sm font-medium ${hasVariance ? 'text-slate-700' : 'text-gray-500'}`}>
          {label}
        </h4>
        {showValue && (
          <span className={`text-lg font-bold ${currentVariant.accent}`}>
            {hasVariance ? value : '--'}
          </span>
        )}
      </div>
      
      {/* Slider Track */}
      <div className="relative mb-2">
        {/* Background Track */}
        <div className={`w-full h-4 rounded-full ${hasVariance ? 'bg-slate-100 shadow-inner' : 'bg-gray-100'}`}>
          {/* Fill */}
          <div 
            className={`h-full ${currentVariant.fill} transition-all duration-500 ease-out rounded-full relative`}
            style={{ width: hasVariance ? `${clampedPercentage}%` : '100%' }}
          >
            {/* Percentage at end of bar for power ratings */}
            {showPercentage && hasVariance && (
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-semibold text-white">
                {Math.round(clampedPercentage)}%
              </span>
            )}
          </div>
        </div>
        
        {/* League Average Marker - only show if there's variance */}
        {hasVariance && clampedLeagueAvg !== undefined && (
          <div 
            className="absolute top-0 h-4 w-0.5 bg-slate-600 transform -translate-x-0.5 opacity-70"
            style={{ left: `${clampedLeagueAvg}%` }}
            title={`League Average: ${clampedLeagueAvg}%`}
          >
            {/* Dashed line indicator */}
            <div className="absolute top-4 w-0.5 h-2 bg-slate-600 opacity-50"></div>
          </div>
        )}
      </div>
      
      {/* Context Text (dates for streaks) */}
      {contextText && (
        <div className="text-right">
          <span className={`text-xs ${hasVariance ? 'text-slate-500' : 'text-gray-400'}`}>
            {contextText}
          </span>
        </div>
      )}
      
      {/* Optional Tooltip */}
      {showTooltip && tooltipText && (
        <div className="mt-1">
          <p className={`text-xs italic ${hasVariance ? 'text-slate-400' : 'text-gray-400'}`}>
            {tooltipText}
          </p>
        </div>
      )}
    </div>
  );
};

export default PowerSlider; 