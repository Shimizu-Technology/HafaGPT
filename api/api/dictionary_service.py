"""
Dictionary Service - Loads and serves vocabulary data from dictionary JSON files.

Uses the revised_and_updated_chamorro_dictionary.json as the primary source
(146K lines, most complete with part of speech and examples).
"""

import json
import os
import logging
import unicodedata
import re
from typing import Optional
from pathlib import Path

logger = logging.getLogger(__name__)


def normalize_chamorro(text: str) -> str:
    """
    Normalize Chamorro text for search by removing diacritics and special characters.
    
    Handles:
    - å → a (a with ring above)
    - ñ → n (n with tilde)
    - ' (glottal stop) → removed
    - á, é, í, ó, ú → a, e, i, o, u (acute accents)
    
    Examples:
    - "hånum" → "hanum"
    - "ma'åse'" → "maase"
    - "Si Yu'os Ma'åse'" → "si yuos maase"
    """
    if not text:
        return ""
    
    # Convert to lowercase first
    text = text.lower()
    
    # Replace specific Chamorro characters
    replacements = {
        'å': 'a',
        'ñ': 'n',
        "'": '',   # Glottal stop (apostrophe)
        "'": '',   # Curly apostrophe
        "‑": '-',  # Non-breaking hyphen to regular hyphen
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    # Use Unicode normalization to handle other diacritics (á, é, etc.)
    # NFD decomposes characters, then we remove combining marks
    normalized = unicodedata.normalize('NFD', text)
    # Remove combining diacritical marks (category 'Mn')
    text = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
    
    return text


def get_spelling_variants(text: str) -> list[str]:
    """
    Generate common Chamorro spelling variants for fuzzy matching.
    
    In Chamorro, there are common spelling variations:
    - o/u are often interchangeable (hanom/hanum)
    - e/i can be interchangeable in some words
    
    This helps users find words even with alternate spellings.
    """
    normalized = normalize_chamorro(text)
    variants = [normalized]
    
    # Generate o/u variants
    if 'o' in normalized:
        variants.append(normalized.replace('o', 'u'))
    if 'u' in normalized:
        variants.append(normalized.replace('u', 'o'))
    
    # For words with multiple o/u, generate combinations
    # e.g., "chocho" -> "chucho", "chochu", "chuchu"
    if normalized.count('o') + normalized.count('u') > 1:
        # Simple approach: swap all o<->u
        swapped = normalized.replace('o', 'X').replace('u', 'o').replace('X', 'u')
        if swapped not in variants:
            variants.append(swapped)
    
    return variants

# Category mappings - map words to categories based on patterns/keywords
CATEGORY_DEFINITIONS = {
    "greetings": {
        "title": "Greetings & Basics",
        "icon": "👋",
        "description": "Essential greetings and polite expressions",
        "keywords": ["hello", "goodbye", "thank", "please", "excuse", "sorry", "welcome", "greet", "morning", "afternoon", "evening", "night"]
    },
    "family": {
        "title": "Family",
        "icon": "👨‍👩‍👧",
        "description": "Family members and relationships",
        "keywords": ["mother", "father", "brother", "sister", "son", "daughter", "child", "parent", "grandmother", "grandfather", "uncle", "aunt", "cousin", "spouse", "husband", "wife", "family", "sibling", "baby", "elder"]
    },
    "numbers": {
        "title": "Numbers",
        "icon": "🔢",
        "description": "Count from 1 to 100 and beyond",
        "keywords": ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "hundred", "thousand", "first", "second", "third", "number", "count"]
    },
    "colors": {
        "title": "Colors",
        "icon": "🎨",
        "description": "Learn color words in Chamorro",
        "keywords": ["red", "blue", "green", "yellow", "white", "black", "orange", "pink", "purple", "brown", "gray", "color"]
    },
    "food": {
        "title": "Food & Drink",
        "icon": "🍲",
        "description": "Food, drinks, and cooking terms",
        "keywords": ["food", "eat", "drink", "water", "rice", "fish", "meat", "chicken", "pork", "beef", "vegetable", "fruit", "coconut", "banana", "cook", "soup", "bread", "milk", "coffee", "hungry", "thirsty"]
    },
    "animals": {
        "title": "Animals",
        "icon": "🐕",
        "description": "Common animals and creatures",
        "keywords": ["dog", "cat", "bird", "fish", "pig", "chicken", "cow", "horse", "buffalo", "crab", "turtle", "lizard", "gecko", "animal", "insect"]
    },
    "body": {
        "title": "Body Parts",
        "icon": "🖐️",
        "description": "Parts of the human body",
        "keywords": ["head", "eye", "ear", "nose", "mouth", "hand", "arm", "leg", "foot", "stomach", "hair", "tooth", "finger", "body"]
    },
    "nature": {
        "title": "Nature & Weather",
        "icon": "🌴",
        "description": "Nature, weather, and environment",
        "keywords": ["sun", "moon", "star", "rain", "wind", "ocean", "sea", "land", "tree", "flower", "sky", "cloud", "storm", "typhoon", "weather", "hot", "cold", "mountain", "river", "beach"]
    },
    "places": {
        "title": "Places & Home",
        "icon": "🏠",
        "description": "Locations, buildings, and home",
        "keywords": ["house", "home", "school", "church", "store", "village", "road", "street", "room", "door", "window", "table", "chair", "bed", "kitchen", "bathroom"]
    },
    "time": {
        "title": "Time & Days",
        "icon": "📅",
        "description": "Days, months, and time expressions",
        "keywords": ["today", "tomorrow", "yesterday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "week", "month", "year", "day", "night", "morning", "afternoon", "hour", "minute", "time"]
    },
    "verbs": {
        "title": "Common Verbs",
        "icon": "🏃",
        "description": "Action words and doing words",
        "keywords": ["go", "come", "see", "hear", "eat", "drink", "sleep", "walk", "run", "speak", "say", "tell", "know", "understand", "want", "need", "like", "love", "make", "do", "give", "take", "buy", "sell"]
    },
    "phrases": {
        "title": "Useful Phrases",
        "icon": "💬",
        "description": "Common expressions for daily life",
        "keywords": ["yes", "no", "maybe", "where", "what", "when", "why", "how", "who", "can", "cannot", "problem", "help", "understand"]
    }
}


class DictionaryService:
    """Service for loading and querying Chamorro dictionary data."""
    
    _instance = None
    _dictionary: dict = {}
    _word_list: list = []
    _categories_cache: dict = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_dictionary()
        return cls._instance
    
    def _load_dictionary(self):
        """Load the dictionary JSON file into memory."""
        # Try to find the dictionary file
        base_path = Path(__file__).parent.parent
        dict_path = base_path / "dictionary_data" / "revised_and_updated_chamorro_dictionary.json"
        
        if not dict_path.exists():
            logger.error(f"Dictionary file not found: {dict_path}")
            return
        
        try:
            with open(dict_path, 'r', encoding='utf-8') as f:
                self._dictionary = json.load(f)
            
            # Build word list for faster iteration
            self._word_list = []
            for word, data in self._dictionary.items():
                if isinstance(data, dict):
                    entry = {
                        "chamorro": word,
                        "part_of_speech": data.get("PartOfSpeech", ""),
                        "definition": data.get("Definition", ""),
                        "examples": self._extract_examples(data.get("Other", []))
                    }
                else:
                    # Simple string definition
                    entry = {
                        "chamorro": word,
                        "part_of_speech": "",
                        "definition": str(data),
                        "examples": []
                    }
                self._word_list.append(entry)
            
            # Pre-categorize words
            self._build_category_cache()
            
            logger.info(f"✅ Dictionary loaded: {len(self._word_list)} words")
            
        except Exception as e:
            logger.error(f"Failed to load dictionary: {e}")
    
    def _extract_examples(self, other_data: list) -> list:
        """Extract example sentences from the 'Other' field."""
        examples = []
        if not other_data:
            return examples
        
        # The 'Other' field contains alternating Chamorro/English sentences
        i = 0
        while i < len(other_data) - 1:
            chamorro = other_data[i].strip() if other_data[i] else ""
            english = other_data[i + 1].strip() if i + 1 < len(other_data) and other_data[i + 1] else ""
            
            # Skip empty entries, metadata entries (Syn:, Variant:, etc.)
            if chamorro and not chamorro.startswith(("Syn:", "Variant:", "See:", "Cf:", "Alt:")):
                if english and not english.startswith(("Syn:", "Variant:", "See:", "Cf:", "Alt:")):
                    examples.append({
                        "chamorro": chamorro,
                        "english": english
                    })
            i += 2
        
        return examples[:3]  # Limit to 3 examples
    
    def _build_category_cache(self):
        """Pre-categorize words into categories based on definitions."""
        self._categories_cache = {cat_id: [] for cat_id in CATEGORY_DEFINITIONS.keys()}
        
        for entry in self._word_list:
            definition_lower = entry["definition"].lower()
            part_of_speech = entry.get("part_of_speech", "").lower()
            
            # Check each category's keywords with smart matching
            for cat_id, cat_info in CATEGORY_DEFINITIONS.items():
                if self._matches_category(definition_lower, part_of_speech, cat_id, cat_info["keywords"]):
                    self._categories_cache[cat_id].append(entry)
                    break  # Only add to first matching category
        
        # Log category counts
        for cat_id, words in self._categories_cache.items():
            logger.info(f"  Category '{cat_id}': {len(words)} words")
    
    def _matches_category(self, definition: str, part_of_speech: str, category_id: str, keywords: list) -> bool:
        """
        Smart category matching to avoid false positives.
        
        Problems with naive keyword matching:
        - "one who..." matches "one" for numbers
        - "the second letter" matches "second" for numbers
        - "first lady" matches "first" for numbers
        
        Solution: Use context-aware matching based on category type.
        """
        import re
        
        # === NUMBERS: Very strict matching ===
        if category_id == "numbers":
            # Only match if definition STARTS with the number word
            number_words = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
                           "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
                           "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty", "sixty", "seventy",
                           "eighty", "ninety", "hundred", "thousand", "million", "billion"]
            
            # Ordinals only if they're about position/ranking, not "first lady" etc.
            ordinal_words = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"]
            
            for num in number_words:
                # Definition starts with the number (e.g., "one (1)" or "two, ...")
                if definition.startswith(num + " ") or definition.startswith(num + ",") or definition.startswith(num + "("):
                    # But NOT "one who", "one that", "one of the"
                    if not (definition.startswith("one who") or definition.startswith("one that") or 
                            definition.startswith("one of") or definition.startswith("one capable")):
                        return True
            
            # Check for actual digit in parentheses like (1), (2), (10), etc.
            # But NOT single letters like (m), (f), (n)
            if re.search(r'\(\d{1,3}\)', definition):  # Contains (1), (12), (100), etc.
                return True
            
            # Definition starts with digits (e.g., "1, 2, 3...")
            if re.search(r'^\d', definition):
                return True
            
            return False
        
        # === COLORS: Strict matching - definition should be about the color itself ===
        if category_id == "colors":
            color_words = ["red", "blue", "green", "yellow", "white", "black", "orange", "pink", "purple", "brown", "gray", "grey"]
            for color in color_words:
                # Definition starts with or is primarily about the color
                if definition.startswith(color) or f"color: {color}" in definition or f"colour: {color}" in definition:
                    return True
                # Or the word is a color adjective
                if part_of_speech in ["adj.", "adj"] and color in definition[:30]:
                    return True
            return False
        
        # === FAMILY: Strict matching - must be about actual family relationships ===
        if category_id == "family":
            # Skip if it's a "one who..." pattern (these are usually occupations)
            if definition.startswith("one who") or definition.startswith("one that") or definition.startswith("one capable"):
                return False
            
            # Only match if definition STARTS with or IS PRIMARILY about family terms
            family_terms = ["mother", "father", "brother", "sister", "son", "daughter", 
                           "parent", "grandmother", "grandfather", "grandparent",
                           "uncle", "aunt", "cousin", "spouse", "husband", "wife", 
                           "sibling", "family", "relative", "ancestor", "descendant",
                           "nephew", "niece", "in-law", "stepmother", "stepfather"]
            
            for term in family_terms:
                # Definition starts with the term
                if definition.startswith(term):
                    return True
                # Or it's in noun form and the term is the primary meaning
                if part_of_speech in ["n.", "n"] and definition.split(",")[0].strip() == term:
                    return True
            
            # Also match if "child" is the primary meaning (not "crybaby", "childish", etc.)
            if definition.startswith("child") and not definition.startswith("childish"):
                return True
            if definition.startswith("baby") and not definition.startswith("babyish"):
                return True
            
            return False
        
        # === FOOD: Strict matching - must be actual food/drink ===
        if category_id == "food":
            # Skip entries that are clearly not food (tools, equipment, body parts, etc.)
            skip_words = ["toilet", "hermit crab", "broom", "tendon", "shore", "coast",
                         "fish trap", "fishing line", "fishing pole", "spear", "torch",
                         "container", "tube", "husk", "tear off", "tear ", "perspiration",
                         "dishonor", "disgrace", "shame", "dove", "pigeon", "frond", "leaf",
                         "dried shoot", "dried coconut leaf", "feelers of", "core of"]
            for skip in skip_words:
                if skip in definition:
                    return False
            
            # Must be actual food items or cooking
            food_terms = ["food", "rice", "coconut", "banana", "meat", "chicken", "pork", "beef",
                         "vegetable", "fruit", "soup", "bread", "milk", "coffee", "tea",
                         "drink", "meal", "dish", "dessert", "sweet", "candy", "cake",
                         "recipe", "ingredient", "sauce", "salt", "sugar", "pepper", "oil", "butter", 
                         "egg", "shrimp", "lobster", "taro", "yam", "potato", "mango", "papaya", 
                         "guava", "citrus", "lime", "lemon", "salty", "sour", "bitter", "spicy",
                         "cook", "boil", "fry", "bake", "roast", "grill", "pancake", "noodle"]
            
            for term in food_terms:
                if definition.startswith(term) or f"type of food" in definition:
                    return True
                # Or it's clearly about eating/cooking
                first_part = definition.split(",")[0].strip()
                if part_of_speech in ["n.", "n"] and term in first_part:
                    return True
            
            return False
        
        # === ANIMALS: Strict matching ===
        if category_id == "animals":
            # Must be about an actual animal
            animal_terms = ["dog", "cat", "bird", "pig", "chicken", "cow", "horse", "buffalo",
                           "crab", "turtle", "lizard", "gecko", "fish", "goat", "deer", "rat", "mouse",
                           "snake", "frog", "insect", "bee", "ant", "spider", "butterfly"]
            
            for term in animal_terms:
                if definition.startswith(term) or f"type of {term}" in definition:
                    return True
            
            # Or explicitly says "type of animal/bird/fish/insect"
            if "type of animal" in definition or "type of bird" in definition:
                return True
            
            return False
        
        # === BODY: Strict matching ===
        if category_id == "body":
            body_terms = ["head", "eye", "ear", "nose", "mouth", "tongue", "lip", "tooth", "teeth",
                         "hand", "arm", "leg", "foot", "feet", "finger", "toe", "nail", "hair",
                         "face", "neck", "shoulder", "chest", "back", "stomach", "belly", "knee",
                         "elbow", "wrist", "ankle", "skin", "bone", "blood", "heart", "brain"]
            
            for term in body_terms:
                if definition.startswith(term) or f"part of the {term}" in definition:
                    return True
                if part_of_speech in ["n.", "n"] and term == definition.split(",")[0].strip():
                    return True
            
            return False
        
        # === VERBS: Check part of speech ===
        if category_id == "verbs":
            # Prefer actual verbs
            if part_of_speech in ["vt.", "vi.", "v.", "vt", "vi", "v"]:
                for keyword in keywords:
                    if keyword in definition:
                        return True
            return False
        
        # === DEFAULT: Standard keyword matching with filtering ===
        for keyword in keywords:
            # Skip number-like words that cause false positives
            if keyword in ["one", "two", "three", "first", "second", "third"]:
                continue
            
            # Skip words that commonly cause false positives
            if keyword in ["baby", "child", "elder", "family"]:
                continue
            
            if keyword in definition:
                # Extra check: avoid matching in "one who [keyword]" patterns
                if f"one who {keyword}" in definition or f"one that {keyword}" in definition:
                    continue
                return True
        
        return False
    
    def get_categories(self) -> list:
        """Get list of all vocabulary categories with word counts."""
        categories = []
        for cat_id, cat_info in CATEGORY_DEFINITIONS.items():
            word_count = len(self._categories_cache.get(cat_id, []))
            categories.append({
                "id": cat_id,
                "title": cat_info["title"],
                "icon": cat_info["icon"],
                "description": cat_info["description"],
                "word_count": word_count
            })
        return categories
    
    def get_category_words(self, category_id: str, limit: int = 100, offset: int = 0) -> dict:
        """Get words in a specific category."""
        if category_id not in self._categories_cache:
            return {"words": [], "total": 0, "category": None}
        
        cat_info = CATEGORY_DEFINITIONS.get(category_id, {})
        words = self._categories_cache[category_id]
        
        # Sort alphabetically by Chamorro word
        sorted_words = sorted(words, key=lambda x: x["chamorro"].lower())
        
        return {
            "words": sorted_words[offset:offset + limit],
            "total": len(sorted_words),
            "category": {
                "id": category_id,
                "title": cat_info.get("title", ""),
                "icon": cat_info.get("icon", ""),
                "description": cat_info.get("description", "")
            }
        }
    
    def search(self, query: str, limit: int = 50) -> list:
        """
        Search for words matching the query in Chamorro or English.
        
        Supports:
        - Diacritic-insensitive search: "hanum" finds "hånum"
        - Spelling variant search: "hanom" finds "hånum" (o/u variants)
        - "maase" will find "ma'åse'"
        """
        if not query or len(query) < 2:
            return []
        
        query_lower = query.lower().strip()
        query_normalized = normalize_chamorro(query)
        query_variants = get_spelling_variants(query)  # e.g., ["hanom", "hanum"]
        results = []
        seen_words = set()  # Avoid duplicates
        
        # Search through all words
        for entry in self._word_list:
            chamorro_lower = entry["chamorro"].lower()
            chamorro_normalized = normalize_chamorro(entry["chamorro"])
            
            # Skip if we've already added this word
            if chamorro_lower in seen_words:
                continue
            
            # Priority 0: Exact match (with diacritics)
            if query_lower == chamorro_lower:
                results.append((0, entry))
                seen_words.add(chamorro_lower)
                continue
            
            # Priority 1: Exact match (normalized/without diacritics)
            if query_normalized == chamorro_normalized:
                results.append((1, entry))
                seen_words.add(chamorro_lower)
                continue
            
            # Priority 1.5: Exact match with spelling variant (o/u swap)
            if chamorro_normalized in query_variants:
                results.append((1, entry))
                seen_words.add(chamorro_lower)
                continue
            
            # Priority 2: Starts with (with diacritics)
            if chamorro_lower.startswith(query_lower):
                results.append((2, entry))
                seen_words.add(chamorro_lower)
                continue
            
            # Priority 3: Starts with (normalized)
            if chamorro_normalized.startswith(query_normalized):
                results.append((3, entry))
                seen_words.add(chamorro_lower)
                continue
            
            # Priority 3.5: Starts with spelling variant
            if any(chamorro_normalized.startswith(v) for v in query_variants):
                results.append((3, entry))
                seen_words.add(chamorro_lower)
                continue
            
            # Priority 4: Contains (with diacritics)
            if query_lower in chamorro_lower:
                results.append((4, entry))
                seen_words.add(chamorro_lower)
                continue
            
            # Priority 5: Contains (normalized)
            if query_normalized in chamorro_normalized:
                results.append((5, entry))
                seen_words.add(chamorro_lower)
                continue
            
            # Priority 5.5: Contains spelling variant
            if any(v in chamorro_normalized for v in query_variants):
                results.append((5, entry))
                seen_words.add(chamorro_lower)
                continue
            
            # Priority 6: English definition match
            if query_lower in entry["definition"].lower():
                results.append((6, entry))
        
        # Sort by priority, then alphabetically
        results.sort(key=lambda x: (x[0], x[1]["chamorro"].lower()))
        
        return [r[1] for r in results[:limit]]
    
    def get_word(self, word: str) -> Optional[dict]:
        """
        Get detailed information for a specific word.
        
        Supports diacritic-insensitive lookup:
        - "hanom" will find "hånum"
        """
        # Try exact match first
        if word in self._dictionary:
            data = self._dictionary[word]
            if isinstance(data, dict):
                return {
                    "chamorro": word,
                    "part_of_speech": data.get("PartOfSpeech", ""),
                    "definition": data.get("Definition", ""),
                    "examples": self._extract_examples(data.get("Other", []))
                }
            else:
                return {
                    "chamorro": word,
                    "part_of_speech": "",
                    "definition": str(data),
                    "examples": []
                }
        
        # Try case-insensitive match
        word_lower = word.lower()
        for key in self._dictionary.keys():
            if key.lower() == word_lower:
                return self.get_word(key)
        
        # Try normalized match (diacritic-insensitive)
        word_normalized = normalize_chamorro(word)
        for key in self._dictionary.keys():
            if normalize_chamorro(key) == word_normalized:
                return self.get_word(key)
        
        # Try spelling variants (o/u swaps, etc.)
        for variant in get_spelling_variants(word):
            for key in self._dictionary.keys():
                if normalize_chamorro(key) == variant:
                    return self.get_word(key)
        
        return None
    
    def get_word_with_morphology(self, word: str) -> dict:
        """
        Enhanced word lookup that uses Chamorro morphology to find root words.
        
        Returns a dict with:
        - found: bool - whether any definition was found
        - word: str - the original word
        - definition: dict or None - the dictionary entry if found
        - root_word: str or None - the root word if different from original
        - morphology_note: str or None - explanation of the word form
        - suggestions: list - other possible lookups to try
        """
        from .chamorro_morphology import normalize_for_lookup, get_root_candidates
        
        result = {
            "found": False,
            "word": word,
            "definition": None,
            "root_word": None,
            "morphology_note": None,
            "suggestions": []
        }
        
        # Try direct lookup first
        direct_result = self.get_word(word)
        if direct_result:
            result["found"] = True
            result["definition"] = direct_result
            return result
        
        # Try morphological variants
        lookup_variants = normalize_for_lookup(word)
        for variant in lookup_variants:
            if variant == word:
                continue
            variant_result = self.get_word(variant)
            if variant_result:
                result["found"] = True
                result["definition"] = variant_result
                result["root_word"] = variant
                break
        
        # Get morphology explanation
        candidates = get_root_candidates(word)
        if candidates:
            # Use the first candidate's explanation
            root, explanation = candidates[0]
            result["morphology_note"] = explanation
            
            # If we found a definition via variant, update the note
            if result["found"] and result["root_word"]:
                result["morphology_note"] = f"'{word}' is a form of '{result['root_word']}'"
            
            # Add suggestions for words we didn't find
            if not result["found"]:
                for root, _ in candidates[:3]:
                    if root not in result["suggestions"]:
                        result["suggestions"].append(root)
        
        return result
    
    def get_stats(self) -> dict:
        """Get dictionary statistics."""
        return {
            "total_words": len(self._word_list),
            "categories": len(CATEGORY_DEFINITIONS),
            "words_per_category": {
                cat_id: len(words) 
                for cat_id, words in self._categories_cache.items()
            }
        }
    
    def get_flashcards(self, category_id: str, count: int = 10, shuffle: bool = True) -> dict:
        """
        Get flashcard-formatted words from a category.
        
        Returns words formatted for flashcard display:
        - front: Chamorro word
        - back: English definition
        - part_of_speech: Part of speech
        - examples: Example sentences (if available)
        
        Args:
            category_id: The category to get words from
            count: Number of flashcards to return
            shuffle: Whether to shuffle the cards (for variety)
        """
        import random
        
        if category_id not in self._categories_cache:
            return {"cards": [], "total": 0, "category": None}
        
        cat_info = CATEGORY_DEFINITIONS.get(category_id, {})
        words = self._categories_cache[category_id]
        
        # Filter to words with good definitions (not too long, not too short)
        good_words = [
            w for w in words 
            if len(w["definition"]) > 3 and len(w["definition"]) < 200
            and not w["definition"].lower().startswith("type of")  # Skip taxonomic entries
            and not w["definition"].lower().startswith("see ")  # Skip cross-references
        ]
        
        # Shuffle for variety if requested
        if shuffle:
            random.shuffle(good_words)
        
        # Take the requested count
        selected = good_words[:count]
        
        # Format as flashcards
        flashcards = []
        for word in selected:
            # Get first example if available
            example = None
            if word.get("examples") and len(word["examples"]) > 0:
                ex = word["examples"][0]
                example = f"{ex.get('chamorro', '')} - {ex.get('english', '')}"
            
            flashcards.append({
                "front": word["chamorro"],
                "back": word["definition"],
                "part_of_speech": word.get("part_of_speech", ""),
                "example": example
            })
        
        return {
            "cards": flashcards,
            "total": len(good_words),
            "category": {
                "id": category_id,
                "title": cat_info.get("title", ""),
                "icon": cat_info.get("icon", ""),
                "description": cat_info.get("description", "")
            }
        }
    
    def get_word_of_the_day(self) -> dict:
        """
        Get a word of the day based on the current date.
        
        Uses a deterministic selection based on day of year so everyone
        sees the same word on the same day. Prioritizes common, useful words
        from family-friendly categories.
        """
        import datetime
        import hashlib
        
        # Get day of year (1-365/366)
        today = datetime.date.today()
        day_of_year = today.timetuple().tm_yday
        year = today.year
        
        # SAFE CATEGORIES - Only pick from these family-friendly categories
        safe_categories = {
            'greetings', 'numbers', 'colors', 'food', 'family', 
            'animals', 'nature', 'places', 'time', 'body'
        }
        
        # BLOCKLIST - Words that shouldn't be word of the day
        # (inappropriate, too obscure, or not useful for learners)
        blocklist = {
            # Bodily functions / inappropriate
            "takmi'", "takme'", "mutot", "mumu", "ngånga'", "ñaknak",
            "chi'ok", "podong", "mamokkat", "pokpok", "mamuti",
            # Death / violence related
            "matai", "puno'", "patgon matai",
            # Rude words
            "poksai", "dåkon", "båba",
            # Too obscure or archaic
            "magåhet", "umassagua",
        }
        
        # Create a list of "good" words for word of the day
        # Filter for words that are:
        # - From safe categories only
        # - Not in blocklist
        # - Not too long (< 20 chars)
        # - Have clear, simple definitions (< 100 chars)
        # - Not taxonomic ("type of...")
        # - Have examples (preferred)
        
        good_words = []
        for entry in self._word_list:
            chamorro = entry["chamorro"]
            definition = entry["definition"]
            category = entry.get("category", "").lower()
            
            # Skip if not from a safe category
            if category not in safe_categories:
                continue
            
            # Skip blocklisted words
            if chamorro.lower() in blocklist:
                continue
            
            # Skip long words
            if len(chamorro) > 20:
                continue
            
            # Skip complex definitions
            if len(definition) > 150:
                continue
            
            # Skip empty, n/a, or too short definitions
            if not definition or len(definition) < 3 or definition.lower() in ['n/a', 'na', 'none', '-', '?']:
                continue
            
            # Skip taxonomic entries
            if definition.lower().startswith("type of"):
                continue
            
            # Skip cross-references
            if definition.lower().startswith("see "):
                continue
            
            # Skip words with special characters in the middle (compounds)
            if " " in chamorro and len(chamorro) > 15:
                continue
            
            # Skip definitions with inappropriate keywords
            definition_lower = definition.lower()
            if any(word in definition_lower for word in ['urinate', 'feces', 'excrement', 'buttocks', 'genitals', 'prostitute', 'drunk']):
                continue
            
            # Skip proper names and nicknames (not useful for language learners)
            part_of_speech = entry.get("part_of_speech", "").lower()
            if 'name' in part_of_speech or part_of_speech in ['name.', 'n.pr.', 'proper noun']:
                continue
            if 'nickname' in definition_lower or 'proper name' in definition_lower:
                continue
            
            # Skip words that are just abbreviations or initialisms
            if chamorro.isupper() and len(chamorro) <= 4:
                continue
            
            good_words.append(entry)
        
        if not good_words:
            good_words = self._word_list[:1000]  # Fallback
        
        # Safety check - if dictionary failed to load, return a default
        if not good_words:
            logger.error("Dictionary not loaded - returning default word of the day")
            return {
                "chamorro": "Håfa Adai",
                "definition": "Hello; a common Chamorro greeting",
                "part_of_speech": "interjection",
                "pronunciation": "HAH-fah ah-DYE",
                "example": {
                    "chamorro": "Håfa Adai! Kao maolek hao?",
                    "english": "Hello! How are you?"
                },
                "category": "Greetings & Basics",
                "difficulty": "beginner",
                "day": day_of_year,
                "date": today.isoformat()
            }
        
        # Use hash of year + day to get consistent but varied selection
        # This ensures the same word shows for everyone on the same day
        seed = hashlib.md5(f"{year}-{day_of_year}".encode()).hexdigest()
        index = int(seed, 16) % len(good_words)
        
        word = good_words[index]
        
        # Get example if available
        example = None
        if word.get("examples") and len(word["examples"]) > 0:
            ex = word["examples"][0]
            example = {
                "chamorro": ex.get("chamorro", ""),
                "english": ex.get("english", "")
            }
        
        # Determine category
        category = "General"
        for cat_id, cat_words in self._categories_cache.items():
            if word in cat_words:
                category = CATEGORY_DEFINITIONS[cat_id]["title"]
                break
        
        return {
            "chamorro": word["chamorro"],
            "english": word["definition"],
            "part_of_speech": word.get("part_of_speech", ""),
            "example": example,
            "category": category,
            "date": today.isoformat()
        }
    
    def generate_quiz_questions(self, category_id: str, count: int = 10, question_types: list = None) -> dict:
        """
        Generate quiz questions from dictionary words.
        
        Question types:
        - multiple_choice: "What does X mean?" with 4 options
        - type_answer: "How do you say X in Chamorro?"
        - fill_blank: "Complete: X means ___"
        
        Args:
            category_id: Category to generate questions from (or "all" for mixed)
            count: Number of questions to generate
            question_types: List of question types to include (default: all types)
        """
        import random
        
        if question_types is None:
            question_types = ["multiple_choice", "type_answer"]
        
        # Get words from category or all words
        if category_id == "all":
            words = self._word_list
            category_title = "Mixed Categories"
        elif category_id in self._categories_cache:
            words = self._categories_cache[category_id]
            category_title = CATEGORY_DEFINITIONS[category_id]["title"]
        else:
            return {"questions": [], "total": 0, "category": None}
        
        # Filter for good quiz words
        good_words = [
            w for w in words
            if len(w["chamorro"]) <= 20  # Not too long
            and len(w["definition"]) <= 100  # Clear definition
            and len(w["definition"]) >= 3  # Not empty
            and not w["definition"].lower().startswith("type of")  # Skip taxonomic
            and not w["definition"].lower().startswith("see ")  # Skip cross-refs
            and " " not in w["chamorro"][:10]  # Prefer single words
        ]
        
        if len(good_words) < 4:
            return {"questions": [], "total": 0, "category": category_title}
        
        # Shuffle and select words
        random.shuffle(good_words)
        selected_words = good_words[:count]
        
        questions = []
        for i, word in enumerate(selected_words):
            q_type = question_types[i % len(question_types)]
            
            if q_type == "multiple_choice":
                # Generate wrong answers from other words
                other_words = [w for w in good_words if w != word]
                random.shuffle(other_words)
                wrong_answers = [w["definition"][:50] for w in other_words[:3]]
                
                # Create options with correct answer
                options = wrong_answers + [word["definition"][:50]]
                random.shuffle(options)
                correct_index = options.index(word["definition"][:50])
                
                questions.append({
                    "id": f"q{i+1}",
                    "type": "multiple_choice",
                    "question": f"What does '{word['chamorro']}' mean?",
                    "options": options,
                    "correct_answer": correct_index,
                    "explanation": f"'{word['chamorro']}' means '{word['definition']}'",
                    "chamorro_word": word["chamorro"],
                    "english_meaning": word["definition"]
                })
            
            elif q_type == "type_answer":
                # Simplify the definition for the question
                simple_def = word["definition"].split(",")[0].split(";")[0].strip()
                
                questions.append({
                    "id": f"q{i+1}",
                    "type": "type_answer",
                    "question": f"How do you say '{simple_def}' in Chamorro?",
                    "correct_answer": word["chamorro"].lower(),
                    "acceptable_answers": [
                        word["chamorro"].lower(),
                        normalize_chamorro(word["chamorro"])  # Accept without diacritics
                    ],
                    "hint": f"Starts with '{word['chamorro'][0]}'",
                    "explanation": f"'{simple_def}' in Chamorro is '{word['chamorro']}'",
                    "chamorro_word": word["chamorro"],
                    "english_meaning": word["definition"]
                })
        
        return {
            "questions": questions,
            "total": len(questions),
            "category": category_title,
            "available_words": len(good_words)
        }


# Singleton instance
_dictionary_service: Optional[DictionaryService] = None


def get_dictionary_service() -> DictionaryService:
    """Get the singleton dictionary service instance."""
    global _dictionary_service
    if _dictionary_service is None:
        _dictionary_service = DictionaryService()
    return _dictionary_service

