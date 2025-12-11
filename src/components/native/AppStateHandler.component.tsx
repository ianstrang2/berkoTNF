'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';

/**
 * App State Handler
 * 
 * Handles stale bundle issues after deploy:
 * - If app was backgrounded for 60+ seconds, forces a reload on resume
 * - Catches chunk load errors and reloads to get fresh bundles
 * 
 * This prevents blank screens and broken navigation after Vercel deploys.
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
    App.addListener('appStateChange', (state) => {
      const timestamp = new Date().toISOString();
      console.log(`[APP_STATE] ${timestamp}`, state.isActive ? 'FOREGROUND' : 'BACKGROUND');

      if (!state.isActive) {
        // Going to background - record the time
        backgroundTimeRef.current = Date.now();
        return;
      }

      // Returning to foreground - check how long we were away
      if (backgroundTimeRef.current) {
        const backgroundDuration = Math.round((Date.now() - backgroundTimeRef.current) / 1000);
        console.log(`[APP_STATE] Resumed after ${backgroundDuration}s in background`);

        // If backgrounded for more than 60 seconds, reload to get fresh bundles
        if (backgroundDuration > 60) {
          console.log('[APP_STATE] Long background period, reloading to get fresh bundles...');
          window.location.reload();
          return;
        }
      }

      backgroundTimeRef.current = null;
    }).then((handle) => {
      listenerHandle = handle;
      console.log('[APP_STATE] Listener registered');
    });

    // Safety net: Catch chunk load errors and reload
    const handleChunkError = (event: ErrorEvent) => {
      const message = event.message || '';
      if (
        message.includes('ChunkLoadError') ||
        message.includes('Loading chunk') ||
        message.includes('Failed to fetch dynamically imported module')
      ) {
        console.log('[APP_STATE] Chunk load error detected, reloading...');
        window.location.reload();
      }
    };

    window.addEventListener('error', handleChunkError);

    // Cleanup
    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
        console.log('[APP_STATE] Listener removed');
      }
      window.removeEventListener('error', handleChunkError);
    };
  }, []);

  return null; // This component doesn't render anything
};

