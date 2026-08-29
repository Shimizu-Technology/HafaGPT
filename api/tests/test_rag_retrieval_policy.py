from __future__ import annotations

from langchain_core.documents import Document

from src.rag.chamorro_rag import ChamorroRAG, _is_low_quality_semantic_chunk
from src.rag.source_policy import retrieval_metadata_filter_for_roles


class FakeVectorStore:
    def __init__(self, documents: list[Document]) -> None:
        self.documents = documents
        self.calls: list[dict] = []

    @staticmethod
    def _matches_filter(document: Document, filter_spec: dict | None) -> bool:
        if not filter_spec:
            return True
        if "$or" in filter_spec:
            return any(
                FakeVectorStore._matches_filter(document, clause)
                for clause in filter_spec["$or"]
            )

        field, condition = next(iter(filter_spec.items()))
        operator, expected = next(iter(condition.items()))
        actual = str(document.metadata.get(field, ""))
        if operator == "$ilike":
            return expected.strip("%").casefold() in actual.casefold()
        if operator == "$eq":
            return actual.casefold() == str(expected).casefold()
        raise AssertionError(f"Unsupported fake filter operator: {operator}")

    def similarity_search_with_score(
        self,
        query: str,
        *,
        k: int,
        filter: dict | None = None,
    ) -> list[tuple[Document, float]]:
        self.calls.append({"query": query, "k": k, "filter": filter})
        documents = [
            item for item in self.documents if self._matches_filter(item, filter)
        ]
        return [
            (item, float(item.metadata.get("test_distance", index / 100)))
            for index, item in enumerate(documents[:k])
        ]


def rag_with_documents(documents: list[Document]) -> ChamorroRAG:
    rag = object.__new__(ChamorroRAG)
    rag.vectorstore = FakeVectorStore(documents)
    return rag


