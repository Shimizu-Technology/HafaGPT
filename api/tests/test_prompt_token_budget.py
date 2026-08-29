from src.utils.token_manager import count_tokens, truncate_text_preserving_suffix


def test_oversized_prompt_preserves_web_evidence_suffix() -> None:
    base_prompt = "General assistant instruction. " * 500
    web_evidence = "\n\nWEB SEARCH RESULTS\nCurrent Guam weather result: sunny."

    fitted = truncate_text_preserving_suffix(base_prompt, web_evidence, max_tokens=120)

    assert count_tokens(fitted) <= 120
    assert "WEB SEARCH RESULTS" in fitted
    assert "Current Guam weather result: sunny." in fitted
    assert "General assistant instruction" in fitted


def test_prompt_without_suffix_keeps_existing_prefix_truncation() -> None:
    base_prompt = "General assistant instruction. " * 500

    fitted = truncate_text_preserving_suffix(base_prompt, "", max_tokens=80)

    assert count_tokens(fitted) <= 80
    assert fitted.startswith("General assistant instruction")
