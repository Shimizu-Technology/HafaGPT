#!/usr/bin/env python3
"""
Audit HafaGPT language-learning content against local dictionary sources.

This script inventories user-facing Chamorro terms from the API and frontend
repositories, compares them to the local dictionary sources, and writes a
machine-readable inventory plus a Markdown summary for Phase 1 triage.

It intentionally does not decide final correctness. Dictionary misses can be
legitimate phrases, inflected forms, names, or modern/common variants. The goal
is to find high-risk content drift so humans can review and correct it with
citations.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from difflib import get_close_matches
from pathlib import Path
from typing import Any, Iterable

try:
    from scripts.chamorro_utils import normalize_text
except ModuleNotFoundError:  # Allows direct execution: python scripts/audit_language_content.py
    from chamorro_utils import normalize_text


CONTENT_FILE_EXTENSIONS = {".ts", ".tsx", ".json", ".md"}
FRONTEND_LANGUAGE_PATHS = [
    "src/data",
    "src/components/ColorTouch.tsx",
    "src/components/SoundMatch.tsx",
    "src/components/PicturePairs.tsx",
    "src/components/SimonSays.tsx",
    "src/components/NumberTap.tsx",
    "src/components/CulturalTrivia.tsx",
]
API_LANGUAGE_PATHS = [
    "audio_generation",
]
STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "for",
    "from",
    "in",
    "is",
    "it",
    "its",
    "of",
    "or",
    "the",
    "to",
    "with",
    "you",
    "your",
    "i",
    "me",
    "my",
}
KNOWN_HIGH_RISK_TERMS = {
    "saksan": "No local dictionary hit found; currently taught as Brown.",
    "saksan brown": "No local dictionary hit found; currently taught as Brown.",
    "saksan kulot": "No local dictionary hit found; currently taught as Brown.",
    "lalala": "Normalized local dictionary hit points to a living/existing meaning, not Orange.",
    "atot": "Local dictionaries point to unrelated meanings; black is attelong/attilung variants.",
}


@dataclass(frozen=True)
class DictionaryEntry:
    source: str
    headword: str
    definition: str
    part_of_speech: str = ""


@dataclass(frozen=True)
class ContentItem:
    source_repo: str
    source_path: str
    source_kind: str
    category: str
    chamorro: str
    english: str
    context: str
    line: int | None = None


@dataclass
class AuditFinding:
    item: ContentItem
    normalized_chamorro: str
    status: str
    risk: str
    dictionary_matches: list[dict[str, str]]
    close_headwords: list[str]
    notes: list[str]


def line_number(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def clean_ts_string(value: str) -> str:
    return (
        value.replace("\\'", "'")
        .replace('\\"', '"')
        .replace("\\n", " ")
        .replace("\\\\", "\\")
        .strip()
    )


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def extract_definition(data: Any) -> tuple[str, str]:
    if isinstance(data, dict):
        definition = data.get("Definition") or data.get("df") or data.get("definition") or ""
        part_of_speech = data.get("PartOfSpeech") or data.get("part_of_speech") or data.get("ps") or ""
        if not definition:
            definition = json.dumps(data, ensure_ascii=False)[:500]
        return str(definition), str(part_of_speech)
    return str(data), ""


def load_dictionary_entries(api_root: Path) -> dict[str, list[DictionaryEntry]]:
    dictionary_paths = [
        api_root / "dictionary_data" / "revised_and_updated_chamorro_dictionary.json",
        api_root / "dictionary_data" / "chamoru_info_dictionary.json",
        api_root / "dictionary_data" / "chamorro_english_dictionary_TOD.json",
    ]
    index: dict[str, list[DictionaryEntry]] = defaultdict(list)

    for path in dictionary_paths:
        if not path.exists():
            continue
        data = load_json(path)
        if not isinstance(data, dict):
            continue
        for headword, raw_entry in data.items():
            definition, part_of_speech = extract_definition(raw_entry)
            normalized = normalize_text(headword)
            if not normalized:
                continue
            index[normalized].append(
                DictionaryEntry(
                    source=path.name,
                    headword=headword,
                    definition=definition,
                    part_of_speech=part_of_speech,
                )
            )
    return index


def walk_language_files(root: Path, relative_paths: Iterable[str]) -> Iterable[Path]:
    for relative in relative_paths:
        path = root / relative
        if not path.exists():
            continue
        if path.is_file():
            if path.suffix in CONTENT_FILE_EXTENSIONS:
                yield path
            continue
        for child in path.rglob("*"):
            if child.is_file() and child.suffix in CONTENT_FILE_EXTENSIONS:
                yield child


def infer_category_from_path_or_text(path: Path, text_window: str) -> str:
    # Prefer explicit category fields inside the item/object window. Checking this
    # before broad category-name scans prevents nearby prior objects from leaking
    # a category into the current item.
    category_match = re.search(r"category\s*:\s*['\"]([^'\"]+)['\"]", text_window, re.I)
    if category_match:
        return normalize_text(clean_ts_string(category_match.group(1))).replace(" ", "_") or "unknown"

    topic_matches = re.findall(r"topic\s*:\s*['\"]([^'\"]+)['\"]", text_window, re.I)
    if topic_matches:
        return normalize_text(clean_ts_string(topic_matches[-1])).replace(" ", "_") or "unknown"

    path_text = str(path).lower()
    for category in [
        "colors",
        "numbers",
        "greetings",
        "family",
        "animals",
        "body",
        "food",
        "verbs",
        "questions",
        "days",
        "months",
        "adjectives",
        "sentences",
        "places",
        "weather",
        "household",
        "directions",
        "shopping",
        "culture",
    ]:
        if category in path_text or re.search(rf"topic\s*:\s*['\"]{re.escape(category)}['\"]", text_window, re.I):
            return category
    return "unknown"


def add_item(
    items: list[ContentItem],
    seen: set[tuple[str, str, str, str, str]],
    *,
    source_repo: str,
    source_path: str,
    source_kind: str,
    category: str,
    chamorro: str,
    english: str,
    context: str,
    line: int | None,
) -> None:
    chamorro = re.sub(r"\s+", " ", chamorro).strip()
    english = re.sub(r"\s+", " ", english).strip()
    if not chamorro or not english:
        return
    if len(chamorro) > 160 or len(english) > 220:
        return
    key = (source_repo, source_path, source_kind, chamorro, english)
    if key in seen:
        return
    seen.add(key)
    items.append(
        ContentItem(
            source_repo=source_repo,
            source_path=source_path,
            source_kind=source_kind,
            category=category,
            chamorro=chamorro,
            english=english,
            context=context,
            line=line,
        )
    )


def extract_ts_content(root: Path, source_repo: str, paths: Iterable[str]) -> list[ContentItem]:
    items: list[ContentItem] = []
    seen: set[tuple[str, str, str, str, str]] = set()

    for path in walk_language_files(root, paths):
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        relative = str(path.relative_to(root))

        # Flashcard-style front/back entries.
        for match in re.finditer(
            r"front\s*:\s*(['\"])(?P<front>(?:\\.|(?!\1).)*?)\1[\s\S]{0,500}?back\s*:\s*(['\"])(?P<back>(?:\\.|(?!\3).)*?)\3",
            text,
        ):
            window = text[max(0, match.start() - 5000) : match.start()]
            add_item(
                items,
                seen,
                source_repo=source_repo,
                source_path=relative,
                source_kind="flashcard_front_back",
                category=infer_category_from_path_or_text(path, window),
                chamorro=clean_ts_string(match.group("front")),
                english=clean_ts_string(match.group("back")),
                context="front/back",
                line=line_number(text, match.start()),
            )

        # Generic chamorro/english entries used by games, stories, daily words, etc.
        for match in re.finditer(
            r"chamorro\s*:\s*(['\"])(?P<chamorro>(?:\\.|(?!\1).)*?)\1[\s\S]{0,500}?english\s*:\s*(['\"])(?P<english>(?:\\.|(?!\3).)*?)\3",
            text,
        ):
            window = text[match.start() : match.end() + 350]
            add_item(
                items,
                seen,
                source_repo=source_repo,
                source_path=relative,
                source_kind="chamorro_english_object",
                category=infer_category_from_path_or_text(path, window),
                chamorro=clean_ts_string(match.group("chamorro")),
                english=clean_ts_string(match.group("english")),
                context="chamorro/english",
                line=line_number(text, match.start()),
            )

        # Quiz prompts with quoted terms. Preserve direction when the prompt asks
        # for the Chamorro equivalent of an English word.
        for match in re.finditer(
            r"question\s*:\s*(['\"])(?P<question>(?:\\.|(?!\1).)*?)\1[\s\S]{0,700}?correctAnswer\s*:\s*(['\"])(?P<answer>(?:\\.|(?!\3).)*?)\3",
            text,
        ):
            question = clean_ts_string(match.group("question"))
            answer = clean_ts_string(match.group("answer"))
            quoted = re.search(r"[\"“]([^\"”]+)[\"”]", question)
            if not quoted:
                continue

            quoted_text = quoted.group(1)
            question_lower = question.lower()
            if "in chamorro" in question_lower or "say" in question_lower:
                chamorro, english = answer, quoted_text
            elif "in english" in question_lower or question_lower.startswith("what color is") or question_lower.startswith("what does"):
                chamorro, english = quoted_text, answer
            else:
                continue

            window = text[max(0, match.start() - 250) : match.end() + 350]
            add_item(
                items,
                seen,
                source_repo=source_repo,
                source_path=relative,
                source_kind="quiz_question_answer",
                category=infer_category_from_path_or_text(path, window),
                chamorro=chamorro,
                english=english,
                context=question,
                line=line_number(text, match.start()),
            )

    return items


def recursively_extract_json_items(
    data: Any,
    *,
    source_repo: str,
    source_path: str,
    source_kind: str,
    category: str,
    items: list[ContentItem],
    seen: set[tuple[str, str, str, str, str]],
    object_key: str = "",
) -> None:
    if isinstance(data, dict):
        current_category = str(data.get("category") or data.get("tier") or category)
        if "chamorro" in data and "english" in data:
            add_item(
                items,
                seen,
                source_repo=source_repo,
                source_path=source_path,
                source_kind=source_kind,
                category=current_category,
                chamorro=str(data.get("chamorro") or ""),
                english=str(data.get("english") or ""),
                context=object_key or "json object",
                line=None,
            )
        elif object_key and "english" in data:
            add_item(
                items,
                seen,
                source_repo=source_repo,
                source_path=source_path,
                source_kind=source_kind,
                category=current_category,
                chamorro=object_key,
                english=str(data.get("english") or ""),
                context="json key/english",
                line=None,
            )
        for key, value in data.items():
            recursively_extract_json_items(
                value,
                source_repo=source_repo,
                source_path=source_path,
                source_kind=source_kind,
                category=current_category,
                items=items,
                seen=seen,
                object_key=str(key),
            )
    elif isinstance(data, list):
        for value in data:
            recursively_extract_json_items(
                value,
                source_repo=source_repo,
                source_path=source_path,
                source_kind=source_kind,
                category=category,
                items=items,
                seen=seen,
                object_key=object_key,
            )


def extract_api_json_content(api_root: Path) -> list[ContentItem]:
    items: list[ContentItem] = []
    seen: set[tuple[str, str, str, str, str]] = set()
    for path in walk_language_files(api_root, API_LANGUAGE_PATHS):
        if path.suffix != ".json":
            continue
        relative = str(path.relative_to(api_root))
        try:
            data = load_json(path)
        except Exception:
            continue
        recursively_extract_json_items(
            data,
            source_repo="api",
            source_path=relative,
            source_kind="api_json_language_content",
            category="unknown",
            items=items,
            seen=seen,
        )
    return items


def meaningful_english_tokens(value: str) -> list[str]:
    normalized = normalize_text(value)
    return [token for token in normalized.split() if token and token not in STOP_WORDS and len(token) > 1]


def dictionary_definition_matches_english(entries: list[DictionaryEntry], english: str) -> bool:
    tokens = meaningful_english_tokens(english)
    if not tokens:
        return True
    combined = normalize_text(" ".join(entry.definition for entry in entries))
    return any(token in combined for token in tokens)


def is_phrase_or_sentence(value: str) -> bool:
    normalized = normalize_text(value)
    return len(normalized.split()) >= 3 or any(mark in value for mark in ["?", ".", "!", ":", ";"])


def classify_item(item: ContentItem, dictionary_index: dict[str, list[DictionaryEntry]], dictionary_keys: list[str]) -> AuditFinding:
    normalized = normalize_text(item.chamorro)
    matches = dictionary_index.get(normalized, [])
    notes: list[str] = []
    close_headwords: list[str] = []

    known_key = f"{normalized} {normalize_text(item.english)}".strip()
    if normalized in KNOWN_HIGH_RISK_TERMS:
        notes.append(KNOWN_HIGH_RISK_TERMS[normalized])
    elif known_key in KNOWN_HIGH_RISK_TERMS:
        notes.append(KNOWN_HIGH_RISK_TERMS[known_key])

    if matches:
        status = "exact_dictionary_key"
        if dictionary_definition_matches_english(matches, item.english):
            risk = "low"
        else:
            risk = "medium"
            notes.append("Headword exists, but the English label was not found in the dictionary definition text.")
    else:
        close_normalized = get_close_matches(normalized, dictionary_keys, n=5, cutoff=0.86)
        close_headwords = [dictionary_index[key][0].headword for key in close_normalized if dictionary_index.get(key)]
        if close_headwords:
            status = "near_dictionary_key"
            risk = "medium"
            notes.append("No exact headword match, but close dictionary spellings exist.")
        elif is_phrase_or_sentence(item.chamorro):
            status = "phrase_or_sentence_not_directly_indexed"
            risk = "review"
            notes.append("Phrases and inflected forms often do not appear as dictionary headwords; review manually.")
        else:
            status = "not_found_in_local_dictionaries"
            risk = "medium"
            notes.append("No exact or close local dictionary headword found.")

    if item.category.lower() == "colors" and status != "exact_dictionary_key":
        if is_phrase_or_sentence(item.chamorro):
            risk = "review"
        else:
            risk = "high"
            notes.append("Core beginner color vocabulary should be source-backed before teaching.")

    if normalize_text(item.chamorro) in {"saksan", "lalala", "atot"}:
        risk = "high"

    return AuditFinding(
        item=item,
        normalized_chamorro=normalized,
        status=status,
        risk=risk,
        dictionary_matches=[asdict(entry) for entry in matches[:5]],
        close_headwords=close_headwords,
        notes=notes,
    )


def finding_sort_key(finding: AuditFinding) -> tuple[int, str, str, str]:
    risk_order = {"high": 0, "medium": 1, "review": 2, "low": 3}
    return (
        risk_order.get(finding.risk, 9),
        finding.item.category,
        finding.item.chamorro.lower(),
        finding.item.source_path,
    )


def write_inventory_json(path: Path, findings: list[AuditFinding], dictionary_count: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": 1,
        "dictionary_headword_count": dictionary_count,
        "finding_count": len(findings),
        "findings": [
            {
                **asdict(finding),
                "item": asdict(finding.item),
            }
            for finding in sorted(findings, key=finding_sort_key)
        ],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def format_match_summary(finding: AuditFinding) -> str:
    if finding.dictionary_matches:
        match = finding.dictionary_matches[0]
        return f"{match['headword']} ({match['source']}): {match['definition'][:100]}"
    if finding.close_headwords:
        return "close: " + ", ".join(finding.close_headwords[:4])
    return "none"


def write_markdown_report(path: Path, findings: list[AuditFinding], dictionary_count: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    by_risk = Counter(f.risk for f in findings)
    by_status = Counter(f.status for f in findings)
    by_source = Counter(f.item.source_repo for f in findings)
    by_kind = Counter(f.item.source_kind for f in findings)
    high_findings = [f for f in sorted(findings, key=finding_sort_key) if f.risk == "high"]
    medium_findings = [f for f in sorted(findings, key=finding_sort_key) if f.risk == "medium"]

    lines = [
        "# Language Content Phase 1 Audit",
        "",
        "This report is generated by `scripts/audit_language_content.py`. It is a triage inventory, not a final correctness ruling.",
        "Dictionary misses can be legitimate phrases, inflected forms, names, regional variants, or spelling variants. High-risk items should be corrected only after checking the cited source entries and/or human review.",
        "",
        "## Scope",
        "",
        "Phase 1 inventories user-facing language content from:",
        "",
        "- Frontend hardcoded flashcards, quizzes, daily words, stories, and selected games.",
        "- API audio generation JSON manifests/lists.",
        "- Local dictionary sources in `dictionary_data/`.",
        "",
        "## Summary counts",
        "",
        f"- Dictionary normalized headwords indexed: {dictionary_count}",
        f"- Content items inventoried: {len(findings)}",
        f"- By source repo: {dict(sorted(by_source.items()))}",
        f"- By source kind: {dict(sorted(by_kind.items()))}",
        f"- By match status: {dict(sorted(by_status.items()))}",
        f"- By risk: {dict(sorted(by_risk.items()))}",
        "",
        "## Immediate high-confidence concerns",
        "",
        "These are the highest-risk items because they appear in core beginner content and do not line up with local dictionary sources.",
        "",
    ]

    if high_findings:
        for finding in high_findings[:40]:
            item = finding.item
            notes = " ".join(finding.notes)
            lines.append(
                f"- `{item.chamorro}` → `{item.english}` ({item.category}, {item.source_repo}:{item.source_path}"
                + (f":{item.line}" if item.line else "")
                + f") — {finding.status}; {format_match_summary(finding)}. {notes}"
            )
    else:
        lines.append("No high-risk findings in the current generated inventory.")

    lines.extend(
        [
            "",
            "## Medium-risk sample",
            "",
            "Medium-risk findings need review, but many may be valid spelling variants, borrowed terms, inflected forms, or terms missing from one dictionary source.",
            "",
        ]
    )
    for finding in medium_findings[:50]:
        item = finding.item
        lines.append(
            f"- `{item.chamorro}` → `{item.english}` ({item.category}, {item.source_repo}:{item.source_path}"
            + (f":{item.line}" if item.line else "")
            + f") — {finding.status}; {format_match_summary(finding)}"
        )

    lines.extend(
        [
            "",
            "## Phase 1 interpretation",
            "",
            "The clearest initial content drift was in the color vocabulary. Follow-up passes have now updated source-backed colors, beginner numbers, and core greetings/basics across core frontend learning surfaces and API audio source lists from `language_content/canonical_vocabulary.json`.",
            "",
            "The old high-risk beginner drift has now been removed from core beginner surfaces and from active static-audio lookup:",
            "",
            "- Color drift such as `Såksan` for brown, `Lalala` for orange, `Å'tot` for black, `Gris` for gray, and bare/review-needed pink/purple/brown/orange variants has been replaced by source-backed canonical terms.",
            "- Number drift such as `Uno`, `Kuåttro`, `Sinku`/`Singko`, `Siette`, and `Nuebe` has been replaced by source-backed terms: `Unu`, `Kuåtro`, `Sinko`, `Siete`, and `Nuebi`.",
            "- Greeting/basic drift such as `Bula` taught as goodbye, `Mañana si Yu'os` taught as good morning, and `Buenas yan hågu` taught as hello has been removed from core teaching/audio surfaces.",
            "",
            "## Recommended next step",
            "",
            "Continue category by category, not by blind global replacement. Expand `language_content/canonical_vocabulary.json` for family, body, food, common verbs, and remaining common phrases with source citations, variants, pronunciation guidance, confidence, and review status.",
            "",
            "Regenerate static audio from corrected source lists and keep regression tests/checkers in place so hardcoded terms cannot drift again.",
            "",
            "## Full inventory",
            "",
            "Run `python3 scripts/audit_language_content.py` to generate `documentation/language_content_audit/phase1_inventory.json` locally for all findings. The JSON inventory is intentionally gitignored because it is a large generated snapshot.",
            "",
        ]
    )
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit HafaGPT language content against local dictionary sources.")
    parser.add_argument("--api-root", type=Path, default=Path.cwd(), help="Path to HafaGPT-API repo root")
    parser.add_argument("--frontend-root", type=Path, default=None, help="Path to HafaGPT-frontend repo root")
    parser.add_argument("--out-dir", type=Path, default=None, help="Output directory for audit artifacts")
    args = parser.parse_args()

    api_root = args.api_root.resolve()
    frontend_root = (args.frontend_root or api_root.parent / "HafaGPT-frontend").resolve()
    out_dir = (args.out_dir or api_root / "documentation" / "language_content_audit").resolve()

    dictionary_index = load_dictionary_entries(api_root)
    dictionary_keys = sorted(dictionary_index.keys())

    items: list[ContentItem] = []
    if frontend_root.exists():
        items.extend(extract_ts_content(frontend_root, "frontend", FRONTEND_LANGUAGE_PATHS))
    items.extend(extract_api_json_content(api_root))

    findings = [classify_item(item, dictionary_index, dictionary_keys) for item in items]

    write_inventory_json(out_dir / "phase1_inventory.json", findings, len(dictionary_index))
    write_markdown_report(api_root / "documentation" / "LANGUAGE_CONTENT_PHASE1_AUDIT.md", findings, len(dictionary_index))

    print(f"Indexed {len(dictionary_index)} normalized dictionary headwords")
    print(f"Inventoried {len(findings)} content items")
    print(f"Wrote {out_dir / 'phase1_inventory.json'}")
    print(f"Wrote {api_root / 'documentation' / 'LANGUAGE_CONTENT_PHASE1_AUDIT.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
