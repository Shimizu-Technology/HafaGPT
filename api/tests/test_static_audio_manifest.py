import json
from pathlib import Path

import pytest

from scripts import verify_static_audio_manifest
from scripts.verify_static_audio_manifest import (
    BLOCKED_STALE_TERMS,
    REQUIRED_TERMS,
    compare_manifests,
    load_manifest,
    validate_manifest,
)


def test_current_static_audio_manifest_is_internally_valid():
    api_root = Path(__file__).resolve().parents[1]
    manifest = load_manifest(api_root / "audio_generation" / "manifest.json")

    findings = validate_manifest(manifest, label="audio_generation/manifest.json")

    assert findings == []


def test_static_audio_manifest_has_required_basics_and_no_stale_teaching_keys():
    api_root = Path(__file__).resolve().parents[1]
    manifest = load_manifest(api_root / "audio_generation" / "manifest.json")
    words = manifest["words"]

    assert REQUIRED_TERMS.issubset(words)
    assert words.keys().isdisjoint(BLOCKED_STALE_TERMS)
    assert words["Åhe'"]["file"] == "ahe.mp3"
    assert words["Åhe'"]["english"] == "No"
    assert words["Åhe'"]["category"] == "flashcards"
    assert words["Kulot åpu"]["english"] == "Gray"
    assert words["Kulot åpu"]["category"] == "colors"
    assert words["Kulot åpu"]["tier"] == 1
    assert words["Siete"]["english"] == "Seven"
    assert words["Siete"]["category"] == "numbers"
    assert words["Siete"]["tier"] == 1
    assert words["Siete"]["phonetic_used"] == "See-eh-teh"
    assert words["Buen prubetchu"]["english"] == "You're welcome"
    assert "you are welcome" in words["Buen prubetchu"].get("source_note", "")


def test_tier1_color_source_list_includes_gray_audio_source():
    api_root = Path(__file__).resolve().parents[1]
    tier1_words = json.loads((api_root / "audio_generation" / "tier1_words.json").read_text(encoding="utf-8"))
    color_terms = {
        word["chamorro"]
        for word in tier1_words["categories"]["colors"]["words"]
    }

    assert "Kulot åpu" in color_terms


def test_manifest_validation_rejects_control_whitespace_in_terms_and_urls():
    manifest = {
        "total_words": 1,
        "words": {
            "kåtnin\r\nguaka": {
                "file": "katnin\r\nguaka.mp3",
                "url": "https://hafagpt.s3.ap-southeast-2.amazonaws.com/audio/katnin\r\nguaka.mp3",
                "english": "beef",
                "category": "general",
                "tier": 2,
                "phonetic_used": "kåtnin guaka",
                "size_bytes": 123,
                "generated_at": "2026-01-01T00:00:00",
            }
        },
    }

    findings = validate_manifest(
        manifest,
        label="bad-manifest",
        required_terms=set(),
        blocked_terms=set(),
    )
    messages = "\n".join(finding.message for finding in findings)

    assert "term contains control whitespace" in messages
    assert "invalid file name" in messages
    assert "url contains control whitespace" in messages


def test_fetch_remote_manifest_reports_network_failures_without_crashing(monkeypatch):
    def fake_fetch_json(url, timeout):
        raise TimeoutError("timed out")

    monkeypatch.setattr(verify_static_audio_manifest, "fetch_json", fake_fetch_json)

    manifest, finding = verify_static_audio_manifest.fetch_remote_manifest(
        "https://example.com/audio/manifest.json",
        timeout=1,
    )

    assert manifest is None
    assert finding is not None
    assert "failed to fetch remote manifest" in finding.message


def test_head_audio_reports_malformed_content_length_without_crashing(monkeypatch):
    class FakeResponse:
        status = 200
        headers = {
            "Content-Type": "audio/mpeg",
            "Content-Length": "not-an-int",
        }

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

    def fake_urlopen(request, timeout):
        return FakeResponse()

    monkeypatch.setattr(verify_static_audio_manifest.urllib.request, "urlopen", fake_urlopen)

    finding = verify_static_audio_manifest.head_audio(
        "https://example.com/audio/test.mp3",
        expected_size=123,
        timeout=1,
    )

    assert finding is not None
    assert "invalid Content-Length" in finding.message


def test_manifest_comparison_detects_frontend_or_remote_drift():
    primary = {
        "total_words": 2,
        "words": {
            "Hunggan": {"file": "hunggan.mp3"},
            "Åhe'": {"file": "ahe.mp3"},
        },
    }
    stale_copy = {
        "total_words": 2,
        "words": {
            "Hunggan": {"file": "stale.mp3"},
            "Nengkånno'": {"file": "nengkanno.mp3"},
        },
    }

    findings = compare_manifests(primary, stale_copy, primary_label="api", secondary_label="frontend")
    messages = "\n".join(finding.message for finding in findings)

    assert "missing 1 terms" in messages
    assert "Åhe'" in messages
    assert "has 1 extra terms" in messages
    assert "Nengkånno'" in messages
    assert "shared terms differ" in messages


def test_frontend_public_manifest_is_exact_copy_when_available():
    api_root = Path(__file__).resolve().parents[1]
    frontend_manifest_path = api_root.parent / "HafaGPT-frontend" / "public" / "audio_manifest.json"
    if not frontend_manifest_path.exists():
        pytest.skip(f"Frontend manifest not found at {frontend_manifest_path}")

    api_manifest = load_manifest(api_root / "audio_generation" / "manifest.json")
    frontend_manifest = load_manifest(frontend_manifest_path)

    assert compare_manifests(
        api_manifest,
        frontend_manifest,
        primary_label="api",
        secondary_label="frontend",
    ) == []
