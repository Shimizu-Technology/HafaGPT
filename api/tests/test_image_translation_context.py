import json

from src.rag.image_translation_context import (
    ImageTranslationContext,
    build_image_translation_query,
    build_translation_structure_hints,
    merge_image_translation_contexts,
    parse_image_context_response,
)
from src.rag.translation_policy import (
    classify_translation_request,
    extract_translation_retrieval_payload,
)


CARD_IDS = {
    "SYM": "usage.guam.school.sym_signoff",
    "MSY": "usage.guam.school.msy_greeting",
}


def _response(**overrides) -> str:
    payload = {
        "signals": [],
        "visible_language_text": [],
        "text_confidence": "high",
    }
    payload.update(overrides)
    return json.dumps(payload)


def test_parser_preserves_message_body_but_drops_contact_metadata() -> None:
    context = parse_image_context_response(
        _response(
            signals=["MSY", "SYM", "SCHOOL"],
            visible_language_text=[
                "parent@example.com",
                "+1 (671) 480-3595",
                "Angelana Iriarte",
                "Today 9:15 AM",
                "Delivered",
                "~garridokristenm",
                "MSY! Kao modan isla pat kulot kåhet na polo på'go?",
                "MSY! Trabiha. Kada uttemo na Betnes kulot kåhet på'go 🧡",
                "Esta, SYM!",
            ],
        ),
        card_ids_by_signal=CARD_IDS,
    )

    assert context.card_ids == (
        "usage.guam.school.sym_signoff",
        "usage.guam.school.msy_greeting",
    )
    assert context.school_announcement is True
    assert "example.com" not in context.visible_language_text
    assert "671" not in context.visible_language_text
    assert "Angelana" not in context.visible_language_text
    assert "9:15" not in context.visible_language_text
    assert "Delivered" not in context.visible_language_text
    assert "garridokristenm" not in context.visible_language_text
    assert context.visible_language_text.splitlines() == [
        "MSY! Kao modan isla pat kulot kåhet na polo på'go?",
        "MSY! Trabiha. Kada uttemo na Betnes kulot kåhet på'go 🧡",
        "Esta, SYM!",
    ]


def test_parser_fails_closed_for_malformed_or_extra_fields() -> None:
    assert parse_image_context_response(
        "not json",
        card_ids_by_signal=CARD_IDS,
    ) == ImageTranslationContext()
    assert parse_image_context_response(
        _response(extra="untrusted"),
        card_ids_by_signal=CARD_IDS,
    ) == ImageTranslationContext()
    assert parse_image_context_response(
        _response(signals=["MSY", "UNKNOWN"]),
        card_ids_by_signal=CARD_IDS,
    ) == ImageTranslationContext()


def test_parser_accepts_fenced_json_but_not_low_confidence_text() -> None:
    raw = _response(
        signals=["MSY"],
        visible_language_text=["uncertain text"],
        text_confidence="low",
    )
    context = parse_image_context_response(
        f"```json\n{raw}\n```",
        card_ids_by_signal=CARD_IDS,
    )

    assert context.card_ids == ("usage.guam.school.msy_greeting",)
    assert context.visible_language_text == ""


def test_short_language_lines_are_not_mistaken_for_sender_names() -> None:
    context = parse_image_context_response(
        _response(visible_language_text=["Håfa Adai", "Trabiha", "Si Maria"]),
        card_ids_by_signal=CARD_IDS,
    )

    assert context.visible_language_text.splitlines() == [
        "Håfa Adai",
        "Trabiha",
        "Si Maria",
    ]


def test_same_image_chamorro_text_scopes_transcribed_acronyms_deterministically() -> None:
    context = parse_image_context_response(
        _response(
            visible_language_text=[
                "MSY! Kao modan isla pat kulot kåhet na polo på'go?",
                "Esta, SYM!",
            ]
        ),
        card_ids_by_signal=CARD_IDS,
    )

    assert context.card_ids == (
        "usage.guam.school.sym_signoff",
        "usage.guam.school.msy_greeting",
    )


def test_isolated_acronym_without_same_image_context_does_not_select_card() -> None:
    context = parse_image_context_response(
        _response(visible_language_text=["MSY"]),
        card_ids_by_signal=CARD_IDS,
    )

    assert context.card_ids == ()


def test_image_translation_query_becomes_a_passage_for_governed_retrieval() -> None:
    context = ImageTranslationContext(
        visible_language_text=(
            "MSY! Kao modan isla pat kulot kåhet na polo på'go?\n"
            "MSY! Trabiha. Kada uttemo na Betnes kulot kåhet på'go.\n"
            "Esta, SYM!"
        )
    )

    query, is_translation = build_image_translation_query(
        "What does this say?",
        context,
    )

    assert is_translation is True
    assert classify_translation_request(query) == "passage_to_english"
    assert extract_translation_retrieval_payload(query).startswith("MSY! Kao modan")
    assert "Trabiha" in extract_translation_retrieval_payload(query)


