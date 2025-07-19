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
    <div className={`relative p-4 ${className}`} title={showTooltip && tooltipText ? tooltipText : undefined}>
      {/* Label Only */}
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-sm font-medium ${hasVariance ? 'text-slate-700' : 'text-gray-500'}`}>
          {label}
        </h4>
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
            
            {/* Value at end of bar for streaks (same positioning as percentage) */}
            {showValue && hasVariance && value > 0 && (
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-semibold text-white">
                {value}
              </span>
            )}
          </div>
        </div>
        

      </div>
      
      {/* Context Text (dates for streaks) */}
      {contextText && (
        <div className="text-right">
          <span className={`text-xs ${hasVariance ? 'text-slate-500' : 'text-gray-400'}`}>
            {contextText}
          </span>
        </div>
      )}
      

    </div>
  );
};

export default PowerSlider; 