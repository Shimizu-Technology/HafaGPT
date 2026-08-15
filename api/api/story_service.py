"""Serve licensed story content and fail closed when permission is absent.

The legacy extracted Lengguahi-ta payload remains in the repository as audit
evidence, but it is not loaded or returned unless an explicit permission record
is configured. Phase 0 therefore contains the rights issue without deleting the
source material before provenance and ownership can be resolved.
"""

import os
import json
import logging
from typing import Optional, List

from src.rag.source_policy import get_registered_source

logger = logging.getLogger(__name__)

# Load stories once at module import
_stories_data: dict = {}
_stories_by_id: dict = {}
_loaded_permission_id: str | None = None


def _is_enabled(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def get_story_availability() -> dict:
    permission_id = os.getenv("LENGGUAHITA_STORIES_PERMISSION_ID", "").strip()
    source = get_registered_source("lengguahita") or {}
    display_policy = source.get("display", {})
    registered_permission = display_policy.get("permission_reference")
    enabled = bool(
        _is_enabled(os.getenv("LENGGUAHITA_STORIES_ENABLED"))
        and display_policy.get("allowed") is True
        and registered_permission
        and permission_id == registered_permission
    )
    return {
        "status": "available" if enabled else "permission_required",
        "enabled": enabled,
        "sourceName": "Lengguahi-ta",
        "sourceUrl": "https://lengguahita.com/resources/",
        "message": (
            "Licensed Lengguahi-ta stories are available."
            if enabled
            else "HåfaGPT links to Lengguahi-ta while copied story content is disabled pending written reuse permission and attribution review."
        ),
    }


def reset_story_cache() -> None:
    """Clear cached story data after a permission configuration change."""
    global _stories_data, _stories_by_id, _loaded_permission_id
    _stories_data = {}
    _stories_by_id = {}
    _loaded_permission_id = None


def _load_stories():
    """Load pre-extracted stories from JSON file."""
    global _stories_data, _stories_by_id, _loaded_permission_id

    availability = get_story_availability()
    permission_id = os.getenv("LENGGUAHITA_STORIES_PERMISSION_ID", "").strip()
    if not availability["enabled"]:
        _stories_data = {"stories": []}
        _stories_by_id = {}
        _loaded_permission_id = None
        return

    if _stories_data and _loaded_permission_id == permission_id:
        return  # Already loaded

    _stories_data = {}
    _stories_by_id = {}
    
    stories_path = os.path.join(
        os.path.dirname(__file__), 
        '..', 
        'data', 
        'extracted_stories.json'
    )
    
    try:
        with open(stories_path, 'r', encoding='utf-8') as f:
            _stories_data = json.load(f)
        _loaded_permission_id = permission_id
            
        # Index by ID for quick lookup
        for story in _stories_data.get('stories', []):
            _stories_by_id[story['id']] = story
            
        logger.info("Loaded %s licensed pre-extracted stories", len(_stories_by_id))
        
    except FileNotFoundError:
        logger.warning(f"Stories file not found: {stories_path}")
        _stories_data = {'stories': []}
    except Exception as e:
        logger.error(f"Error loading stories: {e}")
        _stories_data = {'stories': []}


def get_available_stories(category: Optional[str] = None, limit: int = 50) -> List[dict]:
    """
    Get list of available pre-extracted stories.
    
    Args:
        category: Optional filter by category (story, legend, lesson, etc.)
        limit: Maximum number of stories to return
        
    Returns:
        List of story metadata (id, title, difficulty, category, etc.)
    """
    _load_stories()
    
    stories = _stories_data.get('stories', [])
    
    # Filter by category if specified
    if category:
        stories = [s for s in stories if s.get('category') == category]
    
    # Return metadata only (not full content)
    result = []
    for story in stories[:limit]:
        result.append({
            'id': story['id'],
            'title': story['title_english'],
            'titleChamorro': story.get('title_chamorro'),
            'author': story.get('author'),
            'difficulty': story['difficulty'],
            'category': story.get('category', 'story'),
            'paragraphCount': len(story.get('paragraphs', [])),
            'sourceUrl': story.get('source_url'),
            'sourceName': story.get('source_name', 'Lengguahi-ta')
        })
    
    return result


def get_story(story_id: str) -> Optional[dict]:
    """
    Get a full story by ID.
    
    Returns the complete story with all paragraphs, ready for the frontend.
    """
    _load_stories()
    
    story = _stories_by_id.get(story_id)
    if not story:
        logger.warning(f"Story not found: {story_id}")
        return None
    
    # Transform to frontend-friendly format
    paragraphs = []
    for i, p in enumerate(story.get('paragraphs', [])):
        paragraphs.append({
            'id': f'p{i+1}',
            'chamorro': p['chamorro'],
            'english': p['english'],
            # Words will be looked up via dictionary API on frontend
            'words': []
        })
    
    return {
        'id': story['id'],
        'title': story.get('title_chamorro') or story['title_english'],
        'titleEnglish': story['title_english'],
        'titleChamorro': story.get('title_chamorro'),
        'author': story.get('author'),
        'description': f"A {story['difficulty']} level Chamorro story",
        'difficulty': story['difficulty'],
        'category': story.get('category', 'story'),
        'source': 'lengguahita',
        'sourceUrl': story.get('source_url'),
        'sourceName': story.get('source_name', 'Lengguahi-ta'),
        'attribution': _stories_data.get('attribution', 'Source: Lengguahi-ta'),
        'paragraphs': paragraphs,
        'paragraphCount': len(paragraphs),
        'wordCount': sum(len(p['chamorro'].split()) for p in story.get('paragraphs', [])),
        'readingTime': max(1, len(paragraphs) // 5)  # ~5 paragraphs per minute
    }


def get_story_categories() -> List[dict]:
    """Get list of story categories with counts."""
    _load_stories()
    
    categories = {}
    for story in _stories_data.get('stories', []):
        cat = story.get('category', 'story')
        if cat not in categories:
            categories[cat] = {'id': cat, 'name': cat.title(), 'count': 0}
        categories[cat]['count'] += 1
    
    return list(categories.values())


def get_stories_by_difficulty(difficulty: str, limit: int = 20) -> List[dict]:
    """Get stories filtered by difficulty level."""
    _load_stories()
    
    stories = [s for s in _stories_data.get('stories', []) if s['difficulty'] == difficulty]
    story_ids = {story['id'] for story in stories[:limit]}
    all_formatted = get_available_stories(limit=len(_stories_data.get('stories', [])))
    return [story for story in all_formatted if story['id'] in story_ids]


# Quick test
if __name__ == "__main__":
    print("=== Available Stories ===")
    stories = get_available_stories()
    for s in stories[:5]:
        print(f"  {s['id']}: {s['title']} ({s['difficulty']})")
    
    if stories:
        print(f"\n=== Story Details: {stories[0]['id']} ===")
        story = get_story(stories[0]['id'])
        if story:
            print(f"Title: {story['title']}")
            print(f"Paragraphs: {story['paragraphCount']}")
            print(f"First paragraph: {story['paragraphs'][0]['chamorro'][:100]}...")
