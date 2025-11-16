#!/bin/bash

# Full crawl for Lengguahi-ta
# This will crawl all educational content (stories, lessons, songs, legends).

echo "🌺 Lengguahi-ta Site-Wide Crawler"
echo "======================================="
echo ""
echo "This will crawl Lengguahi-ta's educational content to give"
echo "HåfaGPT high-quality bilingual learning resources."
echo ""
echo "⏱️  Estimated time: 30-45 minutes"
echo "📄 Expected pages: ~200 (stories, lessons, songs, legends)"
echo "💰 Embedding cost: \$0 (local HuggingFace embeddings)"
echo ""
echo "Press Ctrl+C to cancel..."
echo ""

read -p "Press Enter to start the crawl..."

cd "$(dirname "$0")" # Change to script directory

echo ""
echo "🚀 Starting crawl..."
echo ""

cd "$(dirname "$0")/../.." && uv run python src/crawlers/crawl_lengguahita.py \
  --max-depth 0 \
  --max-pages 250 \
  --same-domain-only

echo ""
echo "✅ Lengguahi-ta crawl complete!"
echo "✨ Your chatbot now has bilingual educational content with audio transcriptions."
echo ""

