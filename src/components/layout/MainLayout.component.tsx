'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import { ResponsiveNavigation } from '@/components/layout/ResponsiveNavigation';
import { AdminModeToggle } from '@/components/navigation/AdminModeToggle';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar';
import { NavigationTabs } from '@/components/navigation/NavigationTabs';
import { NavigationSubTabs } from '@/components/navigation/NavigationSubTabs';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname() || '';
  const { isMobile, isAdminMode, sidebarCollapsed } = useNavigation();
  const [isClient, setIsClient] = useState(false);

  // Mark when component is mounted on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render a simple loading state during server rendering and initial hydration
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

  // Mobile Layout
  if (isMobile) {
    return (
      <ResponsiveNavigation>
        <div className={`min-h-screen transition-all duration-200 ${
          isAdminMode 
            ? 'bg-slate-50 dark:bg-slate-950' 
            : 'bg-gray-50 dark:bg-slate-950'
        } m-0 font-sans text-base antialiased font-normal text-left leading-default text-slate-500 dark:text-white`}>
          {/* Mobile Header - Consistent Soft UI Gradient */}
          <header className="sticky top-0 z-40 bg-gradient-to-tl from-purple-700 to-pink-500 border-b border-purple-700">
            <div className="flex items-center justify-between px-4 py-3">
              {/* App Branding */}
              <div className="flex items-center">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3 p-1">
                  <img 
                    src="/img/logo.png" 
                    alt="StatKick Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-white font-semibold text-lg">StatKick</span>
              </div>
              
              {/* Admin Toggle */}
              <div className="flex items-center">
                <AdminModeToggle />
              </div>
            </div>
          </header>
          
          {/* Mobile Secondary Navigation Tabs */}
          <NavigationTabs />
          
          {/* Mobile Tertiary Navigation Sub-tabs */}
          <NavigationSubTabs />
          
          {/* Main Content with bottom padding for navigation and light gray background */}
          <main className="p-2 pb-20 bg-slate-50 min-h-screen sm:p-4 lg:p-6">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </ResponsiveNavigation>
    );
  }

  // Desktop Layout with new navigation components
  return (
    <ResponsiveNavigation>
      <div className={`min-h-screen transition-all duration-200 ${
        isAdminMode 
          ? 'bg-slate-50 dark:bg-slate-950' 
          : 'bg-slate-50 dark:bg-slate-950'
      } m-0 font-sans text-base antialiased font-normal text-left leading-default text-slate-500 dark:text-white`}>
        
        {/* New Desktop Sidebar */}
        <DesktopSidebar />
        
        {/* Main Content Area */}
        <main className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        } bg-slate-50 min-h-screen`}>
          
          {/* Enhanced Header - Consistent Soft UI Gradient */}
          <header className="sticky top-0 z-30 bg-gradient-to-tl from-purple-700 to-pink-500 border-b border-purple-700">
            <div className="flex items-center justify-between px-6 py-4">
              {/* App Branding */}
              <div className="flex items-center">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-4 p-2">
                  <img 
                    src="/img/logo.png" 
                    alt="StatKick Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-white font-semibold text-xl">StatKick</span>
              </div>
              
              {/* Admin Toggle */}
              <div className="flex items-center">
                <AdminModeToggle />
              </div>
            </div>
          </header>
          
          {/* Secondary Navigation Tabs */}
          <NavigationTabs />
          
          {/* Tertiary Navigation Sub-tabs */}
          <NavigationSubTabs />
          
          {/* Main Content with light gray background */}
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