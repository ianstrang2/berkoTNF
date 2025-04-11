'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface NavigationContextType {
  expandedSection: string | null;
  setExpandedSection: (section: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobileView: boolean;
  isSidebarMini: boolean;
  toggleSidebarMini: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [isSidebarMini, setIsSidebarMini] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  
  const toggleSidebarMini = () => {
    setIsSidebarMini(prev => !prev);
  };
  
  // Mark component as hydrated on client-side
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  useEffect(() => {
    // Skip this effect during server-side rendering and initial client render
    if (!isHydrated) return;
    
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      // Initial check
      setIsMobileView(window.innerWidth < 768); // md breakpoint
      
      // Listen for window resize
      const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobileView(mobile);
        
        // Close sidebar when resizing to mobile
        if (mobile && sidebarOpen) {
          setSidebarOpen(false);
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [sidebarOpen, isHydrated]);
  
  return (
    <NavigationContext.Provider value={{ 
      expandedSection, 
      setExpandedSection,
      sidebarOpen,
      setSidebarOpen,
      isMobileView,
      isSidebarMini,
      toggleSidebarMini
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