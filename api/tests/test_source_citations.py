from api.source_citations import format_source_citations


def test_legacy_source_pairs_gain_governed_public_metadata() -> None:
    citations = format_source_citations([("Chamoru.info dictionary", None)])

    assert citations[0]["source_id"] == "chamoru_info_dictionary"
    assert citations[0]["url"] == "https://www.chamoru.info/dictionary/"
    assert citations[0]["authority_score"] == 3


def test_structured_sources_are_deduplicated_and_private_fields_are_removed() -> None:
    source = {
        "source_id": "chamoru_info_dictionary",
        "name": "Chamoru.info dictionary",
        "url": "https://www.chamoru.info/dictionary/",
        "page": None,
        "locator": "Dictionary entry hånom",
        "private_path": "/private/imports/dictionary.json",
    }

    citations = format_source_citations([source, source])

    assert len(citations) == 1
    assert "private_path" not in citations[0]


def test_non_public_legacy_url_is_not_exposed_to_chat_clients() -> None:
    citations = format_source_citations(
        [
            {
                "source_id": "local_revised_dictionary_snapshot",
                "name": "Local Revised Chamorro Dictionary snapshot",
                "url": "/private/imports/dictionary.json",
                "page": 42,
            }
        ]
    )

    assert citations[0]["url"] is None
    assert citations[0]["page"] == 42
