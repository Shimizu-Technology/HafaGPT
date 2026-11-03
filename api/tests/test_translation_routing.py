"""Natural translation phrasing reaches the translation policy.

The positive prompts are anonymized from real tutor conversations that were
classified ``none`` and then received the single-word no-reference guard.
"""

import pytest

from src.rag.chamorro_rag import detect_query_type, extract_target_word
from src.rag.conversation_retrieval import (
    build_contextual_retrieval_query,
    resolve_translation_routing_query,
)
from src.rag.query_routing import should_use_rag
from src.rag.translation_policy import (
    classify_translation_request,
    extract_short_lexical_target,
    extract_translation_payload,
    selected_task_translation_query,
    translation_direction,
)


@pytest.mark.parametrize(
    ("query", "expected_intent", "expected_payload"),
    [
        (
            "So I just want to say hahaha thank you, I'll be over in a bit",
            "passage_to_chamorro",
            "hahaha thank you, I'll be over in a bit",
        ),
        (
            "Nice so I want to say something like hahaha thank you, see you soon",
            "passage_to_chamorro",
            "hahaha thank you, see you soon",
        ),
        (
            "How would we write don't cut down all the trees",
            "passage_to_chamorro",
            "don't cut down all the trees",
        ),
        # "day" is a phone typo for "say".
        ("How would we day help others?", "passage_to_chamorro", "help others"),
        ("Got it so how would I say - haha thank you", "passage_to_chamorro", "haha thank you"),
        ("I'd like to say happy birthday", "passage_to_chamorro", "happy birthday"),
        ("How do I put good morning in Chamorro?", "passage_to_chamorro", "good morning"),
        ("How do we say thank you in Chamorro?", "passage_to_chamorro", "thank you"),
        ("What's the Chamorro for tree?", "single_word_lookup", "tree"),
        ("What's tree in Chamorro?", "single_word_lookup", "tree"),
        ("what's the Chamorro word for banana tree", "single_word_lookup", "banana tree"),
        ("I want to say thanks", "single_word_lookup", "thanks"),
    ],
)
def test_natural_to_chamorro_phrasing_is_a_translation(
    query: str, expected_intent: str, expected_payload: str
) -> None:
    assert classify_translation_request(query) == expected_intent
    assert extract_translation_payload(query) == expected_payload
    assert translation_direction(query) == "to_chamorro"
    assert should_use_rag(query) == (True, "full")


@pytest.mark.parametrize(
    "query",
    [
        "What's the weather?",
        "What is the history of Guam?",
        "Tell me about Chamorro culture",
        "What does this tradition mean to Chamorro culture?",
        "How do I write a good essay?",
        "How do I put the app in dark mode?",
        "I want to say something to my grandma but I don't know where to start",
        "What about tree",
        "How about blue?",
        "thank you",
        "I was going to say that earlier",
    ],
)
def test_ordinary_questions_stay_out_of_translation_policy(query: str) -> None:
    assert classify_translation_request(query) == "none"


def test_typo_phrase_gets_exact_dictionary_lane() -> None:
    query = "How would we day help others?"

    assert detect_query_type(query) == "educational"
    assert extract_short_lexical_target(query) == "help others"


def test_natural_single_word_lookup_reaches_dictionary_target() -> None:
    assert detect_query_type("What's the Chamorro for tree?") == "lookup"
    assert extract_target_word("What's the Chamorro for tree?") == "tree"
    assert extract_target_word("I want to say thanks") == "thanks"


def test_explicit_direction_and_quoted_commands_still_win() -> None:
    assert classify_translation_request("How do you say håfa adai in English?") == (
        "passage_to_english"
    )
    assert classify_translation_request(
        "I want to say “Translate this sentence to English”"
    ) == "passage_to_chamorro"
    assert translation_direction("What does hånom mean?") == "to_english"


def test_deictic_wrapper_with_all_of_this_selects_passage() -> None:
    query = "What does all of this say?\n\nHåfa adai, buenas dias"

    assert classify_translation_request(query) == "passage_to_english"
    assert extract_translation_payload(query) == "Håfa adai, buenas dias"


def _thread(*user_messages: str) -> list[dict[str, str]]:
    history: list[dict[str, str]] = []
    for content in user_messages:
        history.append({"role": "user", "content": content})
        history.append({"role": "assistant", "content": "Earlier answer."})
    return history


@pytest.mark.parametrize(
    ("previous", "current", "expected"),
    [
        ("What is flower in Chamorro?", "What about tree", 'How do you say "tree" in Chamorro?'),
        ("How do you say hi?", "How about blue?", 'How do you say "blue" in Chamorro?'),
        (
            "So I just want to say hahaha thank you",
            "what about see you soon",
            'How do you say "see you soon" in Chamorro?',
        ),
        ("What does hånom mean?", "What about guma'?", 'What does "guma\'" mean in English?'),
    ],
)
def test_short_follow_up_inherits_previous_lookup(
    previous: str, current: str, expected: str
) -> None:
    history = _thread(previous)

    routed = resolve_translation_routing_query(current, history)

    assert routed == expected
    assert classify_translation_request(routed) == "single_word_lookup" or (
        classify_translation_request(routed).startswith("passage_")
    )
    assert build_contextual_retrieval_query(routed, history) == routed


def test_follow_up_chain_keeps_original_direction() -> None:
    history = _thread("What is flower in Chamorro?", "What about tree")

    assert resolve_translation_routing_query("How about banana?", history) == (
        'How do you say "banana" in Chamorro?'
    )


def test_follow_up_without_translation_thread_is_unchanged() -> None:
    history = _thread("Tell me about Guam history")

    assert resolve_translation_routing_query("What about tree", history) == "What about tree"
    assert resolve_translation_routing_query("What about tree", []) == "What about tree"


def test_long_what_about_question_is_not_a_replacement_word() -> None:
    history = _thread("What is flower in Chamorro?")
    question = "What about the fiesta schedule for this weekend in the village?"

    assert resolve_translation_routing_query(question, history) == question


def test_selected_translate_task_routes_plain_text() -> None:
    routed = resolve_translation_routing_query(
        "hahaha thank you, I'll be over in a bit", [], "translate"
    )

    assert routed == 'How do you say "hahaha thank you, I\'ll be over in a bit" in Chamorro?'
    assert classify_translation_request(routed) == "passage_to_chamorro"


def test_selected_translate_task_uses_chamorro_direction_for_chamorro_text() -> None:
    assert selected_task_translation_query("Håfa adai") == (
        'What does "Håfa adai" mean in English?'
    )
    multi_line = "Håfa adai\nSi Yu'os ma'åse'"
    assert selected_task_translation_query(multi_line) == (
        "Translate this to English:\n\n" + multi_line
    )
    assert classify_translation_request(selected_task_translation_query(multi_line)) == (
        "passage_to_english"
    )


def test_selected_translate_task_single_word_is_lookup() -> None:
    routed = resolve_translation_routing_query("tree", [], "translate")

    assert classify_translation_request(routed) == "single_word_lookup"
    assert extract_target_word(routed) == "tree"


def test_other_tutor_tasks_do_not_force_translation() -> None:
    message = "Can you quiz me on colors?"

    assert resolve_translation_routing_query(message, [], "practice") == message
    assert resolve_translation_routing_query(message, [], "explain") == message
    assert resolve_translation_routing_query(message, [], None) == message


def test_recognized_request_is_never_rewritten() -> None:
    message = "How would we write don't cut down all the trees"

    assert resolve_translation_routing_query(message, _thread("What is tree in Chamorro?")) == message
