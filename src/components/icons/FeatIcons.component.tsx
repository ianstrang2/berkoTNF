// src/components/icons/FeatIcons.component.tsx

import React from 'react';
import { FeatType } from '@/types/feat-breaking.types';

// Trophy Icon for most goals in game
export const TrophyIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2M7 4H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-2M7 4v10M13 4v10"/>
  </svg>
);

// Lightning Bolt for streaks 
export const LightningIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M11 3L7 9h3l-1 8 4-6H10l1-8z"/>
  </svg>
);

// Shield for unbeaten streaks
export const ShieldIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

// Target for goal streaks
export const TargetIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

// Crown for attendance streaks
export const CrownIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM17 4a1 1 0 10-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4z"/>
  </svg>
);

// Skull for losing streaks
export const SkullIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 2C5.58 2 2 5.58 2 10c0 3.42 2.14 6.34 5.14 7.41L8 16h4l.86 1.41C15.86 16.34 18 13.42 18 10c0-4.42-3.58-8-8-8zM7 11a1 1 0 110-2 1 1 0 010 2zm6 0a1 1 0 110-2 1 1 0 010 2zm-3 3c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2z"/>
  </svg>
);

// Star for biggest victory
export const StarIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
  </svg>
);

/**
 * Get the appropriate icon for a feat type
 */
export const getFeatIcon = (featType: FeatType): React.ComponentType<{ className?: string }> => {
  const iconMap: Record<FeatType, React.ComponentType<{ className?: string }>> = {
    most_goals_in_game: TrophyIcon,
    win_streak: LightningIcon,
    unbeaten_streak: ShieldIcon,
    loss_streak: SkullIcon,
    winless_streak: SkullIcon,
    goal_streak: TargetIcon,
    biggest_victory: StarIcon,
    attendance_streak: CrownIcon,
  };
  
  return iconMap[featType] || TrophyIcon;
}; 