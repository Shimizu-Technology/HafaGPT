#!/bin/bash

# Micro test: Crawl just 5-10 pages from Guampedia to verify data quality
# This helps you review the formatting before running the full crawl

echo "🧪 Guampedia Micro Test - 5-10 Pages"
echo "======================================="
echo ""
echo "This will crawl ONLY 5-10 pages starting from the homepage"
echo "to verify the data quality and formatting."
echo ""
echo "⏱️  Estimated time: 30 seconds - 1 minute"
echo "📄 Pages: 5-10"
echo "💰 Cost: ~\$0.02"
echo ""

# Change to API directory
cd "$(dirname "$0")/../.." || exit 1

# Start from homepage with max 10 pages, depth 2
uv run python src/crawlers/crawl_website.py https://www.guampedia.com/ \
  --max-depth 2 \
  --max-pages 10

echo ""
echo "✅ Micro test complete!"
echo ""
echo "📊 Review the results:"
echo "  1. Check the terminal output above - look at what URLs were crawled"
echo "  2. Verify the content looks clean (no navigation junk)"
echo "  3. Check chunk counts are reasonable"
echo ""
echo "🔍 Inspect the database:"
echo "  uv run python src/rag/manage_rag_db.py list | grep guampedia"
echo "  uv run python src/rag/manage_rag_db.py search 'Chamorro'"
echo ""
echo "✨ If it looks good, decide next steps:"
echo "  - Run test crawl (20 pages):  ./crawl_guampedia_test.sh"
echo "  - Run full crawl (500+ pages): ./crawl_guampedia.sh"
echo ""

