'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { supabase } from '@/lib/supabaseClient';

/**
 * App State Handler
 * 
 * Handles app lifecycle events for Capacitor iOS/Android.
 * 
 * UPDATED (Dec 2025): Added session refresh on resume
 * - Refreshes Supabase session from localStorage when returning to foreground
 * - Proactively refreshes token if close to expiry (within 30 min)
 * - This prevents 401 errors on first API call after long background
 * 
 * See: docs/fixinng_auth.md for architecture decision
 */
export const AppStateHandler = () => {
  const backgroundTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Only set up listener in Capacitor native environment
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle: PluginListenerHandle | null = null;

    // Add state change listener
    App.addListener('appStateChange', async (state) => {
      const timestamp = new Date().toISOString();
      console.log(`[APP_STATE] ${timestamp}`, state.isActive ? 'FOREGROUND' : 'BACKGROUND');

      if (!state.isActive) {
        // Going to background - record the time
        backgroundTimeRef.current = Date.now();
        return;
      }

      // Returning to foreground
      const backgroundDuration = backgroundTimeRef.current
        ? Math.round((Date.now() - backgroundTimeRef.current) / 1000)
        : 0;
      
      console.log(`[APP_STATE] Resumed after ${backgroundDuration}s in background`);
      backgroundTimeRef.current = null;

      // Refresh session from localStorage
      console.log('[APP_STATE] Refreshing session...');
      
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[APP_STATE] Session refresh failed:', error.message);
          return;
        }
        
        if (data.session) {
          console.log('[APP_STATE] Session valid, expires:', new Date(data.session.expires_at! * 1000).toISOString());
          
          // Proactive token refresh if close to expiry (within 30 minutes)
          // This prevents 401s on first API call after long background
          const expiresAt = new Date(data.session.expires_at! * 1000);
          const now = new Date();
          const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000 / 60;
          
          if (minutesUntilExpiry < 30) {
            console.log(`[APP_STATE] Session expiring in ${Math.round(minutesUntilExpiry)} min, refreshing token...`);
            const { error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('[APP_STATE] Token refresh failed:', refreshError.message);
            } else {
              console.log('[APP_STATE] Token refreshed successfully');
            }
          }
        } else {
          console.log('[APP_STATE] No session found - user not logged in');
          // AuthGuard will handle redirect to login if on protected route
        }
      } catch (err) {
        console.error('[APP_STATE] Session refresh error:', err);
      }
    }).then((handle) => {
      listenerHandle = handle;
      console.log('[APP_STATE] Listener registered');
    });

    // Cleanup
    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
        console.log('[APP_STATE] Listener removed');
      }
    };
  }, []);

  return null; // This component doesn't render anything
};
