import ast
from pathlib import Path

from src.rag.translation_policy import classify_translation_request


def _load_should_use_web_search():
    source_path = Path(__file__).resolve().parents[1] / "api" / "chatbot_service.py"
    module = ast.parse(source_path.read_text(encoding="utf-8"))
    node = next(
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name == "should_use_web_search"
    )
    namespace: dict[str, object] = {
        "classify_translation_request": classify_translation_request,
    }
    exec(
        compile(ast.Module(body=[node], type_ignores=[]), str(source_path), "exec"),
        namespace,
    )
    return namespace["should_use_web_search"]


def test_translation_follow_up_with_today_stays_off_web() -> None:
    should_use_web_search = _load_should_use_web_search()

    assert should_use_web_search("So what color is it today? Or is it island?") == (
        False,
        None,
    )


def test_typed_translation_with_today_stays_off_web() -> None:
    should_use_web_search = _load_should_use_web_search()

    assert should_use_web_search(
        "Translate this: kulot kåhet na polo på'go"
    ) == (False, None)


def test_actual_current_information_requests_still_use_web() -> None:
    should_use_web_search = _load_should_use_web_search()

    assert should_use_web_search("What's the weather in Guam today?") == (
        True,
        "general",
    )
    assert should_use_web_search("What's the latest news in Guam today?") == (
        True,
        "news",
    )
    assert should_use_web_search("Please look this up online") == (True, "general")
    assert should_use_web_search("What is the current situation in Guam?") == (
        True,
        "news",
    )
    assert should_use_web_search("Recent developments in Guam") == (True, "news")


def test_translation_intent_wins_when_passage_contains_current_event_words() -> None:
    should_use_web_search = _load_should_use_web_search()

    assert should_use_web_search(
        "Translate this to Chamorro: The current schedule was recently updated."
    ) == (False, None)
    assert should_use_web_search("How do you say current in Chamorro?") == (False, None)
