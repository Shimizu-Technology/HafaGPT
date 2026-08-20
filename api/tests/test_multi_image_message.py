import ast
import json
from pathlib import Path
from types import SimpleNamespace

from src.rag.image_translation_context import (
    ImageTranslationContext,
    merge_image_translation_contexts,
    parse_image_context_response,
    try_parse_image_context_response,
)


def _detector_json(
    *,
    signals: list[str] | None = None,
    lines: list[str] | None = None,
    confidence: str = "high",
) -> str:
    return json.dumps({
        "signals": signals or [],
        "visible_language_text": lines or [],
        "text_confidence": confidence,
    })


def _load_image_helpers(
    detector_text: str | list[str | Exception] = _detector_json(),
    detector_error: Exception | None = None,
):
    source_path = Path(__file__).resolve().parents[1] / "api" / "chatbot_service.py"
    module = ast.parse(source_path.read_text())
    helper_nodes = [
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef)
        and node.name in {
            "_normalize_image_inputs",
            "_build_current_user_message",
            "detect_image_context",
            "detect_image_context_card_ids",
        }
    ]
    isolated_module = ast.Module(body=helper_nodes, type_ignores=[])

    class FakeCompletions:
        def __init__(self):
            self.calls = []

        def create(self, **kwargs):
            self.calls.append(kwargs)
            if detector_error:
                raise detector_error
            if isinstance(detector_text, list):
                response_text = detector_text[len(self.calls) - 1]
            else:
                response_text = detector_text
            if isinstance(response_text, Exception):
                raise response_text
            message = SimpleNamespace(content=response_text)
            return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    class FakeLogger:
        def info(self, *_args):
            pass

        def warning(self, *_args):
            pass

    completions = FakeCompletions()
    client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    namespace = {
        "SYM_IMAGE_CONTEXT_CARD_ID": "usage.guam.school.sym_signoff",
        "MSY_IMAGE_CONTEXT_CARD_ID": "usage.guam.school.msy_greeting",
        "IMAGE_CONTEXT_CARD_IDS": {
            "SYM": "usage.guam.school.sym_signoff",
            "MSY": "usage.guam.school.msy_greeting",
        },
        "ImageTranslationContext": ImageTranslationContext,
        "merge_image_translation_contexts": merge_image_translation_contexts,
        "parse_image_context_response": parse_image_context_response,
        "try_parse_image_context_response": try_parse_image_context_response,
        "get_client_for_request": lambda **_kwargs: (client, "vision-model"),
        "logger": FakeLogger(),
    }
    exec(compile(isolated_module, str(source_path), "exec"), namespace)
    return (
        namespace["_normalize_image_inputs"],
        namespace["_build_current_user_message"],
        namespace["detect_image_context_card_ids"],
        namespace["detect_image_context"],
        completions,
    )


def test_build_current_user_message_includes_all_images_with_content_types():
    _, build_message, _, _, _ = _load_image_helpers()

    message = build_message(
        "Compare these screenshots",
        [
            {"data": "first-image", "content_type": "image/png"},
            {"data": "second-image", "content_type": "image/webp"},
        ],
    )

    assert message["role"] == "user"
    assert message["content"][0] == {
        "type": "text",
        "text": "Compare these screenshots",
    }
    assert message["content"][1]["image_url"]["url"] == "data:image/png;base64,first-image"
    assert message["content"][2]["image_url"]["url"] == "data:image/webp;base64,second-image"
    assert all(part["image_url"]["detail"] == "high" for part in message["content"][1:])


def test_normalize_image_inputs_preserves_legacy_single_image():
    normalize, _, _, _, _ = _load_image_helpers()

    assert normalize(image_base64="legacy-image", image_inputs=None) == [{
        "data": "legacy-image",
        "content_type": "image/jpeg",
    }]


