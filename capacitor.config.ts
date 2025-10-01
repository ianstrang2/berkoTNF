import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.caposport.capo',
  appName: 'Capo',
  webDir: 'public', // unused placeholder
  server: {
    // --- Development mode ---
    // Use your local machine’s IP so the Android device/emulator can reach it
    // Replace 192.168.1.100 with your actual IP from `ipconfig`
    url: 'http://10.0.2.2:3000', // special host alias for Android emulator
    cleartext: true,

    // --- Production mode ---
    // Comment out the two lines above and use your deployed domain:
    // url: 'https://caposport.com'
  },
  androidScheme: 'https'
};

export default config;
