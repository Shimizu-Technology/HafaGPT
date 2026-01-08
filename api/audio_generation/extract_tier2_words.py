#!/usr/bin/env python3
"""
Extract Tier 2 words from the Chamorro dictionary.
Focuses on common, learnable vocabulary for flashcards and lessons.
"""

import json
from pathlib import Path

# Load dictionary
DICT_PATH = Path(__file__).parent.parent / "dictionary_data" / "revised_and_updated_chamorro_dictionary.json"

# Load existing Tier 1 words to avoid duplicates
TIER1_PATH = Path(__file__).parent / "tier1_words.json"

def load_tier1_words():
    """Load existing Tier 1 words to avoid duplicates."""
    with open(TIER1_PATH) as f:
        data = json.load(f)
    
    words = set()
    for category in data.get("categories", {}).values():
        for word in category.get("words", []):
            words.add(word["chamorro"].lower())
    return words


def is_good_tier2_word(word: str, entry: dict, tier1_words: set) -> bool:
    """Check if word is suitable for Tier 2."""
    # Skip if already in Tier 1
    if word.lower() in tier1_words:
        return False
    
    # Skip very short words (often prefixes/suffixes)
    if len(word) < 3:
        return False
    
    # Skip words with special characters that might cause TTS issues
    if any(c in word for c in ['/', '(', ')', '[', ']', '{', '}', '<', '>']):
        return False
    
    # Get definition
    definition = entry.get("Definition", "")
    if not definition:
        return False
    
    # Skip entries that are primarily grammar explanations (long definitions)
    if len(definition) > 100:
        return False
    
    # Skip definitions that are primarily about other words
    if definition.startswith("see ") or definition.startswith("variant of"):
        return False
    
    # Prefer certain parts of speech
    pos = entry.get("PartOfSpeech", "").lower()
    good_pos = ['n.', 'v.', 'adj.', 'adv.', 'interj.']
    if pos and not any(p in pos for p in good_pos):
        return False
    
    return True


def categorize_word(word: str, entry: dict) -> str:
    """Assign category based on definition content."""
    definition = entry.get("Definition", "").lower()
    
    # Category mappings
    categories = {
        "family": ["mother", "father", "son", "daughter", "brother", "sister", "uncle", "aunt", "grandfather", "grandmother", "family", "relative", "husband", "wife", "child"],
        "body": ["head", "eye", "ear", "nose", "mouth", "hand", "foot", "arm", "leg", "body", "heart", "face", "hair", "finger", "toe"],
        "food": ["eat", "food", "fruit", "vegetable", "meat", "fish", "cook", "rice", "coconut", "banana", "mango"],
        "nature": ["tree", "flower", "ocean", "sea", "sun", "moon", "star", "rain", "wind", "sky", "mountain", "river", "beach"],
        "animals": ["dog", "cat", "bird", "fish", "pig", "chicken", "turtle", "animal"],
        "home": ["house", "home", "door", "window", "room", "bed", "table", "chair", "kitchen"],
        "actions": ["go", "come", "walk", "run", "eat", "drink", "sleep", "wake", "see", "hear", "speak", "say", "give", "take", "make", "do"],
        "descriptions": ["big", "small", "good", "bad", "beautiful", "ugly", "fast", "slow", "hot", "cold", "new", "old", "happy", "sad"],
        "time": ["day", "night", "morning", "afternoon", "evening", "today", "tomorrow", "yesterday", "week", "month", "year"],
        "numbers_ordinals": ["first", "second", "third", "fourth", "fifth", "last"],
        "places": ["place", "land", "island", "village", "town", "church", "school", "store", "market"],
        "people": ["man", "woman", "person", "friend", "people", "boy", "girl"],
        "emotions": ["love", "hate", "happy", "sad", "angry", "afraid", "surprise"],
        "weather": ["rain", "wind", "sun", "cloud", "storm", "hot", "cold"],
    }
    
    for cat, keywords in categories.items():
        if any(kw in definition for kw in keywords):
            return cat
    
    return "general"


def extract_tier2_words(max_words: int = 500) -> dict:
    """Extract Tier 2 words from dictionary."""
    with open(DICT_PATH) as f:
        dictionary = json.load(f)
    
    tier1_words = load_tier1_words()
    print(f"Loaded {len(tier1_words)} Tier 1 words to exclude")
    
    # Collect good words
    candidates = []
    for word, entry in dictionary.items():
        if is_good_tier2_word(word, entry, tier1_words):
            definition = entry.get("Definition", "")
            # Get first meaning if comma-separated
            first_meaning = definition.split(",")[0].strip()
            # Clean up definition
            first_meaning = first_meaning.replace(".", "").strip()
            if first_meaning and len(first_meaning) < 50:
                candidates.append({
                    "chamorro": word,
                    "english": first_meaning,
                    "category": categorize_word(word, entry),
                    "pos": entry.get("PartOfSpeech", ""),
                    "definition_length": len(definition)
                })
    
    print(f"Found {len(candidates)} candidate words")
    
    # Sort by definition length (shorter = more concrete/learnable)
    candidates.sort(key=lambda x: x["definition_length"])
    
    # Take top N words
    selected = candidates[:max_words]
    
    # Organize by category
    by_category = {}
    for word in selected:
        cat = word["category"]
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append({
            "chamorro": word["chamorro"],
            "english": word["english"],
            "phonetic_hint": None  # Will be auto-generated
        })
    
    # Create output structure
    result = {
        "description": f"Tier 2: Core dictionary vocabulary ({len(selected)} words)",
        "version": 1,
        "last_updated": "2026-01-05",
        "categories": {}
    }
    
    for cat, words in sorted(by_category.items()):
        result["categories"][cat] = {
            "description": f"{cat.replace('_', ' ').title()} vocabulary",
            "words": words
        }
        print(f"  {cat}: {len(words)} words")
    
    return result


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Extract Tier 2 words from dictionary")
    parser.add_argument("--max", type=int, default=500, help="Maximum words to extract")
    parser.add_argument("--output", type=str, default="tier2_words.json", help="Output file")
    args = parser.parse_args()
    
    print(f"Extracting up to {args.max} words for Tier 2...")
    result = extract_tier2_words(args.max)
    
    output_path = Path(__file__).parent / args.output
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Saved {sum(len(c['words']) for c in result['categories'].values())} words to {output_path}")

