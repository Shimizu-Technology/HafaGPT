import json
from pathlib import Path
from typing import Any

from scripts.chamorro_utils import normalize_text
from scripts.validate_canonical_vocabulary import validate_vocabulary


def test_canonical_vocabulary_is_structurally_valid_and_source_backed():
    api_root = Path(__file__).resolve().parents[1]
    vocabulary_path = api_root / "language_content" / "canonical_vocabulary.json"

    errors = validate_vocabulary(api_root, vocabulary_path)

    assert errors == []


def exact_key(value: str) -> str:
    return value.strip().casefold()


def collect_chamorro_terms_from_word_list(data: dict[str, Any]) -> tuple[set[str], set[str]]:
    exact_terms: set[str] = set()
    normalized_terms: set[str] = set()
    for category in data.get("categories", {}).values():
        if not isinstance(category, dict):
            continue
        for word in category.get("words", []):
            if isinstance(word, dict) and isinstance(word.get("chamorro"), str):
                exact_terms.add(exact_key(word["chamorro"]))
                normalized_terms.add(normalize_text(word["chamorro"]))
    return exact_terms, normalized_terms


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def add_disallowed_term(
    entry: dict[str, Any], term: str, exact_terms: set[str], normalized_terms: set[str]
) -> None:
    """Track stale terms without conflating diacritic-only teaching replacements.

    Most stale terms should be compared with the same normalization used by the
    audit scripts. If a stale app term normalizes to the recommended teaching
    term (for example `Buenas tatdes` vs `Buenas tåtdes`), compare exact text so
    the source-backed diacritic form remains allowed while the legacy display
    spelling is still guarded.
    """
    if normalize_text(term) == normalize_text(str(entry.get("recommended_teaching_term", ""))):
        exact_terms.add(exact_key(term))
    else:
        normalized_terms.add(normalize_text(term))


def disallowed_audio_terms(vocabulary: dict[str, Any]) -> tuple[set[str], set[str]]:
    exact_terms: set[str] = set()
    normalized_terms: set[str] = set()
    for entry in vocabulary["entries"]:
        for item in entry.get("deprecated_app_terms", []) + entry.get("needs_review_terms", []):
            add_disallowed_term(entry, item["term"], exact_terms, normalized_terms)
        for variant in entry.get("variants", []):
            if variant.get("type") == "app_legacy" and variant.get("status") != "source_backed":
                add_disallowed_term(entry, variant["term"], exact_terms, normalized_terms)
    return exact_terms, normalized_terms


def test_audio_source_lists_do_not_teach_known_deprecated_or_review_needed_terms():
    api_root = Path(__file__).resolve().parents[1]
    vocabulary = load_json(api_root / "language_content" / "canonical_vocabulary.json")
    disallowed_exact_terms, disallowed_normalized_terms = disallowed_audio_terms(vocabulary)

    source_paths = [
        api_root / "audio_generation" / "flashcard_words.json",
        api_root / "audio_generation" / "tier1_words.json",
        api_root / "audio_generation" / "chamorro_pronunciations.json",
    ]
    taught_exact_terms: set[str] = set()
    taught_normalized_terms: set[str] = set()
    for path in source_paths:
        data = load_json(path)
        if path.name == "chamorro_pronunciations.json":
            taught_exact_terms.update(exact_key(key) for key in data.keys() if not key.startswith("_"))
            taught_normalized_terms.update(normalize_text(key) for key in data.keys() if not key.startswith("_"))
        else:
            exact_terms, normalized_terms = collect_chamorro_terms_from_word_list(data)
            taught_exact_terms.update(exact_terms)
            taught_normalized_terms.update(normalized_terms)

    assert taught_exact_terms.isdisjoint(disallowed_exact_terms)
    assert taught_normalized_terms.isdisjoint(disallowed_normalized_terms)


def test_validator_requires_canonical_and_recommended_terms_to_match_after_normalization(tmp_path):
    api_root = Path(__file__).resolve().parents[1]
    vocabulary = load_json(api_root / "language_content" / "canonical_vocabulary.json")
    vocabulary["entries"][0]["canonical_chamorro"] = "Different term"
    vocabulary_path = tmp_path / "canonical_vocabulary.invalid.json"
    vocabulary_path.write_text(json.dumps(vocabulary), encoding="utf-8")

    errors = validate_vocabulary(api_root, vocabulary_path)

    assert any("canonical_chamorro and recommended_teaching_term must match" in error for error in errors)


