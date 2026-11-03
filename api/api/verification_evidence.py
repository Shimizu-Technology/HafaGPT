"""Exact dictionary and ledger evidence for terms the user asks to re-check.

Each term from the previous answer is looked up as its own exact headword
request through the shared canonical context, so the same governed sources,
review gates, and citation names apply as for a first-time lookup. The terms
are lookup keys only; nothing from the previous answer becomes evidence.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from src.rag.text_normalization import normalize_chamorro_match_text
from src.rag.verification_follow_up import is_chamorro_word

from .canonical_context import get_canonical_tutor_context


MAX_VERIFICATION_LOOKUPS = 16


def _source_key(source: object) -> tuple[object, object]:
    if isinstance(source, dict):
        return source.get("source_id") or source.get("name"), source.get("url")
    return tuple(source[:2]) if isinstance(source, (tuple, list)) else (source, None)


@dataclass(frozen=True)
class VerificationLookups:
    """Lookup evidence for the re-checked terms, kept apart from their labels.

    ``context`` holds only governed dictionary and ledger entries. Which terms
    were found is reported separately, so the prompt can quote the terms as
    data instead of placing text from the previous answer among the evidence.
    """

    context: str = ""
    sources: list[object] = field(default_factory=list)
    found: tuple[str, ...] = ()
    found_parts: tuple[str, ...] = ()
    missing: tuple[str, ...] = ()


def verification_term_context(terms: tuple[str, ...]) -> VerificationLookups:
    """Return exact-lookup evidence for each term and the matching sources.

    Each Chamorro word of a multi-word term ("Hu guaiya hao") is also looked
    up, within a fixed lookup budget. Terms with no entry at all are reported
    so the model can say so instead of guessing.
    """

    paragraphs: list[str] = []
    seen_paragraphs: set[str] = set()
    sources: list[object] = []
    seen_sources: set[tuple[object, object]] = set()
    found_by_key: dict[str, bool] = {}

    def lookup(term: str) -> bool:
        key = normalize_chamorro_match_text(term, repair_ocr_splits=False)
        if key in found_by_key:
            return found_by_key[key]
        if not key or len(found_by_key) >= MAX_VERIFICATION_LOOKUPS:
            return False
        context, term_sources = get_canonical_tutor_context(f'Define "{term}"')
        found_by_key[key] = bool(context)
        if not context:
            return False
        # Each lookup repeats the same header and citation footer; keep one.
        for paragraph in context.split("\n\n"):
            if paragraph.strip() and paragraph not in seen_paragraphs:
                seen_paragraphs.add(paragraph)
                paragraphs.append(paragraph)
        for source in term_sources:
            if _source_key(source) not in seen_sources:
                seen_sources.add(_source_key(source))
                sources.append(source)
        return True

    # Whole terms first, so a long answer cannot spend the budget on the
    # words of its first phrase. A phrase match can come from one ledger term
    # inside it, so its other words are looked up too.
    whole = {term: lookup(term) for term in terms}
    parts = {
        term: any([lookup(word) for word in term.split() if is_chamorro_word(word)])
        for term in terms
        if len(term.split()) > 1
    }
    lookups = VerificationLookups(
        found=tuple(term for term in terms if whole[term]),
        found_parts=tuple(term for term in terms if not whole[term] and parts.get(term)),
        missing=tuple(term for term in terms if not whole[term] and not parts.get(term)),
    )
    if not paragraphs:
        return lookups
    header = (
        "=== LOOKUPS FOR THE TERMS IN THE PREVIOUS ANSWER ===\n"
        "Each term from the previous answer was looked up by exact headword. "
        "Only the entries below are evidence; the previous answer is not."
    )
    return VerificationLookups(
        "\n\n".join([header, *paragraphs]), sources,
        lookups.found, lookups.found_parts, lookups.missing,
    )
