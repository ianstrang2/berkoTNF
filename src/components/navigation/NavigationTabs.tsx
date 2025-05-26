'use client';
import React from 'react';
import Link from 'next/link';
import { useNavigation } from '@/contexts/NavigationContext';
import { useSearchParams } from 'next/navigation';

interface NavigationTabsProps {
  className?: string;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ className = '' }) => {
  const { primarySection, secondarySection, isAdminMode, isAdminAuthenticated } = useNavigation();
  const searchParams = useSearchParams();

  // Get secondary navigation options based on primary section
  const getSecondaryOptions = () => {
    if (isAdminMode && isAdminAuthenticated) {
      // Admin mode secondary navigation
      switch (secondarySection) {
        case 'setup':
          return [
            {
              key: 'general',
              label: 'General',
              href: '/admin/setup?section=general',
              active: !searchParams?.get('section') || searchParams?.get('section') === 'general'
            },
            {
              key: 'fantasy',
              label: 'Fantasy',
              href: '/admin/setup?section=fantasy',
              active: searchParams?.get('section') === 'fantasy'
            },
            {
              key: 'milestones',
              label: 'Milestones',
              href: '/admin/setup?section=milestones',
              active: searchParams?.get('section') === 'milestones'
            },
            {
              key: 'templates',
              label: 'Templates',
              href: '/admin/setup?section=templates',
              active: searchParams?.get('section') === 'templates'
            },
            {
              key: 'balancing',
              label: 'Balancing',
              href: '/admin/setup?section=balancing',
              active: searchParams?.get('section') === 'balancing'
            }
          ];
        
        default:
          return [];
      }
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
      isAdminMode ? 'border-gray-200 bg-white' : 'border-gray-200 bg-white'
    } ${className}`}>
      <div className="px-6">
        <nav className="flex space-x-8">
          {secondaryOptions.map((option) => (
            <Link
              key={option.key}
              href={option.href}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
                option.active
                  ? 'border-transparent text-gray-900 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {option.label}
              {/* Gradient underline for active state */}
              {option.active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-700 to-pink-500" />
              )}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}; 