def test_validator_reports_invalid_optional_array_shapes_without_crashing(tmp_path):
    api_root = Path(__file__).resolve().parents[1]
    vocabulary = load_json(api_root / "language_content" / "canonical_vocabulary.json")
    vocabulary["entries"][0]["variants"] = None
    vocabulary["entries"][0]["deprecated_app_terms"] = ["not an object"]
    vocabulary["entries"][0]["needs_review_terms"] = [{"term": "Maybe"}]
    vocabulary_path = tmp_path / "canonical_vocabulary.invalid.json"
    vocabulary_path.write_text(json.dumps(vocabulary), encoding="utf-8")

    errors = validate_vocabulary(api_root, vocabulary_path)

    assert "entries[0].variants: must be an array" in errors
    assert "entries[0].deprecated_app_terms[0]: term record must be an object" in errors
    assert "entries[0].needs_review_terms[0]: reason is required" in errors


def test_validator_allows_external_citations_with_urls(tmp_path):
    api_root = Path(__file__).resolve().parents[1]
    vocabulary = load_json(api_root / "language_content" / "canonical_vocabulary.json")
    vocabulary["entries"] = [vocabulary["entries"][0]]
    vocabulary["entries"][0]["source_citations"] = [
        {
            "source": "External language reference",
            "url": "https://example.com/chamorro-entry",
            "headword": vocabulary["entries"][0]["canonical_chamorro"],
            "definition": vocabulary["entries"][0]["english"],
        }
    ]
    vocabulary_path = tmp_path / "canonical_vocabulary.external.json"
    vocabulary_path.write_text(json.dumps(vocabulary), encoding="utf-8")

    errors = validate_vocabulary(api_root, vocabulary_path)

    assert errors == []


def test_validator_rejects_external_citations_without_urls(tmp_path):
    api_root = Path(__file__).resolve().parents[1]
    vocabulary = load_json(api_root / "language_content" / "canonical_vocabulary.json")
    vocabulary["entries"] = [vocabulary["entries"][0]]
    vocabulary["entries"][0]["source_citations"] = [
        {
            "source": "External language reference",
            "headword": vocabulary["entries"][0]["canonical_chamorro"],
            "definition": vocabulary["entries"][0]["english"],
        }
    ]
    vocabulary_path = tmp_path / "canonical_vocabulary.external.invalid.json"
    vocabulary_path.write_text(json.dumps(vocabulary), encoding="utf-8")

    errors = validate_vocabulary(api_root, vocabulary_path)

    assert any("external citations must include an http(s) url" in error for error in errors)


def test_static_audio_manifest_does_not_map_stale_teaching_terms():
    api_root = Path(__file__).resolve().parents[1]
    vocabulary = load_json(api_root / "language_content" / "canonical_vocabulary.json")
    disallowed_exact_terms, disallowed_normalized_terms = disallowed_audio_terms(vocabulary)
    manifest = load_json(api_root / "audio_generation" / "manifest.json")

    manifest_exact_terms = {exact_key(term) for term in manifest["words"].keys()}
    manifest_normalized_terms = {normalize_text(term) for term in manifest["words"].keys()}

    assert manifest_exact_terms.isdisjoint(disallowed_exact_terms)
    assert manifest_normalized_terms.isdisjoint(disallowed_normalized_terms)


def test_static_audio_manifest_aliases_resolve_to_existing_canonical_entries():
    api_root = Path(__file__).resolve().parents[1]
    manifest = load_json(api_root / "audio_generation" / "manifest.json")
    words = manifest["words"]

    for word, info in words.items():
        alias_of = info.get("alias_of")
        if not alias_of:
            continue
        assert alias_of != word
        assert alias_of in words
        assert info.get("compatibility_note")


