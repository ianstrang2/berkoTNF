/**
 * StatusBar Configuration for Native Apps
 * 
 * Configures the Android/iOS system status bar to match app theme
 * Only runs on native platforms (not web)
 */

'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export const StatusBarConfig = () => {
  useEffect(() => {
    const configureStatusBar = async () => {
      console.log("Platform detected:", Capacitor.getPlatform());
      
      // Detect if running on native platform
      const isNative = Capacitor.isNativePlatform();
      
      // Add 'capacitor' class to <html> element for CSS targeting
      if (isNative) {
        document.documentElement.classList.add('capacitor');
      }
      
      // Only configure status bar on native platforms (Android/iOS)
      if (!isNative) {
        return;
      }

      try {
        // Set status bar background to match header gradient top color (purple-700)
        await StatusBar.setBackgroundColor({ color: '#7e22ce' });

        // Use light icons (white) so they're visible on dark purple background
        await StatusBar.setStyle({ style: Style.Light });

        // Show the status bar (don't hide it)
        await StatusBar.show();
      } catch (error) {
        console.error('Error configuring status bar:', error);
      }
    };

    configureStatusBar();
  }, []);

  // This component doesn't render anything
  return null;
};

