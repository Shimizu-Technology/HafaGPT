#!/bin/bash
# Local development startup script

# Change to project root (one level up from scripts/)
cd "$(dirname "$0")/.." || exit 1

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please copy .env.example to .env and fill in your credentials:"
    echo "  cp .env.example .env"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed. Please install it first:"
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

echo "🚀 Starting HafaGPT API..."
echo ""
echo "API will be available at: http://localhost:8000"
echo "API Docs: http://localhost:8000/api/docs"
echo ""
echo "Press CTRL+C to stop the server"
echo ""

# Run with uv - use python -m to ensure proper module resolution
uv run python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

