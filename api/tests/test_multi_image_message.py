import ast
from pathlib import Path
from types import SimpleNamespace


def _load_image_helpers(
    detector_text: str | list[str | Exception] = "NONE",
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
        "get_client_for_request": lambda **_kwargs: (client, "vision-model"),
        "logger": FakeLogger(),
    }
    exec(compile(isolated_module, str(source_path), "exec"), namespace)
    return (
        namespace["_normalize_image_inputs"],
        namespace["_build_current_user_message"],
        namespace["detect_image_context_card_ids"],
        completions,
    )


def test_build_current_user_message_includes_all_images_with_content_types():
    _, build_message, _, _ = _load_image_helpers()

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
    assert all(part["image_url"]["detail"] == "low" for part in message["content"][1:])


def test_normalize_image_inputs_preserves_legacy_single_image():
    normalize, _, _, _ = _load_image_helpers()

    assert normalize(image_base64="legacy-image", image_inputs=None) == [{
        "data": "legacy-image",
        "content_type": "image/jpeg",
    }]


def test_image_detector_includes_sym_card_only_after_scoped_visual_match() -> None:
    _, _, detect_context, completions = _load_image_helpers(detector_text="SYM")

    card_ids = detect_context([{"data": "image-data", "content_type": "image/png"}])

    assert card_ids == ("usage.guam.school.sym_signoff",)
    request = completions.calls[0]
    assert request["model"] == "vision-model"
    assert request["max_tokens"] == 64
    detector_prompt = request["messages"][1]["content"][0]["text"]
    assert "same image" in detector_prompt
    assert "Guam/Chamorro/Hurao" in detector_prompt
    assert "SYM and MSY" in detector_prompt
    assert "token by itself" in detector_prompt
    assert "same image" in request["messages"][0]["content"]
    assert "if none qualify, answer NONE" in request["messages"][0]["content"]
    assert request["messages"][1]["content"][1]["image_url"]["url"] == (
        "data:image/png;base64,image-data"
    )


def test_image_detector_includes_msy_card_after_scoped_visual_match() -> None:
    _, _, detect_context, completions = _load_image_helpers(detector_text="MSY")

    assert detect_context(
        [{"data": "hurao-msy-image", "content_type": "image/jpeg"}]
    ) == ("usage.guam.school.msy_greeting",)
    assert len(completions.calls) == 1


def test_image_detector_can_include_both_scoped_cards_from_one_image() -> None:
    _, _, detect_context, _ = _load_image_helpers(detector_text="`MSY`, `SYM`.")

    assert detect_context(
        [{"data": "both-abbreviations", "content_type": "image/png"}]
    ) == (
        "usage.guam.school.sym_signoff",
        "usage.guam.school.msy_greeting",
    )


def test_image_detector_excludes_cards_after_visual_none() -> None:
    _, _, detect_context, completions = _load_image_helpers(detector_text="NONE")

    assert detect_context(
        [{"data": "unrelated-image", "content_type": "image/jpeg"}]
    ) == ()
    assert len(completions.calls) == 1


def test_image_detector_does_not_combine_signals_across_images() -> None:
    _, _, detect_context, completions = _load_image_helpers(
        detector_text=["NONE", "NONE"]
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
    _, _, detect_context, completions = _load_image_helpers(
        detector_text=[RuntimeError("first image failed"), "MSY"]
    )

    assert detect_context([
        {"data": "failed-image", "content_type": "image/png"},
        {"data": "valid-scoped-msy-image", "content_type": "image/jpeg"},
    ]) == ("usage.guam.school.msy_greeting",)
    assert len(completions.calls) == 2


def test_image_detector_accumulates_scoped_matches_across_attachments() -> None:
    _, _, detect_context, completions = _load_image_helpers(
        detector_text=["MSY", "SYM"]
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
    _, _, detect_context, completions = _load_image_helpers(
        detector_text="MSY because it means good morning"
    )

    assert detect_context(
        [{"data": "image", "content_type": "image/png"}]
    ) == ()
    assert len(completions.calls) == 1


def test_image_detector_rejects_empty_provider_output() -> None:
    _, _, detect_context, completions = _load_image_helpers(detector_text="")

    assert detect_context(
        [{"data": "image", "content_type": "image/png"}]
    ) == ()
    assert len(completions.calls) == 1


def test_image_detector_fails_closed_without_images_or_on_provider_error() -> None:
    _, _, detect_empty, empty_completions = _load_image_helpers(detector_text="MSY")
    assert detect_empty([]) == ()
    assert empty_completions.calls == []

    _, _, detect_error, error_completions = _load_image_helpers(
        detector_error=RuntimeError("provider unavailable")
    )
    assert detect_error([{"data": "image", "content_type": "image/webp"}]) == ()
    assert len(error_completions.calls) == 1
