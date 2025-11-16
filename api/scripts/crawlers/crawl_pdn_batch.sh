#!/bin/bash
# Simple batch crawler for Pacific Daily News articles
# Usage: bash crawl_pdn_batch.sh

URL_FILE="pdn_urls.txt"
CRAWLER="crawlers/pacific_daily_news.py"

echo "============================================"
echo "Pacific Daily News Batch Crawler"
echo "============================================"
echo ""

# Count total URLs
total=$(grep -v "^#" "$URL_FILE" | grep -v "^$" | wc -l | tr -d ' ')
echo "Found $total URLs to crawl"
echo ""

# Counter
count=0
success=0
failed=0

# Read each URL and crawl
while IFS= read -r url; do
    # Skip comments and empty lines
    [[ "$url" =~ ^#.*$ ]] && continue
    [[ -z "$url" ]] && continue
    
    count=$((count + 1))
    echo "[$count/$total] Crawling..."
    
    # Crawl the URL (without --test flag)
    if uv run python "$CRAWLER" "$url" 2>&1 | grep -q "SUCCESS"; then
        success=$((success + 1))
        echo "✅ Success!"
    else
        failed=$((failed + 1))
        echo "❌ Failed (skipping)"
    fi
    
    echo ""
    
done < "$URL_FILE"

echo "============================================"
echo "Batch Crawl Complete!"
echo "============================================"
echo "Total:   $total"
echo "Success: $success"
echo "Failed:  $failed"
echo ""
echo "💡 Next: Update crawlers/SOURCES.md with new articles"

