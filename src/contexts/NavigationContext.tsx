'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  expandedSection: string | null;
  setExpandedSection: (section: string | null) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  return (
    <NavigationContext.Provider value={{ expandedSection, setExpandedSection }}>
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