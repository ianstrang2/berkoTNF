'use client';
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { NavigationProvider, useNavigation } from '@/contexts/NavigationContext';
import BottomNav from '@/components/navigation/BottomNav';
import SideNav from '@/components/navigation/SideNav';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const pathname = usePathname() || '';
  const { setExpandedSection } = useNavigation();
  
  useEffect(() => {
    // Set expandedSection based on current pathname
    if (pathname.startsWith('/records/')) {
      setExpandedSection('more');
    } else if (pathname.startsWith('/admin/')) {
      setExpandedSection('admin');
    } else {
      setExpandedSection(null);
    }
  }, [pathname, setExpandedSection]);

  return (
    <>
      <SideNav />
      <div className="md:pl-56 pt-4 min-h-screen bg-neutral-50">
        <main className="px-4 pb-20 md:px-6 md:pb-10 max-w-7xl mx-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <BottomNav />
    </>
  );
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <NavigationProvider>
      <MainLayoutContent>
        {children}
      </MainLayoutContent>
    </NavigationProvider>
  );
} 