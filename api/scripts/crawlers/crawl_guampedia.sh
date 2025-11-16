#!/bin/bash

# Crawl Guampedia.com for Chamorro cultural knowledge
# This script crawls the entire Guampedia site and adds content to the RAG database

echo "🌺 Guampedia Site-Wide Crawler"
echo "======================================="
echo ""
echo "This will crawl the entire Guampedia website to enhance"
echo "HåfaGPT's knowledge of Chamorro language, culture, and history."
echo ""
echo "⏱️  Estimated time: 2-4 hours"
echo "📄 Expected pages: 300-500"
echo "💰 Embedding cost: ~\$2-5"
echo ""
echo "Press Ctrl+C to cancel..."
echo ""

# Give user 5 seconds to cancel
sleep 5

echo "🚀 Starting crawl..."
echo ""

# Run the crawler with unlimited depth
cd "$(dirname "$0")/../.." && uv run python src/crawlers/crawl_website.py https://www.guampedia.com/ \
  --max-depth 0 \
  --same-domain-only

echo ""
echo "✨ Crawl complete!"
echo ""
echo "Next steps:"
echo "  1. Test the chatbot with Guampedia knowledge"
echo "  2. Ask about Chamorro culture, history, or folktales"
echo "  3. Run 'uv run python manage_rag_db.py list' to see all indexed content"
echo ""

