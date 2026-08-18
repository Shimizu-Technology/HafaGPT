import pytest

from api.source_citations import format_source_citations
from api.models import SourceInfo


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


@pytest.mark.parametrize(
    "unsafe_url",
    [
        "/private/imports/dictionary.json",
        "javascript:alert(1)",
        "http://localhost/internal",
        "http://127.0.0.1/internal",
        "https://127.1/internal",
    ],
)
def test_non_public_legacy_url_is_not_exposed_to_chat_clients(
    unsafe_url: str,
) -> None:
    citations = format_source_citations(
        [
            {
                "source_id": "local_revised_dictionary_snapshot",
                "name": "Local Revised Chamorro Dictionary snapshot",
                "url": unsafe_url,
                "page": 42,
            }
        ]
    )

    assert citations[0]["url"] is None
    assert citations[0]["page"] == 42


def test_source_info_preserves_governed_citation_metadata() -> None:
    citation = format_source_citations(
        [
            {
                "source_id": "chamoru_info_dictionary",
                "name": "Chamoru.info dictionary",
                "url": "https://www.chamoru.info/dictionary/",
                "page": None,
                "locator": "Dictionary entry hånom",
                "content_role": "lexical_reference",
                "region": "Guam",
                "evidence_kind": "legacy_retrieval",
            }
        ]
    )[0]

    serialized = SourceInfo(**citation).model_dump()

    assert serialized["source_id"] == "chamoru_info_dictionary"
    assert serialized["url"] == "https://www.chamoru.info/dictionary/"
    assert serialized["locator"] == "Dictionary entry hånom"
    assert serialized["content_role"] == "lexical_reference"
    assert serialized["evidence_kind"] == "legacy_retrieval"
