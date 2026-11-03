"""Both chat paths decide web search from the resolved translation request.

A word typed under the Translate task ("rain") or a short follow-up in a lookup
thread ("What about rain?") is a translation even though its original text is
not. These run the real chat functions with the real routing helpers and fake
providers, so a regression in either path shows up here.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from src.rag.conversation_retrieval import (
    ConversationHistory,
    resolve_translation_routing_query,
)
from src.rag.translation_policy import classify_translation_request
from test_atomic_regeneration import deferred_stream_namespace
from test_saved_reply_integrity import load_function


def _thread(*user_messages: str) -> list[dict[str, str]]:
    history: list[dict[str, str]] = []
    for content in user_messages:
        history.append({"role": "user", "content": content})
        history.append({"role": "assistant", "content": "Earlier answer about the weather."})
    return history


def _recorded(*turns: tuple[str, str | None]) -> ConversationHistory:
    """Saved history whose user turns carry the task each was sent under."""

    history = ConversationHistory(_thread(*(text for text, _ in turns)))
    history.user_turn_intents = tuple(intent for _, intent in turns)
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
    return namespace, rag_calls[0]


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
    namespace, rag_call = _run(path, message, history, intent)

    namespace["web_search"].assert_not_called()
    assert rag_call["include_vector"] is True
    assert classify_translation_request(rag_call["retrieval_input"]) != "none"


@pytest.mark.parametrize("path", ["stream", "nonstream"])
def test_real_current_information_request_still_uses_web_search(path):
    namespace, rag_call = _run(path, "What's the weather in Guam today?", [], None)

    namespace["web_search"].assert_called_once()
    assert rag_call["include_vector"] is False


STORE = 'How do you say "the store closes at five" in Chamorro?'
NATURAL_THREAD = ("What is tree in Chamorro?", "I want to say the store closes at five")


@pytest.mark.parametrize("path", ["stream", "nonstream"])
@pytest.mark.parametrize(
    ("message", "history", "intent", "expected"),
    [
        # Review round 2, finding 1: switching tasks never re-reads earlier turns.
        (
            "What about rain?",
            _recorded(("Explain the word hånom", "explain")),
            "translate",
            'How do you say "rain" in Chamorro?',
        ),
        (
            "What about guma'?",
            _recorded(("hånom", "translate")),
            "explain",
            'What does "guma\'" mean in English?',
        ),
        (
            "What about rain?",
            _recorded(("Let's practice greetings", "practice"), ("hafa adai", "practice")),
            "translate",
            'How do you say "rain" in Chamorro?',
        ),
        # Review round 2, finding 2: a context-confirmed natural request opens
        # a thread that later follow-ups can use, with or without a task.
        ("What about that?", _thread(*NATURAL_THREAD), None, STORE),
        ("and the second part?", _thread(*NATURAL_THREAD), None, STORE),
        ("what about rain?", _thread(*NATURAL_THREAD), None, 'How do you say "rain" in Chamorro?'),
        (
            "What about that?",
            _recorded((NATURAL_THREAD[1], "translate")),
            "translate",
            STORE,
        ),
        (
            "and the second part?",
            _recorded((NATURAL_THREAD[1], "translate")),
            "translate",
            STORE,
        ),
        (
            "what about rain?",
            _recorded((NATURAL_THREAD[1], "translate")),
            "translate",
            'How do you say "rain" in Chamorro?',
        ),
    ],
)
def test_mixed_task_history_routes_from_each_turns_own_task(
    path, message, history, intent, expected
):
    namespace, rag_call = _run(path, message, history, intent)

    namespace["web_search"].assert_not_called()
    assert rag_call["include_vector"] is True
    assert rag_call["retrieval_input"] == expected


@pytest.mark.parametrize("path", ["stream", "nonstream"])
def test_practice_answer_is_not_translated_after_switching_to_translate(path):
    history = _recorded(("Let's practice greetings", "practice"), ("hafa adai", "practice"))

    _, rag_call = _run(path, "What about that?", history, "translate")

    assert classify_translation_request(rag_call["retrieval_input"]) == "none"


def test_saved_turn_records_the_task_it_was_sent_under():
    namespace, _ = _run("nonstream", "rain", [], "translate")

    log_conversation = namespace["log_conversation"]
    log_conversation.assert_called_once()
    assert log_conversation.call_args.kwargs["tutor_intent"] == "translate"