def test_family_manifest_promotes_tihu_tiha_without_broken_alias_metadata():
    api_root = Path(__file__).resolve().parents[1]
    manifest = load_json(api_root / "audio_generation" / "manifest.json")
    words = manifest["words"]

    expected_phonetics = {
        "Tihu": "Tee-hoo",
        "Tiha": "Tee-hah",
    }
    for word, phonetic in expected_phonetics.items():
        assert word in words
        assert "alias_of" not in words[word]
        assert words[word]["phonetic_used"] == phonetic

    expected_aliases = {
        "Tiu": "Tihu",
        "Tia": "Tiha",
    }
    for alias, canonical in expected_aliases.items():
        assert alias in words
        assert words[alias]["alias_of"] == canonical
        assert words[alias]["phonetic_used"] == words[canonical]["phonetic_used"]
        assert words[alias].get("compatibility_note")


def test_family_manifest_marks_split_cousin_card_as_compatibility_alias():
    api_root = Path(__file__).resolve().parents[1]
    manifest = load_json(api_root / "audio_generation" / "manifest.json")
    words = manifest["words"]

    legacy_key = "Prima / Primu"
    assert legacy_key in words
    assert words[legacy_key]["alias_of"] == "Prima"
    assert words[legacy_key]["compatibility_note"]
    assert words[legacy_key]["phonetic_used"] == "Pree-mah / Pree-moo"


def test_static_audio_manifest_total_words_matches_word_count():
    api_root = Path(__file__).resolve().parents[1]
    manifest = load_json(api_root / "audio_generation" / "manifest.json")

    assert manifest["total_words"] == len(manifest["words"])


def test_static_audio_manifest_urls_match_declared_public_base():
    api_root = Path(__file__).resolve().parents[1]
    manifest = load_json(api_root / "audio_generation" / "manifest.json")
    public_url = manifest["storage"]["public_url"]

    assert public_url == "https://hafagpt.s3.ap-southeast-2.amazonaws.com/audio/"
    for info in manifest["words"].values():
        url = info.get("url")
        if url:
            assert url.startswith(public_url)


def test_body_parts_manifest_uses_corrected_simon_says_terms():
    api_root = Path(__file__).resolve().parents[1]
    manifest = load_json(api_root / "audio_generation" / "manifest.json")
    words = manifest["words"]

    stale_terms = {
        "Ulo",
        "Mata",
        "Kanai",
        "Tata'ao",
        "Påtti i ulo-mu!",
        "Påtti i mata-mu!",
        "Na'fåna i kanai-mu!",
        "Påtti i tata'ao-mu!",
    }
    assert words.keys().isdisjoint(stale_terms)

    corrected_terms = {
        "Ulu",
        "Åtadok",
        "Kannai",
        "Tuyan",
        "Påtti i ulu-mu!",
        "Påtti i åtadok-mu!",
        "Na'fåna i kannai-mu!",
        "Påtti i tuyan-mu!",
    }
    assert corrected_terms.issubset(words.keys())


def test_tier1_body_parts_source_list_uses_corrected_simon_says_terms():
    api_root = Path(__file__).resolve().parents[1]
    tier1_words = load_json(api_root / "audio_generation" / "tier1_words.json")
    exact_terms, _ = collect_chamorro_terms_from_word_list(tier1_words)

    stale_terms = {
        exact_key("Ulo"),
        exact_key("Mata"),
        exact_key("Kanai"),
        exact_key("Tata'ao"),
        exact_key("Påtti i ulo-mu!"),
        exact_key("Påtti i mata-mu!"),
        exact_key("Na'fåna i kanai-mu!"),
        exact_key("Påtti i tata'ao-mu!"),
    }
    assert exact_terms.isdisjoint(stale_terms)

    corrected_terms = {
        exact_key("Ulu"),
        exact_key("Åtadok"),
        exact_key("Kannai"),
        exact_key("Tuyan"),
        exact_key("Påtti i ulu-mu!"),
        exact_key("Påtti i åtadok-mu!"),
        exact_key("Na'fåna i kannai-mu!"),
        exact_key("Påtti i tuyan-mu!"),
    }
    assert corrected_terms.issubset(exact_terms)


