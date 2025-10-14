import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.caposport.capo',
  appName: 'Capo',
  webDir: 'out', // Next.js static export directory
  
  // ===================================================================
  // SERVER CONFIGURATION FOR DEVELOPMENT
  // ===================================================================
  // For live reload during development, use:
  //   npm run ios:dev      (or: npx cap run ios --live-reload)
  //   npm run android:dev  (or: npx cap run android --live-reload)
  // 
  // Capacitor 7 automatically detects your dev server at localhost:3000.
  // DO NOT hardcode server config here - it breaks production builds.
  // ===================================================================
  
  // Deep link configuration
  // - Custom scheme: capo://
  // - Universal links: https://capo.app/join/*
  // iOS: Configured in Info.plist (ios/App/App/Info.plist)
  // Android: Configured in AndroidManifest.xml
};

export default config;
