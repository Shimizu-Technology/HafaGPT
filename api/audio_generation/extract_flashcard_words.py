#!/usr/bin/env python3
"""
Extract all words from the curated flashcard decks (frontend).
Check which ones are missing from the audio manifest.
"""

import json
import re
from pathlib import Path

# Paths
FRONTEND_PATH = Path(__file__).parent.parent.parent / "HafaGPT-frontend"
FLASHCARDS_PATH = FRONTEND_PATH / "src" / "data" / "defaultFlashcards.ts"
MANIFEST_PATH = Path(__file__).parent / "manifest.json"
OUTPUT_PATH = Path(__file__).parent / "flashcard_words.json"


def parse_flashcards_ts() -> list:
    """Parse the TypeScript flashcard file to extract all words."""
    with open(FLASHCARDS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    words = []
    
    # Find all card objects with front/back
    # Pattern matches: front: 'word', back: 'translation'
    pattern = r"front:\s*['\"]([^'\"]+)['\"],\s*\n\s*back:\s*['\"]([^'\"]+)['\"]"
    matches = re.findall(pattern, content)
    
    for front, back in matches:
        # Clean up the text
        front = front.replace("\\'", "'")
        back = back.replace("\\'", "'")
        words.append({
            "chamorro": front,
            "english": back
        })
    
    return words


def load_manifest() -> dict:
    """Load the current audio manifest."""
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"words": {}}


def normalize(text: str) -> str:
    """Normalize text for comparison."""
    return text.lower().strip()


def main():
    print("📋 Extracting words from curated flashcards...")
    
    flashcard_words = parse_flashcards_ts()
    print(f"   Found {len(flashcard_words)} flashcard words")
    
    manifest = load_manifest()
    existing_words = set(normalize(w) for w in manifest.get("words", {}).keys())
    print(f"   Manifest has {len(existing_words)} words")
    
    # Find missing words
    missing = []
    already_have = []
    
    for word in flashcard_words:
        chamorro = word["chamorro"]
        if normalize(chamorro) in existing_words:
            already_have.append(word)
        else:
            missing.append(word)
    
    print(f"\n✅ Already have: {len(already_have)}")
    print(f"❌ Missing: {len(missing)}")
    
    if missing:
        print("\n📝 Missing words:")
        for word in missing[:30]:  # Show first 30
            print(f"   - {word['chamorro']} ({word['english']})")
        if len(missing) > 30:
            print(f"   ... and {len(missing) - 30} more")
    
    # Save missing words in format for generation
    output = {
        "description": "Curated flashcard words missing from audio manifest",
        "version": 1,
        "total": len(missing),
        "categories": {
            "flashcards": {
                "description": "Curated flashcard vocabulary",
                "words": [
                    {
                        "chamorro": w["chamorro"],
                        "english": w["english"],
                        "phonetic_hint": None
                    }
                    for w in missing
                ]
            }
        }
    }
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Saved to {OUTPUT_PATH}")
    return missing


if __name__ == "__main__":
    main()

