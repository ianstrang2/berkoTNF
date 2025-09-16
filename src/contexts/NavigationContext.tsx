'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface NavigationState {
  // Navigation state
  primarySection: 'dashboard' | 'upcoming' | 'table' | 'records' | 'admin';
  secondarySection?: string;
  
  // UI state  
  isMobile: boolean;
  sidebarCollapsed: boolean;
  
  // Admin state
  isAdminMode: boolean;
  isAdminAuthenticated: boolean;
  lastVisitedAdminSection?: string;
  lastVisitedUserSection?: string;
}

interface NavigationContextType extends NavigationState {
  // Actions
  setPrimarySection: (section: NavigationState['primarySection']) => void;
  setSecondarySection: (section: string | undefined) => void;
  toggleAdminMode: () => void;
  setNavigationFromUrl: (pathname: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setIsAdminAuthenticated: (authenticated: boolean) => void;
  
  // Computed values
  availableSecondaryOptions: string[];
  
  // Utilities
  isAdminUrl: (pathname: string) => boolean;
  requiresAuthentication: (pathname: string) => boolean;
}

// Navigation Configuration
const NAVIGATION_CONFIG = {
  dashboard: {
    label: 'Dashboard',
    icon: 'dashboard',
    secondary: null
  },
  upcoming: {
    label: 'Upcoming', 
    icon: 'calendar',
    secondary: null
  },
  table: {
    label: 'Table',
    icon: 'table',
    secondary: {
      half: { label: 'Half' },
      whole: { label: 'Whole' }
    }
  },
  records: {
    label: 'Records',
    icon: 'trophy', 
    secondary: {
      leaderboard: { label: 'Leaderboard' },
      legends: { label: 'Legends' },
      feats: { label: 'Feats' }
    }
  },
  admin: {
    label: 'Admin',
    icon: 'settings',
    secondary: {
      matches: { label: 'Matches', tertiary: ['next', 'results'] },
      players: { label: 'Players', tertiary: ['add-edit'] },
      seasons: { label: 'Seasons' },
      info: { label: 'Info' },
      setup: { label: 'Setup', hasSections: true }
    }
  }
};

const NavigationContext = createContext<NavigationContextType | null>(null);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [primarySection, setPrimarySection] = useState<NavigationState['primarySection']>('dashboard');
  const [secondarySection, setSecondarySection] = useState<string | undefined>(undefined);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [lastVisitedAdminSection, setLastVisitedAdminSection] = useState<string | undefined>(undefined);
  const [lastVisitedUserSection, setLastVisitedUserSection] = useState<string | undefined>(undefined);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  
  const pathname = usePathname();
  const router = useRouter();
  
  // Mark component as hydrated on client-side
  useEffect(() => {
    setIsHydrated(true);
    
    // Check admin authentication from localStorage
    const adminAuth = localStorage.getItem('adminAuth');
    setIsAdminAuthenticated(!!adminAuth);
    
    // Check admin mode preference from localStorage
    const adminModePreference = localStorage.getItem('adminMode');
    if (adminModePreference === 'true') {
      setIsAdminMode(true);
    }
  }, []);
  
  // Responsive detection
  useEffect(() => {
    if (!isHydrated) return;
    
    if (typeof window !== 'undefined') {
      // Initial check - mobile < 768px, tablet 768-1024px uses mobile nav, desktop > 1024px
      setIsMobile(window.innerWidth < 1024);
      
      const handleResize = () => {
        const mobile = window.innerWidth < 1024;
        setIsMobile(mobile);
        
        // Auto-collapse sidebar on mobile
        if (mobile) {
          setSidebarCollapsed(true);
        }
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isHydrated]);
  
  // URL parsing and navigation sync
  const setNavigationFromUrl = (pathname: string) => {
    if (pathname.startsWith('/admin/')) {
      setPrimarySection('admin');
      setIsAdminMode(true);
      
      // Parse admin secondary section
      const pathParts = pathname.split('/');
      if (pathParts.length >= 3) {
        const adminSection = pathParts[2];
        setSecondarySection(adminSection);
        setLastVisitedAdminSection(adminSection);
      }
    } else if (pathname.startsWith('/table/')) {
      setPrimarySection('table');
      setIsAdminMode(false);
      const pathParts = pathname.split('/');
      if (pathParts.length >= 3) {
        setSecondarySection(pathParts[2]);
      }
    } else if (pathname.startsWith('/records/')) {
      setPrimarySection('records');
      setIsAdminMode(false);
      const pathParts = pathname.split('/');
      if (pathParts.length >= 3) {
        setSecondarySection(pathParts[2]);
      }
    } else if (pathname.startsWith('/upcoming')) {
      setPrimarySection('upcoming');
      setIsAdminMode(false);
      setSecondarySection(undefined);
    } else {
      setPrimarySection('dashboard');
      setIsAdminMode(false);
      setSecondarySection(undefined);
    }
  };
  
  // Sync navigation with URL changes
  useEffect(() => {
    if (pathname) {
      setNavigationFromUrl(pathname);
    }
  }, [pathname]);
  
  const toggleAdminMode = () => {
    const newAdminMode = !isAdminMode;
    setIsAdminMode(newAdminMode);
    
    // Persist admin mode preference
    localStorage.setItem('adminMode', newAdminMode.toString());
    
    if (newAdminMode) {
      // Switching TO admin mode - remember current user location
      setLastVisitedUserSection(pathname || '/');
      
      setPrimarySection('admin');
      // Restore last visited admin section or default to matches
      const targetSection = lastVisitedAdminSection || 'matches';
      setSecondarySection(targetSection);
      
      // Navigate to admin page
      router.push(`/admin/${targetSection}`);
    } else {
      // Switching FROM admin mode - go back to remembered user location
      setPrimarySection('dashboard');
      setSecondarySection(undefined);
      
      // Navigate back to last user location or dashboard
      const targetUrl = lastVisitedUserSection || '/';
      router.push(targetUrl);
    }
  };
  
  const setAdminAuthenticated = (authenticated: boolean) => {
    setIsAdminAuthenticated(authenticated);
    if (authenticated) {
      localStorage.setItem('adminAuth', 'true');
    } else {
      localStorage.removeItem('adminAuth');
    }
  };
  
  // Utility functions
  const isAdminUrl = (pathname: string): boolean => {
    return pathname.startsWith('/admin/');
  };
  
  const requiresAuthentication = (pathname: string): boolean => {
    return isAdminUrl(pathname);
  };
  
  // Computed values
  const availableSecondaryOptions: string[] = React.useMemo(() => {
    const config = NAVIGATION_CONFIG[primarySection];
    if (config?.secondary) {
      return Object.keys(config.secondary);
    }
    return [];
  }, [primarySection]);
  
  return (
    <NavigationContext.Provider value={{ 
      // State
      primarySection,
      secondarySection,
      isMobile,
      sidebarCollapsed,
      isAdminMode,
      isAdminAuthenticated,
      lastVisitedAdminSection,
      lastVisitedUserSection,
      
      // Actions
      setPrimarySection,
      setSecondarySection,
      toggleAdminMode,
      setNavigationFromUrl,
      setSidebarCollapsed,
      setIsAdminAuthenticated: setAdminAuthenticated,
      
      // Computed values
      availableSecondaryOptions,
      
      // Utilities
      isAdminUrl,
      requiresAuthentication
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

// Export navigation configuration for use in components
export { NAVIGATION_CONFIG }; 