'use client';
import { useMemo } from 'react';
import { useAuth } from './useAuth.hook';
import { usePathname } from 'next/navigation';

interface ClubConfig {
  clubName: string;
  isLoading: boolean;
  error: string | null;
}

export const useClubConfig = (): ClubConfig => {
  // Get tenant name directly from auth profile (includes tenant data)
  const { profile, loading } = useAuth();
  const pathname = usePathname();
  
  // Extract club name from profile
  const clubName = useMemo(() => {
    // Skip if on superadmin platform pages (no tenant context)
    if (pathname?.startsWith('/superadmin')) {
      return 'Capo';
    }
    
    // Use tenant name from profile (populated via join with tenants table)
    if (profile.tenantName) {
      const cleanName = profile.tenantName.trim();
      if (cleanName.length > 0 && cleanName.length <= 50) {
        return cleanName;
      } else if (cleanName.length > 50) {
        console.warn(`Club name too long (${cleanName.length} chars), using truncated version`);
        return cleanName.substring(0, 50);
      }
    }
    
    return 'Capo'; // Default fallback
  }, [profile.tenantName, pathname]);

  return { 
    clubName, 
    isLoading: loading, 
    error: null
  };
};
