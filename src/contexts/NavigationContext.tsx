'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface NavigationContextType {
  expandedSection: string | null;
  setExpandedSection: (section: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobileView: boolean;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  
  useEffect(() => {
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
  }, [sidebarOpen]);
  
  return (
    <NavigationContext.Provider value={{ 
      expandedSection, 
      setExpandedSection,
      sidebarOpen,
      setSidebarOpen,
      isMobileView
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