def test_non_translation_image_request_does_not_inject_extracted_text() -> None:
    context = ImageTranslationContext(visible_language_text="Håfa adai")

    assert build_image_translation_query("Describe the colors", context) == (
        "Describe the colors",
        False,
    )


def test_multiple_images_merge_without_duplicate_text_or_cards() -> None:
    merged = merge_image_translation_contexts([
        ImageTranslationContext(
            card_ids=("usage.guam.school.msy_greeting",),
            visible_language_text="MSY!",
        ),
        ImageTranslationContext(
            card_ids=("usage.guam.school.msy_greeting",),
            school_announcement=True,
            visible_language_text="Esta, SYM!",
        ),
    ])

    assert merged.card_ids == ("usage.guam.school.msy_greeting",)
    assert merged.school_announcement is True
    assert merged.visible_language_text == "MSY!\nEsta, SYM!"


def test_recurring_clothing_exchange_gets_scoped_compositional_hint() -> None:
    context = ImageTranslationContext(
        visible_language_text=(
            "Kao modan isla pat kulot kåhet na polo på'go?\n"
            "Trabina. Kada uttemo na Betnes kulot kåhet på'go."
        )
    )

    hints = build_translation_structure_hints(context.visible_language_text)

    assert "island style" in hints
    assert "every last Friday" in hints
    assert "today's polo is orange" in hints
    assert "does not describe the orange shirt" in hints


def test_unrelated_translation_does_not_get_clothing_hint() -> None:
    assert build_translation_structure_hints(
        "Håfa adai! Håfa tatatmånu hao?"
    ) == ""


def _structured_response(**overrides) -> str:
    payload = {
        "signals": [],
        "text_confidence": "high",
        "complete": True,
        "lines": [],
    }
    payload.update(overrides)
    return json.dumps(payload)


def test_structured_page_preserves_numbering_repeated_choices_and_title_case() -> None:
    lines = ["11. Question?", "Motmot Guma’", "Ti Motmot Guma’", "12. Question?", "Motmot Guma’"]
    context = parse_image_context_response(
        _structured_response(lines=[{"text": line, "kind": "body"} for line in lines]),
        card_ids_by_signal=CARD_IDS,
        image_index=2,
    )
    page = context.pages[0]
    assert page.status == "complete"
    assert [item.text for item in page.items] == lines
    assert [item.id for item in page.items] == ["p3-i1", "p3-i2", "p3-i3", "p3-i4", "p3-i5"]
    assert context.visible_language_text.count("Motmot Guma’") == 3


def test_structured_privacy_uses_roles_not_capitalization() -> None:
    context = parse_image_context_response(
        _structured_response(lines=[
            {"text": "Example Student", "kind": "private_metadata"},
            {"text": "Kåmpu", "kind": "body"},
            {"text": "Motmot Guma’ Yan Bisnes", "kind": "body"},
            {"text": "parent@example.com", "kind": "body"},
            {"text": "Delivered", "kind": "private_metadata"},
        ]), card_ids_by_signal=CARD_IDS,
    )
    assert [item.text for item in context.pages[0].items] == ["Kåmpu", "Motmot Guma’ Yan Bisnes"]
    assert "Example Student" not in repr(context)
    assert "parent@example.com" not in repr(context)
    assert context.pages[0].complete


def test_unclear_text_is_retained_as_partial_but_not_used_for_retrieval() -> None:
    context = parse_image_context_response(
        _structured_response(lines=[
            {"text": "1. Readable question", "kind": "body"},
            {"text": "", "kind": "unclear"},
        ]), card_ids_by_signal=CARD_IDS,
    )
    page = context.pages[0]
    assert page.status == "partial"
    assert page.items[1].text == "[unclear]"
    assert page.items[1].kind == "unclear"
    assert "unclear_text" in page.issues
    assert "unclear" not in context.visible_language_text


def test_low_confidence_never_claims_complete_or_grounds_retrieval() -> None:
    context = parse_image_context_response(
        _structured_response(text_confidence="low", lines=[{"text": "Possible text", "kind": "body"}]),
        card_ids_by_signal=CARD_IDS,
    )
    assert context.pages[0].status == "partial"
    assert context.pages[0].items[0].kind == "unclear"
    assert context.visible_language_text == ""


def test_empty_page_is_explicitly_unavailable() -> None:
    context = parse_image_context_response(_structured_response(), card_ids_by_signal=CARD_IDS)
    assert context.pages[0].status == "unavailable"
    assert not context.pages[0].complete
    assert "no_readable_text" in context.pages[0].issues


def test_legacy_transcript_cannot_claim_verified_completeness() -> None:
    context = parse_image_context_response(
        _response(visible_language_text=["Håfa adai"]), card_ids_by_signal=CARD_IDS,
    )
    assert context.pages[0].status == "partial"
    assert context.pages[0].issues == ("legacy_unverified",)


