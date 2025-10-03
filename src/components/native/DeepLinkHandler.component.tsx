'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';

/**
 * Deep Link Handler
 * Listens for deep links (capo://) and universal links (https://capo.app)
 * and navigates to the appropriate page in the app
 */
export const DeepLinkHandler = () => {
  const router = useRouter();

  useEffect(() => {
    // Only set up listener in Capacitor environment
    if (typeof window === 'undefined' || !document.documentElement.classList.contains('capacitor')) {
      return;
    }

    const handleDeepLink = (data: any) => {
      const url = data.url;
      
      if (!url) return;

      console.log('[DeepLink] Received:', url);

      // Handle capo:// scheme
      if (url.startsWith('capo://')) {
        const path = url.replace('capo://', '/');
        console.log('[DeepLink] Navigating to:', path);
        router.push(path);
      }
      // Handle https://capo.app universal links
      else if (url.includes('capo.app')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        console.log('[DeepLink] Navigating to:', path);
        router.push(path);
      }
      // Handle localhost/development links
      else if (url.includes('localhost:3000') || url.includes('10.0.2.2:3000')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        console.log('[DeepLink] Navigating to:', path);
        router.push(path);
      }
    };

    // Add listener
    App.addListener('appUrlOpen', handleDeepLink);

    // Cleanup
    return () => {
      App.removeAllListeners();
    };
  }, [router]);

  return null; // This component doesn't render anything
};

