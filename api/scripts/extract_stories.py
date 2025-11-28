"""
Story Extraction Script for Lengguahi-ta Content

This script extracts well-structured Chamorro stories from the RAG database
and saves them to a JSON file for instant loading in the Story Mode feature.

The Lengguahi-ta stories have a specific structure:
1. Chamorro title (## I Kalålang Na Palao'an)
2. Chamorro text paragraphs
3. English title (## The Sandpiper Girl)
4. English translation paragraphs

Usage:
    python scripts/extract_stories.py

The extracted stories are saved to data/extracted_stories.json

Quality Control:
- Validates Chamorro field actually contains Chamorro text
- Validates English field actually contains English text
- Rejects articles that are English-only (essays, analysis)
- Rejects articles with mixed-up sections (footnotes, vocabulary notes)
"""

import psycopg
import os
import re
import json
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()


def get_story_candidates():
    """Find all potential stories from Lengguahi-ta with good structure."""
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            cmetadata->>'url' as url,
            cmetadata->>'title' as title,
            document,
            length(document) as doc_length
        FROM langchain_pg_embedding
        WHERE cmetadata->>'url' LIKE '%lengguahita.com%'
        AND length(document) > 3000
        ORDER BY length(document) DESC
        LIMIT 100
    ''')
    
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return rows


def has_chamorro_diacritics(text):
    """Check if text contains Chamorro-specific characters."""
    chamorro_chars = set("åÅñÑ''")
    return any(c in text for c in chamorro_chars)


def looks_like_pure_english(text):
    """
    Check if text is pure English (no Chamorro diacritics and many English words).
    Used to detect when Chamorro field incorrectly contains English.
    """
    if has_chamorro_diacritics(text):
        return False
    
    # Common English words that wouldn't appear in Chamorro text
    english_words = [
        'the', 'and', 'is', 'are', 'was', 'were', 'this', 'that', 'with', 'from',
        'they', 'have', 'has', 'been', 'very', 'also', 'but', 'not', 'for', 'you',
        'his', 'her', 'their', 'one', 'when', 'what', 'there', 'would', 'could',
        'should', 'about', 'into', 'more', 'some', 'because', 'however', 'which'
    ]
    text_lower = text.lower()
    english_count = sum(1 for w in english_words if f' {w} ' in f' {text_lower} ')
    
    # If 4+ common English words and no Chamorro diacritics, it's English
    return english_count >= 4


def looks_like_footnotes(text):
    """
    Check if text looks like footnotes/vocabulary notes rather than story content.
    Lengguahi-ta uses numbered footnotes like "**1 ma'gåsi:** The root word is..."
    """
    # Check for footnote patterns
    footnote_patterns = [
        r'\*\*\d+ \w+:\*\*',  # **1 word:** pattern
        r'^\d+ \w+:',         # 1 word: at start of line
        r'The root word is',  # Vocabulary explanation
        r'This literally means',  # Vocabulary explanation
        r'The -\w+ suffix',   # Grammar explanation
    ]
    
    for pattern in footnote_patterns:
        if re.search(pattern, text):
            return True
    
    return False


def split_chamorro_english_sections(content):
    """
    Split content into Chamorro and English sections.
    
    Lengguahi-ta stories typically have:
    - ## [Chamorro Title]
    - Chamorro paragraphs
    - ## [English Title]  
    - English paragraphs
    """
    # Find all ## headers
    header_pattern = r'^## (.+)$'
    headers = list(re.finditer(header_pattern, content, re.MULTILINE))
    
    if len(headers) < 2:
        return None, None, None, None
    
    chamorro_title = None
    english_title = None
    chamorro_section = None
    english_section = None
    
    for i, header in enumerate(headers):
        header_text = header.group(1).strip()
        start_pos = header.end()
        end_pos = headers[i + 1].start() if i + 1 < len(headers) else len(content)
        section_content = content[start_pos:end_pos].strip()
        
        # Determine if this is Chamorro or English based on header
        if has_chamorro_diacritics(header_text):
            chamorro_title = header_text
            chamorro_section = section_content
        elif chamorro_title and not english_title:
            # First non-Chamorro header after Chamorro section is likely English
            english_title = header_text
            english_section = section_content
            break
    
    return chamorro_title, chamorro_section, english_title, english_section


def extract_paragraphs_from_sections(chamorro_text, english_text):
    """
    Extract paragraph pairs from Chamorro and English sections.
    """
    if not chamorro_text or not english_text:
        return []
    
    # Clean up the text
    def clean_section(text):
        lines = []
        for line in text.split('\n'):
            line = line.strip()
            # Skip metadata, navigation, images, etc.
            if not line:
                continue
            if line.startswith('Tinige') or line.startswith('Pinila'):
                continue
            if line.startswith('Written') or line.startswith('Translated'):
                continue
            if line.startswith('[') or line.startswith('Previous') or line.startswith('Next'):
                continue
            if line.startswith('!') or '![' in line:  # Skip markdown images
                continue
            if line.startswith('http') or 'lengguahita.com' in line:  # Skip URLs
                continue
            if 'Pingback' in line or 'Leave a comment' in line:
                continue
            if line.startswith('##'):
                continue
            if line.startswith('Sources') or line.startswith('Post navigation'):
                break
            if line.startswith('*') and line.endswith('*'):  # Skip emphasis-only lines
                continue
            lines.append(line)
        return lines
    
    chamorro_lines = clean_section(chamorro_text)
    english_lines = clean_section(english_text)
    
    # Try to pair paragraphs
    # Simple approach: assume roughly equal number of paragraphs
    paragraphs = []
    
    # In Lengguahi-ta, each line after cleaning is typically a paragraph
    def group_into_paragraphs(lines):
        paragraphs = []
        for line in lines:
            if len(line) > 30:  # Skip very short lines
                paragraphs.append(line)
        return paragraphs
    
    chamorro_paras = group_into_paragraphs(chamorro_lines)
    english_paras = group_into_paragraphs(english_lines)
    
    # Pair them up
    min_len = min(len(chamorro_paras), len(english_paras))
    
    for i in range(min_len):
        if len(chamorro_paras[i]) > 20 and len(english_paras[i]) > 20:
            paragraphs.append({
                'chamorro': chamorro_paras[i],
                'english': english_paras[i]
            })
    
    return paragraphs


def extract_author(content):
    """Extract author from content."""
    match = re.search(r"Tinige' as ([A-Za-z\s]+)", content)
    if match:
        return match.group(1).strip()
    
    match = re.search(r'Written by ([A-Za-z\s]+)', content)
    if match:
        return match.group(1).strip()
    
    match = re.search(r'By \[([^\]]+)\]', content)
    if match:
        return match.group(1).strip()
    
    return None


def determine_difficulty(paragraphs):
    """Determine difficulty based on content complexity."""
    if not paragraphs:
        return 'intermediate'
    
    total_words = sum(len(p['chamorro'].split()) for p in paragraphs)
    avg_words = total_words / len(paragraphs) if paragraphs else 0
    
    if len(paragraphs) <= 5 and avg_words < 40:
        return 'beginner'
    elif len(paragraphs) <= 10 or avg_words < 60:
        return 'intermediate'
    else:
        return 'advanced'


def create_story_id(url, title):
    """Create a URL-friendly story ID."""
    if url:
        # Strip query parameters
        clean_url = url.split('?')[0]
        slug = clean_url.rstrip('/').split('/')[-1]
        return slug
    
    return re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')


def determine_category(title, content):
    """Determine story category based on content."""
    title_lower = title.lower() if title else ''
    content_lower = content.lower() if content else ''
    
    if 'legend' in title_lower or 'lihende' in title_lower:
        return 'legend'
    elif 'lesson' in title_lower or 'grammar' in content_lower:
        return 'lesson'
    elif 'taotaomo' in title_lower or 'taotaomo' in content_lower:
        return 'folklore'
    elif 'story' in title_lower or 'estoria' in title_lower:
        return 'story'
    else:
        return 'story'


def validate_story_quality(story):
    """
    Validate that a story has correct Chamorro/English pairing.
    
    Returns:
        (is_valid, reason) - Tuple of boolean and reason string
    
    Quality checks:
    1. Chamorro field should contain Chamorro text (has diacritics or doesn't look like English)
    2. English field should contain English text (no diacritics, looks like English)
    3. Neither field should contain footnotes/vocabulary notes
    """
    paragraphs = story.get('paragraphs', [])
    
    if not paragraphs:
        return False, "No paragraphs"
    
    chamorro_is_english_count = 0
    english_has_chamorro_count = 0
    footnote_count = 0
    
    for p in paragraphs:
        chamorro = p.get('chamorro', '')
        english = p.get('english', '')
        
        # Check if Chamorro field is actually English
        if looks_like_pure_english(chamorro):
            chamorro_is_english_count += 1
        
        # Check if English field has Chamorro (place names are OK, but not full text)
        # Only flag if it has many Chamorro diacritics
        chamorro_char_count = sum(1 for c in english if c in 'åÅñÑ')
        if chamorro_char_count > 5:  # More than 5 diacritics suggests wrong language
            english_has_chamorro_count += 1
        
        # Check for footnotes
        if looks_like_footnotes(english):
            footnote_count += 1
    
    total = len(paragraphs)
    
    # Reject if more than 30% of Chamorro fields contain pure English
    if chamorro_is_english_count / total > 0.3:
        return False, f"Chamorro field contains English ({chamorro_is_english_count}/{total} paragraphs)"
    
    # Reject if more than 50% of English fields have footnotes
    if footnote_count / total > 0.5:
        return False, f"English field contains footnotes ({footnote_count}/{total} paragraphs)"
    
    return True, "Valid"


def process_story(url, title, content):
    """Process a single story and return structured data."""
    
    # Split into Chamorro and English sections
    chamorro_title, chamorro_section, english_title, english_section = split_chamorro_english_sections(content)
    
    if not chamorro_section or not english_section:
        return None, "Could not split into Chamorro/English sections"
    
    # Extract paragraph pairs
    paragraphs = extract_paragraphs_from_sections(chamorro_section, english_section)
    
    if len(paragraphs) < 2:
        return None, "Not enough paragraphs"
    
    # Use the page title if we couldn't extract titles
    english_title = english_title or title.replace(' – Lengguahi-ta', '')
    
    author = extract_author(content)
    difficulty = determine_difficulty(paragraphs)
    story_id = create_story_id(url, english_title)
    category = determine_category(english_title, content)
    
    story = {
        'id': story_id,
        'title_english': english_title,
        'title_chamorro': chamorro_title,
        'author': author,
        'source_url': url.split('?')[0] if url else None,  # Clean URL
        'source_name': 'Lengguahi-ta',
        'difficulty': difficulty,
        'category': category,
        'paragraphs': paragraphs,
        'extracted_at': datetime.now().isoformat()
    }
    
    # Validate quality
    is_valid, reason = validate_story_quality(story)
    if not is_valid:
        return None, reason
    
    return story, "Success"


def main():
    print("=" * 60)
    print("Lengguahi-ta Story Extraction")
    print("=" * 60)
    
    print("\nFetching story candidates from RAG database...")
    candidates = get_story_candidates()
    print(f"Found {len(candidates)} potential stories")
    
    stories = []
    seen_ids = set()
    rejected = []
    
    for url, title, content, doc_length in candidates:
        story, reason = process_story(url, title, content)
        
        if story and story['id'] not in seen_ids:
            seen_ids.add(story['id'])
            print(f"  ✓ {story['title_english']} ({len(story['paragraphs'])} paragraphs, {story['difficulty']})")
            stories.append(story)
        elif story is None and reason != "Could not split into Chamorro/English sections":
            # Only log interesting rejections
            clean_title = title.replace(' – Lengguahi-ta', '') if title else url
            rejected.append((clean_title, reason))
    
    print(f"\n{'=' * 60}")
    print(f"Successfully extracted {len(stories)} unique stories")
    
    if rejected:
        print(f"\nRejected {len(rejected)} stories:")
        for title, reason in rejected[:10]:  # Show first 10
            print(f"  ✗ {title[:50]}... - {reason}")
    
    # Sort by difficulty and category
    stories.sort(key=lambda s: (
        {'beginner': 0, 'intermediate': 1, 'advanced': 2}[s['difficulty']],
        s['category'],
        s['title_english']
    ))
    
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'extracted_stories.json')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            'stories': stories,
            'extracted_at': datetime.now().isoformat(),
            'source': 'Lengguahi-ta (https://lengguahita.com)',
            'attribution': 'Stories sourced from Lengguahi-ta. Please visit their website to support Chamorro language learning.',
            'total_stories': len(stories)
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved to: {output_path}")
    
    # Print summary by category and difficulty
    print(f"\n{'=' * 60}")
    print("Summary by Difficulty:")
    print(f"{'=' * 60}")
    
    by_difficulty = {}
    for s in stories:
        d = s['difficulty']
        by_difficulty[d] = by_difficulty.get(d, 0) + 1
    
    for d in ['beginner', 'intermediate', 'advanced']:
        print(f"  {d.capitalize()}: {by_difficulty.get(d, 0)} stories")
    
    print(f"\nStory List:")
    for story in stories:
        print(f"  • [{story['difficulty'][:3]}] {story['title_english']}")


if __name__ == '__main__':
    main()
