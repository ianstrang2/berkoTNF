'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';

interface NavigationSubTabsProps {
  className?: string;
}

export const NavigationSubTabs: React.FC<NavigationSubTabsProps> = ({ className = '' }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { primarySection, secondarySection, isAdminMode, isAdminAuthenticated } = useNavigation();

  // Get current view from search params
  const currentView = searchParams?.get('view');

  // Get tertiary navigation options based on primary and secondary sections
  const getTertiaryOptions = () => {
    if (isAdminMode && isAdminAuthenticated) {
      // Admin tertiary navigation
      switch (secondarySection) {
        case 'matches':
          return [
            {
              key: 'next',
              label: 'Next Match',
              href: '/admin/matches/next',
              active: pathname === '/admin/matches/next'
            },
            {
              key: 'results',
              label: 'Results',
              href: '/admin/matches/results',
              active: pathname === '/admin/matches/results'
            }
          ];
        
        case 'players':
          return [
            {
              key: 'add-edit',
              label: 'Add/Edit',
              href: '/admin/players/add-edit',
              active: pathname === '/admin/players/add-edit'
            },
            {
              key: 'ratings',
              label: 'Ratings',
              href: '/admin/players/ratings',
              active: pathname === '/admin/players/ratings'
            }
          ];
        
        case 'setup':
          return [
            {
              key: 'general',
              label: 'General',
              href: '/admin/setup?section=general',
              active: pathname === '/admin/setup' && (!currentView || currentView === 'general')
            },
            {
              key: 'fantasy',
              label: 'Fantasy',
              href: '/admin/setup?section=fantasy',
              active: pathname === '/admin/setup' && currentView === 'fantasy'
            },
            {
              key: 'milestones',
              label: 'Milestones',
              href: '/admin/setup?section=milestones',
              active: pathname === '/admin/setup' && currentView === 'milestones'
            },
            {
              key: 'templates',
              label: 'Templates',
              href: '/admin/setup?section=templates',
              active: pathname === '/admin/setup' && currentView === 'templates'
            },
            {
              key: 'balancing',
              label: 'Balancing',
              href: '/admin/setup?section=balancing',
              active: pathname === '/admin/setup' && currentView === 'balancing'
            }
          ];
        
        default:
          return [];
      }
    }

    // User mode tertiary navigation - Points/Goals for Table only, Season Winners/Top Scorers for Records > Legends
    if (primarySection === 'table') {
      const baseHref = `/table/${secondarySection}`;
      
      return [
        {
          key: 'points',
          label: 'Points',
          href: `${baseHref}?view=points`,
          active: !currentView || currentView === 'points' // Default to points if no view param
        },
        {
          key: 'goals',
          label: 'Goals',
          href: `${baseHref}?view=goals`,
          active: currentView === 'goals'
        }
      ];
    }

    if (primarySection === 'records' && secondarySection === 'legends') {
      const baseHref = `/records/legends`;
      
      return [
        {
          key: 'winners',
          label: 'Season Winners',
          href: `${baseHref}?view=winners`,
          active: !currentView || currentView === 'winners' // Default to winners if no view param
        },
        {
          key: 'scorers',
          label: 'Top Scorers',
          href: `${baseHref}?view=scorers`,
          active: currentView === 'scorers'
        }
      ];
    }

    return [];
  };

  const tertiaryOptions = getTertiaryOptions();

  // Don't render if no tertiary options
  if (tertiaryOptions.length === 0) {
    return null;
  }

  return (
    <div className={`border-b ${
      isAdminMode ? 'border-gray-600 bg-gray-700' : 'border-gray-100 bg-gray-50'
    } ${className}`}>
      <div className="px-6">
        <nav className="flex space-x-6">
          {tertiaryOptions.map((option) => (
            <Link
              key={option.key}
              href={option.href}
              className={`py-3 px-1 text-sm font-medium transition-colors ${
                option.active
                  ? isAdminMode
                    ? 'text-white border-b-2 border-orange-400'
                    : 'text-purple-600 border-b-2 border-purple-500'
                  : isAdminMode
                    ? 'text-gray-300 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
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