from pathlib import Path


def test_english_prompt_does_not_assume_the_user_is_studying() -> None:
    source = (
        Path(__file__).resolve().parents[1] / "api" / "chatbot_service.py"
    ).read_text(encoding="utf-8")

    assert "You are HåfaGPT, a Chamorro language and Guam learning assistant." in source
    assert "You are a Chamorro language tutor helping students learn Chamorro." not in source
    assert "Do not assume the user is studying" in source
