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
  const { primarySection, secondarySection, isAdminMode, isAdminAuthenticated, isSuperadmin } = useNavigation();

  // Get current view from search params
  const currentView = searchParams?.get('view');

  // Get tertiary navigation options based on primary and secondary sections
  const getTertiaryOptions = () => {
    // Superadmin tertiary navigation (check first)
    if (primarySection === 'superadmin' && isSuperadmin) {
      if (secondarySection === 'settings') {
        const currentSettingsSection = searchParams?.get('section') || 'stats';
        
        return [
          {
            key: 'stats',
            label: 'Stats',
            href: '/superadmin/settings?section=stats',
            active: currentSettingsSection === 'stats'
          },
          {
            key: 'rsvp',
            label: 'RSVP',
            href: '/superadmin/settings?section=rsvp',
            active: currentSettingsSection === 'rsvp'
          },
          {
            key: 'system',
            label: 'System',
            href: '/superadmin/settings?section=system',
            active: currentSettingsSection === 'system'
          }
        ];
      }
      return [];
    }

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
            }

          ];
        
        case 'setup':
          // Get the current level and section from search params
          const currentLevel = searchParams?.get('level') || 'standard';
          const currentSection = searchParams?.get('section') || (currentLevel === 'standard' ? 'general' : 'points');
          
          // Standard tertiary navigation
          if (currentLevel === 'standard') {
            return [
              {
                key: 'general',
                label: 'General',
                href: '/admin/setup?level=standard&section=general',
                active: currentSection === 'general'
              },
              {
                key: 'matches',
                label: 'Matches',
                href: '/admin/setup?level=standard&section=matches',
                active: currentSection === 'matches'
              },
              {
                key: 'voting',
                label: 'Voting',
                href: '/admin/setup?level=standard&section=voting',
                active: currentSection === 'voting'
              }
            ];
          }
          
          // Advanced tertiary navigation
          if (currentLevel === 'advanced') {
            return [
                {
                key: 'points',
                label: 'Points',
                href: '/admin/setup?level=advanced&section=points',
                active: currentSection === 'points'
              },
              {
                key: 'stats',
                label: 'Stats',
                href: '/admin/setup?level=advanced&section=stats',
                active: currentSection === 'stats'
                },
                {
                key: 'balancing',
                label: 'Balancing',
                href: '/admin/setup?level=advanced&section=balancing',
                active: currentSection === 'balancing'
              },
              {
                key: 'templates',
                label: 'Templates',
                href: '/admin/setup?level=advanced&section=templates',
                active: currentSection === 'templates'
              }
            ];
          }
          
          return [];

        default:
          return [];
      }
    }

    // User mode tertiary navigation - Points/Goals/Race for Stats > Half/Season
    if (primarySection === 'stats') {
      // Points/Goals/Race toggle for Half Season and Season views
      if (secondarySection === 'half' || secondarySection === 'season') {
        const baseHref = `/player/stats/${secondarySection}`;
        
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
          },
          {
            key: 'race',
            label: 'Race',
            href: `${baseHref}?view=race`,
            active: currentView === 'race'
          }
        ];
      }
      
      // Winners/Scorers toggle for All Time > Legends view (handled via tertiarySection in NavigationContext)
      // This is accessed via pathname check since tertiarySection might not be in this component's scope
      if (pathname?.includes('/player/stats/all-time/legends')) {
        const baseHref = `/player/stats/all-time/legends`;
        
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