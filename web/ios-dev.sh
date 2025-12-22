#!/bin/bash

# HåfaGPT iOS Development Script
# Automatically detects your IP and configures everything for Capacitor development

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌺 HåfaGPT iOS Development Setup${NC}"
echo ""

# Get the current IP address
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")

if [ -z "$IP" ]; then
    echo -e "${YELLOW}⚠️  Could not detect IP address. Using localhost...${NC}"
    IP="localhost"
fi

echo -e "${GREEN}📍 Detected IP: ${IP}${NC}"

# Create/update .env.local with dynamic IP
echo -e "${BLUE}📝 Updating .env.local...${NC}"
cat > .env.local << EOF
# Auto-generated for iOS Capacitor development
# Generated at: $(date)
VITE_API_URL=http://${IP}:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlYW4tbW9ua2V5LTU1LmNsZXJrLmFjY291bnRzLmRldiQ
EOF

# Update capacitor.config.ts with dynamic IP
echo -e "${BLUE}📝 Updating capacitor.config.ts...${NC}"
cat > capacitor.config.ts << EOF
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
  
  // Development server - loads from local Vite dev server
  server: {
    url: 'http://${IP}:5173',
    cleartext: true
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
EOF

# Sync Capacitor
echo -e "${BLUE}🔄 Syncing Capacitor...${NC}"
npx cap sync ios

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo ""
echo "1. Start the backend (in a new terminal):"
echo -e "   ${BLUE}cd ../HafaGPT-API && source .venv/bin/activate && uvicorn api.main:app --reload --host 0.0.0.0 --port 8000${NC}"
echo ""
echo "2. Start the frontend (in another terminal):"
echo -e "   ${BLUE}npm run dev -- --host${NC}"
echo ""
echo "3. In Xcode, press Cmd+R to run the app"
echo ""
echo -e "${GREEN}🌐 Your servers will be at:${NC}"
echo "   Frontend: http://${IP}:5173"
echo "   Backend:  http://${IP}:8000"
echo ""

