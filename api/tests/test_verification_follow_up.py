""""Are you sure?" re-checks the previous answer's terms against the references.

A follow-up such as "Are you sure about these words?" names none of the words,
so retrieval on its own text found nothing and the tutor retracted terms it
had cited correctly one turn earlier. These tests cover detection, term
extraction from the previous answer, the exact lookups, and both chat paths
with the real retrieval and canonical lookup code.
"""

import json
import logging
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from api.source_citations import format_source_citations
from api.canonical_context import get_canonical_tutor_context
from api.verification_evidence import (
    MAX_VERIFICATION_LOOKUPS,
    verification_term_context,
)
from src.rag.conversation_retrieval import (
    ConversationHistory,
    build_contextual_retrieval_query,
    resolve_translation_routing_query,
    resolve_verification_follow_up,
)
from src.rag.query_classification import detect_query_type
from src.rag.query_routing import should_use_rag
from src.rag.retrieval_observability import build_retrieval_event
from src.rag.verification_follow_up import (
    MAX_VERIFICATION_TERMS,
    VERIFICATION_FOLLOW_UP_GUIDANCE,
    extract_answer_terms,
    is_verification_follow_up,
)
from src.utils.token_manager import count_tokens, truncate_text
from test_atomic_regeneration import deferred_stream_namespace
from test_saved_reply_integrity import load_function


TREE = ("What is tree in Chamorro?", "tronkon håyu [dictionary_data/chamoru_info_dictionary.json]")
BLUE = ("What is blue in Chamorro?", "asut [dictionary_data/chamorro_english_dictionary_TOD.json]")
HAPPY = ("What is happy in Chamorro?", "magof [dictionary_data/chamorro_english_dictionary_TOD.json]")
THANKS = ("How do I thank my manager?", "Si Yu'os Ma'åse' [canonical vocabulary ledger]")


def _exchange(*pairs: tuple[str, str]) -> list[dict[str, str]]:
    history = []
    for question, answer in pairs:
        history.append({"role": "user", "content": question})
        history.append({"role": "assistant", "content": answer})
    return history


@pytest.mark.parametrize(
    "message",
    [
        "Are you sure about these words?",
        "You're sure about all of these words?",
        "youre sure about all of these words",
        "Are you sure?",
        "are u sure",
        "r u sure abt thes words??",
        "you sure?",
        "Are you shure about that?",
        "Are you certain that is correct?",
        "Hmm, are you sure about the spelling?",
        "How sure are you?",
        "is that right?",
        "Is this correct?",
        "Are these words correct?",
        "Is that a real word?",
        "double-check that",
        "Double check please",
        "Can you check the word you just gave me?",
        "Could you double check the translation for me?",
        "Please verify these words",
        "Did you make that up?",
        "Did you spell that right?",
        "really?",
        "Are you sure? I want to send it to my boss tonight.",
    ],
)
def test_detects_verification_follow_ups(message):
    assert is_verification_follow_up(message)


@pytest.mark.parametrize(
    "message",
    [
        "Are you sure you can help me?",
        "Are you sure you know Chamorro?",
        "Can you check my homework?",
        "Check this sentence: Hu guaiya hao",
        "Is that the bus to Hagåtña?",
        "Is it raining?",
        "I am sure about it",
        "verify my account",
        # A new question after the check is a new request, not a re-check.
        "Are you sure? How do I say good morning?",
        "What is tree in Chamorro?",
        "How do you say 'are you sure' in Chamorro?",
        "",
    ],
)
def test_ignores_other_messages(message):
    assert not is_verification_follow_up(message)


@pytest.mark.parametrize(
    ("answer", "expected"),
    [
        (TREE[1], ("tronkon håyu",)),
        (BLUE[1], ("asut",)),
        (HAPPY[1], ("magof",)),
        (THANKS[1], ("Si Yu'os Ma'åse'",)),
        ("aga' [dictionary_data/chamorro_english_dictionary_TOD.json]", ("aga'",)),
        (
            "You can say **Si Yu'os ma'åse'** [HåfaGPT canonical vocabulary]. "
            "In Chamorro, *tronkon håyu* means tree, and the word 'asut' means blue.",
            ("Si Yu'os ma'åse'", "tronkon håyu", "asut"),
        ),
        ("The word for happy is magof. Guam spelling comes first.", ("magof",)),
        ("Sure! I can help you learn greetings in Chamorro.", ()),
        ("[Chamoru.info dictionary](https://www.chamoru.info/)", ()),
    ],
)
def test_extracts_chamorro_terms_without_citations(answer, expected):
    assert extract_answer_terms(answer) == (expected, False)


def test_term_extraction_is_capped():
    answer = ", ".join(
        f"**{word}**"
        for word in ("asut", "magof", "aga'", "primeru", "maleffa", "hånom", "guma'", "lahi", "palao'an")
    )

    terms, truncated = extract_answer_terms(answer)

    assert len(terms) == MAX_VERIFICATION_TERMS
    assert truncated is True


