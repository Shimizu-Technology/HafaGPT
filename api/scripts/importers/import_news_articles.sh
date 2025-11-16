#!/bin/bash

# Import Chamorro news articles into RAG database

echo "📰 Chamorro News Articles Importer"
echo "======================================="
echo ""

cd "$(dirname "$0")" # Change to script directory

# Check if news articles directory exists
if [ ! -d "news_articles_data" ]; then
    echo "❌ news_articles_data/ directory not found"
    echo ""
    echo "💡 Run this first:"
    echo "   ./download_news_articles.sh"
    echo ""
    exit 1
fi

# Check if articles file exists
if [ ! -f "news_articles_data/saipan_tribune_chamorro_articles.json" ]; then
    echo "❌ No news articles found in news_articles_data/"
    echo ""
    echo "💡 Run this first:"
    echo "   ./download_news_articles.sh"
    echo ""
    exit 1
fi

echo "This will import Chamorro news articles into your RAG database."
echo ""
echo "⏱️  Estimated time: 2-5 minutes"
echo "📄 Expected articles: varies by source"
echo "💰 Embedding cost: \$0 (local HuggingFace embeddings)"
echo "🎯 Priority: 110 (modern Chamorro - high priority!)"
echo ""
echo "⚠️  Ensure your .env DATABASE_URL points to your production Neon DB!"
echo ""

read -p "Press Enter to start importing, or Ctrl+C to cancel..."

echo ""
echo "🚀 Starting import..."
echo ""

# Import news articles
if [ -f "news_articles_data/saipan_tribune_chamorro_articles.json" ]; then
    echo "📰 Importing saipan_tribune_chamorro_articles.json..."
    echo "════════════════════════════════════════════════════"
    cd "$(dirname "$0")/../.." && uv run python src/importers/import_news_articles.py news_articles_data/saipan_tribune_chamorro_articles.json
    echo ""
fi

echo "✅ News articles imported!"
echo ""
echo "🎉 Your chatbot now has modern Chamorro news content!"
echo ""
echo "💡 Try asking:"
echo "   - 'What are recent news topics in Chamorro?'"
echo "   - 'Show me examples of modern Chamorro writing'"
echo "   - 'What issues are Chamorro writers discussing?'"
echo ""

