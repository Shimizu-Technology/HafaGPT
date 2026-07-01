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


def collect_chamorro_terms_from_word_list(data: dict[str, Any]) -> set[str]:
    terms: set[str] = set()
    for category in data.get("categories", {}).values():
        if not isinstance(category, dict):
            continue
        for word in category.get("words", []):
            if isinstance(word, dict) and isinstance(word.get("chamorro"), str):
                terms.add(normalize_text(word["chamorro"]))
    return terms


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def disallowed_color_audio_terms(vocabulary: dict[str, Any]) -> set[str]:
    disallowed_terms: set[str] = set()
    for entry in vocabulary["entries"]:
        if entry["category"] != "colors":
            continue
        for item in entry.get("deprecated_app_terms", []) + entry.get("needs_review_terms", []):
            disallowed_terms.add(normalize_text(item["term"]))
        for variant in entry.get("variants", []):
            if variant.get("type") == "app_legacy" and variant.get("status") != "source_backed":
                disallowed_terms.add(normalize_text(variant["term"]))
    return disallowed_terms


def test_audio_source_lists_do_not_teach_known_deprecated_or_review_needed_color_terms():
    api_root = Path(__file__).resolve().parents[1]
    vocabulary = load_json(api_root / "language_content" / "canonical_vocabulary.json")
    disallowed_terms = disallowed_color_audio_terms(vocabulary)

    source_paths = [
        api_root / "audio_generation" / "flashcard_words.json",
        api_root / "audio_generation" / "tier1_words.json",
        api_root / "audio_generation" / "chamorro_pronunciations.json",
    ]
    taught_terms: set[str] = set()
    for path in source_paths:
        data = load_json(path)
        if path.name == "chamorro_pronunciations.json":
            taught_terms.update(normalize_text(key) for key in data.keys() if not key.startswith("_"))
        else:
            taught_terms.update(collect_chamorro_terms_from_word_list(data))

    assert taught_terms.isdisjoint(disallowed_terms)


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


def test_static_audio_manifest_does_not_map_stale_color_teaching_terms():
    api_root = Path(__file__).resolve().parents[1]
    vocabulary = load_json(api_root / "language_content" / "canonical_vocabulary.json")
    disallowed_terms = disallowed_color_audio_terms(vocabulary)
    manifest = load_json(api_root / "audio_generation" / "manifest.json")

    manifest_terms = {normalize_text(term) for term in manifest["words"].keys()}

    assert manifest_terms.isdisjoint(disallowed_terms)
