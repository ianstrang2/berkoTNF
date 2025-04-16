import React from 'react';
import { StatBarProps } from '@/types/team-algorithm.types';

const StatBar: React.FC<StatBarProps> = ({ 
  label, 
  value, 
  maxValue = 5, 
  color = 'green' 
}) => {
  const percentage = (value / maxValue) * 100;
  const colorClasses: Record<string, string> = {
    green: 'bg-green-500',
    orange: 'bg-orange-500'
  };
  
  return (
    <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
      <span className="text-xs sm:text-sm text-neutral-700 w-16 sm:w-20">{label}</span>
      <div className="flex-1 bg-neutral-200 h-4 sm:h-6 rounded-md overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <span className="text-xs sm:text-sm text-neutral-700 w-10 sm:w-12 text-right">{value.toFixed(1)}</span>
    </div>
  );
};

export default StatBar; 