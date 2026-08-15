from scripts.audit_rag_sources import classify_source_counts


def test_source_audit_counts_blocked_and_unregistered_chunks() -> None:
    audit = classify_source_counts(
        [
            ("https://www.guampedia.com/example", "guampedia", 55),
            ("/documents/Revised-Chamorro-Dictionary.pdf", None, 174),
            ("https://example.com/unregistered", "website", 3),
        ]
    )

    assert audit["by_source_id"]["guampedia"] == 55
    assert audit["by_source_id"]["local_revised_dictionary_snapshot"] == 174
    assert audit["blocked_chunks"] == 58
    assert audit["unregistered_chunks"] == 3
