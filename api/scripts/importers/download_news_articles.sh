#!/bin/bash

# Download Chamorro news articles from Schyuler's GitHub repo

echo "📰 Chamorro News Articles Downloader"
echo "======================================="
echo ""
echo "This will download Chamorro language news articles from:"
echo "https://github.com/schyuler/Chamorro-News-Articles-Scraper"
echo ""

# Create news_articles_data directory
mkdir -p news_articles_data
cd news_articles_data

echo "📥 Downloading news articles..."
echo ""

# Download Saipan Tribune Chamorro articles
echo "[1/1] Downloading saipan_tribune_chamorro_articles.json..."
curl -L -o saipan_tribune_chamorro_articles.json \
  "https://raw.githubusercontent.com/schyuler/Chamorro-News-Articles-Scraper/main/exports/json/saipan_tribune_chamorro_articles.json" \
  2>/dev/null

if [ -f saipan_tribune_chamorro_articles.json ]; then
    size=$(du -h saipan_tribune_chamorro_articles.json | cut -f1)
    echo "   ✅ Downloaded ($size)"
else
    echo "   ❌ Failed"
    echo ""
    echo "💡 Note: The file structure may have changed."
    echo "   Check: https://github.com/schyuler/Chamorro-News-Articles-Scraper/tree/main/exports/json"
fi
echo ""

cd ..

echo "✅ Download complete!"
echo ""
echo "📊 Files saved to: news_articles_data/"
echo ""
echo "📝 To import, run:"
echo "   ./import_news_articles.sh"
echo ""

