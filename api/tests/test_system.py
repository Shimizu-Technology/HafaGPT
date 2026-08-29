"""Repository-level smoke and optional live-integration checks.

The previous version of this file returned booleans from pytest tests and still
referenced pre-monorepo modules. Pytest therefore reported failures as passes.
These tests now use assertions and explicitly skip services that need local
credentials instead of silently succeeding.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest


API_ROOT = Path(__file__).resolve().parents[1]


def test_character_normalization() -> None:
    from api.dictionary_service import normalize_chamorro

    assert normalize_chamorro("Mañana si Yu'os") == "manana si yuos"
    assert normalize_chamorro("Håfa Adai") == "hafa adai"
    assert normalize_chamorro("ma'åse'") == "maase"


def test_current_rag_modules_are_present() -> None:
    assert (API_ROOT / "src" / "rag" / "chamorro_rag.py").is_file()
    assert (API_ROOT / "src" / "rag" / "manage_rag_db.py").is_file()
    assert (API_ROOT / "src" / "rag" / "web_search_tool.py").is_file()


def test_chat_model_registry_and_prompts_are_current_modules() -> None:
    chatbot_source = (API_ROOT / "api" / "chatbot_service.py").read_text(encoding="utf-8")

    assert "MODEL_CONFIG =" in chatbot_source
    assert "MODE_PROMPTS =" in chatbot_source
    assert "def get_rag_context(" in chatbot_source
    assert "from src.rag.web_search_tool import web_search" in chatbot_source
    assert chatbot_source.count('if mode != "chamorro" and skill_level') == 2
    assert chatbot_source.count(
        "elif not is_passage_translation(effective_translation_message) and not school_announcement:"
    ) == 2
    assert chatbot_source.count("build_image_translation_query(") == 2
    assert chatbot_source.count("build_translation_structure_hints(") == 2
    assert chatbot_source.count("translation_prompt_guidance(") == 2
    assert chatbot_source.count("resolve_school_message_context(") == 2
    assert chatbot_source.count(
        "analysis_guidance, school_announcement, contextual_card_ids = ("
    ) == 2
    assert "Do not add etymology, pronunciation, cultural-origin" in chatbot_source
    assert "Do not refuse solely because retrieval returned no match" in chatbot_source
    assert 'label it "Unverified best effort"' in chatbot_source
    assert "never invent a percentage confidence" in chatbot_source
    assert "Never invent a citation" in chatbot_source
    assert "CORRECT WHEN NO SOURCE MATCHES" in chatbot_source
    assert "Presenting a guess or non-dictionary content as a verified translation" in chatbot_source
    assert "provide it only as an explicitly unverified best effort" in chatbot_source
    assert "Keep the\nentire response in Chamorro" in chatbot_source
    assert "If there is no credible candidate" in chatbot_source
    assert chatbot_source.count("web_results_used = bool(web_context)") == 2
    assert '"used_web_search": web_results_used' in chatbot_source


def test_crawler_inventory_is_present() -> None:
    required_paths = [
        "crawlers/README.md",
        "crawlers/SOURCES.md",
        "crawlers/pacific_daily_news.py",
        "crawlers/_template.py",
    ]
    missing = [path for path in required_paths if not (API_ROOT / path).is_file()]
    assert not missing, f"Missing crawler files: {missing}"


def test_canonical_vocabulary_has_source_backed_entries() -> None:
    vocabulary_path = API_ROOT / "language_content" / "canonical_vocabulary.json"
    vocabulary = json.loads(vocabulary_path.read_text(encoding="utf-8"))
    entries = vocabulary["entries"]

    assert entries
    assert all("id" in entry and "recommended_teaching_term" in entry for entry in entries)
    assert any(entry["review_status"] == "source_backed" for entry in entries)


@pytest.mark.integration
def test_live_database_has_rag_chunks() -> None:
    if not os.getenv("DATABASE_URL"):
        pytest.skip("DATABASE_URL is required for the live RAG database check")

    import psycopg2

    with psycopg2.connect(os.environ["DATABASE_URL"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM langchain_pg_embedding")
            chunk_count = cursor.fetchone()[0]

    assert chunk_count > 0


@pytest.mark.integration
def test_live_rag_retrieves_context() -> None:
    if not os.getenv("DATABASE_URL") or not os.getenv("OPENAI_API_KEY"):
        pytest.skip("DATABASE_URL and OPENAI_API_KEY are required for the live RAG retrieval check")

    from src.rag.chamorro_rag import ChamorroRAG

    rag = ChamorroRAG()
    context, sources = rag.create_context("Håfa Adai", k=3)
    assert len(context) > 100
    assert sources


@pytest.mark.integration
def test_live_rag_retrieves_source_backed_water_variants() -> None:
    if not os.getenv("DATABASE_URL") or not os.getenv("OPENAI_API_KEY"):
        pytest.skip("DATABASE_URL and OPENAI_API_KEY are required for the live relevance check")

    from src.rag.chamorro_rag import ChamorroRAG

    rag = ChamorroRAG()
    context, sources = rag.create_context(
        "How do you say water in Chamorro? Include source-backed spelling variants.",
        k=5,
    )

    assert "hånom" in context.casefold()
    assert "hånum" in context.casefold()
    assert sources


@pytest.mark.integration
def test_live_rag_retrieves_pdn_for_pdn_specific_query() -> None:
    if not os.getenv("DATABASE_URL") or not os.getenv("OPENAI_API_KEY"):
        pytest.skip("DATABASE_URL and OPENAI_API_KEY are required for the live source-priority check")

    from src.rag.chamorro_rag import ChamorroRAG

    rag = ChamorroRAG()
    _context, sources = rag.create_context(
        "Who writes Chamorro language content in the Pacific Daily News?",
        k=5,
    )
    source_names = [str(source["name"]).lower() for source in sources]
    assert any("pacific daily news" in source or "guampdn.com" in source for source in source_names)