def test_food_manifest_uses_corrected_teaching_terms_and_safe_aliases():
    api_root = Path(__file__).resolve().parents[1]
    manifest = load_json(api_root / "audio_generation" / "manifest.json")
    words = manifest["words"]

    stale_terms = {
        "Buen prubechu",
        "Kådu",
        "Lechuga",
    }
    assert words.keys().isdisjoint(stale_terms)
    if "Månha" in words:
        assert "chicken" not in words["Månha"].get("english", "").casefold()

    corrected_terms = {
        "Buen prubetchu",
        "Nengkånno'",
        "Kåddo",
        "Gollai",
        "Fina'denne'",
        "Månnok",
        "Mångga",
        "Hineksa'",
        "Månnge'",
        "Chåda'",
    }
    assert corrected_terms.issubset(words.keys())

    expected_aliases = {
        "Mannok": "Månnok",
        "Hineksa": "Hineksa'",
        "Mangga": "Mångga",
        "Månnge": "Månnge'",
        "Chåda": "Chåda'",
    }
    for alias, canonical in expected_aliases.items():
        assert alias in words
        assert words[alias]["alias_of"] == canonical
        assert words[alias]["file"] == words[canonical]["file"]
        assert words[alias].get("compatibility_note")


def test_food_audio_source_lists_use_corrected_teaching_terms():
    api_root = Path(__file__).resolve().parents[1]
    tier1_words = load_json(api_root / "audio_generation" / "tier1_words.json")
    flashcard_words = load_json(api_root / "audio_generation" / "flashcard_words.json")
    tier1_exact_terms, _ = collect_chamorro_terms_from_word_list(tier1_words)
    flashcard_exact_terms, _ = collect_chamorro_terms_from_word_list(flashcard_words)

    stale_tier1_terms = {
        exact_key("Mannok"),
        exact_key("Mangga"),
        exact_key("Hineksa"),
        exact_key("Månnge"),
        exact_key("Chåda"),
    }
    assert tier1_exact_terms.isdisjoint(stale_tier1_terms)

    corrected_tier1_terms = {
        exact_key("Månnok"),
        exact_key("Mångga"),
        exact_key("Hineksa'"),
        exact_key("Månnge'"),
        exact_key("Chåda'"),
    }
    assert corrected_tier1_terms.issubset(tier1_exact_terms)

    stale_flashcard_terms = {
        exact_key("Buen prubechu"),
        exact_key("Kådu"),
        exact_key("Lechuga"),
    }
    assert flashcard_exact_terms.isdisjoint(stale_flashcard_terms)
    for category in flashcard_words.get("categories", {}).values():
        for word in category.get("words", []):
            if exact_key(word.get("chamorro", "")) == exact_key("Månha"):
                assert "chicken" not in word.get("english", "").casefold()

    corrected_flashcard_terms = {
        exact_key("Buen prubetchu"),
        exact_key("Nengkånno'"),
        exact_key("Kåddo"),
        exact_key("Gollai"),
        exact_key("Fina'denne'"),
    }
    assert corrected_flashcard_terms.issubset(flashcard_exact_terms)


def test_common_verb_audio_source_list_uses_sangan_for_say_not_fahan():
    api_root = Path(__file__).resolve().parents[1]
    flashcard_words = load_json(api_root / "audio_generation" / "flashcard_words.json")
    flashcard_exact_terms, _ = collect_chamorro_terms_from_word_list(flashcard_words)

    assert exact_key("Hu sångan") in flashcard_exact_terms
    assert exact_key("Hu fåhan") not in flashcard_exact_terms

    for category in flashcard_words.get("categories", {}).values():
        for word in category.get("words", []):
            if exact_key(word.get("chamorro", "")) == exact_key("Hu fåhan"):
                english = word.get("english", "").casefold()
                assert "speak" not in english
                assert "say" not in english


def test_common_verb_static_manifest_has_sangan_and_correct_fahan_metadata():
    api_root = Path(__file__).resolve().parents[1]
    manifest = load_json(api_root / "audio_generation" / "manifest.json")
    words = manifest["words"]

    assert "Hu sångan" in words
    fahan_english = words["Hu fåhan"].get("english", "").casefold()
    assert "buy" in fahan_english or "purchase" in fahan_english
    assert "speak" not in fahan_english
    assert "say" not in fahan_english
