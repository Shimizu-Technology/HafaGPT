import io
import json
from pathlib import Path

from api.dictionary_service import (
    DictionaryService,
    _canonical_trust,
    _is_review_gated,
    _review_gated_terms,
    _word_of_day_pools,
    dictionary_word_id,
    normalize_chamorro,
)


def test_dictionary_word_identity_is_stable_and_preserves_diacritics():
    """Keep record identity independent of source order and mutable definitions."""

    headword = "  hånum  "
    assert dictionary_word_id(headword) == dictionary_word_id("hånum")
    assert dictionary_word_id("hånum") == dictionary_word_id("ha\u030anum")
    assert dictionary_word_id("hånum") != dictionary_word_id("hanum")
    assert dictionary_word_id("hånum").startswith("revised-word-v1-")


def test_dictionary_records_have_unique_stable_ids_and_exact_lookup():
    """Address each loaded record without relying on mutable spelling search."""

    service = DictionaryService()
    word_ids = [entry["word_id"] for entry in service._word_list]
    entry = service._word_list[0]

    assert len(word_ids) == len(set(word_ids))
    assert service.get_word_by_id(entry["word_id"]) == entry
    assert service.get_word(entry["chamorro"])["word_id"] == entry["word_id"]
    assert service.get_word(entry["chamorro"])["source_id"] == entry["source_id"]
    assert service.get_word_by_id("revised-word-v1-missing") is None


def test_dictionary_load_does_not_publish_partial_indexes(monkeypatch):
    """A failed identity validation must leave no partially searchable records."""

    duplicate_identity_source = json.dumps({
        "hånum": {"Definition": "water"},
        "ha\u030anum": {"Definition": "same NFC headword"},
    })
    service = object.__new__(DictionaryService)
    service._dictionary = {"old": {}}
    service._word_list = [{"chamorro": "old"}]
    service._words_by_id = {"old": {"chamorro": "old"}}
    service._words_by_headword = {"old": {"chamorro": "old"}}
    service._categories_cache = {"old": []}

    monkeypatch.setattr(Path, "exists", lambda _path: True)
    monkeypatch.setattr(
        "builtins.open",
        lambda *_args, **_kwargs: io.StringIO(duplicate_identity_source),
    )

    service._load_dictionary()

    assert service._dictionary == {}
    assert service._word_list == []
    assert service._words_by_id == {}
    assert service._words_by_headword == {}
    assert service._categories_cache == {}


def test_category_matching_rejects_known_false_positives():
    """Avoid substring-based category matches while retaining intended terms."""

    service = DictionaryService()

    assert not service._matches_category("required", "adj.", "colors", [])
    assert not service._matches_category("morning glory", "n.", "greetings", [])
    assert not service._matches_category("fish trap", "n.", "animals", [])
    assert not service._matches_category("can opener", "n.", "phrases", [])

    assert service._matches_category("red", "adj.", "colors", [])
    assert service._matches_category("good morning", "expression", "greetings", [])
    assert service._matches_category("fish", "n.", "animals", [])
    assert service._matches_category("please", "expression", "phrases", [])


def test_source_verification_does_not_claim_independent_human_review():
    """Keep source verification distinct from independent human review."""

    trust = _canonical_trust(
        {
            "review_status": "verified",
            "confidence": "high",
            "source_citations": [{"source": "Named reference"}],
        }
    )

    assert trust["level"] == "source_backed"
    assert trust["independentlyReviewed"] is False
    assert "source-verified" in trust["notes"][1]


def test_trust_text_names_the_list_plainly_without_internal_terms():
    """A parent should read 'vocabulary list', not 'canonical entry' or 'ledger'."""

    for status in ("verified", "needs_review"):
        trust = _canonical_trust({"review_status": status, "confidence": "high", "source_citations": []})
        text = " ".join([trust["summary"], *trust["notes"], *(source["name"] for source in trust["sources"])])

        assert "HåfaGPT vocabulary list" in text
        assert "canonical" not in text.lower()
        assert "ledger" not in text.lower()


