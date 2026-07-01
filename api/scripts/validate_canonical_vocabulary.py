#!/usr/bin/env python3
"""Validate HåfaGPT canonical vocabulary files.

This intentionally avoids external dependencies so it can run in CI with the
existing Python environment. It performs structural checks plus local dictionary
citation checks for entries in language_content/canonical_vocabulary.json.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from scripts.chamorro_utils import normalize_text
except ModuleNotFoundError:  # Allows direct execution: python scripts/validate_canonical_vocabulary.py
    from chamorro_utils import normalize_text

REVIEW_STATUSES = {"verified", "source_backed", "variant", "needs_review", "deprecated", "do_not_teach"}
CONFIDENCE_VALUES = {"high", "medium", "low", "unknown"}
VARIANT_STATUSES = {"source_backed", "needs_review", "deprecated", "do_not_teach"}
VARIANT_TYPES = {"orthographic", "source_variant", "regional", "app_legacy", "other"}
REQUIRED_ENTRY_FIELDS = {
    "id",
    "category",
    "english",
    "canonical_chamorro",
    "recommended_teaching_term",
    "review_status",
    "confidence",
    "source_citations",
}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_dictionary_indexes(api_root: Path) -> dict[str, set[str]]:
    dictionary_dir = api_root / "dictionary_data"
    indexes: dict[str, set[str]] = {}
    for path in dictionary_dir.glob("*.json"):
        try:
            data = load_json(path)
        except Exception:
            continue
        if isinstance(data, dict):
            indexes[path.name] = {normalize_text(str(key)) for key in data.keys()}
    return indexes


def validate_vocabulary(api_root: Path, vocabulary_path: Path) -> list[str]:
    errors: list[str] = []
    data = load_json(vocabulary_path)
    dictionary_indexes = load_dictionary_indexes(api_root)

    if not isinstance(data, dict):
        return ["Canonical vocabulary root must be an object"]

    entries = data.get("entries")
    if not isinstance(entries, list):
        return ["Canonical vocabulary must include an entries array"]

    seen_ids: set[str] = set()
    seen_terms: dict[str, str] = {}

    for index, entry in enumerate(entries):
        prefix = f"entries[{index}]"
        if not isinstance(entry, dict):
            errors.append(f"{prefix}: entry must be an object")
            continue

        missing = sorted(REQUIRED_ENTRY_FIELDS - set(entry.keys()))
        if missing:
            errors.append(f"{prefix}: missing required fields: {', '.join(missing)}")
            continue

        entry_id = entry["id"]
        if entry_id in seen_ids:
            errors.append(f"{prefix}: duplicate id {entry_id}")
        seen_ids.add(entry_id)

        if entry.get("review_status") not in REVIEW_STATUSES:
            errors.append(f"{prefix}: invalid review_status {entry.get('review_status')!r}")
        if entry.get("confidence") not in CONFIDENCE_VALUES:
            errors.append(f"{prefix}: invalid confidence {entry.get('confidence')!r}")

        normalized_canonical = normalize_text(str(entry.get("canonical_chamorro", "")))
        normalized_recommended = normalize_text(str(entry.get("recommended_teaching_term", "")))
        if not normalized_canonical:
            errors.append(f"{prefix}: canonical_chamorro cannot normalize to empty")
        if not normalized_recommended:
            errors.append(f"{prefix}: recommended_teaching_term cannot normalize to empty")
        elif normalized_recommended in seen_terms:
            errors.append(
                f"{prefix}: recommended term duplicates {seen_terms[normalized_recommended]} after normalization"
            )
        else:
            seen_terms[normalized_recommended] = entry_id
        if normalized_canonical and normalized_recommended and normalized_canonical != normalized_recommended:
            errors.append(
                f"{prefix}: canonical_chamorro and recommended_teaching_term must match after normalization; "
                "record alternate forms in variants instead"
            )

        citations = entry.get("source_citations", [])
        if not isinstance(citations, list) or not citations:
            errors.append(f"{prefix}: source_citations must be a non-empty array")
        else:
            for citation_index, citation in enumerate(citations):
                citation_prefix = f"{prefix}.source_citations[{citation_index}]"
                if not isinstance(citation, dict):
                    errors.append(f"{citation_prefix}: citation must be an object")
                    continue
                source = citation.get("source")
                headword = citation.get("headword")
                definition = citation.get("definition")
                if not source or not headword or not definition:
                    errors.append(f"{citation_prefix}: source, headword, and definition are required")
                    continue
                if source not in dictionary_indexes:
                    errors.append(f"{citation_prefix}: source file {source!r} not found in dictionary_data")
                    continue
                normalized_headword = normalize_text(str(headword))
                if normalized_headword not in dictionary_indexes[source]:
                    errors.append(
                        f"{citation_prefix}: headword {headword!r} not found in {source!r} after normalization"
                    )

        optional_arrays: dict[str, list[Any]] = {}
        for array_field in ["variants", "deprecated_app_terms", "needs_review_terms"]:
            value = entry.get(array_field, [])
            if not isinstance(value, list):
                errors.append(f"{prefix}.{array_field}: must be an array")
                optional_arrays[array_field] = []
            else:
                optional_arrays[array_field] = value

        for variant_index, variant in enumerate(optional_arrays["variants"]):
            variant_prefix = f"{prefix}.variants[{variant_index}]"
            if not isinstance(variant, dict):
                errors.append(f"{variant_prefix}: variant must be an object")
                continue
            if variant.get("status") not in VARIANT_STATUSES:
                errors.append(f"{variant_prefix}: invalid status {variant.get('status')!r}")
            if variant.get("type") not in VARIANT_TYPES:
                errors.append(f"{variant_prefix}: invalid type {variant.get('type')!r}")
            if not variant.get("term"):
                errors.append(f"{variant_prefix}: term is required")

        for field_name in ["deprecated_app_terms", "needs_review_terms"]:
            for term_index, term in enumerate(optional_arrays[field_name]):
                term_prefix = f"{prefix}.{field_name}[{term_index}]"
                if not isinstance(term, dict):
                    errors.append(f"{term_prefix}: term record must be an object")
                    continue
                if not term.get("term"):
                    errors.append(f"{term_prefix}: term is required")
                if not term.get("reason"):
                    errors.append(f"{term_prefix}: reason is required")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate canonical HåfaGPT vocabulary")
    parser.add_argument("--api-root", type=Path, default=Path.cwd(), help="Path to HafaGPT-API repo root")
    parser.add_argument(
        "--vocabulary",
        type=Path,
        default=None,
        help="Path to canonical_vocabulary.json (defaults to language_content/canonical_vocabulary.json)",
    )
    args = parser.parse_args()

    api_root = args.api_root.resolve()
    vocabulary_path = (args.vocabulary or api_root / "language_content" / "canonical_vocabulary.json").resolve()
    errors = validate_vocabulary(api_root, vocabulary_path)
    if errors:
        print("Canonical vocabulary validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Canonical vocabulary OK: {vocabulary_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