def document(
    content: str,
    source: str,
    source_type: str = "website",
    *,
    distance: float | None = None,
) -> Document:
    metadata = {"source": source, "source_type": source_type}
    if distance is not None:
        metadata["test_distance"] = distance
    return Document(
        page_content=content,
        metadata=metadata,
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


def test_explicit_small_source_mention_gets_a_filtered_candidate_lane() -> None:
    rag = rag_with_documents(
        [
            document("Dictionary entry", "https://www.chamoru.info/dictionary/example"),
            document(
                "Peter Onedera, Pacific Daily News",
                "https://www.guampdn.com/opinion/example",
                "pacific_daily_news",
            ),
        ]
    )

    results = rag.search(
        "Who writes Chamorro language content in the Pacific Daily News?",
        k=2,
    )

    assert any(
        metadata["source_id"] == "pacific_daily_news"
        for _content, metadata in results
    )


def test_blocked_candidates_cannot_exhaust_the_semantic_search_window() -> None:
    blocked_documents = [
        document(
            f"Blocked candidate {index}",
            f"https://natibunmarianas.org/entry/{index}",
        )
        for index in range(80)
    ]
    governed_document = document(
        "Governed language overview",
        "https://www.chamoru.info/language-lessons/chamorro-language",
    )
    rag = rag_with_documents(blocked_documents + [governed_document])

    results = rag.search("Tell me about the Chamorro language", k=3)

    assert [content for content, _metadata in results] == ["Governed language overview"]
    assert rag.vectorstore.calls[-1]["filter"] is not None


def test_semantic_ranking_uses_vector_distance_instead_of_candidate_position() -> None:
    rag = rag_with_documents(
        [
            document(
                "Less relevant lesson",
                "https://www.chamoru.info/language-lessons/one",
                distance=0.9,
            ),
            document(
                "More relevant lesson",
                "https://www.chamoru.info/language-lessons/two",
                distance=0.1,
            ),
        ]
    )

    results = rag.search("Teach me about Chamorro grammar", k=2)

    assert [content for content, _metadata in results] == [
        "More relevant lesson",
        "Less relevant lesson",
    ]


def test_explicit_grammar_question_gets_a_dedicated_grammar_candidate_lane() -> None:
    dictionary_rows = [
        document(
            f"Dictionary index fragment {index}",
            f"/documents/Revised-Chamorro-Dictionary.pdf?row={index}",
            distance=0.2,
        )
        for index in range(25)
    ]
    grammar = document(
        "Possessors follow the possessed noun in this construction.",
        "/documents/chamorro_grammar_dr._sandra_chung.pdf",
        distance=0.3,
    )
    rag = rag_with_documents(dictionary_rows + [grammar])

    results = rag.search("How does possession work in Chamorro grammar?", k=3)

    assert any(
        metadata["content_role"] == "reviewed_grammar"
        for _content, metadata in results
    )
    grammar_filter = retrieval_metadata_filter_for_roles(
        "educational",
        {"reviewed_grammar"},
    )
    assert sum(call["filter"] == grammar_filter for call in rag.vectorstore.calls) == 1


def test_plural_grammar_terms_activate_the_reviewed_grammar_lane() -> None:
    grammar_filter = retrieval_metadata_filter_for_roles(
        "educational",
        {"reviewed_grammar"},
    )
    grammar = document(
        "Verbs and pronouns participate in agreement.",
        "/documents/chamorro_grammar_dr._sandra_chung.pdf",
        distance=0.3,
    )

    for query in ("Explain verbs in Chamorro", "Teach me about pronouns"):
        rag = rag_with_documents([grammar])
        results = rag.search(query, k=3)

        assert results[0][1]["content_role"] == "reviewed_grammar"
        assert sum(
            call["filter"] == grammar_filter for call in rag.vectorstore.calls
        ) == 1


def test_runtime_rejects_semantically_distant_vector_candidates() -> None:
    rag = rag_with_documents(
        [
            document("Relevant lesson", "https://www.chamoru.info/language-lessons/one", distance=0.2),
            document("Unrelated lesson", "https://www.chamoru.info/language-lessons/two", distance=0.9),
        ]
    )
    rag.embedding_contract = {"provider": "openai"}

    results = rag.search("Teach me about Chamorro grammar", k=2)

    assert [content for content, _metadata in results] == ["Relevant lesson"]


def test_book_index_and_table_of_contents_fragments_are_not_answer_evidence() -> None:
    assert _is_low_quality_semantic_chunk(
        "questions ........ 482 ........ 493",
        {"source_id": "chung_grammar_2020", "page": 19},
    )
    assert _is_low_quality_semantic_chunk(
        "predicate, 25, 31, 35, 36, 263, 264, 340, 631, 633, 635, 690",
        {"source_id": "chung_grammar_2020", "page": 745},
    )
    assert not _is_low_quality_semantic_chunk(
        "Chamorro is an Austronesian language spoken in the Mariana Islands.",
        {"source_id": "chung_grammar_2020", "page": 34},
    )


def test_ambiguous_translation_blocks_do_not_attach_vector_evidence() -> None:
    rag = rag_with_documents(
        [document("Governed lesson", "https://www.chamoru.info/language-lessons/example")]
    )
    query = (
        "Translate this to Chamorro:\n\n"
        "Our family has been worried about her.\n\n"
        "Good morning, Stassie will not be at school today."
    )

    assert rag.search(query, k=3) == []
    assert rag.vectorstore.calls == []


def test_multiline_translation_is_embedded_as_one_complete_passage() -> None:
    rag = rag_with_documents(
        [document("Governed lesson", "https://www.chamoru.info/language-lessons/example")]
    )
    passage = (
        "Good morning, Stassie is sick.\n"
        "She will not be at school today.\n"
        "Thank you for understanding."
    )

    rag.search(f"Translate this to Chamorro:\n\n{passage}", k=3)

    assert rag.vectorstore.calls[0]["query"] == passage.casefold()
