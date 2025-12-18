'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { supabase } from '@/lib/supabaseClient';

/**
 * Deep Link Handler
 * 
 * Listens for deep links (capo://) and universal links (https://capo.app)
 * and navigates to the appropriate page in the app.
 * 
 * UPDATED (Dec 2025): Added session check before routing to protected pages
 * - Prevents redirect loops when deep linking with stale/missing tokens
 * - Redirects to login with returnUrl if session missing for protected routes
 * 
 * See: docs/fixinng_auth.md for architecture decision
 */
export const DeepLinkHandler = () => {
  const router = useRouter();

  useEffect(() => {
    // Only set up listener in Capacitor environment
    if (typeof window === 'undefined' || !document.documentElement.classList.contains('capacitor')) {
      return;
    }

    let listenerHandle: PluginListenerHandle | null = null;

    const handleDeepLink = async (data: any) => {
      const url = data.url;
      
      if (!url) return;

      console.log('[DeepLink] Received:', url);

      // Parse path from URL
      let path = '/';
      
      if (url.startsWith('capo://')) {
        path = url.replace('capo://', '/');
      } else if (url.includes('capo.app')) {
        const urlObj = new URL(url);
        path = urlObj.pathname + urlObj.search;
      } else if (url.includes('localhost:') || url.includes('10.0.2.2:') || url.includes('127.0.0.1:')) {
        const urlObj = new URL(url);
        path = urlObj.pathname + urlObj.search;
      }

      // Check if this is a protected route
      const isProtectedRoute = 
        path.startsWith('/player') || 
        path.startsWith('/admin') || 
        path.startsWith('/superadmin');

      if (isProtectedRoute) {
        // Verify session before routing to protected page
        console.log('[DeepLink] Protected route, checking session...');
        
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (!sessionData?.session) {
            console.log('[DeepLink] No session, redirecting to login');
            router.push(`/auth/login?returnUrl=${encodeURIComponent(path)}`);
            return;
          }
          
          console.log('[DeepLink] Session valid, navigating to:', path);
        } catch (err) {
          console.error('[DeepLink] Session check failed:', err);
          router.push(`/auth/login?returnUrl=${encodeURIComponent(path)}`);
          return;
        }
      } else {
        console.log('[DeepLink] Public route, navigating to:', path);
      }

      router.push(path);
    };

    // Add listener and store handle for cleanup
    App.addListener('appUrlOpen', handleDeepLink).then((handle) => {
      listenerHandle = handle;
    });

    // Cleanup: Only remove THIS specific listener, not all listeners
    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [router]);

  return null; // This component doesn't render anything
};
