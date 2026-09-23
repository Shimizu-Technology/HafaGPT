from src.utils.token_manager import compact_conversation_history, count_message_tokens


def test_eleven_turn_homework_thread_keeps_opening_photos_and_recent_question():
    photos = [
        {"type": "image_url", "image_url": {"url": f"https://example.com/page-{i}.jpg", "detail": "low"}}
        for i in range(5)
    ]
    messages = [
        {"role": "user", "content": [
            {"type": "text", "text": "These are my daughter's homework pages."},
            *photos,
        ]},
        {"role": "assistant", "content": "Initial page explanation. " * 100},
    ]
    for index in range(1, 11):
        messages.extend([
            {"role": "user", "content": f"Question about page {index}"},
            {"role": "assistant", "content": f"Page {index} explanation. " * 100},
        ])

    compacted = compact_conversation_history(messages, max_tokens=4000)

    assert count_message_tokens(compacted) <= 4000
    assert compacted[0]["role"] == "user"
    assert len([part for part in compacted[0]["content"] if part["type"] == "image_url"]) == 5
    assert compacted[-2]["content"] == "Question about page 10"
    assert compacted[-1]["content"] == messages[-1]["content"]


def test_compaction_recalls_named_older_page_when_thread_is_too_long():
    messages = [
        {"role": "user", "content": "Help with this worksheet packet"},
        {"role": "assistant", "content": "Opening explanation. " * 30},
    ]
    for page in range(50, 59):
        messages.extend([
            {"role": "user", "content": f"Please explain page {page}"},
            {"role": "assistant", "content": f"Details from page {page}. " * 40},
        ])
    messages.extend([
        {"role": "user", "content": "A separate recent question"},
        {"role": "assistant", "content": "Recent answer"},
    ])

    compacted = compact_conversation_history(
        messages, max_tokens=700, current_message="What did page 53 say?"
    )

    assert count_message_tokens(compacted) <= 700
    assert any(
        message["role"] == "user" and message["content"] == "Please explain page 53"
        for message in compacted
    )
    assert any(
        message["role"] == "system" and "earlier conversation turns were omitted" in message["content"]
        for message in compacted
    )


def test_long_recent_answer_does_not_displace_its_user_question():
    messages = [
        {"role": "user", "content": "Opening question"},
        {"role": "assistant", "content": "Opening answer. " * 100},
        {"role": "user", "content": "What does page 54 say?"},
        {"role": "assistant", "content": "Long answer. " * 1000},
    ]

    compacted = compact_conversation_history(messages, max_tokens=1000)

    assert count_message_tokens(compacted) <= 1000
    assert any(
        message["role"] == "user" and message["content"] == "What does page 54 say?"
        for message in compacted
    )


def test_dropped_recent_turn_is_reported_as_omitted():
    def photo_turn(label):
        return {"role": "user", "content": [
            {"type": "text", "text": label},
            *[
                {"type": "image_url", "image_url": {"url": f"https://example.com/{label}-{index}.png", "detail": "low"}}
                for index in range(5)
            ],
        ]}

    compacted = compact_conversation_history(
        [photo_turn("first"), photo_turn("second")], max_tokens=700
    )

    assert count_message_tokens(compacted) <= 700
    assert any(
        message["role"] == "system" and "earlier conversation turns were omitted" in message["content"]
        for message in compacted
    )
    assert compacted[-1]["content"][0]["text"] == "second"
