"""
Chamorro Morphology Helper

Helps extract root words from conjugated/inflected Chamorro words.
This enables better dictionary lookups for words like:
- hagon-ña → hagon (leaf) + -ña (his/her)
- mafa'nána'an → fa'na'an or na'an (name)
- manflóflores → flores (flower)

Chamorro morphological patterns:
1. Possessive suffixes: -hu, -mu, -ña, -ta, -måmi, -miyu, -ñiha
2. Verb prefixes: man-, ma-, um-, in-, fan-, etc.
3. Reduplication: CV reduplication for plurality/intensity
4. Infixes: -um-, -in-
"""

from typing import List, Tuple, Optional

# Possessive suffixes (most common)
POSSESSIVE_SUFFIXES = [
    ('-ñiha', 'their'),
    ('-måmi', 'our (excl.)'),
    ('-miyu', 'your (pl.)'),
    ('-ta', 'our (incl.)'),
    ('-ña', 'his/her/its'),
    ('-mu', 'your'),
    ('-hu', 'my'),
]

# Common verb/noun prefixes
PREFIXES = [
    ('man-', 'plural actor'),
    ('ma-', 'passive'),
    ('um-', 'actor focus'),
    ('in-', 'passive/past'),
    ('fan-', 'plural future'),
    ('na\'', 'causative'),
    ('gof-', 'very'),
    ('sen-', 'very'),
]

# Linking particles that might be attached
PARTICLES = [
    '-na',  # linker
    '-i',   # locative
]


def strip_possessive_suffix(word: str) -> Tuple[str, Optional[str]]:
    """
    Strip possessive suffix from a word.
    Returns (root, suffix_meaning) or (original_word, None).
    
    Handles both:
    - hagon-ña (with hyphen)
    - hagonña (without hyphen)
    """
    word_lower = word.lower()
    
    # First check for hyphenated forms (e.g., hagon-ña)
    if '-' in word_lower:
        for suffix, meaning in POSSESSIVE_SUFFIXES:
            suffix_clean = suffix  # Keep the hyphen for matching
            if word_lower.endswith(suffix_clean):
                root = word[:-len(suffix_clean)]
                if len(root) >= 2:
                    return root, meaning
    
    # Then check for non-hyphenated forms (e.g., hagonña)
    for suffix, meaning in POSSESSIVE_SUFFIXES:
        suffix_clean = suffix.replace('-', '')
        if word_lower.endswith(suffix_clean):
            root = word[:-len(suffix_clean)]
            if len(root) >= 2:
                return root, meaning
    
    return word, None


def strip_prefix(word: str) -> Tuple[str, Optional[str]]:
    """
    Strip common prefix from a word.
    Returns (root, prefix_meaning) or (original_word, None).
    """
    word_lower = word.lower()
    
    for prefix, meaning in PREFIXES:
        prefix_clean = prefix.replace('-', '').replace("'", '\u2019')
        if word_lower.startswith(prefix_clean):
            root = word[len(prefix_clean):]
            if len(root) >= 2:
                return root, meaning
    
    return word, None


def handle_reduplication(word: str) -> Optional[str]:
    """
    Try to identify reduplicated forms and return the base.
    Chamorro uses CV reduplication (e.g., flores → flóflores).
    """
    word_lower = word.lower()
    
    # Check for patterns like "flóflores" → "flores"
    # Look for repeated consonant-vowel at the start
    if len(word_lower) >= 4:
        # Check if first 2-3 chars repeat
        for i in range(2, 4):
            if len(word_lower) > i * 2:
                potential_prefix = word_lower[:i]
                rest = word_lower[i:]
                if rest.startswith(potential_prefix[0]):  # Same consonant
                    # This might be reduplication
                    return word[i:]  # Return without the reduplication
    
    return None


def get_root_candidates(word: str) -> List[Tuple[str, str]]:
    """
    Get possible root words for a given Chamorro word.
    
    Returns a list of (candidate_root, explanation) tuples.
    """
    candidates = []
    original = word
    
    # Clean the word (remove punctuation)
    word = word.strip('.,!?;:\'"()[]{}')
    
    if not word or len(word) < 2:
        return []
    
    # Try stripping possessive suffix first
    root1, suffix_meaning = strip_possessive_suffix(word)
    if suffix_meaning:
        candidates.append((root1, f"'{word}' may be '{root1}' + possessive suffix ({suffix_meaning})"))
        
        # Also try stripping prefix from the root
        root1b, prefix_meaning = strip_prefix(root1)
        if prefix_meaning:
            candidates.append((root1b, f"'{word}' may be prefix + '{root1b}' + suffix"))
    
    # Try stripping prefix
    root2, prefix_meaning = strip_prefix(word)
    if prefix_meaning:
        candidates.append((root2, f"'{word}' may be '{prefix_meaning}' prefix + '{root2}'"))
    
    # Try handling reduplication
    root3 = handle_reduplication(word)
    if root3 and root3 != word:
        candidates.append((root3, f"'{word}' may be reduplicated form of '{root3}'"))
    
    # Also try common spelling variations
    # å ↔ a, ñ ↔ n, glottal stop ↔ removed
    normalized = word.replace('å', 'a').replace('Å', 'A').replace('ñ', 'n').replace('Ñ', 'N')
    normalized = normalized.replace('\u2018', '').replace('\u2019', '').replace("'", '')
    if normalized != word:
        candidates.append((normalized, f"Normalized spelling: {normalized}"))
    
    return candidates


def normalize_for_lookup(word: str) -> List[str]:
    """
    Generate multiple lookup variants for a word.
    Returns a list of words to try in the dictionary.
    """
    variants = [word]
    word_lower = word.lower()
    
    # Add lowercase
    if word_lower != word:
        variants.append(word_lower)
    
    # Strip possessive
    root, _ = strip_possessive_suffix(word)
    if root != word:
        variants.append(root)
        variants.append(root.lower())
    
    # Strip prefix
    root2, _ = strip_prefix(word)
    if root2 != word:
        variants.append(root2)
        variants.append(root2.lower())
    
    # Normalize diacritics
    normalized = word.replace('å', 'a').replace('Å', 'A').replace('ñ', 'n').replace('Ñ', 'N')
    normalized = normalized.replace('\u2018', '').replace('\u2019', '').replace("'", '')
    if normalized not in variants:
        variants.append(normalized)
        variants.append(normalized.lower())
    
    # Remove duplicates while preserving order
    seen = set()
    unique = []
    for v in variants:
        if v not in seen and len(v) >= 2:
            seen.add(v)
            unique.append(v)
    
    return unique


# Quick test
if __name__ == '__main__':
    test_words = [
        'hagon-ña',      # leaf + his/her
        'guma\'-hu',      # house + my
        'mafa\'nána\'an', # is called (passive)
        'manflóflores',  # flowers (plural)
        'taotao',        # person
        'famagu\'on',    # children
        'lina\'la\'',    # life
    ]
    
    print("Chamorro Morphology Test")
    print("=" * 60)
    
    for word in test_words:
        print(f"\nWord: {word}")
        variants = normalize_for_lookup(word)
        print(f"  Lookup variants: {variants}")
        
        candidates = get_root_candidates(word)
        for root, explanation in candidates:
            print(f"  → {explanation}")

