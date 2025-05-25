'use client';
import React from 'react';
import Link from 'next/link';
import { useNavigation, NAVIGATION_CONFIG } from '@/contexts/NavigationContext';
import { useCurrentNavigation } from '@/hooks/useNavigationSync';

interface BottomNavItemProps {
  section: 'dashboard' | 'upcoming' | 'table' | 'records' | 'admin';
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const BottomNavItem: React.FC<BottomNavItemProps> = ({ section, href, icon, label, isActive }) => {
  return (
    <Link href={href} className="flex flex-col items-center justify-center h-full">
      <div className={`flex flex-col items-center justify-center transition-all duration-200 ${
        isActive 
          ? 'text-purple-600 dark:text-purple-400' 
          : 'text-gray-400 dark:text-slate-500 hover:text-purple-500 dark:hover:text-purple-400'
      }`}>
        <div className={`w-6 h-6 mb-1 transition-all duration-200 ${
          isActive ? 'scale-110' : 'scale-100'
        }`}>
          {icon}
        </div>
        <span className={`text-xs font-medium transition-all duration-200 ${
          isActive ? 'opacity-100' : 'opacity-70'
        }`}>
          {label}
        </span>
      </div>
    </Link>
  );
};

// Admin Navigation Items for Admin Mode
const AdminBottomNavItem: React.FC<BottomNavItemProps> = ({ section, href, icon, label, isActive }) => {
  return (
    <Link href={href} className="flex flex-col items-center justify-center h-full">
      <div className={`flex flex-col items-center justify-center transition-all duration-200 ${
        isActive 
          ? 'text-orange-500 dark:text-orange-400' 
          : 'text-gray-300 dark:text-slate-400 hover:text-orange-400 dark:hover:text-orange-300'
      }`}>
        <div className={`w-6 h-6 mb-1 transition-all duration-200 ${
          isActive ? 'scale-110' : 'scale-100'
        }`}>
          {icon}
        </div>
        <span className={`text-xs font-medium transition-all duration-200 ${
          isActive ? 'opacity-100' : 'opacity-80'
        }`}>
          {label}
        </span>
      </div>
    </Link>
  );
};

export const BottomNavigation: React.FC = () => {
  const { isAdminMode, secondarySection } = useNavigation();
  const { primarySection, isActive } = useCurrentNavigation();

  // Navigation icons
  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'dashboard':
        return (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2a1 1 0 001-1v-7m-6 0a1 1 0 00-1 1v3" />
          </svg>
        );
      case 'calendar':
        return (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'table':
        return (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'trophy':
        return (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        );
      case 'settings':
        return (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Admin navigation icons
  const getAdminIcon = (section: string) => {
    switch (section) {
      case 'matches':
        return (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'players':
        return (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'setup':
        return (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Get navigation items based on mode
  const getNavigationItems = () => {
    if (isAdminMode) {
      // Admin mode - show admin sections as primary navigation
      const adminConfig = NAVIGATION_CONFIG.admin.secondary;
      return Object.entries(adminConfig).map(([key, config]) => ({
        section: key as any,
        href: `/admin/${key}`,
        icon: getAdminIcon(key),
        label: config.label,
        isActive: secondarySection === key
      }));
    } else {
      // User mode - show main navigation
      return [
        {
          section: 'dashboard' as const,
          href: '/',
          icon: getIcon('dashboard'),
          label: 'Dashboard',
          isActive: isActive('dashboard')
        },
        {
          section: 'upcoming' as const,
          href: '/upcoming',
          icon: getIcon('calendar'),
          label: 'Upcoming',
          isActive: isActive('upcoming')
        },
        {
          section: 'table' as const,
          href: '/table',
          icon: getIcon('table'),
          label: 'Table',
          isActive: isActive('table')
        },
        {
          section: 'records' as const,
          href: '/records/leaderboard',
          icon: getIcon('trophy'),
          label: 'Records',
          isActive: isActive('records')
        }
      ];
    }
  };

  const navigationItems = getNavigationItems();
  const NavItemComponent = isAdminMode ? AdminBottomNavItem : BottomNavItem;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-all duration-200 ${
      isAdminMode 
        ? 'bg-gray-800 dark:bg-slate-900 border-t border-gray-700' 
        : 'bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700'
    }`}>
      {/* Safe area for iOS */}
      <div className="pb-safe">
        <div className="grid grid-cols-4 h-16">
          {navigationItems.map((item) => (
            <div key={item.section} className="flex items-center justify-center">
              <NavItemComponent {...item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 