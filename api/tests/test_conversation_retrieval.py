from src.rag.conversation_retrieval import build_contextual_retrieval_query


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
