import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shimizutech.hafagpt',
  appName: 'HåfaGPT',
  webDir: 'dist',  // Load from local build (enables OAuth to work properly)
  
  // iOS specific settings
  ios: {
    contentInset: 'never',  // Don't add automatic padding - website handles layout
    backgroundColor: '#FDF8F3',
    preferredContentMode: 'mobile',
  },
  
  // No server.url = loads from local webDir build
  // This means OAuth works properly (cookies stay in WebView context)
  // Trade-off: App updates require App Store submission (backend updates are still instant)
  
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
