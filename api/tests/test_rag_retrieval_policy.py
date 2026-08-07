from __future__ import annotations

from langchain_core.documents import Document

from src.rag.chamorro_rag import ChamorroRAG


class FakeVectorStore:
    def __init__(self, documents: list[Document]) -> None:
        self.documents = documents

    def similarity_search(self, _query: str, *, k: int) -> list[Document]:
        return self.documents[:k]


def rag_with_documents(documents: list[Document]) -> ChamorroRAG:
    rag = object.__new__(ChamorroRAG)
    rag.vectorstore = FakeVectorStore(documents)
    return rag


def document(content: str, source: str, source_type: str = "website") -> Document:
    return Document(
        page_content=content,
        metadata={"source": source, "source_type": source_type},
    )


def test_educational_search_filters_blocked_and_role_ineligible_sources() -> None:
    rag = rag_with_documents(
        [
            document("Guampedia content", "https://www.guampedia.com/example", "guampedia"),
            document("Student wiki", "https://wikis.swarthmore.edu/ling073/Chamorro/Grammar"),
            document("Historical vocabulary", "rosettaproject_chamorro_vocab.pdf", "pdf"),
            document("Governed lesson", "https://www.chamoru.info/language-lessons/example"),
        ]
    )

    results = rag.search("Teach me about Chamorro sentence structure", k=5)

    assert [content for content, _metadata in results] == ["Governed lesson"]
    assert results[0][1]["source_id"] == "chamoru_info_lessons"


def test_historical_search_requires_explicit_historical_intent() -> None:
    rag = rag_with_documents(
        [
            document("Modern lesson", "https://www.chamoru.info/language-lessons/example"),
            document("Historical vocabulary", "rosettaproject_chamorro_vocab.pdf", "pdf"),
        ]
    )

    results = rag.search("What was this word historically?", k=5)

    assert [content for content, _metadata in results] == ["Historical vocabulary"]
    assert results[0][1]["content_role"] == "historical"


def test_exact_duplicate_chunks_do_not_fill_the_result_set() -> None:
    duplicate = document("Repeated footer", "https://www.chamoru.info/language-lessons/example")
    rag = rag_with_documents([duplicate, duplicate, duplicate])

    results = rag.search("Teach me a Chamorro lesson", k=5)

    assert len(results) == 1
