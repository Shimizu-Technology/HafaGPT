import ast
import json
from pathlib import Path


SOURCE_PATH = Path(__file__).resolve().parents[1] / "api" / "chatbot_service.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")


class FakeLogger:
    def info(self, _message: str, *_args) -> None:
        pass

    def error(self, _message: str) -> None:
        pass


class FakeRAG:
    def __init__(self) -> None:
        self.calls: list[tuple[str, int]] = []

    def create_context(self, query: str, *, k: int) -> tuple[str, list[dict]]:
        self.calls.append((query, k))
        return "vector context", [{"name": "Vector source", "page": None}]


def _load_get_rag_context(*, fake_rag: FakeRAG, card_context: str):
    module = ast.parse(SOURCE)
    function = next(
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name == "get_rag_context"
    )
    namespace = {
        "should_use_rag": lambda _query, _length: (True, "full"),
        "get_canonical_tutor_context": lambda _query: (
            "canonical context",
            [{"name": "Canonical", "page": None}],
        ),
        "get_knowledge_card_context": lambda _query: (
            card_context,
            [{"name": "Reviewed source", "page": None}] if card_context else [],
        ),
        "rag": fake_rag,
        "count_tokens": lambda value: len(value.split()),
        "truncate_text": lambda value, _limit: value,
        "format_source_citations": lambda sources: sources,
        "detect_query_type": lambda _query: "lookup",
        "build_retrieval_event": lambda **_kwargs: {},
        "json": json,
        "logger": FakeLogger(),
    }
    exec(compile(ast.Module(body=[function], type_ignores=[]), str(SOURCE_PATH), "exec"), namespace)
    return namespace["get_rag_context"]


def test_production_card_is_not_diluted_by_vector_retrieval() -> None:
    fake_rag = FakeRAG()
    get_rag_context = _load_get_rag_context(
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
    get_rag_context = _load_get_rag_context(fake_rag=fake_rag, card_context="")

    context, sources = get_rag_context("What does hånom mean?")

    assert context == "canonical context\n\nvector context"
    assert [source["name"] for source in sources] == ["Canonical", "Vector source"]
    assert fake_rag.calls == [("What does hånom mean?", 3)]
