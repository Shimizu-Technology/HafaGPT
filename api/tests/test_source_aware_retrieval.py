import ast
import json
from pathlib import Path

import pytest

from api.lexical_lookup import (
    LexicalLookup,
    homograph_sense_context,
    lexical_lookup_context,
    lexical_lookup_request,
)
from api.verification_evidence import VerificationLookups
from src.rag.knowledge_cards import get_knowledge_card_context, uncovered_card_clauses


SOURCE_PATH = Path(__file__).resolve().parents[1] / "api" / "chatbot_service.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")


class FakeLogger:
    def __init__(self) -> None:
        self.info_calls: list[tuple[str, tuple]] = []

    def info(self, _message: str, *_args) -> None:
        self.info_calls.append((_message, _args))

    def error(self, _message: str) -> None:
        pass


class FakeRAG:
    def __init__(self) -> None:
        self.calls: list[tuple[str, int]] = []

    def create_context(self, query: str, *, k: int) -> tuple[str, list[dict]]:
        self.calls.append((query, k))
        return "vector context", [{"name": "Vector source", "page": None}]


def _load_get_rag_context(
    *,
    fake_rag: FakeRAG,
    card_context: str,
    use_rag: bool = True,
    real_lexical: bool = False,
    real_cards: bool = False,
):
    module = ast.parse(SOURCE)
    function = next(
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name == "get_rag_context"
    )
    logger = FakeLogger()
    namespace = {
        "should_use_rag": lambda _query, _length: (
            (True, "full") if use_rag else (False, None)
        ),
        "get_canonical_tutor_context": lambda _query, **_kwargs: (
            "canonical context",
            [{"name": "Canonical", "page": None}],
        ),
        "get_knowledge_card_context": lambda _query, **_kwargs: (
            card_context,
            [{"name": "Reviewed source", "page": None}] if card_context else [],
        ),
        # Per-word lookups have their own tests; these isolate card/vector policy.
        "lexical_lookup_request": lambda _query: None,
        "lexical_lookup_context": lambda _query, **_kwargs: LexicalLookup(),
        "homograph_sense_context": lambda _terms, **_kwargs: LexicalLookup(),
        "uncovered_card_clauses": uncovered_card_clauses,
        "rag": fake_rag,
        "count_tokens": lambda value: len(value.split()),
        "truncate_text": lambda value, _limit: value,
        "format_source_citations": lambda sources: sources,
        "detect_query_type": lambda _query: "lookup",
        "build_retrieval_event": lambda **kwargs: kwargs,
        "json": json,
        "logger": logger,
    }
    if real_cards:
        namespace["get_knowledge_card_context"] = get_knowledge_card_context
    if real_lexical:
        namespace.update(
            lexical_lookup_request=lexical_lookup_request,
            lexical_lookup_context=lexical_lookup_context,
            homograph_sense_context=homograph_sense_context,
        )
    exec(compile(ast.Module(body=[function], type_ignores=[]), str(SOURCE_PATH), "exec"), namespace)
    return namespace["get_rag_context"], logger


def test_production_card_is_not_diluted_by_vector_retrieval() -> None:
    fake_rag = FakeRAG()
    get_rag_context, _logger = _load_get_rag_context(
        fake_rag=fake_rag,
        card_context="approved card context",
    )

    context, sources = get_rag_context(
        "Are Guam and CNMI spellings the same?"
    )

    assert context == "canonical context\n\napproved card context"
    assert [source["name"] for source in sources] == ["Canonical", "Reviewed source"]
    assert fake_rag.calls == []


def test_unmatched_question_continues_through_vector_corpus() -> None:
    fake_rag = FakeRAG()
    get_rag_context, _logger = _load_get_rag_context(fake_rag=fake_rag, card_context="")

    context, sources = get_rag_context("What does hånom mean?")

    assert context == "canonical context\n\nvector context"
    assert [source["name"] for source in sources] == ["Canonical", "Vector source"]
    assert fake_rag.calls == [("What does hånom mean?", 3)]


def test_web_backed_question_keeps_cards_but_skips_unrelated_vectors() -> None:
    fake_rag = FakeRAG()
    get_rag_context, _logger = _load_get_rag_context(
        fake_rag=fake_rag,
        card_context="approved card context",
    )

    context, sources = get_rag_context(
        "What is current Guam language policy?",
        include_vector=False,
    )

    assert context == "canonical context\n\napproved card context"
    assert [source["name"] for source in sources] == ["Canonical", "Reviewed source"]
    assert fake_rag.calls == []


def test_passage_translation_combines_scoped_card_and_vector_context() -> None:
    fake_rag = FakeRAG()
    get_rag_context, _logger = _load_get_rag_context(
        fake_rag=fake_rag,
        card_context="approved SYM context",
    )
    query = "Please translate this full school message that ends with SYM for me"

    context, sources = get_rag_context(query)

    assert context == "canonical context\n\napproved SYM context\n\nvector context"
    assert [source["name"] for source in sources] == [
        "Canonical",
        "Reviewed source",
        "Vector source",
    ]
    assert fake_rag.calls == [(query, 6)]


def test_image_context_card_does_not_suppress_vector_retrieval() -> None:
    fake_rag = FakeRAG()
    get_rag_context, _logger = _load_get_rag_context(
        fake_rag=fake_rag,
        card_context="conditional image card",
    )

    context, _sources = get_rag_context(
        "What does this image say?",
        contextual_card_ids=("usage.guam.school.sym_signoff",),
    )

    assert context.endswith("conditional image card\n\nvector context")
    assert fake_rag.calls == [("What does this image say?", 3)]


