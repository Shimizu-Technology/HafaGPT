"""Keep instructions and already-budgeted evidence in separate allocations."""
from src.utils.token_manager import TokenBudget, count_tokens, truncate_text


def assemble_system_prompt(instructions: str, references: str, web_context: str,
                           budget: TokenBudget) -> tuple[str, bool]:
    """Never apply the instruction-only cap to the combined evidence prompt.

    Retrieval already bounds references to rag_context. Both are preserved in
    full; web evidence consumes the unused portion of the combined allocation.
    An oversized internal instruction/reference configuration fails explicitly.
    """
    prompt = instructions + (f"\n\n{references}" if references else "")
    limit = budget.system_prompt + budget.rag_context
    available = limit - count_tokens(prompt)
    if available < 0:
        raise ValueError("Instructions and reference evidence exceed their combined budget")
    if not web_context or available < 20:
        return prompt, False
    web = truncate_text(web_context, max(0, available - 4))
    return prompt + "\n\n" + web, bool(web)


def _cited_in(source: object, text: str) -> bool:
    if isinstance(source, dict):
        return str(source.get("name") or "") in text
    return isinstance(source, (tuple, list)) and bool(source) and str(source[0]) in text


def fit_references(instructions: str, references: str, sources: list,
                   budget: TokenBudget) -> tuple[str, list]:
    """Shorten references so instructions added after retrieval still fit.

    Retrieval bounds references on their own. Guidance that depends on the
    lookups (the re-check block) is added afterwards, so the end of the
    references gives way to it instead of assemble_system_prompt raising.
    Sources whose text was cut are dropped with it.
    """
    if not references:
        return references, sources
    available = budget.system_prompt + budget.rag_context - count_tokens(instructions) - 4
    if count_tokens(references) <= available:
        return references, sources
    references = truncate_text(references, available)
    return references, [source for source in sources if _cited_in(source, references)]
