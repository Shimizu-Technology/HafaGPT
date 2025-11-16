#!/bin/bash

# Get local IP address (works on macOS)
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

echo "🌺 Starting HåfaGPT Backend API on Network..."
echo "📱 API accessible from your phone at: http://$LOCAL_IP:8000"
echo "💻 API accessible from this computer at: http://localhost:8000"
echo "📚 API Docs: http://$LOCAL_IP:8000/api/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start FastAPI with uvicorn on all network interfaces
cd "$(dirname "$0")/.."
uv run python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