def test_dictionary_learning_surfaces_include_honest_trust_metadata():
    """Expose trust and audio review status throughout dictionary activities."""

    service = DictionaryService()
    category = service.get_category_words("greetings", limit=3)
    flashcards = service.get_flashcards("greetings", count=4, shuffle=False)
    quiz = service.generate_quiz_questions("greetings", count=4, question_types=["multiple_choice"])
    word_of_the_day = service.get_word_of_the_day()

    assert category["words"]
    assert all(service.get_word_by_id(word["word_id"]) for word in category["words"])
    assert all(word["trust"]["independentlyReviewed"] is False for word in category["words"])
    assert flashcards["trust"]["level"] == "source_backed"
    assert all(card["trust"] for card in flashcards["cards"])
    assert all(service.get_word_by_id(card["word_id"]) for card in flashcards["cards"])
    assert quiz["trust"]["level"] == "source_backed"
    assert all(question["trust"] for question in quiz["questions"])
    assert all(service.get_word_by_id(question["word_id"]) for question in quiz["questions"])
    assert word_of_the_day["trust"]["level"] in {"source_backed", "developing"}
    assert "audio_review_status" in word_of_the_day
    if word_of_the_day.get("word_id"):
        assert service.get_word_by_id(word_of_the_day["word_id"])["chamorro"] == (
            word_of_the_day["chamorro"]
        )


def test_dynamic_quiz_choices_are_concise_and_unique():
    """Keep generated choices readable and unique without case distinctions."""

    quiz = DictionaryService().generate_quiz_questions(
        "greetings",
        count=8,
        question_types=["multiple_choice"],
    )

    assert quiz["questions"]
    for question in quiz["questions"]:
        normalized_options = {option.casefold() for option in question["options"]}
        assert len(question["options"]) == len(normalized_options) == 4
        assert all("," not in option and ";" not in option for option in question["options"])


def test_word_of_the_day_broader_pool_keeps_low_confidence_canonical_entries():
    """Keep low-confidence source entries available on broader-rotation days."""

    preferred_word = {
        "chamorro": "Buenas dias",
        "canonical_entry": {"review_status": "verified", "confidence": "high"},
    }
    developing_word = {
        "chamorro": "Low-confidence term",
        "canonical_entry": {"review_status": "source_backed", "confidence": "low"},
    }
    unmatched_word = {"chamorro": "Recorded corpus term", "canonical_entry": None}

    preferred, broader = _word_of_day_pools(
        [preferred_word, developing_word, unmatched_word]
    )

    assert preferred == [preferred_word]
    assert broader == [developing_word, unmatched_word]


def test_category_search_filters_before_paging_and_preserves_total():
    service = DictionaryService.__new__(DictionaryService)
    service._categories_cache = {
        "greetings": [
            {"chamorro": f"word-{index:03}", "definition": "hello"}
            for index in range(70)
        ] + [{"chamorro": "z-last", "definition": "thank you"}]
    }
    result = service.get_category_words("greetings", limit=50, query="thank you")
    assert result["words"] == [{"chamorro": "z-last", "definition": "thank you"}]
    assert result["total"] == 1
    assert result["category_total"] == 71
    assert len(service.get_category_words("greetings", limit=50)["words"]) == 50
    assert service.get_category_words("greetings", limit=50, offset=50)["total"] == 71


def test_category_search_is_diacritic_insensitive_and_handles_empty_query():
    service = DictionaryService.__new__(DictionaryService)
    service._categories_cache = {"greetings": [{"chamorro": "hånum", "definition": "water"}]}
    assert service.get_category_words("greetings", query="HANUM")["total"] == 1
    assert service.get_category_words("greetings", query="   ")["total"] == 1
    assert service.get_category_words("greetings", query="missing")["total"] == 0


def test_category_search_accepts_phone_keyboard_apostrophes():
    service = DictionaryService.__new__(DictionaryService)
    service._categories_cache = {"greetings": [{"chamorro": "Si Yu'os Ma'åse'", "definition": "thank you"}]}
    assert service.get_category_words("greetings", query="Yu’os Ma’åse’")["total"] == 1
    assert service.get_category_words("greetings", query="Yu‘os Ma‘åse‘")["total"] == 1


REVIEW_GATED_PHRASES = ("Hu hånao", "Hu kånno'", "Hu maigo'")


