'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type NavigationContextType = {
  expandedSection: string | null;
  setExpandedSection: (section: string | null) => void;
};

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  return (
    <NavigationContext.Provider value={{ expandedSection, setExpandedSection }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
} 