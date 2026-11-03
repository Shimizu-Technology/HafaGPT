"""Natural translation phrasing reaches the translation policy.

The positive prompts are anonymized from real tutor conversations that were
classified ``none`` and then received the single-word no-reference guard.
"""

import pytest

from src.rag.chamorro_rag import detect_query_type, extract_target_word
from src.rag.conversation_retrieval import (
    ConversationHistory,
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


def _recorded(*turns: tuple[str, str | None]) -> ConversationHistory:
    """Saved history whose user turns carry the task each was sent under."""

    history = ConversationHistory(_thread(*(text for text, _ in turns)))
    history.user_turn_intents = tuple(intent for _, intent in turns)
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


# Review round 1 -----------------------------------------------------------


@pytest.mark.parametrize(
    "query",
    [
        # App feedback, topic/opinion questions, and writing or coding tasks.
        "I want to say I love this app",
        "I'd like to say your translation was really helpful",
        "How should we say Chamorro culture has changed over time?",
        "How would we write Python code?",
        "How would we write the email about Python?",
        # Ambiguous cue without an utterance-like payload or context.
        "I want to say the store closes at five",
        "How should I say it?",
        # "day" is a real English word here, not a typo for "say".
        "How do you day trade?",
    ],
)
def test_ambiguous_natural_cues_stay_ordinary_chat(query: str) -> None:
    assert classify_translation_request(query) == "none"
    assert translation_direction(query) == ""


@pytest.mark.parametrize(
    "query",
    [
        "So I just want to say hahaha thank you, I'll be over in a bit",
        "Nice so I want to say something like hahaha thank you, I need to practice more",
        "I want to say see you tomorrow",
        "I want to say don't forget your lunch",
        "How should we say thank you in Chamorro?",
        "How should we say \"the store closes at five\"?",
    ],
)
def test_natural_cues_with_a_translation_signal_still_route(query: str) -> None:
    assert classify_translation_request(query) == "passage_to_chamorro"


@pytest.mark.parametrize(
    "history",
    [
        _thread("What is tree in Chamorro?"),
        _thread("So I just want to say hahaha thank you"),
    ],
)
def test_translation_thread_confirms_an_ambiguous_natural_cue(history) -> None:
    routed = resolve_translation_routing_query(
        "I want to say the store closes at five", history
    )

    assert routed == 'How do you say "the store closes at five" in Chamorro?'
    assert classify_translation_request(routed) == "passage_to_chamorro"


def test_translate_task_confirms_an_ambiguous_natural_cue() -> None:
    routed = resolve_translation_routing_query(
        "I want to say the store closes at five", [], "translate"
    )

    assert routed == 'How do you say "the store closes at five" in Chamorro?'


@pytest.mark.parametrize(
    "query",
    [
        "I want to say I love this app",
        "How should we say Chamorro culture has changed over time?",
        "How would we write Python code?",
    ],
)
def test_context_never_turns_excluded_cues_into_translation(query: str) -> None:
    history = _thread("What is tree in Chamorro?")

    assert resolve_translation_routing_query(query, history) == query


@pytest.mark.parametrize(
    "text",
    ["hafa adai", "buenas dias", "Si Yu'os ma'ase", "hanom", "guma", "hu guaiya hao"],
)
def test_selected_translate_task_reads_plain_chamorro_as_chamorro(text: str) -> None:
    routed = selected_task_translation_query(text)

    assert routed == f'What does "{text}" mean in English?'
    assert translation_direction(routed) == "to_english"


@pytest.mark.parametrize(
    "text",
    ["tree", "blue", "good morning", "I love you", "see you tomorrow at school", "no"],
)
def test_selected_translate_task_keeps_english_as_english(text: str) -> None:
    routed = selected_task_translation_query(text)

    assert routed == f'How do you say "{text}" in Chamorro?'
    assert translation_direction(routed) == "to_chamorro"


def test_undirected_translate_command_uses_headword_detection() -> None:
    assert translation_direction("Translate hanom") == "to_english"
    assert translation_direction("Translate tree") == "to_chamorro"


@pytest.mark.parametrize(
    ("previous", "current", "expected"),
    [
        ("hånom", "What about guma'?", 'What does "guma\'" mean in English?'),
        ("hanom", "And guma?", 'What does "guma" mean in English?'),
        ("tree", "What about blue?", 'How do you say "blue" in Chamorro?'),
        (
            "hahaha thank you, I'll be over in a bit",
            "What about see you soon?",
            'How do you say "see you soon" in Chamorro?',
        ),
    ],
)
def test_translate_task_follow_up_keeps_direction_and_extracts_target(
    previous: str, current: str, expected: str
) -> None:
    history = _recorded((previous, "translate"))

    routed = resolve_translation_routing_query(current, history, "translate")

    assert routed == expected
    assert build_contextual_retrieval_query(routed, history) == routed


def test_translate_task_follow_up_chain_keeps_first_direction() -> None:
    history = _recorded(("hånom", "translate"), ("What about guma'?", "translate"))

    assert resolve_translation_routing_query("How about tasi?", history, "translate") == (
        'What does "tasi" mean in English?'
    )


def test_plain_earlier_turn_only_sets_a_thread_when_it_was_sent_under_translate() -> None:
    assert resolve_translation_routing_query("What about guma'?", _thread("hånom")) == (
        "What about guma'?"
    )
    assert resolve_translation_routing_query(
        "What about guma'?", _recorded(("hånom", "explain"))
    ) == "What about guma'?"
    # The earlier turn was translated, so the thread is real under any task.
    assert resolve_translation_routing_query(
        "What about guma'?", _recorded(("hånom", "translate")), "explain"
    ) == 'What does "guma\'" mean in English?'


def test_assistant_answers_never_supply_translation_state() -> None:
    history = [
        {"role": "user", "content": "Tell me about Guam"},
        {"role": "assistant", "content": 'How do you say "tree" in Chamorro? Tronkon håyu.'},
    ]

    assert resolve_translation_routing_query("What about blue?", history) == (
        "What about blue?"
    )

    # Under the Translate task the user's own earlier text sets the direction,
    # even when the assistant's answer reads like a request the other way.
    translate_history = ConversationHistory([
        {"role": "user", "content": "tree"},
        {"role": "assistant", "content": 'What does "håyu" mean in English?'},
    ])
    translate_history.user_turn_intents = ("translate",)
    assert resolve_translation_routing_query(
        "What about blue?", translate_history, "translate"
    ) == 'How do you say "blue" in Chamorro?'


# Review round 2, finding 1: the current task never re-reads earlier turns.


def test_explain_then_translate_does_not_reinterpret_the_explanation() -> None:
    # The reviewer's repro: the explanation is not Chamorro input to translate.
    for history in (
        _recorded(("Explain the word hånom", "explain")),
        _thread("Explain the word hånom"),  # Saved before tasks were recorded.
    ):
        routed = resolve_translation_routing_query("What about rain?", history, "translate")

        assert routed == 'How do you say "rain" in Chamorro?'
        assert translation_direction(routed) == "to_chamorro"
        assert build_contextual_retrieval_query(routed, history) == routed


def test_explain_then_translate_payload_uses_its_own_language() -> None:
    history = _recorded(("Explain the word hånom", "explain"))

    assert resolve_translation_routing_query("What about guma'?", history, "translate") == (
        'What does "guma\'" mean in English?'
    )
    assert resolve_translation_routing_query("rain", history, "translate") == (
        'How do you say "rain" in Chamorro?'
    )


def test_explanation_turn_ends_an_earlier_translation_thread() -> None:
    history = _recorded(
        ("What does hånom mean?", None),
        ("Explain how plurals work", "explain"),
    )

    assert resolve_translation_routing_query("What about rain?", history, "translate") == (
        'How do you say "rain" in Chamorro?'
    )
    assert resolve_translation_routing_query("What about rain?", history) == "What about rain?"


def test_translate_then_explain_keeps_the_real_translation_thread() -> None:
    history = _recorded(("hånom", "translate"))

    assert resolve_translation_routing_query("What about guma'?", history, "explain") == (
        'What does "guma\'" mean in English?'
    )
    question = "Why does it start with h?"
    assert resolve_translation_routing_query(question, history, "explain") == question


def test_practice_then_translate_does_not_treat_practice_answers_as_requests() -> None:
    history = _recorded(("Let's practice greetings", "practice"), ("hafa adai", "practice"))

    # Nothing was translated, so "that" has nothing to refer back to.
    assert resolve_translation_routing_query("What about that?", history, "translate") == (
        "What about that?"
    )
    assert resolve_translation_routing_query("What about rain?", history, "translate") == (
        'How do you say "rain" in Chamorro?'
    )


def test_unaligned_recorded_tasks_count_as_unknown() -> None:
    history = ConversationHistory(_thread("hånom"))
    history.user_turn_intents = ("translate", "translate")

    assert resolve_translation_routing_query("What about guma'?", history) == "What about guma'?"


# Review round 2, finding 2: history replays the live resolver turn by turn.


STORE = 'How do you say "the store closes at five" in Chamorro?'


@pytest.mark.parametrize(
    "history",
    [
        _thread("What is tree in Chamorro?", "I want to say the store closes at five"),
        _recorded(
            ("What is tree in Chamorro?", None),
            ("I want to say the store closes at five", None),
        ),
        _recorded(("I want to say the store closes at five", "translate")),
        _recorded(
            ("What is tree in Chamorro?", "translate"),
            ("I want to say the store closes at five", "translate"),
        ),
    ],
)
@pytest.mark.parametrize("intent", [None, "translate"])
def test_context_confirmed_natural_request_supports_follow_ups(history, intent) -> None:
    assert resolve_translation_routing_query("What about that?", history, intent) == STORE
    assert resolve_translation_routing_query("and the second part?", history, intent) == STORE
    assert resolve_translation_routing_query("what about rain?", history, intent) == (
        'How do you say "rain" in Chamorro?'
    )
    assert build_contextual_retrieval_query(STORE, history) == STORE


def test_replayed_history_matches_live_routing_turn_by_turn() -> None:
    turns = [
        ("What is tree in Chamorro?", None),
        ("I want to say the store closes at five", None),
        ("and the second part?", None),
        ("what about rain?", "translate"),
        ("What about that?", "explain"),
    ]
    expected = [
        "What is tree in Chamorro?",
        STORE,
        STORE,
        'How do you say "rain" in Chamorro?',
        'How do you say "rain" in Chamorro?',
    ]
    for index, (text, intent) in enumerate(turns):
        assert resolve_translation_routing_query(text, _recorded(*turns[:index]), intent) == (
            expected[index]
        )


def test_part_reference_without_a_thread_is_unchanged() -> None:
    assert resolve_translation_routing_query("and the second part?", []) == (
        "and the second part?"
    )
    assert resolve_translation_routing_query("And the rest?", [], "translate") == "And the rest?"
