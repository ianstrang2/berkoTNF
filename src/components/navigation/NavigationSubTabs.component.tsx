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
              key: 'active',
              label: 'Active',
              href: '/admin/matches?view=active',
              active: !currentView || currentView === 'active'
            },
            {
              key: 'history',
              label: 'History',
              href: '/admin/matches?view=history',
              active: currentView === 'history'
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
                  active: !currentView || currentView === 'general'
              },
              {
                  key: 'stats',
                  label: 'Stats',
                  href: '/admin/setup?section=stats',
                  active: currentView === 'stats'
              },
              {
                  key: 'templates',
                  label: 'Templates',
                  href: '/admin/setup?section=templates',
                  active: currentView === 'templates'
              },
              {
                  key: 'balancing',
                  label: 'Balancing',
                  href: '/admin/setup?section=balancing',
                  active: currentView === 'balancing'
              }
          ]

        default:
          return [];
      }
    }

    // User mode tertiary navigation - Points/Goals for Table only, Season Winners/Top Scorers for Records > Legends
    if (primarySection === 'table') {
      const baseHref = `/table/${secondarySection}`;
      
      // Base options for both half and whole season
      const baseOptions = [
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
        },
        {
          key: 'race',
          label: 'Race',
          href: `${baseHref}?view=race`,
          active: currentView === 'race'
        }
      ];

      return baseOptions;
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
      isAdminMode ? 'border-gray-100 bg-gray-50' : 'border-gray-100 bg-gray-50'
    } ${className}`}>
      <div className="px-6">
        <nav className="flex space-x-6">
          {tertiaryOptions.map((option) => (
            <Link
              key={option.key}
              href={option.href}
              className={`py-3 px-1 text-sm font-medium transition-colors relative ${
                option.active
                  ? 'text-gray-900 font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
              {/* Gradient underline for active state */}
              {option.active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-l from-purple-700 to-pink-500" />
              )}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}; 