def test_image_context_card_survives_a_no_rag_typed_message() -> None:
    fake_rag = FakeRAG()
    get_rag_context, _logger = _load_get_rag_context(
        fake_rag=fake_rag,
        card_context="conditional image card",
        use_rag=False,
    )

    context, _sources = get_rag_context(
        "Help",
        contextual_card_ids=("usage.guam.school.sym_signoff",),
    )

    assert context.endswith("conditional image card\n\nvector context")
    assert fake_rag.calls == [("Help", 3)]


def test_no_rag_decision_emits_privacy_safe_selection_event() -> None:
    fake_rag = FakeRAG()
    get_rag_context, logger = _load_get_rag_context(
        fake_rag=fake_rag,
        card_context="",
        use_rag=False,
    )

    context, sources = get_rag_context("Hello")

    assert context == ""
    assert sources == []
    assert fake_rag.calls == []
    assert logger.info_calls == [
        (
            "RAG_SELECTION %s",
            (
                json.dumps(
                    {
                        "query_type": "lookup",
                        "rag_mode": None,
                        "sources": [],
                        "context_truncated": False,
                    },
                    sort_keys=True,
                ),
            ),
        )
    ]


def test_guided_topic_has_governed_curriculum_even_when_generic_rag_router_skips():
    get_rag_context, _ = _load_get_rag_context(fake_rag=FakeRAG(), card_context="", use_rag=False)
    context, sources = get_rag_context("Try a phrase", intent="practice", learning_topic_id="greetings", include_vector=False)
    assert "Recommended teaching term:" in context
    assert sources


def test_bare_dictionary_word_is_looked_up_even_when_the_router_skips() -> None:
    fake_rag = FakeRAG()
    get_rag_context, _ = _load_get_rag_context(
        fake_rag=fake_rag, card_context="", use_rag=False, real_lexical=True,
    )

    context, sources = get_rag_context("brown")

    assert "=== PER-WORD DICTIONARY LOOKUPS ===" in context
    assert "kulót chukulåti" in context
    assert ("Revised and updated Chamorro dictionary", None) in sources
    # Light mode: one vector reference after the dictionary entries.
    assert fake_rag.calls == [("brown", 1)]
    assert get_rag_context("good job") == ("", [])


def test_per_word_lookups_come_after_exact_matches_and_before_cards_and_vectors() -> None:
    fake_rag = FakeRAG()
    get_rag_context, _ = _load_get_rag_context(fake_rag=fake_rag, card_context="", real_lexical=True)

    context, _sources = get_rag_context("I want to say bamboo")

    assert context.index("canonical context") < context.index("PER-WORD") < context.index("vector context")


def test_compound_question_keeps_vector_retrieval_for_the_uncovered_clause() -> None:
    fake_rag = FakeRAG()
    get_rag_context, _ = _load_get_rag_context(fake_rag=fake_rag, card_context="orthography card")

    context, _sources = get_rag_context(
        "What is the current Guam CHamoru orthography? Also explain possession in detail."
    )

    assert "orthography card" in context and context.endswith("vector context")
    assert fake_rag.calls == [("explain possession in detail.", 3)]


@pytest.mark.parametrize(
    ("query", "uncovered"),
    [
        ("What is the current Guam CHamoru orthography and explain possession in detail?",
         "explain possession in detail?"),
        ("What is the current Guam CHamoru orthography? Explain possession.", "Explain possession."),
        ("What is the current Guam CHamoru orthography, and how do I write possession?",
         "how do I write possession?"),
    ],
)
def test_real_card_matcher_keeps_vectors_for_coordinated_and_short_clauses(query, uncovered) -> None:
    fake_rag = FakeRAG()
    get_rag_context, _ = _load_get_rag_context(fake_rag=fake_rag, card_context="", real_cards=True)

    context, _sources = get_rag_context(query)

    assert "[Knowledge card: orthography.guam.current_reference]" in context
    assert fake_rag.calls == [(uncovered, 3)]


@pytest.mark.parametrize(
    "query",
    [
        "What is the current Guam CHamoru orthography?",
        "What is the current Guam CHamoru orthography? Explain more.",
        "What is the current Guam CHamoru orthography? Thanks!",
    ],
)
def test_real_card_still_settles_a_single_topic(query) -> None:
    fake_rag = FakeRAG()
    get_rag_context, _ = _load_get_rag_context(fake_rag=fake_rag, card_context="", real_cards=True)

    context, _sources = get_rag_context(query)

    assert "[Knowledge card: orthography.guam.current_reference]" in context
    assert fake_rag.calls == []


class SenseRAG(FakeRAG):
    def dictionary_homograph_senses(self, keys):
        senses = {"un": (("A, an, one (indefinite article).", {"source_id": "chamoru_info_dictionary"}),)}
        return {key: senses.get(key, ()) for key in keys}


def test_recheck_keeps_its_term_lookups_and_adds_only_collapsed_senses() -> None:
    fake_rag = SenseRAG()
    get_rag_context, _ = _load_get_rag_context(fake_rag=fake_rag, card_context="", real_lexical=True)
    lookups = VerificationLookups(context="term lookups", sources=[], found=("un",))

    context, _sources = get_rag_context(
        "Are you sure?", retrieval_input="I want to say bamboo", verification_lookups=lookups,
    )

    assert context.startswith("term lookups\n\ncanonical context")
    assert "Another recorded sense of \"un\"" in context
    # No per-word lookup of the earlier request: the re-check flow is unchanged.
    assert "pi'ao" not in context
