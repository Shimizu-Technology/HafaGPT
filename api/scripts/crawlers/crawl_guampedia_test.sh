#!/bin/bash

# Test crawl of Guampedia (just the Chamorro Folktales section)
# Use this to verify the crawler works before doing a full site crawl

echo "🧪 Guampedia Test Crawl - Chamorro Folktales"
echo "======================================="
echo ""
echo "This will crawl ONLY the Chamorro Folktales section as a test."
echo ""
echo "⏱️  Estimated time: 2-5 minutes"
echo "📄 Expected pages: ~10-20"
echo "💰 Embedding cost: ~\$0.10"
echo ""

# Change to API directory
cd "$(dirname "$0")/../.." || exit 1

# Crawl just the folktales section with limited depth
uv run python src/crawlers/crawl_website.py https://www.guampedia.com/man-chamorro/chamorro-folktales/ \
  --max-depth 2 \
  --max-pages 20

echo ""
echo "✅ Test crawl complete!"
echo ""
echo "Try asking the chatbot:"
echo "  - 'Tell me about the legend of Sirena'"
echo "  - 'What are some Chamorro folktales?'"
echo "  - 'Tell me the story of Puntan and Fu'una'"
echo ""
echo "If the results look good, run the full crawl:"
echo "  ./crawl_guampedia.sh"
echo ""

