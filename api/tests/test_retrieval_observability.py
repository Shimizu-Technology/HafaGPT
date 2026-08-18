from src.rag.retrieval_observability import build_retrieval_event


def test_retrieval_event_reports_governed_card_without_user_text() -> None:
    event = build_retrieval_event(
        query_type="educational",
        rag_mode="full",
        sources=[
            {
                "source_id": "kumision_guam_orthography_2024",
                "name": "Public display name",
                "knowledge_card_id": "orthography.guam.current_reference",
                "evidence_kind": "knowledge_card",
                "private_path": "/private/source.pdf",
            }
        ],
        context_truncated=False,
    )

    assert event == {
        "event": "rag_evidence_selected",
        "version": 1,
        "route": "knowledge_card",
        "query_type": "educational",
        "rag_mode": "full",
        "source_count": 1,
        "source_ids": ["kumision_guam_orthography_2024"],
        "evidence_kinds": ["knowledge_card"],
        "knowledge_card_ids": ["orthography.guam.current_reference"],
        "context_truncated": False,
    }
    serialized = str(event)
    assert "Public display name" not in serialized
    assert "/private/source.pdf" not in serialized


def test_retrieval_event_distinguishes_vector_and_no_evidence_routes() -> None:
    vector_event = build_retrieval_event(
        query_type="lookup",
        rag_mode="full",
        sources=[
            {
                "source_id": "chamoru_info_dictionary",
                "evidence_kind": "legacy_retrieval",
            }
        ],
        context_truncated=True,
    )
    empty_event = build_retrieval_event(
        query_type="lookup",
        rag_mode="full",
        sources=[],
        context_truncated=False,
    )

    assert vector_event["route"] == "vector"
    assert vector_event["context_truncated"] is True
    assert empty_event["route"] == "no_evidence"
