'use client';
import React from 'react';
import Link from 'next/link';
import { useNavigation } from '@/contexts/NavigationContext';
import { NAVIGATION_CONFIG } from '@/contexts/NavigationContext';
import { useClubConfig } from '@/hooks/useClubConfig.hook';
import { useAuthContext } from '@/contexts/AuthContext';

interface DesktopSidebarProps {
  className?: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ className = '' }) => {
  const { 
    primarySection, 
    secondarySection,
    sidebarCollapsed, 
    setSidebarCollapsed, 
    isAdminMode
  } = useNavigation();
  
  const { profile } = useAuthContext();
  const { clubName } = useClubConfig();
  
  // Determine current context from primarySection (set by URL in NavigationContext)
  const isInSuperadminContext = primarySection === 'superadmin';
  const isInAdminContext = primarySection === 'admin';

  // Admin and superadmin navigation icons
  const getAdminIcon = (section: string) => {
    switch (section) {
      case 'matches':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'players':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'seasons':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'setup':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'tenants':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'system-health':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'tenant-metrics':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'settings':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Get navigation items based on USER PERMISSIONS (not URL)
  const getNavigationItems = () => {
    // Superadmin: Show superadmin menu ONLY if user has permission
    if (profile.isSuperadmin && isInSuperadminContext) {
      const superadminConfig = NAVIGATION_CONFIG.superadmin.secondary;
      return Object.entries(superadminConfig).map(([key, config]) => ({
        key,
        label: config.label,
        href: `/superadmin/${key}`,
        icon: getAdminIcon(key)
      }));
    }
    
    // Admin: Show admin menu ONLY if user has permission
    if (profile.isAdmin && isInAdminContext) {
      const adminConfig = NAVIGATION_CONFIG.admin.secondary;
      return Object.entries(adminConfig).map(([key, config]) => ({
        key,
        label: config.label,
        href: `/admin/${key}`,
        icon: getAdminIcon(key)
      }));
    }

    // Player mode: Show player navigation (default for all users)
    return [
      {
        key: 'dashboard',
        label: 'Home',  // Renamed from Dashboard
        href: '/player/dashboard',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2a1 1 0 001-1v-7m-6 0a1 1 0 00-1 1v3" />
          </svg>
        )
      },
      {
        key: 'upcoming',
        label: 'Upcoming',
        href: '/player/upcoming',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      },
      {
        key: 'stats',
        label: 'Stats',  // Merged Table + Records
        href: '/player/stats/half',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      },
      {
        key: 'chat',
        label: 'Chat',
        href: '/player/chat',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      },
      {
        key: 'settings',
        label: 'Settings',
        href: '/player/settings',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      }
    ];
  };

  const navigationItems = getNavigationItems();

  return (
    <div className={`hidden lg:flex fixed left-0 top-0 h-full transition-all duration-300 z-40 flex-col ${
      sidebarCollapsed ? 'w-16' : 'w-64'
    } ${
      isAdminMode 
        ? 'bg-slate-900 border-r border-slate-700' 
        : 'bg-gray-800 border-r border-gray-700'
    } ${className}`}>
      
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        isAdminMode ? 'border-slate-700' : 'border-gray-700'
      }`}>
        {!sidebarCollapsed && (
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              Club
            </span>
            <span className="text-sm text-white font-medium mt-1 truncate" title={clubName}>
              {clubName.length > 20 ? `${clubName.substring(0, 20)}...` : clubName}
            </span>
          </div>
        )}
        
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-700"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d={sidebarCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
          </svg>
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            // Fix active state logic for both user and admin modes
            const isActive = isAdminMode 
              ? secondarySection === item.key  // In admin mode, check against secondarySection
              : primarySection === item.key;   // In user mode, check against primarySection
            
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-tl from-purple-700/20 to-pink-500/20 text-white shadow-soft-md'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span className={`flex-shrink-0 ${sidebarCollapsed ? 'mx-auto' : ''} ${
                  isActive 
                    ? 'text-purple-400'
                    : ''
                }`}>
                  {item.icon}
                </span>
                {!sidebarCollapsed && (
                  <span className="ml-3 font-medium">{item.label}</span>
                )}
                {/* Active indicator line */}
                {isActive && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 rounded-l-lg bg-gradient-to-b from-pink-500 to-purple-700" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className={`p-4 border-t ${
          isAdminMode ? 'border-slate-700' : 'border-gray-700'
        }`}>
          <div className="text-xs text-gray-400">
            Capo v1.0
          </div>
        </div>
      )}
    </div>
  );
}; 