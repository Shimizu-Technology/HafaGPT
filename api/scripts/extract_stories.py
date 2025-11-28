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


def process_story(url, title, content):
    """Process a single story and return structured data."""
    
    # Split into Chamorro and English sections
    chamorro_title, chamorro_section, english_title, english_section = split_chamorro_english_sections(content)
    
    if not chamorro_section or not english_section:
        return None
    
    # Extract paragraph pairs
    paragraphs = extract_paragraphs_from_sections(chamorro_section, english_section)
    
    if len(paragraphs) < 2:
        return None
    
    # Use the page title if we couldn't extract titles
    english_title = english_title or title.replace(' – Lengguahi-ta', '')
    
    author = extract_author(content)
    difficulty = determine_difficulty(paragraphs)
    story_id = create_story_id(url, english_title)
    category = determine_category(english_title, content)
    
    return {
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


def main():
    print("=" * 60)
    print("Lengguahi-ta Story Extraction")
    print("=" * 60)
    
    print("\nFetching story candidates from RAG database...")
    candidates = get_story_candidates()
    print(f"Found {len(candidates)} potential stories")
    
    stories = []
    seen_ids = set()
    
    for url, title, content, doc_length in candidates:
        story = process_story(url, title, content)
        
        if story and story['id'] not in seen_ids:
            seen_ids.add(story['id'])
            print(f"  ✓ {story['title_english']} ({len(story['paragraphs'])} paragraphs, {story['difficulty']})")
            stories.append(story)
    
    print(f"\n{'=' * 60}")
    print(f"Successfully extracted {len(stories)} unique stories")
    
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
