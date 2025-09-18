'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import { ResponsiveNavigation } from '@/components/layout/ResponsiveNavigation.layout';
import { AdminModeToggle } from '@/components/navigation/AdminModeToggle.component';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar.component';
import { NavigationTabs } from '@/components/navigation/NavigationTabs.component';
import { NavigationSubTabs } from '@/components/navigation/NavigationSubTabs.component';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname() || '';
  const { isMobile, isAdminMode, sidebarCollapsed } = useNavigation();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
              <div className="flex items-center">
                <AdminModeToggle />
              </div>
            </div>
          </header>
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
              <div className="flex items-center">
                <AdminModeToggle />
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