def test_structured_parser_rejects_malformed_types_and_unknown_fields() -> None:
    from src.rag.image_translation_context import try_parse_image_context_response

    invalid = [
        {"complete": "true"}, {"text_confidence": []}, {"text_confidence": "certain"},
        {"signals": ["MSY", "MSY"]}, {"lines": "text"},
        {"lines": [{"text": "text", "kind": "instruction"}]},
        {"lines": [{"text": "text", "kind": "body", "trusted": True}]},
        {"lines": [{"text": None, "kind": "body"}]},
    ]
    for overrides in invalid:
        assert try_parse_image_context_response(
            _structured_response(**overrides), card_ids_by_signal=CARD_IDS,
        ) is None


def test_page_limits_are_visible_and_do_not_crop_later_pages() -> None:
    from src.rag.image_translation_context import MAX_IMAGE_TEXT_ITEMS

    first = parse_image_context_response(
        _structured_response(lines=[{"text": f"Item {i}", "kind": "body"} for i in range(140)]),
        card_ids_by_signal=CARD_IDS,
    )
    second = parse_image_context_response(
        _structured_response(lines=[{"text": "Last page question", "kind": "body"}]),
        card_ids_by_signal=CARD_IDS, image_index=1,
    )
    merged = merge_image_translation_contexts([first, second])
    assert len(merged.pages) == 2
    assert len(merged.pages[0].items) == MAX_IMAGE_TEXT_ITEMS
    assert merged.pages[0].status == "partial"
    assert "page_limit" in merged.pages[0].issues
    assert merged.pages[1].status == "complete"
    assert merged.pages[1].items[0].text == "Last page question"


def test_long_line_has_explicit_partial_marker() -> None:
    context = parse_image_context_response(
        _structured_response(lines=[{"text": "x" * 2200, "kind": "body"}]),
        card_ids_by_signal=CARD_IDS,
    )
    page = context.pages[0]
    assert page.status == "partial"
    assert "line_limit" in page.issues
    assert "exceeds transcription limit" in page.items[0].text
    assert page.items[0].kind == "unclear"


def test_retrieval_budget_is_fair_while_page_transcripts_remain_complete() -> None:
    contexts = [
        parse_image_context_response(
            _structured_response(lines=[{"text": letter * 1000, "kind": "body"} for _ in range(3)]),
            card_ids_by_signal=CARD_IDS, image_index=i,
        ) for i, letter in enumerate("ABC")
    ]
    merged = merge_image_translation_contexts(contexts)
    query, is_translation = build_image_translation_query("What do these say?", merged)
    excerpt = query.split("\n\n", 1)[1]
    assert is_translation
    assert len(excerpt) <= 4000
    assert all(excerpt.count(letter) >= 1300 for letter in "ABC")
    assert all(len(page.visible_language_text) == 3002 for page in merged.pages)
    assert all(page.complete for page in merged.pages)


def test_short_pages_donate_unused_retrieval_allowance() -> None:
    contexts = [
        parse_image_context_response(
            _structured_response(lines=[{"text": text, "kind": "body"} for text in lines]),
            card_ids_by_signal=CARD_IDS, image_index=i,
        ) for i, lines in enumerate([["Short page"], ["A" * 1500] * 3])
    ]
    query, _ = build_image_translation_query("Translate these pages", merge_image_translation_contexts(contexts))
    assert "Short page" in query
    assert query.count("A") > 3900


def test_plural_requests_and_empty_upload_trigger_translation() -> None:
    from src.rag.image_translation_context import is_image_translation_request

    for request in ["", "What do these say?", "What do the photos mean?", "Read these pages", "Translate these"]:
        assert is_image_translation_request(request)
    assert not is_image_translation_request("Describe the colors")


def test_structured_body_role_preserves_words_also_used_by_app_chrome() -> None:
    context = parse_image_context_response(
        _structured_response(lines=[
            {"text": "Read", "kind": "body"},
            {"text": "Yesterday", "kind": "body"},
            {"text": "Delivered", "kind": "private_metadata"},
        ]), card_ids_by_signal=CARD_IDS,
    )
    assert [item.text for item in context.pages[0].items] == ["Read", "Yesterday"]


def test_page_character_limit_counts_separators_and_keeps_partial_status() -> None:
    from src.rag.image_translation_context import MAX_IMAGE_PAGE_CHARS

    context = parse_image_context_response(
        _structured_response(lines=[{"text": "a" * 2000, "kind": "body"}] * 7),
        card_ids_by_signal=CARD_IDS,
    )
    page = context.pages[0]
    assert len(page.visible_language_text) <= MAX_IMAGE_PAGE_CHARS
    assert "page_limit" in page.issues
    assert page.status == "partial"
