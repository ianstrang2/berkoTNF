'use client';
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { NavigationProvider, useNavigation } from '@/contexts/NavigationContext';
import Sidebar from '@/components/navigation/Sidebar';
import Navbar from '@/components/navigation/Navbar';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

// Navigation items
const navigationItems = [
  {
    label: 'Dashboard',
    href: '/',
    icon: (
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2a1 1 0 001-1v-7m-6 0a1 1 0 00-1 1v3" />
      </svg>
    )
  },
  {
    label: 'Season',
    href: '/season',
    icon: (
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    )
  },
  {
    label: 'Records',
    href: '/records',
    icon: (
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    )
  },
  {
    label: 'Admin',
    href: '/admin',
    icon: (
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
];

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const pathname = usePathname() || '';
  const { setExpandedSection, sidebarOpen } = useNavigation();
  
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

  // Generate breadcrumbs based on pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [
    { name: "Pages", path: "#" },
    ...pathSegments.map((segment, index) => ({
      name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
      path: `/${pathSegments.slice(0, index + 1).join('/')}`
    }))
  ];

  // Get current page title
  const pageTitle = pathSegments.length > 0 
    ? pathSegments[pathSegments.length - 1].charAt(0).toUpperCase() + 
      pathSegments[pathSegments.length - 1].slice(1).replace(/-/g, ' ')
    : 'Dashboard';

  return (
    <div className="min-h-screen bg-[#f8f9fa] m-0 font-sans">
      {/* Sidebar Component */}
      <Sidebar 
        logoLight="/logo.png"
        logoDark="/logo.png"
        navItems={navigationItems}
        isNeedHelp={true}
      />
      
      {/* Main Content Area - adjusted margin only on md and above */}
      <div className="w-full transition-all duration-200 ease-soft-in-out md:ml-68">
        {/* Navbar Component */}
        <Navbar 
          pageTitle={pageTitle}
          breadcrumbs={breadcrumbs}
          searchPlaceholder="Type here..."
        />
        
        {/* Main Content */}
        <div className="w-full p-6 mx-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </div>
    </div>
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