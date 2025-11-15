#!/bin/bash

# Get local IP address (works on macOS)
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

echo "🌺 Starting HåfaGPT Frontend on Network..."
echo "📱 Access from your phone at: http://$LOCAL_IP:5173"
echo "💻 Access from this computer at: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start Vite dev server with network access
npm run dev -- --host 0.0.0.0

