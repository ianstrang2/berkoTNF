'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';

/**
 * App State Handler (Diagnostic)
 * 
 * Logs app state changes (foreground/background) to help debug
 * issues with navigation or hydration after iOS/Android resume.
 * 
 * This component only logs - it does not modify navigation behavior.
 */
export const AppStateHandler = () => {
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
      
      if (state.isActive) {
        // App returned to foreground - log diagnostic info
        console.log('[APP_STATE] Diagnostic check:', {
          isNativePlatform: Capacitor.isNativePlatform(),
          platform: Capacitor.getPlatform(),
          capacitorClass: document.documentElement.classList.contains('capacitor'),
        });
      }
    }).then((handle) => {
      listenerHandle = handle;
      console.log('[APP_STATE] Listener registered');
    });

    // Cleanup: Only remove THIS specific listener
    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
        console.log('[APP_STATE] Listener removed');
      }
    };
  }, []);

  return null; // This component doesn't render anything
};

