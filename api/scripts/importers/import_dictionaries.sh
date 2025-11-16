#!/bin/bash

# Import Chamorro dictionaries into RAG database

echo "📚 Chamorro Dictionary Importer"
echo "======================================="
echo ""

cd "$(dirname "$0")" # Change to script directory

# Check if dictionary files exist
if [ ! -d "dictionary_data" ]; then
    echo "❌ dictionary_data/ directory not found"
    echo ""
    echo "💡 Run this first:"
    echo "   ./download_dictionaries.sh"
    echo ""
    exit 1
fi

# Check if at least one dictionary exists
if [ ! -f "dictionary_data/revised_and_updated_chamorro_dictionary.json" ] && \
   [ ! -f "dictionary_data/chamorro_english_dictionary_TOD.json" ] && \
   [ ! -f "dictionary_data/chamoru_info_dictionary.json" ]; then
    echo "❌ No dictionary files found in dictionary_data/"
    echo ""
    echo "💡 Run this first:"
    echo "   ./download_dictionaries.sh"
    echo ""
    exit 1
fi

echo "This will import Chamorro dictionary data into your RAG database."
echo ""
echo "⏱️  Estimated time: 5-10 minutes"
echo "📄 Expected entries: ~30,000+"
echo "💰 Embedding cost: \$0 (local HuggingFace embeddings)"
echo "🎯 Priority: 50 (dictionary reference - lower than educational content)"
echo ""
echo "⚠️  Ensure your .env DATABASE_URL points to your production Neon DB!"
echo ""

read -p "Press Enter to start importing, or Ctrl+C to cancel..."

echo ""
echo "🚀 Starting import..."
echo ""

# Import the most comprehensive dictionary first
if [ -f "dictionary_data/revised_and_updated_chamorro_dictionary.json" ]; then
    echo "📖 [1/3] Importing revised_and_updated_chamorro_dictionary.json..."
    echo "════════════════════════════════════════════════════"
    cd "$(dirname "$0")/../.." && uv run python src/importers/import_dictionary.py dictionary_data/revised_and_updated_chamorro_dictionary.json
    echo ""
fi

# Import TOD dictionary
if [ -f "dictionary_data/chamorro_english_dictionary_TOD.json" ]; then
    echo "📖 [2/3] Importing chamorro_english_dictionary_TOD.json..."
    echo "════════════════════════════════════════════════════"
    cd "$(dirname "$0")/../.." && uv run python src/importers/import_dictionary.py dictionary_data/chamorro_english_dictionary_TOD.json
    echo ""
fi

# Import chamoru.info dictionary
if [ -f "dictionary_data/chamoru_info_dictionary.json" ]; then
    echo "📖 [3/3] Importing chamoru_info_dictionary.json..."
    echo "════════════════════════════════════════════════════"
    cd "$(dirname "$0")/../.." && uv run python src/importers/import_dictionary.py dictionary_data/chamoru_info_dictionary.json
    echo ""
fi

echo "✅ All dictionaries imported!"
echo ""
echo "🎉 Your chatbot now has comprehensive dictionary coverage!"
echo ""
echo "💡 Try asking:"
echo "   - 'What does [word] mean?'"
echo "   - 'Define [word] in Chamorro'"
echo "   - 'How do you say [word] in English?'"
echo ""