def test_review_gate_reads_canonical_review_status():
    for phrase in REVIEW_GATED_PHRASES:
        assert _is_review_gated(phrase)
    # Straight and curly apostrophes and missing diacritics are the same word.
    assert _is_review_gated("Hu kanno’")
    assert not _is_review_gated("Håfa Adai")
    canonical = json.loads(
        (Path(__file__).parents[1] / "language_content" / "canonical_vocabulary.json").read_text(encoding="utf-8")
    )
    for entry in canonical["entries"]:
        if entry["review_status"] == "needs_review":
            assert _is_review_gated(entry["recommended_teaching_term"])
    assert not _review_gated_terms() & {"hafa adai"}


SOURCE_BACKED_WORDS_WITH_FLAGGED_SPELLINGS = ("Nåna", "Åtadok", "Å'paka'", "Månnge'", "Chåda'", "Hineksa'", "Fa'nå'gue", "Mångga", "Famagu'on")
FLAGGED_SPELLINGS = ("Nanå", "Atadok", "A'paka'", "Månnge", "Chåda", "Hineksa", "Fanague", "Mangå", "Famagu", "Mata", "Rosa", "Gris", "Kulot kafe")


def test_review_gate_holds_a_flagged_spelling_without_hiding_the_word_it_resembles():
    """Nanå (a Wordle accent) is flagged; Nåna, mother, is source-backed and stays available."""

    for word in SOURCE_BACKED_WORDS_WITH_FLAGGED_SPELLINGS:
        assert not _is_review_gated(word), word
    for spelling in FLAGGED_SPELLINGS:
        assert _is_review_gated(spelling), spelling
    # The flagged form is held under either apostrophe a keyboard produces.
    assert _is_review_gated("Månnge")
    assert _is_review_gated("CHÅDA")


def test_review_gate_leaves_every_source_backed_canonical_term_available():
    canonical = json.loads(
        (Path(__file__).parents[1] / "language_content" / "canonical_vocabulary.json").read_text(encoding="utf-8")
    )
    for entry in canonical["entries"]:
        if entry["review_status"] == "source_backed":
            assert not _is_review_gated(entry["recommended_teaching_term"]), entry["id"]
            assert not _is_review_gated(entry["canonical_chamorro"]), entry["id"]


def test_review_gate_removes_only_flagged_words_from_the_audio_manifest():
    manifest = json.loads(
        (Path(__file__).parents[1] / "audio_generation" / "manifest.json").read_text(encoding="utf-8")
    )["words"]
    held = sorted(word for word in manifest if _is_review_gated(word))

    assert held == sorted(["Chåda", "Hineksa", "Hu hånao", "Månnge"])


def test_word_of_the_day_never_selects_review_gated_phrases_in_a_full_year(monkeypatch):
    """Scan every Guam day of two years (one leap) so no rotation path can pick a gated term."""

    from datetime import date, timedelta

    from api import dictionary_service

    service = DictionaryService.__new__(DictionaryService)
    service._words_by_headword = {}
    gated = {normalize_chamorro(term) for term in REVIEW_GATED_PHRASES}
    seen_broader = set()
    day = date(2026, 1, 1)
    while day < date(2028, 1, 1):
        monkeypatch.setattr(dictionary_service, "get_guam_date", lambda day=day: day)
        result = service.get_word_of_the_day()
        assert normalize_chamorro(result["chamorro"]) not in gated
        assert not _is_review_gated(result["chamorro"])
        if day.timetuple().tm_yday % 5 == 0:
            seen_broader.add(result["chamorro"])
        day += timedelta(days=1)
    assert seen_broader  # the broader rotation still runs


def test_word_of_the_day_fallback_skips_review_gated_manifest(monkeypatch, tmp_path):
    """A manifest made only of gated terms yields the safe default, not a gated word."""

    from api import dictionary_service

    manifest = {"words": {phrase: {"english": "to go"} for phrase in REVIEW_GATED_PHRASES}}
    fake_file = tmp_path / "api" / "dictionary_service.py"
    (tmp_path / "audio_generation").mkdir()
    (tmp_path / "audio_generation" / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    monkeypatch.setattr(dictionary_service, "__file__", str(fake_file))
    service = DictionaryService.__new__(DictionaryService)
    service._words_by_headword = {}
    result = service.get_word_of_the_day()
    assert result["chamorro"] == "Håfa Adai"