def test_image_detector_includes_sym_card_only_after_scoped_visual_match() -> None:
    _, _, detect_context, _, completions = _load_image_helpers(
        detector_text=_detector_json(signals=["SYM"])
    )

    card_ids = detect_context([{"data": "image-data", "content_type": "image/png"}])

    assert card_ids == ("usage.guam.school.sym_signoff",)
    request = completions.calls[0]
    assert request["model"] == "vision-model"
    assert request["max_tokens"] == 1000
    detector_prompt = request["messages"][1]["content"][0]["text"]
    assert "same image" in detector_prompt
    assert "Guam/Chamorro/Hurao" in detector_prompt
    assert "standalone SYM or MSY" in detector_prompt
    assert "isolated token" in detector_prompt
    assert "same image" in request["messages"][0]["content"]
    assert "requested JSON object" in request["messages"][0]["content"]
    assert request["messages"][1]["content"][1]["image_url"]["url"] == (
        "data:image/png;base64,image-data"
    )


def test_image_detector_includes_msy_card_after_scoped_visual_match() -> None:
    _, _, detect_context, _, completions = _load_image_helpers(
        detector_text=_detector_json(signals=["MSY"])
    )

    assert detect_context(
        [{"data": "hurao-msy-image", "content_type": "image/jpeg"}]
    ) == ("usage.guam.school.msy_greeting",)
    assert len(completions.calls) == 1


def test_image_detector_can_include_both_scoped_cards_from_one_image() -> None:
    _, _, detect_context, _, _ = _load_image_helpers(
        detector_text=_detector_json(signals=["MSY", "SYM"])
    )

    assert detect_context(
        [{"data": "both-abbreviations", "content_type": "image/png"}]
    ) == (
        "usage.guam.school.sym_signoff",
        "usage.guam.school.msy_greeting",
    )


def test_image_detector_excludes_cards_after_visual_none() -> None:
    _, _, detect_context, _, completions = _load_image_helpers()

    assert detect_context(
        [{"data": "unrelated-image", "content_type": "image/jpeg"}]
    ) == ()
    assert len(completions.calls) == 1


def test_image_detector_does_not_combine_signals_across_images() -> None:
    _, _, detect_context, _, completions = _load_image_helpers(
        detector_text=[_detector_json(), _detector_json()]
    )

    assert detect_context([
        {"data": "sym-only-image", "content_type": "image/png"},
        {"data": "guam-context-only-image", "content_type": "image/jpeg"},
    ]) == ()
    assert len(completions.calls) == 2
    first_content = completions.calls[0]["messages"][1]["content"]
    second_content = completions.calls[1]["messages"][1]["content"]
    assert len([part for part in first_content if part["type"] == "image_url"]) == 1
    assert len([part for part in second_content if part["type"] == "image_url"]) == 1
    assert first_content[1]["image_url"]["url"].endswith("sym-only-image")
    assert second_content[1]["image_url"]["url"].endswith("guam-context-only-image")


def test_image_detector_continues_after_one_attachment_provider_error() -> None:
    _, _, detect_context, _, completions = _load_image_helpers(
        detector_text=[RuntimeError("first image failed"), _detector_json(signals=["MSY"])]
    )

    assert detect_context([
        {"data": "failed-image", "content_type": "image/png"},
        {"data": "valid-scoped-msy-image", "content_type": "image/jpeg"},
    ]) == ("usage.guam.school.msy_greeting",)
    assert len(completions.calls) == 2


def test_image_detector_accumulates_scoped_matches_across_attachments() -> None:
    _, _, detect_context, _, completions = _load_image_helpers(
        detector_text=[
            _detector_json(signals=["MSY"]),
            _detector_json(signals=["SYM"]),
        ]
    )

    assert detect_context([
        {"data": "scoped-msy-image", "content_type": "image/png"},
        {"data": "scoped-sym-image", "content_type": "image/jpeg"},
    ]) == (
        "usage.guam.school.sym_signoff",
        "usage.guam.school.msy_greeting",
    )
    assert len(completions.calls) == 2


