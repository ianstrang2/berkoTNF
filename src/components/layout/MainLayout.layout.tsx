'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import { ResponsiveNavigation } from '@/components/layout/ResponsiveNavigation.layout';
import { MobileHeader } from '@/components/layout/MobileHeader.component';
import { SuperadminHeader } from '@/components/navigation/SuperadminHeader.component';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar.component';
import { NavigationTabs } from '@/components/navigation/NavigationTabs.component';
import { NavigationSubTabs } from '@/components/navigation/NavigationSubTabs.component';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname() || '';
  const { isMobile, isAdminMode, sidebarCollapsed, setIsAdminAuthenticated, setIsSuperadmin } = useNavigation();
  const { profile, loading: authLoading } = useAuthContext();
  const [isClient, setIsClient] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setIsNativeApp(Capacitor.isNativePlatform());
  }, []);
  
  // Sync auth state with navigation context
  useEffect(() => {
    if (!authLoading && profile.isAuthenticated) {
      setIsAdminAuthenticated(profile.isAdmin);
      setIsSuperadmin(profile.isSuperadmin);
    }
  }, [authLoading, profile, setIsAdminAuthenticated, setIsSuperadmin]);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 m-0 font-sans text-base antialiased font-normal text-left leading-default text-slate-500 dark:text-white flex justify-center items-center">
        <div className="text-center p-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <ResponsiveNavigation>
        <div className={`min-h-screen transition-all duration-200 bg-gray-50 dark:bg-slate-950 m-0 font-sans text-base antialiased font-normal text-left leading-default text-slate-500 dark:text-white`}>
          {/* Use mobile header on Capacitor, web header otherwise */}
          {isNativeApp ? (
            <MobileHeader />
          ) : (
            <header className="sticky top-0 z-40 bg-gradient-to-tl from-purple-700 to-pink-500 border-b border-purple-700">
              <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3 p-1">
                  <img 
                    src="/img/logo.png" 
                    alt="Capo Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-white font-semibold text-lg">Capo</span>
              </div>
              <div className="flex items-center gap-3">
                {/* Show header controls based on CURRENT SECTION */}
                {pathname.startsWith('/superadmin') && profile.isSuperadmin ? (
                  <SuperadminHeader
                    isInTenantContext={false}
                    currentTenantId={profile.tenantId}
                  />
                ) : pathname.startsWith('/admin') && profile.isSuperadmin ? (
                  <SuperadminHeader
                    isInTenantContext={true}
                    currentTenantId={profile.tenantId}
                  />
                ) : pathname.startsWith('/admin') && profile.canSwitchRoles ? (
                  // Admin with linked player - show "View as Player" button
                  <a
                    href="/"
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    👤 View as Player
                  </a>
                ) : !pathname.startsWith('/admin') && !pathname.startsWith('/superadmin') && profile.isAdmin && profile.linkedPlayerId ? (
                  // On player pages, show "Back to Admin" button if user is admin
                  <a
                    href="/admin/matches"
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    ⚙️ Back to Admin
                  </a>
                ) : null}
                
                {/* Logout button only on web (desktop), not mobile app */}
                {profile.isAuthenticated && !pathname.startsWith('/superadmin') && !pathname.startsWith('/admin') && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to logout?')) {
                        localStorage.removeItem('adminAuth');
                        localStorage.removeItem('userProfile');
                        window.location.href = '/auth/login';
                      }
                    }}
                    className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                    title="Logout"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </header>
          )}
          
          <NavigationTabs />
          <NavigationSubTabs />
          <main className="p-2 pb-20 bg-slate-50 min-h-screen sm:p-4 lg:p-6">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </ResponsiveNavigation>
    );
  }

  return (
    <ResponsiveNavigation>
      <div className={`min-h-screen transition-all duration-200 bg-slate-50 dark:bg-slate-950 m-0 font-sans text-base antialiased font-normal text-left leading-default text-slate-500 dark:text-white`}>
        <DesktopSidebar />
        <main className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        } bg-slate-50 min-h-screen`}>
          <header className="sticky top-0 z-30 bg-gradient-to-tl from-purple-700 to-pink-500 border-b border-purple-700">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-4 p-2">
                  <img 
                    src="/img/logo.png" 
                    alt="Capo Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-white font-semibold text-xl">Capo</span>
              </div>
              <div className="flex items-center gap-4">
                {/* Show header controls based on CURRENT SECTION */}
                {pathname.startsWith('/superadmin') && profile.isSuperadmin ? (
                  <SuperadminHeader
                    isInTenantContext={false}
                    currentTenantId={profile.tenantId}
                  />
                ) : pathname.startsWith('/admin') && profile.isSuperadmin ? (
                  <SuperadminHeader
                    isInTenantContext={true}
                    currentTenantId={profile.tenantId}
                  />
                ) : pathname.startsWith('/admin') && profile.canSwitchRoles ? (
                  // Admin with linked player - show "View as Player" button
                  <a
                    href="/"
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <span>👤</span>
                    <span>View as Player</span>
                  </a>
                ) : !pathname.startsWith('/admin') && !pathname.startsWith('/superadmin') && profile.isAdmin && profile.linkedPlayerId ? (
                  // On player pages, show "Back to Admin" button if user is admin
                  <a
                    href="/admin/matches"
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <span>⚙️</span>
                    <span>Back to Admin</span>
                  </a>
                ) : null}
                
                {/* Logout button - show on admin/superadmin, hide on player pages */}
                {profile.isAuthenticated && (pathname.startsWith('/admin') || pathname.startsWith('/superadmin')) && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to logout?')) {
                        localStorage.removeItem('adminAuth');
                        localStorage.removeItem('userProfile');
                        window.location.href = '/auth/login';
                      }
                    }}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    title="Logout"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden lg:inline">Logout</span>
                  </button>
                )}
              </div>
            </div>
          </header>
          <NavigationTabs />
          <NavigationSubTabs />
          <div className="p-6 bg-slate-50 min-h-screen">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </ResponsiveNavigation>
  );
}