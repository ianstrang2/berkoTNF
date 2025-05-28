'use client';
import React from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { BottomNavigation } from '@/components/navigation/BottomNavigation.component';
import { useNavigationSync } from '@/hooks/useNavigationSync.hook';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar.component';

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
      {/* Desktop Navigation - Render based on isMobile or a specific layout hook if available */}
      {!isMobile && <DesktopSidebar />}
    </>
  );
}; 