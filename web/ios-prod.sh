#!/bin/bash

# HåfaGPT iOS Production Build Script
# Restores production configuration for App Store builds

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌺 HåfaGPT iOS Production Build${NC}"
echo ""

# Remove development .env.local
if [ -f .env.local ]; then
    rm .env.local
    echo -e "${GREEN}✅ Removed .env.local${NC}"
fi

# Restore production capacitor.config.ts
echo -e "${BLUE}📝 Restoring production capacitor.config.ts...${NC}"
cat > capacitor.config.ts << 'EOF'
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shimizutech.hafagpt',
  appName: 'HåfaGPT',
  webDir: 'dist',
  
  // iOS specific settings
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#FDF8F3',
    preferredContentMode: 'mobile',
  },
  
  // Production: No server config - uses bundled dist folder
  // The app will use VITE_API_URL from the build environment
  
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
EOF

# Build for production
echo -e "${BLUE}🔨 Building production bundle...${NC}"
npm run build

# Sync to iOS
echo -e "${BLUE}🔄 Syncing to iOS...${NC}"
npx cap sync ios

echo ""
echo -e "${GREEN}✅ Production build ready!${NC}"
echo ""
echo "Open Xcode and build for release:"
echo "  npx cap open ios"
echo ""