@pytest.mark.parametrize(
    ("pair", "terms"),
    [
        (TREE, ("tronkon håyu",)),
        (BLUE, ("asut",)),
        (HAPPY, ("magof",)),
        (THANKS, ("Si Yu'os Ma'åse'",)),
    ],
)
def test_resolver_looks_up_the_previous_answer_and_replays_its_request(pair, terms):
    resolved = resolve_verification_follow_up("Are you sure about these words?", _exchange(pair))

    assert resolved is not None
    assert resolved.terms == terms
    assert resolved.retrieval_query == pair[0]


def test_resolver_replays_the_request_under_its_recorded_task():
    history = ConversationHistory(_exchange(("tree", "**tronkon håyu** [Chamoru.info dictionary]")))
    history.user_turn_intents = ("translate",)

    resolved = resolve_verification_follow_up("is that right?", history)

    assert resolved is not None
    assert resolved.retrieval_query == 'How do you say "tree" in Chamorro?'


def test_resolver_skips_a_cancelled_reply():
    history = _exchange(TREE) + [
        {"role": "user", "content": "And blue?"},
        {"role": "assistant", "content": "[Message was cancelled by user]"},
    ]

    resolved = resolve_verification_follow_up("Are you sure?", history)

    assert resolved is not None and resolved.terms == ("tronkon håyu",)


@pytest.mark.parametrize(
    ("message", "history"),
    [
        # Not a re-check, even after a Chamorro answer.
        ("Are you sure you can help me?", _exchange(TREE)),
        # A re-check with nothing Chamorro to re-check.
        ("Are you sure?", _exchange(("hi", "Hi! How can I help you today?"))),
        ("Are you sure about these words?", []),
    ],
)
def test_resolver_returns_none_without_a_chamorro_answer_to_check(message, history):
    assert resolve_verification_follow_up(message, history) is None


def test_translate_task_does_not_translate_a_re_check_and_keeps_the_thread():
    history = ConversationHistory(_exchange(("tree", "tronkon håyu")))
    history.user_turn_intents = ("translate",)

    assert resolve_translation_routing_query("Are you sure?", history, "translate") == "Are you sure?"

    history = ConversationHistory(_exchange(("tree", "tronkon håyu"), ("Are you sure?", "Yes.")))
    history.user_turn_intents = ("translate", "translate")
    assert build_contextual_retrieval_query("What about that?", history) == (
        'How do you say "tree" in Chamorro?'
    )


@pytest.mark.parametrize(
    ("term", "expected"),
    [
        ("tronkon håyu", ("[Exact dictionary headword: tronkon håyu]", "Chamoru.info dictionary")),
        ("asut", ("[Exact dictionary headword: asut]", "Recommended teaching term: Asut")),
        ("magof", ("[Exact dictionary headword: magof]", "Topping, Ogo, and Dungca dictionary")),
        ("Si Yu'os Ma'åse'", ("Recommended teaching term: Si Yu'os Ma'åse'",)),
    ],
)
def test_each_term_gets_its_exact_dictionary_or_ledger_entry(term, expected):
    context, sources = verification_term_context((term,))

    for text in expected:
        assert text in context
    assert f"Lookups returned entries for: {term}." in context
    assert sources


def test_unmatched_terms_are_reported_without_calling_them_wrong():
    context, sources = verification_term_context(("asut", "zzqxv"))

    assert "No exact dictionary or ledger entry for: zzqxv." in context
    assert "A missing entry alone does not show a term is wrong." in context
    assert "[Exact dictionary headword: asut]" in context
    assert len(sources) == len({str(source) for source in sources})


def test_each_word_of_a_phrase_is_looked_up():
    # The ledger matches "asut" inside the phrase; "magof" still needs its own entry.
    context, _ = verification_term_context(("magof asut",))

    assert "[Exact dictionary headword: magof]" in context
    assert "[Exact dictionary headword: asut]" in context


def test_a_phrase_without_an_entry_reports_its_words(monkeypatch):
    import api.verification_evidence as evidence

    def lookup(query):
        return ("[entry for magof]", [("Topping", None)]) if '"magof"' in query else ("", [])

    monkeypatch.setattr(evidence, "get_canonical_tutor_context", lookup)

    context, _ = evidence.verification_term_context(("magof asut",))

    assert "No exact entry for the whole phrase, but entries for some of its words: magof asut." in context
    assert "[entry for magof]" in context


def test_lookups_are_bounded(monkeypatch):
    import api.verification_evidence as evidence

    lookup = Mock(return_value=("", []))
    monkeypatch.setattr(evidence, "get_canonical_tutor_context", lookup)

    evidence.verification_term_context(tuple(f"magof asut lahi {n}" for n in range(10)))

    assert lookup.call_count <= MAX_VERIFICATION_LOOKUPS


def test_guidance_keeps_supported_terms_without_new_chamorro():
    guidance = " ".join(VERIFICATION_FOLLOW_UP_GUIDANCE.split())

    assert "not evidence by themselves" in guidance
    assert "Keep every supported term" in guidance
    assert "Change a term only when a supplied entry contradicts it" in guidance
    assert "corrected full answer or draft" in guidance
    assert "Do not apologize for or withdraw a supported term" in guidance
    for phrase in ("say it is not verified", "do not volunteer", "State that no verified entry matched"):
        assert phrase not in guidance


