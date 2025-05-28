'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';

/**
 * Hook to sync navigation state with URL changes
 * Automatically updates navigation context when URL changes
 */
export function useNavigationSync() {
  const { setNavigationFromUrl } = useNavigation();
  const pathname = usePathname();
  
  useEffect(() => {
    if (pathname) {
      setNavigationFromUrl(pathname);
    }
  }, [pathname, setNavigationFromUrl]);
}

/**
 * Hook to get current navigation state based on URL
 */
export function useCurrentNavigation() {
  const { primarySection, secondarySection, isAdminMode } = useNavigation();
  const pathname = usePathname();
  
  return {
    primarySection,
    secondarySection,
    isAdminMode,
    pathname,
    isActive: (section: string, subsection?: string) => {
      if (subsection) {
        return primarySection === section && secondarySection === subsection;
      }
      return primarySection === section;
    }
  };
} 