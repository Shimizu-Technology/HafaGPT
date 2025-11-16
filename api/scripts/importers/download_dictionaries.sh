#!/bin/bash

# Download Chamorro dictionary JSON files from Schyuler's GitHub repo

echo "📚 Chamorro Dictionary Downloader"
echo "======================================="
echo ""
echo "This will download pre-processed dictionary data from:"
echo "https://github.com/schyuler/Chamorro-Dictionary-Scraper"
echo ""

# Create dictionary_data directory
mkdir -p dictionary_data
cd dictionary_data

echo "📥 Downloading dictionary files..."
echo ""

# Download revised and updated dictionary (4.54 MB - most comprehensive)
echo "[1/3] Downloading revised_and_updated_chamorro_dictionary.json (4.54 MB)..."
curl -L -o revised_and_updated_chamorro_dictionary.json \
  "https://raw.githubusercontent.com/schyuler/Chamorro-Dictionary-Scraper/main/exports/json/revised_and_updated_chamorro_dictionary.json" \
  2>/dev/null

if [ -f revised_and_updated_chamorro_dictionary.json ]; then
    size=$(du -h revised_and_updated_chamorro_dictionary.json | cut -f1)
    echo "   ✅ Downloaded ($size)"
else
    echo "   ❌ Failed"
fi
echo ""

# Download TOD dictionary (1000 KB)
echo "[2/3] Downloading chamorro_english_dictionary_TOD.json (1000 KB)..."
curl -L -o chamorro_english_dictionary_TOD.json \
  "https://raw.githubusercontent.com/schyuler/Chamorro-Dictionary-Scraper/main/exports/json/chamorro_english_dictionary_TOD.json" \
  2>/dev/null

if [ -f chamorro_english_dictionary_TOD.json ]; then
    size=$(du -h chamorro_english_dictionary_TOD.json | cut -f1)
    echo "   ✅ Downloaded ($size)"
else
    echo "   ❌ Failed"
fi
echo ""

# Download chamoru.info dictionary
echo "[3/3] Downloading chamoru_info_dictionary.json..."
curl -L -o chamoru_info_dictionary.json \
  "https://raw.githubusercontent.com/schyuler/Chamorro-Dictionary-Scraper/main/exports/json/chamoru_info_dictionary.json" \
  2>/dev/null

if [ -f chamoru_info_dictionary.json ]; then
    size=$(du -h chamoru_info_dictionary.json | cut -f1)
    echo "   ✅ Downloaded ($size)"
else
    echo "   ❌ Failed"
fi
echo ""

cd ..

echo "✅ Download complete!"
echo ""
echo "📊 Files saved to: dictionary_data/"
echo ""
echo "📝 To import, run:"
echo "   ./import_dictionary.sh"
echo ""

