'use client';
import React from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { useNavigationSync } from '@/hooks/useNavigationSync';

interface ResponsiveNavigationProps {
  children: React.ReactNode;
}

export const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({ children }) => {
  const { isMobile } = useNavigation();
  
  // Sync navigation state with URL
  useNavigationSync();

  return (
    <>
      {children}
      
      {/* Mobile Navigation */}
      {isMobile && <BottomNavigation />}
    </>
  );
}; 