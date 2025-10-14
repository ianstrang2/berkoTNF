import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.caposport.capo',
  appName: 'Capo',
  webDir: 'out', // Next.js static export directory
  
  // ===================================================================
  // SERVER CONFIGURATION FOR DEVELOPMENT
  // ===================================================================
  // For live reload during development, use:
  //   npx cap run ios --livereload --external
  //   npx cap run android --livereload --external
  // 
  // This will automatically inject the server config with your machine's IP.
  // DO NOT hardcode server config here - it breaks production builds.
  // ===================================================================
  
  // Deep link configuration
  // - Custom scheme: capo://
  // - Universal links: https://capo.app/join/*
  // iOS: Configured in Info.plist (ios/App/App/Info.plist)
  // Android: Configured in AndroidManifest.xml
};

export default config;
