'use client';
import React from 'react';
import Link from 'next/link';
import { useNavigation } from '@/contexts/NavigationContext';

interface NavigationTabsProps {
  className?: string;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ className = '' }) => {
  const { primarySection, secondarySection, isAdminMode, isAdminAuthenticated } = useNavigation();

  // Get secondary navigation options based on primary section
  const getSecondaryOptions = () => {
    if (isAdminMode && isAdminAuthenticated) {
      // Admin mode has NO secondary navigation - admin sections are primary navigation
      return [];
    }

    // User mode secondary navigation
    switch (primarySection) {
      case 'table':
        return [
          {
            key: 'half',
            label: 'Half Season',
            href: '/table/half',
            active: secondarySection === 'half'
          },
          {
            key: 'whole',
            label: 'Whole Season',
            href: '/table/whole',
            active: secondarySection === 'whole'
          }
        ];
      
      case 'records':
        return [
          {
            key: 'leaderboard',
            label: 'Leaderboard',
            href: '/records/leaderboard',
            active: secondarySection === 'leaderboard'
          },
          {
            key: 'legends',
            label: 'Legends',
            href: '/records/legends',
            active: secondarySection === 'legends'
          },
          {
            key: 'feats',
            label: 'Feats',
            href: '/records/feats',
            active: secondarySection === 'feats'
          }
        ];
      
      default:
        return [];
    }
  };

  const secondaryOptions = getSecondaryOptions();

  // Don't render if no secondary options
  if (secondaryOptions.length === 0) {
    return null;
  }

  return (
    <div className={`border-b ${
      isAdminMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
    } ${className}`}>
      <div className="px-6">
        <nav className="flex space-x-8">
          {secondaryOptions.map((option) => (
            <Link
              key={option.key}
              href={option.href}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                option.active
                  ? isAdminMode
                    ? 'border-orange-500 text-white'
                    : 'border-purple-500 text-purple-600'
                  : isAdminMode
                    ? 'border-transparent text-gray-400 hover:text-white hover:border-orange-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-purple-300'
              }`}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}; 