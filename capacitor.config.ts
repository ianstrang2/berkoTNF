import type { CapacitorConfig } from '@capacitor/cli';

// ===================================================================
// CAPACITOR CONFIGURATION - WEBVIEW WRAPPER ARCHITECTURE
// ===================================================================
// Mobile app loads the web app via webview (no static export).
// 
// Two modes controlled by CAP_SERVER_ENV:
// - DEV:  Loads http://localhost:3000 (for simulator testing)
// - PROD: Loads https://app.caposport.com (for App Store builds)
// ===================================================================

const isDev = process.env.CAP_SERVER_ENV === 'dev';

const config: CapacitorConfig = {
  appId: 'com.caposport.capo',
  appName: 'Capo',
  webDir: 'public', // Not used in webview mode, but required by Capacitor
  
  // Server configuration based on environment
  // Entry point is /open (smart router) - skips marketing, goes to login or dashboard
  ...(isDev ? {
    server: {
      url: 'http://localhost:3000/open',
      cleartext: true, // Allow HTTP for local dev
    }
  } : {
    server: {
      url: 'https://app.caposport.com/open',
      cleartext: false, // HTTPS only for production
    }
  }),
  
  // Deep link configuration
  // - Custom scheme: capo://
  // - Universal links: https://capo.app/join/*
  // iOS: Configured in Info.plist (ios/App/App/Info.plist)
  // Android: Configured in AndroidManifest.xml
};

export default config;
