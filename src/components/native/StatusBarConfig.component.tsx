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
        const platform = Capacitor.getPlatform();
        
        // Both platforms: Transparent status bar overlaying content
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setOverlaysWebView({ overlay: true });
        
        if (platform === 'android') {
          // Android: Make status bar transparent (gradient shows through)
          await StatusBar.setBackgroundColor({ color: '#00000000' });
          // Add 'android' class to html for platform-specific CSS
          document.documentElement.classList.add('platform-android');
        } else if (platform === 'ios') {
          // iOS already provides safe-area-inset-top automatically
          document.documentElement.classList.add('platform-ios');
        }
        
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

