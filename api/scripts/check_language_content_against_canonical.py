#!/usr/bin/env python3
"""Check app/API content for canonical vocabulary terms that need action.

This script is a Phase 2 bridge between the canonical vocabulary file and the
existing scattered content. It scans text/JSON/TS files for terms listed as
`deprecated_app_terms`, `needs_review_terms`, or non-source-backed variants in
canonical_vocabulary.json and writes an action report.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from scripts.chamorro_utils import normalize_text
except ModuleNotFoundError:  # Allows direct execution: python scripts/check_language_content_against_canonical.py
    from chamorro_utils import normalize_text

DEFAULT_FRONTEND_RELATIVE = "../HafaGPT-frontend"
DEFAULT_OUTPUT_JSON = "documentation/language_content_audit/canonical_usage_report.json"
DEFAULT_OUTPUT_MD = "documentation/language_content_audit/canonical_usage_report.md"
SCAN_SUFFIXES = {".json", ".ts", ".tsx", ".md", ".txt"}
SKIP_DIRS = {".git", "node_modules", "dist", "build", ".next", "__pycache__", ".venv", "venv"}


@dataclass(frozen=True)
class TermRule:
    entry_id: str
    category: str
    english: str
    recommended_teaching_term: str
    term: str
    action: str
    reason: str
    known_paths: tuple[str, ...] = ()
    match_mode: str = "normalized"


def normalized_contains(haystack: str, needle: str) -> bool:
    normalized_haystack = f" {normalize_text(haystack)} "
    normalized_needle = normalize_text(needle)
    if not normalized_needle:
        return False
    return f" {normalized_needle} " in normalized_haystack


def exact_contains(haystack: str, needle: str) -> bool:
    needle = needle.strip()
    if not needle:
        return False
    # Use token-ish boundaries so app-specific exact matches like `Tata` do not
    # fire on longer words such as `Tata'ao` or possessed forms such as
    # `tata-hu`. Exact mode is primarily for diacritic-only replacement pairs.
    boundary_chars = r"\w'’\-"
    pattern = rf"(?<![{boundary_chars}]){re.escape(needle)}(?![{boundary_chars}])"
    return re.search(pattern, haystack, flags=re.IGNORECASE) is not None


def choose_match_mode(term: str, recommended_teaching_term: str) -> str:
    if normalize_text(term) == normalize_text(recommended_teaching_term):
        return "exact"
    return "normalized"


def rule_matches_text(haystack: str, rule: TermRule) -> bool:
    if rule.match_mode == "exact":
        return exact_contains(haystack, rule.term)
    return normalized_contains(haystack, rule.term)


def is_manifest_asset_reference_line(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith('"file":') or stripped.startswith('"url":')


def iter_scan_files(root: Path):
    if not root.exists():
        return
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in SCAN_SUFFIXES:
            yield path


def load_rules(vocabulary_path: Path) -> list[TermRule]:
    data = json.loads(vocabulary_path.read_text(encoding="utf-8"))
    rules: list[TermRule] = []
    for entry in data.get("entries", []):
        entry_context = {
            "entry_id": entry["id"],
            "category": entry["category"],
            "english": entry["english"],
            "recommended_teaching_term": entry["recommended_teaching_term"],
        }
        for variant in entry.get("variants", []) or []:
            status = variant.get("status")
            if status == "needs_review":
                if variant.get("type") == "orthographic":
                    continue
                rules.append(
                    TermRule(
                        **entry_context,
                        term=variant["term"],
                        action="review_variant_before_teaching",
                        reason=variant.get("notes", "Variant needs review before beginner teaching"),
                        match_mode=choose_match_mode(variant["term"], entry["recommended_teaching_term"]),
                    )
                )
            elif status in {"deprecated", "do_not_teach"}:
                rules.append(
                    TermRule(
                        **entry_context,
                        term=variant["term"],
                        action="replace_deprecated_variant",
                        reason=variant.get("notes", "Variant should not be taught as canonical"),
                        match_mode=choose_match_mode(variant["term"], entry["recommended_teaching_term"]),
                    )
                )
        for item in entry.get("deprecated_app_terms", []) or []:
            rules.append(
                TermRule(
                    **entry_context,
                    term=item["term"],
                    action="replace_deprecated_term",
                    reason=item.get("reason", "Deprecated app term"),
                    known_paths=tuple(item.get("found_in", []) or []),
                    match_mode=choose_match_mode(item["term"], entry["recommended_teaching_term"]),
                )
            )
        for item in entry.get("needs_review_terms", []) or []:
            rules.append(
                TermRule(
                    **entry_context,
                    term=item["term"],
                    action="review_before_teaching",
                    reason=item.get("reason", "Term needs review"),
                    known_paths=tuple(item.get("found_in", []) or []),
                    match_mode=choose_match_mode(item["term"], entry["recommended_teaching_term"]),
                )
            )
    return rules


def path_matches_known_paths(path: Path, known_paths: tuple[str, ...]) -> bool:
    if not known_paths:
        return True
    path_text = str(path)
    for known_path in known_paths:
        normalized_known = known_path.replace("\\", "/")
        normalized_path = path_text.replace("\\", "/")
        if normalized_path.endswith(normalized_known):
            return True
    return False


def line_contains_preferred_or_longer_rule(line: str, current_rule: TermRule, rules: list[TermRule]) -> bool:
    if current_rule.match_mode == "exact":
        return False

    current_normalized = normalize_text(current_rule.term)
    recommended_normalized = normalize_text(current_rule.recommended_teaching_term)
    if (
        recommended_normalized
        and len(recommended_normalized) > len(current_normalized)
        and f" {current_normalized} " in f" {recommended_normalized} "
        and normalized_contains(line, current_rule.recommended_teaching_term)
    ):
        return True

    for other_rule in rules:
        if other_rule == current_rule:
            continue
        other_normalized = normalize_text(other_rule.term)
        if len(other_normalized) <= len(current_normalized):
            continue
        if f" {current_normalized} " not in f" {other_normalized} ":
            continue
        if normalized_contains(line, other_rule.term):
            return True
    return False


def scan_content_roots(scan_roots: list[Path], rules: list[TermRule]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, int]] = set()
    for root in scan_roots:
        root = root.resolve()
        if not root.exists():
            continue
        for path in iter_scan_files(root):
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            for rule in rules:
                if not path_matches_known_paths(path, rule.known_paths):
                    continue
                if not rule_matches_text(text, rule):
                    continue
                normalized_term = normalize_text(rule.term)
                for line_number, line in enumerate(text.splitlines(), start=1):
                    if not rule_matches_text(line, rule):
                        continue
                    if rule.match_mode == "exact" and is_manifest_asset_reference_line(line):
                        continue
                    if line_contains_preferred_or_longer_rule(line, rule, rules):
                        continue
                    key = (str(path), rule.entry_id, normalized_term, line_number)
                    if key in seen:
                        continue
                    seen.add(key)
                    findings.append(
                        {
                            "entry_id": rule.entry_id,
                            "category": rule.category,
                            "english": rule.english,
                            "term": rule.term,
                            "recommended_teaching_term": rule.recommended_teaching_term,
                            "action": rule.action,
                            "reason": rule.reason,
                            "path": str(path),
                            "line": line_number,
                            "snippet": line.strip()[:240],
                        }
                    )
    findings.sort(key=lambda item: (item["action"], item["entry_id"], item["path"], item["line"]))
    return findings


def make_display_path(path_text: str, api_root: Path, frontend_root: Path) -> str:
    path = Path(path_text)
    try:
        if path.is_relative_to(api_root):
            return str(Path("HafaGPT-API") / path.relative_to(api_root))
        if path.is_relative_to(frontend_root):
            return str(Path("HafaGPT-frontend") / path.relative_to(frontend_root))
    except ValueError:
        pass
    return path_text


def make_display_findings(findings: list[dict[str, Any]], api_root: Path, frontend_root: Path) -> list[dict[str, Any]]:
    display_findings: list[dict[str, Any]] = []
    for finding in findings:
        display_finding = dict(finding)
        display_finding["path"] = make_display_path(str(finding["path"]), api_root, frontend_root)
        display_findings.append(display_finding)
    return display_findings


def render_markdown(findings: list[dict[str, Any]], scan_roots: list[str]) -> str:
    deprecated = [finding for finding in findings if finding["action"].startswith("replace_deprecated")]
    review = [finding for finding in findings if finding["action"].startswith("review_")]
    action_counts: dict[str, int] = {}
    for finding in findings:
        action_counts[finding["action"]] = action_counts.get(finding["action"], 0) + 1

    lines = [
        "# Canonical Vocabulary Usage Report",
        "",
        "Generated by `scripts/check_language_content_against_canonical.py`.",
        "",
        "## Scope",
        "",
    ]
    for root in scan_roots:
        lines.append(f"- `{root}`")
    lines.extend(
        [
            "",
            "## Summary",
            "",
            f"- Deprecated-term findings: {len(deprecated)}",
            f"- Needs-review-term findings: {len(review)}",
            f"- Total findings: {len(findings)}",
            "",
            "By action:",
            "",
        ]
    )
    for action, count in sorted(action_counts.items()):
        lines.append(f"- `{action}`: {count}")
    lines.extend(
        [
            "",
        ]
    )

    def add_section(title: str, items: list[dict[str, Any]]) -> None:
        lines.extend([f"## {title}", ""])
        if not items:
            lines.extend(["No findings.", ""])
            return
        grouped: dict[str, list[dict[str, Any]]] = {}
        for item in items:
            grouped.setdefault(item["entry_id"], []).append(item)
        for entry_id, group in grouped.items():
            first = group[0]
            lines.extend(
                [
                    f"### `{entry_id}` — {first['english']}",
                    "",
                    f"Recommended teaching term: **{first['recommended_teaching_term']}**",
                    "",
                ]
            )
            by_term: dict[str, list[dict[str, Any]]] = {}
            for item in group:
                by_term.setdefault(item["term"], []).append(item)
            for term, term_items in by_term.items():
                lines.extend(
                    [
                        f"#### `{term}`",
                        "",
                        f"Reason: {term_items[0]['reason']}",
                        "",
                    ]
                )
                for item in term_items:
                    lines.append(f"- `{item['path']}:{item['line']}` — `{item['snippet']}`")
                lines.append("")

    add_section("Deprecated terms to replace", deprecated)
    add_section("Terms needing review", review)
    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan app/API files against canonical vocabulary rules")
    parser.add_argument("--api-root", type=Path, default=Path.cwd(), help="Path to HafaGPT-API repo root")
    parser.add_argument("--frontend-root", type=Path, default=None, help="Path to HafaGPT frontend repo root")
    parser.add_argument("--output-json", type=Path, default=None, help="Path for JSON report")
    parser.add_argument("--output-md", type=Path, default=None, help="Path for Markdown report")
    args = parser.parse_args()

    api_root = args.api_root.resolve()
    frontend_root = (args.frontend_root or api_root / DEFAULT_FRONTEND_RELATIVE).resolve()
    vocabulary_path = api_root / "language_content" / "canonical_vocabulary.json"
    output_json = (args.output_json or api_root / DEFAULT_OUTPUT_JSON).resolve()
    output_md = (args.output_md or api_root / DEFAULT_OUTPUT_MD).resolve()

    rules = load_rules(vocabulary_path)
    scan_roots = [api_root / "audio_generation", frontend_root / "src"]
    findings = scan_content_roots(scan_roots, rules)
    display_findings = make_display_findings(findings, api_root, frontend_root)
    scope_labels = ["HafaGPT-API/audio_generation", "HafaGPT-frontend/src"]

    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_md.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps({"findings": display_findings}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    output_md.write_text(render_markdown(display_findings, scope_labels), encoding="utf-8")

    print(f"Wrote {len(findings)} canonical usage findings")
    print(f"JSON: {output_json}")
    print(f"Markdown: {output_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