def test_image_detector_rejects_unexpected_provider_output() -> None:
    _, _, detect_context, _, completions = _load_image_helpers(
        detector_text="MSY because it means good morning"
    )

    assert detect_context(
        [{"data": "image", "content_type": "image/png"}]
    ) == ()
    assert len(completions.calls) == 2


def test_image_detector_rejects_empty_provider_output() -> None:
    _, _, detect_context, _, completions = _load_image_helpers(detector_text="")

    assert detect_context(
        [{"data": "image", "content_type": "image/png"}]
    ) == ()
    assert len(completions.calls) == 2


def test_image_detector_retries_one_malformed_envelope() -> None:
    _, _, _, detect_image_context, completions = _load_image_helpers(
        detector_text=[
            "not-json",
            _detector_json(lines=["Håfa adai! Håfa tatatmånu hao?"]),
        ]
    )

    context = detect_image_context([{"data": "image", "content_type": "image/png"}])

    assert context.visible_language_text == "Håfa adai! Håfa tatatmånu hao?"
    assert len(completions.calls) == 2


def test_image_detector_fails_closed_without_images_or_on_provider_error() -> None:
    _, _, detect_empty, _, empty_completions = _load_image_helpers(
        detector_text=_detector_json(signals=["MSY"])
    )
    assert detect_empty([]) == ()
    assert empty_completions.calls == []

    _, _, detect_error, _, error_completions = _load_image_helpers(
        detector_error=RuntimeError("provider unavailable")
    )
    assert detect_error([{"data": "image", "content_type": "image/webp"}]) == ()
    assert len(error_completions.calls) == 1


def test_image_detector_reports_school_signal_without_governed_cards() -> None:
    _, _, _, detect_image_context, completions = _load_image_helpers(
        detector_text=_detector_json(signals=["SCHOOL"])
    )

    assert detect_image_context(
        [{"data": "school-announcement", "content_type": "image/png"}]
    ) == ImageTranslationContext(school_announcement=True)
    detector_prompt = completions.calls[0]["messages"][1]["content"][0]["text"]
    assert "operational school" in detector_prompt


def test_image_detector_can_report_school_and_scoped_acronym_together() -> None:
    _, _, _, detect_image_context, _ = _load_image_helpers(
        detector_text=_detector_json(signals=["SCHOOL", "SYM"])
    )

    assert detect_image_context(
        [{"data": "hurao-school-sym", "content_type": "image/jpeg"}]
    ) == ImageTranslationContext(
        card_ids=("usage.guam.school.sym_signoff",),
        school_announcement=True,
    )


def test_image_detector_returns_privacy_safe_translation_text() -> None:
    _, _, _, detect_image_context, _ = _load_image_helpers(
        detector_text=_detector_json(
            signals=["MSY", "SYM"],
            lines=[
                "~garridokristenm +1 (671) 480-3595",
                "MSY! Kao modan isla pat kulot kåhet na polo på'go?",
                "MSY! Trabiha. Kada uttemo na Betnes kulot kåhet på'go",
                "Esta, SYM!",
            ],
        )
    )

    context = detect_image_context([{"data": "chat", "content_type": "image/png"}])

    assert context.card_ids == (
        "usage.guam.school.sym_signoff",
        "usage.guam.school.msy_greeting",
    )
    assert "+1 (671)" not in context.visible_language_text
    assert "Kao modan isla pat kulot kåhet" in context.visible_language_text
    assert "Trabiha" in context.visible_language_text


def test_low_confidence_image_text_is_not_used_for_retrieval() -> None:
    _, _, _, detect_image_context, _ = _load_image_helpers(
        detector_text=_detector_json(
            lines=["guessed unreadable text"],
            confidence="low",
        )
    )

    assert detect_image_context(
        [{"data": "blurry", "content_type": "image/png"}]
    ).visible_language_text == ""
