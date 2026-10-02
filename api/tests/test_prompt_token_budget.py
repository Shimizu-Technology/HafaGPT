from src.utils.token_manager import count_tokens, truncate_text, truncate_text_preserving_suffix


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


def test_oversized_suffix_respects_a_very_small_budget() -> None:
    fitted = truncate_text_preserving_suffix(
        "General assistant instruction. " * 50,
        "WEB SEARCH RESULTS " * 50,
        max_tokens=10,
    )

    assert count_tokens(fitted) <= 10
    assert "WEB SEARCH RESULTS" in fitted


def test_truncate_text_omits_indicator_when_it_cannot_fit() -> None:
    fitted = truncate_text("evidence " * 100, max_tokens=3)

    assert count_tokens(fitted) <= 3
    assert "content truncated" not in fitted


def test_reference_allocation_is_not_cut_by_instruction_cap() -> None:
    from api.prompt_budget import assemble_system_prompt
    from src.utils.token_manager import TokenBudget

    instructions = "Keep every question and answer choice. " * 140
    references = "Verified dictionary evidence. " * 700 + " FINAL_REFERENCE_SENTINEL"
    prompt, used_web = assemble_system_prompt(instructions, references, "", TokenBudget())
    assert count_tokens(prompt) > 3000
    assert prompt == instructions + "\n\n" + references
    assert prompt.endswith("FINAL_REFERENCE_SENTINEL")
    assert not used_web


def test_combined_prompt_keeps_instructions_and_references_when_web_is_large() -> None:
    from api.prompt_budget import assemble_system_prompt
    from src.utils.token_manager import TokenBudget

    core = "Mandatory instruction. " * 200
    references = "Source evidence. " * 800
    prompt, used_web = assemble_system_prompt(core, references, "Web result. " * 4000, TokenBudget())
    assert prompt.startswith(core + "\n\n" + references)
    assert count_tokens(prompt) <= 7000
    assert used_web
