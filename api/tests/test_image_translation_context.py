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
