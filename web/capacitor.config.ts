import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shimizutech.hafagpt',
  appName: 'HåfaGPT',
  webDir: 'dist',
  
  // iOS specific settings
  ios: {
    contentInset: 'never',  // Don't add automatic padding - website handles layout
    backgroundColor: '#FDF8F3',
    preferredContentMode: 'mobile',
  },
  
  // Load from production website (HTTPS for Clerk to work)
  // This means app updates happen via web deploys, not App Store!
  server: {
    url: 'https://hafagpt.com',
    cleartext: false,  // HTTPS only
  },
  
  // Plugins configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FDF8F3',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#FDF8F3',
    },
  },
};

export default config;
