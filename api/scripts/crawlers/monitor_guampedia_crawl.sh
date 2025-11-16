#!/bin/bash

# Monitor the Guampedia crawl progress

echo "🌺 Guampedia Crawl Monitor"
echo "======================================="
echo ""

# Check if crawl is running
if pgrep -f "crawl_guampedia.sh" > /dev/null; then
    echo "✅ Crawl is RUNNING"
else
    echo "⚠️  Crawl process not found (may have completed or failed)"
fi

echo ""

# Show latest progress
if [ -f guampedia_crawl.log ]; then
    echo "📊 Latest Progress:"
    echo "-------------------"
    
    # Count pages crawled
    pages=$(grep -c "Crawling: https://www.guampedia.com/" guampedia_crawl.log 2>/dev/null || echo "0")
    echo "Pages crawled: $pages"
    
    # Count bilingual detections
    bilingual=$(grep -c "🌺 Detected bilingual" guampedia_crawl.log 2>/dev/null || echo "0")
    echo "Bilingual pages: $bilingual"
    
    # Count chunks created
    chunks=$(grep -oP 'Created \K\d+(?= chunks)' guampedia_crawl.log 2>/dev/null | awk '{sum+=$1} END {print sum}')
    echo "Total chunks: ${chunks:-0}"
    
    echo ""
    echo "📄 Last 10 pages crawled:"
    echo "-------------------------"
    grep "Crawling: https://www.guampedia.com/" guampedia_crawl.log | tail -10 | sed 's/.*Crawling: /  /' | sed 's/ (depth.*//'
    
    echo ""
    echo "🔍 Recent activity:"
    echo "-------------------"
    tail -15 guampedia_crawl.log | grep -E "(✅|🌺|📄|📊|SUMMARY)"
    
else
    echo "❌ Log file not found: guampedia_crawl.log"
fi

echo ""
echo "💡 Commands:"
echo "  - View full log: tail -f guampedia_crawl.log"
echo "  - Stop crawl: pkill -f crawl_guampedia.sh"
echo "  - Check process: ps aux | grep crawl_guampedia"
echo ""

