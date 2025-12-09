'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';
import { useSearchParams } from 'next/navigation';

interface NavOption {
  key: string;
  label: string;
  href: string;
  active: boolean;
  disabled?: boolean;
}

interface NavigationTabsProps {
  className?: string;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ className = '' }) => {
  const pathname = usePathname();
  const { isAdminMode, primarySection, secondarySection, tertiarySection } = useNavigation();
  const searchParams = useSearchParams();

  // Admin mode secondary navigation for setup section only
  if (isAdminMode && secondarySection === 'setup') {
    const currentLevel = searchParams?.get('level') || 'standard';
    
    const adminSetupOptions = [
      {
        key: 'standard',
        label: 'Standard',
        href: '/admin/setup?level=standard&section=general',
        active: currentLevel === 'standard'
      },
      {
        key: 'advanced',
        label: 'Advanced',
        href: '/admin/setup?level=advanced&section=points',
        active: currentLevel === 'advanced'
      }
    ];

    return (
      <div className={`border-b border-gray-200 bg-white ${className}`}>
        <div className="px-6">
          <nav className="flex space-x-8">
            {adminSetupOptions.map((option) => (
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
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-l from-purple-700 to-pink-500" />
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    );
  }

  // Return null for other admin sections
  if (isAdminMode) {
    return null;
  }

  // Get secondary navigation options based on primary section
  const getSecondaryOptions = (): NavOption[] => {
    // User mode secondary navigation
    switch (primarySection) {
      case 'stats':
        // Stats has 4 secondary tabs: Half Season, Season, All Time, Legends
        return [
          {
            key: 'half',
            label: 'Half Season',
            href: '/player/stats/half',
            active: secondarySection === 'half'
          },
          {
            key: 'season',
            label: 'Season',
            href: '/player/stats/season',
            active: secondarySection === 'season'
          },
          {
            key: 'all-time',
            label: 'All Time',
            href: '/player/stats/all-time/leaderboard',
            active: secondarySection === 'all-time'
          },
          {
            key: 'legends',
            label: 'Legends',
            href: '/player/stats/legends/winners',
            active: secondarySection === 'legends'
          }
        ];
      
      case 'settings':
        return [
          {
            key: 'profile',
            label: 'Profile',
            href: '/player/settings/profile',
            active: secondarySection === 'profile'
          },
          {
            key: 'security',
            label: 'Security',
            href: '/player/settings/security',
            active: secondarySection === 'security',
            disabled: false
          },
          {
            key: 'notifications',
            label: 'Notifications',
            href: '#',
            active: false,
            disabled: true
          },
          {
            key: 'billing',
            label: 'Billing',
            href: '#',
            active: false,
            disabled: true
          }
        ];
      
      default:
        return [];
    }
  };

  // Get tertiary navigation options (for Stats > All Time)
  const getTertiaryOptions = (): NavOption[] => {
    if (primarySection === 'stats' && secondarySection === 'all-time') {
      // All Time tertiary: Leaderboard, Feats
      return [
        {
          key: 'leaderboard',
          label: 'Leaderboard',
          href: '/player/stats/all-time/leaderboard',
          active: tertiarySection === 'leaderboard'
        },
        {
          key: 'feats',
          label: 'Feats',
          href: '/player/stats/all-time/feats',
          active: tertiarySection === 'feats'
        }
      ];
    }
    if (primarySection === 'stats' && secondarySection === 'legends') {
      // Legends tertiary: Season Winners, Top Scorers
      return [
        {
          key: 'winners',
          label: 'Season Winners',
          href: '/player/stats/legends/winners',
          active: tertiarySection === 'winners'
        },
        {
          key: 'scorers',
          label: 'Top Scorers',
          href: '/player/stats/legends/scorers',
          active: tertiarySection === 'scorers'
        }
      ];
    }
    return [];
  };

  const secondaryOptions = getSecondaryOptions();
  const tertiaryOptions = getTertiaryOptions();

  // Don't render if no secondary options
  if (secondaryOptions.length === 0) {
    return null;
  }

  // Helper to render navigation tabs
  const renderNavTabs = (options: NavOption[], isSubNav: boolean = false) => (
    <nav className={`flex space-x-8 min-w-max ${isSubNav ? 'space-x-6' : ''}`}>
      {options.map((option) => {
        const isDisabled = option.disabled || false;
        
        if (isDisabled) {
          return (
            <button
              key={option.key}
              onClick={(e) => e.preventDefault()}
              disabled={true}
              type="button"
              className="py-4 px-1 border-b-2 font-medium transition-colors relative border-transparent text-gray-400 cursor-not-allowed opacity-50 text-sm"
            >
              {option.label}
            </button>
          );
        }
        
        return (
          <Link
            key={option.key}
            href={option.href}
            className={`py-4 px-1 border-b-2 font-medium transition-colors relative text-sm ${
              option.active
                ? 'border-transparent text-gray-900 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {option.label}
            {/* Gradient underline for active state */}
            {option.active && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-l from-purple-700 to-pink-500" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Secondary Navigation */}
      <div className={`border-b ${
        isAdminMode ? 'border-gray-200 bg-white' : 'border-gray-200 bg-white'
      } ${className}`}>
        <div className="px-6 overflow-x-auto">
          {renderNavTabs(secondaryOptions)}
        </div>
      </div>
      
      {/* Tertiary Navigation (for Stats > All Time) */}
      {tertiaryOptions.length > 0 && (
        <div className="border-b border-gray-100 bg-gray-50">
          <div className="px-6 overflow-x-auto">
            {renderNavTabs(tertiaryOptions, true)}
          </div>
        </div>
      )}
    </>
  );
}; 