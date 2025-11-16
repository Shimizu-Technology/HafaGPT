#!/bin/bash

# Test crawl for Lengguahi-ta - 10 Pages
# This will crawl ~10 pages to verify data quality and formatting.

echo "🧪 Lengguahi-ta Test Crawl - 10 Pages"
echo "======================================="
echo ""
echo "⏱️  Estimated time: 1-2 minutes"
echo "📄 Pages: ~10"
echo "💰 Cost: \$0 (local HuggingFace embeddings)"
echo ""
echo "⚠️  Ensure your .env DATABASE_URL points to your production Neon DB!"
echo ""

read -p "Press Enter to start the test crawl, or Ctrl+C to cancel..."

cd "$(dirname "$0")" # Change to script directory

cd "$(dirname "$0")/../.." && uv run python src/crawlers/crawl_lengguahita.py \
  --max-depth 2 \
  --max-pages 10 \
  --same-domain-only

echo ""
echo "✅ Test crawl complete!"
echo ""
echo "📊 Review the results:"
echo "  1. Check the terminal output - verify URLs crawled"
echo "  2. Confirm content looks clean (no navigation junk)"
echo "  3. Check chunk counts are reasonable"
echo ""
echo "✨ If it looks good, run the full crawl:"
echo "  ./crawl_lengguahita.sh"
echo ""

