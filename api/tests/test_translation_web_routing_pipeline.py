"""Both chat paths decide web search from the resolved translation request.

A word typed under the Translate task ("rain") or a short follow-up in a lookup
thread ("What about rain?") is a translation even though its original text is
not. These run the real chat functions with the real routing helpers and fake
providers, so a regression in either path shows up here.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from src.rag.conversation_retrieval import resolve_translation_routing_query
from src.rag.translation_policy import classify_translation_request
from test_atomic_regeneration import deferred_stream_namespace
from test_saved_reply_integrity import load_function


def _thread(*user_messages: str) -> list[dict[str, str]]:
    history: list[dict[str, str]] = []
    for content in user_messages:
        history.append({"role": "user", "content": content})
        history.append({"role": "assistant", "content": "Earlier answer about the weather."})
    return history


def _pipeline_namespace(history: list[dict[str, str]]):
    namespace = deferred_stream_namespace("success")
    rag_calls: list[dict] = []

    def get_rag_context(*args, **kwargs):
        rag_calls.append({"args": args, **kwargs})
        return "", []

    namespace.update(
        {
            "classify_translation_request": classify_translation_request,
            "resolve_translation_routing_query": resolve_translation_routing_query,
            "web_search": Mock(return_value={"success": True, "results": ["unrelated"]}),
            "format_search_results": lambda result: "WEB RESULTS",
            "get_rag_context": get_rag_context,
            "get_conversation_history": lambda conversation_id: history,
            "_extract_non_stream_response_text": (
                lambda response: response.choices[0].message.content
            ),
        }
    )
    load_function("should_use_web_search", namespace)
    return namespace, rag_calls


def _run(path: str, message: str, history: list[dict[str, str]], intent: str | None):
    namespace, rag_calls = _pipeline_namespace(history)
    if path == "stream":
        stream = load_function("get_chatbot_response_stream", namespace)
        list(
            stream(
                message,
                conversation_id="conv-a",
                pending_id="pending_abcdefgh",
                history_override=history,
                persist=False,
                intent=intent,
            )
        )
    else:
        namespace["get_client_for_request"] = lambda **kwargs: (
            SimpleNamespace(
                chat=SimpleNamespace(
                    completions=SimpleNamespace(
                        create=lambda **kwargs: SimpleNamespace(
                            choices=[
                                SimpleNamespace(
                                    finish_reason="stop",
                                    message=SimpleNamespace(content="Reply"),
                                )
                            ]
                        )
                    )
                )
            ),
            "fake",
        )
        respond = load_function("get_chatbot_response", namespace)
        respond(message, conversation_id="conv-a", pending_id="pending_abcdefgh", intent=intent)
    assert len(rag_calls) == 1
    return namespace["web_search"], rag_calls[0]


@pytest.mark.parametrize("path", ["stream", "nonstream"])
@pytest.mark.parametrize(
    ("message", "history", "intent"),
    [
        # Selected Translate task: the text itself is the payload.
        ("rain", [], "translate"),
        ("what's the weather like today", [], "translate"),
        ("let's make red rice for the party", [], "translate"),
        ("the latest news from home", [], "translate"),
        # Inherited from a user-authored lookup thread.
        ("What about rain?", _thread("What is flower in Chamorro?"), None),
        ("How about recipe?", _thread("How do you say hi?"), None),
        ("What about news?", _thread("What is tree in Chamorro?"), None),
        # Inherited under the Translate task from a plain earlier word.
        ("What about storm?", _thread("tree"), "translate"),
    ],
)
def test_resolved_translation_never_uses_web_search(path, message, history, intent):
    web_search, rag_call = _run(path, message, history, intent)

    web_search.assert_not_called()
    assert rag_call["include_vector"] is True
    assert classify_translation_request(rag_call["retrieval_input"]) != "none"


@pytest.mark.parametrize("path", ["stream", "nonstream"])
def test_real_current_information_request_still_uses_web_search(path):
    web_search, rag_call = _run(path, "What's the weather in Guam today?", [], None)

    web_search.assert_called_once()
    assert rag_call["include_vector"] is False
