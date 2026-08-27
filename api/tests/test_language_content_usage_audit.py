import json

from scripts.check_language_content_against_canonical import load_rules, scan_content_roots


def test_entry_level_needs_review_terms_are_reported_when_taught(tmp_path):
    """Report a developing canonical phrase when learner content teaches it."""

    vocabulary_path = tmp_path / "canonical.json"
    vocabulary_path.write_text(
        json.dumps(
            {
                "entries": [
                    {
                        "id": "verbs.go",
                        "category": "verbs",
                        "english": "I go",
                        "recommended_teaching_term": "Hu hånao",
                        "review_status": "needs_review",
                        "notes": "The standalone phrase is grammar-sensitive.",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    content_root = tmp_path / "content"
    content_root.mkdir()
    (content_root / "lesson.ts").write_text(
        "export const card = { front: 'Hu hånao', back: 'I go' };\n",
        encoding="utf-8",
    )

    findings = scan_content_roots([content_root], load_rules(vocabulary_path))

    assert len(findings) == 1
    assert findings[0]["action"] == "review_canonical_entry_before_teaching"
    assert findings[0]["entry_id"] == "verbs.go"


def test_exact_audit_matches_escaped_glottal_stop_in_typescript(tmp_path):
    """Audit the rendered glottal stop in an escaped TypeScript string."""

    vocabulary_path = tmp_path / "canonical.json"
    vocabulary_path.write_text(
        json.dumps(
            {
                "entries": [
                    {
                        "id": "verbs.eat",
                        "category": "verbs",
                        "english": "I eat",
                        "recommended_teaching_term": "Hu kånno'",
                        "review_status": "needs_review",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    content_root = tmp_path / "content"
    content_root.mkdir()
    (content_root / "lesson.ts").write_text(
        "export const card = { front: 'Hu kånno\\\'', back: 'I eat' };\n",
        encoding="utf-8",
    )

    findings = scan_content_roots([content_root], load_rules(vocabulary_path))

    assert [finding["entry_id"] for finding in findings] == ["verbs.eat"]


def test_exact_audit_excludes_hyphen_prefixed_compound(tmp_path):
    """Do not treat a term inside a hyphenated compound as a standalone match."""

    vocabulary_path = tmp_path / "canonical.json"
    vocabulary_path.write_text(
        json.dumps(
            {
                "entries": [
                    {
                        "id": "family.father",
                        "category": "family",
                        "english": "father",
                        "recommended_teaching_term": "tåta",
                        "review_status": "needs_review",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    content_root = tmp_path / "content"
    content_root.mkdir()
    (content_root / "lesson.ts").write_text(
        "export const compound = 'para-tåta';\n",
        encoding="utf-8",
    )

    findings = scan_content_roots([content_root], load_rules(vocabulary_path))

    assert findings == []
