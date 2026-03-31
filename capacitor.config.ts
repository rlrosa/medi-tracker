import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meditracker.app',
  appName: 'MediTracker',
  webDir: 'out',
  server: {
    url: 'https://medi-tracker-zeta.vercel.app', // Or the user's actual live URL
    cleartext: true
  }
};

export default config;