# --- Both chat paths, with real routing, retrieval, and canonical lookups. ---


def _real_rag_context(calls: list[dict]):
    namespace = {
        "json": json,
        "logger": logging.getLogger(__name__),
        "should_use_rag": should_use_rag,
        "build_retrieval_event": build_retrieval_event,
        "detect_query_type": detect_query_type,
        "get_canonical_tutor_context": get_canonical_tutor_context,
        "verification_term_context": verification_term_context,
        # Vector search and cards need the database; the lookups do not.
        "get_knowledge_card_context": lambda *args, **kwargs: ("", []),
        "rag": None,
        "count_tokens": count_tokens,
        "truncate_text": truncate_text,
        "format_source_citations": format_source_citations,
    }
    real = load_function("get_rag_context", namespace)

    def get_rag_context(*args, **kwargs):
        calls.append(kwargs)
        return real(*args, **kwargs)

    return get_rag_context


def _run(path: str, message: str, history: list[dict[str, str]]):
    """Return (system prompt sent to the provider, get_rag_context kwargs)."""

    namespace = deferred_stream_namespace("success")
    budget = SimpleNamespace(
        rag_context=4000, conversation_history=10000, current_message=1000,
        response_buffer=100, total=30000,
    )
    rag_calls: list[dict] = []
    namespace.update(
        {
            "TokenBudget": lambda: budget,
            "TokenManager": lambda **kwargs: SimpleNamespace(budget=budget),
            "resolve_verification_follow_up": resolve_verification_follow_up,
            "resolve_translation_routing_query": resolve_translation_routing_query,
            "build_contextual_retrieval_query": build_contextual_retrieval_query,
            "get_rag_context": _real_rag_context(rag_calls),
            "assemble_system_prompt": lambda prompt, rag, web, budget: (prompt + "\n\n" + rag, False),
            "get_conversation_history": lambda conversation_id: history,
            "_extract_non_stream_response_text": lambda response: response.choices[0].message.content,
        }
    )
    if path == "stream":
        create = namespace["get_client_for_request"]()[0].chat.completions.create
        stream = load_function("get_chatbot_response_stream", namespace)
        # history_override is the regeneration/edit path's saved prefix.
        list(stream(message, conversation_id="conv-a", pending_id="pending_abcdefgh",
                    history_override=history, persist=False))
    else:
        create = Mock(return_value=SimpleNamespace(
            choices=[SimpleNamespace(finish_reason="stop", message=SimpleNamespace(content="Reply"))]
        ))
        namespace["get_client_for_request"] = lambda **kwargs: (
            SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create))), "fake",
        )
        respond = load_function("get_chatbot_response", namespace)
        respond(message, conversation_id="conv-a", pending_id="pending_abcdefgh")
    assert len(rag_calls) == 1
    return create.call_args.kwargs["messages"][0]["content"], rag_calls[0]


@pytest.mark.parametrize("path", ["stream", "nonstream"])
@pytest.mark.parametrize(
    ("message", "pair", "evidence"),
    [
        ("Are you sure about these words?", TREE,
         ("[Exact dictionary headword: tronkon håyu]", "Source: Chamoru.info dictionary", "Definition: Tree.")),
        ("Can you check the word you just gave me?", BLUE,
         ("[Exact dictionary headword: asut]", "Recommended teaching term: Asut")),
        ("Are you sure about these words?", HAPPY,
         ("[Exact dictionary headword: magof]", "Definition: Happy; gay; glad; delight.")),
        ("You're sure about all of these words?", THANKS,
         ("Recommended teaching term: Si Yu'os Ma'åse'", "[Canonical greetings.thank_you]")),
    ],
)
def test_re_check_supplies_the_previous_terms_entries(path, message, pair, evidence):
    system_prompt, rag_call = _run(path, message, _exchange(pair))

    for text in evidence:
        assert text in system_prompt
    assert "RE-CHECKING THE PREVIOUS ANSWER" in system_prompt
    assert rag_call["retrieval_input"] == pair[0]
    assert rag_call["verification_terms"]


@pytest.mark.parametrize("path", ["stream", "nonstream"])
@pytest.mark.parametrize(
    ("message", "history"),
    [
        ("Are you sure you can help me?", _exchange(TREE)),
        ("Are you sure?", _exchange(("hi", "Hi! How can I help you today?"))),
        ("What about blue?", _exchange(TREE)),
    ],
)
def test_other_follow_ups_keep_normal_retrieval(path, message, history):
    system_prompt, rag_call = _run(path, message, history)

    assert "RE-CHECKING THE PREVIOUS ANSWER" not in system_prompt
    assert "LOOKUPS FOR THE TERMS IN THE PREVIOUS ANSWER" not in system_prompt
    assert rag_call["verification_terms"] == ()
