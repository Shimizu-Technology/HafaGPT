from pathlib import Path


def test_tutor_prompt_does_not_reintroduce_rejected_hardcoded_claims():
    source = (
        Path(__file__).resolve().parents[1] / "api" / "chatbot_service.py"
    ).read_text(encoding="utf-8")

    rejected_claims = (
        'taigue** = "always"',
        "God's morning",
        "These abbreviations are commonly used in Guam schools",
        "Mañana Si Yu'os (NOT",
    )
    for rejected_claim in rejected_claims:
        assert rejected_claim not in source

    assert "GOVERNED CONTENT POLICY" in source
    assert "NO GOVERNED REFERENCE WAS RETRIEVED" in source
