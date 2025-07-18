'use client';
import React from 'react';

interface PowerRatingGaugeProps {
  rating: number; // 0-100 percentage
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PowerRatingGauge: React.FC<PowerRatingGaugeProps> = ({
  rating,
  className = '',
  size = 'md'
}) => {
  // Clamp rating to 0-100 range
  const clampedRating = Math.max(0, Math.min(100, rating));
  
  // Size configurations
  const sizeConfig = {
    sm: {
      width: 120,
      height: 60,
      strokeWidth: 8,
      textSize: 'text-lg',
      labelSize: 'text-xs'
    },
    md: {
      width: 160,
      height: 80,
      strokeWidth: 10,
      textSize: 'text-2xl',
      labelSize: 'text-sm'
    },
    lg: {
      width: 200,
      height: 100,
      strokeWidth: 12,
      textSize: 'text-3xl',
      labelSize: 'text-base'
    }
  };
  
  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (clampedRating / 100) * circumference;
  
  // Center coordinates
  const centerX = config.width / 2;
  const centerY = config.height;
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* SVG Gauge */}
      <div className="relative">
        <svg
          width={config.width}
          height={config.height}
          className="transform -rotate-0"
        >
          {/* Background Arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${centerY}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Gradient Definition */}
          <defs>
            <linearGradient id="powerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          
          {/* Progress Arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${centerY}`}
            fill="none"
            stroke="url(#powerGradient)"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <span className={`font-bold text-slate-800 ${config.textSize}`}>
            {Math.round(clampedRating)}%
          </span>
        </div>
      </div>
      
      {/* Label */}
      <div className="mt-2 text-center">
        <p className={`font-medium text-slate-600 ${config.labelSize}`}>
          Power Rating
        </p>
      </div>
    </div>
  );
};

export default PowerRatingGauge; 