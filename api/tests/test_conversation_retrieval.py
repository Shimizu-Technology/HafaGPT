from api.canonical_context import get_canonical_tutor_context
from src.rag.conversation_retrieval import _clean_target, build_contextual_retrieval_query


def test_ambiguous_language_follow_up_uses_latest_user_context_only() -> None:
    query = build_contextual_retrieval_query(
        "Tell me about the language",
        [
            {"role": "user", "content": "What's the weather like in Guam right now?"},
            {"role": "assistant", "content": "You are studying something."},
        ],
    )

    assert query == "Tell me about the language in Guam"
    assert "studying" not in query


def test_explicit_query_is_not_rewritten() -> None:
    message = "Is CHamoru an Indigenous language of Guam?"
    assert build_contextual_retrieval_query(
        message,
        [{"role": "user", "content": "Tell me about Saipan"}],
    ) == message


def test_multimodal_user_text_can_supply_context() -> None:
    query = build_contextual_retrieval_query(
        "What about that language?",
        [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "This is a message from a Guam school"},
                    {"type": "image_url", "image_url": {"url": "https://example.com/a.jpg"}},
                ],
            }
        ],
    )
    assert query == "What about the language in Guam?"


def test_language_follow_up_does_not_repeat_prior_translation_target() -> None:
    query = build_contextual_retrieval_query(
        "What about that language?",
        [{"role": "user", "content": "How do you say flower in Chamorro?"}],
    )

    assert query == "What about the language in CHamoru?"


def test_target_cleaning_preserves_terminal_glottal_stops() -> None:
    assert _clean_target("gofli’e’?") == "gofli’e’"
    assert _clean_target("aga'?") == "aga'"
    assert _clean_target("‘ga’lågu’?") == "ga’lågu"
    assert _clean_target('"flower?"') == "flower"
    assert _clean_target("“tree!”") == "tree"


def test_punctuated_same_target_follow_up_keeps_translation_thread() -> None:
    query = build_contextual_retrieval_query(
        "What about that?",
        [{"role": "user", "content": "How do you say flower in Chamorro?"}],
    )

    assert query == 'How do you say "flower" in Chamorro?'


def test_translation_follow_up_replaces_target_and_keeps_direction() -> None:
    query = build_contextual_retrieval_query(
        "What about tree?",
        [
            {"role": "user", "content": "How do you say flower?"},
            {"role": "assistant", "content": "An earlier answer must not drive retrieval."},
        ],
    )

    assert query == 'How do you say "tree" in Chamorro?'


def test_multiword_translation_follow_up_uses_exact_phrase() -> None:
    query = build_contextual_retrieval_query(
        "How about banana tree?",
        [{"role": "user", "content": "How do you say flower in Chamorro?"}],
    )

    assert query == 'How do you say "banana tree" in Chamorro?'


def test_possible_answers_follow_up_keeps_latest_user_target() -> None:
    query = build_contextual_retrieval_query(
        "Give me some possible answers of what it could be",
        [
            {"role": "user", "content": "How do you say flower?"},
            {"role": "assistant", "content": "floris"},
            {"role": "user", "content": "What about tree?"},
            {"role": "assistant", "content": "I do not know."},
        ],
    )

    assert query == 'How do you say "tree" in Chamorro?'


def test_unrelated_topic_breaks_stale_translation_thread() -> None:
    message = "What about tree?"
    query = build_contextual_retrieval_query(
        message,
        [
            {"role": "user", "content": "How do you say flower?"},
            {"role": "user", "content": "Tell me about Guam history."},
        ],
    )

    assert query == message


def test_chamorro_to_english_follow_up_keeps_direction() -> None:
    query = build_contextual_retrieval_query(
        "And hånom?",
        [{"role": "user", "content": "What does ga'lågu mean?"}],
    )

    assert query == 'What does "hånom" mean in English?'


def test_supplied_mobile_translation_sequence_keeps_each_lookup_target() -> None:
    history = [
        {"role": "user", "content": "How do you say flower"},
        {"role": "assistant", "content": "floris"},
    ]

    tree_query = build_contextual_retrieval_query("What about tree", history)
    assert tree_query == 'How do you say "tree" in Chamorro?'

    history.extend(
        [
            {"role": "user", "content": "What about tree"},
            {"role": "assistant", "content": "I do not have a verified translation."},
        ]
    )
    alternatives_query = build_contextual_retrieval_query(
        "Give me some possible answers of what it could be",
        history,
    )
    assert alternatives_query == tree_query

    history.extend(
        [
            {"role": "user", "content": "Give me some possible answers of what it could be"},
            {"role": "assistant", "content": "I do not want to guess."},
        ]
    )
    banana_tree_query = build_contextual_retrieval_query(
        "How about banana tree",
        history,
    )
    assert banana_tree_query == 'How do you say "banana tree" in Chamorro?'

    history.extend(
        [
            {"role": "user", "content": "How about banana tree"},
            {"role": "assistant", "content": "chotda"},
        ]
    )
    banana_query = build_contextual_retrieval_query("What about banana?", history)
    assert banana_query == 'How do you say "banana" in Chamorro?'


def test_mobile_basic_vocabulary_thread_preserves_direction_and_corrections() -> None:
    history = [
        {"role": "user", "content": "How would I say hi"},
        {"role": "assistant", "content": "Håfa adai"},
    ]

    banana_query = build_contextual_retrieval_query("How about banana", history)
    assert banana_query == 'How do you say "banana" in Chamorro?'

    history.extend(
        [
            {"role": "user", "content": "How about banana"},
            {"role": "assistant", "content": "chotdan"},
        ]
    )
    correction_query = build_contextual_retrieval_query(
        "I thought it was aga?",
        history,
    )
    assert correction_query == (
        'How do you say "banana" in Chamorro? '
        'Candidate spelling to verify: "aga".'
    )

    history.extend(
        [
            {"role": "user", "content": "I thought it was aga?"},
            {"role": "assistant", "content": "aga'"},
        ]
    )
    blue_query = build_contextual_retrieval_query("How about blue?", history)
    assert blue_query == 'How do you say "blue" in Chamorro?'


def test_correction_query_keeps_exact_candidate_and_original_gloss_evidence() -> None:
    history = [
        {"role": "user", "content": "How would I say hi"},
        {"role": "assistant", "content": "Håfa adai"},
        {"role": "user", "content": "How about banana"},
        {"role": "assistant", "content": "chotdan"},
    ]

    query = build_contextual_retrieval_query("I thought it was aga?", history)
    context, _sources = get_canonical_tutor_context(query)

    assert "Exact dictionary headword: aga" in context
    assert "Marianas crow" in context
    assert "Exact English dictionary gloss: banana" in context
    assert "Chamorro headword: aga'" in context
